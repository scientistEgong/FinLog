"""Date-range helpers. Weeks run Sunday -> Saturday."""
import calendar
from datetime import date, timedelta


# ============================================================
# 1. Derive Sunday-start weekly boundaries and validate periods
# ============================================================
def week_start(d: date) -> date:
    # date.weekday(): Monday=0 ... Sunday=6
    return d - timedelta(days=(d.weekday() + 1) % 7)


def week_range(d: date) -> tuple[date, date]:
    start = week_start(d)
    return start, start + timedelta(days=6)


def month_range(d: date) -> tuple[date, date]:
    last_day = calendar.monthrange(d.year, d.month)[1]
    return d.replace(day=1), d.replace(day=last_day)


def year_range(d: date) -> tuple[date, date]:
    return date(d.year, 1, 1), date(d.year, 12, 31)
