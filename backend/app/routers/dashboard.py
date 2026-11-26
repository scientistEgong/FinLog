"""HTTP endpoint for the financial dashboard summary."""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.dashboard import DashboardOut
from app.services import dashboard_service

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


# ============================================================
# 1. Return the backend-calculated dashboard summary
# ============================================================
@router.get("", response_model=DashboardOut)
def get_dashboard_summary(
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
):
    return dashboard_service.get_dashboard_summary(db, date_from, date_to)
