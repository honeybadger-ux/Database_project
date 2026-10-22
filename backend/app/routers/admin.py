from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.auth.jwt import can_manage_target, get_password_hash, require_role
from app.database import get_db
from app.models.employee import Employee
from app.models.enums import EmployeeRole
from app.models.hub import Hub
from app.schemas.analytics import (
    DeliveryRate,
    HubThroughput,
    OverviewStats,
    StatusDistribution,
    TransitTime,
)
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeResponse,
    EmployeeUpdate,
)
from app.schemas.hub import HubCreate, HubResponse, HubUpdate
from app.services.analytics_service import (
    get_delivery_rates,
    get_hub_throughput,
    get_overview_stats,
    get_status_distribution,
    get_transit_times,
)

router = APIRouter(prefix="/api/admin", tags=["Admin & Analytics"])


# ─────────────────────────────────────────────────────────────────────────────
# Hub Management
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/hubs", response_model=List[HubResponse])
def list_hubs(
    courier_id: Optional[int] = Query(None, description="Filter by courier partner (Super Admin only)"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN", "COURIER_ADMIN", "HUB_MANAGER")),
) -> List[HubResponse]:
    """Lists logistics hubs with tenant isolation (SUPER_ADMIN sees all; COURIER_ADMIN and staff see their carrier's hubs)."""
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    query = db.query(Hub).options(joinedload(Hub.courier))

    if role_str == "SUPER_ADMIN":
        if courier_id is not None:
            query = query.filter(Hub.courier_id == courier_id)
    else:
        query = query.filter(Hub.courier_id == current_user.courier_id)

    if is_active is not None:
        query = query.filter(Hub.is_active == is_active)

    hubs = query.order_by(Hub.hub_id.asc()).all()
    return [HubResponse.model_validate(h) for h in hubs]


@router.post("/hubs", response_model=HubResponse, status_code=status.HTTP_201_CREATED)
def create_hub(
    hub_in: HubCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN", "COURIER_ADMIN")),
) -> HubResponse:
    """Creates a new logistics hub facility (Restricted to SUPER_ADMIN or COURIER_ADMIN)."""
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    effective_courier_id = hub_in.courier_id if (role_str == "SUPER_ADMIN" and hub_in.courier_id) else current_user.courier_id
    if not effective_courier_id:
        effective_courier_id = 1

    existing = db.query(Hub).filter(Hub.hub_name == hub_in.hub_name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Hub with name '{hub_in.hub_name}' already exists",
        )

    hub = Hub(
        hub_name=hub_in.hub_name,
        hub_type=hub_in.hub_type,
        address=hub_in.address,
        city=hub_in.city,
        state=hub_in.state,
        pincode=hub_in.pincode,
        phone=hub_in.phone,
        courier_id=effective_courier_id,
        is_active=hub_in.is_active,
    )
    db.add(hub)
    try:
        db.commit()
        db.refresh(hub)
        return HubResponse.model_validate(hub)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(getattr(exc, "orig", exc)),
        )


@router.put("/hubs/{hub_id}", response_model=HubResponse)
def update_hub(
    hub_id: int,
    hub_in: HubUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN", "COURIER_ADMIN", "HUB_MANAGER")),
) -> HubResponse:
    """Updates an existing hub facility with carrier tenant check."""
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    hub = db.query(Hub).filter(Hub.hub_id == hub_id).first()
    if not hub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hub with ID {hub_id} not found",
        )

    if role_str == "SUPER_ADMIN":
        pass
    elif role_str == "COURIER_ADMIN":
        if hub.courier_id != current_user.courier_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Carrier Tenant Violation: Cannot modify hubs of other courier companies.",
            )
    else:
        if current_user.hub_id != hub_id or hub.courier_id != current_user.courier_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Regional Scope Violation: You can only configure your assigned hub facility (Hub #{current_user.hub_id}).",
            )

    update_dict = hub_in.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(hub, field, value)

    try:
        db.commit()
        db.refresh(hub)
        return HubResponse.model_validate(hub)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(getattr(exc, "orig", exc)),
        )


