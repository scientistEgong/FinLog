"""Persisted income and expense records; amounts are integer kobo."""
from datetime import date
from typing import Optional

from sqlalchemy import BigInteger, CheckConstraint, Date, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.category import Category
from app.models.mixins import TimestampMixin


# ============================================================
# 1. Transaction fields and persistence constraints
# ============================================================
class Transaction(TimestampMixin, Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("type IN ('income','expense')", name="ck_transactions_type"),
        CheckConstraint("amount_kobo > 0", name="ck_transactions_amount_positive"),
        Index("ix_transactions_date", "transaction_date"),
        Index("ix_transactions_category", "category_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str] = mapped_column(String(10))
    amount_kobo: Mapped[int] = mapped_column(BigInteger)  # integer kobo, never floats
    transaction_date: Mapped[date] = mapped_column(Date)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"))
    description: Mapped[str] = mapped_column(String(200))
    payment_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    category: Mapped[Category] = relationship()
