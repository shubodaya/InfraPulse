
import ipaddress
import re
from urllib.parse import urlsplit


def validate_target(target: str, monitor_type: str) -> str:
    """Validate a monitor target's syntax for its monitor type."""
    target = target.strip()

    if not target or any(ord(char) < 32 for char in target):
        raise ValueError("Target must not be empty or contain control characters.")

    if monitor_type == "http":
        try:
            parsed = urlsplit(target)
            valid = (
                parsed.scheme in {"http", "https"}
                and bool(parsed.hostname)
                and parsed.username is None
                and parsed.password is None
                and parsed.port != 0
            )
        except ValueError:
            valid = False

        if not valid:
            raise ValueError(
                "HTTP targets must be valid HTTP or HTTPS URLs without credentials."
            )

    elif monitor_type == "tcp":
        value = target.removeprefix("tcp://")
        host, separator, port_text = value.rpartition(":")

        if not separator or not host or not port_text.isdigit():
            raise ValueError("TCP targets must use host:port or tcp://host:port.")

        try:
            port = int(port_text)
        except ValueError:
            port = 0

        if not 1 <= port <= 65535:
            raise ValueError("TCP port must be between 1 and 65535.")

        if any(char.isspace() for char in host):
            raise ValueError("TCP host must not contain whitespace.")

    elif monitor_type in {"icmp", "dns"}:
        if "://" in target or any(char.isspace() for char in target):
            raise ValueError(
                f"{monitor_type.upper()} targets must be a hostname or IP address."
            )

        if "/" in target or "@" in target:
            raise ValueError("Target must not contain a path or credentials.")

        try:
            ipaddress.ip_address(target)
        except ValueError:
            hostname = target.rstrip(".")
            if (
                not hostname
                or len(hostname) > 253
                or not all(
                    re.fullmatch(
                        r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?",
                        label,
                    )
                    for label in hostname.split(".")
                )
            ):
                raise ValueError("Target must be a valid hostname or IP address.")

    return target
