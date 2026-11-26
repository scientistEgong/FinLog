"""Apply category business rules before repository changes are committed."""
from sqlalchemy.orm import Session

from app.models import Category
from app.repositories import category_repository
from app.schemas.category import CategoryIn
from app.services.errors import ConflictError, NotFoundError


# ============================================================
# 1. List, create, and protect category records
# ============================================================
def list_categories(db: Session) -> list[Category]:
    return category_repository.list_all(db)


def create_category(db: Session, data: CategoryIn) -> Category:
    if category_repository.get_by_name(db, data.name) is not None:
        raise ConflictError("A category with this name already exists.")
    category = category_repository.add(db, Category(name=data.name, is_savings=False, is_default=False))
    db.commit()
    return category


def delete_category(db: Session, category_id: int) -> None:
    category = category_repository.get(db, category_id)
    if category is None:
        raise NotFoundError("Category not found.")
    if category.is_default:
        raise ConflictError("Default categories cannot be deleted.")
    if category_repository.is_in_use(db, category_id):
        raise ConflictError("This category is used by transactions or budgets and cannot be deleted.")
    category_repository.delete(db, category)
    db.commit()
