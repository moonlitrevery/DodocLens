"""GET /documents and GET /documents/{id}."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.connection import get_db
from models.orm import Document
from models.schemas import DocumentDetail, DocumentSummary

router = APIRouter()


@router.get("/documents", response_model=list[DocumentSummary])
def list_documents(db: Session = Depends(get_db)):
    rows = (
        db.query(Document)
        .order_by(Document.created_at.desc())
        .all()
    )
    return rows


@router.get("/documents/{document_id}", response_model=DocumentDetail)
def get_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc
