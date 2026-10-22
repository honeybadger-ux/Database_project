from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.models.enums import EmployeeRole
from app.schemas.hub import HubResponse


class EmployeeBase(BaseModel):
    hub_id: int
    courier_id: Optional[int] = None
    full_name: str
    email: str
    phone: str
    role: EmployeeRole
    is_active: bool = True


class EmployeeCreate(EmployeeBase):
    password: str


class EmployeeUpdate(BaseModel):
    hub_id: Optional[int] = None
    courier_id: Optional[int] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[EmployeeRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class EmployeeResponse(EmployeeBase):
    employee_id: int
    hire_date: date
    created_at: datetime
    hub: Optional[HubResponse] = None
    hub_name: Optional[str] = None
    courier_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    employee: EmployeeResponse
