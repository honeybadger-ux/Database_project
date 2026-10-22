from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, DateTime, String, Text, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Dispute(Base):
    __tablename__ = "disputes"

    dispute_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    parcel_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("parcels.parcel_id", ondelete="CASCADE"), nullable=False, index=True)
    raised_by_type: Mapped[str] = mapped_column(String(30), nullable=False)  # 'CUSTOMER', 'SELLER', 'COURIER'
    raised_by_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    raised_by_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    courier_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("courier_companies.courier_id", ondelete="SET NULL"), nullable=True, index=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="OPEN", nullable=False)  # 'OPEN', 'IN_INVESTIGATION', 'RESOLVED', 'REJECTED'
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    parcel: Mapped["Parcel"] = relationship("Parcel", back_populates="disputes")
    courier: Mapped[Optional["CourierCompany"]] = relationship("CourierCompany", back_populates="disputes")
    resolver: Mapped[Optional["Employee"]] = relationship("Employee", foreign_keys=[resolved_by])
