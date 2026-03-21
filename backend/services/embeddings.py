"""Local sentence-transformers embedding model (singleton)."""

from __future__ import annotations

import json
import logging
import threading
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
_model_lock = threading.Lock()
_model = None


def get_model():
    global _model
    with _model_lock:
        if _model is None:
            from sentence_transformers import SentenceTransformer

            logger.info("Loading embedding model: %s", _MODEL_NAME)
            _model = SentenceTransformer(_MODEL_NAME)
        return _model


def embed_texts(texts: list[str]) -> np.ndarray:
    model = get_model()
    return np.asarray(model.encode(texts, show_progress_bar=False, convert_to_numpy=True))


def embed_query(query: str) -> np.ndarray:
    return embed_texts([query])[0]


def embedding_to_json(vec: np.ndarray) -> str:
    return json.dumps(vec.astype(float).tolist())


def json_to_embedding(s: str) -> np.ndarray:
    return np.asarray(json.loads(s), dtype=np.float64)
