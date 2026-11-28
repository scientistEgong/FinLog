"""Analytics aggregates and API responses against isolated test databases."""
from decimal import Decimal


# ============================================================
# 1. Prepare reusable API records for analytics scenarios
# ============================================================
def category_id(client, name):
    return next(category["id"] for category in client.get("/api/categories").json() if category["name"] == name)


def create_transaction(client, *, type_, amount, category, transaction_date, description):
    response = client.post(
        "/api/transactions",
        json={
            "type": type_,
            "amount": amount,
            "transaction_date": transaction_date,
            "category_id": category_id(client, category),
            "description": description,
        },
    )
    assert response.status_code == 201


def create_budget(client, *, category, period_start, amount, period_type="month"):
    response = client.post(
        "/api/budgets",
        json={
            "period_type": period_type,
            "period_start": period_start,
            "category_id": category_id(client, category),
            "amount": amount,
        },
    )
    assert response.status_code == 201


def get_analytics(client, date_from, date_to, group_by="month"):
    response = client.get(
        "/api/analytics",
        params={"date_from": date_from, "date_to": date_to, "group_by": group_by},
    )
    assert response.status_code == 200
    return response.json()


# ============================================================
# 2. Verify analytical totals, period grouping, and category results
# ============================================================
def test_analytics_empty_range_returns_complete_contract(client):
    data = get_analytics(client, "2026-11-01", "2026-11-30")

    assert data["summary"] == {
        "income_kobo": 0,
        "expenditure_kobo": 0,
        "savings_kobo": 0,
        "available_change_kobo": 0,
        "savings_rate_percent": None,
    }
    assert len(data["periods"]) == 1
    assert data["periods"][0]["savings_rate_percent"] is None
    assert data["periods"][0]["change_from_previous_period_kobo"] is None
    assert data["highest_spending_period"] is None
    assert data["top_expenses"] == []
    assert data["budget_comparison"] == []


def test_analytics_separates_savings_and_populates_all_declared_fields(client):
    create_transaction(client, type_="income", amount="5000.00", category="Other",
                       transaction_date="2026-11-01", description="Salary")
    create_transaction(client, type_="expense", amount="1200.00", category="Food",
                       transaction_date="2026-11-02", description="Groceries")
    create_transaction(client, type_="expense", amount="300.00", category="Transport",
                       transaction_date="2026-11-03", description="Fuel")
    create_transaction(client, type_="expense", amount="300.00", category="Savings",
                       transaction_date="2026-11-04", description="Transfer to savings")

    data = get_analytics(client, "2026-11-01", "2026-11-30")

    assert data["summary"]["income_kobo"] == 500_000
    assert data["summary"]["expenditure_kobo"] == 150_000
    assert data["summary"]["savings_kobo"] == 30_000
    assert data["summary"]["available_change_kobo"] == 320_000
    assert Decimal(str(data["summary"]["savings_rate_percent"])) == Decimal("64.00")

    spending = data["spending_by_category"]
    assert [row["category_name"] for row in spending] == ["Food", "Transport"]
    assert [row["amount_kobo"] for row in spending] == [120_000, 30_000]
    assert [Decimal(str(row["percentage_of_total"])) for row in spending] == [
        Decimal("80.00"),
        Decimal("20.00"),
    ]
    assert Decimal(str(data["income_by_category"][0]["percentage_of_total"])) == Decimal("100.00")

    assert [row["description"] for row in data["top_expenses"]] == ["Groceries", "Fuel"]
    assert "Transfer to savings" not in [row["description"] for row in data["top_expenses"]]
    assert data["top_expenses"][0]["amount_display"] == "₦1,200.00"

    assert data["highest_spending_period"]["period_start"] == "2026-11-01"
    assert data["highest_spending_period"]["expenditure_kobo"] == 150_000


def test_analytics_monthly_trend_handles_zero_income_and_period_changes(client):
    create_transaction(client, type_="income", amount="1000.00", category="Other",
                       transaction_date="2026-10-05", description="October income")
    create_transaction(client, type_="expense", amount="200.00", category="Food",
                       transaction_date="2026-10-06", description="October food")
    create_transaction(client, type_="income", amount="2000.00", category="Other",
                       transaction_date="2026-11-05", description="November income")
    create_transaction(client, type_="expense", amount="1200.00", category="Food",
                       transaction_date="2026-11-06", description="November food")
    create_transaction(client, type_="expense", amount="100.00", category="Food",
                       transaction_date="2026-12-06", description="December food")

    data = get_analytics(client, "2026-10-01", "2026-12-31")

    assert [period["period_start"] for period in data["periods"]] == [
        "2026-10-01",
        "2026-11-01",
        "2026-12-01",
    ]
    assert [Decimal(str(period["savings_rate_percent"])) if period["savings_rate_percent"] is not None else None
            for period in data["periods"]] == [Decimal("80.00"), Decimal("40.00"), None]
    assert [period["change_from_previous_period_kobo"] for period in data["periods"]] == [None, 0, -90_000]
    assert [Decimal(str(period["change_from_previous_period_percent"]))
            if period["change_from_previous_period_percent"] is not None else None
            for period in data["periods"]] == [None, Decimal("0.00"), Decimal("-112.50")]


