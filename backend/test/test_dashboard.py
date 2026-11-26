"""Dashboard calculations and API behavior against isolated databases."""


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
