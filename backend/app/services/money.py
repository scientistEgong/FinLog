"""Money helpers. All stored amounts are integer kobo (1 naira = 100 kobo)."""
import math
import re
from decimal import Decimal, InvalidOperation

from app.config import CURRENCY_SYMBOL, MAX_AMOUNT_KOBO

# ============================================================
# 1. Define kobo conversion constants and strict format rules
# ============================================================
KOBO_PER_NAIRA = 100
MAX_NAIRA = MAX_AMOUNT_KOBO // KOBO_PER_NAIRA
MAX_NAIRA_DIGITS = len(str(MAX_NAIRA))
MAX_AMOUNT_INPUT_LENGTH = 64
_NUMERIC_PATTERN = re.compile(r"^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d+))?$")


def _extract_sign_and_number(raw_text: str) -> tuple[bool, str]:
    """Strip an optional leading negative sign and currency symbol in either order."""
    text = raw_text.strip()
    if not text:
        raise ValueError("Amount is required.")
    if len(text) > MAX_AMOUNT_INPUT_LENGTH:
        raise ValueError("Amount is too large.")

    negative = False
    if text.startswith("-"):
        negative = True
        text = text[1:]
        if text.startswith(CURRENCY_SYMBOL):
            text = text[len(CURRENCY_SYMBOL) :]
    elif text.startswith(CURRENCY_SYMBOL):
        text = text[len(CURRENCY_SYMBOL) :]
        if text.startswith("-"):
            negative = True
            text = text[1:]

    if not text:
        if raw_text.strip() == CURRENCY_SYMBOL:
            raise ValueError("Amount is required.")
        raise ValueError(f"'{raw_text}' is not a valid amount.")
    return negative, text


# ============================================================
# 2. Convert and format monetary values without losing precision
# ============================================================
def naira_to_kobo(value) -> int:
    """Convert user input such as '15,000.50' or '₦1500' to integer kobo.

    Raises ValueError for blank, malformed, non-finite input, amounts above
    MAX_AMOUNT_KOBO, or more than two decimal places (rejected, never rounded).
    Sign/zero checks belong to validation, not here.
    """
    if value is None or isinstance(value, bool):
        raise ValueError("Amount is required.")
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError(f"'{value}' is not a valid amount.")
        raw_text = repr(value)
    elif isinstance(value, (str, int, Decimal)):
        raw_text = str(value)
    else:
        raise ValueError(f"'{value}' is not a valid amount.")

    negative, number_text = _extract_sign_and_number(raw_text)
    match = _NUMERIC_PATTERN.fullmatch(number_text)
    if match is None:
        raise ValueError(f"'{value}' is not a valid amount.")

    fractional_part = match.group(1) or ""
    if len(fractional_part) > 2:
        raise ValueError("Amount cannot have more than 2 decimal places.")

    plain_number = number_text.replace(",", "")
    whole_part = plain_number.split(".", 1)[0].lstrip("0") or "0"
    # Enforce the upper bound before Decimal arithmetic to prevent rounding or overflow.
    if len(whole_part) > MAX_NAIRA_DIGITS:
        raise ValueError("Amount is too large.")
    if int(whole_part) * KOBO_PER_NAIRA + int(fractional_part.ljust(2, "0")) > MAX_AMOUNT_KOBO:
        raise ValueError("Amount is too large.")

    try:
        amount = Decimal(plain_number)
        if not amount.is_finite():
            raise ValueError(f"'{value}' is not a valid amount.")
        kobo = amount * KOBO_PER_NAIRA
    except (InvalidOperation, Overflow):
        raise ValueError(f"'{value}' is not a valid amount.") from None

    if kobo != kobo.to_integral_value():
        raise ValueError("Amount cannot have more than 2 decimal places.")

    result = int(kobo)
    return -result if negative else result


def kobo_to_decimal(kobo: int) -> Decimal:
    return Decimal(int(kobo)) / KOBO_PER_NAIRA


def format_naira(kobo: int) -> str:
    """1500000 -> '₦15,000.00'; -15000 -> '-₦150.00'."""
    sign = "-" if kobo < 0 else ""
    whole, frac = divmod(abs(int(kobo)), KOBO_PER_NAIRA)
    return f"{sign}{CURRENCY_SYMBOL}{whole:,}.{frac:02d}"
