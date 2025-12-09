"""
DEPRECATED: This module is being phased out in favor of services.core.auth

Password hashing functions remain here for backward compatibility.
All authentication and authorization functions have moved to services.core.auth

Migration Guide:
- verify_password() -> Still here, okay to use
- get_password_hash() -> Still here, okay to use  
- create_access_token() -> Use services.core.auth.create_access_token()
- get_current_user() -> Use services.core.auth.get_current_user()
- get_current_admin_user() -> Use services.core.auth.get_current_admin_user()
"""

import logging
import warnings
from passlib.context import CryptContext

# Re-export from auth module for backward compatibility
from services.core.auth import (
    create_access_token as _new_create_access_token,
    get_current_user as _new_get_current_user,
    get_current_admin_user as _new_get_current_admin_user,
)

logger = logging.getLogger(__name__)

# Password hashing context - this stays here
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.
    This function is NOT deprecated - it's the canonical password verification.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.
    This function is NOT deprecated - it's the canonical password hashing.
    """
    return pwd_context.hash(password)


# DEPRECATED FUNCTIONS - Use services.core.auth instead
def create_access_token(*args, **kwargs):
    """DEPRECATED: Use services.core.auth.create_access_token() instead"""
    warnings.warn(
        "services.core.security.create_access_token() is deprecated. "
        "Use services.core.auth.create_access_token() instead.",
        DeprecationWarning,
        stacklevel=2
    )
    logger.warning("Using deprecated create_access_token from security.py - migrate to auth.py")
    return _new_create_access_token(*args, **kwargs)


def get_current_user(*args, **kwargs):
    """DEPRECATED: Use services.core.auth.get_current_user() instead"""
    warnings.warn(
        "services.core.security.get_current_user() is deprecated. "
        "Use services.core.auth.get_current_user() instead.",
        DeprecationWarning,
        stacklevel=2
    )
    logger.warning("Using deprecated get_current_user from security.py - migrate to auth.py")
    return _new_get_current_user(*args, **kwargs)


def get_current_admin_user(*args, **kwargs):
    """DEPRECATED: Use services.core.auth.get_current_admin_user() instead"""
    warnings.warn(
        "services.core.security.get_current_admin_user() is deprecated. "
        "Use services.core.auth.get_current_admin_user() instead.",
        DeprecationWarning,
        stacklevel=2
    )
    logger.warning("Using deprecated get_current_admin_user from security.py - migrate to auth.py")
    return _new_get_current_admin_user(*args, **kwargs)


def validate_token_strength(token: str) -> bool:
    """
    DEPRECATED: Minimal token validation.
    Use proper JWT validation via services.core.auth.verify_access_token() instead.
    """
    warnings.warn(
        "services.core.security.validate_token_strength() is deprecated and not secure. "
        "Use services.core.auth.verify_access_token() instead.",
        DeprecationWarning,
        stacklevel=2
    )
    if not token or len(token) < 10:
        return False
    return True
