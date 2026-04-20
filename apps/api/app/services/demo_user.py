from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import AppRole, Profile, User


DEMO_USER_ID = "00000000-0000-4000-8000-000000000001"
DEMO_USER_EMAIL = "demo@um.local"
DEMO_USERNAME = "demo_user"


def get_or_create_demo_user(db: Session) -> User:
    stmt = select(User).options(selectinload(User.profile)).where(User.id == DEMO_USER_ID)
    user = db.scalar(stmt)

    if user is None:
        user = User(
            id=DEMO_USER_ID,
            email=DEMO_USER_EMAIL,
            username=DEMO_USERNAME,
            status="active",
        )
        user.profile = Profile(app_role=AppRole.STUDENT)
        db.add(user)
        db.commit()
        return db.scalar(stmt) or user

    changed = False
    if user.email != DEMO_USER_EMAIL:
        user.email = DEMO_USER_EMAIL
        changed = True
    if user.username != DEMO_USERNAME:
        user.username = DEMO_USERNAME
        changed = True
    if user.status != "active":
        user.status = "active"
        changed = True
    if user.profile is None:
        user.profile = Profile(app_role=AppRole.STUDENT)
        changed = True

    if changed:
        db.add(user)
        db.commit()
        return db.scalar(stmt) or user

    return user
