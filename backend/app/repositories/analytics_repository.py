"""Aggregated transaction rows used by the analytics service."""
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Budget, Category, Transaction


# ============================================================
# 1. Aggregate transactions by day, type, and category
# ============================================================
def list_daily_category_totals(db: Session, date_from: date, date_to: date) -> list[tuple]:
    statement = (
        select(
            Transaction.transaction_date,
            Transaction.type,
            Transaction.category_id,
            Category.name,
            Category.is_savings,
            func.sum(Transaction.amount_kobo),
            func.count(Transaction.id),
        )
        .join(Category, Transaction.category_id == Category.id)
        .where(Transaction.transaction_date >= date_from, Transaction.transaction_date <= date_to)
        .group_by(
            Transaction.transaction_date,
            Transaction.type,
            Transaction.category_id,
            Category.name,
            Category.is_savings,
        )
        .order_by(Transaction.transaction_date)
    )
    return list(db.execute(statement).all())


def list_top_ordinary_expenses(db: Session, date_from: date, date_to: date, limit: int) -> list[tuple]:
    statement = (
        select(
            Transaction.id,
            Transaction.description,
            Category.name,
            Transaction.transaction_date,
            Transaction.amount_kobo,
        )
        .join(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.type == "expense",
            ~Category.is_savings.is_(True),
            Transaction.transaction_date >= date_from,
            Transaction.transaction_date <= date_to,
        )
        .order_by(Transaction.amount_kobo.desc(), Transaction.id.desc())
        .limit(limit)
    )
    return list(db.execute(statement).all())


# ============================================================
# 2. Read budget allocations for analytics comparisons
# ============================================================
def list_budget_allocations(
    db: Session, period_type: str, period_starts: list[date]
) -> list[tuple]:
    """Read budget rows for canonical period starts used by an analytics range."""
    if not period_starts:
        return []

    statement = (
        select(
            Budget.period_start,
            Budget.category_id,
            Category.name,
            Category.is_savings,
            Budget.amount_kobo,
        )
        .join(Category, Budget.category_id == Category.id)
        .where(
            Budget.period_type == period_type,
            Budget.period_start.in_(period_starts),
        )
        .order_by(Budget.period_start, Budget.category_id)
    )
    return list(db.execute(statement).all())
