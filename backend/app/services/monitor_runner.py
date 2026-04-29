from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import CheckResult, Monitor
from app.services.dns_checker import check_dns
from app.services.http_checker import check_http
from app.services.outage_detector import evaluate_outage
from app.services.ping_checker import check_ping
from app.services.tcp_checker import check_tcp

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="UTC")


async def perform_monitor_check(monitor: Monitor) -> dict[str, Any]:
    monitor_type = monitor.monitor_type.lower()
    if monitor_type == "http":
        return await check_http(monitor)
    if monitor_type == "dns":
        return await check_dns(monitor)
    if monitor_type == "tcp":
        return await check_tcp(monitor)
    if monitor_type == "icmp":
        return await check_ping(monitor)
    return {
        "status": "down",
        "response_time_ms": None,
        "packet_loss_percent": None,
        "error_message": f"Unsupported monitor type: {monitor.monitor_type}",
        "check_type": monitor.monitor_type,
        "raw_result": "Unsupported monitor type",
    }


async def run_monitor_check(db: Session, monitor: Monitor) -> CheckResult:
    result = await perform_monitor_check(monitor)
    check = CheckResult(
        monitor_id=monitor.id,
        timestamp=datetime.utcnow(),
        status=result["status"],
        response_time_ms=result.get("response_time_ms"),
        packet_loss_percent=result.get("packet_loss_percent"),
        error_message=result.get("error_message"),
        check_type=result.get("check_type", monitor.monitor_type),
        raw_result=result.get("raw_result"),
    )
    db.add(check)
    db.commit()
    db.refresh(check)
    await evaluate_outage(db, monitor, check)
    return check


async def run_scheduled_check(monitor_id: int) -> None:
    db = SessionLocal()
    try:
        monitor = db.get(Monitor, monitor_id)
        if not monitor or not monitor.enabled:
            return
        await run_monitor_check(db, monitor)
    except Exception:
        logger.exception("Scheduled monitor check failed for monitor_id=%s", monitor_id)
    finally:
        db.close()


def schedule_all_monitors() -> None:
    if not scheduler.running:
        return
    scheduler.remove_all_jobs()
    db = SessionLocal()
    try:
        monitors = db.scalars(select(Monitor).where(Monitor.enabled.is_(True))).all()
        for monitor in monitors:
            scheduler.add_job(
                run_scheduled_check,
                trigger="interval",
                seconds=monitor.interval_seconds,
                args=[monitor.id],
                id=f"monitor-{monitor.id}",
                replace_existing=True,
                next_run_time=datetime.utcnow() + timedelta(seconds=10),
                max_instances=1,
                coalesce=True,
            )
    finally:
        db.close()


def start_scheduler() -> None:
    if os.getenv("START_MONITORING", "true").lower() in {"0", "false", "no"}:
        return
    if not scheduler.running:
        scheduler.start()
    schedule_all_monitors()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)

