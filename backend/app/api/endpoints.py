from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.domain import Well, Formation, DrillingEvent, Document
from app.schemas.domain import (
    WellOut, FormationOut, DrillingEventOut, DocumentOut,
    NearbyWellOut, SearchRequest, AskRequest, SimilarWellsResponse
)
from app.utils.geo import haversine
from app.services.alert_service import generate_alerts
from app.services.correlation_service import get_depth_correlation
from app.services.rag_service import search, ask
from app.services.similarity_service import get_similar_wells

router = APIRouter()

# ── Data endpoints ──

@router.get("/wells", response_model=List[WellOut])
def get_wells(db: Session = Depends(get_db)):
    return db.query(Well).all()

@router.get("/wells/nearby", response_model=List[NearbyWellOut])
def get_nearby_wells(lat: float, lng: float, radius_km: float = 10.0, db: Session = Depends(get_db)):
    all_wells = db.query(Well).all()
    results = []
    for w in all_wells:
        dist = haversine(lat, lng, w.latitude, w.longitude)
        if dist <= radius_km:
            event_count = db.query(DrillingEvent).filter(DrillingEvent.well_id == w.id).count()
            well_dict = w.__dict__.copy()
            well_dict['distance_km'] = dist
            well_dict['event_count'] = event_count
            results.append(well_dict)
    results.sort(key=lambda x: x['distance_km'])
    return results

@router.get("/wells/{well_id}", response_model=WellOut)
def get_well(well_id: int, db: Session = Depends(get_db)):
    well = db.query(Well).filter(Well.id == well_id).first()
    if not well:
        raise HTTPException(status_code=404, detail="Well not found")
    return well

@router.get("/events", response_model=List[DrillingEventOut])
def get_events(well_id: int = None, db: Session = Depends(get_db)):
    query = db.query(DrillingEvent)
    if well_id:
        query = query.filter(DrillingEvent.well_id == well_id)
    return query.all()

@router.get("/events/{event_id}", response_model=DrillingEventOut)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(DrillingEvent).filter(DrillingEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@router.get("/formations", response_model=List[FormationOut])
def get_formations(well_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Formation)
    if well_id:
        query = query.filter(Formation.well_id == well_id)
    return query.all()

@router.get("/documents", response_model=List[DocumentOut])
def get_documents(well_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Document)
    if well_id:
        query = query.filter(Document.well_id == well_id)
    return query.all()

# ── Intelligence endpoints ──

@router.get("/alerts/lookahead/{well_id}")
@router.get("/alerts/active/{well_id}")
def get_lookahead_alerts(well_id: int, db: Session = Depends(get_db)):
    return generate_alerts(well_id, db)

@router.get("/depth-correlation/{well_id}")
@router.get("/correlation/{well_id}")
def get_correlation(well_id: int, db: Session = Depends(get_db)):
    return get_depth_correlation(well_id, db)

@router.get("/wells/{well_id}/similar", response_model=SimilarWellsResponse)
def get_similar(well_id: int, db: Session = Depends(get_db)):
    result = get_similar_wells(well_id, db)
    if not result:
        raise HTTPException(status_code=404, detail="Well not found")
    return result

# ── Search & RAG endpoints ──

@router.post("/search")
def search_endpoint(req: SearchRequest, db: Session = Depends(get_db)):
    """Structured search — no LLM. Returns matching events and wells."""
    return search(req.query, db)

@router.post("/ask")
def ask_endpoint(req: AskRequest, db: Session = Depends(get_db)):
    """RAG pipeline — retrieves evidence then generates a summarised answer."""
    return ask(req.question, db)

