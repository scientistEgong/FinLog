"""Dashboard calculations and API behavior against isolated databases."""
from decimal import Decimal


def category_id(client, name):
    return next(category["id"] for category in client.get("/api/categories").json() if category["name"] == name)


def create_transaction(client, *, type_, amount, category, transaction_date, description):
    return client.post(
        "/api/transactions",
        json={
            "type": type_,
            "amount": amount,
            "transaction_date": transaction_date,
            "category_id": category_id(client, category),
            "description": description,
        },
    )


def test_dashboard_starts_at_zero(client):
    response = client.get("/api/dashboard")

    assert response.status_code == 200
    data = response.json()
    assert data["opening_balance_kobo"] == 0
    assert data["total_income_kobo"] == 0
    assert data["total_expenditure_kobo"] == 0
    assert data["total_savings_kobo"] == 0
    assert data["available_balance_kobo"] == 0
    assert data["total_wallet_kobo"] == 0


def test_budget_allocations_are_not_counted_as_expenses(client):
    client.post(
        "/api/budgets",
        json={
            "period_type": "week",
            "period_start": "2026-11-22",
            "category_id": category_id(client, "Food"),
            "amount": "2500",
        },
    )

    data = client.get("/api/dashboard").json()

    assert data["total_expenditure_kobo"] == 0
    assert data["available_balance_kobo"] == 0
    assert data["total_wallet_kobo"] == 0


def test_dashboard_applies_locked_balance_formulas(client):
    client.put("/api/settings/opening-balance", json={"amount": "1000.00"})
    create_transaction(
        client,
        type_="income",
        amount="5000.00",
        category="Other",
        transaction_date="2026-11-01",
        description="Income",
    )
    create_transaction(
        client,
        type_="expense",
        amount="1200.00",
        category="Food",
        transaction_date="2026-11-02",
        description="Food expense",
    )
    create_transaction(
        client,
        type_="expense",
        amount="300.00",
        category="Savings",
        transaction_date="2026-11-03",
        description="Savings transfer",
    )

    data = client.get("/api/dashboard").json()

    assert data["opening_balance_kobo"] == 100_000
    assert data["total_income_kobo"] == 500_000
    assert data["total_expenditure_kobo"] == 120_000
    assert data["total_savings_kobo"] == 30_000
    assert data["available_balance_kobo"] == 450_000
    assert data["total_wallet_kobo"] == 480_000
    assert data["available_balance_display"] == "₦4,500.00"
    assert data["total_wallet_display"] == "₦4,800.00"


def test_dashboard_without_dates_has_no_period_summary(client):
    data = client.get("/api/dashboard").json()

    assert data["period"] is None


def test_dashboard_period_summary_filters_and_separates_savings(client):
    create_transaction(
        client,
        type_="income",
        amount="5000.00",
        category="Other",
        transaction_date="2026-11-01",
        description="November income",
    )
    create_transaction(
        client,
        type_="income",
        amount="1000.00",
        category="Other",
        transaction_date="2026-10-01",
        description="October income",
    )
    create_transaction(
        client,
        type_="expense",
        amount="1200.00",
        category="Food",
        transaction_date="2026-11-02",
        description="Food expense",
    )
    create_transaction(
        client,
        type_="expense",
        amount="300.00",
        category="Savings",
        transaction_date="2026-11-03",
        description="Savings transfer",
    )
    create_transaction(
        client,
        type_="expense",
        amount="500.00",
        category="Transport",
        transaction_date="2026-10-05",
        description="October transport",
    )

    data = client.get(
        "/api/dashboard",
        params={"date_from": "2026-11-01", "date_to": "2026-11-30"},
    ).json()

    period = data["period"]
    assert period["date_from"] == "2026-11-01"
    assert period["date_to"] == "2026-11-30"
    assert period["income_kobo"] == 500_000
    assert period["expenditure_kobo"] == 120_000
    assert period["savings_kobo"] == 30_000
    assert period["available_change_kobo"] == 350_000
    assert period["available_change_display"] == "₦3,500.00"
    assert Decimal(str(period["savings_rate_percent"])) == Decimal("70.00")

    assert len(period["spending_by_category"]) == 1
    top_category = period["spending_by_category"][0]
    assert top_category["category_name"] == "Food"
    assert top_category["amount_kobo"] == 120_000
    assert Decimal(str(top_category["percentage_of_expenditure"])) == Decimal("100.00")

    codes = [observation["code"] for observation in period["observations"]]
    assert "income_vs_expenditure" in codes
    assert "top_category" in codes
    assert "savings_contributions" in codes
    assert "retained_income" in codes


def test_dashboard_period_summary_handles_expenditure_without_income(client):
    create_transaction(
        client,
        type_="expense",
        amount="1000.00",
        category="Food",
        transaction_date="2026-11-02",
        description="Food expense",
    )

    period = client.get(
        "/api/dashboard",
        params={"date_from": "2026-11-01", "date_to": "2026-11-30"},
    ).json()["period"]

    assert period["income_kobo"] == 0
    assert period["expenditure_kobo"] == 100_000
    assert period["available_change_kobo"] == -100_000
    assert period["savings_rate_percent"] is None
    codes = [observation["code"] for observation in period["observations"]]
    assert "negative_retained_income" in codes


def test_dashboard_period_summary_handles_empty_range(client):
    period = client.get(
        "/api/dashboard",
        params={"date_from": "2026-11-01", "date_to": "2026-11-30"},
    ).json()["period"]

    assert period["income_kobo"] == 0
    assert period["expenditure_kobo"] == 0
    assert period["savings_kobo"] == 0
    assert period["spending_by_category"] == []
    assert period["savings_rate_percent"] is None
    assert period["observations"][0]["code"] == "empty_period"


def test_dashboard_rejects_incomplete_or_reversed_date_range(client):
    assert client.get("/api/dashboard", params={"date_from": "2026-11-01"}).status_code == 422
    assert client.get("/api/dashboard", params={"date_to": "2026-11-30"}).status_code == 422
    assert client.get(
        "/api/dashboard",
        params={"date_from": "2026-11-30", "date_to": "2026-11-01"},
    ).status_code == 422
