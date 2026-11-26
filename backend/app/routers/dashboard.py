"""HTTP endpoint for the all-time financial dashboard summary."""
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
def get_dashboard_summary(db: Session = Depends(get_db)):
    return dashboard_service.get_dashboard_summary(db)
