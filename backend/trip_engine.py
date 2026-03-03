"""
Trip engine — no-budget trip planning.

get_hotel_options()       → LLM generates 4-5 hotels spanning budget to luxury
get_transport_options()   → math-calculated prices using distance × per-km rates (NO LLM)
calculate_cost_summary()  → hotel + transport only; food & activities excluded
generate_trip_itinerary() → LLM generates day-by-day plan locked to selected hotel & transport
"""

import asyncio
import json
import re
from typing import Any, List, Optional

from config import (
    GROQ_MODEL_NAME,
    OPENAI_MODEL_NAME,
    _get_groq_client,
    _get_openai_client,
)
from schemas import (
    CostSummary,
    HotelOption,
    SelectionRequest,
    TransportOption,
    TripDayPlan,
    TripItineraryResponse,
    TripRequest,
)

# Re-use city coordinates from fare module for weather lookups
try:
    from routes.fare import CITY_COORDS
except ImportError:
    CITY_COORDS = {}

try:
    from utils.weather_service import get_weather_for_destination
except ImportError:
    get_weather_for_destination = None  # type: ignore


# ── Distance lookup ────────────────────────────────────────────────────────────

# All distances in km (one-way). Keys are normalised lowercase city names.
DISTANCE_MAP: dict[tuple[str, str], float] = {
    ("islamabad", "lahore"): 375,
    ("lahore", "islamabad"): 375,
    ("lahore", "karachi"): 1200,
    ("karachi", "lahore"): 1200,
    ("islamabad", "karachi"): 1400,
    ("karachi", "islamabad"): 1400,
    ("lahore", "multan"): 330,
    ("multan", "lahore"): 330,
    ("islamabad", "peshawar"): 185,
    ("peshawar", "islamabad"): 185,
    ("lahore", "faisalabad"): 185,
    ("faisalabad", "lahore"): 185,
    ("islamabad", "naran"): 280,
    ("naran", "islamabad"): 280,
    ("islamabad", "swat"): 270,
    ("swat", "islamabad"): 270,
    ("islamabad", "murree"): 65,
    ("murree", "islamabad"): 65,
    # Extra common routes
    ("karachi", "hyderabad"): 160,
    ("hyderabad", "karachi"): 160,
    ("islamabad", "gilgit"): 580,
    ("gilgit", "islamabad"): 580,
    ("islamabad", "skardu"): 680,
    ("skardu", "islamabad"): 680,
    ("lahore", "peshawar"): 450,
    ("peshawar", "lahore"): 450,
    ("karachi", "quetta"): 690,
    ("quetta", "karachi"): 690,
    ("islamabad", "quetta"): 1150,
    ("quetta", "islamabad"): 1150,
    ("multan", "karachi"): 1000,
    ("karachi", "multan"): 1000,
    ("faisalabad", "islamabad"): 290,
    ("islamabad", "faisalabad"): 290,
    ("lahore", "sialkot"): 125,
    ("sialkot", "lahore"): 125,
    ("lahore", "gujranwala"): 75,
    ("gujranwala", "lahore"): 75,
}

# Per-km price ranges (PKR). Stored as (min, max) — we use midpoint for a single price.
TRANSPORT_RATES: dict[str, tuple[float, float]] = {
    "Train Economy":       (2.5, 4.0),
    "Bus Economy":         (4.0, 8.0),
    "Bus Business":        (7.0, 10.0),
    "Train AC Business":   (5.0, 9.0),
    "Flight Economy":      (12.0, 22.0),
    "Car Sedan + Driver":  (25.0, 45.0),
    "Car SUV + Driver":    (40.0, 70.0),
}

FLIGHT_MIN_KM = 300  # flights only shown for routes ≥ this distance


def _lookup_distance(origin: str, destination: str) -> float:
    """Return distance in km. Falls back to rough estimation if unknown."""
    key = (origin.lower().strip(), destination.lower().strip())
    if key in DISTANCE_MAP:
        return DISTANCE_MAP[key]
    # Reverse
    rev = (key[1], key[0])
    if rev in DISTANCE_MAP:
        return DISTANCE_MAP[rev]
    # Rough default — 400 km for unknown routes
    return 400.0


# ── LLM helpers ───────────────────────────────────────────────────────────────

