"""
Fuzzy match location text against a list of known (location_text_norm, lat, lon).
Uses rapidfuzz; returns best match if score above threshold.
"""
from typing import Optional

try:
    from rapidfuzz import fuzz
    from rapidfuzz.process import extractOne
except ImportError:
    fuzz = None
    extractOne = None

THRESHOLD = 75


def fuzzy_match(
    location_text_norm: str,
    candidates: list[tuple[str, float, float]],
) -> Optional[tuple[float, float, float]]:
    """
    candidates: list of (location_text_norm, lat, lon).
    Returns (lat, lon, confidence 0-1) or None.
    """
    if not location_text_norm or not candidates:
        return None
    if extractOne is None:
        return None
    choices = [c[0] for c in candidates]
    result = extractOne(location_text_norm, choices, scorer=fuzz.ratio)
    if result is None or result[1] < THRESHOLD:
        return None
    best_text, score = result[0], result[1]
    lat, lon = None, None
    for c in candidates:
        if c[0] == best_text:
            lat, lon = c[1], c[2]
            break
    if lat is None:
        return None
    confidence = score / 100.0
    return (lat, lon, confidence)
