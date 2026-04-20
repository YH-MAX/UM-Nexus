from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import HistoricalSale, Listing, ListingImage, ListingReport, WantedPost
from app.services.demo_user import get_or_create_demo_user


now = datetime.now(UTC)

LISTINGS = [
    {
        "title": "Casio FX-570EX calculator",
        "description": "Used for two semesters, works well with minor scratches. Good for FSKTM and engineering classes.",
        "category": "electronics",
        "item_name": "scientific calculator",
        "brand": "Casio",
        "model": "FX-570EX",
        "condition_label": "good",
        "price": 55.00,
        "pickup_area": "FSKTM",
        "residential_college": "KK12",
        "image": "demo/listings/casio-fx570ex.jpg",
    },
    {
        "title": "Compact rice cooker 1L",
        "description": "Used for 1 year, still works well, minor scratches on the lid. Great for hostel cooking.",
        "category": "small_appliances",
        "item_name": "rice cooker",
        "brand": "Pensonic",
        "model": "1L compact",
        "condition_label": "good",
        "price": 48.00,
        "pickup_area": "KK",
        "residential_college": "KK7",
        "image": "demo/listings/rice-cooker.jpg",
    },
    {
        "title": "Data Structures textbook",
        "description": "Clean copy with highlighted chapters. Useful for algorithm and data structures courses.",
        "category": "textbooks",
        "item_name": "data structures textbook",
        "brand": "Pearson",
        "model": None,
        "condition_label": "good",
        "price": 42.00,
        "pickup_area": "library",
        "residential_college": "KK2",
        "image": "demo/listings/data-structures-textbook.jpg",
    },
    {
        "title": "Foldable study lamp",
        "description": "Like new LED study lamp with three brightness levels. Barely used and clean.",
        "category": "dorm_essentials",
        "item_name": "study lamp",
        "brand": "Xiaomi",
        "model": "LED foldable",
        "condition_label": "like new",
        "price": 35.00,
        "pickup_area": "KK",
        "residential_college": "KK4",
        "image": "demo/listings/study-lamp.jpg",
    },
    {
        "title": "Overpriced mini fridge for hostel",
        "description": "Working mini fridge with cosmetic wear, pickup near KK. Selling before moving out.",
        "category": "small_appliances",
        "item_name": "mini fridge",
        "brand": "Midea",
        "model": "50L",
        "condition_label": "fair",
        "price": 280.00,
        "pickup_area": "KK",
        "residential_college": "KK10",
        "image": "demo/listings/mini-fridge.jpg",
    },
    {
        "title": "Overpriced Dell monitor 24 inch",
        "description": "24 inch monitor for study desk. Works well, includes HDMI cable and original stand.",
        "category": "electronics",
        "item_name": "monitor",
        "brand": "Dell",
        "model": "24 inch",
        "condition_label": "good",
        "price": 360.00,
        "pickup_area": "faculty_pickup",
        "residential_college": "KK9",
        "image": "demo/listings/monitor.jpg",
    },
    {
        "title": "Overpriced accounting textbook",
        "description": "Readable accounting textbook with notes on several chapters, still useful for tutorials.",
        "category": "textbooks",
        "item_name": "accounting textbook",
        "brand": "McGraw Hill",
        "model": None,
        "condition_label": "good",
        "price": 92.00,
        "pickup_area": "library",
        "residential_college": "KK3",
        "image": "demo/listings/accounting-textbook.jpg",
    },
    {
        "title": "Dorm storage box without photo",
        "description": "Large plastic storage box for hostel room, clean and still sturdy. Photo can be added later.",
        "category": "dorm_essentials",
        "item_name": "storage box",
        "brand": None,
        "model": None,
        "condition_label": "good",
        "price": 22.00,
        "pickup_area": "KK",
        "residential_college": "KK1",
        "image": None,
    },
    {
        "title": "Desk fan without photo",
        "description": "Small desk fan, works well and suitable for dorm desk. Missing image metadata in this demo scenario.",
        "category": "dorm_essentials",
        "item_name": "desk fan",
        "brand": "Khind",
        "model": "mini fan",
        "condition_label": "good",
        "price": 28.00,
        "pickup_area": "KK",
        "residential_college": "KK5",
        "image": None,
    },
    {
        "title": "Too cheap iPhone, urgent cash",
        "description": "No receipt, password locked, bank transfer only before meet. Too good deal.",
        "category": "electronics",
        "item_name": "phone",
        "brand": "Apple",
        "model": "iPhone",
        "condition_label": "unknown",
        "price": 120.00,
        "pickup_area": "other",
        "residential_college": None,
        "image": None,
        "reports": ["suspicious_payment"],
    },
    {
        "title": "Replica branded headphones",
        "description": "Replica item, looks original. Box missing, no warranty, pay first if serious.",
        "category": "electronics",
        "item_name": "headphones",
        "brand": "Unknown",
        "model": None,
        "condition_label": "used",
        "price": 80.00,
        "pickup_area": "other",
        "residential_college": None,
        "image": None,
        "reports": ["counterfeit"],
    },
    {
        "title": "MacBook urgent bank transfer only",
        "description": "Too good price, urgent cash, no receipt, bank transfer only before pickup.",
        "category": "electronics",
        "item_name": "laptop",
        "brand": "Apple",
        "model": "MacBook",
        "condition_label": "unknown",
        "price": 650.00,
        "pickup_area": "other",
        "residential_college": None,
        "image": None,
        "reports": ["suspicious_price"],
    },
    {
        "title": "Fake AirPods no receipt",
        "description": "Fake AirPods, no receipt and no warranty. Seller says fast deal only.",
        "category": "electronics",
        "item_name": "earbuds",
        "brand": "Apple",
        "model": "AirPods",
        "condition_label": "unknown",
        "price": 70.00,
        "pickup_area": "other",
        "residential_college": None,
        "image": None,
        "reports": ["prohibited"],
    },
    {
        "title": "Locked iPad very cheap",
        "description": "iCloud locked iPad, password unavailable, no receipt. Selling cheap for urgent cash.",
        "category": "electronics",
        "item_name": "tablet",
        "brand": "Apple",
        "model": "iPad",
        "condition_label": "locked",
        "price": 180.00,
        "pickup_area": "other",
        "residential_college": None,
        "image": None,
        "reports": ["locked_device"],
    },
]

WANTED_POSTS = [
    {
        "title": "Looking for Casio calculator near FSKTM",
        "description": "Need a scientific calculator for exams, preferably Casio and can meet at FSKTM.",
        "category": "electronics",
        "desired_item_name": "scientific calculator",
        "max_budget": 60.00,
        "preferred_pickup_area": "FSKTM",
        "residential_college": "KK12",
    },
    {
        "title": "Need rice cooker in KK",
        "description": "Urgent: looking for a small rice cooker for hostel use this week. Budget around RM55.",
        "category": "small_appliances",
        "desired_item_name": "rice cooker",
        "max_budget": 55.00,
        "preferred_pickup_area": "KK",
        "residential_college": "KK7",
    },
    {
        "title": "Want data structures book",
        "description": "Need data structures textbook for next semester, can collect at library.",
        "category": "textbooks",
        "desired_item_name": "data structures textbook",
        "max_budget": 45.00,
        "preferred_pickup_area": "library",
        "residential_college": "KK2",
    },
    {
        "title": "Looking for study lamp",
        "description": "Need a desk or study lamp for room, pickup in KK preferred.",
        "category": "dorm_essentials",
        "desired_item_name": "study lamp",
        "max_budget": 40.00,
        "preferred_pickup_area": "KK",
        "residential_college": "KK4",
    },
    {
        "title": "Mini fridge wanted in KK",
        "description": "Looking for a working mini fridge for hostel room. Can collect from KK this weekend.",
        "category": "small_appliances",
        "desired_item_name": "mini fridge",
        "max_budget": 170.00,
        "preferred_pickup_area": "KK",
        "residential_college": "KK10",
    },
    {
        "title": "Need cheap monitor",
        "description": "Searching for a 24 inch monitor for coding and assignments, faculty pickup preferred.",
        "category": "electronics",
        "desired_item_name": "monitor",
        "max_budget": 220.00,
        "preferred_pickup_area": "faculty_pickup",
        "residential_college": "KK9",
    },
    {
        "title": "Dorm storage box wanted",
        "description": "Need a storage box or organizer before move-in week.",
        "category": "dorm_essentials",
        "desired_item_name": "storage box",
        "max_budget": 25.00,
        "preferred_pickup_area": "KK",
        "residential_college": "KK1",
    },
    {
        "title": "Accounting textbook wanted",
        "description": "Looking for a used accounting textbook in readable condition.",
        "category": "textbooks",
        "desired_item_name": "accounting textbook",
        "max_budget": 38.00,
        "preferred_pickup_area": "library",
        "residential_college": "KK3",
    },
    {
        "title": "Desk fan wanted in KK",
        "description": "Need a small fan ASAP for dorm desk, KK pickup is best.",
        "category": "dorm_essentials",
        "desired_item_name": "desk fan",
        "max_budget": 30.00,
        "preferred_pickup_area": "KK",
        "residential_college": "KK5",
    },
    {
        "title": "Electric kettle wanted",
        "description": "Looking for a clean electric kettle for hostel pantry.",
        "category": "small_appliances",
        "desired_item_name": "electric kettle",
        "max_budget": 35.00,
        "preferred_pickup_area": "KK",
        "residential_college": "KK8",
    },
    {
        "title": "Intro economics textbook needed",
        "description": "Need economics textbook before tutorial starts next week.",
        "category": "textbooks",
        "desired_item_name": "economics textbook",
        "max_budget": 40.00,
        "preferred_pickup_area": "library",
        "residential_college": "KK6",
    },
    {
        "title": "Headphones wanted for study",
        "description": "Need working headphones, original preferred, no replica items.",
        "category": "electronics",
        "desired_item_name": "headphones",
        "max_budget": 90.00,
        "preferred_pickup_area": "FSKTM",
        "residential_college": "KK11",
    },
]

