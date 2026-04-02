"""Persist uploaded files under backend/data/uploads."""

import uuid
from pathlib import Path

from database.connection import DATA_DIR

UPLOADS_DIR = DATA_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def save_upload(filename: str, data: bytes) -> Path:
    safe_stem = Path(filename).name.replace("..", "_")
    unique = f"{uuid.uuid4().hex}_{safe_stem}"
    dest = UPLOADS_DIR / unique
    dest.write_bytes(data)
    return dest
