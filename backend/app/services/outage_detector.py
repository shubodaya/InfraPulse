from __future__ import annotations

from datetime import datetime

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models import CheckResult, Monitor, Outage
from app.services.alert_engine import create_alert


FAILED_STATUSES = {"down", "degraded"}


def root_cause_hint(monitor: Monitor, result: CheckResult) -> str:
    if result.error_message:
        return result.error_message[:500]
    hints = {
        "http": "HTTP endpoint returned an unexpected status or did not respond.",
        "dns": "DNS resolution failed or returned an unexpected answer.",
        "tcp": "TCP connection attempt failed; check service listener, firewall, or route.",
        "icmp": "ICMP echo failed; check reachability, host firewall, or ICMP permissions.",
    }
    return hints.get(monitor.monitor_type, "Investigation required")


def important_monitor(monitor: Monitor) -> bool:
    important_tags = {"critical", "core", "firewall", "vpn", "router", "production"}
    return bool(set(tag.lower() for tag in (monitor.tags or [])) & important_tags)


def calculate_severity(monitor: Monitor, failed_count: int, duration_seconds: float) -> str:
    if important_monitor(monitor) and duration_seconds >= 3600:
        return "critical"
    if failed_count >= 5 or duration_seconds >= 1800:
        return "high"
    if failed_count >= 2 or duration_seconds >= 300:
        return "medium"
    return "low"


def consecutive_failures(db: Session, monitor_id: int, limit: int = 20) -> int:
    recent = db.scalars(
        select(CheckResult)
        .where(CheckResult.monitor_id == monitor_id)
        .order_by(desc(CheckResult.timestamp))
        .limit(limit)
    ).all()
    count = 0
    for result in recent:
        if result.status in FAILED_STATUSES:
            count += 1
        else:
            break
    return count


async def evaluate_outage(db: Session, monitor: Monitor, result: CheckResult) -> Outage | None:
    active_outage = db.scalar(
        select(Outage)
        .where(Outage.monitor_id == monitor.id, Outage.status == "active")
        .order_by(desc(Outage.started_at))
    )

    if result.status == "up":
        if not active_outage:
            return None
        ended_at = result.timestamp or datetime.utcnow()
        active_outage.ended_at = ended_at
        active_outage.duration_seconds = max(
            0.0, (ended_at - active_outage.started_at).total_seconds()
        )
        active_outage.status = "resolved"
        active_outage.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(active_outage)
        await create_alert(
            db,
            monitor,
            "outage_resolved",
            "info",
            f"{monitor.name} recovered",
            f"{monitor.name} recovered after {round(active_outage.duration_seconds / 60, 1)} minutes.",
            active_outage,
        )
        return active_outage

    if result.status not in FAILED_STATUSES:
        return active_outage

    failed_count = consecutive_failures(db, monitor.id)
    if active_outage:
        now = result.timestamp or datetime.utcnow()
        duration = max(0.0, (now - active_outage.started_at).total_seconds())
        previous_severity = active_outage.severity
        active_outage.failed_check_count = max(active_outage.failed_check_count, failed_count)
        active_outage.duration_seconds = duration
        active_outage.root_cause_hint = root_cause_hint(monitor, result)
        active_outage.severity = calculate_severity(monitor, failed_count, duration)
        active_outage.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(active_outage)
        if active_outage.severity != previous_severity:
            await create_alert(
                db,
                monitor,
                "severity_changed",
                active_outage.severity,
                f"{monitor.name} outage escalated to {active_outage.severity}",
                active_outage.root_cause_hint,
                active_outage,
            )
        return active_outage

    started_at = result.timestamp or datetime.utcnow()
    outage = Outage(
        monitor_id=monitor.id,
        started_at=started_at,
        status="active",
        severity=calculate_severity(monitor, failed_count, 0),
        failed_check_count=max(1, failed_count),
        root_cause_hint=root_cause_hint(monitor, result),
    )
    db.add(outage)
    db.commit()
    db.refresh(outage)
    await create_alert(
        db,
        monitor,
        "outage_started",
        outage.severity,
        f"{monitor.name} is {result.status}",
        outage.root_cause_hint,
        outage,
    )
    return outage

