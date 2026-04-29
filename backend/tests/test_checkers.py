import socket

import httpx
import pytest

from app.models import Monitor
from app.services.dns_checker import check_dns
from app.services.http_checker import check_http


@pytest.mark.asyncio
async def test_http_check_success():
    monitor = Monitor(
        name="Website",
        target="https://service.local/health",
        monitor_type="http",
        timeout_seconds=2,
        expected_status_code=200,
    )
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json={"ok": True}))
    async with httpx.AsyncClient(transport=transport) as client:
        result = await check_http(monitor, client)

    assert result["status"] == "up"
    assert result["error_message"] is None


@pytest.mark.asyncio
async def test_http_check_failure_on_unexpected_status():
    monitor = Monitor(
        name="Website",
        target="https://service.local/health",
        monitor_type="http",
        timeout_seconds=2,
        expected_status_code=200,
    )
    transport = httpx.MockTransport(lambda request: httpx.Response(503))
    async with httpx.AsyncClient(transport=transport) as client:
        result = await check_http(monitor, client)

    assert result["status"] == "down"
    assert "Expected HTTP 200" in result["error_message"]


@pytest.mark.asyncio
async def test_dns_check_success(monkeypatch):
    monitor = Monitor(name="DNS", target="example.com", monitor_type="dns", timeout_seconds=2)

    def fake_getaddrinfo(host, port):
        assert host == "example.com"
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 0))]

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)
    result = await check_dns(monitor)

    assert result["status"] == "up"
    assert "93.184.216.34" in result["raw_result"]


@pytest.mark.asyncio
async def test_dns_check_failure(monkeypatch):
    monitor = Monitor(name="DNS", target="missing.local", monitor_type="dns", timeout_seconds=2)

    def fake_getaddrinfo(host, port):
        raise socket.gaierror("not found")

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)
    result = await check_dns(monitor)

    assert result["status"] == "down"
    assert "DNS resolution failed" in result["error_message"]

