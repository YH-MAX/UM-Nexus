from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from app.db.session import SessionLocal
from app.services.trade_evaluation_service import seed_benchmark_cases


def main() -> None:
    db = SessionLocal()
    try:
        cases = seed_benchmark_cases(db)
        print(f"Seeded {len(cases)} benchmark case(s)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
