from fastapi import APIRouter
from app.schemas.health import HealthCheck

router = APIRouter()

@router.get("/health", response_model=HealthCheck)
def check_health():
    return HealthCheck(status="ok", service="eRTMAC-NWIS Backend")