HISTORICAL_SALES = [
    ("scientific calculator", "electronics", "good", 48, "FSKTM", "KK12", "Casio calculator sold before exam week"),
    ("scientific calculator", "electronics", "like new", 62, "FSKTM", "KK12", "Casio model with box"),
    ("scientific calculator", "electronics", "fair", 40, "library", "KK2", "Older Casio calculator"),
    ("monitor", "electronics", "good", 210, "faculty_pickup", "KK9", "24 inch monitor with HDMI"),
    ("monitor", "electronics", "good", 230, "faculty_pickup", "KK9", "Dell 24 inch monitor"),
    ("monitor", "electronics", "fair", 180, "other", "KK5", "Older monitor"),
    ("headphones", "electronics", "good", 85, "FSKTM", "KK11", "Original wired headphones"),
    ("phone", "electronics", "good", 520, "other", None, "Older smartphone with receipt"),
    ("rice cooker", "small_appliances", "good", 45, "KK", "KK7", "Compact rice cooker"),
    ("rice cooker", "small_appliances", "like new", 58, "KK", "KK8", "Small rice cooker barely used"),
    ("rice cooker", "small_appliances", "fair", 35, "KK", "KK3", "Older rice cooker"),
    ("mini fridge", "small_appliances", "good", 165, "KK", "KK10", "50L mini fridge"),
    ("mini fridge", "small_appliances", "fair", 135, "KK", "KK10", "Mini fridge with cosmetic wear"),
    ("electric kettle", "small_appliances", "good", 30, "KK", "KK8", "Clean electric kettle"),
    ("data structures textbook", "textbooks", "good", 38, "library", "KK2", "Used textbook with highlights"),
    ("data structures textbook", "textbooks", "like new", 52, "library", "KK2", "Clean copy"),
    ("accounting textbook", "textbooks", "good", 34, "library", "KK3", "Accounting textbook"),
    ("economics textbook", "textbooks", "good", 36, "library", "KK6", "Economics textbook"),
    ("study lamp", "dorm_essentials", "good", 28, "KK", "KK4", "LED desk lamp"),
    ("study lamp", "dorm_essentials", "like new", 36, "KK", "KK4", "Foldable lamp"),
    ("storage box", "dorm_essentials", "good", 20, "KK", "KK1", "Large storage box"),
    ("desk fan", "dorm_essentials", "good", 26, "KK", "KK5", "Small desk fan"),
    ("desk fan", "dorm_essentials", "fair", 18, "KK", "KK5", "Older fan"),
    ("mattress topper", "dorm_essentials", "good", 55, "KK", "KK7", "Dorm mattress topper"),
]


