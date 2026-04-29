from __future__ import annotations

import asyncio
import platform
import re
import shutil
import time
from typing import Any

from app.models import Monitor


TIME_PATTERN = re.compile(r"time[=<]\s*(?P<ms>\d+(?:\.\d+)?)\s*ms", re.IGNORECASE)


def _ping_command(target: str, timeout_seconds: int) -> list[str]:
    system = platform.system().lower()
    if system == "windows":
        return ["ping", "-n", "1", "-w", str(timeout_seconds * 1000), target]
    return ["ping", "-c", "1", "-W", str(timeout_seconds), target]


def _parse_latency(output: str) -> float | None:
    match = TIME_PATTERN.search(output)
    return float(match.group("ms")) if match else None


async def check_ping(monitor: Monitor) -> dict[str, Any]:
    if shutil.which("ping") is None:
        return {
            "status": "degraded",
            "response_time_ms": None,
            "packet_loss_percent": None,
            "error_message": "ICMP ping executable is unavailable in this environment",
            "check_type": "icmp",
            "raw_result": "Ping unavailable; use TCP/HTTP/DNS checks in restricted containers",
        }

    started = time.perf_counter()
    command = _ping_command(monitor.target, monitor.timeout_seconds)
    try:
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=monitor.timeout_seconds + 2)
        output = (stdout + stderr).decode(errors="replace")
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
        latency = _parse_latency(output) or elapsed_ms
        if process.returncode == 0:
            return {
                "status": "up",
                "response_time_ms": round(latency, 2),
                "packet_loss_percent": 0.0,
                "error_message": None,
                "check_type": "icmp",
                "raw_result": output[-500:],
            }
        return {
            "status": "down",
            "response_time_ms": elapsed_ms,
            "packet_loss_percent": 100.0,
            "error_message": "ICMP echo failed or target did not respond",
            "check_type": "icmp",
            "raw_result": output[-500:],
        }
    except (TimeoutError, asyncio.TimeoutError):
        return {
            "status": "down",
            "response_time_ms": round((time.perf_counter() - started) * 1000, 2),
            "packet_loss_percent": 100.0,
            "error_message": f"ICMP ping timed out after {monitor.timeout_seconds}s",
            "check_type": "icmp",
            "raw_result": "Ping timeout",
        }

