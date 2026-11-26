"""Calculate authoritative all-time dashboard balances from persisted records."""
from sqlalchemy.orm import Session

from app.repositories import dashboard_repository
from app.schemas.dashboard import DashboardOut
from app.services.money import format_naira
from app.services.settings_service import get_opening_balance_kobo


def get_dashboard_summary(db: Session) -> DashboardOut:
    opening_balance = get_opening_balance_kobo(db)
    total_income, total_expenditure, total_savings = dashboard_repository.get_all_time_totals(db)

    available_balance = opening_balance + total_income - total_expenditure - total_savings
    total_wallet = available_balance + total_savings

    amounts = {
        "opening_balance": opening_balance,
        "total_income": total_income,
        "total_expenditure": total_expenditure,
        "total_savings": total_savings,
        "available_balance": available_balance,
        "total_wallet": total_wallet,
    }
    response = {}
    for name, amount_kobo in amounts.items():
        response[f"{name}_kobo"] = amount_kobo
        response[f"{name}_display"] = format_naira(amount_kobo)

    return DashboardOut(**response)
