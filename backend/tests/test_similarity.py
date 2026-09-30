import pytest
from app.services.similarity_service import calculate_similarity, DEFAULT_WEIGHTS
from app.models.domain import Well

def test_calculate_similarity():
    # Mock data
    active_well = Well(
        id=1, name="W-104", field="Troll", latitude=60.30, longitude=2.10,
        total_depth=3500.0, trajectory="Vertical", well_type="Exploration"
    )
    offset_well = Well(
        id=2, name="W-087", field="Troll", latitude=60.31, longitude=2.12,
        total_depth=3400.0, trajectory="Deviated", well_type="Development"
    )

    active_formations = {"shetland", "cromer knoll"}
    offset_formations = {"shetland", "hordaland"}

    res = calculate_similarity(active_well, offset_well, active_formations, offset_formations)
    
    assert res["well_id"] == 2
    assert res["well_name"] == "W-087"
    assert "overall_score" in res
    assert len(res["components"]) == 5

    # Check component logic
    comps = {c["name"]: c for c in res["components"]}
    
    # Formation: 1 intersection ("shetland"), 3 union -> 33.3%
    assert round(comps["Formation"]["score"]) == 33
    
    # Depth: 3400 / 3500 = 97.1%
    assert round(comps["Depth Overlap"]["score"]) == 97
    
    # Trajectory: Vertical vs Deviated = 0 (Mismatch)
    assert comps["Trajectory"]["score"] == 0.0
    
    # Context: Same field (50), Different type (0) = 50.0
    assert comps["Drilling Context"]["score"] == 50.0

def test_identical_well():
    well = Well(
        id=1, name="W-1", field="F1", latitude=0.0, longitude=0.0,
        total_depth=1000.0, trajectory="Vertical", well_type="T1"
    )
    forms = {"a", "b"}
    res = calculate_similarity(well, well, forms, forms)
    
    # Exact same well should score 100% on everything
    assert res["overall_score"] == 100.0
