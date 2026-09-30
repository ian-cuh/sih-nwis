"""
RAG Service – Retrieval-Augmented Generation

Pipeline:
  1. Parse user query → structured filters (search_service)
  2. Retrieve matching events from DB (search_service)
  3. Build a context block from retrieved evidence
  4. Pass context + question to LLM provider
  5. Return structured response with answer + evidence + citations

IMPORTANT:
  - The LLM is ONLY used for summarisation, NOT for fact generation.
  - All facts come from the database. The LLM reformats them.
  - If no evidence is found, the system says so explicitly.
  - Every answer includes source citations.
"""

from sqlalchemy.orm import Session
from typing import Dict, Any, List
from app.services.search_service import parse_query, search_events, search_wells_by_query
from app.services.llm_provider import get_provider


def ask(question: str, db: Session) -> Dict[str, Any]:
    """
    Full RAG pipeline: parse → retrieve → generate → cite.
    """
    provider = get_provider()

    # Step 1: Parse the query
    parsed = parse_query(question)

    # Step 2: Retrieve evidence from DB
    events, filters_applied = search_events(parsed, db)
    relevant_wells = search_wells_by_query(parsed, db)

    # Step 3: Build context block for LLM
    context = _build_context(events)

    # Step 4: Generate response
    system_prompt = (
        "You are an AI assistant specifically for NWIS (Nearby Wells Intelligence System). "
        "You help drilling engineers understand historical events from offset wells based ONLY "
        "on the available NWIS dataset.\n\n"
        "RULES:\n"
        "1. ONLY use information from the HISTORICAL EVIDENCE provided below.\n"
        "2. NEVER fabricate events, depths, formations, or wells.\n"
        "3. If no evidence is provided, say: 'No supporting historical evidence was found "
        "in the current dataset.'\n"
        "4. DO NOT allow unsupported engineering recommendations or give direct advice. "
        "Instead of saying 'You should increase mud weight', you MUST say 'Historical reports "
        "show that W-087 used X during a similar event.' The engineer remains responsible for the decision.\n"
        "5. For every response, structure your output exactly as follows:\n"
        "   - Answer (concise summary)\n"
        "   - Supporting wells\n"
        "   - Depths\n"
        "   - Event details\n"
        "   - Source documents\n"
    )

    user_prompt = (
        f"--- HISTORICAL EVIDENCE ---\n"
        f"{context}\n"
        f"--- END EVIDENCE ---\n\n"
        f"--- USER QUESTION ---\n"
        f"{question}"
    )

    answer_text = provider.generate(system_prompt, user_prompt)

    # Step 5: Build structured response
    return {
        "question": question,
        "answer": answer_text,
        "query_understanding": {
            "parsed_filters": parsed,
            "filters_applied": filters_applied,
        },
        "evidence": events,
        "relevant_wells": relevant_wells,
        "evidence_count": len(events),
        "provider": {
            "name": provider.provider_name(),
            "is_mock": provider.is_mock(),
        },
        "disclaimer": (
            "This response is generated from historical drilling records in the NWIS "
            "database. It is a decision-support tool and does not replace professional "
            "engineering judgement. All cited events are from offset well records."
        ),
    }


def search(question: str, db: Session) -> Dict[str, Any]:
    """
    Structured search only (no LLM). Returns matching events + wells.
    """
    parsed = parse_query(question)
    events, filters_applied = search_events(parsed, db)
    relevant_wells = search_wells_by_query(parsed, db)

    return {
        "question": question,
        "query_understanding": {
            "parsed_filters": parsed,
            "filters_applied": filters_applied,
        },
        "results": events,
        "relevant_wells": relevant_wells,
        "result_count": len(events),
    }


def _build_context(events: List[Dict[str, Any]]) -> str:
    """Format retrieved events into a structured text block for the LLM."""
    if not events:
        return "(No historical events matched this query.)"

    lines = []
    for i, ev in enumerate(events, 1):
        source_ref = ""
        if ev.get("source_document"):
            source_ref = f"  Source: {ev['source_document']['filename']} ({ev['source_document']['document_type']})"

        lines.append(
            f"[EVENT {i}]\n"
            f"- Well: {ev['well_name']} ({ev['well_field']} Field)\n"
            f"- Event type: {ev['event_type']}\n"
            f"- Depth: {ev['depth_from']:.1f} – {ev['depth_to']:.1f} m\n"
            f"- Formation: {ev['formation_name']}\n"
            f"- Severity: {ev['severity']}\n"
            f"- Description: {ev['description']}\n"
            f"- Cause: {ev['cause']}\n"
            f"- Mitigation: {ev['mitigation']}\n"
            f"- Outcome: {ev['outcome']}\n"
            f"{source_ref}"
        )

    return "\n\n".join(lines)
