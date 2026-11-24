from datetime import date

from sqlalchemy import BigInteger, CheckConstraint, Date, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.category import Category
from app.models.mixins import TimestampMixin


class Budget(TimestampMixin, Base):
    """One allocation for one category in one week or month.

    period_start is the Sunday of the week, or the 1st of the month.
    Weekly/monthly totals on the dashboard are the SUM of these rows.
    """

    __tablename__ = "budgets"
    __table_args__ = (
        UniqueConstraint("period_type", "period_start", "category_id", name="uq_budget_period_category"),
        CheckConstraint("period_type IN ('week','month')", name="ck_budgets_period_type"),
        CheckConstraint("amount_kobo >= 0", name="ck_budgets_amount_nonnegative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    period_type: Mapped[str] = mapped_column(String(10))
    period_start: Mapped[date] = mapped_column(Date)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"))
    amount_kobo: Mapped[int] = mapped_column(BigInteger)

    category: Mapped[Category] = relationship()
