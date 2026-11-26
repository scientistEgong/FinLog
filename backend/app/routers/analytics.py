"""HTTP endpoint for date-filtered financial analytics."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.analytics import AnalyticsFilters, AnalyticsOut
from app.services import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# ============================================================
# 1. Validate the requested range and return aggregated analyses
# ============================================================
@router.get("", response_model=AnalyticsOut)
def get_analytics(
    filters: AnalyticsFilters = Depends(),
    db: Session = Depends(get_db),
):
    return analytics_service.get_analytics(db, filters)
