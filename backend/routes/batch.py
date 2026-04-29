"""POST /upload/batch — queue multiple local files for processing."""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.connection import get_db
from models.orm import Document
from models.schemas import DocumentSummary
from services.file_storage import save_upload
from services.processing import process_document

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_BATCH_FILES = 200
ALLOWED_SUFFIXES = {".pdf", ".txt", ".png", ".jpg", ".jpeg"}
MIME_BY_SUFFIX = {
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}


class BatchUploadRequest(BaseModel):
    paths: list[str]


class BatchUploadResponse(BaseModel):
    queued: int
    skipped: int
    documents: list[DocumentSummary]


def _is_duplicate(db: Session, file_path: Path) -> bool:
    size = file_path.stat().st_size
    rows = db.query(Document).filter(Document.filename == file_path.name).all()
    for row in rows:
        existing_path = Path(row.stored_path)
        if not existing_path.exists():
            continue
        try:
            if existing_path.stat().st_size == size:
                return True
        except OSError:
            continue
    return False


@router.post("/upload/batch", response_model=BatchUploadResponse)
def upload_batch(
    payload: BatchUploadRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if len(payload.paths) > MAX_BATCH_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"No máximo {MAX_BATCH_FILES} arquivos por importação.",
        )

    queued_docs: list[Document] = []
    skipped = 0
    for raw_path in payload.paths:
        p = Path(raw_path)
        if not p.is_absolute() or not p.exists() or not p.is_file():
            skipped += 1
            continue
        suffix = p.suffix.lower()
        if suffix not in ALLOWED_SUFFIXES:
            skipped += 1
            continue
        if _is_duplicate(db, p):
            skipped += 1
            continue

        data = p.read_bytes()
        if not data:
            skipped += 1
            continue
        stored = save_upload(p.name, data)
        doc = Document(
            filename=p.name,
            stored_path=str(stored.resolve()),
            mime_type=MIME_BY_SUFFIX[suffix],
            status="pending",
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        queued_docs.append(doc)
        background_tasks.add_task(process_document, doc.id)
        logger.info("Queued batch document id=%s path=%s", doc.id, stored)

    return BatchUploadResponse(
        queued=len(queued_docs),
        skipped=skipped,
        documents=[DocumentSummary.model_validate(d) for d in queued_docs],
    )
