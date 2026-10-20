from datetime import datetime
from typing import Literal
from app.services.target_validation import validate_target
from pydantic import model_validator

from pydantic import BaseModel, ConfigDict, Field, field_validator


MonitorType = Literal["icmp", "http", "dns", "tcp"]
CheckStatus = Literal["up", "degraded", "down", "unknown"]


class MonitorBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    target: str = Field(..., min_length=1, max_length=500)
    monitor_type: MonitorType
    interval_seconds: int = Field(300, ge=30, le=86_400)
    timeout_seconds: int = Field(5, ge=1, le=60)
    expected_status_code: int | None = Field(None, ge=100, le=599)
    expected_dns_result: str | None = None
    enabled: bool = True
    tags: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_monitor_target(self):
        validate_target(self.target, self.monitor_type)
        return self


    @field_validator("tags", mode="before")
    @classmethod
    def parse_tags(cls, value: object) -> list[str]:
        if value is None:
            return []
        if isinstance(value, str):
            return [tag.strip() for tag in value.split(",") if tag.strip()]
        if isinstance(value, list):
            return [str(tag).strip() for tag in value if str(tag).strip()]
        return []


class MonitorCreate(MonitorBase):
    pass


class MonitorUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=120)
    target: str | None = Field(None, min_length=1, max_length=500)
    monitor_type: MonitorType | None = None
    interval_seconds: int | None = Field(None, ge=30, le=86_400)
    timeout_seconds: int | None = Field(None, ge=1, le=60)
    expected_status_code: int | None = Field(None, ge=100, le=599)
    expected_dns_result: str | None = None
    enabled: bool | None = None
    tags: list[str] | None = None

    @field_validator("tags", mode="before")
    @classmethod
    def parse_tags(cls, value: object) -> list[str] | None:
        if value is None:
            return None
        if isinstance(value, str):
            return [tag.strip() for tag in value.split(",") if tag.strip()]
        if isinstance(value, list):
            return [str(tag).strip() for tag in value if str(tag).strip()]
        return []

    @model_validator(mode="after")
    def validate_updated_target(self):
        if self.target is not None and self.monitor_type is not None:
            validate_target(self.target, self.monitor_type)
        return self


class CheckResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    monitor_id: int
    timestamp: datetime
    status: CheckStatus
    response_time_ms: float | None = None
    packet_loss_percent: float | None = None
    error_message: str | None = None
    check_type: str
    raw_result: str | None = None


class MonitorRead(MonitorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    current_status: CheckStatus = "unknown"
    last_checked_at: datetime | None = None
    last_response_time_ms: float | None = None
    active_outage: bool = False
    availability_24h: float | None = None


class OutageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    monitor_id: int
    monitor_name: str | None = None
    monitor_target: str | None = None
    started_at: datetime
    ended_at: datetime | None = None
    duration_seconds: float | None = None
    severity: str
    status: str
    root_cause_hint: str
    failed_check_count: int


class AlertRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    monitor_id: int
    outage_id: int | None = None
    monitor_name: str | None = None
    timestamp: datetime
    alert_type: str
    severity: str
    title: str
    message: str
    channel: str
    delivered: bool


class MonitorAvailability(BaseModel):
    monitor_id: int
    name: str
    target: str
    monitor_type: str
    availability_percent: float
    average_latency_ms: float | None = None
    outage_count: int
    total_downtime_seconds: float
    total_checks: int
    up_checks: int
    degraded_checks: int
    down_checks: int
    current_status: CheckStatus = "unknown"


class ReportPeriod(BaseModel):
    period: str
    since: datetime
    until: datetime
    overall_availability_percent: float
    active_outages: int
    monitor_count: int
    monitors: list[MonitorAvailability]


class SummaryReport(BaseModel):
    generated_at: datetime
    total_monitors: int
    up: int
    degraded: int
    down: int
    unknown: int
    active_outages: int
    overall_availability_percent: float
    recent_outages: list[OutageRead]
    recent_alerts: list[AlertRead]
    periods: list[ReportPeriod]

