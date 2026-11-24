import os
import tempfile
import unittest
from pathlib import Path

from app.config import _load_dotenv


class DotenvTests(unittest.TestCase):
    def test_loads_values_but_real_environment_wins(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / ".env"
            path.write_text('# comment\n\nFINLOG_TEST_A="hello"\nFINLOG_TEST_B=from_file\nbadline\n', encoding="utf-8")
            os.environ.pop("FINLOG_TEST_A", None)
            os.environ["FINLOG_TEST_B"] = "from_env"
            try:
                _load_dotenv(path)
                self.assertEqual(os.environ["FINLOG_TEST_A"], "hello")
                self.assertEqual(os.environ["FINLOG_TEST_B"], "from_env")
            finally:
                os.environ.pop("FINLOG_TEST_A", None)
                os.environ.pop("FINLOG_TEST_B", None)

    def test_missing_file_is_fine(self):
        _load_dotenv(Path("definitely_not_here.env"))


if __name__ == "__main__":
    unittest.main()
