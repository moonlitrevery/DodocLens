"""Semantic search via cosine similarity."""

from __future__ import annotations

import logging

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session

from models.orm import Chunk, Document
from models.schemas import SearchResultItem
from services.embeddings import embed_query, json_to_embedding
import re

logger = logging.getLogger(__name__)

TOP_K = 5
# Cosine similarity in [-1, 1]. Short / keyword queries often sit below a strict
# cutoff with MiniLM; without a fallback the UI shows “no results” while the index is fine.
MIN_SCORE = 0.28

def highlight_text(text: str, query: str, window: int = 200) -> str:
    query_terms = query.lower().split()

    lower_text = text.lower()
    start_idx = 0

    for term in query_terms:
        idx = lower_text.find(term)
        if idx != -1:
            start_idx = idx
            break

    start = max(0, start_idx - window)
    end = min(len(text), start_idx + window)

    snippet = text[start:end]

    for term in query_terms:
        snippet = re.sub(
            f"({re.escape(term)})",
            r"<mark>\1</mark>",
            snippet,
            flags=re.IGNORECASE,
        )

    return snippet


def semantic_search(db: Session, query: str) -> list[SearchResultItem]:
    q = embed_query(query).reshape(1, -1)
    rows = db.query(Chunk, Document).join(Document).limit(1000).all()
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

    results: list[SearchResultItem] = []
    for idx in filtered:
        score = float((sims[idx] + 1) / 2)
        ch, doc = meta[int(idx)]
        context_text = ch.text
        prev_chunk = (
            db.query(Chunk)
            .filter(
                Chunk.document_id == ch.document_id,
                Chunk.chunk_index == ch.chunk_index - 1,
            )
            .first()
        )
        next_chunk = (
            db.query(Chunk)
            .filter(
                Chunk.document_id == ch.document_id,
                Chunk.chunk_index == ch.chunk_index + 1,
            )
            .first()
        )
        if prev_chunk:
            context_text = prev_chunk.text + "\n\n" + context_text

        if next_chunk:
            context_text = context_text + "\n\n" + next_chunk.text

        snippet = highlight_text(context_text, query)

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