def test_analytics_weekly_grouping_uses_sunday_starts_and_inclusive_end_date(client):
    create_transaction(client, type_="expense", amount="100.00", category="Food",
                       transaction_date="2026-11-22", description="Sunday expense")
    create_transaction(client, type_="expense", amount="200.00", category="Food",
                       transaction_date="2026-11-28", description="Saturday expense")
    create_transaction(client, type_="expense", amount="400.00", category="Food",
                       transaction_date="2026-11-29", description="Next Sunday expense")

    data = get_analytics(client, "2026-11-22", "2026-11-29", "week")

    assert [period["period_start"] for period in data["periods"]] == [
        "2026-11-22",
        "2026-11-29",
    ]
    assert [period["expenditure_kobo"] for period in data["periods"]] == [30_000, 40_000]
    assert data["highest_spending_period"]["period_start"] == "2026-11-29"


# ============================================================
# 3. Verify budget remaining amounts and complete-period boundaries
# ============================================================
def test_analytics_budget_comparison_excludes_savings_and_unbudgeted_actuals(client):
    create_budget(client, category="Food", period_start="2026-11-01", amount="1000.00")
    create_budget(client, category="Transport", period_start="2026-11-01", amount="500.00")
    create_transaction(client, type_="expense", amount="1200.00", category="Food",
                       transaction_date="2026-11-02", description="Groceries")
    create_transaction(client, type_="expense", amount="200.00", category="Savings",
                       transaction_date="2026-11-03", description="Savings transfer")
    create_transaction(client, type_="expense", amount="100.00", category="Other",
                       transaction_date="2026-11-04", description="Unbudgeted expense")

    data = get_analytics(client, "2026-11-01", "2026-11-30")

    comparisons = data["budget_comparison"]
    assert [row["category_name"] for row in comparisons] == ["Food", "Transport", "Other"]
    assert comparisons[0]["budget_kobo"] == 100_000
    assert comparisons[0]["budget_status"] == "set"
    assert comparisons[0]["actual_kobo"] == 120_000
    assert comparisons[0]["remaining_kobo"] == 0
    assert comparisons[0]["overspent_kobo"] == 20_000
    assert comparisons[0]["remaining_display"] == "₦0.00"
    assert comparisons[0]["overspent_display"] == "₦200.00"
    assert Decimal(str(comparisons[0]["utilization_percent"])) == Decimal("120.00")
    assert comparisons[1]["actual_kobo"] == 0
    assert comparisons[1]["remaining_kobo"] == 50_000
    assert comparisons[1]["remaining_display"] == "₦500.00"
    assert Decimal(str(comparisons[1]["utilization_percent"])) == Decimal("0.00")
    assert comparisons[2]["budget_kobo"] == 0
    assert comparisons[2]["budget_status"] == "budget_needed"
    assert comparisons[2]["actual_kobo"] == 10_000
    assert comparisons[2]["overspent_kobo"] == 10_000
    assert comparisons[2]["utilization_percent"] is None


def test_analytics_keeps_budget_comparison_when_range_has_no_transactions(client):
    create_budget(client, category="Food", period_start="2026-11-01", amount="1000.00")
    data = get_analytics(client, "2026-11-01", "2026-11-30")

    assert data["summary"]["expenditure_kobo"] == 0
    assert len(data["budget_comparison"]) == 1
    row = data["budget_comparison"][0]
    assert row["category_name"] == "Food"
    assert row["actual_kobo"] == 0
    assert row["remaining_kobo"] == 100_000


def test_analytics_omits_savings_category_budget_rows(client):
    create_budget(client, category="Savings", period_start="2026-11-01", amount="500.00")
    create_transaction(client, type_="expense", amount="100.00", category="Savings",
                       transaction_date="2026-11-04", description="Savings transfer")

    data = get_analytics(client, "2026-11-01", "2026-11-30")

    assert data["budget_comparison"] == []


def test_analytics_budget_comparison_only_uses_complete_canonical_periods(client):
    create_budget(client, category="Food", period_start="2026-11-01", amount="1000.00")
    create_budget(client, category="Food", period_start="2026-12-01", amount="1000.00")
    create_transaction(client, type_="expense", amount="100.00", category="Food",
                       transaction_date="2026-11-20", description="Partial month expense")

    partial_month = get_analytics(client, "2026-11-15", "2026-11-30")
    assert partial_month["budget_comparison"] == []

    full_month = get_analytics(client, "2026-11-01", "2026-11-30")
    assert len(full_month["budget_comparison"]) == 1
    assert full_month["budget_comparison"][0]["period_start"] == "2026-11-01"

    yearly = get_analytics(client, "2026-01-01", "2026-12-31", "year")
    assert yearly["budget_comparison"] == []
