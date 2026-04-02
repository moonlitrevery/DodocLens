"""
Extract text from PDF and images.

Tesseract (pytesseract):
- Windows: install from https://github.com/UB-Mannheim/tesseract/wiki
  Add install dir to PATH. If needed: pytesseract.pytesseract.tesseract_cmd =
  r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"
- macOS: brew install tesseract
- Linux: pacman -S tesseract tesseract-data-eng  (or apt install tesseract-ocr)

Fallback: if Tesseract is missing, OCR paths raise a clear error; direct PDF
text extraction still works when the PDF contains a text layer.
"""

from __future__ import annotations

import io
import logging
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image

logger = logging.getLogger(__name__)

# Minimum average chars per page to consider PDF as text-based (heuristic)
_MIN_CHARS_PER_PAGE = 30


def _ocr_image_bytes(image_bytes: bytes) -> str:
    import pytesseract

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return pytesseract.image_to_string(img, lang="eng")


def extract_from_image(path: Path) -> str:
    data = path.read_bytes()
    return _ocr_image_bytes(data)


def _pdf_text_layer(doc: fitz.Document) -> str:
    parts: list[str] = []
    for page in doc:
        parts.append(page.get_text("text") or "")
    return "\n\n".join(parts)


def _pdf_ocr_page(page: fitz.Page, dpi: int = 200) -> str:
    import pytesseract

    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    return pytesseract.image_to_string(img, lang="eng")


def extract_from_pdf(path: Path) -> str:
    doc = fitz.open(path)
    try:
        n = len(doc)
        if n == 0:
            return ""
        text = _pdf_text_layer(doc)
        normalized_len = len(text.strip())
        avg = normalized_len / max(n, 1)
        if avg >= _MIN_CHARS_PER_PAGE:
            return text
        # Likely scanned — OCR each page
        logger.info("PDF appears scanned or low text; using OCR (%s)", path.name)
        ocr_parts: list[str] = []
        for i in range(n):
            ocr_parts.append(_pdf_ocr_page(doc.load_page(i)))
        return "\n\n".join(ocr_parts)
    finally:
        doc.close()


def extract_text(path: Path, mime_type: str) -> str:
    mt = (mime_type or "").lower()
    suffix = path.suffix.lower()

    if mt.startswith("image/") or suffix in {".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"}:
        return extract_from_image(path)
    if mt == "application/pdf" or suffix == ".pdf":
        return extract_from_pdf(path)
    raise ValueError(f"Unsupported type: {mime_type}")
