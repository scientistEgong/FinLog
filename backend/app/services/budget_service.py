"""Validate and coordinate category budget operations."""
from datetime import date

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Budget
from app.repositories import budget_repository, category_repository
from app.schemas.budget import BudgetIn, BudgetOut, BudgetPage
from app.services.errors import ConflictError, DomainValidationError, NotFoundError
from app.services.dates import week_start
from app.services.money import format_naira, kobo_to_decimal
from app.services.validation import check_date_in_range


def _to_out(budget: Budget) -> BudgetOut:
    return BudgetOut(
        id=budget.id,
        period_type=budget.period_type,
        period_start=budget.period_start,
        category_id=budget.category_id,
        category_name=budget.category.name,
        amount_kobo=budget.amount_kobo,
        amount_input=f"{kobo_to_decimal(budget.amount_kobo):.2f}",
        amount_display=format_naira(budget.amount_kobo),
    )


def _require_category(db: Session, category_id: int) -> None:
    if category_repository.get(db, category_id) is None:
        raise DomainValidationError("Category does not exist.", field="category_id")


def _validate_period_start(period_type: str, period_start: date) -> None:
    try:
        check_date_in_range(period_start)
    except ValueError as exc:
        raise DomainValidationError(str(exc), field="period_start") from None

    if period_type == "week" and period_start != week_start(period_start):
        raise DomainValidationError("A weekly budget period must start on Sunday.", field="period_start")
    if period_type == "month" and period_start.day != 1:
        raise DomainValidationError(
            "A monthly budget period must start on the first day of the month.", field="period_start"
        )


def _check_unique_period_category(db: Session, data: BudgetIn, excluding_id: int | None = None) -> None:
    existing = budget_repository.get_for_category_period(
        db,
        period_type=data.period_type,
        period_start=data.period_start,
        category_id=data.category_id,
        excluding_id=excluding_id,
    )
    if existing is not None:
        raise ConflictError("A budget already exists for this category and period.")


def _commit_or_raise_conflict(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError("A budget already exists for this category and period.") from None


def list_budgets(db: Session, period_type: str, period_start: date) -> BudgetPage:
    _validate_period_start(period_type, period_start)
    budgets = budget_repository.list_for_period(db, period_type, period_start)
    total = budget_repository.get_period_total(db, period_type, period_start)
    return BudgetPage(
        period_type=period_type,
        period_start=period_start,
        items=[_to_out(budget) for budget in budgets],
        total_budget_kobo=total,
        total_budget_display=format_naira(total),
    )


def create_budget(db: Session, data: BudgetIn) -> BudgetOut:
    _require_category(db, data.category_id)
    _check_unique_period_category(db, data)
    budget = Budget(
        period_type=data.period_type,
        period_start=data.period_start,
        category_id=data.category_id,
        amount_kobo=data.amount_kobo,
    )
    budget_repository.add(db, budget)
    _commit_or_raise_conflict(db)
    db.refresh(budget)
    return _to_out(budget_repository.get(db, budget.id))


def update_budget(db: Session, budget_id: int, data: BudgetIn) -> BudgetOut:
    budget = budget_repository.get(db, budget_id)
    if budget is None:
        raise NotFoundError("Budget not found.")
    _require_category(db, data.category_id)
    _check_unique_period_category(db, data, excluding_id=budget_id)
    budget.period_type = data.period_type
    budget.period_start = data.period_start
    budget.category_id = data.category_id
    budget.amount_kobo = data.amount_kobo
    _commit_or_raise_conflict(db)
    db.refresh(budget)
    return _to_out(budget_repository.get(db, budget_id))


def delete_budget(db: Session, budget_id: int) -> None:
    budget = budget_repository.get(db, budget_id)
    if budget is None:
        raise NotFoundError("Budget not found.")
    budget_repository.delete(db, budget)
    db.commit()
