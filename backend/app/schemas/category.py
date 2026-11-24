from pydantic import BaseModel, field_validator

from app.config import MAX_CATEGORY_NAME_LENGTH
from app.services.validation import clean_required_text


class CategoryIn(BaseModel):
    name: str

    @field_validator("name", mode="before")
    @classmethod
    def _name(cls, value):
        return clean_required_text(value, "Category name", MAX_CATEGORY_NAME_LENGTH)


class CategoryOut(BaseModel):
    id: int
    name: str
    is_savings: bool
    is_default: bool
