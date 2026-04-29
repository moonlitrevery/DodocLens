"""POST /upload — store file and queue background processing."""

from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from database.connection import get_db
from models.orm import Document
from models.schemas import DocumentSummary
from services.file_storage import save_upload
from services.processing import process_document

logger = logging.getLogger(__name__)

router = APIRouter()

# Guardrail for in-memory upload reads (tune if you need larger PDFs).
MAX_UPLOAD_BYTES = 100 * 1024 * 1024

ALLOWED_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
}


def _normalize_mime(upload: UploadFile) -> str:
    ct = (upload.content_type or "").split(";")[0].strip().lower()
    name = (upload.filename or "").lower()
    if ct in ALLOWED_TYPES:
        return ct
    if name.endswith(".pdf"):
        return "application/pdf"
    if name.endswith(".png"):
        return "image/png"
    if name.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    return ""


@router.post("/upload", response_model=DocumentSummary)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    mime = _normalize_mime(file)
    if not mime:
        raise HTTPException(
            status_code=400,
            detail="Apenas PDF, PNG e JPG são suportados.",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Arquivo muito grande. O tamanho máximo é {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

    path = save_upload(file.filename or "document", data)
    doc = Document(
        filename=file.filename or path.name,
        stored_path=str(path.resolve()),
        mime_type=mime,
        status="pending",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    background_tasks.add_task(process_document, doc.id)
    logger.info("Queued document id=%s path=%s", doc.id, path)

    return doc
