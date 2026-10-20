
import pytest
from pydantic import ValidationError

from app.schemas import MonitorCreate


@pytest.mark.parametrize(
    ("monitor_type", "target"),
    [
        ("http", "https://example.com/health"),
        ("dns", "example.com"),
        ("tcp", "example.com:443"),
        ("icmp", "192.168.1.1"),
    ],
)
def test_valid_targets_are_accepted(monitor_type, target):
    monitor = MonitorCreate(
        name="Test monitor",
        target=target,
        monitor_type=monitor_type,
    )
    assert monitor.target == target


@pytest.mark.parametrize(
    ("monitor_type", "target"),
    [
        ("http", "not-a-url"),
        ("http", "ftp://example.com"),
        ("dns", "https://example.com"),
        ("dns", "invalid host"),
        ("tcp", "example.com:99999"),
        ("tcp", "example.com"),
        ("icmp", "invalid host"),
    ],
)
def test_invalid_targets_are_rejected(monitor_type, target):
    with pytest.raises(ValidationError):
        MonitorCreate(
            name="Test monitor",
            target=target,
            monitor_type=monitor_type,
        )
