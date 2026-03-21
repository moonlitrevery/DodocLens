"""Background pipeline: extract → normalize → chunk → embed → persist."""

from __future__ import annotations

import logging
from pathlib import Path

from sqlalchemy.orm import Session

from database.connection import SessionLocal
from models.orm import Chunk, Document
from services.chunking import chunk_by_words
from services.embeddings import embed_texts, embedding_to_json
from services.text_extraction import extract_text
from utils.text import normalize_text

logger = logging.getLogger(__name__)


def process_document(document_id: int) -> None:
    db: Session = SessionLocal()
    try:
        doc = db.get(Document, document_id)
        if not doc:
            return
        doc.status = "processing"
        db.commit()

        path = Path(doc.stored_path)
        raw = extract_text(path, doc.mime_type)
        normalized = normalize_text(raw)
        doc.extracted_text_preview = normalized[:4000] if normalized else None

        chunks_text = chunk_by_words(normalized)
        if not chunks_text:
            doc.status = "ready"
            db.query(Chunk).filter(Chunk.document_id == doc.id).delete()
            db.commit()
            return

        vectors = embed_texts(chunks_text)
        db.query(Chunk).filter(Chunk.document_id == doc.id).delete()
        for i, text in enumerate(chunks_text):
            emb = embedding_to_json(vectors[i])
            db.add(
                Chunk(
                    document_id=doc.id,
                    chunk_index=i,
                    text=text,
                    embedding_json=emb,
                )
            )
        doc.status = "ready"
        doc.error_message = None
        db.commit()
    except Exception as e:
        logger.exception("Processing failed for document %s", document_id)
        db.rollback()
        doc = db.get(Document, document_id)
        if doc:
            doc.status = "error"
            doc.error_message = str(e)[:2000]
            db.commit()
    finally:
        db.close()
