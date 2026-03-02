"""
Feedback system — stores app/itinerary/fare feedback in SQLite.
Endpoints:
  POST /feedback/submit   – submit feedback
  GET  /feedback/summary  – aggregate stats
  GET  /feedback/list     – recent entries (admin/debug)
"""

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()

DB_PATH = Path(__file__).parent.parent / "data" / "users.db"


# ── DB helpers ────────────────────────────────────────────────────────────────

def _conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _init_table() -> None:
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id          TEXT PRIMARY KEY,
                type        TEXT NOT NULL DEFAULT 'app',
                rating      INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
                category    TEXT,
                comment     TEXT,
                tags        TEXT,
                user_name   TEXT,
                user_email  TEXT,
                created_at  TEXT NOT NULL
            )
        """)
        # Add user_name column if upgrading from older schema
        try:
            conn.execute("ALTER TABLE feedback ADD COLUMN user_name TEXT")
        except Exception:
            pass
        conn.commit()


_init_table()


# ── Schemas ───────────────────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    type:       str           = Field("app", description="app | itinerary | fare_calculator")
    rating:     int           = Field(..., ge=1, le=5, description="1=Poor … 5=Excellent")
    category:   Optional[str] = Field(None,  description="ui | accuracy | features | performance | general")
    comment:    Optional[str] = Field(None,  max_length=1000)
    tags:       Optional[List[str]] = None
    user_name:  Optional[str] = None
    user_email: Optional[str] = None


class FeedbackEntry(BaseModel):
    id:         str
    type:       str
    rating:     int
    category:   Optional[str]
    comment:    Optional[str]
    tags:       Optional[List[str]]
    user_email: Optional[str]
    created_at: str


class FeedbackSubmitResponse(BaseModel):
    success:     bool
    feedback_id: str
    message:     str


class FeedbackSummary(BaseModel):
    total:          int
    average_rating: float
    rating_dist:    dict   # {1:n, 2:n, …, 5:n}
    by_type:        dict
    by_category:    dict
    recent_comments: List[str]


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post(
    "/submit",
    response_model=FeedbackSubmitResponse,
    summary="Submit feedback",
)
async def submit_feedback(req: FeedbackRequest):
    fid  = str(uuid.uuid4())
    now  = datetime.now(timezone.utc).isoformat()
    tags = json.dumps(req.tags) if req.tags else None

    with _conn() as conn:
        conn.execute(
            """
            INSERT INTO feedback
                (id, type, rating, category, comment, tags, user_name, user_email, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (fid, req.type, req.rating, req.category,
             req.comment, tags, req.user_name, req.user_email, now),
        )
        conn.commit()

    return FeedbackSubmitResponse(
        success=True,
        feedback_id=fid,
        message="Thank you! Your feedback helps us improve SafarSmart.",
    )


@router.get(
    "/summary",
    response_model=FeedbackSummary,
    summary="Aggregate feedback stats",
)
async def feedback_summary():
    with _conn() as conn:
        rows = conn.execute(
            "SELECT rating, category, type, comment FROM feedback ORDER BY created_at DESC"
        ).fetchall()

    if not rows:
        return FeedbackSummary(
            total=0, average_rating=0.0,
            rating_dist={str(i): 0 for i in range(1, 6)},
            by_type={}, by_category={}, recent_comments=[],
        )

    ratings     = [r["rating"]   for r in rows]
    avg_rating  = round(sum(ratings) / len(ratings), 1)
    rating_dist = {str(i): ratings.count(i) for i in range(1, 6)}

    by_type     : dict = {}
    by_category : dict = {}
    recent_comments: list = []

    for r in rows:
        t = r["type"]     or "app"
        c = r["category"] or "general"
        by_type[t]     = by_type.get(t, 0) + 1
        by_category[c] = by_category.get(c, 0) + 1
        if r["comment"] and len(recent_comments) < 5:
            recent_comments.append(r["comment"])

    return FeedbackSummary(
        total=len(rows),
        average_rating=avg_rating,
        rating_dist=rating_dist,
        by_type=by_type,
        by_category=by_category,
        recent_comments=recent_comments,
    )


@router.get(
    "/list",
    response_model=List[FeedbackEntry],
    summary="List recent feedback entries",
)
async def list_feedback(limit: int = 50):
    with _conn() as conn:
        rows = conn.execute(
            "SELECT * FROM feedback ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()

    result = []
    for r in rows:
        tags = None
        if r["tags"]:
            try:
                tags = json.loads(r["tags"])
            except Exception:
                tags = [r["tags"]]
        result.append(FeedbackEntry(
            id=r["id"], type=r["type"], rating=r["rating"],
            category=r["category"], comment=r["comment"],
            tags=tags, user_email=r["user_email"], created_at=r["created_at"],
        ))
    return result