def _call_llm_sync(prompt: str) -> str:
    """Try OpenAI first, fall back to Groq. Raises RuntimeError if neither works."""
    oai = _get_openai_client()
    groq = _get_groq_client()

    if oai is not None:
        try:
            resp = oai.chat.completions.create(
                model=OPENAI_MODEL_NAME or "gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
            )
            return resp.choices[0].message.content
        except Exception as exc:
            print(f"[TripEngine] OpenAI failed, trying Groq: {exc}")

    if groq is not None:
        try:
            resp = groq.chat.completions.create(
                model=GROQ_MODEL_NAME or "llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
            )
            return resp.choices[0].message.content
        except Exception as exc:
            print(f"[TripEngine] Groq also failed: {exc}")

    raise RuntimeError(
        "No LLM client available. Set OPENAI_API_KEY or GROQ_API_KEY in .env"
    )


def _call_llm_creative(prompt: str, system: str = "") -> str:
    """Higher-temperature LLM call for itinerary generation."""
    oai = _get_openai_client()
    groq = _get_groq_client()

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    if oai is not None:
        try:
            resp = oai.chat.completions.create(
                model=OPENAI_MODEL_NAME or "gpt-4o-mini",
                messages=messages,
                temperature=0.7,
            )
            return resp.choices[0].message.content
        except Exception as exc:
            print(f"[TripEngine] OpenAI creative call failed, trying Groq: {exc}")

    if groq is not None:
        try:
            resp = groq.chat.completions.create(
                model=GROQ_MODEL_NAME or "llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.7,
            )
            return resp.choices[0].message.content
        except Exception as exc:
            print(f"[TripEngine] Groq creative call also failed: {exc}")

    raise RuntimeError("No LLM client available for itinerary generation.")


def _extract_json(text: str) -> Any:
    """Extract JSON array or object from LLM output (handles code fences)."""
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if m:
        text = m.group(1)
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    for pat in [r"\[[\s\S]*?\]", r"\{[\s\S]*?\}"]:
        m = re.search(pat, text)
        if m:
            try:
                return json.loads(m.group())
            except json.JSONDecodeError:
                continue

    raise ValueError(f"No valid JSON in LLM response: {text[:300]!r}")


# ── Hotel options ─────────────────────────────────────────────────────────────

def _hotel_prompt(destination: str, num_days: int, num_travelers: int) -> str:
    return (
        f"You are a Pakistani travel expert. Return exactly 5 real hotel options for {destination}, Pakistan.\n\n"
        f"Trip: {num_days} day(s), {num_travelers} traveler(s).\n\n"
        f"IMPORTANT: Include a FULL RANGE from budget to luxury:\n"
        f"  - 1-2 budget guesthouses/economy hotels: PKR 2,000–5,000 per room per night\n"
        f"  - 1-2 mid-range 3-star hotels: PKR 6,000–15,000 per room per night\n"
        f"  - 1 premium 4-5 star hotel or resort: PKR 18,000–35,000 per room per night\n\n"
        f"Return a JSON array of exactly 5 objects. Each object:\n"
        f'  "name": real hotel name in {destination}\n'
        f'  "star_rating": integer 1-5\n'
        f'  "price_per_night": realistic PKR price per room per night (2024-2025)\n'
        f'  "total_price": price_per_night * {num_days}\n'
        f'  "location": area or neighbourhood in {destination}\n'
        f'  "amenities": array of 3-5 strings (e.g. "WiFi", "AC", "Breakfast")\n\n'
        f"ALL prices MUST be in PKR (Pakistani Rupees). Never use USD.\n"
        f"Order from cheapest to most expensive.\n"
        f"Return ONLY the JSON array — no explanation, no markdown."
    )


def _parse_hotels(raw: Any, num_days: int) -> List[HotelOption]:
    items = raw if isinstance(raw, list) else [raw]
    result: List[HotelOption] = []
    for h in items:
        if not isinstance(h, dict):
            continue
        ppn = float(h.get("price_per_night") or 0)
        if ppn <= 0:
            continue
        result.append(HotelOption(
            name=str(h.get("name") or "Hotel"),
            star_rating=max(1, min(5, int(h.get("star_rating") or 3))),
            price_per_night=round(ppn, 2),
            total_price=round(float(h.get("total_price") or ppn * num_days), 2),
            location=str(h.get("location") or "City centre"),
            amenities=[str(a) for a in (h.get("amenities") or [])],
        ))
    return result


