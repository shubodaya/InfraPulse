from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Response
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AlertEvent, CheckResult, Monitor, Outage
from app.routers.outages import outage_to_read
from app.schemas import AlertRead, MonitorAvailability, ReportPeriod, SummaryReport
from app.services.report_generator import generate_markdown_report
from app.services.sla_calculator import calculate_monitor_sla

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _alert_to_read(alert: AlertEvent) -> AlertRead:
    return AlertRead(
        id=alert.id,
        monitor_id=alert.monitor_id,
        outage_id=alert.outage_id,
        monitor_name=alert.monitor.name if alert.monitor else None,
        timestamp=alert.timestamp,
        alert_type=alert.alert_type,
        severity=alert.severity,
        title=alert.title,
        message=alert.message,
        channel=alert.channel,
        delivered=alert.delivered,
    )


def _current_status_counts(db: Session) -> dict[str, int]:
    counts = {"up": 0, "degraded": 0, "down": 0, "unknown": 0}
    monitors = db.scalars(select(Monitor)).all()
    for monitor in monitors:
        latest = db.scalar(
            select(CheckResult)
            .where(CheckResult.monitor_id == monitor.id)
            .order_by(desc(CheckResult.timestamp))
            .limit(1)
        )
        counts[latest.status if latest else "unknown"] += 1
    return counts


def _period_report(db: Session, label: str, since: datetime, until: datetime) -> ReportPeriod:
    monitors = db.scalars(select(Monitor).order_by(Monitor.name)).all()
    metrics = [calculate_monitor_sla(db, monitor, since, until) for monitor in monitors]
    overall = sum(item.availability_percent for item in metrics) / len(metrics) if metrics else 100.0
    active_outages = db.scalar(select(func.count()).select_from(Outage).where(Outage.status == "active")) or 0
    return ReportPeriod(
        period=label,
        since=since,
        until=until,
        overall_availability_percent=round(overall, 3),
        active_outages=active_outages,
        monitor_count=len(monitors),
        monitors=[MonitorAvailability(**item.__dict__) for item in metrics],
    )


@router.get("/summary", response_model=SummaryReport)
def summary_report(db: Session = Depends(get_db)) -> SummaryReport:
    now = datetime.utcnow()
    counts = _current_status_counts(db)
    periods = [
        _period_report(db, "24h", now - timedelta(hours=24), now),
        _period_report(db, "7d", now - timedelta(days=7), now),
        _period_report(db, "30d", now - timedelta(days=30), now),
    ]
    recent_outages = db.scalars(select(Outage).order_by(desc(Outage.started_at)).limit(8)).all()
    recent_alerts = db.scalars(select(AlertEvent).order_by(desc(AlertEvent.timestamp)).limit(10)).all()
    active_outages = db.scalar(select(func.count()).select_from(Outage).where(Outage.status == "active")) or 0
    monitor_count = db.scalar(select(func.count()).select_from(Monitor)) or 0
    return SummaryReport(
        generated_at=now,
        total_monitors=monitor_count,
        up=counts["up"],
        degraded=counts["degraded"],
        down=counts["down"],
        unknown=counts["unknown"],
        active_outages=active_outages,
        overall_availability_percent=periods[2].overall_availability_percent,
        recent_outages=[outage_to_read(outage) for outage in recent_outages],
        recent_alerts=[_alert_to_read(alert) for alert in recent_alerts],
        periods=periods,
    )


@router.get("/availability", response_model=list[ReportPeriod])
def availability_report(db: Session = Depends(get_db)) -> list[ReportPeriod]:
    now = datetime.utcnow()
    return [
        _period_report(db, "24h", now - timedelta(hours=24), now),
        _period_report(db, "7d", now - timedelta(days=7), now),
        _period_report(db, "30d", now - timedelta(days=30), now),
    ]


@router.get("/alerts", response_model=list[AlertRead])
def alert_history(db: Session = Depends(get_db)) -> list[AlertRead]:
    alerts = db.scalars(select(AlertEvent).order_by(desc(AlertEvent.timestamp)).limit(100)).all()
    return [_alert_to_read(alert) for alert in alerts]


@router.get("/availability/download")
def download_availability_report(db: Session = Depends(get_db)) -> Response:
    content = generate_markdown_report(db)
    return Response(
        content=content,
        media_type="text/markdown",
        headers={"Content-Disposition": 'attachment; filename="infrapulse-availability-report.md"'},
    )

