from __future__ import annotations

import base64
from dataclasses import dataclass
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings
from app.core.logging import logger


class CryptoError(RuntimeError):
    pass


def _derive_legacy_fernet_key_from_secret_key(secret_key: str) -> bytes:
    # Derive a proper Fernet key from SECRET_KEY using PBKDF2 with a stable salt.
    import hashlib
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        secret_key.encode(),
        b"joti-config-encryption-salt",  # stable salt tied to application
        iterations=100_000,
        dklen=32,
    )
    return base64.urlsafe_b64encode(dk)


def _load_config_encryption_key() -> Optional[bytes]:
    key = getattr(settings, "CONFIG_ENCRYPTION_KEY", None)
    if not key:
        return None
    try:
        return key.encode() if isinstance(key, str) else key
    except Exception:
        return None


def get_config_fernet() -> Fernet:
    """
    Returns a Fernet instance for encrypting configuration secrets.

    - Prefers `CONFIG_ENCRYPTION_KEY` when set (recommended).
    - Falls back to legacy derivation from `SECRET_KEY` for backward compatibility.
    """
    configured = _load_config_encryption_key()
    if configured:
        return Fernet(configured)

    logger.warning("config_encryption_key_missing_using_legacy_secret_key")
    return Fernet(_derive_legacy_fernet_key_from_secret_key(settings.SECRET_KEY))


def decrypt_config_secret(value: str) -> Optional[str]:
    """
    Decrypt a stored secret.

    Returns None on failure (fail-closed) to avoid using ciphertext as a real secret.
    """
    if not value:
        return value

    keys_to_try: list[bytes] = []
    configured = _load_config_encryption_key()
    if configured:
        keys_to_try.append(configured)
    keys_to_try.append(_derive_legacy_fernet_key_from_secret_key(settings.SECRET_KEY))

    for key in keys_to_try:
        try:
            return Fernet(key).decrypt(value.encode()).decode()
        except InvalidToken:
            continue
        except Exception:
            continue

    return None


def encrypt_config_secret(value: str) -> str:
    if not value:
        return value
    return get_config_fernet().encrypt(value.encode()).decode()

