from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db import get_db
from app.api.routes.metadata import DATASETS
from app.api.schemas import envelope

router = APIRouter(tags=["Agent"])


class AgentQueryInput(BaseModel):
    question: str
    scope: str = "latest"  # latest | run_id
    run_id: str | None = None
    disco: str | None = None


@router.post("/query")
async def agent_query(body: AgentQueryInput, db: AsyncSession = Depends(get_db)):
    """Return: answer + referenced datasets/columns + optional SQL + optional API URL suggestions."""
    msg = (body.question or "").strip().lower()
    answer = ""
    referenced_datasets = []
    referenced_columns = []
    sql_suggestion = None
    api_url_suggestions = []

    if "dataset" in msg or "schema" in msg or "table" in msg:
        answer = "Available datasets: " + ", ".join(d["name"] for d in DATASETS) + ". Use GET /v1/metadata/datasets and GET /v1/metadata/datasets/{name}/schema for column definitions."
        referenced_datasets = [d["name"] for d in DATASETS[:5]]
    elif "dq" in msg or "quality" in msg:
        answer = "Data quality is in silver.service_level_commitments_dq. Use GET /v1/dq/summary for score and GET /v1/dq/issues for failing records."
        referenced_datasets = ["silver.service_level_commitments_dq"]
        api_url_suggestions = ["/v1/dq/summary", "/v1/dq/issues"]
    elif "run" in msg or "pipeline" in msg:
        answer = "Pipeline: discover -> download -> extract -> silver_transform -> silver_geocode -> gold_build -> promote_latest. POST /v1/runs to start, GET /v1/runs for history."
        referenced_datasets = ["bronze.etl_run", "bronze.etl_stage"]
        api_url_suggestions = ["/v1/runs", "POST /v1/runs"]
    elif "min_supply" in msg or "supply hours" in msg:
        answer = "min_supply_hours is the minimum supply hours commitment per feeder/location. Stored in silver.service_level_commitments_geo and gold.fact_supply_commitment."
        referenced_columns = ["min_supply_hours"]
        sql_suggestion = "SELECT disco_code, feeder_name, min_supply_hours FROM silver.service_level_commitments_geo_latest LIMIT 10;"
        api_url_suggestions = ["/v1/latest/commitments", "/v1/layers/silver/commitments"]
    else:
        answer = "Ask about datasets, schema, DQ, pipeline runs, or supply commitments. I can suggest SQL and API URLs."

    data = {
        "answer": answer,
        "referenced_datasets": referenced_datasets,
        "referenced_columns": referenced_columns,
        "sql_suggestion": sql_suggestion,
        "api_url_suggestions": api_url_suggestions,
    }
    return envelope(data, count=1)
