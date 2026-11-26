"""Database aggregates used to build the all-time dashboard summary."""
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import Category, Transaction


# ============================================================
# 1. Aggregate dashboard totals in integer kobo
# ============================================================
def get_all_time_totals(db: Session) -> tuple[int, int, int]:
    """Return income, ordinary expenditure, and savings totals in kobo."""
    is_income = Transaction.type == "income"
    is_expense = Transaction.type == "expense"
    is_savings_category = Category.is_savings.is_(True)

    statement = (
        select(
            func.coalesce(func.sum(case((is_income, Transaction.amount_kobo), else_=0)), 0),
            func.coalesce(
                func.sum(case((is_expense & ~is_savings_category, Transaction.amount_kobo), else_=0)), 0
            ),
            func.coalesce(
                func.sum(case((is_expense & is_savings_category, Transaction.amount_kobo), else_=0)), 0
            ),
        )
        .join(Category, Transaction.category_id == Category.id)
    )

    total_income, total_expenditure, total_savings = db.execute(statement).one()
    return int(total_income), int(total_expenditure), int(total_savings)
