import unittest
from datetime import date

from app.services.dates import month_range, week_range, week_start, year_range


class DateTests(unittest.TestCase):
    def test_week_runs_sunday_to_saturday(self):
        # 2026-11-21 is a Saturday; its week starts Sunday 2026-11-15.
        self.assertEqual(week_range(date(2026, 11, 21)), (date(2026, 11, 15), date(2026, 11, 21)))
        # A Sunday is the first day of its own week.
        self.assertEqual(week_start(date(2026, 11, 15)), date(2026, 11, 15))
        # Monday belongs to the week that began the day before.
        self.assertEqual(week_start(date(2026, 11, 16)), date(2026, 11, 15))
        # Week spanning a month boundary.
        self.assertEqual(week_range(date(2026, 12, 1)), (date(2026, 11, 29), date(2026, 12, 5)))

    def test_every_day_of_a_week_maps_to_one_sunday(self):
        for day in range(15, 22):
            self.assertEqual(week_start(date(2026, 11, day)), date(2026, 11, 15))

    def test_month_range(self):
        self.assertEqual(month_range(date(2026, 11, 21)), (date(2026, 11, 1), date(2026, 11, 30)))
        self.assertEqual(month_range(date(2028, 2, 10)), (date(2028, 2, 1), date(2028, 2, 29)))
        self.assertEqual(month_range(date(2027, 2, 10)), (date(2027, 2, 1), date(2027, 2, 28)))

    def test_year_range(self):
        self.assertEqual(year_range(date(2026, 6, 1)), (date(2026, 1, 1), date(2026, 12, 31)))


if __name__ == "__main__":
    unittest.main()
