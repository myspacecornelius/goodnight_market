"""services.core.database

DEPRECATED: Use :mod:`services.database`.

This module used to provide a second SQLAlchemy engine/session configuration.
That duplication caused subtle transactional/config drift across the codebase.

We keep this module as a thin compatibility shim so any remaining imports
won't break immediately.
"""

from __future__ import annotations

import warnings

from services.database import SessionLocal, engine, get_db  # re-export

warnings.warn(
    "services.core.database is deprecated; use services.database instead",
    DeprecationWarning,
    stacklevel=2,
)

__all__ = ["SessionLocal", "engine", "get_db"]
