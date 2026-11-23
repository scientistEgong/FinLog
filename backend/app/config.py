"""Central configuration for FinLog. No secrets, no heavy imports."""
import os
from pathlib import Path

APP_NAME = "FinLog"
APP_VERSION = "0.1.0"

# Project root = FinLog/ (this file is FinLog/backend/app/config.py)
BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "finlog.db"

# Override with FINLOG_DATABASE_URL to point at PostgreSQL later, e.g.
# postgresql+psycopg://user:pass@host/finlog
DATABASE_URL = os.environ.get("FINLOG_DATABASE_URL", f"sqlite:///{DB_PATH.as_posix()}")

CURRENCY_CODE = "NGN"
CURRENCY_SYMBOL = "₦"

# Weeks run Sunday -> Saturday (agreed with the user).
WEEK_STARTS_ON = "sunday"

# Origins allowed to call the API during local development.
CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

# (name, is_savings). Savings is flagged so it can be kept out of "expenditure".
DEFAULT_CATEGORIES = [
    ("Food", False),
    ("Transportation", False),
    ("Accommodation", False),
    ("Clothing", False),
    ("Education", False),
    ("Data and internet", False),
    ("Healthcare", False),
    ("Electricity and utilities", False),
    ("Personal expenses", False),
    ("Savings", True),
    ("Emergency", False),
    ("Other", False),
]

TRANSACTION_TYPES = ("income", "expense")
PERIOD_TYPES = ("week", "month")
LOAN_DIRECTIONS = ("borrowed", "lent")

# Keys used in the settings table.
SETTING_OPENING_BALANCE = "opening_balance_kobo"
