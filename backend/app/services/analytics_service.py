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
    AnalyticsSummary,
    BudgetComparison,
    CategoryTotal,
    CategoryTrend,
    HighestSpendingPeriod,
    TopExpense,
    WeekdayAverage,
)
from app.services.dates import week_start
from app.services.budget_service import build_budget_comparison
from app.services.money import format_naira

MAX_TREND_CATEGORIES = 5
TOP_EXPENSE_LIMIT = 10
PERCENT_QUANTUM = Decimal("0.01")


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
    spending_category_names: dict[int, str] = {}
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
            spending_category_names[category_id] = category_name
            key = (_period_start(transaction_date, filters.group_by), category_id)
            category_period_totals[key] = category_period_totals.get(key, 0) + amount_kobo
            weekday_totals[(transaction_date.weekday() + 1) % 7] += amount_kobo

    for offset in range((filters.date_to - filters.date_from).days + 1):
        current_date = filters.date_from + timedelta(days=offset)
        weekday_counts[(current_date.weekday() + 1) % 7] += 1

    period_results = _build_period_results(periods)
    summary_income = sum(period.income_kobo for period in period_results)
    summary_expenditure = sum(period.expenditure_kobo for period in period_results)
    summary_savings = sum(period.savings_kobo for period in period_results)
    summary_change = sum(period.available_change_kobo for period in period_results)
    summary = AnalyticsSummary(
        income_kobo=summary_income,
        expenditure_kobo=summary_expenditure,
        savings_kobo=summary_savings,
        available_change_kobo=summary_change,
        savings_rate_percent=_calculate_savings_rate(summary_income, summary_change),
    )

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

    return AnalyticsOut(
        date_from=filters.date_from,
        date_to=filters.date_to,
        group_by=filters.group_by,
        summary=summary,
        periods=period_results,
        spending_by_category=_sorted_categories(spending_totals, summary_expenditure),
        income_by_category=_sorted_categories(income_totals, summary_income),
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
        highest_spending_period=_highest_spending_period(period_results),
        top_expenses=_build_top_expenses(db, filters),
        budget_comparison=_build_budget_comparison(
            db, filters, starts, category_period_totals, spending_category_names
        ),
    )


# ============================================================
# 3. Calculate savings rate and period-over-period movement
# ============================================================
def _calculate_savings_rate(income_kobo: int, retained_kobo: int) -> Decimal | None:
    """Use the approved retained-income rate and leave zero-income periods unavailable."""
    if income_kobo <= 0:
        return None
    rate = Decimal(retained_kobo) * Decimal(100) / Decimal(income_kobo)
    return rate.quantize(PERCENT_QUANTUM)


def _period_changes(current_change_kobo: int, previous_change_kobo: int | None):
    if previous_change_kobo is None:
        return None, None
    change_kobo = current_change_kobo - previous_change_kobo
    if previous_change_kobo <= 0:
        return change_kobo, None
    change_percent = Decimal(change_kobo) * Decimal(100) / Decimal(previous_change_kobo)
    return change_kobo, change_percent.quantize(PERCENT_QUANTUM)


def _build_period_results(periods: dict[date, dict]) -> list[AnalyticsPeriod]:
    period_results = []
    previous_change_kobo = None
    for start, values in periods.items():
        available_change_kobo = (
            values["income"] - values["expenditure"] - values["savings"]
        )
        change_kobo, change_percent = _period_changes(
            available_change_kobo, previous_change_kobo
        )
        period_results.append(
            AnalyticsPeriod(
                period_start=start,
                income_kobo=values["income"],
                expenditure_kobo=values["expenditure"],
                savings_kobo=values["savings"],
                available_change_kobo=available_change_kobo,
                ordinary_expense_count=values["expense_count"],
                average_expense_kobo=(
                    Decimal(values["expenditure"]) / values["expense_count"]
                    if values["expense_count"] else Decimal(0)
                ),
                savings_rate_percent=_calculate_savings_rate(
                    values["income"], available_change_kobo
                ),
                change_from_previous_period_kobo=change_kobo,
                change_from_previous_period_percent=change_percent,
            )
        )
        previous_change_kobo = available_change_kobo
    return period_results


