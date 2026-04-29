from __future__ import annotations

import time
from typing import Any

import httpx

from app.models import Monitor


async def check_http(monitor: Monitor, client: httpx.AsyncClient | None = None) -> dict[str, Any]:
    expected_status = monitor.expected_status_code or 200
    started = time.perf_counter()

    async def _send(active_client: httpx.AsyncClient) -> httpx.Response:
        return await active_client.get(str(monitor.target))

    try:
        if client is None:
            async with httpx.AsyncClient(
                timeout=monitor.timeout_seconds, follow_redirects=True
            ) as active_client:
                response = await _send(active_client)
        else:
            response = await _send(client)

        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
        status = "up" if response.status_code == expected_status else "down"
        error = None if status == "up" else f"Expected HTTP {expected_status}, got {response.status_code}"
        return {
            "status": status,
            "response_time_ms": elapsed_ms,
            "packet_loss_percent": None,
            "error_message": error,
            "check_type": "http",
            "raw_result": f"HTTP {response.status_code} from {monitor.target}",
        }
    except httpx.TimeoutException as exc:
        return {
            "status": "down",
            "response_time_ms": round((time.perf_counter() - started) * 1000, 2),
            "packet_loss_percent": None,
            "error_message": f"HTTP timeout after {monitor.timeout_seconds}s: {exc}",
            "check_type": "http",
            "raw_result": "HTTP request timed out",
        }
    except httpx.HTTPError as exc:
        return {
            "status": "down",
            "response_time_ms": round((time.perf_counter() - started) * 1000, 2),
            "packet_loss_percent": None,
            "error_message": str(exc),
            "check_type": "http",
            "raw_result": "HTTP request failed",
        }

