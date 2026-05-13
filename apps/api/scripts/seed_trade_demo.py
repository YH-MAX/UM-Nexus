from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import (
    AppRole,
    HistoricalSale,
    Listing,
    ListingFavorite,
    ListingImage,
    ListingReport,
    Notification,
    Profile,
    TradeContactRequest,
    User,
    WantedPost,
)
from app.services.demo_user import get_or_create_demo_user


now = datetime.now(UTC)

SEED_USERS = [
    {
        "id": "00000000-0000-4000-8000-000000000010",
        "email": "buyer.seed@siswa.um.edu.my",
        "username": "buyer_seed",
        "display_name": "Aina",
        "faculty": "Faculty of Computer Science and Information Technology",
        "college_or_location": "kk12",
        "contact_preference": "telegram",
        "contact_value": "@aina_um",
    },
    {
        "id": "00000000-0000-4000-8000-000000000020",
        "email": "moderator.seed@siswa.um.edu.my",
        "username": "moderator_seed",
        "display_name": "UM Trade Moderator",
        "faculty": "Student Affairs",
        "college_or_location": "um_sentral",
        "contact_preference": "telegram",
        "contact_value": "@um_trade_mod",
        "app_role": AppRole.MODERATOR,
    },
]

CATEGORY_ALIASES = {
    "textbooks": "textbooks_notes",
    "small_appliances": "kitchen_appliances",
    "dorm_essentials": "dorm_room",
}

PICKUP_ALIASES = {
    "FSKTM": "fsktm",
    "KK": "kk1",
    "library": "main_library",
    "faculty_pickup": "faculty_area",
}

CONDITION_ALIASES = {
    "like new": "like_new",
    "used": "fair",
    "unknown": "poor",
    "locked": "poor",
}

REPORT_ALIASES = {
    "suspicious_payment": "unsafe_transaction",
    "suspicious_price": "scam_suspicion",
    "counterfeit": "prohibited_item",
    "prohibited": "prohibited_item",
    "locked_device": "scam_suspicion",
}

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
        ensure_demo_profile(demo_user)
        seed_users = [get_or_create_seed_user(db, values) for values in SEED_USERS]
        buyer_user = seed_users[0]
        created_listings = 0
        created_images = 0
        created_wanted_posts = 0
        created_historical_sales = 0
        created_reports = 0
        created_contact_requests = 0
        created_favorites = 0
        created_notifications = 0

        for item in LISTINGS:
            image = item.get("image")
            reports = item.get("reports", [])
            values = normalize_listing_values({key: value for key, value in item.items() if key not in {"image", "reports"}})
            listing = db.scalar(select(Listing).where(Listing.title == item["title"]))
            if listing is None:
                listing = Listing(seller_id=demo_user.id, currency="MYR", status="available", **values)
                db.add(listing)
                db.flush()
                created_listings += 1
            else:
                for key, value in values.items():
                    setattr(listing, key, value)
                if listing.status in {"active", "open", "closed", "removed"}:
                    listing.status = "available" if listing.status in {"active", "open"} else "sold"
                db.add(listing)

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
                normalized_report_type = REPORT_ALIASES.get(report_type, report_type)
                existing_report = db.scalar(
                    select(ListingReport).where(
                        ListingReport.listing_id == listing.id,
                        ListingReport.report_type == normalized_report_type,
                    )
                )
                if existing_report is None:
                    db.add(
                        ListingReport(
                            listing_id=listing.id,
                            reporter_user_id=buyer_user.id,
                            report_type=normalized_report_type,
                            reason="Seeded suspicious demo scenario.",
                            status="pending",
                        )
                    )
                    created_reports += 1

        for item in WANTED_POSTS:
            exists = db.scalar(select(WantedPost).where(WantedPost.title == item["title"]))
            if exists is None:
                db.add(WantedPost(buyer_id=buyer_user.id, currency="MYR", status="active", **normalize_wanted_values(item)))
                created_wanted_posts += 1

        for index, (item_name, category, condition, price, location, college, notes) in enumerate(HISTORICAL_SALES):
            normalized_category = normalize_category(category)
            normalized_condition = normalize_condition(condition)
            normalized_location = normalize_pickup(location)
            exists = db.scalar(
                select(HistoricalSale).where(
                    HistoricalSale.item_name == item_name,
                    HistoricalSale.category == normalized_category,
                    HistoricalSale.sold_price == price,
                    HistoricalSale.notes == notes,
                )
            )
            if exists is None:
                db.add(
                    HistoricalSale(
                        item_name=item_name,
                        category=normalized_category,
                        condition_label=normalized_condition,
                        sold_price=price,
                        currency="MYR",
                        location=normalized_location,
                        residential_college=college,
                        sold_at=now - timedelta(days=index + 2),
                        notes=notes,
                        source_type="seed_demo",
                    )
                )
                created_historical_sales += 1

        sample_listings = db.scalars(select(Listing).order_by(Listing.created_at).limit(3)).all()
        for listing in sample_listings[:2]:
            favorite_exists = db.scalar(
                select(ListingFavorite).where(
                    ListingFavorite.user_id == buyer_user.id,
                    ListingFavorite.listing_id == listing.id,
                )
            )
            if favorite_exists is None:
                db.add(ListingFavorite(user_id=buyer_user.id, listing_id=listing.id))
                created_favorites += 1

        for listing in sample_listings[:2]:
            request_exists = db.scalar(
                select(TradeContactRequest).where(
                    TradeContactRequest.buyer_id == buyer_user.id,
                    TradeContactRequest.listing_id == listing.id,
                )
            )
            if request_exists is None:
                db.add(
                    TradeContactRequest(
                        listing_id=listing.id,
                        buyer_id=buyer_user.id,
                        seller_id=listing.seller_id,
                        message="Hi, I am interested in this item. Can meet on campus this week?",
                        buyer_contact_method="telegram",
                        buyer_contact_value="@aina_um",
                        status="pending",
                    )
                )
                created_contact_requests += 1

        notification_exists = db.scalar(
            select(Notification).where(
                Notification.user_id == demo_user.id,
                Notification.type == "seed_demo_ready",
            )
        )
        if notification_exists is None:
            db.add(
                Notification(
                    user_id=demo_user.id,
                    type="seed_demo_ready",
                    title="Demo marketplace is ready",
                    body="Seed listings, favorites, contact requests, and reports are available for product QA.",
                    action_url="/trade/dashboard",
                    entity_type="listing",
                    entity_id=sample_listings[0].id if sample_listings else None,
                )
            )
            created_notifications += 1

        db.commit()
        print(f"Seeded demo user {demo_user.id}")
        print(f"Seeded {len(seed_users)} extra user(s)")
        print(f"Created {created_listings} listing(s)")
        print(f"Created {created_images} listing image(s)")
        print(f"Created {created_wanted_posts} wanted post(s)")
        print(f"Created {created_historical_sales} historical sale(s)")
        print(f"Created {created_reports} listing report(s)")
        print(f"Created {created_contact_requests} contact request(s)")
        print(f"Created {created_favorites} favorite(s)")
        print(f"Created {created_notifications} notification(s)")
    finally:
        db.close()


