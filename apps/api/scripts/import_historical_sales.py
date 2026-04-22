from __future__ import annotations

import argparse
import csv
from datetime import datetime
from decimal import Decimal
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import HistoricalSale


REQUIRED_COLUMNS = {"item_name", "category", "sold_price"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import UM Nexus historical resale sales from a CSV file.")
    parser.add_argument("csv_path", help="CSV with item_name, category, sold_price, and optional condition/location fields.")
    return parser.parse_args()


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value)


def main() -> None:
    args = parse_args()
    path = Path(args.csv_path)
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        missing = REQUIRED_COLUMNS - set(reader.fieldnames or [])
        if missing:
            joined = ", ".join(sorted(missing))
            raise SystemExit(f"Missing required column(s): {joined}")

        db = SessionLocal()
        created = 0
        try:
            for row in reader:
                item_name = (row.get("item_name") or "").strip()
                category = (row.get("category") or "").strip()
                sold_price = Decimal(str(row.get("sold_price") or "0"))
                notes = (row.get("notes") or "").strip() or None
                exists = db.scalar(
                    select(HistoricalSale).where(
                        HistoricalSale.item_name == item_name,
                        HistoricalSale.category == category,
                        HistoricalSale.sold_price == sold_price,
                        HistoricalSale.notes == notes,
                    )
                )
                if exists is not None:
                    continue
                db.add(
                    HistoricalSale(
                        item_name=item_name,
                        category=category,
                        condition_label=(row.get("condition_label") or "").strip() or None,
                        sold_price=sold_price,
                        currency=(row.get("currency") or "MYR").strip() or "MYR",
                        location=(row.get("pickup_area") or row.get("location") or "").strip() or None,
                        residential_college=(row.get("residential_college") or "").strip() or None,
                        sold_at=parse_datetime((row.get("sold_at") or "").strip() or None),
                        notes=notes,
                        source_type=(row.get("source_type") or "csv_import").strip() or "csv_import",
                    )
                )
                created += 1
            db.commit()
        finally:
            db.close()

    print(f"Imported {created} historical sale(s) from {path}")


if __name__ == "__main__":
    main()
