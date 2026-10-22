from datetime import datetime
from typing import List, Optional
from sqlalchemy import BigInteger, Boolean, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import HubType


class Hub(Base):
    __tablename__ = "hubs"

    hub_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    courier_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("courier_companies.courier_id", ondelete="RESTRICT"), default=1, nullable=False, index=True)
    hub_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    hub_type: Mapped[HubType] = mapped_column(
        Enum(HubType, name="hub_type", create_type=False),
        nullable=False,
    )
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    pincode: Mapped[str] = mapped_column(String(10), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    courier: Mapped["CourierCompany"] = relationship("CourierCompany", back_populates="hubs")
    employees: Mapped[List["Employee"]] = relationship(
        "Employee",
        back_populates="hub",
    )
