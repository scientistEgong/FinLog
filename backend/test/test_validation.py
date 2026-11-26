import unittest
from datetime import date

from app.config import MAX_AMOUNT_KOBO
from app.services.validation import (
    check_date_in_range,
    check_date_order,
    clean_optional_text,
    clean_required_text,
    parse_non_negative_amount,
    parse_positive_amount,
)


class AmountTests(unittest.TestCase):
    def test_positive_amount_ok(self):
        self.assertEqual(parse_positive_amount("15,000.50"), 1_500_050)
        self.assertEqual(parse_positive_amount(1), 100)

    def test_positive_amount_rejects_invalid(self):
        for bad in ["0", "0.00", "-5", "abc", "", None, "1.234", str(MAX_AMOUNT_KOBO)]:
            with self.subTest(bad=bad):
                with self.assertRaises(ValueError):
                    parse_positive_amount(bad)

    def test_non_negative_allows_zero_only(self):
        self.assertEqual(parse_non_negative_amount("0"), 0)
        self.assertEqual(parse_non_negative_amount("250.00"), 25_000)
        with self.assertRaisesRegex(ValueError, "negative"):
            parse_non_negative_amount("-0.01")
        with self.assertRaisesRegex(ValueError, "negative"):
            parse_non_negative_amount("-₦10.00")
        with self.assertRaisesRegex(ValueError, "greater than zero"):
            parse_positive_amount("-₦10.00")


class TextTests(unittest.TestCase):
    def test_required_text(self):
        self.assertEqual(clean_required_text("  Lunch  ", "Description", 200), "Lunch")
        for bad in ["", "   ", None, 123, ["Lunch"], "Lunch\x00test", "Lunch\nDinner", "Lunch\t1", "x\x7f", "x" * 201]:
            with self.subTest(bad=bad):
                with self.assertRaises(ValueError):
                    clean_required_text(bad, "Description", 200)

    def test_optional_text(self):
        self.assertIsNone(clean_optional_text(None, "Notes", 10))
        self.assertIsNone(clean_optional_text("   ", "Notes", 10))
        self.assertEqual(clean_optional_text(" hi ", "Notes", 10), "hi")
        for bad in [123, "a\x00b", "a\nb", "a\tb", "x" * 11]:
            with self.subTest(bad=bad):
                with self.assertRaises(ValueError):
                    clean_optional_text(bad, "Notes", 10)

    def test_multiline_text_allows_normal_whitespace_only(self):
        self.assertEqual(
            clean_optional_text("Line 1\r\n\tLine 2", "Notes", 100, allow_multiline=True),
            "Line 1\r\n\tLine 2",
        )
        for bad in ["Line 1\x00Line 2", "Beep\x07", "Del\x7f", 42]:
            with self.subTest(bad=bad):
                with self.assertRaises(ValueError):
                    clean_optional_text(bad, "Notes", 100, allow_multiline=True)


class DateTests(unittest.TestCase):
    def test_range(self):
        self.assertEqual(check_date_in_range(date(2026, 11, 21)), date(2026, 11, 21))
        for bad in [date(1999, 12, 31), date(2101, 1, 1)]:
            with self.assertRaises(ValueError):
                check_date_in_range(bad)

    def test_order(self):
        check_date_order(None, date(2026, 1, 1))
        check_date_order(date(2026, 1, 1), date(2026, 1, 1))
        with self.assertRaises(ValueError):
            check_date_order(date(2026, 2, 1), date(2026, 1, 1))


if __name__ == "__main__":
    unittest.main()
