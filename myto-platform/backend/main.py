"""
Vercel / local entry shim.

Ensures `src/` is on sys.path so `app.main:app` resolves when the process
cwd is `myto-platform/backend` (Docker, uvicorn, or Vercel FastAPI service).
"""
from __future__ import annotations

import sys
from pathlib import Path

_src = Path(__file__).resolve().parent / "src"
if str(_src) not in sys.path:
    sys.path.insert(0, str(_src))

from app.main import app  # noqa: E402

__all__ = ["app"]
