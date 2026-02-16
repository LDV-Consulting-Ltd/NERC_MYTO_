"""
SLC header signature: detect candidate pages by MYTO Service Level Commitment table header.
Do NOT rely on Appendix or section titles. Candidate = >= 4 distinct token matches (PyMuPDF text only).
"""
from __future__ import annotations
import re
from typing import Any

import fitz  # pymupdf

# Case-insensitive regex tokens (spec): distinct matches count
SLC_HEADER_TOKENS = [
    re.compile(r"S\s*/?\s*N", re.I),
    re.compile(r"BAND", re.I),
    re.compile(r"FEEDER\s+NAME", re.I),
    re.compile(r"DESCRIPTION\s+OF\s+FEEDER\s+LOCATION", re.I),
    re.compile(r"NAME\s+OF\s+MAJOR\s+STREETS", re.I),
    re.compile(r"MIN\.?\s+SUPPLY\s+DURATION", re.I),
]

MIN_MATCHES_CANDIDATE = 4


def score_page_text(text: str) -> tuple[int, list[str]]:
    """
    Return (match_count, list of matched token patterns by name).
    Count DISTINCT token matches (each pattern at most once).
    """
    if not text or not text.strip():
        return 0, []
    matched = []
    for tok in SLC_HEADER_TOKENS:
        if tok.search(text):
            matched.append(tok.pattern)
    return len(matched), matched


def get_signature_per_page(
    data: bytes,
) -> list[dict[str, Any]]:
    """
    Open PDF with PyMuPDF; for each page get_text("text") (no OCR).
    Return list of {
        page_no: 1-based,
        header_signature_score: int,
        matched_tokens: list[str],
        is_candidate: bool,
    }.
    """
    out = []
    doc = fitz.open(stream=data, filetype="pdf")
    try:
        for page_index in range(len(doc)):
            page = doc[page_index]
            text = page.get_text("text") or ""
            match_count, matched_tokens = score_page_text(text)
            is_candidate = match_count >= MIN_MATCHES_CANDIDATE
            out.append({
                "page_no": page_index + 1,
                "header_signature_score": match_count,
                "matched_tokens": matched_tokens,
                "is_candidate": is_candidate,
            })
    finally:
        doc.close()
    return out


def is_image_based_page(data: bytes, page_no: int) -> bool:
    """True if page has little extractable text (len < 200). page_no is 1-based."""
    doc = fitz.open(stream=data, filetype="pdf")
    try:
        if page_no < 1 or page_no > len(doc):
            return True
        page = doc[page_no - 1]
        text = (page.get_text("text") or "").strip()
        return len(text) < 200
    finally:
        doc.close()
