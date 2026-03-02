"""
Data models (Pydantic schemas) are defined in schemas.py.

This module re-exports them for convenience.
"""

from schemas import (
    ItineraryRequest,
    ItineraryResponse,
    DayPlan,
    SpotLocation,
)

__all__ = [
    "ItineraryRequest",
    "ItineraryResponse",
    "DayPlan",
    "SpotLocation",
]
