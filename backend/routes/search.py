"""POST /search — semantic similarity over chunk embeddings."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.connection import get_db
from models.schemas import SearchRequest, SearchResponse
from services.search_service import semantic_search

router = APIRouter()


@router.post("/search", response_model=SearchResponse)
def search(body: SearchRequest, db: Session = Depends(get_db)):
    results = semantic_search(db, body.query.strip())
    return SearchResponse(results=results)
