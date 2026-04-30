"""ChromaDB persistent client + collection singleton (vectors only)."""

from __future__ import annotations

import logging
import threading
from pathlib import Path

import chromadb

logger = logging.getLogger(__name__)

_chroma_lock = threading.Lock()
_chroma_client = None
_chroma_collection = None


def get_chroma_collection():
    global _chroma_client, _chroma_collection
    with _chroma_lock:
        if _chroma_collection is None:
            chroma_dir = Path(__file__).resolve().parent.parent / "data" / "chroma"
            _chroma_client = chromadb.PersistentClient(path=str(chroma_dir))
            _chroma_collection = _chroma_client.get_or_create_collection(
                name="dodoclens_chunks",
                metadata={"hnsw:space": "cosine"},
                embedding_function=None,
            )
            logger.info("ChromaDB collection ready at %s", chroma_dir)
        return _chroma_collection