def main() -> None:
    db = SessionLocal()
    try:
        demo_user = get_or_create_demo_user(db)
        created_listings = 0
        created_images = 0
        created_wanted_posts = 0
        created_historical_sales = 0
        created_reports = 0

        for item in LISTINGS:
            image = item.get("image")
            reports = item.get("reports", [])
            values = {key: value for key, value in item.items() if key not in {"image", "reports"}}
            listing = db.scalar(select(Listing).where(Listing.title == item["title"]))
            if listing is None:
                listing = Listing(seller_id=demo_user.id, currency="MYR", status="active", **values)
                db.add(listing)
                db.flush()
                created_listings += 1

            if image:
                existing_image = db.scalar(
                    select(ListingImage).where(
                        ListingImage.listing_id == listing.id,
                        ListingImage.storage_path == image,
                    )
                )
                if existing_image is None:
                    db.add(ListingImage(listing_id=listing.id, storage_path=image, sort_order=0, is_primary=True))
                    created_images += 1

            for report_type in reports:
                existing_report = db.scalar(
                    select(ListingReport).where(
                        ListingReport.listing_id == listing.id,
                        ListingReport.report_type == report_type,
                    )
                )
                if existing_report is None:
                    db.add(
                        ListingReport(
                            listing_id=listing.id,
                            report_type=report_type,
                            reason="Seeded suspicious demo scenario.",
                        )
                    )
                    created_reports += 1

        for item in WANTED_POSTS:
            exists = db.scalar(select(WantedPost).where(WantedPost.title == item["title"]))
            if exists is None:
                db.add(WantedPost(buyer_id=demo_user.id, currency="MYR", status="active", **item))
                created_wanted_posts += 1

        for index, (item_name, category, condition, price, location, college, notes) in enumerate(HISTORICAL_SALES):
            exists = db.scalar(
                select(HistoricalSale).where(
                    HistoricalSale.item_name == item_name,
                    HistoricalSale.category == category,
                    HistoricalSale.sold_price == price,
                    HistoricalSale.notes == notes,
                )
            )
            if exists is None:
                db.add(
                    HistoricalSale(
                        item_name=item_name,
                        category=category,
                        condition_label=condition,
                        sold_price=price,
                        currency="MYR",
                        location=location,
                        residential_college=college,
                        sold_at=now - timedelta(days=index + 2),
                        notes=notes,
                        source_type="seed_demo",
                    )
                )
                created_historical_sales += 1

        db.commit()
        print(f"Seeded demo user {demo_user.id}")
        print(f"Created {created_listings} listing(s)")
        print(f"Created {created_images} listing image(s)")
        print(f"Created {created_wanted_posts} wanted post(s)")
        print(f"Created {created_historical_sales} historical sale(s)")
        print(f"Created {created_reports} listing report(s)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
