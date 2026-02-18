from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class UserCreate(BaseModel):
    """Public registration schema — no role fields (always VIEWER)."""
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None


class AdminUserCreate(BaseModel):
    """Admin user creation schema — allows setting role and permissions."""
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = "VIEWER"
    additional_roles: Optional[List[str]] = None
    custom_permissions: Optional[Dict] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    additional_roles: Optional[List[str]] = None
    custom_permissions: Optional[Dict] = None  # {"grant": [...], "deny": [...]}
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str] = None
    role: str
    additional_roles: Optional[List[str]] = []
    custom_permissions: Optional[Dict] = {"grant": [], "deny": []}
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
    
    @field_validator('role', mode='before')
    @classmethod
    def serialize_role(cls, v: Any) -> str:
        """Convert enum role to string."""
        if hasattr(v, 'value'):
            return v.value
        return str(v)
    
    @field_validator('additional_roles', mode='before')
    @classmethod
    def ensure_list(cls, v: Any) -> List[str]:
        """Ensure additional_roles is always a list."""
        if v is None:
            return []
        return v
    
    @field_validator('custom_permissions', mode='before')
    @classmethod
    def ensure_permissions_dict(cls, v: Any) -> Dict:
        """Ensure custom_permissions has proper structure."""
        if v is None:
            return {"grant": [], "deny": []}
        if not isinstance(v, dict):
            return {"grant": [], "deny": []}
        # Ensure both keys exist
        return {
            "grant": v.get("grant", []) or [],
            "deny": v.get("deny", []) or []
        }


class LoginRequest(BaseModel):
    email: str
    password: str
    otp_code: Optional[str] = None


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserResponse


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class TokenRefreshResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None  # New refresh token (rotation)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class EnableOTPRequest(BaseModel):
    pass


class EnableOTPResponse(BaseModel):
    secret: str
    qr_code_url: str


class VerifyOTPRequest(BaseModel):
    code: str


class SAMLMetadataResponse(BaseModel):
    metadata: str
