from __future__ import annotations

import asyncio
import re
import time
from typing import Any

from app.models import Monitor


TARGET_PATTERN = re.compile(r"^(?:tcp://)?(?P<host>[^:/]+):(?P<port>\d{1,5})$")


def parse_tcp_target(target: str) -> tuple[str, int]:
    match = TARGET_PATTERN.match(target.strip())
    if not match:
        raise ValueError("TCP target must use host:port or tcp://host:port format")
    port = int(match.group("port"))
    if port < 1 or port > 65535:
        raise ValueError("TCP port must be between 1 and 65535")
    return match.group("host"), port


async def check_tcp(monitor: Monitor) -> dict[str, Any]:
    started = time.perf_counter()
    try:
        host, port = parse_tcp_target(monitor.target)
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port), timeout=monitor.timeout_seconds
        )
        writer.close()
        await writer.wait_closed()
        return {
            "status": "up",
            "response_time_ms": round((time.perf_counter() - started) * 1000, 2),
            "packet_loss_percent": None,
            "error_message": None,
            "check_type": "tcp",
            "raw_result": f"TCP connect succeeded to {host}:{port}",
        }
    except ValueError as exc:
        return {
            "status": "down",
            "response_time_ms": None,
            "packet_loss_percent": None,
            "error_message": str(exc),
            "check_type": "tcp",
            "raw_result": "Invalid TCP target",
        }
    except (TimeoutError, asyncio.TimeoutError):
        return {
            "status": "down",
            "response_time_ms": round((time.perf_counter() - started) * 1000, 2),
            "packet_loss_percent": None,
            "error_message": f"TCP connection timed out after {monitor.timeout_seconds}s",
            "check_type": "tcp",
            "raw_result": "TCP timeout",
        }
    except OSError as exc:
        return {
            "status": "down",
            "response_time_ms": round((time.perf_counter() - started) * 1000, 2),
            "packet_loss_percent": None,
            "error_message": f"TCP connection failed: {exc}",
            "check_type": "tcp",
            "raw_result": "TCP connect failed",
        }

