import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.domain import Well, Formation, DrillingEvent, Document, DataSource, DataFile

def seed_data():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Check if seeded
    if db.query(Well).count() > 0:
        print("Database already seeded.")
        return

    print("Seeding DataSource...")
    synthetic_source = DataSource(
        organization="NWIS Synthetic Demo",
        dataset_name="Demo Dataset",
        official_url="http://localhost",
        country="Demo",
        data_type="All",
        access_date=datetime.utcnow(),
        license="MIT",
        description="Synthetic data generated for NWIS demonstration."
    )
    db.add(synthetic_source)
    db.commit()
    
    synthetic_file = DataFile(
        source_id=synthetic_source.id,
        filename="demo_wells.csv",
        file_type="csv",
        download_date=datetime.utcnow()
    )
    db.add(synthetic_file)
    db.commit()

    print("Seeding Wells...")
    # Target demo well and specific offsets
    special_wells = [
        {"name": "W-104", "lat": 60.3, "lon": 2.1, "td": 3500.0, "cd": 2725.0, "type": "Exploration", "traj": "Vertical"},
        {"name": "W-087", "lat": 60.31, "lon": 2.12, "td": 3400.0, "cd": 3400.0, "type": "Development", "traj": "Deviated"},
        {"name": "W-091", "lat": 60.29, "lon": 2.08, "td": 3600.0, "cd": 3600.0, "type": "Development", "traj": "Vertical"},
        {"name": "W-095", "lat": 60.32, "lon": 2.09, "td": 3550.0, "cd": 3550.0, "type": "Exploration", "traj": "Deviated"},
        {"name": "W-103", "lat": 60.28, "lon": 2.11, "td": 3450.0, "cd": 3450.0, "type": "Development", "traj": "Vertical"}
    ]
    
    fields = ["Troll", "Oseberg", "Gullfaks"]
    wells = []
    
    # Add special wells
    for sw in special_wells:
        w = Well(
            name=sw["name"], field=fields[0], latitude=sw["lat"], longitude=sw["lon"],
            spud_date=datetime.utcnow() - timedelta(days=random.randint(100, 1000)),
            completion_date=datetime.utcnow() - timedelta(days=random.randint(10, 90)),
            total_depth=sw["td"], current_depth=sw["cd"], well_type=sw["type"],
            trajectory=sw["traj"], status="Active" if sw["name"] == "W-104" else "Completed",
            is_synthetic=True, source_id=synthetic_source.id
        )
        db.add(w)
        wells.append(w)
    
    # Add 15 random wells
    for i in range(15):
        w = Well(
            name=f"W-{200+i}", field=random.choice(fields),
            latitude=60.0 + random.uniform(-0.5, 0.5),
            longitude=2.0 + random.uniform(-0.5, 0.5),
            spud_date=datetime.utcnow() - timedelta(days=random.randint(100, 2000)),
            completion_date=datetime.utcnow() - timedelta(days=random.randint(10, 100)),
            total_depth=random.uniform(2500, 4500),
            current_depth=random.uniform(2500, 4500),
            well_type=random.choice(["Exploration", "Development"]),
            trajectory=random.choice(["Vertical", "Deviated", "Horizontal"]),
            status="Completed",
            is_synthetic=True, source_id=synthetic_source.id
        )
        db.add(w)
        wells.append(w)
        
    db.commit()

    print("Seeding Documents & Formations & Events...")
    event_types = ["Lost Circulation", "Stuck Pipe", "High Torque", "Vibration", "Kick/Influx", "Hole Instability", "Mud Issues", "Cementing Issues"]
    
    # For every well, add formations and events
    for well in wells:
        # Formations
        formations = [
            ("Utsira", 500, 1200),
            ("Hordaland", 1200, 2200),
            ("Rogaland", 2200, 2700),
            ("Shetland", 2700, 3100),
            ("Cromer Knoll", 3100, 3500)
        ]
        for f_name, d_from, d_to in formations:
            if d_from < well.total_depth:
                f = Formation(well_id=well.id, name=f_name, depth_from=d_from, depth_to=min(d_to, well.total_depth))
                db.add(f)
                
        # Document
        doc = Document(
            well_id=well.id, data_file_id=synthetic_file.id,
            filename=f"{well.name}_Final_Well_Report.pdf",
            document_type="Final Well Report",
            date=well.completion_date
        )
        db.add(doc)
        db.flush()
        
        # Events
        # Ensure targeted lost circulation for offset wells
        if well.name in ["W-087", "W-091", "W-095"]:
            ev = DrillingEvent(
                well_id=well.id, source_document_id=doc.id,
                event_type="Lost Circulation",
                depth_from=random.uniform(2740, 2750),
                depth_to=random.uniform(2760, 2780),
                formation_name="Shetland", severity="Severe",
                description="Complete loss of returns while drilling through fractured limestone.",
                cause="Natural fractures in the formation.",
                mitigation="Pumped 3 LCM pills (Lost Circulation Material).",
                outcome="Regained partial returns after 12 hours. Continued drilling with reduced pump rate."
            )
            db.add(ev)
            
        # Add a few random events to each well to hit 50+ total
        for _ in range(random.randint(1, 4)):
            e_type = random.choice(event_types)
            depth_f = random.uniform(1000, well.total_depth - 100)
            ev = DrillingEvent(
                well_id=well.id, source_document_id=doc.id,
                event_type=e_type,
                depth_from=depth_f,
                depth_to=depth_f + random.uniform(10, 50),
                formation_name="Unknown", severity=random.choice(["Low", "Medium", "High", "Severe"]),
                description=f"Encountered {e_type.lower()} during drilling operations.",
                cause="Synthetic demo cause.",
                mitigation="Standard operating procedures applied.",
                outcome="Issue resolved."
            )
            db.add(ev)
            
    db.commit()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_data()
