from __future__ import annotations

import random
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AlertEvent, CheckResult, Monitor, Outage


def _add_check(
    db: Session,
    monitor: Monitor,
    timestamp: datetime,
    status: str,
    latency: float | None,
    error: str | None = None,
    packet_loss: float | None = None,
) -> None:
    db.add(
        CheckResult(
            monitor_id=monitor.id,
            timestamp=timestamp,
            status=status,
            response_time_ms=latency,
            packet_loss_percent=packet_loss,
            error_message=error,
            check_type=monitor.monitor_type,
            raw_result=error or f"Demo {monitor.monitor_type.upper()} check completed",
        )
    )


def _add_alert(
    db: Session,
    monitor: Monitor,
    outage: Outage | None,
    timestamp: datetime,
    alert_type: str,
    severity: str,
    title: str,
    message: str,
) -> None:
    db.add(
        AlertEvent(
            monitor_id=monitor.id,
            outage_id=outage.id if outage else None,
            timestamp=timestamp,
            alert_type=alert_type,
            severity=severity,
            title=title,
            message=message,
            channel="database",
            delivered=True,
        )
    )


def seed_demo_data(db: Session) -> None:
    existing = db.scalar(select(Monitor).limit(1))
    if existing:
        return

    now = datetime.utcnow().replace(microsecond=0)
    monitors = [
        Monitor(
            name="Core Router",
            target="8.8.8.8",
            monitor_type="icmp",
            interval_seconds=300,
            timeout_seconds=3,
            tags=["core", "router", "critical"],
        ),
        Monitor(
            name="Branch Firewall",
            target="10.255.254.1:443",
            monitor_type="tcp",
            interval_seconds=120,
            timeout_seconds=3,
            tags=["branch", "firewall", "critical"],
        ),
        Monitor(
            name="DNS Resolver",
            target="cloudflare.com",
            monitor_type="dns",
            interval_seconds=300,
            timeout_seconds=4,
            tags=["dns", "internet"],
        ),
        Monitor(
            name="Corporate Website",
            target="https://example.com",
            monitor_type="http",
            expected_status_code=200,
            interval_seconds=180,
            timeout_seconds=5,
            tags=["web", "public"],
        ),
        Monitor(
            name="VPN Gateway",
            target="vpn.infrapulse.local:443",
            monitor_type="tcp",
            interval_seconds=180,
            timeout_seconds=4,
            tags=["vpn", "remote-access", "critical"],
        ),
        Monitor(
            name="Database Server TCP 5432",
            target="10.20.4.15:5432",
            monitor_type="tcp",
            interval_seconds=300,
            timeout_seconds=4,
            tags=["database", "tcp", "production"],
        ),
    ]
    db.add_all(monitors)
    db.commit()
    for monitor in monitors:
        db.refresh(monitor)

    random.seed(42)
    base_latency = {
        "Core Router": 18,
        "Branch Firewall": 42,
        "DNS Resolver": 24,
        "Corporate Website": 96,
        "VPN Gateway": 64,
        "Database Server TCP 5432": 11,
    }

    for monitor in monitors:
        start = now - timedelta(days=30)
        for step in range(30 * 12):
            timestamp = start + timedelta(hours=2 * step)
            if timestamp > now - timedelta(hours=4):
                continue
            status = "up"
            error = None
            packet_loss = 0.0 if monitor.monitor_type == "icmp" else None
            instability = random.random()
            if monitor.name == "Branch Firewall" and instability < 0.055:
                status = "down"
                error = "TCP connect failed: branch edge firewall did not accept connections"
            elif monitor.name == "Corporate Website" and instability < 0.045:
                status = "degraded"
                error = "HTTP response latency breached NOC threshold"
            elif monitor.name == "VPN Gateway" and instability < 0.04:
                status = "down"
                error = "TCP connection timed out during remote access window"
            elif monitor.name == "Database Server TCP 5432" and instability < 0.035:
                status = "degraded"
                error = "TCP handshake slow; possible database saturation"
            elif instability < 0.015:
                status = "degraded"
                error = "Intermittent packet loss detected"
                packet_loss = 15.0 if monitor.monitor_type == "icmp" else None

            latency = None if status == "down" else round(base_latency[monitor.name] + random.uniform(-7, 18), 2)
            _add_check(db, monitor, timestamp, status, latency, error, packet_loss)

    # Current mixed states for an interview-ready demo dashboard.
    current_states = {
        "Core Router": ("up", 16.4, None, 0.0),
        "Branch Firewall": (
            "down",
            None,
            "TCP connection timed out; possible ISP CPE or firewall policy issue",
            None,
        ),
        "DNS Resolver": ("up", 21.7, None, None),
        "Corporate Website": ("degraded", 438.5, "HTTP latency above 400 ms threshold", None),
        "VPN Gateway": ("up", 71.8, None, None),
        "Database Server TCP 5432": (
            "down",
            None,
            "TCP connect failed: no response from database listener",
            None,
        ),
    }

    for monitor in monitors:
        status, latency, error, packet_loss = current_states[monitor.name]
        for minutes_back in (30, 20, 10):
            sample_status = status
            sample_error = error
            sample_latency = latency
            if monitor.name == "VPN Gateway" and minutes_back in (30, 20):
                sample_status = "down"
                sample_error = "TCP timeout before remote access gateway recovered"
                sample_latency = None
            _add_check(
                db,
                monitor,
                now - timedelta(minutes=minutes_back),
                sample_status,
                sample_latency,
                sample_error,
                packet_loss,
            )

    db.commit()

    branch = next(monitor for monitor in monitors if monitor.name == "Branch Firewall")
    branch_outage = Outage(
        monitor_id=branch.id,
        started_at=now - timedelta(hours=2, minutes=15),
        duration_seconds=(timedelta(hours=2, minutes=15).total_seconds()),
        severity="critical",
        status="active",
        root_cause_hint="TCP connection timed out; likely branch ISP CPE, firewall policy, or upstream path issue.",
        failed_check_count=7,
    )
    corporate = next(monitor for monitor in monitors if monitor.name == "Corporate Website")
    corporate_outage = Outage(
        monitor_id=corporate.id,
        started_at=now - timedelta(minutes=18),
        duration_seconds=timedelta(minutes=18).total_seconds(),
        severity="low",
        status="active",
        root_cause_hint="HTTP latency above NOC degradation threshold.",
        failed_check_count=1,
    )
    vpn = next(monitor for monitor in monitors if monitor.name == "VPN Gateway")
    vpn_outage = Outage(
        monitor_id=vpn.id,
        started_at=now - timedelta(hours=3),
        ended_at=now - timedelta(minutes=10),
        duration_seconds=timedelta(hours=2, minutes=50).total_seconds(),
        severity="high",
        status="resolved",
        root_cause_hint="Remote access gateway TCP timeout recovered after route reconvergence.",
        failed_check_count=5,
    )
    database = next(monitor for monitor in monitors if monitor.name == "Database Server TCP 5432")
    database_outage = Outage(
        monitor_id=database.id,
        started_at=now - timedelta(minutes=48),
        duration_seconds=timedelta(minutes=48).total_seconds(),
        severity="medium",
        status="active",
        root_cause_hint="TCP connect failed: no response from database listener.",
        failed_check_count=3,
    )
    db.add_all([branch_outage, corporate_outage, vpn_outage, database_outage])
    db.commit()
    for outage in [branch_outage, corporate_outage, vpn_outage, database_outage]:
        db.refresh(outage)

    _add_alert(
        db,
        branch,
        branch_outage,
        branch_outage.started_at,
        "outage_started",
        "critical",
        "Branch Firewall is down",
        branch_outage.root_cause_hint,
    )
    _add_alert(
        db,
        corporate,
        corporate_outage,
        corporate_outage.started_at,
        "outage_started",
        "low",
        "Corporate Website degraded",
        corporate_outage.root_cause_hint,
    )
    _add_alert(
        db,
        vpn,
        vpn_outage,
        vpn_outage.ended_at or now,
        "outage_resolved",
        "info",
        "VPN Gateway recovered",
        "Remote access gateway recovered after a short outage.",
    )
    _add_alert(
        db,
        database,
        database_outage,
        database_outage.started_at,
        "outage_started",
        "medium",
        "Database Server TCP 5432 is down",
        database_outage.root_cause_hint,
    )
    db.commit()

