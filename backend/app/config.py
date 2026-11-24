"""Central configuration for FinLog. No secrets, no heavy imports."""
import os
from datetime import date
from pathlib import Path

APP_NAME = "FinLog"
APP_VERSION = "0.2.0"

# Project root = FinLog/ (this file is FinLog/backend/app/config.py)
BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "finlog.db"


def _load_dotenv(path: Path) -> None:
    """Tiny .env reader (KEY=VALUE lines). Real environment variables win."""
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv(BASE_DIR / ".env")

# Override with FINLOG_DATABASE_URL to point at PostgreSQL later.
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
    ("Transport", False),
    ("Accommodation", False),
    ("Clothing", False),
    ("Education", False),
    ("Data and Internet", False),
    ("Healthcare", False),
    ("Electricity and Utilities", False),
    ("Personal", False),
    ("Savings", True),
    ("Emergency", False),
    ("Other", False),
]

TRANSACTION_TYPES = ("income", "expense")
PERIOD_TYPES = ("week", "month")
LOAN_DIRECTIONS = ("borrowed", "lent")

# Keys used in the settings table.
SETTING_OPENING_BALANCE = "opening_balance_kobo"

# Validation limits.
MAX_DESCRIPTION_LENGTH = 200
MAX_PAYMENT_METHOD_LENGTH = 50
MAX_NOTES_LENGTH = 1000
MAX_CATEGORY_NAME_LENGTH = 50
MAX_AMOUNT_KOBO = 10**14  # NGN 1 trillion
MIN_DATE = date(2000, 1, 1)
MAX_DATE = date(2100, 12, 31)

DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 200
