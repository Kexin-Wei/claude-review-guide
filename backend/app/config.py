from pathlib import Path

# Project root is parent of backend/
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DB_DIR = PROJECT_ROOT / ".data"
DB_PATH = DB_DIR / "code-review.db"
BACKEND_PORT = 8000
FRONTEND_ORIGIN = "http://localhost:3000"
