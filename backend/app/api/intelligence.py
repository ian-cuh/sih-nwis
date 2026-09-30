from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.alert_service import generate_alerts
from app.services.correlation_service import get_depth_correlation

router = APIRouter()

@router.get("/alerts/lookahead/{well_id}")
def get_lookahead_alerts(well_id: int, db: Session = Depends(get_db)):
    return generate_alerts(well_id, db)

@router.get("/depth-correlation/{well_id}")
def get_correlation(well_id: int, db: Session = Depends(get_db)):
    return get_depth_correlation(well_id, db)
