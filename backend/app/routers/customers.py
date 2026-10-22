from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_user
from app.database import get_db
from app.models.customer import Customer
from app.models.employee import Employee
from app.schemas.customer import CustomerCreate, CustomerResponse, CustomerUpdate

router = APIRouter(prefix="/api/customers", tags=["Customers"])


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer_in: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
) -> CustomerResponse:
    """Creates a new customer profile for parcel senders or receivers."""
    existing = db.query(Customer).filter(Customer.email == customer_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Customer with email '{customer_in.email}' already exists",
        )

    customer = Customer(
        full_name=customer_in.full_name,
        email=customer_in.email,
        phone=customer_in.phone,
        address_line1=customer_in.address_line1,
        address_line2=customer_in.address_line2,
        city=customer_in.city,
        state=customer_in.state,
        pincode=customer_in.pincode,
        country=customer_in.country,
    )
    db.add(customer)
    try:
        db.commit()
        db.refresh(customer)
        return CustomerResponse.model_validate(customer)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(getattr(exc, "orig", exc)),
        )


@router.get("", response_model=List[CustomerResponse])
def list_customers(
    search: Optional[str] = Query(None, description="Search by name, email, or phone"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
) -> List[CustomerResponse]:
    """Lists customers with optional search filtering."""
    query = db.query(Customer)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            Customer.full_name.ilike(search_pattern)
            | Customer.email.ilike(search_pattern)
            | Customer.phone.ilike(search_pattern)
        )
    customers = query.order_by(Customer.customer_id.desc()).offset(skip).limit(limit).all()
    return [CustomerResponse.model_validate(c) for c in customers]


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
) -> CustomerResponse:
    """Retrieves customer detail by ID."""
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found",
        )
    return CustomerResponse.model_validate(customer)
