"""Pure validation helpers (standard library only). Used by schemas and services.

Every function raises ValueError with a message that is safe to show the user.
"""
from datetime import date
from typing import Optional

from app.config import MAX_AMOUNT_KOBO, MAX_DATE, MIN_DATE
from app.services.money import naira_to_kobo


def clean_required_text(value, label: str, max_length: int) -> str:
    text = "" if value is None else str(value).strip()
    if not text:
        raise ValueError(f"{label} is required.")
    if len(text) > max_length:
        raise ValueError(f"{label} must be at most {max_length} characters.")
    return text


def clean_optional_text(value, label: str, max_length: int) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
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
