from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.config import MAX_DESCRIPTION_LENGTH, MAX_NOTES_LENGTH, MAX_PAYMENT_METHOD_LENGTH
from app.services.validation import (
    check_date_in_range,
    clean_optional_text,
    clean_required_text,
    parse_positive_amount,
)


# ============================================================
# 1. Validate transaction request data
# ============================================================
class TransactionIn(BaseModel):
    """Request body. The client sends `amount` in naira (e.g. "15,000.50"); it is stored as kobo."""

    model_config = ConfigDict(populate_by_name=True)

    type: Literal["income", "expense"]
    amount_kobo: int = Field(alias="amount")
    transaction_date: date
    category_id: int
    description: str
    payment_method: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("amount_kobo", mode="before")
    @classmethod
    def _amount(cls, value):
        return parse_positive_amount(value)

    @field_validator("transaction_date")
    @classmethod
    def _date(cls, value):
        return check_date_in_range(value)

    @field_validator("description", mode="before")
    @classmethod
    def _description(cls, value):
        return clean_required_text(value, "Description", MAX_DESCRIPTION_LENGTH)

    @field_validator("payment_method", mode="before")
    @classmethod
    def _payment_method(cls, value):
        return clean_optional_text(value, "Payment method", MAX_PAYMENT_METHOD_LENGTH)

    @field_validator("notes", mode="before")
    @classmethod
    def _notes(cls, value):
        return clean_optional_text(value, "Notes", MAX_NOTES_LENGTH)


# ============================================================
# 2. Define transaction responses and paginated history
# ============================================================
class TransactionOut(BaseModel):
    id: int
    type: str
    amount_kobo: int
    amount_input: str  # plain naira string for edit forms, e.g. "1500.50"
    amount_display: str  # formatted for display, e.g. "₦1,500.50"
    transaction_date: date
    category_id: int
    category_name: str
    is_savings: bool
    description: str
    payment_method: Optional[str]
    notes: Optional[str]


class TransactionPage(BaseModel):
    items: list[TransactionOut]
    total: int
    limit: int
    offset: int
