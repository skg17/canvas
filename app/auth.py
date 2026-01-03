"""Simple password-based authentication."""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

# JWT settings
SECRET_KEY = settings.jellyfin_api_key  # Use Jellyfin API key as secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

security = HTTPBearer(auto_error=False)

def create_access_token() -> str:
    """Create a JWT access token."""
    if not SECRET_KEY:
        raise ValueError("JWT SECRET_KEY is not configured. Please set JELLYFIN_API_KEY environment variable.")
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode = {"exp": expire, "authenticated": True}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> bool:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("authenticated", False)
    except JWTError:
        return False

def verify_password(password: str) -> bool:
    """Verify password against configured password."""
    # Check if login password is configured
    if not settings.login_password:
        return False
    # Strip whitespace from both passwords for comparison
    return password.strip() == settings.login_password.strip()

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> bool:
    """Check if user is authenticated."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    if not verify_token(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return True