def _hotels_fallback(destination: str, num_days: int) -> List[HotelOption]:
    options = [
        ("Budget Guesthouse", 1, 2_500, ["WiFi", "Fan"]),
        ("Economy Hotel", 2, 4_500, ["WiFi", "AC"]),
        ("Standard Hotel", 3, 8_000, ["WiFi", "AC", "Breakfast"]),
        ("Comfort Inn", 3, 12_000, ["WiFi", "AC", "Restaurant", "Parking"]),
        ("Grand Hotel", 5, 25_000, ["WiFi", "AC", "Pool", "Spa", "Restaurant"]),
    ]
    return [
        HotelOption(
            name=f"{label} {destination}",
            star_rating=stars,
            price_per_night=ppn,
            total_price=ppn * num_days,
            location="City centre",
            amenities=amenities,
        )
        for label, stars, ppn, amenities in options
    ]


def _hotels_sync(destination: str, num_days: int, num_travelers: int) -> List[HotelOption]:
    prompt = _hotel_prompt(destination, num_days, num_travelers)
    for attempt in range(2):
        try:
            raw_text = _call_llm_sync(prompt)
            hotels = _parse_hotels(_extract_json(raw_text), num_days)
            if hotels:
                return hotels[:5]
        except Exception as exc:
            print(f"[TripEngine] Hotel options attempt {attempt + 1} failed: {exc}")
    print("[TripEngine] Using static hotel fallback")
    return _hotels_fallback(destination, num_days)


async def get_hotel_options(
    destination: str,
    num_days: int,
    num_travelers: int,
) -> List[HotelOption]:
    """Return up to 5 LLM-generated hotel options spanning budget to luxury."""
    return await asyncio.to_thread(_hotels_sync, destination, num_days, num_travelers)


# ── Transport options — math-based, NO LLM ────────────────────────────────────

TRANSPORT_ICONS = {
    "Train Economy": "🚂",
    "Bus Economy": "🚌",
    "Bus Business": "🚌",
    "Train AC Business": "🚂",
    "Flight Economy": "✈️",
    "Car Sedan + Driver": "🚗",
    "Car SUV + Driver": "🚙",
}

TRANSPORT_DURATIONS = {
    # Rough duration estimates based on speed
    "Train Economy": ("50 km/h average"),
    "Bus Economy": ("60 km/h average"),
    "Bus Business": ("65 km/h average"),
    "Train AC Business": ("50 km/h average"),
    "Flight Economy": ("cruising + 1h airport time"),
    "Car Sedan + Driver": ("80 km/h average"),
    "Car SUV + Driver": ("80 km/h average"),
}

TRANSPORT_SPEEDS_KPH = {
    "Train Economy": 50,
    "Bus Economy": 60,
    "Bus Business": 65,
    "Train AC Business": 50,
    "Flight Economy": None,  # Special handling
    "Car Sedan + Driver": 80,
    "Car SUV + Driver": 80,
}


def _format_duration(hours: float) -> str:
    h = int(hours)
    m = int((hours - h) * 60)
    if h == 0:
        return f"{m}m"
    if m == 0:
        return f"{h}h"
    return f"{h}h {m}m"


def _flight_duration(distance_km: float) -> str:
    # Typical cruising speed 800 km/h + 1.5h airport/boarding time
    flight_hours = distance_km / 800 + 1.5
    return _format_duration(flight_hours)


def get_transport_options(
    origin: str,
    destination: str,
    num_travelers: int,
) -> List[TransportOption]:
    """
    Calculate transport options mathematically using DISTANCE_MAP and TRANSPORT_RATES.
    NO LLM is used here.
    Car rental is flat per vehicle (not × num_travelers).
    Flights only for routes ≥ 300 km.
    """
    distance_km = _lookup_distance(origin, destination)
    options: List[TransportOption] = []

    for mode_name, (rate_min, rate_max) in TRANSPORT_RATES.items():
        # Skip flights for short routes
        if "Flight" in mode_name and distance_km < FLIGHT_MIN_KM:
            continue

        mid_rate = (rate_min + rate_max) / 2
        base_cost = round(distance_km * mid_rate, 2)

        is_car = "Car" in mode_name

        if is_car:
            # Car rental: flat price per vehicle, not per person
            total = round(base_cost, 2)
            # price_per_person is informational (divide total by travelers)
            ppp = round(total / max(1, num_travelers), 2)
            provider_note = "per vehicle"
        else:
            # Per-person transport
            ppp = round(base_cost, 2)
            total = round(base_cost * num_travelers, 2)
            provider_note = ""

        # Duration
        speed = TRANSPORT_SPEEDS_KPH.get(mode_name)
        if mode_name == "Flight Economy":
            duration = _flight_duration(distance_km)
        elif speed:
            duration = _format_duration(distance_km / speed)
        else:
            duration = "Varies"

        # Nice provider names
        provider_map = {
            "Train Economy": "Pakistan Railways (Economy)",
            "Bus Economy": "Faisal Movers / Niazi Express",
            "Bus Business": "Daewoo Express / Gold Class",
            "Train AC Business": "Pakistan Railways (AC Business)",
            "Flight Economy": "PIA / Airblue / Serene Air",
            "Car Sedan + Driver": f"Rent-a-Car Sedan ({provider_note})",
            "Car SUV + Driver": f"Rent-a-Car SUV ({provider_note})",
        }

        options.append(TransportOption(
            type=mode_name.split()[0].lower(),  # 'train', 'bus', 'flight', 'car'
            provider=provider_map.get(mode_name, mode_name),
            price_per_person=ppp,
            total_price=total,
            duration=duration,
            distance_km=round(distance_km, 1),
        ))

    # Sort cheapest total first
    options.sort(key=lambda o: o.total_price)
    return options


