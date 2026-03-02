"""
Database connection layer.

Supabase (PostgreSQL) is the primary database. When Supabase is unavailable,
the app falls back to a local SQLite database managed by local_auth.py.

Use supabase_client.get_supabase_client() to obtain a Supabase client.
Use local_auth.py functions (user_exists, create_user, get_user_by_email)
for the local SQLite fallback.
"""

from supabase_client import get_supabase_client

__all__ = ["get_supabase_client"]
