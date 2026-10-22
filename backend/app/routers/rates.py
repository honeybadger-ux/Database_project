from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.rate import RateComparisonResponse, RateEstimateRequest
from app.services.rate_service import compare_courier_rates

router = APIRouter(prefix="/api/rates", tags=["Rates & Carrier Recommendation"])


@router.post("/compare", response_model=RateComparisonResponse)
def get_rate_comparison(
    request: RateEstimateRequest,
    db: Session = Depends(get_db),
) -> RateComparisonResponse:
    """Compares all active courier carriers for a given origin/destination lane and parcel dimensions.

    Returns computed quotes tagged with badges:
    - CHEAPEST: Lowest total shipping cost
    - FASTEST: Lowest estimated transit days
    - TOP_RATED: Highest composite SLA and reliability score
    - BEST_VALUE: Both cheapest and fastest
    """
    return compare_courier_rates(db, request)