# ─────────────────────────────────────────────────────────────────────────────
# Employee Management
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/employees", response_model=List[EmployeeResponse])
def list_employees(
    hub_id: Optional[int] = Query(None, description="Filter by assigned hub ID"),
    courier_id: Optional[int] = Query(None, description="Filter by courier partner (Super Admin only)"),
    role: Optional[EmployeeRole] = Query(None, description="Filter by employee role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    response: Response = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN", "COURIER_ADMIN", "HUB_MANAGER")),
) -> List[EmployeeResponse]:
    """Lists company employees with role, carrier tenant, and hub filtering."""
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    query = db.query(Employee).options(joinedload(Employee.hub), joinedload(Employee.courier))

    if role_str == "SUPER_ADMIN":
        if courier_id is not None:
            query = query.filter(Employee.courier_id == courier_id)
        if hub_id is not None:
            query = query.filter(Employee.hub_id == hub_id)
    elif role_str == "COURIER_ADMIN":
        query = query.filter(Employee.courier_id == current_user.courier_id)
        if hub_id is not None:
            query = query.filter(Employee.hub_id == hub_id)
    else:
        query = query.filter(
            Employee.courier_id == current_user.courier_id,
            Employee.hub_id == current_user.hub_id,
        )

    if role is not None:
        query = query.filter(Employee.role == role)
    if is_active is not None:
        query = query.filter(Employee.is_active == is_active)

    total = query.count()
    if response:
        response.headers["X-Total-Count"] = str(total)

    employees = query.order_by(Employee.employee_id.asc()).offset(skip).limit(limit).all()
    return [EmployeeResponse.model_validate(e) for e in employees]


@router.post("/employees", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    emp_in: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN", "COURIER_ADMIN", "HUB_MANAGER")),
) -> EmployeeResponse:
    """Creates a new employee with hashed credentials enforcing tenant hierarchy."""
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    target_role = emp_in.role.value if hasattr(emp_in.role, "value") else str(emp_in.role)

    # Hub verification
    hub = db.query(Hub).filter(Hub.hub_id == emp_in.hub_id).first()
    if not hub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hub with ID {emp_in.hub_id} does not exist",
        )

    if role_str == "SUPER_ADMIN":
        effective_courier_id = emp_in.courier_id or hub.courier_id or 1
    elif role_str == "COURIER_ADMIN":
        if hub.courier_id != current_user.courier_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Carrier Tenant Violation: Hub #{emp_in.hub_id} belongs to another courier partner.",
            )
        if target_role in ("SUPER_ADMIN", "COURIER_ADMIN"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Hierarchy Violation: Courier Admins cannot appoint other Admins or Super Admins.",
            )
        effective_courier_id = current_user.courier_id
    else:
        # HUB_MANAGER
        if emp_in.hub_id != current_user.hub_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Regional Scope Violation: You can only recruit personnel for Hub #{current_user.hub_id}.",
            )
        if target_role in ("SUPER_ADMIN", "COURIER_ADMIN", "HUB_MANAGER"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Hierarchy Violation: Hub Managers cannot appoint managerial or executive roles.",
            )
        effective_courier_id = current_user.courier_id

    existing = db.query(Employee).filter(Employee.email == emp_in.email.strip().lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee with email '{emp_in.email}' already exists",
        )

    emp = Employee(
        hub_id=emp_in.hub_id,
        courier_id=effective_courier_id,
        full_name=emp_in.full_name,
        email=emp_in.email.strip().lower(),
        phone=emp_in.phone,
        role=emp_in.role,
        password_hash=get_password_hash(emp_in.password),
        is_active=emp_in.is_active,
    )
    db.add(emp)
    try:
        db.commit()
        db.refresh(emp)
        return EmployeeResponse.model_validate(emp)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(getattr(exc, "orig", exc)),
        )


@router.put("/employees/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    emp_in: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN", "COURIER_ADMIN", "HUB_MANAGER")),
) -> EmployeeResponse:
    """Updates an employee record with strict hierarchy and multi-tenant validation."""
    emp = db.query(Employee).options(joinedload(Employee.hub), joinedload(Employee.courier)).filter(Employee.employee_id == employee_id).first()
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found",
        )

    # Enforce hierarchy and carrier boundary
    if not can_manage_target(current_user, emp):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hierarchy / Tenant Violation: You cannot modify employees of equal or higher tier, or personnel outside your courier partner organization.",
        )

    update_dict = emp_in.model_dump(exclude_unset=True)

    # Prevent self-deactivation
    if "is_active" in update_dict and update_dict["is_active"] is False:
        if employee_id == current_user.employee_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security Violation: You cannot deactivate your own account.",
            )

    if "password" in update_dict and update_dict["password"]:
        emp.password_hash = get_password_hash(update_dict.pop("password"))

    for field, value in update_dict.items():
        setattr(emp, field, value)

    try:
        db.commit()
        db.refresh(emp)
        return EmployeeResponse.model_validate(emp)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(getattr(exc, "orig", exc)),
        )


