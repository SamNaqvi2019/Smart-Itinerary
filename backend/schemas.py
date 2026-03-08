from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import datetime


class ItineraryRequest(BaseModel):
    destination_city: str = Field(..., min_length=1, max_length=100, description="Destination city name")
    departure_city: Optional[str] = Field(None, max_length=100, description="Departure city name")
    region: Optional[str] = Field(None, max_length=100, description="Region or province")
    interests: Optional[List[str]] = Field(None, description="List of interests")
    budget_level: str = Field(..., description="Budget level: low, medium, or high")

    num_days: int = Field(..., gt=0, le=30, description="Number of days for the trip")
    transport_mode: Optional[str] = Field(None, max_length=50, description="Transport mode")
    travel_date: Optional[str] = Field(None, max_length=50, description="Travel date or date range")
    num_of_people: Optional[int] = Field(1, gt=0, le=20, description="Number of travelers")
    language: Optional[str] = Field('en', description="Language preference: 'en' for English, 'ur' for Urdu")
    selected_hotel_name: Optional[str] = Field(None, description="Hotel name selected by the user in budget planner")
    selected_transport_type: Optional[str] = Field(None, description="Transport type selected by the user (e.g. 'Daewoo Express')")

    @field_validator('destination_city')
    @classmethod
    def validate_destination_city(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Destination city cannot be empty')
        return v.strip()

    @field_validator('budget_level')
    @classmethod
    def validate_budget_level(cls, v: str) -> str:
        allowed_levels = ['low', 'medium', 'high']
        v_lower = v.lower().strip()
        if v_lower not in allowed_levels:
            raise ValueError(f'Budget level must be one of: {", ".join(allowed_levels)}')
        return v_lower

    @field_validator('transport_mode')
    @classmethod
    def validate_transport_mode(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        allowed_modes = ['own_car', 'public_transport', 'ride_sharing', 'mixed']
        v_lower = v.lower().strip()
        # Check if it matches any allowed mode or contains keywords
        if any(mode in v_lower for mode in allowed_modes):
            return v_lower
        # If it's a valid keyword, map it
        if 'car' in v_lower or 'own' in v_lower:
            return 'own_car'
        elif 'public' in v_lower:
            return 'public_transport'
        elif 'ride' in v_lower or 'sharing' in v_lower:
            return 'ride_sharing'
        elif 'mixed' in v_lower:
            return 'mixed'
        return v_lower

    @field_validator('travel_date')
    @classmethod
    def validate_travel_date(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v.strip():
            return None
        v = v.strip()
        # Try to parse common date formats
        date_formats = [
            "%Y-%m-%d",
            "%d-%m-%Y",
            "%d/%m/%Y",
            "%B %d, %Y",
            "%b %d, %Y",
            "%Y-%m-%d %H:%M:%S",
        ]
        # If it's a date range or descriptive text, allow it
        if any(keyword in v.lower() for keyword in ['to', '-', 'and', 'through', 'until']):
            return v
        # Try to parse as ISO format
        try:
            datetime.fromisoformat(v)
            return v
        except ValueError:
            pass
        # Try other formats
        for fmt in date_formats:
            try:
                datetime.strptime(v, fmt)
                return v
            except ValueError:
                continue
        # If it's descriptive text like "June 15-20, 2025", allow it
        return v

    @field_validator('interests')
    @classmethod
    def validate_interests(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        # Filter out empty strings and limit length
        cleaned = [interest.strip() for interest in v if interest and interest.strip()]
        if len(cleaned) > 20:
            raise ValueError('Maximum 20 interests allowed')
        return cleaned[:20] if cleaned else None

    @field_validator('departure_city', 'region')
    @classmethod
    def validate_optional_strings(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v.strip():
            return None
        return v.strip()




class SpotLocation(BaseModel):
    name: str
    latitude: float
    longitude: float
    city: Optional[str] = None


class DayPlan(BaseModel):
    day: int
    places: List[str]
    description: str
    date: Optional[str] = None
    images: Optional[List[str]] = None
    spot_locations: Optional[List[SpotLocation]] = None  # Coordinates for map display


class ItineraryResponse(BaseModel):
    query_used: str
    num_spots_considered: int
    days: List[DayPlan]
    total_estimated_cost: float
    currency: str = "PKR"
    # This is where the LLM-generated nice text will go:
    pretty_itinerary_text: Optional[str] = None
    budget_breakdown: Optional[Dict[str, float]] = None
    recommended_hotels: Optional[List[str]] = None
    weather_considerations: Optional[str] = None
    travel_window: Optional[str] = None
    transport_costs: Optional[Dict[str, Any]] = None  # Transport cost breakdown
    weather_data: Optional[Dict[str, Any]] = None  # Current weather and forecast
    all_images: Optional[List[str]] = None  # All images from all spots in the itinerary


# ── Budget planner schemas (user-choice flow) ────────────────────────────────

class BudgetRequest(BaseModel):
    destination: str = Field(..., min_length=1, description="Destination city name")
    num_days: int = Field(..., gt=0, le=30, description="Number of days")
    num_travelers: int = Field(..., gt=0, le=20, description="Number of travelers")
    budget_tier: str = Field(..., pattern="^(low|medium|high)$", description="Budget tier: low, medium, or high")


class HotelOption(BaseModel):
    name: str
    star_rating: int
    price_per_night: float
    total_price: float
    location: str
    amenities: List[str]


class TransportOption(BaseModel):
    type: str        # flight / bus / train / car
    provider: str
    price_per_person: float
    total_price: float
    duration: str
    distance_km: Optional[float] = None


class BudgetOptionsResponse(BaseModel):
    hotel_options: List[HotelOption]
    transport_options: List[TransportOption]


class EstimateRequest(BaseModel):
    budget_request: BudgetRequest
    selected_hotel_index: int = Field(..., ge=0, description="Index of chosen hotel from hotel_options")
    selected_transport_index: int = Field(..., ge=0, description="Index of chosen transport from transport_options")


class EstimatedCostResponse(BaseModel):
    selected_hotel: HotelOption
    selected_transport: TransportOption
    total_estimated_cost: float
    note: str = "⚠️ Activities and food are not included in this estimate"


# ── New trip planning schemas (no budget) ────────────────────────────────────

class TripRequest(BaseModel):
    origin: str = Field(..., min_length=1, max_length=100, description="Origin city name")
    destination: str = Field(..., min_length=1, max_length=100, description="Destination city name")
    num_days: int = Field(..., gt=0, le=30, description="Number of days")
    num_travelers: int = Field(..., gt=0, le=20, description="Number of travelers")
    activity_preferences: Optional[List[str]] = Field(None, description="Preferred activity types, e.g. ['nature', 'historical', 'adventure']")

    @field_validator('origin', 'destination')
    @classmethod
    def validate_city(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('City cannot be empty')
        return v.strip()


class TripOptionsResponse(BaseModel):
    hotel_options: List[HotelOption]
    transport_options: List[TransportOption]
    distance_km: float


class SelectionRequest(BaseModel):
    trip_request: TripRequest
    selected_hotel_index: int = Field(..., ge=0)
    selected_transport_index: int = Field(..., ge=0)
    hotel_options: List[HotelOption]
    transport_options: List[TransportOption]
    activity_preferences: Optional[List[str]] = Field(None, description="Preferred activity types")


class CostSummary(BaseModel):
    hotel_name: str
    hotel_price_per_night: float
    hotel_total: float
    transport_name: str
    transport_total: float
    total_estimated_cost: float
    note: str = "Activities and food are not included in this estimate"


class ActivityLocation(BaseModel):
    name: str
    latitude: float
    longitude: float
    maps_url: str


class TripDayPlan(BaseModel):
    day_number: int
    title: str
    activities: List[str]
    hotel: str
    image_url: Optional[str] = None
    activity_locations: Optional[List[ActivityLocation]] = None


class TripItineraryResponse(BaseModel):
    cost_summary: CostSummary
    days: List[TripDayPlan]
    weather_considerations: Optional[str] = None

