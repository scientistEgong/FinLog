"""Money helpers. All stored amounts are integer kobo (1 naira = 100 kobo)."""
from decimal import Decimal, InvalidOperation

from app.config import CURRENCY_SYMBOL

KOBO_PER_NAIRA = 100


def naira_to_kobo(value) -> int:
    """Convert user input such as '15,000.50' or '₦1500' to integer kobo.

    Raises ValueError for blank, non-numeric, non-finite input, or more than
    two decimal places (we reject rather than silently round money).
    Sign/zero checks belong to validation, not here.
    """
    if value is None or isinstance(value, bool):
        raise ValueError("Amount is required.")
    text = repr(value) if isinstance(value, float) else str(value)
    text = text.replace(",", "").replace(CURRENCY_SYMBOL, "").strip()
    if not text:
        raise ValueError("Amount is required.")
    try:
        amount = Decimal(text)
    except InvalidOperation:
        raise ValueError(f"'{value}' is not a valid amount.") from None
    if not amount.is_finite():
        raise ValueError(f"'{value}' is not a valid amount.")
    kobo = amount * KOBO_PER_NAIRA
    if kobo != kobo.to_integral_value():
        raise ValueError("Amount cannot have more than 2 decimal places.")
    return int(kobo)


def kobo_to_decimal(kobo: int) -> Decimal:
    return Decimal(int(kobo)) / KOBO_PER_NAIRA


def format_naira(kobo: int) -> str:
    """1500000 -> '₦15,000.00'; -15000 -> '-₦150.00'."""
    sign = "-" if kobo < 0 else ""
    whole, frac = divmod(abs(int(kobo)), KOBO_PER_NAIRA)
    return f"{sign}{CURRENCY_SYMBOL}{whole:,}.{frac:02d}"
