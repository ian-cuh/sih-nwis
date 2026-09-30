"""
Well Similarity Engine

Calculates historical relevance/similarity scores between an active well and offset wells.
This uses a transparent, weighted formula (not a black-box AI model).

Components:
- distance_score: based on Haversine geographic distance
- formation_score: Jaccard similarity of intersected formations
- depth_score: Ratio of total depths
- trajectory_score: Categorical matching of well trajectory
- drilling_context_score: Matching field and well type
"""

from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.domain import Well, Formation
from app.utils.geo import haversine

DEFAULT_WEIGHTS = {
    "distance": 0.20,
    "formation": 0.30,
    "depth": 0.20,
    "trajectory": 0.10,
    "context": 0.20
}

def get_well_formations(well_id: int, db: Session) -> set:
    formations = db.query(Formation).filter(Formation.well_id == well_id).all()
    return {f.name.lower() for f in formations}

def calculate_similarity(
    active_well: Well, 
    offset_well: Well, 
    active_formations: set, 
    offset_formations: set,
    weights: dict = DEFAULT_WEIGHTS
) -> Dict[str, Any]:
    
    components = []
    total_score = 0.0

    # 1. Geographic Distance Score (max 100 for 0km, decays to 0 at 50km)
    dist = haversine(active_well.latitude, active_well.longitude, offset_well.latitude, offset_well.longitude)
    dist_score = max(0.0, 100.0 - (dist / 50.0) * 100.0)
    components.append({
        "name": "Distance",
        "score": round(dist_score, 1),
        "weight": weights["distance"],
        "reason": f"{dist:.1f} km away"
    })
    total_score += dist_score * weights["distance"]

    # 2. Formation Score (Jaccard similarity)
    if not active_formations and not offset_formations:
        form_score = 100.0
        reason = "No formations recorded for both"
    elif not active_formations or not offset_formations:
        form_score = 0.0
        reason = "Missing formation data in one well"
    else:
        intersection = active_formations.intersection(offset_formations)
        union = active_formations.union(offset_formations)
        form_score = (len(intersection) / len(union)) * 100.0
        reason = f"{len(intersection)} shared formations"

    components.append({
        "name": "Formation",
        "score": round(form_score, 1),
        "weight": weights["formation"],
        "reason": reason
    })
    total_score += form_score * weights["formation"]

    # 3. Depth Overlap Score
    d1 = active_well.total_depth
    d2 = offset_well.total_depth
    if d1 == 0 and d2 == 0:
        depth_score = 100.0
    elif d1 == 0 or d2 == 0:
        depth_score = 0.0
    else:
        depth_score = (min(d1, d2) / max(d1, d2)) * 100.0
    
    components.append({
        "name": "Depth Overlap",
        "score": round(depth_score, 1),
        "weight": weights["depth"],
        "reason": f"TD: {d2:.0f}m vs {d1:.0f}m"
    })
    total_score += depth_score * weights["depth"]

    # 4. Trajectory Score
    t1 = active_well.trajectory.lower()
    t2 = offset_well.trajectory.lower()
    if t1 == t2:
        traj_score = 100.0
        reason = f"Both {active_well.trajectory}"
    elif (t1 == "deviated" and t2 == "horizontal") or (t1 == "horizontal" and t2 == "deviated"):
        traj_score = 50.0
        reason = "Partial match (Deviated/Horizontal)"
    else:
        traj_score = 0.0
        reason = f"Mismatch ({active_well.trajectory} vs {offset_well.trajectory})"

    components.append({
        "name": "Trajectory",
        "score": round(traj_score, 1),
        "weight": weights["trajectory"],
        "reason": reason
    })
    total_score += traj_score * weights["trajectory"]

    # 5. Drilling Context Score
    context_score = 0.0
    context_reasons = []
    
    if active_well.field.lower() == offset_well.field.lower():
        context_score += 50.0
        context_reasons.append("Same field")
    else:
        context_reasons.append("Different field")

    if active_well.well_type.lower() == offset_well.well_type.lower():
        context_score += 50.0
        context_reasons.append("Same type")
    else:
        context_reasons.append("Different type")

    components.append({
        "name": "Drilling Context",
        "score": round(context_score, 1),
        "weight": weights["context"],
        "reason": ", ".join(context_reasons)
    })
    total_score += context_score * weights["context"]

    return {
        "well_id": offset_well.id,
        "well_name": offset_well.name,
        "overall_score": round(total_score, 1),
        "components": components
    }

def get_similar_wells(active_well_id: int, db: Session, limit: int = 5) -> Dict[str, Any]:
    active_well = db.query(Well).filter(Well.id == active_well_id).first()
    if not active_well:
        return None

    active_formations = get_well_formations(active_well_id, db)
    all_wells = db.query(Well).filter(Well.id != active_well_id).all()
    
    similarities = []
    for w in all_wells:
        w_formations = get_well_formations(w.id, db)
        sim = calculate_similarity(active_well, w, active_formations, w_formations)
        similarities.append(sim)

    # Sort descending by overall_score
    similarities.sort(key=lambda x: x["overall_score"], reverse=True)
    
    return {
        "active_well": {
            "id": active_well.id,
            "name": active_well.name,
            "field": active_well.field,
            "total_depth": active_well.total_depth
        },
        "similar_wells": similarities[:limit],
        "disclaimer": "This is a historical relevance/similarity score based on structured engineering metadata. It is NOT a scientifically validated prediction."
    }
