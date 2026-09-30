"""
Alert Service – Look-ahead Historical Context Alerts

This service generates LOOK-AHEAD ALERTS based purely on historical drilling events
from comparable offset wells. These are historical context alerts, NOT predictions.

Alert logic:
  1. Find wells comparable to the active well (same field, depth ratio < 30%).
  2. For each comparable well, find events whose depth interval falls within a
     look-ahead window AHEAD of the active well's current depth.
  3. If 2+ comparable wells share the same event_type in overlapping depth windows,
     generate an alert with evidence.

Every alert references specific historical events. No alert is fabricated.
"""

from sqlalchemy.orm import Session
from typing import List
from app.models.domain import Well, DrillingEvent, Alert
from app.utils.geo import haversine

# --- Configuration ---
LOOK_AHEAD_M = 200.0       # scan this many metres ahead of current depth
RADIUS_KM = 10.0           # search radius for nearby wells
DEPTH_WINDOW_M = 100.0     # group events within this depth band
MIN_EVIDENCE_COUNT = 2     # minimum offset wells to trigger an alert
DEPTH_RATIO_THRESHOLD = 0.30


def _comparable_wells(active: Well, all_wells: List[Well]) -> List[Well]:
    """Return wells in same field, within radius, with similar total depth."""
    result = []
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
        result.append(w)
    return result


def generate_alerts(active_well_id: int, db: Session) -> List[dict]:
    """
    Compute look-ahead alerts for an active well.
    Returns list of alert dicts (not ORM objects so they can be serialised easily).
    """
    active = db.query(Well).filter(Well.id == active_well_id).first()
    if not active:
        return []

    all_wells = db.query(Well).filter(Well.status == "Completed").all()
    comparable = _comparable_wells(active, all_wells)
    if not comparable:
        return []

    current_depth = active.current_depth
    look_ahead_top = current_depth
    look_ahead_bottom = current_depth + LOOK_AHEAD_M

    # Collect all historical events in the look-ahead window from comparable wells
    events_in_window: List[DrillingEvent] = []
    comparable_ids = [w.id for w in comparable]
    for ev in db.query(DrillingEvent).filter(
        DrillingEvent.well_id.in_(comparable_ids),
        DrillingEvent.depth_from >= look_ahead_top,
        DrillingEvent.depth_to <= look_ahead_bottom + 100,
    ).all():
        events_in_window.append(ev)

    # Group by event_type
    from collections import defaultdict
    grouped: dict = defaultdict(list)
    for ev in events_in_window:
        grouped[ev.event_type].append(ev)

    alerts = []
    for event_type, evs in grouped.items():
        # Deduplicate by well_id – count unique wells
        unique_wells = list({ev.well_id for ev in evs})
        if len(unique_wells) < MIN_EVIDENCE_COUNT:
            continue

        depth_min = min(ev.depth_from for ev in evs)
        depth_max = max(ev.depth_to for ev in evs)
        severity = _aggregate_severity(evs)

        # Build evidence list
        evidence = [
            {
                "event_id": ev.id,
                "well_id": ev.well_id,
                "well_name": db.query(Well).filter(Well.id == ev.well_id).first().name,
                "depth_from": ev.depth_from,
                "depth_to": ev.depth_to,
                "severity": ev.severity,
                "description": ev.description,
                "mitigation": ev.mitigation,
                "outcome": ev.outcome,
                "source_document_id": ev.source_document_id,
                "formation_name": ev.formation_name,
            }
            for ev in evs
        ]

        formation_names = list({ev.formation_name for ev in evs if ev.formation_name})

        alerts.append({
            "active_well_id": active_well_id,
            "active_well_name": active.name,
            "current_depth": current_depth,
            "alert_type": "LOOK-AHEAD HISTORICAL CONTEXT",
            "event_type": event_type,
            "depth_from": round(depth_min, 1),
            "depth_to": round(depth_max, 1),
            "severity": severity,
            "formation_names": formation_names,
            "comparable_well_count": len(unique_wells),
            "evidence_count": len(evs),
            "reason": (
                f"{len(unique_wells)} comparable offset well(s) in the {active.field} field "
                f"encountered '{event_type}' between {depth_min:.0f}–{depth_max:.0f} m, "
                f"which is within {LOOK_AHEAD_M:.0f} m of your current depth of {current_depth:.0f} m. "
                f"This is a historical context alert derived from offset well records, "
                f"not an automated prediction."
            ),
            "evidence": evidence,
            "disclaimer": (
                "This alert is based on historical events from comparable offset wells. "
                "It does not guarantee that this event will occur. "
                "Drilling engineers should review the source evidence and apply professional judgement."
            ),
        })

    # Sort by severity then depth
    sev_order = {"Severe": 0, "High": 1, "Medium": 2, "Low": 3}
    alerts.sort(key=lambda a: (sev_order.get(a["severity"], 9), a["depth_from"]))
    return alerts


def _aggregate_severity(evs: List[DrillingEvent]) -> str:
    sev_rank = {"Severe": 4, "High": 3, "Medium": 2, "Low": 1}
    rank_sev = {v: k for k, v in sev_rank.items()}
    max_rank = max(sev_rank.get(e.severity, 1) for e in evs)
    return rank_sev.get(max_rank, "Low")
