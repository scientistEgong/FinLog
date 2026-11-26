"""Pure validation helpers (standard library only). Used by schemas and services.

Every function raises ValueError with a message that is safe to show the user.
"""
from datetime import date
from typing import Optional

from app.config import MAX_AMOUNT_KOBO, MAX_DATE, MIN_DATE
from app.services.money import naira_to_kobo


_ALLOWED_MULTILINE_CONTROLS = frozenset(("\n", "\r", "\t"))


def _validate_control_characters(text: str, label: str, *, allow_multiline: bool) -> None:
    for ch in text:
        code = ord(ch)
        if code < 32 or code == 127:
            if allow_multiline and ch in _ALLOWED_MULTILINE_CONTROLS:
                continue
            raise ValueError(f"{label} contains invalid control characters.")


# ============================================================
# 1. Validate and normalize user-provided text
# ============================================================
def clean_required_text(value, label: str, max_length: int, *, allow_multiline: bool = False) -> str:
    if value is None:
        raise ValueError(f"{label} is required.")
    if not isinstance(value, str):
        raise ValueError(f"{label} must be text.")
    text = value.strip()
    if not text:
        raise ValueError(f"{label} is required.")
    _validate_control_characters(text, label, allow_multiline=allow_multiline)
    if len(text) > max_length:
        raise ValueError(f"{label} must be at most {max_length} characters.")
    return text


def clean_optional_text(value, label: str, max_length: int, *, allow_multiline: bool = False) -> Optional[str]:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError(f"{label} must be text.")
    text = value.strip()
    if not text:
        return None
    _validate_control_characters(text, label, allow_multiline=allow_multiline)
    if len(text) > max_length:
        raise ValueError(f"{label} must be at most {max_length} characters.")
    return text


def parse_positive_amount(value) -> int:
    """User input in naira -> kobo, strictly greater than zero."""
    kobo = naira_to_kobo(value)
    if kobo <= 0:
        raise ValueError("Amount must be greater than zero.")
    if kobo > MAX_AMOUNT_KOBO:
        raise ValueError("Amount is too large.")
    return kobo


def parse_non_negative_amount(value) -> int:
    kobo = naira_to_kobo(value)
    if kobo < 0:
        raise ValueError("Amount cannot be negative.")
    if kobo > MAX_AMOUNT_KOBO:
        raise ValueError("Amount is too large.")
    return kobo


def check_date_in_range(value: date) -> date:
    if value < MIN_DATE or value > MAX_DATE:
        raise ValueError(f"Date must be between {MIN_DATE.isoformat()} and {MAX_DATE.isoformat()}.")
    return value


def check_date_order(start: Optional[date], end: Optional[date]) -> None:
    if start and end and start > end:
        raise ValueError("Start date cannot be after end date.")
