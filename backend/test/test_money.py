from decimal import Decimal
import unittest

from app.config import MAX_AMOUNT_KOBO
from app.services.money import format_naira, kobo_to_decimal, naira_to_kobo


class MoneyTests(unittest.TestCase):
    def test_parses_common_inputs(self):
        self.assertEqual(naira_to_kobo("15,000.00"), 1_500_000)
        self.assertEqual(naira_to_kobo("₦1,500.5"), 150_050)
        self.assertEqual(naira_to_kobo(2500), 250_000)
        self.assertEqual(naira_to_kobo(12.5), 1_250)
        self.assertEqual(naira_to_kobo("0.01"), 1)
        self.assertEqual(naira_to_kobo("0.50"), 50)
        self.assertEqual(naira_to_kobo("-₦150.00"), -15_000)
        self.assertEqual(naira_to_kobo("₦-150.00"), -15_000)
        self.assertEqual(naira_to_kobo("1000000000000.00"), MAX_AMOUNT_KOBO)
        self.assertEqual(naira_to_kobo(Decimal("15.25")), 1_525)

    def test_rejects_bad_input(self):
        bad_inputs = [
            "",
            "   ",
            "₦",
            "-",
            "-₦",
            None,
            "abc",
            "NaN",
            "Infinity",
            float("nan"),
            float("inf"),
            float("-inf"),
            "10.005",
            "10.100",
            "10.0000",
            ".50",
            "10.",
            "+500",
            "1e2",
            "1E2",
            "1e999999",
            "1_000",
            "1,2,3",
            "1,,000",
            ",500",
            "500,",
            "15₦00",
            True,
            "1 500",
            "1000000000000.01",
            "0" * 65,
            {"amount": "100"},
        ]
        for bad in bad_inputs:
            with self.subTest(bad=bad):
                with self.assertRaises(ValueError):
                    naira_to_kobo(bad)

    def test_format_naira(self):
        self.assertEqual(format_naira(1_500_000), "₦15,000.00")
        self.assertEqual(format_naira(0), "₦0.00")
        self.assertEqual(format_naira(5), "₦0.05")
        self.assertEqual(format_naira(-15_000), "-₦150.00")
        self.assertEqual(format_naira(123_456_789), "₦1,234,567.89")

    def test_round_trip(self):
        for kobo in (1, 99, 100, 1_500_000, 987_654_321):
            self.assertEqual(naira_to_kobo(str(kobo_to_decimal(kobo))), kobo)


if __name__ == "__main__":
    unittest.main()