# ── Cost summary ──────────────────────────────────────────────────────────────

def calculate_cost_summary(
    hotel: HotelOption,
    transport: TransportOption,
    num_days: int,
) -> CostSummary:
    hotel_total = round(hotel.price_per_night * num_days, 2)
    total = round(hotel_total + transport.total_price, 2)
    transport_name = f"{transport.provider} ({transport.type.capitalize()})"
    return CostSummary(
        hotel_name=hotel.name,
        hotel_price_per_night=hotel.price_per_night,
        hotel_total=hotel_total,
        transport_name=transport_name,
        transport_total=transport.total_price,
        total_estimated_cost=total,
        note="Activities and food are not included in this estimate",
    )


# ── Itinerary generation ──────────────────────────────────────────────────────

def _itinerary_prompt(
    trip_req: TripRequest,
    hotel: HotelOption,
    transport: TransportOption,
) -> str:
    return f"""You are an expert Pakistani travel planner.

Generate a day-by-day itinerary for this trip:
- Origin: {trip_req.origin}
- Destination: {trip_req.destination}
- Duration: {trip_req.num_days} day(s)
- Travelers: {trip_req.num_travelers}
- Hotel (ONLY this hotel): {hotel.name} ({hotel.star_rating}★, {hotel.location})
- Transport (ONLY this mode): {transport.provider}

STRICT RULES:
1. Day 1 must mention departure from {trip_req.origin} via {transport.provider}.
2. Every day must say the traveler is staying at {hotel.name}.
3. Last day must mention return to {trip_req.origin} via {transport.provider}.
4. Suggest sightseeing activities and attractions in {trip_req.destination}.
5. Do NOT mention any other hotels — ONLY {hotel.name}.
6. Do NOT mention any other transport — ONLY {transport.provider}.
7. Do NOT include any food prices, restaurant prices, or activity prices.
8. Do NOT include food recommendations or food pricing.
9. Keep activity descriptions engaging but price-free.

Return a JSON array of exactly {trip_req.num_days} day objects. Each object:
  "day_number": integer starting at 1
  "title": string like "Day 1 – Departure & Arrival in {trip_req.destination}"
  "activities": array of 4-6 activity strings (no prices, no food costs)
  "hotel": "{hotel.name}"

Return ONLY the JSON array — no explanation, no markdown fences."""


def _parse_day_plans(raw: Any, hotel_name: str, num_days: int) -> List[TripDayPlan]:
    items = raw if isinstance(raw, list) else [raw]
    result: List[TripDayPlan] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        activities = item.get("activities") or []
        if isinstance(activities, str):
            activities = [activities]
        result.append(TripDayPlan(
            day_number=int(item.get("day_number") or len(result) + 1),
            title=str(item.get("title") or f"Day {len(result) + 1}"),
            activities=[str(a) for a in activities],
            hotel=str(item.get("hotel") or hotel_name),
        ))
    # Ensure hotel is always set correctly
    for day in result:
        day.hotel = hotel_name
    return result


