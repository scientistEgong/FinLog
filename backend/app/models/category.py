from sqlalchemy import Boolean, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


# ============================================================
# 1. Category fields and case-insensitive uniqueness
# ============================================================
class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    # Savings-type categories are excluded from "expenditure" totals.
    is_savings: Mapped[bool] = mapped_column(Boolean, default=False)
    # Default categories ship with the app and cannot be deleted.
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)


# Names are unique regardless of letter case ("food" == "Food").
Index("uq_categories_name_ci", func.lower(Category.name), unique=True)
