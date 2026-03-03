"""
Trip planner routes — no-budget flow.

POST /api/trip/options    → TripRequest → TripOptionsResponse
POST /api/trip/itinerary  → SelectionRequest → TripItineraryResponse
"""

import sys
from pathlib import Path

# Allow imports from backend root
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, HTTPException

from schemas import SelectionRequest, TripOptionsResponse, TripRequest
from trip_engine import (
    generate_trip_itinerary,
    get_hotel_options,
    get_transport_options,
)

router = APIRouter()


@router.post(
    "/options",
    response_model=TripOptionsResponse,
    summary="Get hotel & transport options",
)
async def get_trip_options(req: TripRequest):
    """
    Step 1 of the new no-budget flow.
    Returns 4-5 hotel options (LLM, full budget→luxury range)
    and calculated transport options (math-based, no LLM).
    All prices in PKR.
    """
    from trip_engine import _lookup_distance  # local import to avoid circular

    try:
        hotel_options = await get_hotel_options(
            req.destination, req.num_days, req.num_travelers
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate hotel options: {exc}")

    try:
        transport_options = get_transport_options(
            req.origin, req.destination, req.num_travelers
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to calculate transport options: {exc}")

    distance_km = _lookup_distance(req.origin, req.destination)

    return TripOptionsResponse(
        hotel_options=hotel_options,
        transport_options=transport_options,
        distance_km=round(distance_km, 1),
    )


@router.post(
    "/itinerary",
    summary="Generate itinerary for selected hotel & transport",
)
async def create_trip_itinerary(req: SelectionRequest):
    """
    Step 2 of the new no-budget flow.
    Takes the full hotel_options and transport_options lists (from the /options response)
    plus the user's chosen indices.
    Returns a cost summary + day-by-day itinerary.
    No food prices, no activity prices, no alternative hotels/transport.
    """
    if req.selected_hotel_index >= len(req.hotel_options):
        raise HTTPException(
            status_code=400,
            detail=f"selected_hotel_index {req.selected_hotel_index} out of range (0–{len(req.hotel_options) - 1})",
        )
    if req.selected_transport_index >= len(req.transport_options):
        raise HTTPException(
            status_code=400,
            detail=f"selected_transport_index {req.selected_transport_index} out of range (0–{len(req.transport_options) - 1})",
        )

    try:
        result = await generate_trip_itinerary(req)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate itinerary: {exc}")

    return result
