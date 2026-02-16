from fastapi import APIRouter

router = APIRouter()
# Discover is internal to pipeline; no standalone public endpoint.
# Use POST /v1/runs to start a full run.
