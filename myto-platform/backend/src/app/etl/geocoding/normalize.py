"""
Normalize location strings: strip noise, standardize abbreviations, retain admin hints.
"""
import re


# Common abbreviations to expand or standardize (optional)
ABBREVS = {
    "st": "street",
    "str": "street",
    "ave": "avenue",
    "rd": "road",
    "blvd": "boulevard",
    "lg": "lagos",
    "ph": "port harcourt",
    "abj": "abuja",
}


def normalize_location(text: str | None) -> str:
    if not text or not str(text).strip():
        return ""
    s = str(text).strip()
    s = re.sub(r"\s+", " ", s)
    s = s.upper()
    for ab, full in ABBREVS.items():
        s = re.sub(rf"\b{ab}\b", full.upper(), s, flags=re.I)
    s = re.sub(r"[,.]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s
