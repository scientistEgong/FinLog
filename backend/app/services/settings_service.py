"""Read/update app settings and translate stored kobo to API display values."""
from sqlalchemy.orm import Session

from app.config import SETTING_OPENING_BALANCE
from app.repositories import setting_repository
from app.schemas.setting import OpeningBalanceIn, OpeningBalanceOut
from app.services.money import format_naira, kobo_to_decimal


# ============================================================
# 1. Read and update the opening-balance setting
# ============================================================
def _out(kobo: int) -> OpeningBalanceOut:
    return OpeningBalanceOut(
        amount_kobo=kobo, amount_input=f"{kobo_to_decimal(kobo):.2f}", amount_display=format_naira(kobo)
    )


def get_opening_balance_kobo(db: Session) -> int:
    """Opening balance is NOT income. Missing setting means zero."""
    value = setting_repository.get(db, SETTING_OPENING_BALANCE)
    return int(value) if value else 0


def get_opening_balance(db: Session) -> OpeningBalanceOut:
    return _out(get_opening_balance_kobo(db))


def set_opening_balance(db: Session, data: OpeningBalanceIn) -> OpeningBalanceOut:
    setting_repository.put(db, SETTING_OPENING_BALANCE, str(data.amount_kobo))
    db.commit()
    return _out(data.amount_kobo)
