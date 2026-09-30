from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class DataSource(Base):
    __tablename__ = 'data_sources'
    id = Column(Integer, primary_key=True, index=True)
    organization = Column(String, index=True)
    dataset_name = Column(String)
    official_url = Column(String)
    country = Column(String)
    data_type = Column(String)
    access_date = Column(DateTime)
    license = Column(String)
    description = Column(Text)
    
    files = relationship("DataFile", back_populates="source")
    wells = relationship("Well", back_populates="source")

class DataFile(Base):
    __tablename__ = 'data_files'
    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey('data_sources.id'))
    filename = Column(String)
    file_type = Column(String)
    download_date = Column(DateTime)
    
    source = relationship("DataSource", back_populates="files")
    documents = relationship("Document", back_populates="data_file")

class Well(Base):
    __tablename__ = 'wells'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    field = Column(String, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    spud_date = Column(DateTime, nullable=True)
    completion_date = Column(DateTime, nullable=True)
    total_depth = Column(Float)
    current_depth = Column(Float)
    well_type = Column(String)
    trajectory = Column(String) # e.g., 'Vertical', 'Deviated', 'Horizontal'
    status = Column(String)
    is_synthetic = Column(Boolean, default=True) # Explicitly mark synthetic data
    
    source_id = Column(Integer, ForeignKey('data_sources.id'), nullable=True)
    source = relationship("DataSource", back_populates="wells")
    
    formations = relationship("Formation", back_populates="well")
    events = relationship("DrillingEvent", back_populates="well")
    documents = relationship("Document", back_populates="well")

class Formation(Base):
    __tablename__ = 'formations'
    id = Column(Integer, primary_key=True, index=True)
    well_id = Column(Integer, ForeignKey('wells.id'), index=True)
    name = Column(String, index=True)
    depth_from = Column(Float)
    depth_to = Column(Float)
    
    well = relationship("Well", back_populates="formations")

class Document(Base):
    __tablename__ = 'documents'
    id = Column(Integer, primary_key=True, index=True)
    well_id = Column(Integer, ForeignKey('wells.id'), index=True)
    data_file_id = Column(Integer, ForeignKey('data_files.id'), nullable=True)
    filename = Column(String)
    document_type = Column(String)
    date = Column(DateTime, nullable=True)
    page = Column(Integer, nullable=True)
    extracted_text = Column(Text)
    source_path = Column(String)
    
    well = relationship("Well", back_populates="documents")
    data_file = relationship("DataFile", back_populates="documents")
    events = relationship("DrillingEvent", back_populates="source_document")

class DrillingEvent(Base):
    __tablename__ = 'drilling_events'
    id = Column(Integer, primary_key=True, index=True)
    well_id = Column(Integer, ForeignKey('wells.id'), index=True)
    source_document_id = Column(Integer, ForeignKey('documents.id'), nullable=True)
    
    event_type = Column(String, index=True)
    depth_from = Column(Float)
    depth_to = Column(Float)
    formation_name = Column(String)
    severity = Column(String)
    
    description = Column(Text)
    cause = Column(Text)
    mitigation = Column(Text)
    outcome = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    well = relationship("Well", back_populates="events")
    source_document = relationship("Document", back_populates="events")

class Alert(Base):
    __tablename__ = 'alerts'
    id = Column(Integer, primary_key=True, index=True)
    active_well_id = Column(Integer, ForeignKey('wells.id'), index=True)
    alert_type = Column(String)
    depth_from = Column(Float)
    depth_to = Column(Float)
    severity = Column(String)
    reason = Column(Text)
    evidence = Column(JSON) # e.g. list of historical event IDs
    status = Column(String) # Active, Resolved, Ignored
    created_at = Column(DateTime, default=datetime.utcnow)

class SimilarityResult(Base):
    __tablename__ = 'similarity_results'
    id = Column(Integer, primary_key=True, index=True)
    active_well_id = Column(Integer, ForeignKey('wells.id'), index=True)
    offset_well_id = Column(Integer, ForeignKey('wells.id'), index=True)
    total_score = Column(Float)
    distance_score = Column(Float)
    formation_score = Column(Float)
    depth_score = Column(Float)
    trajectory_score = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