def get_or_create_seed_user(db, values: dict) -> User:
    user = db.scalar(select(User).where(User.id == values["id"]))
    if user is None:
        user = User(id=values["id"], email=values["email"], username=values["username"], status="active")
        user.profile = Profile(
            full_name=values["display_name"],
            display_name=values["display_name"],
            faculty=values["faculty"],
            residential_college=values["college_or_location"],
            college_or_location=values["college_or_location"],
            contact_preference=values["contact_preference"],
            contact_value=values["contact_value"],
            verified_um_email=True,
            app_role=values.get("app_role", AppRole.STUDENT),
        )
        db.add(user)
        db.flush()
        return user

    if user.profile is None:
        user.profile = Profile(app_role=values.get("app_role", AppRole.STUDENT))
    user.email = values["email"]
    user.username = values["username"]
    user.status = "active"
    user.profile.full_name = values["display_name"]
    user.profile.display_name = values["display_name"]
    user.profile.faculty = values["faculty"]
    user.profile.residential_college = values["college_or_location"]
    user.profile.college_or_location = values["college_or_location"]
    user.profile.contact_preference = values["contact_preference"]
    user.profile.contact_value = values["contact_value"]
    user.profile.verified_um_email = True
    user.profile.app_role = values.get("app_role", user.profile.app_role)
    db.add(user)
    db.flush()
    return user


def ensure_demo_profile(user: User) -> None:
    if user.profile is None:
        user.profile = Profile(app_role=AppRole.STUDENT)
    user.profile.full_name = "Demo Seller"
    user.profile.display_name = "Demo Seller"
    user.profile.faculty = "Faculty of Business and Economics"
    user.profile.residential_college = "kk12"
    user.profile.college_or_location = "kk12"
    user.profile.contact_preference = "telegram"
    user.profile.contact_value = "@demo_seller_um"
    user.profile.verified_um_email = True


def normalize_listing_values(values: dict) -> dict:
    values["category"] = normalize_category(values["category"])
    values["condition_label"] = normalize_condition(values.get("condition_label"))
    pickup = normalize_pickup(values.get("pickup_area"))
    values["pickup_area"] = pickup
    values["pickup_location"] = pickup
    values["contact_method"] = values.get("contact_method") or "in_app"
    return values


def normalize_wanted_values(values: dict) -> dict:
    next_values = dict(values)
    next_values["category"] = normalize_category(next_values["category"])
    next_values["preferred_pickup_area"] = normalize_pickup(next_values.get("preferred_pickup_area"))
    return next_values


def normalize_category(value: str | None) -> str:
    if value is None:
        return "others"
    return CATEGORY_ALIASES.get(value, value)


def normalize_pickup(value: str | None) -> str:
    if value is None:
        return "other"
    return PICKUP_ALIASES.get(value, value)


def normalize_condition(value: str | None) -> str:
    if value is None:
        return "good"
    return CONDITION_ALIASES.get(value, value)


if __name__ == "__main__":
    main()
