from datetime import date, datetime
from typing import Optional
from sqlalchemy import BigInteger, Boolean, Date, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import EmployeeRole


class Employee(Base):
    __tablename__ = "employees"

    employee_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    hub_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("hubs.hub_id", ondelete="RESTRICT"), nullable=False)
    courier_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("courier_companies.courier_id", ondelete="RESTRICT"), nullable=True, index=True)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(15), nullable=False)
    role: Mapped[EmployeeRole] = mapped_column(
        Enum(EmployeeRole, name="employee_role", create_type=False),
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    hire_date: Mapped[date] = mapped_column(Date, server_default=func.current_date(), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    hub: Mapped["Hub"] = relationship("Hub", back_populates="employees")
    courier: Mapped[Optional["CourierCompany"]] = relationship("CourierCompany", back_populates="employees")
