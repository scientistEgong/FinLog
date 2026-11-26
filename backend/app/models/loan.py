from datetime import date
from typing import Optional

from sqlalchemy import BigInteger, CheckConstraint, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin


# ============================================================
# 1. Loan terms and derived outstanding balance relationship
# ============================================================
class Loan(TimestampMixin, Base):
    """Money borrowed or lent. Never written to the transactions table.

    Outstanding balance is NOT stored: it is derived as
    principal_kobo + interest_kobo - SUM(repayments), so it can never drift.
    """

    __tablename__ = "loans"
    __table_args__ = (
        CheckConstraint("direction IN ('borrowed','lent')", name="ck_loans_direction"),
        CheckConstraint("principal_kobo > 0", name="ck_loans_principal_positive"),
        CheckConstraint("interest_kobo >= 0", name="ck_loans_interest_nonnegative"),
        CheckConstraint("due_date IS NULL OR due_date >= opened_date", name="ck_loans_due_after_open"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    direction: Mapped[str] = mapped_column(String(10))
    counterparty: Mapped[str] = mapped_column(String(100))  # lender or borrower
    principal_kobo: Mapped[int] = mapped_column(BigInteger)
    interest_kobo: Mapped[int] = mapped_column(BigInteger, default=0)  # flat interest amount
    opened_date: Mapped[date] = mapped_column(Date)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    repayments: Mapped[list["LoanRepayment"]] = relationship(
        back_populates="loan", cascade="all, delete-orphan", passive_deletes=True
    )


# ============================================================
# 2. Repayment records linked to each loan
# ============================================================
class LoanRepayment(TimestampMixin, Base):
    __tablename__ = "loan_repayments"
    __table_args__ = (
        CheckConstraint("amount_kobo > 0", name="ck_repayments_amount_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    loan_id: Mapped[int] = mapped_column(ForeignKey("loans.id", ondelete="CASCADE"))
    amount_kobo: Mapped[int] = mapped_column(BigInteger)
    payment_date: Mapped[date] = mapped_column(Date)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    loan: Mapped[Loan] = relationship(back_populates="repayments")
