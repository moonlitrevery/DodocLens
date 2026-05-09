"""GET /documents, GET /documents/{id}, DELETE /documents/{id}."""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from database.connection import get_db
from models.orm import Chunk, Document
from models.schemas import DocumentDetail, DocumentSummary
from services.chroma_client import get_chroma_collection

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/documents", response_model=list[DocumentSummary])
def list_documents(db: Session = Depends(get_db)):
    rows = db.query(Document).order_by(Document.created_at.desc()).all()
    return rows


@router.get("/documents/{document_id}", response_model=DocumentDetail)
def get_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")
    return doc


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")

    chunk_ids = [
        str(row[0])
        for row in db.query(Chunk.id).filter(Chunk.document_id == document_id).all()
    ]
    if chunk_ids:
        get_chroma_collection().delete(ids=chunk_ids)

    stored = Path(doc.stored_path)
    db.delete(doc)
    db.commit()

    try:
        if stored.is_file():
            stored.unlink()
    except OSError as exc:
        logger.warning("Could not delete upload file %s: %s", stored, exc)

    return Response(status_code=204)
