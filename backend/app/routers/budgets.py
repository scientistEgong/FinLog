"""HTTP endpoints for weekly and monthly category budgets."""
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.budget import BudgetIn, BudgetOut, BudgetPage
from app.services import budget_service

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.get("", response_model=BudgetPage)
def list_budgets(
    period_type: Literal["week", "month"],
    period_start: date,
    db: Session = Depends(get_db),
):
    return budget_service.list_budgets(db, period_type, period_start)


@router.post("", response_model=BudgetOut, status_code=201)
def create_budget(data: BudgetIn, db: Session = Depends(get_db)):
    return budget_service.create_budget(db, data)


@router.put("/{budget_id}", response_model=BudgetOut)
def update_budget(budget_id: int, data: BudgetIn, db: Session = Depends(get_db)):
    return budget_service.update_budget(db, budget_id, data)


@router.delete("/{budget_id}", status_code=204)
def delete_budget(budget_id: int, db: Session = Depends(get_db)):
    budget_service.delete_budget(db, budget_id)
    return Response(status_code=204)
