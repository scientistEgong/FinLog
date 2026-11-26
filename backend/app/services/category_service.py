"""Apply category business rules before repository changes are committed."""
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Category
from app.repositories import category_repository
from app.schemas.category import CategoryIn
from app.services.errors import ConflictError, NotFoundError


def _is_category_unique_violation(exc: IntegrityError) -> bool:
    orig = exc.orig
    code = getattr(orig, "sqlite_errorcode", None)
    pgcode = getattr(orig, "pgcode", None)
    message = str(orig or exc).lower()
    if pgcode == "23505":
        return "uq_categories_name_ci" in message or "categories" in message
    if code == 2067:
        return "uq_categories_name_ci" in message or "categories" in message
    return "unique constraint failed" in message and (
        "uq_categories_name_ci" in message or "categories" in message
    )


def _is_foreign_key_violation(exc: IntegrityError) -> bool:
    orig = exc.orig
    code = getattr(orig, "sqlite_errorcode", None)
    pgcode = getattr(orig, "pgcode", None)
    message = str(orig or exc).lower()
    if pgcode == "23503":
        return True
    if code in (787, 1811) and "foreign key" in message:
        return True
    return "foreign key constraint failed" in message


# ============================================================
# 1. List, create, and protect category records
# ============================================================
def list_categories(db: Session) -> list[Category]:
    return category_repository.list_all(db)


def create_category(db: Session, data: CategoryIn) -> Category:
    if category_repository.get_by_name(db, data.name) is not None:
        raise ConflictError("A category with this name already exists.")
    category = category_repository.add(db, Category(name=data.name, is_savings=False, is_default=False))
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if _is_category_unique_violation(exc):
            raise ConflictError("A category with this name already exists.") from None
        raise
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
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if _is_foreign_key_violation(exc):
            raise ConflictError("This category is used by transactions or budgets and cannot be deleted.") from None
        raise
