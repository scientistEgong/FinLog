"""API tests (need the packages from requirements.txt; run with `pytest` from backend/)."""
"""Exercise public HTTP behavior against a disposable SQLite database."""
import pytest


def category_id(client, name):
    return next(c["id"] for c in client.get("/api/categories").json() if c["name"] == name)


def txn_body(client, **over):
    body = {
        "type": "expense",
        "amount": "1,500.50",
        "transaction_date": "2026-11-21",
        "category_id": category_id(client, "Food"),
        "description": "Lunch",
        "payment_method": "Cash",
        "notes": "",
    }
    body.update(over)
    return body


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_create_returns_formatted_amounts(client):
    r = client.post("/api/transactions", json=txn_body(client, amount="15000"))
    assert r.status_code == 201
    data = r.json()
    assert data["amount_kobo"] == 1_500_000
    assert data["amount_display"] == "₦15,000.00"
    assert data["amount_input"] == "15000.00"
    assert data["category_name"] == "Food"
    assert data["notes"] is None  # blank notes become null


@pytest.mark.parametrize(
    "amount",
    ["0", "-5", "abc", "", "1.234", "10.100", ".50", "+500", "1e2", "1e999999", "1_000", "1,2,3", "99999999999999999"],
)
def test_invalid_amounts_rejected(client, amount):
    r = client.post("/api/transactions", json=txn_body(client, amount=amount))
    assert r.status_code == 422
    assert client.get("/api/transactions").json()["total"] == 0


def test_other_validation_rules(client):
    assert client.post("/api/transactions", json=txn_body(client, description="   ")).status_code == 422
    assert client.post("/api/transactions", json=txn_body(client, description=123)).status_code == 422
    assert client.post("/api/transactions", json=txn_body(client, description="Lunch\x00test")).status_code == 422
    assert client.post("/api/transactions", json=txn_body(client, description="Lunch\nDinner")).status_code == 422
    assert client.post("/api/transactions", json=txn_body(client, payment_method="Cash\t1")).status_code == 422
    assert client.post("/api/transactions", json=txn_body(client, notes="Line 1\x00Line 2")).status_code == 422
    assert client.post("/api/transactions", json=txn_body(client, transaction_date="2026-13-45")).status_code == 422
    assert client.post("/api/transactions", json=txn_body(client, transaction_date="1990-01-01")).status_code == 422
    assert client.post("/api/transactions", json=txn_body(client, type="transfer")).status_code == 422
    r = client.post("/api/transactions", json=txn_body(client, category_id=9999))
    assert r.status_code == 422
    assert r.json()["detail"][0]["loc"] == ["body", "category_id"]
    assert client.get("/api/transactions").json()["total"] == 0

    # Notes allow normal multiline whitespace, and 0.50 is accepted.
    ok = client.post(
        "/api/transactions",
        json=txn_body(client, amount="0.50", notes="Line 1\r\n\tLine 2"),
    )
    assert ok.status_code == 201
    assert ok.json()["amount_kobo"] == 50
    assert ok.json()["notes"] == "Line 1\r\n\tLine 2"


def test_edit_and_delete(client):
    tid = client.post("/api/transactions", json=txn_body(client)).json()["id"]
    r = client.put(
        f"/api/transactions/{tid}",
        json=txn_body(client, amount="2000", description="Dinner", category_id=category_id(client, "Savings")),
    )
    assert r.status_code == 200
    assert r.json()["amount_kobo"] == 200_000
    assert r.json()["category_name"] == "Savings" and r.json()["is_savings"] is True
    assert client.get(f"/api/transactions/{tid}").json()["description"] == "Dinner"

    assert client.delete(f"/api/transactions/{tid}").status_code == 204
    assert client.get(f"/api/transactions/{tid}").status_code == 404
    assert client.delete(f"/api/transactions/{tid}").status_code == 404
    assert client.put("/api/transactions/9999", json=txn_body(client)).status_code == 404


def test_filters_search_and_pagination(client):
    food, transport = category_id(client, "Food"), category_id(client, "Transport")
    client.post("/api/transactions", json=txn_body(client, description="Rice", transaction_date="2026-11-10"))
    client.post("/api/transactions", json=txn_body(client, description="Bus fare", category_id=transport, transaction_date="2026-11-15"))
    client.post("/api/transactions", json=txn_body(client, type="income", description="Salary 100%", category_id=food, amount="50000", transaction_date="2026-11-20"))

    def total(**params):
        return client.get("/api/transactions", params=params).json()["total"]

    assert total() == 3
    assert total(type="income") == 1
    assert total(category_id=transport) == 1
    assert total(date_from="2026-11-15") == 2
    assert total(date_to="2026-11-14") == 1
    assert total(date_from="2026-11-11", date_to="2026-11-16") == 1
    assert total(q="BUS") == 1  # case-insensitive
    assert total(q="100%") == 1  # % is matched literally
    assert client.get("/api/transactions", params={"date_from": "2026-12-01", "date_to": "2026-11-01"}).status_code == 422

    page = client.get("/api/transactions", params={"limit": 2}).json()
    assert page["total"] == 3 and len(page["items"]) == 2
    assert page["items"][0]["transaction_date"] == "2026-11-20"  # newest first
    assert len(client.get("/api/transactions", params={"limit": 2, "offset": 2}).json()["items"]) == 1


