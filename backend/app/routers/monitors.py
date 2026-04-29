from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CheckResult, Monitor, Outage
from app.schemas import CheckResultRead, MonitorCreate, MonitorRead, MonitorUpdate
from app.services.monitor_runner import run_monitor_check, schedule_all_monitors
from app.services.sla_calculator import calculate_monitor_sla

router = APIRouter(prefix="/api/monitors", tags=["monitors"])


def monitor_to_read(db: Session, monitor: Monitor) -> MonitorRead:
    latest = db.scalar(
        select(CheckResult).where(CheckResult.monitor_id == monitor.id).order_by(desc(CheckResult.timestamp))
    )
    active_outage = db.scalar(
        select(Outage).where(Outage.monitor_id == monitor.id, Outage.status == "active").limit(1)
    )
    metrics = calculate_monitor_sla(db, monitor, datetime.utcnow() - timedelta(hours=24))
    return MonitorRead(
        id=monitor.id,
        name=monitor.name,
        target=monitor.target,
        monitor_type=monitor.monitor_type,
        interval_seconds=monitor.interval_seconds,
        timeout_seconds=monitor.timeout_seconds,
        expected_status_code=monitor.expected_status_code,
        expected_dns_result=monitor.expected_dns_result,
        enabled=monitor.enabled,
        tags=monitor.tags or [],
        created_at=monitor.created_at,
        updated_at=monitor.updated_at,
        current_status=latest.status if latest else "unknown",
        last_checked_at=latest.timestamp if latest else None,
        last_response_time_ms=latest.response_time_ms if latest else None,
        active_outage=active_outage is not None,
        availability_24h=metrics.availability_percent,
    )


@router.get("", response_model=list[MonitorRead])
def list_monitors(db: Session = Depends(get_db)) -> list[MonitorRead]:
    monitors = db.scalars(select(Monitor).order_by(Monitor.name)).all()
    return [monitor_to_read(db, monitor) for monitor in monitors]


@router.post("", response_model=MonitorRead, status_code=status.HTTP_201_CREATED)
def create_monitor(payload: MonitorCreate, db: Session = Depends(get_db)) -> MonitorRead:
    monitor = Monitor(**payload.model_dump())
    db.add(monitor)
    db.commit()
    db.refresh(monitor)
    schedule_all_monitors()
    return monitor_to_read(db, monitor)


@router.get("/{monitor_id}", response_model=MonitorRead)
def get_monitor(monitor_id: int, db: Session = Depends(get_db)) -> MonitorRead:
    monitor = db.get(Monitor, monitor_id)
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    return monitor_to_read(db, monitor)


@router.put("/{monitor_id}", response_model=MonitorRead)
def update_monitor(monitor_id: int, payload: MonitorUpdate, db: Session = Depends(get_db)) -> MonitorRead:
    monitor = db.get(Monitor, monitor_id)
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(monitor, field, value)
    monitor.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(monitor)
    schedule_all_monitors()
    return monitor_to_read(db, monitor)


@router.delete("/{monitor_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_monitor(monitor_id: int, db: Session = Depends(get_db)) -> Response:
    monitor = db.get(Monitor, monitor_id)
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    db.delete(monitor)
    db.commit()
    schedule_all_monitors()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{monitor_id}/check-now", response_model=CheckResultRead)
async def check_now(monitor_id: int, db: Session = Depends(get_db)) -> CheckResult:
    monitor = db.get(Monitor, monitor_id)
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    return await run_monitor_check(db, monitor)


@router.get("/{monitor_id}/checks", response_model=list[CheckResultRead])
def get_monitor_checks(
    monitor_id: int,
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
) -> list[CheckResult]:
    monitor = db.get(Monitor, monitor_id)
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    return db.scalars(
        select(CheckResult)
        .where(CheckResult.monitor_id == monitor_id)
        .order_by(desc(CheckResult.timestamp))
        .limit(limit)
    ).all()
