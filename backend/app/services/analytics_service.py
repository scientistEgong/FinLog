"""Build date-filtered financial trends and category analyses."""
from calendar import day_name
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.repositories import analytics_repository
from app.schemas.analytics import (
    AnalyticsFilters,
    AnalyticsOut,
    AnalyticsPeriod,
    CategoryTotal,
    CategoryTrend,
    WeekdayAverage,
)
from app.services.dates import week_start

MAX_TREND_CATEGORIES = 5


# ============================================================
# 1. Derive canonical period starts and complete date buckets
# ============================================================
def _period_start(value: date, group_by: str) -> date:
    if group_by == "week":
        return week_start(value)
    if group_by == "month":
        return value.replace(day=1)
    return value.replace(month=1, day=1)


def _next_period_start(value: date, group_by: str) -> date:
    if group_by == "week":
        return value + timedelta(days=7)
    if group_by == "month":
        return (value.replace(day=28) + timedelta(days=4)).replace(day=1)
    return date(value.year + 1, 1, 1)


def _period_starts(date_from: date, date_to: date, group_by: str) -> list[date]:
    starts = []
    current = _period_start(date_from, group_by)
    last = _period_start(date_to, group_by)
    while current <= last:
        starts.append(current)
        current = _next_period_start(current, group_by)
    return starts


# ============================================================
# 2. Aggregate transaction rows into trend and category totals
# ============================================================
def get_analytics(db: Session, filters: AnalyticsFilters) -> AnalyticsOut:
    rows = analytics_repository.list_daily_category_totals(db, filters.date_from, filters.date_to)
    starts = _period_starts(filters.date_from, filters.date_to, filters.group_by)
    periods = {
        start: {
            "income": 0,
            "expenditure": 0,
            "savings": 0,
            "expense_count": 0,
        }
        for start in starts
    }
    spending_totals: dict[int, dict] = {}
    income_totals: dict[int, dict] = {}
    category_period_totals: dict[tuple[date, int], int] = {}
    weekday_totals = [0] * 7
    weekday_counts = [0] * 7

    for (
        transaction_date,
        transaction_type,
        category_id,
        category_name,
        is_savings,
        amount_kobo,
        transaction_count,
    ) in rows:
        amount_kobo = int(amount_kobo)
        period = periods[_period_start(transaction_date, filters.group_by)]
        if transaction_type == "income":
            period["income"] += amount_kobo
            _add_category_total(income_totals, category_id, category_name, amount_kobo)
        elif is_savings:
            period["savings"] += amount_kobo
        else:
            period["expenditure"] += amount_kobo
            period["expense_count"] += int(transaction_count)
            _add_category_total(spending_totals, category_id, category_name, amount_kobo)
            key = (_period_start(transaction_date, filters.group_by), category_id)
            category_period_totals[key] = category_period_totals.get(key, 0) + amount_kobo
            weekday_totals[(transaction_date.weekday() + 1) % 7] += amount_kobo

    period_results = [
        AnalyticsPeriod(
            period_start=start,
            income_kobo=values["income"],
            expenditure_kobo=values["expenditure"],
            savings_kobo=values["savings"],
            available_change_kobo=values["income"] - values["expenditure"] - values["savings"],
            ordinary_expense_count=values["expense_count"],
            average_expense_kobo=(
                Decimal(values["expenditure"]) / values["expense_count"]
                if values["expense_count"] else Decimal(0)
            ),
        )
        for start, values in periods.items()
    ]
    highest_spending_period = max(
        period_results,
        key=lambda period: period.expenditure_kobo,
        default=None,
    )
    if highest_spending_period and highest_spending_period.expenditure_kobo == 0:
        highest_spending_period = None

    top_categories = sorted(
        spending_totals.items(), key=lambda item: item[1]["amount_kobo"], reverse=True
    )[:MAX_TREND_CATEGORIES]
    category_trends = [
        CategoryTrend(
            period_start=period_start,
            category_name=category["category_name"],
            amount_kobo=category_period_totals.get((period_start, category_id), 0),
        )
        for period_start in starts
        for category_id, category in top_categories
    ]

    for offset in range((filters.date_to - filters.date_from).days + 1):
        current_date = filters.date_from + timedelta(days=offset)
        weekday_counts[(current_date.weekday() + 1) % 7] += 1

    return AnalyticsOut(
        date_from=filters.date_from,
        date_to=filters.date_to,
        group_by=filters.group_by,
        periods=period_results,
        spending_by_category=_sorted_categories(spending_totals),
        income_by_category=_sorted_categories(income_totals),
        category_trends=category_trends,
        spending_by_weekday=[
            WeekdayAverage(
                weekday=weekday,
                weekday_name=day_name[(weekday + 6) % 7],
                average_amount_kobo=(
                    Decimal(weekday_totals[weekday]) / weekday_counts[weekday]
                    if weekday_counts[weekday] else Decimal(0)
                ),
            )
            for weekday in range(7)
        ],
        highest_spending_period=(
            {
                "period_start": highest_spending_period.period_start,
                "expenditure_kobo": highest_spending_period.expenditure_kobo,
            }
            if highest_spending_period else None
        ),
    )


def _add_category_total(totals: dict[int, dict], category_id: int, name: str, amount: int) -> None:
    entry = totals.setdefault(category_id, {"category_id": category_id, "category_name": name, "amount_kobo": 0})
    entry["amount_kobo"] += amount


def _sorted_categories(totals: dict[int, dict]) -> list[CategoryTotal]:
    return [
        CategoryTotal(**entry)
        for entry in sorted(totals.values(), key=lambda item: item["amount_kobo"], reverse=True)
    ]