def _fallback_day_plans(
    trip_req: TripRequest,
    hotel: HotelOption,
    transport: TransportOption,
) -> List[TripDayPlan]:
    plans = []
    for i in range(trip_req.num_days):
        day_num = i + 1
        if day_num == 1:
            title = f"Day 1 – Departure & Arrival in {trip_req.destination}"
            activities = [
                f"Depart from {trip_req.origin} via {transport.provider}.",
                f"Arrive in {trip_req.destination} and check in to {hotel.name}.",
                f"Freshen up and take a short walk around {hotel.location}.",
                f"Explore the local markets near {hotel.location} in the evening.",
            ]
        elif day_num == trip_req.num_days and trip_req.num_days > 1:
            title = f"Day {day_num} – Departure Day"
            activities = [
                f"Check out from {hotel.name} after breakfast.",
                f"Final stroll around {trip_req.destination}.",
                f"Head back to {trip_req.origin} via {transport.provider}.",
            ]
        else:
            title = f"Day {day_num} – Exploring {trip_req.destination}"
            activities = [
                f"Start the morning with a visit to a key attraction in {trip_req.destination}.",
                f"Explore historical and cultural sites in the area.",
                f"Afternoon excursion to natural landmarks nearby.",
                f"Return to {hotel.name} for the evening.",
            ]
        plans.append(TripDayPlan(
            day_number=day_num,
            title=title,
            activities=activities,
            hotel=hotel.name,
        ))
    return plans


def _generate_itinerary_sync(
    trip_req: TripRequest,
    hotel: HotelOption,
    transport: TransportOption,
) -> List[TripDayPlan]:
    prompt = _itinerary_prompt(trip_req, hotel, transport)
    system = "You are a helpful Pakistani travel itinerary planner. Always return valid JSON arrays only."
    for attempt in range(2):
        try:
            raw_text = _call_llm_creative(prompt, system)
            days = _parse_day_plans(_extract_json(raw_text), hotel.name, trip_req.num_days)
            if days:
                return days
        except Exception as exc:
            print(f"[TripEngine] Itinerary attempt {attempt + 1} failed: {exc}")
    print("[TripEngine] Using fallback day plans")
    return _fallback_day_plans(trip_req, hotel, transport)


async def generate_trip_itinerary(
    selection: SelectionRequest,
) -> TripItineraryResponse:
    """
    Main entry point. Takes a SelectionRequest (with full hotel/transport objects),
    calculates the cost summary, generates the itinerary, fetches weather, and
    returns TripItineraryResponse.
    """
    hotel_opts = selection.hotel_options
    transport_opts = selection.transport_options
    hi = selection.selected_hotel_index
    ti = selection.selected_transport_index

    if hi >= len(hotel_opts):
        raise ValueError(f"selected_hotel_index {hi} out of range")
    if ti >= len(transport_opts):
        raise ValueError(f"selected_transport_index {ti} out of range")

    hotel = hotel_opts[hi]
    transport = transport_opts[ti]
    trip_req = selection.trip_request

    cost_summary = calculate_cost_summary(hotel, transport, trip_req.num_days)

    days = await asyncio.to_thread(
        _generate_itinerary_sync, trip_req, hotel, transport
    )

    # ── Assign day images from real spot data ──────────────────
    spot_images = _get_spot_images_for_city(trip_req.destination)
    for day in days:
        idx = (day.day_number - 1) % len(spot_images) if spot_images else -1
        day.image_url = spot_images[idx] if idx >= 0 else None

    # ── Weather ───────────────────────────────────────────────
    weather_considerations = _fetch_weather_considerations(
        trip_req.destination, trip_req.num_days
    )

    return TripItineraryResponse(
        cost_summary=cost_summary,
        days=days,
        weather_considerations=weather_considerations,
    )

# ── Spot image helper ─────────────────────────────────────────────────────────

from pathlib import Path as _Path

_SPOTS_CACHE: Optional[list] = None


def _load_spots_data() -> list:
    """Load and cache structured_spots.json."""
    global _SPOTS_CACHE
    if _SPOTS_CACHE is not None:
        return _SPOTS_CACHE
    spots_path = _Path(__file__).resolve().parent / "data" / "structured_spots.json"
    if not spots_path.exists():
        _SPOTS_CACHE = []
        return _SPOTS_CACHE
    try:
        with spots_path.open("r", encoding="utf-8") as f:
            _SPOTS_CACHE = json.load(f)
    except Exception as exc:
        print(f"[TripEngine] Failed to load spots data: {exc}")
        _SPOTS_CACHE = []
    return _SPOTS_CACHE


