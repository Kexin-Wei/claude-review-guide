"""Database setup — re-exports from cache service for compatibility."""

from app.services.cache import _ensure_db

__all__ = ["_ensure_db"]
