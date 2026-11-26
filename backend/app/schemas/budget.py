"""Validated request and response shapes for category budgets."""
from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.services.dates import week_start
from app.services.validation import check_date_in_range, parse_non_negative_amount


class BudgetIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    period_type: Literal["week", "month"]
    period_start: date
    category_id: int
    amount_kobo: int = Field(alias="amount")

    @field_validator("period_start")
    @classmethod
    def _date_in_range(cls, value):
        return check_date_in_range(value)

    @field_validator("amount_kobo", mode="before")
    @classmethod
    def _amount(cls, value):
        return parse_non_negative_amount(value)

    @model_validator(mode="after")
    def _canonical_period_start(self):
        if self.period_type == "week" and self.period_start != week_start(self.period_start):
            raise ValueError("A weekly budget period must start on Sunday.")
        if self.period_type == "month" and self.period_start.day != 1:
            raise ValueError("A monthly budget period must start on the first day of the month.")
        return self


class BudgetOut(BaseModel):
    id: int
    period_type: str
    period_start: date
    category_id: int
    category_name: str
    amount_kobo: int
    amount_input: str
    amount_display: str


class BudgetPage(BaseModel):
    period_type: Literal["week", "month"]
    period_start: date
    items: list[BudgetOut]
    total_budget_kobo: int
    total_budget_display: str