def _gdrive_direct_url(url: str) -> str:
    """Convert Google Drive sharing URL to direct-download thumbnail URL."""
    if not url:
        return url
    # Handle /uc?id= format
    if "drive.google.com/uc" in url and "id=" in url:
        file_id = url.split("id=")[1].split("&")[0]
        return f"https://drive.google.com/thumbnail?id={file_id}&sz=w800"
    # Handle /file/d/ format
    if "drive.google.com/file/d/" in url:
        parts = url.split("/file/d/")[1].split("/")
        file_id = parts[0]
        return f"https://drive.google.com/thumbnail?id={file_id}&sz=w800"
    return url


def _get_spot_images_for_city(city: str) -> List[str]:
    """
    Return a list of real image URLs from the spot dataset for the given city.
    Each image is from a different spot to maximise variety across days.
    """
    spots = _load_spots_data()
    city_lower = city.strip().lower()
    images: List[str] = []

    for spot in spots:
        spot_city = (spot.get("city") or "").strip().lower()
        if spot_city != city_lower:
            continue

        # Try images list first, then image_url fallback
        imgs = spot.get("images")
        if imgs:
            if isinstance(imgs, str):
                try:
                    imgs = json.loads(imgs)
                except Exception:
                    imgs = [imgs] if imgs else []
            if isinstance(imgs, list):
                for img in imgs:
                    if img and isinstance(img, str) and img.startswith("http"):
                        images.append(_gdrive_direct_url(img))
                        break  # one image per spot for variety
        elif spot.get("image_url"):
            iu = spot["image_url"]
            if iu.startswith("http"):
                images.append(_gdrive_direct_url(iu))

    return images


# ── Weather helper ────────────────────────────────────────────────────────────

def _fetch_weather_considerations(destination: str, num_days: int) -> str:
    """
    Fetch live weather from Open-Meteo for the destination city.
    Returns a formatted string compatible with the WeatherCard component.
    Falls back to a generic note if the API or coordinates are unavailable.
    """
    if not get_weather_for_destination or not CITY_COORDS:
        return _generic_weather_note(destination)

    # Look up coordinates (case-insensitive)
    coords = None
    for city_name, (lat, lon) in CITY_COORDS.items():
        if city_name.lower() == destination.strip().lower():
            coords = (lat, lon)
            break
    if coords is None:
        return _generic_weather_note(destination)

    try:
        weather = get_weather_for_destination(
            latitude=coords[0],
            longitude=coords[1],
            num_days=num_days,
        )
        if not weather:
            return _generic_weather_note(destination)

        parts: list[str] = []
        current = weather.get("current_weather")
        forecast = weather.get("forecast", [])
        warnings = weather.get("warnings", [])

        if current:
            temp = current.get("temperature")
            desc = current.get("description", "")
            humidity = current.get("humidity")
            wind = current.get("wind_speed")
            if temp is not None:
                line = f"**Current Conditions:** {temp:.1f}°C, {desc}"
                if humidity is not None:
                    line += f" | {humidity:.0f}% humidity"
                if wind is not None:
                    line += f" | Wind: {wind:.1f} km/h"
                parts.append(line)

        if forecast:
            from datetime import datetime as _dt
            fc_parts: list[str] = []
            for i, fc in enumerate(forecast[:min(3, num_days)]):
                date_str = fc.get("date", "")
                try:
                    d = _dt.fromisoformat(date_str.split("T")[0])
                    label = d.strftime("%b %d")
                except Exception:
                    label = f"Day {i + 1}"
                t_max = fc.get("temperature_max")
                t_min = fc.get("temperature_min")
                d_desc = fc.get("description", "")
                precip = fc.get("precipitation", 0)
                txt = f"{label}: {d_desc}"
                if t_max is not None and t_min is not None:
                    txt += f" ({t_min:.0f}°C – {t_max:.0f}°C)"
                if precip > 0:
                    txt += f", {precip:.1f}mm rain"
                fc_parts.append(txt)
            if fc_parts:
                parts.append(f"**Forecast:** {' | '.join(fc_parts)}")

        if warnings:
            parts.append(f"**Warnings:** {' '.join(warnings)}")

        if parts:
            return f"Weather for {destination}: " + " | ".join(parts)
    except Exception as exc:
        print(f"[TripEngine] Weather fetch failed: {exc}")

    return _generic_weather_note(destination)


def _generic_weather_note(dest: str) -> str:
    return (
        f"Expect variable conditions in {dest}. "
        "Check the latest PMD forecast 24 hours before departure and pack layers plus rain protection."
    )
