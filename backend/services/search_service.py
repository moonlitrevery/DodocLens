"""Semantic search via cosine similarity."""

from __future__ import annotations

import logging

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import tuple_
from sqlalchemy.orm import Session

from models.orm import Chunk, Document
from models.schemas import SearchResultItem
from services.embeddings import embed_query, json_to_embedding

logger = logging.getLogger(__name__)

TOP_K = 5
# Cosine similarity in [-1, 1]. Short / keyword queries often sit below a strict
# cutoff with MiniLM; without a fallback the UI shows “no results” while the index is fine.
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
    q = embed_query(query).reshape(1, -1)
    rows = db.query(Chunk, Document).join(Document).all()
    if not rows:
        return []

    matrices: list[np.ndarray] = []
    meta: list[tuple[Chunk, Document]] = []
    for chunk, doc in rows:
        try:
            v = json_to_embedding(chunk.embedding_json).reshape(1, -1)
        except Exception as e:
            logger.warning("Skip chunk %s: %s", chunk.id, e)
            continue
        matrices.append(v)
        meta.append((chunk, doc))

    if not matrices:
        return []

    X = np.vstack(matrices)
    sims = cosine_similarity(q, X)[0]
    order = np.argsort(-sims)

    filtered = [int(idx) for idx in order if sims[idx] >= MIN_SCORE][:TOP_K]
    if not filtered:
        filtered = [int(i) for i in order[:TOP_K]]
        logger.info(
            "Search: no chunks above similarity %.2f; returning top-%s by score anyway",
            MIN_SCORE,
            TOP_K,
        )

    neighbor_pairs: set[tuple[int, int]] = set()
    for idx in filtered:
        ch, _doc = meta[int(idx)]
        neighbor_pairs.add((ch.document_id, ch.chunk_index))
        if ch.chunk_index > 0:
            neighbor_pairs.add((ch.document_id, ch.chunk_index - 1))
        neighbor_pairs.add((ch.document_id, ch.chunk_index + 1))
    chunk_by_key = _load_chunks_by_doc_index(db, neighbor_pairs)

    results: list[SearchResultItem] = []
    for idx in filtered:
        score = float((sims[idx] + 1) / 2)
        ch, doc = meta[int(idx)]
        context_text = ch.text
        prev_chunk = chunk_by_key.get((ch.document_id, ch.chunk_index - 1))
        next_chunk = chunk_by_key.get((ch.document_id, ch.chunk_index + 1))
        if prev_chunk:
            context_text = prev_chunk.text + "\n\n" + context_text

        if next_chunk:
            context_text = context_text + "\n\n" + next_chunk.text

        snippet = search_snippet_plain(context_text, query)

        results.append(
            SearchResultItem(
                chunk_id=ch.id,
                document_id=doc.id,
                filename=doc.filename,
                chunk_index=ch.chunk_index,
                snippet=snippet,
                full_text=context_text,
                score=score,
            )
        )
    return results
