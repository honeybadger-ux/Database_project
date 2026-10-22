from datetime import datetime
from typing import List, Optional
from decimal import Decimal
from sqlalchemy import BigInteger, Boolean, DateTime, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CourierCompany(Base):
    __tablename__ = "courier_companies"

    courier_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    base_rate: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=40.00, nullable=False)
    rating: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=4.50, nullable=False)
    tracking_url_prefix: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    hubs: Mapped[List["Hub"]] = relationship("Hub", back_populates="courier")
    employees: Mapped[List["Employee"]] = relationship("Employee", back_populates="courier")
    shipments: Mapped[List["Shipment"]] = relationship("Shipment", back_populates="courier")
    parcels: Mapped[List["Parcel"]] = relationship("Parcel", back_populates="courier")
    rate_cards: Mapped[List["CourierRateCard"]] = relationship("CourierRateCard", back_populates="courier")
    serviceable_regions: Mapped[List["ServiceableRegion"]] = relationship("ServiceableRegion", back_populates="courier")
    pincode_serviceabilities: Mapped[List["CourierPincodeServiceability"]] = relationship("CourierPincodeServiceability", back_populates="courier")
    disputes: Mapped[List["Dispute"]] = relationship("Dispute", back_populates="courier")
