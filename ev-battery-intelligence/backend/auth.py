"""
EV BATTERY INTELLIGENCE - AUTHENTICATION & SECURITY ENGINE
Production-grade user management, cryptographic password hashing (PBKDF2-HMAC-SHA256),
session token generation, rate limiting, and password reset workflow.
"""

import os
import re
import time
import hmac
import hashlib
import secrets
import logging
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)

# --- Email Validation Helper ---
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def validate_email_format(email: str) -> str:
    cleaned = email.strip().lower()
    if not EMAIL_REGEX.match(cleaned):
        raise ValueError("Invalid email format")
    return cleaned

# --- Cryptographic Utilities ---

def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2-HMAC-SHA256 with 200,000 iterations and 32-byte salt."""
    salt = secrets.token_bytes(32)
    iterations = 200_000
    derived_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${derived_key.hex()}"

def verify_password(password: str, hashed_value: str) -> bool:
    """Verifies a password against stored PBKDF2-HMAC-SHA256 hash using constant-time comparison."""
    try:
        parts = hashed_value.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        iterations = int(parts[1])
        salt = bytes.fromhex(parts[2])
        expected_key = bytes.fromhex(parts[3])
        actual_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(actual_key, expected_key)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

def generate_session_token() -> str:
    """Generates a high-entropy, cryptographically secure 64-character token."""
    return secrets.token_urlsafe(48)

def generate_reset_token() -> str:
    """Generates a secure 32-character password recovery token."""
    return secrets.token_urlsafe(24)

# --- Rate Limiter (In-Memory Sliding Window) ---

class RateLimiter:
    def __init__(self, max_requests: int = 5, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.records: Dict[str, list] = {}

    def is_allowed(self, key: str) -> Tuple[bool, int]:
        now = time.time()
        timestamps = self.records.get(key, [])
        valid_timestamps = [t for t in timestamps if now - t < self.window_seconds]
        if len(valid_timestamps) >= self.max_requests:
            retry_after = int(self.window_seconds - (now - valid_timestamps[0]))
            self.records[key] = valid_timestamps
            return False, max(1, retry_after)
        valid_timestamps.append(now)
        self.records[key] = valid_timestamps
        return True, 0

    def reset(self, key: str):
        if key in self.records:
            del self.records[key]

auth_rate_limiter = RateLimiter(max_requests=6, window_seconds=60)
reset_rate_limiter = RateLimiter(max_requests=3, window_seconds=60)

# --- Pydantic Request Models ---

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)
    role: Optional[str] = "BMS Engineer"

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str) -> str:
        return validate_email_format(v)

class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1)
    remember_me: Optional[bool] = True

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str) -> str:
        return validate_email_format(v)

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str) -> str:
        return validate_email_format(v)

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=16)
    new_password: str = Field(..., min_length=6, max_length=128)

class BatteryCreateRequest(BaseModel):
    battery_id: str = Field(..., min_length=2, max_length=32)
    battery_name: Optional[str] = None
    chemistry: Optional[str] = "LFP"
    rated_capacity: Optional[float] = 40.0
    nominal_voltage: Optional[float] = 25.6
    num_cells: Optional[int] = 8
    specs: Optional[str] = None
    config: Optional[str] = None
