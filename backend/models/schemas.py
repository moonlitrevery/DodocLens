"""Pydantic request/response schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class DocumentSummary(BaseModel):
    id: int
    filename: str
    mime_type: str
    status: str
    error_message: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentDetail(DocumentSummary):
    extracted_text_preview: str | None = None


class SearchResultItem(BaseModel):
    chunk_id: int
    document_id: int
    filename: str
    chunk_index: int
    snippet: str
    full_text: str = Field(
        description="Complete chunk text (snippet is a shortened preview)."
    )
    score: float = Field(description="Cosine similarity in [0, 1]")


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)


class SearchResponse(BaseModel):
    results: list[SearchResultItem]
