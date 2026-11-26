"""HTTP endpoints for listing, creating, and deleting categories."""
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.category import CategoryIn, CategoryOut
from app.services import category_service

router = APIRouter(prefix="/api/categories", tags=["categories"])


# ============================================================
# 1. Expose category reads and validated changes
# ============================================================
@router.get("", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return [CategoryOut.model_validate(c, from_attributes=True) for c in category_service.list_categories(db)]


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(data: CategoryIn, db: Session = Depends(get_db)):
    return CategoryOut.model_validate(category_service.create_category(db, data), from_attributes=True)


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    category_service.delete_category(db, category_id)
    return Response(status_code=204)
