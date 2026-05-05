from __future__ import annotations

import argparse
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import AdminAction, AppRole, Profile, User


def main() -> None:
    parser = argparse.ArgumentParser(description="Promote an existing UM Nexus user to admin or moderator.")
    parser.add_argument("email", help="Email address of the already-synced user.")
    parser.add_argument("--role", choices=["admin", "moderator"], default="admin")
    parser.add_argument("--reason", default="Initial production bootstrap.")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == args.email.strip().lower()))
        if user is None:
            raise SystemExit(
                "User not found. Sign in once with this UM email, then rerun the bootstrap command."
            )

        if user.profile is None:
            user.profile = Profile(app_role=AppRole.STUDENT)

        user.profile.app_role = AppRole(args.role)
        db.add(user)
        db.flush()
        db.add(
            AdminAction(
                admin_id=user.id,
                target_type="user",
                target_id=user.id,
                action_type="change_user_role",
                reason=args.reason,
            )
        )
        db.commit()
        print(f"{user.email} is now {args.role}.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
