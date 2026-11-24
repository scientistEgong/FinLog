"""API shapes for opening balance; input is naira and output includes kobo."""
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.services.validation import parse_non_negative_amount


class OpeningBalanceIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    amount_kobo: int = Field(alias="amount")

    @field_validator("amount_kobo", mode="before")
    @classmethod
    def _amount(cls, value):
        return parse_non_negative_amount(value)


class OpeningBalanceOut(BaseModel):
    amount_kobo: int
    amount_input: str
    amount_display: str
