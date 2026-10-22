from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional, Union
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.employee import Employee
from app.models.enums import EmployeeRole
from app.models.seller import Seller

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:72],
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8")[:72], salt).decode("utf-8")


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Employee:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        role: Optional[str] = payload.get("role")
        if not role or role == "SELLER" or role not in ROLE_RANK:
            raise credentials_exception
        employee_id_str: Optional[str] = payload.get("sub")
        if employee_id_str is None:
            raise credentials_exception
        employee_id = int(employee_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if employee is None:
        raise credentials_exception
    if not employee.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee account is inactive",
        )
    return employee


def get_current_seller(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Seller:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate merchant credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        role: Optional[str] = payload.get("role")
        seller_id_val = payload.get("seller_id")
        if role != "SELLER" or seller_id_val is None:
            raise credentials_exception
        seller_id = int(seller_id_val)
    except (JWTError, ValueError):
        raise credentials_exception

    seller = db.query(Seller).filter(Seller.seller_id == seller_id).first()
    if seller is None:
        raise credentials_exception
    if not seller.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Merchant account is suspended or inactive",
        )
    return seller


# Role hierarchy ranking
ROLE_RANK: Dict[str, int] = {
    "SUPER_ADMIN": 1000,
    "COURIER_ADMIN": 500,
    "HUB_MANAGER": 100,
    "CLERK": 50,
    "WAREHOUSE_STAFF": 40,
    "COURIER": 30,
    "DRIVER": 20,
}


def get_role_rank(role: Union[str, EmployeeRole]) -> int:
    role_str = role.value if isinstance(role, EmployeeRole) else str(role)
    return ROLE_RANK.get(role_str, 0)


def can_manage_target(manager: Employee, target: Employee) -> bool:
    """Enforces strict multi-tenant organizational hierarchy and tenant scope:
    - Super Root Admin (SUPER_ADMIN) has global cross-tenant platform jurisdiction.
    - An employee can update their own profile.
    - Target SUPER_ADMIN cannot be managed by any lower role.
    - Courier Admin (COURIER_ADMIN) can manage personnel within their own carrier tenant whose rank is strictly lower.
    - Hub Manager (HUB_MANAGER) can manage personnel within their own carrier tenant AND stationed at their specific hub whose rank is strictly lower.
    """
    mgr_role_str = manager.role.value if isinstance(manager.role, EmployeeRole) else str(manager.role)
    tgt_role_str = target.role.value if isinstance(target.role, EmployeeRole) else str(target.role)

    if mgr_role_str == "SUPER_ADMIN":
        return True
    if manager.employee_id == target.employee_id:
        return True
    if tgt_role_str == "SUPER_ADMIN":
        return False
    if manager.courier_id is not None and target.courier_id is not None and manager.courier_id != target.courier_id:
        return False
    if mgr_role_str == "COURIER_ADMIN":
        return get_role_rank(manager.role) > get_role_rank(target.role)
    if mgr_role_str == "HUB_MANAGER":
        if manager.hub_id != target.hub_id:
            return False
        return get_role_rank(manager.role) > get_role_rank(target.role)
    return False


def require_role(*roles: Union[str, EmployeeRole]) -> Callable[..., Employee]:
    allowed_roles: List[str] = [
        r.value if isinstance(r, EmployeeRole) else str(r) for r in roles
    ]

    def role_checker(current_user: Employee = Depends(get_current_user)) -> Employee:
        user_role_str = (
            current_user.role.value
            if isinstance(current_user.role, EmployeeRole)
            else str(current_user.role)
        )
        if user_role_str not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions: User role '{user_role_str}' not in allowed roles {allowed_roles}",
            )
        return current_user

    return role_checker

