"""Response shapes for the financial dashboard summary."""
from datetime import date
from decimal import Decimal

from pydantic import BaseModel


# ============================================================
# 1. Define the backend-calculated dashboard response
# ============================================================
class DashboardCategoryTotal(BaseModel):
    category_id: int
    category_name: str
    amount_kobo: int
    amount_display: str
    percentage_of_expenditure: Decimal


class DashboardObservation(BaseModel):
    code: str
    message: str


class DashboardPeriodSummary(BaseModel):
    date_from: date
    date_to: date
    income_kobo: int
    income_display: str
    expenditure_kobo: int
    expenditure_display: str
    savings_kobo: int
    savings_display: str
    available_change_kobo: int
    available_change_display: str
    savings_rate_percent: Decimal | None
    spending_by_category: list[DashboardCategoryTotal]
    observations: list[DashboardObservation]


class DashboardOut(BaseModel):
    opening_balance_kobo: int
    opening_balance_display: str
    total_income_kobo: int
    total_income_display: str
    total_expenditure_kobo: int
    total_expenditure_display: str
    total_savings_kobo: int
    total_savings_display: str
    available_balance_kobo: int
    available_balance_display: str
    total_wallet_kobo: int
    total_wallet_display: str
    period: DashboardPeriodSummary | None = None
