"""Validated filters and response shapes for financial analytics."""
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, model_validator

from app.services.validation import check_date_in_range


# ============================================================
# 1. Define chart response data and validate analytics filters
# ============================================================
class AnalyticsPeriod(BaseModel):
    period_start: date
    income_kobo: int
    expenditure_kobo: int
    savings_kobo: int
    available_change_kobo: int
    ordinary_expense_count: int
    average_expense_kobo: Decimal


class CategoryTotal(BaseModel):
    category_id: int
    category_name: str
    amount_kobo: int


class CategoryTrend(BaseModel):
    period_start: date
    category_name: str
    amount_kobo: int


class WeekdayAverage(BaseModel):
    weekday: int
    weekday_name: str
    average_amount_kobo: Decimal


class HighestSpendingPeriod(BaseModel):
    period_start: date
    expenditure_kobo: int


class AnalyticsOut(BaseModel):
    date_from: date
    date_to: date
    group_by: Literal["week", "month", "year"]
    periods: list[AnalyticsPeriod]
    spending_by_category: list[CategoryTotal]
    income_by_category: list[CategoryTotal]
    category_trends: list[CategoryTrend]
    spending_by_weekday: list[WeekdayAverage]
    highest_spending_period: HighestSpendingPeriod | None


class AnalyticsFilters(BaseModel):
    date_from: date
    date_to: date
    group_by: Literal["week", "month", "year"] = "month"

    @model_validator(mode="after")
    def validate_range(self):
        check_date_in_range(self.date_from)
        check_date_in_range(self.date_to)
        if self.date_from > self.date_to:
            raise ValueError("The start date must be on or before the end date.")
        return self
