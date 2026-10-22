from typing import Optional
from pydantic import BaseModel, ConfigDict


class StatusDistribution(BaseModel):
    status: str
    parcel_count: int
    percentage: float

    model_config = ConfigDict(from_attributes=True)


class HubThroughput(BaseModel):
    hub_name: str
    total_events: int
    unique_parcels: int

    model_config = ConfigDict(from_attributes=True)


class TransitTime(BaseModel):
    origin_hub: str
    destination_hub: str
    total_shipments: int
    avg_transit_hours: float
    min_transit_hours: float
    max_transit_hours: float

    model_config = ConfigDict(from_attributes=True)


class DeliveryRate(BaseModel):
    outcome: str
    attempt_count: int
    rate_percentage: float
    signatures_obtained: int

    model_config = ConfigDict(from_attributes=True)


class OverviewStats(BaseModel):
    total_parcels: int
    active_parcels: int
    delivered_parcels: int
    total_hubs: int
    total_employees: int
    total_shipments: int

    model_config = ConfigDict(from_attributes=True)
