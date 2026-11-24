"""Engine, session factory, declarative Base, and database initialisation.

Only SQLAlchemy is used for database access, so moving to PostgreSQL later
means changing DATABASE_URL, not rewriting queries.
"""
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import DATA_DIR, DATABASE_URL, DEFAULT_CATEGORIES


class Base(DeclarativeBase):
    pass


def make_engine(url: str):
    """Create an engine. For SQLite, enforce foreign keys (off by default)."""
    is_sqlite = url.startswith("sqlite")
    kwargs = {"connect_args": {"check_same_thread": False}} if is_sqlite else {}
    engine = create_engine(url, **kwargs)
    if is_sqlite:

        @event.listens_for(engine, "connect")
        def _enable_foreign_keys(dbapi_connection, _record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


engine = make_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_db():
    """FastAPI dependency: one session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_default_categories(session: Session) -> int:
    """Insert the default categories only if the categories table is empty."""
    from app.models import Category

    if session.scalar(select(func.count(Category.id))) > 0:
        return 0
    for name, is_savings in DEFAULT_CATEGORIES:
        session.add(Category(name=name, is_savings=is_savings, is_default=True))
    session.commit()
    return len(DEFAULT_CATEGORIES)


def init_db(target_engine=None) -> None:
    """Create missing tables and seed categories. Never drops, alters or overwrites.

    Seeds categories only; never creates transactions or any sample financial data.
    """
    from app import models  # noqa: F401  (registers every table on Base.metadata)

    bind = target_engine or engine
    Base.metadata.create_all(bind=bind)
    with Session(bind) as session:
        seed_default_categories(session)
