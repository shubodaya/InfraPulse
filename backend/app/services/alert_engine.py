from __future__ import annotations

import json
import os
from datetime import datetime

import httpx
from sqlalchemy.orm import Session

from app.models import AlertEvent, Monitor, Outage


async def _send_webhook(payload: dict) -> bool:
    webhook_url = os.getenv("ALERT_WEBHOOK_URL", "").strip()
    if not webhook_url:
        return True
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.post(webhook_url, json=payload)
            return response.status_code < 400
    except httpx.HTTPError:
        return False


async def create_alert(
    db: Session,
    monitor: Monitor,
    alert_type: str,
    severity: str,
    title: str,
    message: str,
    outage: Outage | None = None,
) -> AlertEvent:
    payload = {
        "monitor_id": monitor.id,
        "monitor": monitor.name,
        "target": monitor.target,
        "alert_type": alert_type,
        "severity": severity,
        "title": title,
        "message": message,
        "timestamp": datetime.utcnow().isoformat(),
        "outage_id": outage.id if outage else None,
    }
    delivered = await _send_webhook(payload)
    alert = AlertEvent(
        monitor_id=monitor.id,
        outage_id=outage.id if outage else None,
        alert_type=alert_type,
        severity=severity,
        title=title,
        message=message,
        channel="webhook" if os.getenv("ALERT_WEBHOOK_URL") else "database",
        delivered=delivered,
        payload=json.dumps(payload),
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