# ─────────────────────────────────────────────────────────────────────────────
# Analytics Endpoints (Multi-Tenant Scoped)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/analytics/overview", response_model=OverviewStats)
def get_analytics_overview(
    hub_id: Optional[int] = Query(None, description="Filter metrics by specific hub ID"),
    courier_id: Optional[int] = Query(None, description="Filter metrics by courier partner (Super Admin only)"),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN", "COURIER_ADMIN", "HUB_MANAGER")),
) -> OverviewStats:
    """Returns operational KPIs and entity counts (scoped to carrier tenant or regional hub)."""
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    effective_courier_id = courier_id if role_str == "SUPER_ADMIN" else current_user.courier_id
    effective_hub_id = hub_id if role_str in ("SUPER_ADMIN", "COURIER_ADMIN") else current_user.hub_id

    return get_overview_stats(db, hub_id=effective_hub_id, courier_id=effective_courier_id)


@router.get("/analytics/status-distribution", response_model=List[StatusDistribution])
def get_analytics_status_distribution(
    hub_id: Optional[int] = Query(None, description="Filter metrics by specific hub ID"),
    courier_id: Optional[int] = Query(None, description="Filter metrics by courier partner (Super Admin only)"),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN", "COURIER_ADMIN", "HUB_MANAGER")),
) -> List[StatusDistribution]:
    """Returns lifecycle parcel distribution breakdown."""
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    effective_courier_id = courier_id if role_str == "SUPER_ADMIN" else current_user.courier_id
    effective_hub_id = hub_id if role_str in ("SUPER_ADMIN", "COURIER_ADMIN") else current_user.hub_id

    return get_status_distribution(db, hub_id=effective_hub_id, courier_id=effective_courier_id)


@router.get("/analytics/hub-throughput", response_model=List[HubThroughput])
def get_analytics_hub_throughput(
    hub_id: Optional[int] = Query(None, description="Filter metrics by specific hub ID"),
    courier_id: Optional[int] = Query(None, description="Filter metrics by courier partner (Super Admin only)"),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN", "COURIER_ADMIN", "HUB_MANAGER")),
) -> List[HubThroughput]:
    """Returns scanning event volume and unique parcels per hub."""
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    effective_courier_id = courier_id if role_str == "SUPER_ADMIN" else current_user.courier_id
    effective_hub_id = hub_id if role_str in ("SUPER_ADMIN", "COURIER_ADMIN") else current_user.hub_id

    return get_hub_throughput(db, hub_id=effective_hub_id, courier_id=effective_courier_id)


@router.get("/analytics/transit-times", response_model=List[TransitTime])
def get_analytics_transit_times(
    hub_id: Optional[int] = Query(None, description="Filter metrics by specific hub ID"),
    courier_id: Optional[int] = Query(None, description="Filter metrics by courier partner (Super Admin only)"),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN", "COURIER_ADMIN", "HUB_MANAGER")),
) -> List[TransitTime]:
    """Returns average and min/max linehaul durations between hub pairs connected to the hub."""
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    effective_courier_id = courier_id if role_str == "SUPER_ADMIN" else current_user.courier_id
    effective_hub_id = hub_id if role_str in ("SUPER_ADMIN", "COURIER_ADMIN") else current_user.hub_id

    return get_transit_times(db, hub_id=effective_hub_id, courier_id=effective_courier_id)


@router.get("/analytics/delivery-rates", response_model=List[DeliveryRate])
def get_analytics_delivery_rates(
    hub_id: Optional[int] = Query(None, description="Filter metrics by specific hub ID"),
    courier_id: Optional[int] = Query(None, description="Filter metrics by courier partner (Super Admin only)"),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_role("SUPER_ADMIN", "COURIER_ADMIN", "HUB_MANAGER")),
) -> List[DeliveryRate]:
    """Returns last-mile delivery success rates and failure outcomes."""
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    effective_courier_id = courier_id if role_str == "SUPER_ADMIN" else current_user.courier_id
    effective_hub_id = hub_id if role_str in ("SUPER_ADMIN", "COURIER_ADMIN") else current_user.hub_id

    return get_delivery_rates(db, hub_id=effective_hub_id, courier_id=effective_courier_id)
