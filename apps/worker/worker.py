import os
from pathlib import Path
import sys

from celery import Celery


API_ROOT = Path(__file__).resolve().parents[1] / "api"
if str(API_ROOT) not in sys.path:
    sys.path.append(str(API_ROOT))

celery_app = Celery(
    "um_nexus_worker",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    include=["app.tasks.trade_intelligence_tasks"],
)
