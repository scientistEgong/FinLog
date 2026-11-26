"""Aggregated transaction rows used by the analytics service."""
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Category, Transaction


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
