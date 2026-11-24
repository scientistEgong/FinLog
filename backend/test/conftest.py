"""Shared pytest fixtures with isolated databases for database and API tests."""
import pytest
from sqlalchemy.orm import Session

from app.database import init_db, make_engine


@pytest.fixture
def engine(tmp_path):
    """A throwaway database file in a temp folder: never your real data/finlog.db."""
    eng = make_engine(f"sqlite:///{(tmp_path / 'test.db').as_posix()}")
    init_db(eng)
    yield eng
    eng.dispose()


@pytest.fixture
def session(engine):
    with Session(engine) as s:
        yield s


@pytest.fixture
def client(engine):
    """API client wired to the temporary test database.

    TestClient is deliberately NOT used as a context manager, so the app's startup
    hook (which would touch your real data/finlog.db) never runs during tests.
    """
    from fastapi.testclient import TestClient
    from sqlalchemy.orm import sessionmaker

    from app.database import get_db
    from app.main import app

    test_session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        db = test_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