def _highest_spending_period(period_results: list[AnalyticsPeriod]) -> HighestSpendingPeriod | None:
    highest = max(
        period_results,
        key=lambda period: period.expenditure_kobo,
        default=None,
    )
    if highest is None or highest.expenditure_kobo == 0:
        return None
    return HighestSpendingPeriod(
        period_start=highest.period_start,
        expenditure_kobo=highest.expenditure_kobo,
    )


# ============================================================
# 4. Rank categories, individual expenses, and budget comparisons
# ============================================================
def _add_category_total(totals: dict[int, dict], category_id: int, name: str, amount: int) -> None:
    entry = totals.setdefault(category_id, {"category_id": category_id, "category_name": name, "amount_kobo": 0})
    entry["amount_kobo"] += amount


def _sorted_categories(totals: dict[int, dict], denominator_kobo: int) -> list[CategoryTotal]:
    return [
        CategoryTotal(
            **entry,
            percentage_of_total=_calculate_percentage(
                entry["amount_kobo"], denominator_kobo
            ),
        )
        for entry in sorted(totals.values(), key=lambda item: item["amount_kobo"], reverse=True)
    ]


def _calculate_percentage(amount_kobo: int, total_kobo: int) -> Decimal:
    if total_kobo <= 0:
        return Decimal("0.00")
    percentage = Decimal(amount_kobo) * Decimal(100) / Decimal(total_kobo)
    return percentage.quantize(PERCENT_QUANTUM)


def _build_top_expenses(db: Session, filters: AnalyticsFilters) -> list[TopExpense]:
    rows = analytics_repository.list_top_ordinary_expenses(
        db, filters.date_from, filters.date_to, TOP_EXPENSE_LIMIT
    )
    return [
        TopExpense(
            id=transaction_id,
            description=description,
            category_name=category_name,
            transaction_date=transaction_date,
            amount_kobo=int(amount_kobo),
            amount_display=format_naira(int(amount_kobo)),
        )
        for transaction_id, description, category_name, transaction_date, amount_kobo in rows
    ]


def _fully_contained_period_starts(
    starts: list[date], date_from: date, date_to: date, group_by: str
) -> list[date]:
    """Only compare budgets where both the plan and actuals cover the full canonical period."""
    comparable = []
    for start in starts:
        if start < date_from:
            continue
        if group_by == "week":
            period_end = start + timedelta(days=6)
        else:
            period_end = _next_period_start(start, "month") - timedelta(days=1)
        if period_end <= date_to:
            comparable.append(start)
    return comparable


def _build_budget_comparison(
    db: Session,
    filters: AnalyticsFilters,
    starts: list[date],
    category_period_totals: dict[tuple[date, int], int],
    spending_category_names: dict[int, str],
) -> list[BudgetComparison]:
    # Budgets are week/month allocations, so yearly analytics cannot compare them fairly.
    if filters.group_by == "year":
        return []

    comparable_starts = _fully_contained_period_starts(
        starts, filters.date_from, filters.date_to, filters.group_by
    )
    budget_rows = analytics_repository.list_budget_allocations(
        db, filters.group_by, comparable_starts
    )
    comparisons = []
    for period_start in comparable_starts:
        period_budget_rows = [
            (category_id, category_name, is_savings, int(budget_kobo))
            for row_period_start, category_id, category_name, is_savings, budget_kobo in budget_rows
            if row_period_start == period_start
        ]
        period_actual_rows = [
            (category_id, spending_category_names[category_id], amount_kobo)
            for (row_period_start, category_id), amount_kobo in category_period_totals.items()
            if row_period_start == period_start
        ]
        comparisons.extend(
            build_budget_comparison(
                filters.group_by,
                period_start,
                period_budget_rows,
                period_actual_rows,
            )
        )
    return comparisons
