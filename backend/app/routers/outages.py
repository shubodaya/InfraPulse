from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Outage
from app.schemas import OutageRead

router = APIRouter(prefix="/api/outages", tags=["outages"])


def outage_to_read(outage: Outage) -> OutageRead:
    return OutageRead(
        id=outage.id,
        monitor_id=outage.monitor_id,
        monitor_name=outage.monitor.name if outage.monitor else None,
        monitor_target=outage.monitor.target if outage.monitor else None,
        started_at=outage.started_at,
        ended_at=outage.ended_at,
        duration_seconds=outage.duration_seconds,
        severity=outage.severity,
        status=outage.status,
        root_cause_hint=outage.root_cause_hint,
        failed_check_count=outage.failed_check_count,
    )


@router.get("", response_model=list[OutageRead])
def list_outages(
    monitor_id: int | None = None,
    severity: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    active: bool | None = None,
    db: Session = Depends(get_db),
) -> list[OutageRead]:
    query = select(Outage)
    if monitor_id is not None:
        query = query.where(Outage.monitor_id == monitor_id)
    if severity:
        query = query.where(Outage.severity == severity)
    if status_filter:
        query = query.where(Outage.status == status_filter)
    if active is not None:
        query = query.where(Outage.status == ("active" if active else "resolved"))
    outages = db.scalars(query.order_by(desc(Outage.started_at))).all()
    return [outage_to_read(outage) for outage in outages]

