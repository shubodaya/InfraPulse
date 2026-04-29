from __future__ import annotations

import asyncio
import socket
import time
from typing import Any

from app.models import Monitor


def _resolve(hostname: str) -> list[str]:
    records = socket.getaddrinfo(hostname, None)
    return sorted({record[4][0] for record in records})


async def check_dns(monitor: Monitor) -> dict[str, Any]:
    started = time.perf_counter()
    try:
        addresses = await asyncio.wait_for(
            asyncio.to_thread(_resolve, monitor.target), timeout=monitor.timeout_seconds
        )
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
        expected = (monitor.expected_dns_result or "").strip()
        if expected and expected not in addresses:
            return {
                "status": "down",
                "response_time_ms": elapsed_ms,
                "packet_loss_percent": None,
                "error_message": f"Expected DNS result {expected}, got {', '.join(addresses) or 'no records'}",
                "check_type": "dns",
                "raw_result": ", ".join(addresses),
            }
        return {
            "status": "up",
            "response_time_ms": elapsed_ms,
            "packet_loss_percent": None,
            "error_message": None,
            "check_type": "dns",
            "raw_result": ", ".join(addresses),
        }
    except (TimeoutError, asyncio.TimeoutError):
        return {
            "status": "down",
            "response_time_ms": round((time.perf_counter() - started) * 1000, 2),
            "packet_loss_percent": None,
            "error_message": f"DNS lookup timed out after {monitor.timeout_seconds}s",
            "check_type": "dns",
            "raw_result": "DNS lookup timed out",
        }
    except socket.gaierror as exc:
        return {
            "status": "down",
            "response_time_ms": round((time.perf_counter() - started) * 1000, 2),
            "packet_loss_percent": None,
            "error_message": f"DNS resolution failed: {exc}",
            "check_type": "dns",
            "raw_result": "DNS resolution failed",
        }

