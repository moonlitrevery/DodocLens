"""Background pipeline: extract → normalize → chunk → embed → persist."""

from __future__ import annotations

import logging
from pathlib import Path

from sqlalchemy.orm import Session

from database.connection import SessionLocal
from models.orm import Chunk, Document
from services.chunking import chunk_by_words
from services.chroma_client import get_chroma_collection
from services.embeddings import embed_texts
from services.text_extraction import extract_text
from utils.text import normalize_text

logger = logging.getLogger(__name__)


def _translate_processing_error(msg: str) -> str:
    low = msg.lower()
    if "tesseract is not installed or it's not in your path" in low:
        return (
            "O Tesseract não está instalado ou não está no PATH. "
            "Consulte o README para instruções de instalação."
        )
    return msg


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

        old_ids = [
            str(c.id)
            for c in db.query(Chunk).filter(Chunk.document_id == doc.id).all()
        ]
        db.query(Chunk).filter(Chunk.document_id == doc.id).delete()
        db.flush()

        chunks_text = chunk_by_words(normalized)
        if not chunks_text:
            if old_ids:
                get_chroma_collection().delete(ids=old_ids)
            doc = db.get(Document, document_id)
            if doc:
                doc.status = "ready"
                doc.error_message = None
                db.commit()
            return

        vectors = embed_texts(chunks_text)
        chunk_objects: list[Chunk] = []
        for i, text in enumerate(chunks_text):
            ch = Chunk(document_id=doc.id, chunk_index=i, text=text)
            chunk_objects.append(ch)
            db.add(ch)
        db.flush()

        collection = get_chroma_collection()
        try:
            collection.add(
                ids=[str(c.id) for c in chunk_objects],
                embeddings=vectors.tolist(),
                metadatas=[
                    {
                        "chunk_id": c.id,
                        "document_id": doc.id,
                        "chunk_index": c.chunk_index,
                    }
                    for c in chunk_objects
                ],
            )
            if old_ids:
                collection.delete(ids=old_ids)
        except Exception as chroma_err:
            logger.exception("ChromaDB write failed for document %s", document_id)
            db.rollback()
            doc = db.get(Document, document_id)
            if doc:
                doc.status = "error"
                doc.error_message = _translate_processing_error(str(chroma_err))[
                    :2000
                ]
                db.commit()
            return

        doc = db.get(Document, document_id)
        if doc:
            doc.status = "ready"
            doc.error_message = None
            db.commit()
    except Exception as e:
        logger.exception("Processing failed for document %s", document_id)
        try:
            db.rollback()
        except Exception:
            pass
        doc = db.get(Document, document_id)
        if doc:
            doc.status = "error"
            doc.error_message = _translate_processing_error(str(e))[:2000]
            db.commit()
    finally:
        db.close()
