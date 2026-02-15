import os
import secrets
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from passlib.context import CryptContext
from app.core.config import settings


# ============================================================================
# Token Blacklist (in-memory; use Redis in multi-worker production)
# ============================================================================
_token_blacklist: dict[str, float] = {}  # jti -> expiry timestamp
_blacklist_lock = threading.Lock()


def blacklist_token(jti: str, exp: int) -> None:
    """Add a token JTI to the blacklist until it naturally expires."""
    with _blacklist_lock:
        _token_blacklist[jti] = float(exp)
        # Prune expired entries opportunistically
        now = time.time()
        expired = [k for k, v in _token_blacklist.items() if v < now]
        for k in expired:
            _token_blacklist.pop(k, None)


def is_token_blacklisted(jti: str) -> bool:
    """Check if a token JTI has been revoked."""
    with _blacklist_lock:
        if jti not in _token_blacklist:
            return False
        if _token_blacklist[jti] < time.time():
            _token_blacklist.pop(jti, None)
            return False
        return True


# ============================================================================
# Account Lockout (in-memory; use Redis in multi-worker production)
# ============================================================================
_failed_logins: dict[str, list[float]] = {}  # identifier -> list of timestamps
_lockout_lock = threading.Lock()

LOCKOUT_THRESHOLD = 5        # Max failed attempts before lockout
LOCKOUT_WINDOW_SECONDS = 300  # 5-minute sliding window
LOCKOUT_DURATION_SECONDS = 900  # 15-minute lockout


def record_failed_login(identifier: str) -> None:
    """Record a failed login attempt for an identifier (email/IP)."""
    now = time.time()
    with _lockout_lock:
        if identifier not in _failed_logins:
            _failed_logins[identifier] = []
        _failed_logins[identifier].append(now)
        # Clean old entries
        cutoff = now - LOCKOUT_WINDOW_SECONDS
        _failed_logins[identifier] = [t for t in _failed_logins[identifier] if t > cutoff]


def clear_failed_logins(identifier: str) -> None:
    """Clear failed login attempts after successful login."""
    with _lockout_lock:
        _failed_logins.pop(identifier, None)


def is_account_locked(identifier: str) -> bool:
    """Check if an account/IP is currently locked out."""
    now = time.time()
    with _lockout_lock:
        attempts = _failed_logins.get(identifier, [])
        # Clean old entries
        cutoff = now - LOCKOUT_WINDOW_SECONDS
        attempts = [t for t in attempts if t > cutoff]
        _failed_logins[identifier] = attempts
        if len(attempts) >= LOCKOUT_THRESHOLD:
            # Check if still within lockout duration from last attempt
            if attempts and (now - attempts[-1]) < LOCKOUT_DURATION_SECONDS:
                return True
    return False

# Use pbkdf2_sha256 as primary (no native dependencies required)
# Support legacy schemes for backward compatibility with existing passwords
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt", "argon2"],  # pbkdf2_sha256 first for portability
    deprecated=["bcrypt", "argon2"],  # Other schemes deprecated if not available
    pbkdf2_sha256__rounds=320000,  # High iteration count for security
)

# Used to reduce timing side-channels during login (verify even when user doesn't exist).
# Computed once at import to avoid expensive hashing per request.
DUMMY_PASSWORD_HASH = pwd_context.hash("dummy-password-not-used")


def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-SHA256 to avoid native bcrypt dependencies in some environments."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token with enhanced security claims."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    
    # Add security claims
    to_encode.update({
        "exp": expire,
        "iat": now,  # Issued at
        "nbf": now,  # Not before
        "jti": secrets.token_urlsafe(32),  # JWT ID for tracking/revocation
        "iss": settings.APP_NAME,  # Issuer
        "aud": "jyoti-api",  # Audience
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token with enhanced security."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRATION_DAYS)
    
    to_encode.update({
        "exp": expire,
        "iat": now,
        "nbf": now,
        "type": "refresh",
        "jti": secrets.token_urlsafe(32),
        "iss": settings.APP_NAME,
        "aud": "jyoti-api"
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """Decode and verify a JWT token with enhanced validation."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            audience="jyoti-api",  # Validate audience
            issuer=settings.APP_NAME,  # Validate issuer
            options={
                "verify_exp": True,
                "verify_iat": True,
                "verify_nbf": True,
                "verify_aud": True,
                "verify_iss": True,
            }
        )
        # Check token blacklist (logout revocation)
        jti = payload.get("jti")
        if jti and is_token_blacklisted(jti):
            raise ValueError("Token has been revoked")
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token expired")
    except jwt.InvalidAudienceError as e:
        raise ValueError(f"Invalid token claims: {str(e)}")
    except jwt.InvalidIssuerError as e:
        raise ValueError(f"Invalid token claims: {str(e)}")
    except jwt.PyJWTError as e:
        raise ValueError(f"Invalid token: {str(e)}")


def generate_otp_secret() -> str:
    """Generate a base32-encoded OTP secret (TOTP)."""
    import pyotp
    return pyotp.random_base32()


def verify_totp(secret: str, code: str) -> bool:
    """Verify a TOTP code with ±1 window tolerance for clock drift."""
    import pyotp
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)
