"""Text normalization utilities."""

import re
import unicodedata


def normalize_text(raw: str) -> str:
    if not raw:
        return ""
    # Unicode normalize and collapse whitespace
    text = unicodedata.normalize("NFKC", raw)
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
