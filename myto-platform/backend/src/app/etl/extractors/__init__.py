"""PDF table extractors. Heavy deps (pymupdf, camelot) are loaded lazily."""

__all__ = ["pymupdf_tables", "camelot_tables"]


def __getattr__(name: str):
    if name == "pymupdf_tables":
        from app.etl.extractors import pymupdf_tables as mod

        return mod
    if name == "camelot_tables":
        from app.etl.extractors import camelot_tables as mod

        return mod
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
