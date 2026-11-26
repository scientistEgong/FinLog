"""Calculate authoritative dashboard balances from persisted records."""
from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.repositories import dashboard_repository
from app.schemas.dashboard import (
    DashboardCategoryTotal,
    DashboardObservation,
    DashboardOut,
    DashboardPeriodSummary,
)
from app.services.errors import DomainValidationError
from app.services.money import format_naira
from app.services.settings_service import get_opening_balance_kobo
from app.services.validation import check_date_in_range, check_date_order


PERCENT_QUANTUM = Decimal("0.01")


# ============================================================
# 1. Apply approved balance formulas and shape the summary
# ============================================================
def get_dashboard_summary(
    db: Session, date_from: date | None = None, date_to: date | None = None
) -> DashboardOut:
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

    period = None
    if date_from is not None or date_to is not None:
        _validate_date_range(date_from, date_to)
        period = _build_period_summary(db, date_from, date_to)

    return DashboardOut(**response, period=period)


def _validate_date_range(date_from: date | None, date_to: date | None) -> None:
    if date_from is None or date_to is None:
        raise DomainValidationError("Both date_from and date_to are required.", field="date_from")
    try:
        check_date_in_range(date_from)
        check_date_in_range(date_to)
        check_date_order(date_from, date_to)
    except ValueError as error:
        raise DomainValidationError(str(error), field="date_from") from error


def _build_period_summary(db: Session, date_from: date, date_to: date) -> DashboardPeriodSummary:
    income, expenditure, savings = dashboard_repository.get_period_totals(db, date_from, date_to)
    available_change = income - expenditure - savings
    savings_rate_percent = _calculate_savings_rate(income, available_change)
    categories = _build_category_totals(db, date_from, date_to, expenditure)
    observations = _build_observations(income, expenditure, savings, available_change, savings_rate_percent, categories)

    return DashboardPeriodSummary(
        date_from=date_from,
        date_to=date_to,
        income_kobo=income,
        income_display=format_naira(income),
        expenditure_kobo=expenditure,
        expenditure_display=format_naira(expenditure),
        savings_kobo=savings,
        savings_display=format_naira(savings),
        available_change_kobo=available_change,
        available_change_display=format_naira(available_change),
        savings_rate_percent=savings_rate_percent,
        spending_by_category=categories,
        observations=observations,
    )


def _calculate_savings_rate(income_kobo: int, available_change_kobo: int) -> Decimal | None:
    if income_kobo <= 0:
        return None
    rate = Decimal(available_change_kobo) * Decimal(100) / Decimal(income_kobo)
    return rate.quantize(PERCENT_QUANTUM)


def _build_category_totals(
    db: Session, date_from: date, date_to: date, expenditure_kobo: int
) -> list[DashboardCategoryTotal]:
    rows = dashboard_repository.get_period_spending_by_category(db, date_from, date_to)
    return [
        DashboardCategoryTotal(
            category_id=category_id,
            category_name=category_name,
            amount_kobo=amount_kobo,
            amount_display=format_naira(amount_kobo),
            percentage_of_expenditure=_calculate_percentage(amount_kobo, expenditure_kobo),
        )
        for category_id, category_name, amount_kobo in rows
    ]


def _calculate_percentage(amount_kobo: int, total_kobo: int) -> Decimal:
    if total_kobo <= 0:
        return Decimal("0.00")
    percentage = Decimal(amount_kobo) * Decimal(100) / Decimal(total_kobo)
    return percentage.quantize(PERCENT_QUANTUM)


def _build_observations(
    income_kobo: int,
    expenditure_kobo: int,
    savings_kobo: int,
    available_change_kobo: int,
    savings_rate_percent: Decimal | None,
    categories: list[DashboardCategoryTotal],
) -> list[DashboardObservation]:
    if income_kobo == 0 and expenditure_kobo == 0 and savings_kobo == 0:
        return [
            DashboardObservation(
                code="empty_period",
                message="No transactions were recorded in this period.",
            )
        ]

    observations = [_build_income_expenditure_observation(income_kobo, expenditure_kobo)]
    if categories:
        top_category = categories[0]
        observations.append(
            DashboardObservation(
                code="top_category",
                message=(
                    f"Largest ordinary expenditure category: {top_category.category_name} "
                    f"({top_category.amount_display}, {top_category.percentage_of_expenditure:.1f}%)."
                ),
            )
        )
    if savings_kobo > 0:
        observations.append(
            DashboardObservation(
                code="savings_contributions",
                message=f"Savings contributions were {format_naira(savings_kobo)} during this period.",
            )
        )
    if savings_rate_percent is not None:
        observations.append(
            DashboardObservation(
                code="retained_income",
                message=(
                    f"Retained income after ordinary spending and savings contributions was "
                    f"{savings_rate_percent:.1f}%."
                ),
            )
        )
    if available_change_kobo < 0:
        observations.append(
            DashboardObservation(
                code="negative_retained_income",
                message=f"Ordinary spending and savings exceeded income by {format_naira(abs(available_change_kobo))}.",
            )
        )
    return observations


def _build_income_expenditure_observation(income_kobo: int, expenditure_kobo: int) -> DashboardObservation:
    difference = income_kobo - expenditure_kobo
    if difference > 0:
        message = f"Income exceeded ordinary expenditure by {format_naira(difference)}."
    elif difference < 0:
        message = f"Ordinary expenditure exceeded income by {format_naira(abs(difference))}."
    else:
        message = "Income and ordinary expenditure were equal."
    return DashboardObservation(code="income_vs_expenditure", message=message)
