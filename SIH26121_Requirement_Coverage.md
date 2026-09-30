# SIH26121 Requirement Coverage: NWIS Prototype Audit

This document maps the features of the **Nearby Wells Intelligence System (NWIS)** prototype to the core objectives of the SIH26121 problem statement (eRTMAC Historical Drilling Intelligence). 

---

## Requirement Mapping

### Requirement 1: Integrate Historical Offset Well Data
**NWIS Feature:** Aggregates structured data (depths, formations, events) and unstructured FWR references from historical offset wells into a searchable relational database.
**API/Service:** `GET /api/wells` | `app.db.seed` (Mock DB generator)
**Frontend Screen:** Offset Wells GIS View (`OffsetWellsPage.tsx`)
**How it is demonstrated:** Open the Map tab. The system renders offset wells within a specified radius (e.g., 20km) around the active well.

### Requirement 2: Contextual/Similar Well Identification
**NWIS Feature:** Multi-factor Well Similarity Engine that goes beyond geographic distance by weighting target depth, formation overlap, and drilling context.
**API/Service:** `GET /api/wells/{well_id}/similar` | `similarity_service.py`
**Frontend Screen:** Dashboard Metrics & Active Well Dashboard (`ActiveWellPage.tsx`)
**How it is demonstrated:** The Active Well page explicitly lists "Comparable Wells" with percentage match scores (e.g., W-087 at 92%) based on the transparent weighted formula.

### Requirement 3: Proactive Risk & Look-Ahead Alerting
**NWIS Feature:** Look-Ahead Historical Risk Alert Engine. Continuously evaluates the active well's current depth against the depth intervals of historical events recorded in similar offset wells.
**API/Service:** `GET /api/alerts/active/{well_id}` | `alert_service.py`
**Frontend Screen:** Right-hand Alert Sidebar (`DashboardPage.tsx`) and Alerts Feed (`AlertsPage.tsx`)
**How it is demonstrated:** The dashboard displays a "Lost Circulation" alert because the active well (W-104) is at 2725m, approaching a historical risk zone (2740-2780m) present in 3 comparable offset wells.

### Requirement 4: Depth & Formation Correlation
**NWIS Feature:** Normalizes historical drilling events and geological formations across multiple wells onto a single vertical depth axis.
**API/Service:** `GET /api/correlation/{well_id}` | `correlation_service.py`
**Frontend Screen:** Depth Correlation Chart (`DepthCorrelationPage.tsx`)
**How it is demonstrated:** The vertical chart visually aligns W-104 against offset wells, drawing a green "current depth" line that allows the engineer to look down the Y-axis to spot upcoming red severity blocks (historical risks).

### Requirement 5: NLP-Based Retrieval of FWR Insights
**NWIS Feature:** RAG-powered Historical Search Engine designed to extract specific drilling problems, mitigations, and outcomes from historical reports.
**API/Service:** `POST /api/ask` | `rag_service.py` | `llm_provider.py`
**Frontend Screen:** AI Historical Search Slide-out Panel (`HistoricalSearchPage.tsx`)
**How it is demonstrated:** The engineer types "What happened near 2750m?". The system returns a strictly formatted answer citing the exact offset wells, depths, FWR documents, and historical mitigations without hallucinating.

### Requirement 6: Decision Support & Accountability
**NWIS Feature:** Strict systemic constraints ensuring the AI acts only as a decision-support tool, never issuing autonomous engineering directives.
**API/Service:** System prompt inside `rag_service.py`
**Frontend Screen:** AI Search Panel and Alert Modals
**How it is demonstrated:** The AI formats its output to say "Historical reports show that W-087 used X..." rather than "You should use X." Every widget has explicit provenance tags (`Historical`, `Calculated`, `AI-Generated`).

---

## Implementation Status

### 🟢 Requirements Fully Implemented (as prototype architecture)
- Geospatial mapping of offset wells.
- Weighted similarity scoring algorithms.
- Look-ahead depth calculation and alert generation.
- Retrieval-Augmented Generation (RAG) pipeline for historical querying.
- Integrated, engineer-focused UI dashboard with data provenance labeling.

### 🟡 Requirements Partially Implemented (due to hackathon constraints)
- **Document Parsing:** The system models the *results* of parsed Final Well Reports (FWR) via the database schema, but does not include a live OCR/PDF extraction pipeline in this MVP.
- **Real-time Depth Streaming:** The active well's current depth is static (`2725m`) to facilitate the demo narrative. It simulates a WITSML stream.

### 🧪 Requirements Represented Using Synthetic Data
- All well coordinates, field names (e.g., Troll field), formation names (e.g., Shetland, Utsira), drilling events (Lost Circulation, Stuck Pipe), and mitigation steps are completely synthetic and seeded via `app.db.seed`.

### 🛢️ Features Requiring Real Oil India Data
- True subsurface validation of the similarity engine's weights.
- Exact geological formation mappings specific to Oil India's operational blocks (e.g., Assam-Arakan basin).
- Live WITSML streaming for the active well depth and trajectory.

---

## Limitations
1. **Mock LLM Provider:** By default, the application runs on a deterministic template engine (`MockProvider`) to ensure flawless local execution without relying on paid OpenAI/Azure API keys.
2. **2D Geospatial Distance:** The similarity engine uses Haversine surface distance. It does not map complex 3D directional drilling trajectories.
3. **Stateless Operations:** User interactions (like dismissing an alert) are handled in React state and will reset upon page refresh. 

## Future Improvements (Post-Hackathon)
1. **WITSML Integration:** Hook the API into standard E&P real-time data streams to update the active well depth dynamically.
2. **Enterprise Vector DB:** Migrate historical FWR text chunks into a true vector database (e.g., `pgvector`) for advanced semantic search capabilities.
3. **On-Premise LLM:** Swap the LLM provider to a locally hosted open-weight model (e.g., Llama 3) to comply with data residency and security protocols.
