"""Budget API validation and period calculations on disposable databases."""
import pytest


def category_id(client, name):
    return next(category["id"] for category in client.get("/api/categories").json() if category["name"] == name)


def budget_body(client, *, period_type="week", period_start="2026-11-22", category="Food", amount="2500.00"):
    return {
        "period_type": period_type,
        "period_start": period_start,
        "category_id": category_id(client, category),
        "amount": amount,
    }


def test_weekly_and_monthly_budgets_list_separately(client):
    weekly = client.post("/api/budgets", json=budget_body(client, amount="2500.25"))
    monthly = client.post(
        "/api/budgets", json=budget_body(client, period_type="month", period_start="2026-11-01", amount="7000")
    )

    assert weekly.status_code == 201
    assert weekly.json()["amount_kobo"] == 250_025
    assert weekly.json()["amount_display"] == "₦2,500.25"
    assert monthly.status_code == 201
    monthly_edit = client.put(
        f"/api/budgets/{monthly.json()['id']}",
        json=budget_body(client, period_type="month", period_start="2026-11-01", amount="7500"),
    )
    assert monthly_edit.status_code == 200
    assert monthly_edit.json()["amount_kobo"] == 750_000

    week_page = client.get(
        "/api/budgets", params={"period_type": "week", "period_start": "2026-11-22"}
    ).json()
    month_page = client.get(
        "/api/budgets", params={"period_type": "month", "period_start": "2026-11-01"}
    ).json()

    assert week_page["total_budget_kobo"] == 250_025
    assert len(week_page["items"]) == 1
    assert month_page["total_budget_kobo"] == 750_000
    assert len(month_page["items"]) == 1
    assert client.get(
        "/api/budgets", params={"period_type": "week", "period_start": "2026-11-29"}
    ).json()["items"] == []


def test_budget_create_update_delete_and_duplicate_protection(client):
    created = client.post("/api/budgets", json=budget_body(client))
    budget_id = created.json()["id"]

    duplicate = client.post("/api/budgets", json=budget_body(client, amount="3000"))
    assert duplicate.status_code == 409

    updated = client.put(
        f"/api/budgets/{budget_id}",
        json=budget_body(client, amount="3000", category="Transport"),
    )
    assert updated.status_code == 200
    assert updated.json()["amount_kobo"] == 300_000
    assert updated.json()["category_name"] == "Transport"

    assert client.delete(f"/api/budgets/{budget_id}").status_code == 204
    assert client.delete(f"/api/budgets/{budget_id}").status_code == 404
    assert client.put(f"/api/budgets/{budget_id}", json=budget_body(client)).status_code == 404


@pytest.mark.parametrize(
    "body_changes",
    [
        {"period_start": "2026-11-23"},
        {"period_type": "month", "period_start": "2026-11-02"},
        {"period_type": "fortnight"},
        {"amount": "-1"},
        {"amount": "1.234"},
        {"category_id": 9999},
    ],
)
def test_invalid_budget_values_are_rejected(client, body_changes):
    body = budget_body(client)
    body.update(body_changes)

    response = client.post("/api/budgets", json=body)

    assert response.status_code == 422
    assert client.get(
        "/api/budgets", params={"period_type": "week", "period_start": "2026-11-22"}
    ).json()["items"] == []


def test_category_in_use_by_budget_cannot_be_deleted(client):
    category = client.post("/api/categories", json={"name": "Pets"}).json()
    created = client.post("/api/budgets", json=budget_body(client, category="Pets"))
    assert created.status_code == 201
    assert client.delete(f"/api/categories/{category['id']}").status_code == 409


def test_budget_page_returns_partial_period_actuals_and_zero_budget_status(client):
    zero_budget = client.post(
        "/api/budgets", json=budget_body(client, category="Food", amount="0")
    )
    savings_budget = client.post(
        "/api/budgets", json=budget_body(client, category="Savings", amount="500")
    )
    assert zero_budget.status_code == 201
    assert savings_budget.status_code == 201

    for category, amount, day in [
        ("Food", "120.00", "2026-11-23"),
        ("Other", "50.00", "2026-11-24"),
        ("Savings", "80.00", "2026-11-25"),
    ]:
        response = client.post("/api/transactions", json={
            "type": "expense",
            "amount": amount,
            "transaction_date": day,
            "category_id": category_id(client, category),
            "description": "Synthetic budget test",
        })
        assert response.status_code == 201

    page = client.get(
        "/api/budgets", params={"period_type": "week", "period_start": "2026-11-22"}
    ).json()

    assert page["is_partial_period"] is True
    assert page["actual_through"] == "2026-11-27"
    assert [row["category_name"] for row in page["comparison"]] == ["Food", "Other"]
    food, other = page["comparison"]
    assert food["budget_kobo"] == 0
    assert food["actual_kobo"] == 12_000
    assert food["overspent_kobo"] == 12_000
    assert food["utilization_percent"] is None
    assert other["budget_kobo"] == 0
    assert other["actual_kobo"] == 5_000
    assert page["total_budget_kobo"] == 0
    assert page["total_actual_kobo"] == 17_000
    assert page["total_overspent_kobo"] == 17_000
    assert len(page["items"]) == 2  # Existing savings allocation remains stored and listed.


def test_budget_commit_translates_only_budget_unique_violation(session, monkeypatch):
    from sqlalchemy.exc import IntegrityError

    from app.services import budget_service
    from app.services.errors import ConflictError

    class FakeOrig(Exception):
        def __init__(self, message):
            self.message = message

        def __str__(self):
            return self.message

    monkeypatch.setattr(
        session,
        "commit",
        lambda: (_ for _ in ()).throw(IntegrityError(
            "INSERT INTO budgets", {}, FakeOrig(
                "UNIQUE constraint failed: budgets.period_type, budgets.period_start, budgets.category_id"
            )
        )),
    )
    with pytest.raises(ConflictError):
        budget_service._commit_or_raise_conflict(session)

    monkeypatch.setattr(
        session,
        "commit",
        lambda: (_ for _ in ()).throw(IntegrityError(
            "INSERT INTO budgets", {}, FakeOrig("CHECK constraint failed: ck_budgets_amount_nonnegative")
        )),
    )
    with pytest.raises(IntegrityError):
        budget_service._commit_or_raise_conflict(session)
