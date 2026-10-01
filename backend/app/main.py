from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import health, endpoints

app = FastAPI(
    title="eRTMAC-NWIS API",
    description="Nearby Wells Intelligence System for Drilling Operations",
    version="0.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(endpoints.router, prefix="/api", tags=["data"])
