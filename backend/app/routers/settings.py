"""HTTP endpoints for reading and changing the opening balance setting."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.setting import OpeningBalanceIn, OpeningBalanceOut
from app.services import settings_service

router = APIRouter(prefix="/api/settings", tags=["settings"])


# ============================================================
# 1. Expose opening-balance read and update operations
# ============================================================
@router.get("/opening-balance", response_model=OpeningBalanceOut)
def get_opening_balance(db: Session = Depends(get_db)):
    return settings_service.get_opening_balance(db)


@router.put("/opening-balance", response_model=OpeningBalanceOut)
def set_opening_balance(data: OpeningBalanceIn, db: Session = Depends(get_db)):
    return settings_service.set_opening_balance(db, data)