def test_data_persists_across_new_sessions(client, engine):
    from sqlalchemy import select
    from sqlalchemy.orm import Session

    from app.models import Transaction

    client.post("/api/transactions", json=txn_body(client, amount="1234.56"))
    with Session(engine) as fresh:  # a brand-new session, as after restarting the app
        saved = fresh.scalars(select(Transaction)).all()
        assert [t.amount_kobo for t in saved] == [123_456]


def test_opening_balance(client):
    assert client.get("/api/settings/opening-balance").json()["amount_kobo"] == 0
    r = client.put("/api/settings/opening-balance", json={"amount": "250,000"})
    assert r.status_code == 200 and r.json()["amount_display"] == "₦250,000.00"
    assert client.get("/api/settings/opening-balance").json()["amount_kobo"] == 25_000_000
    assert client.put("/api/settings/opening-balance", json={"amount": "-1"}).status_code == 422
    assert client.get("/api/transactions").json()["total"] == 0  # not recorded as income


def test_custom_categories(client):
    r = client.post("/api/categories", json={"name": "  Pets "})
    assert r.status_code == 201 and r.json()["name"] == "Pets" and r.json()["is_default"] is False
    assert client.post("/api/categories", json={"name": "pets"}).status_code == 409
    assert client.post("/api/categories", json={"name": "  "}).status_code == 422
    assert client.post("/api/categories", json={"name": 123}).status_code == 422
    assert client.post("/api/categories", json={"name": "Pets\nCare"}).status_code == 422
    assert client.post("/api/categories", json={"name": "Pets\x00Care"}).status_code == 422

    pets = r.json()["id"]
    client.post("/api/transactions", json=txn_body(client, category_id=pets))
    assert client.delete(f"/api/categories/{pets}").status_code == 409  # in use
    assert client.delete(f"/api/categories/{category_id(client, 'Food')}").status_code == 409  # default

    unused = client.post("/api/categories", json={"name": "Hobbies"}).json()["id"]
    assert client.delete(f"/api/categories/{unused}").status_code == 204
    assert client.delete("/api/categories/9999").status_code == 404


def test_category_integrity_conflict_handling_and_non_misclassification(session, monkeypatch):
    from sqlalchemy.exc import IntegrityError

    from app.models import Category, Transaction
    from app.repositories import category_repository
    from app.schemas.category import CategoryIn
    from app.services import category_service
    from app.services.errors import ConflictError
    from datetime import date

    # Simulate a race condition on create_category where get_by_name saw None before insert.
    category_service.create_category(session, CategoryIn(name="Travel"))
    monkeypatch.setattr(category_repository, "get_by_name", lambda _db, _name: None)
    with pytest.raises(ConflictError):
        category_service.create_category(session, CategoryIn(name="travel"))
    assert not session.new  # the failed insert left no pending objects after rollback

    # Simulate a race condition on delete_category where is_in_use returned False before FK check.
    custom = category_repository.add(session, Category(name="Gadgets", is_savings=False, is_default=False))
    session.commit()
    session.add(
        Transaction(
            type="expense",
            amount_kobo=10_000,
            transaction_date=date(2026, 11, 21),
            category_id=custom.id,
            description="Charger",
        )
    )
    session.commit()
    monkeypatch.setattr(category_repository, "is_in_use", lambda _db, _cid: False)
    with pytest.raises(ConflictError):
        category_service.delete_category(session, custom.id)
    assert not session.deleted  # the failed delete left no pending deletes after rollback

    # Unrelated IntegrityError (e.g. NOT NULL violation on commit) must roll back and not be misclassified as 409.
    rolled_back = []
    orig_rollback = session.rollback

    def spy_rollback():
        rolled_back.append(True)
        orig_rollback()

    class FakeNotNullOrig(Exception):
        sqlite_errorcode = 1299

        def __str__(self):
            return "NOT NULL constraint failed: categories.is_default"

    monkeypatch.setattr(session, "rollback", spy_rollback)
    monkeypatch.setattr(
        session,
        "commit",
        lambda: (_ for _ in ()).throw(IntegrityError("INSERT INTO categories ...", {}, FakeNotNullOrig())),
    )
    with pytest.raises(IntegrityError):
        category_service.create_category(session, CategoryIn(name="Unrelated"))
    assert rolled_back == [True]
