"""Domain errors raised by services; main.py turns them into HTTP responses."""


class DomainError(Exception):
    pass


class NotFoundError(DomainError):
    pass


class ConflictError(DomainError):
    pass


class DomainValidationError(DomainError):
    def __init__(self, message: str, field: str | None = None):
        super().__init__(message)
        self.field = field
