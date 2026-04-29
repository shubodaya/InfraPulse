from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CheckResult
from app.schemas import CheckResultRead

router = APIRouter(prefix="/api/checks", tags=["checks"])


@router.get("/recent", response_model=list[CheckResultRead])
def recent_checks(
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[CheckResult]:
    return db.scalars(select(CheckResult).order_by(desc(CheckResult.timestamp)).limit(limit)).all()

