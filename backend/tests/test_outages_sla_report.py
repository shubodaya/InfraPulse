from datetime import datetime, timedelta

import pytest

from app.models import CheckResult, Monitor, Outage
from app.services.outage_detector import evaluate_outage
from app.services.report_generator import generate_markdown_report
from app.services.sla_calculator import calculate_monitor_sla


def _monitor(db_session):
    monitor = Monitor(
        name="Branch Router",
        target="10.0.0.1:443",
        monitor_type="tcp",
        interval_seconds=60,
        timeout_seconds=3,
        tags=["branch", "critical"],
    )
    db_session.add(monitor)
    db_session.commit()
    db_session.refresh(monitor)
    return monitor


@pytest.mark.asyncio
async def test_outage_creation(db_session):
    monitor = _monitor(db_session)
    check = CheckResult(
        monitor_id=monitor.id,
        timestamp=datetime.utcnow(),
        status="down",
        check_type="tcp",
        error_message="TCP timeout",
        raw_result="TCP timeout",
    )
    db_session.add(check)
    db_session.commit()
    db_session.refresh(check)

    outage = await evaluate_outage(db_session, monitor, check)

    assert outage is not None
    assert outage.status == "active"
    assert outage.severity == "low"


@pytest.mark.asyncio
async def test_outage_resolution(db_session):
    monitor = _monitor(db_session)
    down_check = CheckResult(
        monitor_id=monitor.id,
        timestamp=datetime.utcnow() - timedelta(minutes=5),
        status="down",
        check_type="tcp",
        error_message="TCP timeout",
    )
    db_session.add(down_check)
    db_session.commit()
    db_session.refresh(down_check)
    await evaluate_outage(db_session, monitor, down_check)

    up_check = CheckResult(
        monitor_id=monitor.id,
        timestamp=datetime.utcnow(),
        status="up",
        response_time_ms=12.5,
        check_type="tcp",
    )
    db_session.add(up_check)
    db_session.commit()
    db_session.refresh(up_check)
    outage = await evaluate_outage(db_session, monitor, up_check)

    assert outage is not None
    assert outage.status == "resolved"
    assert outage.duration_seconds > 0


def test_sla_calculation(db_session):
    monitor = _monitor(db_session)
    now = datetime.utcnow()
    checks = [
        CheckResult(monitor_id=monitor.id, timestamp=now - timedelta(minutes=30), status="up", response_time_ms=10, check_type="tcp"),
        CheckResult(monitor_id=monitor.id, timestamp=now - timedelta(minutes=20), status="degraded", response_time_ms=90, check_type="tcp"),
        CheckResult(monitor_id=monitor.id, timestamp=now - timedelta(minutes=10), status="down", check_type="tcp"),
    ]
    db_session.add_all(checks)
    db_session.add(
        Outage(
            monitor_id=monitor.id,
            started_at=now - timedelta(minutes=12),
            ended_at=now - timedelta(minutes=6),
            duration_seconds=360,
            severity="medium",
            status="resolved",
            root_cause_hint="TCP failure",
        )
    )
    db_session.commit()

    metrics = calculate_monitor_sla(db_session, monitor, now - timedelta(hours=1), now)

    assert metrics.total_checks == 3
    assert metrics.availability_percent == 50.0
    assert metrics.average_latency_ms == 50.0
    assert metrics.outage_count == 1
    assert metrics.total_downtime_seconds == 360


def test_report_generation(db_session):
    monitor = _monitor(db_session)
    now = datetime.utcnow()
    db_session.add(
        CheckResult(
            monitor_id=monitor.id,
            timestamp=now,
            status="up",
            response_time_ms=15,
            check_type="tcp",
            raw_result="ok",
        )
    )
    db_session.commit()

    report = generate_markdown_report(db_session)

    assert "# InfraPulse Availability Report" in report
    assert "## Executive Summary" in report
    assert "Branch Router" in report

