from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models import CheckResult, Monitor, Outage


@dataclass
class AvailabilityMetrics:
    monitor_id: int
    name: str
    target: str
    monitor_type: str
    availability_percent: float
    average_latency_ms: float | None
    outage_count: int
    total_downtime_seconds: float
    total_checks: int
    up_checks: int
    degraded_checks: int
    down_checks: int
    current_status: str


def period_start(period: str, now: datetime | None = None) -> datetime:
    now = now or datetime.utcnow()
    mapping = {
        "24h": timedelta(hours=24),
        "7d": timedelta(days=7),
        "30d": timedelta(days=30),
    }
    return now - mapping.get(period, timedelta(days=30))


def _overlap_seconds(start: datetime, end: datetime, since: datetime, until: datetime) -> float:
    overlap_start = max(start, since)
    overlap_end = min(end, until)
    if overlap_end <= overlap_start:
        return 0.0
    return (overlap_end - overlap_start).total_seconds()


def calculate_monitor_sla(
    db: Session, monitor: Monitor, since: datetime, until: datetime | None = None
) -> AvailabilityMetrics:
    until = until or datetime.utcnow()
    checks = db.scalars(
        select(CheckResult)
        .where(
            CheckResult.monitor_id == monitor.id,
            CheckResult.timestamp >= since,
            CheckResult.timestamp <= until,
        )
        .order_by(CheckResult.timestamp)
    ).all()
    latest = db.scalar(
        select(CheckResult)
        .where(CheckResult.monitor_id == monitor.id)
        .order_by(desc(CheckResult.timestamp))
    )

    total_checks = len(checks)
    up_checks = sum(1 for check in checks if check.status == "up")
    degraded_checks = sum(1 for check in checks if check.status == "degraded")
    down_checks = sum(1 for check in checks if check.status == "down")
    latency_values = [check.response_time_ms for check in checks if check.response_time_ms is not None]
    average_latency = round(sum(latency_values) / len(latency_values), 2) if latency_values else None

    outages = db.scalars(
        select(Outage).where(
            Outage.monitor_id == monitor.id,
            Outage.started_at <= until,
            (Outage.ended_at.is_(None)) | (Outage.ended_at >= since),
        )
    ).all()
    total_downtime = 0.0
    for outage in outages:
        outage_end = outage.ended_at or until
        total_downtime += _overlap_seconds(outage.started_at, outage_end, since, until)

    if total_checks:
        available_units = up_checks + degraded_checks * 0.5
        availability = (available_units / total_checks) * 100
    else:
        availability = max(0.0, ((until - since).total_seconds() - total_downtime) / max(1, (until - since).total_seconds()) * 100)

    return AvailabilityMetrics(
        monitor_id=monitor.id,
        name=monitor.name,
        target=monitor.target,
        monitor_type=monitor.monitor_type,
        availability_percent=round(availability, 3),
        average_latency_ms=average_latency,
        outage_count=len(outages),
        total_downtime_seconds=round(total_downtime, 2),
        total_checks=total_checks,
        up_checks=up_checks,
        degraded_checks=degraded_checks,
        down_checks=down_checks,
        current_status=latest.status if latest else "unknown",
    )


def calculate_period(db: Session, period: str, now: datetime | None = None) -> dict:
    now = now or datetime.utcnow()
    since = period_start(period, now)
    monitors = db.scalars(select(Monitor).order_by(Monitor.name)).all()
    monitor_metrics = [calculate_monitor_sla(db, monitor, since, now) for monitor in monitors]
    if monitor_metrics:
        overall = sum(item.availability_percent for item in monitor_metrics) / len(monitor_metrics)
    else:
        overall = 100.0
    active_outages = db.scalar(select(func.count()).select_from(Outage).where(Outage.status == "active")) or 0
    return {
        "period": period,
        "since": since,
        "until": now,
        "overall_availability_percent": round(overall, 3),
        "active_outages": active_outages,
        "monitor_count": len(monitors),
        "monitors": monitor_metrics,
    }
