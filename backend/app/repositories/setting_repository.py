from typing import Optional

from sqlalchemy.orm import Session

from app.models import Setting


def get(db: Session, key: str) -> Optional[str]:
    row = db.get(Setting, key)
    return row.value if row else None


def put(db: Session, key: str, value: str) -> None:
    row = db.get(Setting, key)
    if row:
        row.value = value
    else:
        db.add(Setting(key=key, value=value))
    db.flush()
