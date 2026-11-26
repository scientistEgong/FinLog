"""Database queries for category reads, writes, and usage checks."""
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Budget, Category, Transaction


# ============================================================
# 1. Read and persist categories
# ============================================================
def list_all(db: Session) -> list[Category]:
    stmt = select(Category).order_by(Category.is_default.desc(), Category.id)
    return list(db.scalars(stmt).all())


def get(db: Session, category_id: int) -> Optional[Category]:
    return db.get(Category, category_id)


def get_by_name(db: Session, name: str) -> Optional[Category]:
    stmt = select(Category).where(func.lower(Category.name) == name.lower())
    return db.scalars(stmt).first()


def add(db: Session, category: Category) -> Category:
    db.add(category)
    db.flush()
    return category


def delete(db: Session, category: Category) -> None:
    db.delete(category)
    db.flush()


# ============================================================
# 2. Check references before allowing category deletion
# ============================================================
def is_in_use(db: Session, category_id: int) -> bool:
    # Check current transactions and budget references before allowing deletion.
    used_by_transactions = db.scalar(
        select(func.count(Transaction.id)).where(Transaction.category_id == category_id)
    )
    used_by_budgets = db.scalar(select(func.count(Budget.id)).where(Budget.category_id == category_id))
    return (used_by_transactions or 0) > 0 or (used_by_budgets or 0) > 0
