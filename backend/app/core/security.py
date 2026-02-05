from passlib.context import CryptContext
import hashlib
import bcrypt
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from jose import jwt, JWTError
from app.database import get_db
from bson import ObjectId

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="users/login")

def hash_password(password: str) -> str:
    # Use bcrypt directly to avoid passlib backend issues
    # Truncate password to 72 bytes for bcrypt compatibility
    password_bytes = password[:72].encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Try bcrypt first (for new users)
    try:
        password_bytes = plain_password[:72].encode('utf-8')
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except:
        # Fallback to SHA-256 (for existing users)
        return hashed_password == hashlib.sha256(plain_password.encode()).hexdigest()

async def get_current_user(token: str = Depends(oauth2_scheme)):
    from app.core.jwt import SECRET_KEY, ALGORITHM
    db = get_db()
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        email: str = payload.get("sub")
        if user_id is None or email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    try:
        object_id = ObjectId(user_id)
    except:
        raise credentials_exception

    user = await db.users.find_one({"_id": object_id})
    if not user:
        raise credentials_exception
    return user
