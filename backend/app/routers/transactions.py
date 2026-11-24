from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.config import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.database import get_db
from app.schemas.transaction import TransactionIn, TransactionOut, TransactionPage
from app.services import transaction_service

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("", response_model=TransactionPage)
def list_transactions(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    type_: Optional[Literal["income", "expense"]] = Query(None, alias="type"),
    category_id: Optional[int] = None,
    q: Optional[str] = Query(None, max_length=100),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    return transaction_service.list_transactions(
        db,
        date_from=date_from,
        date_to=date_to,
        type_=type_,
        category_id=category_id,
        q=q,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=TransactionOut, status_code=201)
def create_transaction(data: TransactionIn, db: Session = Depends(get_db)):
    return transaction_service.create_transaction(db, data)


@router.get("/{transaction_id}", response_model=TransactionOut)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    return transaction_service.get_transaction(db, transaction_id)


@router.put("/{transaction_id}", response_model=TransactionOut)
def update_transaction(transaction_id: int, data: TransactionIn, db: Session = Depends(get_db)):
    return transaction_service.update_transaction(db, transaction_id, data)


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction_service.delete_transaction(db, transaction_id)
    return Response(status_code=204)
