import os

from celery import Celery


celery_app = Celery(
    "um_nexus_api_tasks",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
)

celery_app.conf.task_always_eager = os.getenv("CELERY_TASK_ALWAYS_EAGER", "true").lower() == "true"
celery_app.conf.task_eager_propagates = True
celery_app.conf.imports = ("app.tasks.trade_tasks", "app.tasks.trade_intelligence_tasks")
celery_app.conf.beat_schedule = {
    "expire-stale-trade-contact-requests-hourly": {
        "task": "trade.expire_stale_contact_requests",
        "schedule": 60 * 60,
    },
}
