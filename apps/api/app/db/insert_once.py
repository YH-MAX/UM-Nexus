from typing import Any

from sqlalchemy import Table
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session


def insert_once(
    db: Session,
    table: Table,
    values: dict[str, Any],
    *,
    conflict_columns: tuple[str, ...],
) -> bool:
    """Insert atomically, ignoring only the specified uniqueness conflict.

    PostgreSQL is used in production; SQLite supports local development/tests.
    The caller owns the transaction, including any related writes.
    """
    dialect = db.get_bind().dialect.name
    if dialect == "postgresql":
        insert = postgres_insert
    elif dialect == "sqlite":
        insert = sqlite_insert
    else:
        raise NotImplementedError(f"Conflict-safe inserts are not configured for {dialect}")

    statement = (
        insert(table)
        .values(**values)
        .on_conflict_do_nothing(index_elements=list(conflict_columns))
        .returning(*table.primary_key.columns)
    )
    return db.execute(statement).first() is not None
