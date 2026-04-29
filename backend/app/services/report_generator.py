from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models import Monitor, Outage
from app.services.sla_calculator import calculate_monitor_sla


def _duration(seconds: float | None) -> str:
    if not seconds:
        return "0m"
    minutes = int(seconds // 60)
    hours, minutes = divmod(minutes, 60)
    days, hours = divmod(hours, 24)
    if days:
        return f"{days}d {hours}h {minutes}m"
    if hours:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"


def generate_markdown_report(db: Session) -> str:
    now = datetime.utcnow()
    since_30d = now - timedelta(days=30)
    monitors = db.scalars(select(Monitor).order_by(Monitor.name)).all()
    metrics = [calculate_monitor_sla(db, monitor, since_30d, now) for monitor in monitors]
    overall = sum(item.availability_percent for item in metrics) / len(metrics) if metrics else 100.0
    active_outages = db.scalars(
        select(Outage).where(Outage.status == "active").order_by(desc(Outage.started_at))
    ).all()
    recent_outages = db.scalars(select(Outage).order_by(desc(Outage.started_at)).limit(12)).all()
    unstable = sorted(metrics, key=lambda item: (item.availability_percent, -item.outage_count))[:5]

    lines = [
        "# InfraPulse Availability Report",
        "",
        f"Generated: {now.strftime('%Y-%m-%d %H:%M UTC')}",
        "",
        "## Executive Summary",
        "",
        f"Overall 30-day uptime across monitored services is **{overall:.3f}%**.",
        f"There are **{len(active_outages)} active outage(s)** across **{len(monitors)} monitor(s)**.",
        "",
        "## Monitor Status Table",
        "",
        "| Monitor | Target | Type | Status | Availability | Avg Latency | Outages | Downtime |",
        "| --- | --- | --- | --- | ---: | ---: | ---: | ---: |",
    ]

    for item in metrics:
        latency = f"{item.average_latency_ms:.1f} ms" if item.average_latency_ms is not None else "n/a"
        lines.append(
            f"| {item.name} | `{item.target}` | {item.monitor_type.upper()} | {item.current_status} | "
            f"{item.availability_percent:.3f}% | {latency} | {item.outage_count} | {_duration(item.total_downtime_seconds)} |"
        )

    lines.extend(
        [
            "",
            "## Outage Timeline",
            "",
            "| Monitor | Severity | Status | Started | Ended | Duration | Root Cause Hint |",
            "| --- | --- | --- | --- | --- | ---: | --- |",
        ]
    )
    for outage in recent_outages:
        ended = outage.ended_at.strftime("%Y-%m-%d %H:%M UTC") if outage.ended_at else "Active"
        duration = outage.duration_seconds
        if outage.status == "active":
            duration = (now - outage.started_at).total_seconds()
        lines.append(
            f"| {outage.monitor.name} | {outage.severity} | {outage.status} | "
            f"{outage.started_at.strftime('%Y-%m-%d %H:%M UTC')} | {ended} | {_duration(duration)} | "
            f"{outage.root_cause_hint} |"
        )

    lines.extend(
        [
            "",
            "## SLA Summary",
            "",
            "| Monitor | 30-day Availability | Downtime | Check Samples |",
            "| --- | ---: | ---: | ---: |",
        ]
    )
    for item in metrics:
        lines.append(
            f"| {item.name} | {item.availability_percent:.3f}% | {_duration(item.total_downtime_seconds)} | {item.total_checks} |"
        )

    lines.extend(
        [
            "",
            "## Top Unstable Monitors",
            "",
            "| Monitor | Availability | Outages | Recommended Focus |",
            "| --- | ---: | ---: | --- |",
        ]
    )
    for item in unstable:
        focus = "Review routing, firewall policy, service health, and upstream dependency logs."
        if item.monitor_type == "dns":
            focus = "Validate resolver health, authoritative records, and upstream DNS reachability."
        elif item.monitor_type == "http":
            focus = "Review application logs, TLS termination, HTTP status patterns, and origin health."
        elif item.monitor_type == "tcp":
            focus = "Check listener state, firewall rules, NAT, and service process availability."
        elif item.monitor_type == "icmp":
            focus = "Confirm host reachability, packet filtering, and ICMP policy."
        lines.append(f"| {item.name} | {item.availability_percent:.3f}% | {item.outage_count} | {focus} |")

    lines.extend(
        [
            "",
            "## Recommended Actions",
            "",
            "- Prioritize active critical and high severity outages before tuning alert thresholds.",
            "- Compare InfraPulse downtime windows against firewall, DNS, web server, and ISP change logs.",
            "- Add location-specific monitors for internet links where asymmetric routing is suspected.",
            "- Keep ICMP monitors as supplemental signals in restricted container environments; prefer TCP, HTTP, and DNS for deterministic checks.",
        ]
    )
    return "\n".join(lines) + "\n"

