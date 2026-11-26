"""Database aggregates used to build the dashboard summary."""
from datetime import date

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


def get_period_totals(db: Session, date_from: date, date_to: date) -> tuple[int, int, int]:
    """Return income, ordinary expenditure, and savings totals for a date range."""
    is_income = Transaction.type == "income"
    is_expense = Transaction.type == "expense"
    is_savings_category = Category.is_savings.is_(True)
    is_in_range = Transaction.transaction_date.between(date_from, date_to)

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
        .where(is_in_range)
    )

    total_income, total_expenditure, total_savings = db.execute(statement).one()
    return int(total_income), int(total_expenditure), int(total_savings)


def get_period_spending_by_category(
    db: Session, date_from: date, date_to: date
) -> list[tuple[int, str, int]]:
    """Return category id, name, and ordinary expenditure total, highest first."""
    statement = (
        select(Category.id, Category.name, func.sum(Transaction.amount_kobo))
        .join(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.type == "expense",
            ~Category.is_savings.is_(True),
            Transaction.transaction_date.between(date_from, date_to),
        )
        .group_by(Category.id, Category.name)
        .order_by(func.sum(Transaction.amount_kobo).desc(), Category.name.asc())
    )

    rows = db.execute(statement).all()
    return [(int(category_id), str(category_name), int(total_kobo)) for category_id, category_name, total_kobo in rows]
