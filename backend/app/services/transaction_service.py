from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Transaction
from app.repositories import category_repository, transaction_repository
from app.schemas.transaction import TransactionIn, TransactionOut, TransactionPage
from app.services.errors import DomainValidationError, NotFoundError
from app.services.money import format_naira, kobo_to_decimal
from app.services.validation import check_date_order


def to_out(txn: Transaction) -> TransactionOut:
    return TransactionOut(
        id=txn.id,
        type=txn.type,
        amount_kobo=txn.amount_kobo,
        amount_input=f"{kobo_to_decimal(txn.amount_kobo):.2f}",
        amount_display=format_naira(txn.amount_kobo),
        transaction_date=txn.transaction_date,
        category_id=txn.category_id,
        category_name=txn.category.name,
        is_savings=txn.category.is_savings,
        description=txn.description,
        payment_method=txn.payment_method,
        notes=txn.notes,
    )


def _require_category(db: Session, category_id: int) -> None:
    if category_repository.get(db, category_id) is None:
        raise DomainValidationError("Category does not exist.", field="category_id")


def _apply(txn: Transaction, data: TransactionIn) -> None:
    txn.type = data.type
    txn.amount_kobo = data.amount_kobo
    txn.transaction_date = data.transaction_date
    txn.category_id = data.category_id
    txn.description = data.description
    txn.payment_method = data.payment_method
    txn.notes = data.notes


def create_transaction(db: Session, data: TransactionIn) -> TransactionOut:
    _require_category(db, data.category_id)
    txn = Transaction()
    _apply(txn, data)
    transaction_repository.add(db, txn)
    db.commit()
    db.refresh(txn)
    return to_out(txn)


def update_transaction(db: Session, transaction_id: int, data: TransactionIn) -> TransactionOut:
    txn = transaction_repository.get(db, transaction_id)
    if txn is None:
        raise NotFoundError("Transaction not found.")
    _require_category(db, data.category_id)
    _apply(txn, data)
    db.commit()
    db.refresh(txn)
    return to_out(txn)


def delete_transaction(db: Session, transaction_id: int) -> None:
    txn = transaction_repository.get(db, transaction_id)
    if txn is None:
        raise NotFoundError("Transaction not found.")
    transaction_repository.delete(db, txn)
    db.commit()


def get_transaction(db: Session, transaction_id: int) -> TransactionOut:
    txn = transaction_repository.get(db, transaction_id)
    if txn is None:
        raise NotFoundError("Transaction not found.")
    return to_out(txn)


def list_transactions(
    db: Session,
    *,
    date_from: Optional[date],
    date_to: Optional[date],
    type_: Optional[str],
    category_id: Optional[int],
    q: Optional[str],
    limit: int,
    offset: int,
) -> TransactionPage:
    try:
        check_date_order(date_from, date_to)
    except ValueError as exc:
        raise DomainValidationError(str(exc), field="date_from") from None
    items, total = transaction_repository.list_filtered(
        db,
        date_from=date_from,
        date_to=date_to,
        type_=type_,
        category_id=category_id,
        q=(q or "").strip() or None,
        limit=limit,
        offset=offset,
    )
    return TransactionPage(items=[to_out(t) for t in items], total=total, limit=limit, offset=offset)
