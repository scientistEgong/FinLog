import unittest

from app.services.money import format_naira, kobo_to_decimal, naira_to_kobo


class MoneyTests(unittest.TestCase):
    def test_parses_common_inputs(self):
        self.assertEqual(naira_to_kobo("15,000.00"), 1_500_000)
        self.assertEqual(naira_to_kobo("₦1,500.5"), 150_050)
        self.assertEqual(naira_to_kobo(2500), 250_000)
        self.assertEqual(naira_to_kobo(12.5), 1_250)
        self.assertEqual(naira_to_kobo("0.01"), 1)

    def test_rejects_bad_input(self):
        for bad in ["", "   ", None, "abc", "NaN", "Infinity", "10.005", True, "1 500"]:
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
