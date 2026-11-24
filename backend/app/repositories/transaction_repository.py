"""Transaction queries and persistence; business validation stays in services."""
from datetime import date
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models import Transaction


def _conditions(date_from, date_to, type_, category_id, q) -> list:
    # Share filters across the total count and result page so both describe the same query.
    conditions = []
    if date_from:
        conditions.append(Transaction.transaction_date >= date_from)
    if date_to:
        conditions.append(Transaction.transaction_date <= date_to)
    if type_:
        conditions.append(Transaction.type == type_)
    if category_id:
        conditions.append(Transaction.category_id == category_id)
    if q:
        term = q.lower()
        conditions.append(
            or_(
                func.lower(Transaction.description).contains(term, autoescape=True),
                func.lower(func.coalesce(Transaction.notes, "")).contains(term, autoescape=True),
            )
        )
    return conditions


def list_filtered(
    db: Session,
    *,
    date_from: Optional[date],
    date_to: Optional[date],
    type_: Optional[str],
    category_id: Optional[int],
    q: Optional[str],
    limit: int,
    offset: int,
) -> tuple[list[Transaction], int]:
    conditions = _conditions(date_from, date_to, type_, category_id, q)
    total = db.scalar(select(func.count(Transaction.id)).where(*conditions)) or 0
    stmt = (
        select(Transaction)
        .options(joinedload(Transaction.category))
        .where(*conditions)
        # ID breaks same-day ties deterministically so pagination remains stable.
        .order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(stmt).all()), total


def get(db: Session, transaction_id: int) -> Optional[Transaction]:
    return db.get(Transaction, transaction_id)


def add(db: Session, transaction: Transaction) -> Transaction:
    db.add(transaction)
    db.flush()
    return transaction


def delete(db: Session, transaction: Transaction) -> None:
    db.delete(transaction)
    db.flush()
