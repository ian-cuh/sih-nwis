from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class WellBase(BaseModel):
    name: str
    field: str
    latitude: float
    longitude: float
    spud_date: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    total_depth: float
    current_depth: float
    well_type: str
    trajectory: str
    status: str
    is_synthetic: bool = True

class WellOut(WellBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class FormationBase(BaseModel):
    name: str
    depth_from: float
    depth_to: float

class FormationOut(FormationBase):
    id: int
    well_id: int
    model_config = ConfigDict(from_attributes=True)

class DocumentBase(BaseModel):
    filename: str
    document_type: str
    date: Optional[datetime] = None
    page: Optional[int] = None
    extracted_text: Optional[str] = None

class DocumentOut(DocumentBase):
    id: int
    well_id: int
    model_config = ConfigDict(from_attributes=True)

class DrillingEventBase(BaseModel):
    event_type: str
    depth_from: float
    depth_to: float
    formation_name: str
    severity: str
    description: str
    cause: str
    mitigation: str
    outcome: str

class DrillingEventOut(DrillingEventBase):
    id: int
    well_id: int
    source_document_id: Optional[int] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class NearbyWellOut(WellOut):
    distance_km: float
    event_count: int

class SearchRequest(BaseModel):
    query: str


class AskRequest(BaseModel):
    question: str

class ComponentScore(BaseModel):
    name: str
    score: float
    weight: float
    reason: str

class SimilarWellOut(BaseModel):
    well_id: int
    well_name: str
    overall_score: float
    components: List[ComponentScore]

class SimilarWellsResponse(BaseModel):
    active_well: dict
    similar_wells: List[SimilarWellOut]
    disclaimer: str
