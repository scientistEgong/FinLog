"""Create missing tables and seed the default categories.

Safe to run on every start: it never drops, alters or overwrites anything.
It seeds only categories (never transactions or any sample financial data),
and only when the categories table is completely empty.
"""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models  # noqa: F401  (registers tables)
from app.config import DEFAULT_CATEGORIES
from app.database import Base, engine as default_engine
from app.models import Category


def seed_default_categories(session: Session) -> int:
    if session.scalar(select(func.count(Category.id))) > 0:
        return 0
    for name, is_savings in DEFAULT_CATEGORIES:
        session.add(Category(name=name, is_savings=is_savings, is_default=True))
    session.commit()
    return len(DEFAULT_CATEGORIES)


def init_db(engine=default_engine) -> None:
    Base.metadata.create_all(bind=engine)  # creates only tables that do not exist
    with Session(engine) as session:
        seed_default_categories(session)


if __name__ == "__main__":
    from app.database import ensure_data_dir

    ensure_data_dir()
    init_db()
    print("FinLog database is ready.")
