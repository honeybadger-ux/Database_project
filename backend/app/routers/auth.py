from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.jwt import create_access_token, get_current_user, verify_password
from app.database import get_db
from app.models.employee import Employee
from app.schemas.employee import EmployeeResponse, LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Authenticates employee with email and password and returns JWT token."""
    employee = db.query(Employee).filter(Employee.email == login_data.email).first()
    if not employee or not verify_password(login_data.password, employee.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not employee.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee account is deactivated",
        )

    role_val = (
        employee.role.value
        if hasattr(employee.role, "value")
        else str(employee.role)
    )

    courier_name = employee.courier.name if employee.courier else None
    hub_name = employee.hub.hub_name if employee.hub else None

    access_token = create_access_token(
        data={
            "sub": str(employee.employee_id),
            "email": employee.email,
            "role": role_val,
            "hub_id": employee.hub_id,
            "courier_id": employee.courier_id,
            "courier_name": courier_name,
        }
    )

    emp_resp = EmployeeResponse.model_validate(employee)
    emp_resp.courier_name = courier_name
    emp_resp.hub_name = hub_name

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        employee=emp_resp,
    )


@router.get("/me", response_model=EmployeeResponse)
def get_me(
    current_user: Employee = Depends(get_current_user),
) -> EmployeeResponse:
    """Returns currently authenticated employee profile."""
    emp_resp = EmployeeResponse.model_validate(current_user)
    if current_user.courier:
        emp_resp.courier_name = current_user.courier.name
    if current_user.hub:
        emp_resp.hub_name = current_user.hub.hub_name
    return emp_resp
