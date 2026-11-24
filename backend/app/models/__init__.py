# Importing every model here registers it with Base.metadata.
from app.models.budget import Budget
from app.models.category import Category
from app.models.loan import Loan, LoanRepayment
from app.models.setting import Setting
from app.models.transaction import Transaction

__all__ = ["Budget", "Category", "Loan", "LoanRepayment", "Setting", "Transaction"]
