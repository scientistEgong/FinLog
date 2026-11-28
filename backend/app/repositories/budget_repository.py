"""Database queries and persistence for weekly and monthly budget rows."""
from datetime import date
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models import Budget, Category, Transaction


# ============================================================
# 1. Read budget rows and period allocations
# ============================================================
def list_for_period(db: Session, period_type: str, period_start: date) -> list[Budget]:
    statement = (
        select(Budget)
        .options(joinedload(Budget.category))
        .where(Budget.period_type == period_type, Budget.period_start == period_start)
        .order_by(Budget.category_id, Budget.id)
    )
    return list(db.scalars(statement).all())


def get(db: Session, budget_id: int) -> Optional[Budget]:
    statement = select(Budget).options(joinedload(Budget.category)).where(Budget.id == budget_id)
    return db.scalars(statement).first()


def get_for_category_period(
    db: Session,
    *,
    period_type: str,
    period_start: date,
    category_id: int,
    excluding_id: Optional[int] = None,
) -> Optional[Budget]:
    statement = select(Budget).where(
        Budget.period_type == period_type,
        Budget.period_start == period_start,
        Budget.category_id == category_id,
    )
    if excluding_id is not None:
        statement = statement.where(Budget.id != excluding_id)
    return db.scalars(statement).first()


# ============================================================
# 2. Persist allocation changes and sum a period's total
# ============================================================
def add(db: Session, budget: Budget) -> Budget:
    db.add(budget)
    db.flush()
    return budget


def delete(db: Session, budget: Budget) -> None:
    db.delete(budget)
    db.flush()


def get_period_total(db: Session, period_type: str, period_start: date) -> int:
    statement = select(func.coalesce(func.sum(Budget.amount_kobo), 0)).where(
        Budget.period_type == period_type,
        Budget.period_start == period_start,
    )
    return int(db.scalar(statement) or 0)


def list_ordinary_spending_by_category(db: Session, date_from: date, date_to: date) -> list[tuple]:
    """Return category totals for ordinary expenses, excluding savings contributions."""
    statement = (
        select(Category.id, Category.name, func.sum(Transaction.amount_kobo))
        .join(Transaction, Transaction.category_id == Category.id)
        .where(
            Transaction.type == "expense",
            Category.is_savings.is_(False),
            Transaction.transaction_date >= date_from,
            Transaction.transaction_date <= date_to,
        )
        .group_by(Category.id, Category.name)
        .order_by(Category.id)
    )
    return list(db.execute(statement).all())
