"""Semantic search via ChromaDB vector similarity."""

from __future__ import annotations

import logging

from sqlalchemy import tuple_
from sqlalchemy.orm import Session

from models.orm import Chunk, Document
from models.schemas import SearchResultItem
from services.chroma_client import get_chroma_collection
from services.embeddings import embed_texts

logger = logging.getLogger(__name__)

TOP_K = 5
# Short / keyword queries often sit below a strict cutoff with MiniLM; without a fallback
# the UI shows “no results” while the index is fine.
MIN_SCORE = 0.28


def search_snippet_plain(text: str, query: str, window: int = 200) -> str:
    """Short plain-text window around the first query-term hit (UI highlights in React)."""
    lower_text = text.lower()
    start_idx = 0
    for term in query.lower().split():
        if not term:
            continue
        idx = lower_text.find(term)
        if idx != -1:
            start_idx = idx
            break
    start = max(0, start_idx - window)
    end = min(len(text), start_idx + window)
    return text[start:end]


def _load_chunks_by_doc_index(
    db: Session, pairs: set[tuple[int, int]]
) -> dict[tuple[int, int], Chunk]:
    if not pairs:
        return {}
    rows = (
        db.query(Chunk)
        .filter(tuple_(Chunk.document_id, Chunk.chunk_index).in_(list(pairs)))
        .all()
    )
    return {(c.document_id, c.chunk_index): c for c in rows}


def semantic_search(db: Session, query: str) -> list[SearchResultItem]:
    collection = get_chroma_collection()
    query_vec = embed_texts([query])[0].tolist()

    raw = collection.query(
        query_embeddings=[query_vec],
        n_results=10,
        include=["distances", "metadatas"],
    )

    ids_batch = raw.get("ids") or []
    dist_batch = raw.get("distances") or []
    if not ids_batch or not ids_batch[0]:
        return []

    ids_str: list[str] = list(ids_batch[0])
    distances: list[float | None] = list(dist_batch[0]) if dist_batch else []

    ranked: list[tuple[int, float]] = []
    for i, sid in enumerate(ids_str):
        dist = distances[i] if i < len(distances) else None
        if dist is None:
            continue
        try:
            similarity = 1.0 - (float(dist) / 2.0)
        except (TypeError, ValueError):
            continue
        try:
            cid = int(sid)
        except ValueError:
            continue
        ranked.append((cid, similarity))

    if not ranked:
        return []

    filtered = [(cid, s) for cid, s in ranked if s >= MIN_SCORE][:TOP_K]
    if not filtered:
        filtered = ranked[:TOP_K]
        logger.info(
            "Search: no chunks above similarity %.2f; returning top-%s by score anyway",
            MIN_SCORE,
            TOP_K,
        )

    chunk_ids = [cid for cid, _s in filtered]
    chunks = db.query(Chunk).filter(Chunk.id.in_(chunk_ids)).all()
    chunk_by_id = {c.id: c for c in chunks}
    scores = {cid: s for cid, s in filtered}

    neighbor_pairs: set[tuple[int, int]] = set()
    for cid, _s in filtered:
        ch = chunk_by_id.get(cid)
        if not ch:
            continue
        neighbor_pairs.add((ch.document_id, ch.chunk_index))
        if ch.chunk_index > 0:
            neighbor_pairs.add((ch.document_id, ch.chunk_index - 1))
        neighbor_pairs.add((ch.document_id, ch.chunk_index + 1))
    chunk_by_key = _load_chunks_by_doc_index(db, neighbor_pairs)

    results: list[SearchResultItem] = []
    for cid, score in filtered:
        ch = chunk_by_id.get(cid)
        if not ch:
            continue
        doc = db.get(Document, ch.document_id)
        if not doc:
            continue

        context_text = ch.text
        prev_chunk = chunk_by_key.get((ch.document_id, ch.chunk_index - 1))
        next_chunk = chunk_by_key.get((ch.document_id, ch.chunk_index + 1))
        if prev_chunk:
            context_text = prev_chunk.text + "\n\n" + context_text
        if next_chunk:
            context_text = context_text + "\n\n" + next_chunk.text

        snippet = search_snippet_plain(context_text, query)
        sim_score = float(scores.get(cid, score))

        results.append(
            SearchResultItem(
                chunk_id=ch.id,
                document_id=doc.id,
                filename=doc.filename,
                chunk_index=ch.chunk_index,
                snippet=snippet,
                full_text=context_text,
                score=sim_score,
            )
        )
    return results
