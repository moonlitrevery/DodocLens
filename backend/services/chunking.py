"""Split normalized text into overlapping word chunks (~400 words, 300–500 range)."""

from __future__ import annotations

TARGET_WORDS = 400
OVERLAP_WORDS = 50


def chunk_by_words(text: str) -> list[str]:
    words = text.split()
    if not words:
        return []

    chunks: list[str] = []
    start = 0
    n = len(words)
    while start < n:
        end = min(start + TARGET_WORDS, n)
        piece = words[start:end]
        chunks.append(" ".join(piece))
        if end >= n:
            break
        start = max(0, end - OVERLAP_WORDS)

    return [c for c in chunks if c.strip()]
