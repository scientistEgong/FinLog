from datetime import date

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.config import DEFAULT_CATEGORIES
from app.database import init_db, seed_default_categories
from app.models import Budget, Category, Loan, LoanRepayment, Transaction


def make_txn(category_id, **over):
    data = dict(type="expense", amount_kobo=150_000, transaction_date=date(2026, 11, 21),
                category_id=category_id, description="Lunch")
    data.update(over)
    return Transaction(**data)


def first_category(session):
    return session.scalars(select(Category).order_by(Category.id)).first()


def test_default_categories_seeded_once(session, engine):
    assert session.scalar(select(func.count(Category.id))) == len(DEFAULT_CATEGORIES)
    init_db(engine)  # running again must not duplicate or reset anything
    assert seed_default_categories(session) == 0
    assert session.scalar(select(func.count(Category.id))) == len(DEFAULT_CATEGORIES)


def test_no_sample_financial_data_is_created(session):
    assert session.scalar(select(func.count(Transaction.id))) == 0
    assert session.scalar(select(func.count(Loan.id))) == 0
    assert session.scalar(select(func.count(Budget.id))) == 0


def test_savings_flag_only_on_savings(session):
    flagged = session.scalars(select(Category.name).where(Category.is_savings)).all()
    assert flagged == ["Savings"]


def test_category_names_unique_ignoring_case(session):
    session.add(Category(name="food"))
    with pytest.raises(IntegrityError):
        session.commit()


@pytest.mark.parametrize("bad", [dict(amount_kobo=0), dict(amount_kobo=-5), dict(type="transfer")])
def test_invalid_transaction_rejected_by_database(session, bad):
    session.add(make_txn(first_category(session).id, **bad))
    with pytest.raises(IntegrityError):
        session.commit()


def test_transaction_needs_real_category(session):
    session.add(make_txn(9999))
    with pytest.raises(IntegrityError):
        session.commit()


def test_cannot_delete_category_in_use(session):
    cat = first_category(session)
    session.add(make_txn(cat.id))
    session.commit()
    session.delete(cat)
    with pytest.raises(IntegrityError):
        session.commit()


def test_duplicate_budget_rejected(session):
    cid = first_category(session).id
    row = dict(period_type="week", period_start=date(2026, 11, 15), category_id=cid, amount_kobo=500_000)
    session.add(Budget(**row))
    session.commit()
    session.add(Budget(**row))
    with pytest.raises(IntegrityError):
        session.commit()


def test_loan_rules_and_repayment_cascade(session):
    loan = Loan(direction="borrowed", counterparty="Ade", principal_kobo=10_000_000,
                opened_date=date(2026, 11, 1), due_date=date(2026, 12, 1))
    loan.repayments.append(LoanRepayment(amount_kobo=2_000_000, payment_date=date(2026, 11, 15)))
    session.add(loan)
    session.commit()
    assert loan.interest_kobo == 0

    session.delete(loan)
    session.commit()
    assert session.scalar(select(func.count(LoanRepayment.id))) == 0


def test_loan_due_date_cannot_precede_open_date(session):
    session.add(Loan(direction="lent", counterparty="Bola", principal_kobo=100,
                     opened_date=date(2026, 11, 10), due_date=date(2026, 11, 1)))
    with pytest.raises(IntegrityError):
        session.commit()
