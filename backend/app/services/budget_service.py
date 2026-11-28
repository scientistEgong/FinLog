"""Validate and coordinate category budget operations."""
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Budget
from app.repositories import budget_repository, category_repository
from app.schemas.budget import BudgetComparison, BudgetIn, BudgetOut, BudgetPage
from app.services.errors import ConflictError, DomainValidationError, NotFoundError
from app.services.dates import week_start
from app.services.money import format_naira, kobo_to_decimal
from app.services.validation import check_date_in_range


# ============================================================
# 1. Response mapping and domain validation
# ============================================================
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


def _is_budget_unique_violation(error: IntegrityError) -> bool:
    """Recognize only the database constraint that prevents duplicate period rows."""
    message = str(getattr(error, "orig", error)).lower()
    return "uq_budget_period_category" in message or all(
        column in message for column in ("budgets.period_type", "budgets.period_start", "budgets.category_id")
    )


def _commit_or_raise_conflict(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        if _is_budget_unique_violation(error):
            raise ConflictError("A budget already exists for this category and period.") from None
        raise


def _period_end(period_type: str, period_start: date) -> date:
    if period_type == "week":
        return period_start + timedelta(days=6)
    return (period_start.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)


def build_budget_comparison(
    period_type: str,
    period_start: date,
    budget_rows: list[tuple[int, str, bool, int]],
    actual_rows: list[tuple[int, str, int]],
) -> list[BudgetComparison]:
    """Combine eligible allocations and ordinary spending for one canonical period."""
    budgets = {
        category_id: (category_name, int(amount_kobo))
        for category_id, category_name, is_savings, amount_kobo in budget_rows
        if not is_savings
    }
    actuals = {
        category_id: (category_name, int(amount_kobo))
        for category_id, category_name, amount_kobo in actual_rows
    }
    comparisons = []

    for category_id in sorted(set(budgets) | set(actuals)):
        budget_row = budgets.get(category_id)
        actual_row = actuals.get(category_id)
        budget_name, budget_kobo = budget_row if budget_row is not None else (actual_row[0], 0)
        actual_name, actual_kobo = actual_row if actual_row is not None else (budget_name, 0)
        remaining_kobo = max(budget_kobo - actual_kobo, 0)
        overspent_kobo = max(actual_kobo - budget_kobo, 0)
        utilization = (
            Decimal(actual_kobo) * Decimal(100) / Decimal(budget_kobo)
            if budget_kobo > 0 else None
        )
        comparisons.append(
            BudgetComparison(
                period_type=period_type,
                period_start=period_start,
                category_id=category_id,
                category_name=actual_name or budget_name,
                budget_kobo=budget_kobo,
                budget_display=format_naira(budget_kobo),
                budget_status="budget_needed" if budget_kobo == 0 else "set",
                actual_kobo=actual_kobo,
                actual_display=format_naira(actual_kobo),
                remaining_kobo=remaining_kobo,
                remaining_display=format_naira(remaining_kobo),
                overspent_kobo=overspent_kobo,
                overspent_display=format_naira(overspent_kobo),
                utilization_percent=utilization.quantize(Decimal("0.01")) if utilization is not None else None,
            )
        )
    return comparisons


# ============================================================
# 2. Budget listing and total calculation
# ============================================================
def list_budgets(db: Session, period_type: str, period_start: date) -> BudgetPage:
    _validate_period_start(period_type, period_start)
    budgets = budget_repository.list_for_period(db, period_type, period_start)
    today = date.today()
    period_end = _period_end(period_type, period_start)
    actual_through = min(today, period_end)
    actual_rows = (
        budget_repository.list_ordinary_spending_by_category(db, period_start, actual_through)
        if actual_through >= period_start else []
    )
    budget_rows = [
        (item.category_id, item.category.name, item.category.is_savings, item.amount_kobo)
        for item in budgets
    ]
    comparison = build_budget_comparison(
        period_type,
        period_start,
        budget_rows,
        actual_rows,
    )
    total = sum(row.budget_kobo for row in comparison)
    actual_total = sum(row.actual_kobo for row in comparison)
    remaining_total = sum(row.remaining_kobo for row in comparison)
    overspent_total = sum(row.overspent_kobo for row in comparison)
    is_partial_period = period_start <= today < period_end
    return BudgetPage(
        period_type=period_type,
        period_start=period_start,
        items=[_to_out(budget) for budget in budgets],
        total_budget_kobo=total,
        total_budget_display=format_naira(total),
        comparison=comparison,
        total_actual_kobo=actual_total,
        total_actual_display=format_naira(actual_total),
        total_remaining_kobo=remaining_total,
        total_remaining_display=format_naira(remaining_total),
        total_overspent_kobo=overspent_total,
        total_overspent_display=format_naira(overspent_total),
        is_partial_period=is_partial_period,
        actual_through=actual_through if actual_through >= period_start else None,
    )


# ============================================================
# 3. Budget create, update, and delete operations
# ============================================================
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
