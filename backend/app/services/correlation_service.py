"""
Depth Correlation Service

Builds a depth-aligned view of formations and drilling events across:
  - the active well
  - all comparable offset wells

Used to power the depth correlation chart on the frontend.
No AI is used here – this is purely structured data retrieval and alignment.
"""

from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.models.domain import Well, Formation, DrillingEvent
from app.utils.geo import haversine

RADIUS_KM = 10.0
DEPTH_RATIO_THRESHOLD = 0.30


def get_depth_correlation(active_well_id: int, db: Session) -> Dict[str, Any]:
    """
    Return depth-correlated data for the active well and comparable offset wells.
    """
    active = db.query(Well).filter(Well.id == active_well_id).first()
    if not active:
        return {}

    all_wells = db.query(Well).filter(Well.status == "Completed").all()

    comparable = []
    for w in all_wells:
        if w.id == active.id:
            continue
        if w.field != active.field:
            continue
        depth_ratio = abs(w.total_depth - active.total_depth) / max(active.total_depth, 1)
        if depth_ratio > DEPTH_RATIO_THRESHOLD:
            continue
        dist = haversine(active.latitude, active.longitude, w.latitude, w.longitude)
        if dist > RADIUS_KM:
            continue
        comparable.append(w)

    def well_data(well: Well) -> Dict[str, Any]:
        formations = db.query(Formation).filter(Formation.well_id == well.id).order_by(Formation.depth_from).all()
        events = db.query(DrillingEvent).filter(DrillingEvent.well_id == well.id).order_by(DrillingEvent.depth_from).all()
        return {
            "id": well.id,
            "name": well.name,
            "field": well.field,
            "total_depth": well.total_depth,
            "current_depth": well.current_depth,
            "status": well.status,
            "is_active": well.id == active_well_id,
            "formations": [
                {
                    "name": f.name,
                    "depth_from": f.depth_from,
                    "depth_to": f.depth_to,
                }
                for f in formations
            ],
            "events": [
                {
                    "id": e.id,
                    "event_type": e.event_type,
                    "depth_from": e.depth_from,
                    "depth_to": e.depth_to,
                    "severity": e.severity,
                    "formation_name": e.formation_name,
                    "description": e.description,
                    "mitigation": e.mitigation,
                }
                for e in events
            ],
        }

    return {
        "active_well": well_data(active),
        "offset_wells": [well_data(w) for w in comparable],
    }
