"""Response shape for the all-time financial dashboard summary."""
from pydantic import BaseModel


# ============================================================
# 1. Define the backend-calculated dashboard response
# ============================================================
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
