"""
Search Service – Structured Database Search

Handles query understanding and structured filtering:
  - depth range extraction
  - formation name extraction
  - event type extraction
  - well name extraction
  - keyword matching in event descriptions

This is NOT semantic/vector search (that requires embeddings + pgvector).
This is a deterministic keyword + structured-field search that works
without any external dependencies.

Architecture allows future addition of:
  - pgvector semantic search
  - BM25 full-text search
  - embedding-based reranking
"""

import re
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Dict, Any, Optional, Tuple
from app.models.domain import Well, Formation, DrillingEvent, Document


# --- Query Understanding (deterministic, no LLM) ---

EVENT_TYPE_KEYWORDS = {
    "lost circulation": "Lost Circulation",
    "loss of returns": "Lost Circulation",
    "lost returns": "Lost Circulation",
    "stuck pipe": "Stuck Pipe",
    "differential sticking": "Stuck Pipe",
    "high torque": "High Torque",
    "torque": "High Torque",
    "vibration": "Vibration",
    "kick": "Kick/Influx",
    "influx": "Kick/Influx",
    "well control": "Kick/Influx",
    "hole instability": "Hole Instability",
    "borehole instability": "Hole Instability",
    "wellbore instability": "Hole Instability",
    "mud": "Mud Issues",
    "mud weight": "Mud Issues",
    "mud loss": "Mud Issues",
    "cement": "Cementing Issues",
    "cementing": "Cementing Issues",
}

FORMATION_KEYWORDS = [
    "Utsira", "Hordaland", "Rogaland", "Shetland", "Cromer Knoll",
]


def parse_query(query: str) -> Dict[str, Any]:
    """
    Extract structured filters from a natural-language query.
    Returns a dict with optional keys: event_types, depth_from, depth_to,
    formations, well_names, keywords.
    """
    q = query.lower().strip()
    result: Dict[str, Any] = {"raw_query": query, "keywords": []}

    # --- Extract depth values ---
    # Patterns: "near 2750 m", "around 2750m", "between 2700 and 2800",
    #           "at 2750 meters", "2740-2780 m"
    depth_range = re.findall(r"(\d{3,5})\s*(?:m|meters?|metre)?", q)
    if depth_range:
        depths = [float(d) for d in depth_range]
        if len(depths) == 1:
            result["depth_from"] = depths[0] - 50  # ±50m window
            result["depth_to"] = depths[0] + 50
        else:
            result["depth_from"] = min(depths)
            result["depth_to"] = max(depths)

    # --- Extract event types ---
    matched_events = set()
    for keyword, event_type in EVENT_TYPE_KEYWORDS.items():
        if keyword in q:
            matched_events.add(event_type)
    if matched_events:
        result["event_types"] = list(matched_events)

    # --- Extract formation names ---
    matched_formations = []
    for fm in FORMATION_KEYWORDS:
        if fm.lower() in q:
            matched_formations.append(fm)
    if matched_formations:
        result["formations"] = matched_formations

    # --- Extract well names ---
    well_names = re.findall(r"w-?\d{2,4}", q, re.IGNORECASE)
    if well_names:
        result["well_names"] = [w.upper().replace("W", "W-").replace("W--", "W-") for w in well_names]

    # --- General keywords (words > 3 chars, not stop words) ---
    stop_words = {
        "what", "which", "where", "when", "that", "this", "were", "have",
        "with", "from", "near", "about", "around", "between", "during",
        "drilling", "wells", "well", "problems", "occurred", "happened",
        "used", "formation", "depth", "meters", "nearby",
    }
    words = re.findall(r"[a-zA-Z]{4,}", q)
    result["keywords"] = [w for w in words if w.lower() not in stop_words]

    return result


def search_events(parsed: Dict[str, Any], db: Session) -> List[Dict[str, Any]]:
    """
    Execute structured search against the database using parsed query filters.
    Returns a list of event dicts with full well and source information.
    """
    query = db.query(DrillingEvent)
    filters_applied = []

    # Depth filter
    if "depth_from" in parsed and "depth_to" in parsed:
        query = query.filter(
            DrillingEvent.depth_from >= parsed["depth_from"] - 100,
            DrillingEvent.depth_to <= parsed["depth_to"] + 100,
        )
        filters_applied.append(f"depth {parsed['depth_from']:.0f}–{parsed['depth_to']:.0f} m")

    # Event type filter
    if "event_types" in parsed:
        query = query.filter(DrillingEvent.event_type.in_(parsed["event_types"]))
        filters_applied.append(f"event_type in {parsed['event_types']}")

    # Formation filter
    if "formations" in parsed:
        query = query.filter(DrillingEvent.formation_name.in_(parsed["formations"]))
        filters_applied.append(f"formation in {parsed['formations']}")

    # Well name filter
    if "well_names" in parsed:
        well_ids = [
            w.id for w in db.query(Well).filter(Well.name.in_(parsed["well_names"])).all()
        ]
        if well_ids:
            query = query.filter(DrillingEvent.well_id.in_(well_ids))
            filters_applied.append(f"wells {parsed['well_names']}")

    # Keyword search in description
    if parsed.get("keywords"):
        keyword_filters = []
        for kw in parsed["keywords"]:
            keyword_filters.append(DrillingEvent.description.ilike(f"%{kw}%"))
            keyword_filters.append(DrillingEvent.mitigation.ilike(f"%{kw}%"))
            keyword_filters.append(DrillingEvent.cause.ilike(f"%{kw}%"))
        query = query.filter(or_(*keyword_filters))
        filters_applied.append(f"keywords {parsed['keywords']}")

    events = query.order_by(DrillingEvent.depth_from).all()

    # Enrich each event with well info and source doc
    results = []
    for ev in events:
        well = db.query(Well).filter(Well.id == ev.well_id).first()
        doc = None
        if ev.source_document_id:
            doc = db.query(Document).filter(Document.id == ev.source_document_id).first()

        results.append({
            "event_id": ev.id,
            "event_type": ev.event_type,
            "depth_from": ev.depth_from,
            "depth_to": ev.depth_to,
            "severity": ev.severity,
            "formation_name": ev.formation_name,
            "description": ev.description,
            "cause": ev.cause,
            "mitigation": ev.mitigation,
            "outcome": ev.outcome,
            "well_id": ev.well_id,
            "well_name": well.name if well else "Unknown",
            "well_field": well.field if well else "Unknown",
            "source_document": {
                "id": doc.id,
                "filename": doc.filename,
                "document_type": doc.document_type,
            } if doc else None,
        })

    return results, filters_applied


def search_wells_by_query(parsed: Dict[str, Any], db: Session) -> List[Dict[str, Any]]:
    """Return wells matching the query filters (for the 'relevant wells' section)."""
    # Get unique well_ids from matching events
    events, _ = search_events(parsed, db)
    well_ids = list({e["well_id"] for e in events})

    wells = db.query(Well).filter(Well.id.in_(well_ids)).all() if well_ids else []
    return [
        {
            "id": w.id,
            "name": w.name,
            "field": w.field,
            "status": w.status,
            "total_depth": w.total_depth,
        }
        for w in wells
    ]
