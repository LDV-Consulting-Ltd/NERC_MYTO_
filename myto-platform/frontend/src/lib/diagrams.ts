/**
 * Mermaid diagram definitions for Architecture + Lineage page.
 * Rendered by MermaidDiagram component with optional animated edges.
 */

export const MEDALLION_DIAGRAM = `
flowchart LR
  %% Styles
  classDef stage fill:#FFFFFF,stroke:#0B2A3C,stroke-width:1px,rx:8,ry:8,color:#0B2A3C;
  classDef schema fill:#F7FAFC,stroke:#0B2A3C,stroke-width:1px,rx:10,ry:10,color:#0B2A3C;
  classDef table fill:#FFFFFF,stroke:#5B6B76,stroke-width:1px,rx:8,ry:8,color:#0B2A3C;
  classDef ext fill:#FFFFFF,stroke:#0F4C75,stroke-width:1px,rx:8,ry:8,color:#0B2A3C;

  subgraph SRC["Sources"]
    A["NERC MYTO category pages<br/>/resource-category/myto/page/{n}"]:::ext
    B["PDF links<br/>/wp-content/uploads/.../*.pdf"]:::ext
  end

  subgraph STG["Pipeline Stages (ELT)"]
    D["discover"]:::stage --> E["download"]:::stage --> F["extract"]:::stage --> G["silver_transform"]:::stage --> H["silver_geocode"]:::stage --> I["gold_build"]:::stage --> J["promote_latest"]:::stage
  end

  subgraph BR["bronze schema (raw/staging)"]:::schema
    BR1["bronze.etl_run"]:::table
    BR2["bronze.etl_stage"]:::table
    BR3["bronze.etl_event"]:::table
    BR4["bronze.pdf_registry"]:::table
    BR5["bronze.pdf_artifact"]:::table
    BR6["bronze.pdf_table_raw"]:::table
  end

  subgraph SI["silver schema (transform/enrich)"]:::schema
    SI1["silver.service_level_commitments"]:::table
    SI2["silver.service_level_commitments_dq"]:::table
    SI3["silver.geocode_cache"]:::table
    SI4["silver.service_level_commitments_geo"]:::table
  end

  subgraph GO["gold schema (warehouse)"]:::schema
    GO1["gold.dim_disco"]:::table
    GO2["gold.dim_date"]:::table
    GO3["gold.dim_feeder"]:::table
    GO4["gold.dim_location"]:::table
    GO5["gold.fact_supply_commitment"]:::table
  end

  subgraph LA["latest snapshot (serving)"]:::schema
    L1["silver.service_level_commitments_geo_latest"]:::table
    L2["gold.fact_supply_commitment_latest"]:::table
  end

  A --> D
  B --> E
  D --> BR4
  E --> BR5
  F --> BR6
  G --> SI1
  G --> SI2
  H --> SI3
  H --> SI4
  I --> GO1
  I --> GO2
  I --> GO3
  I --> GO4
  I --> GO5
  J --> L1
  J --> L2
`.trim();

export const LINEAGE_DIAGRAM = `
flowchart LR
  classDef node fill:#FFFFFF,stroke:#0B2A3C,stroke-width:1px,rx:8,ry:8,color:#0B2A3C;
  classDef tbl fill:#FFFFFF,stroke:#5B6B76,stroke-width:1px,rx:8,ry:8,color:#0B2A3C;
  classDef api fill:#FFFFFF,stroke:#0F4C75,stroke-width:1px,rx:8,ry:8,color:#0B2A3C;
  classDef ui fill:#FFFFFF,stroke:#C9A24A,stroke-width:1px,rx:10,ry:10,color:#0B2A3C;

  S1["NERC MYTO list pages"]:::node --> P1["PDF URLs"]:::node

  P1 --> BRREG["bronze.pdf_registry"]:::tbl
  P1 --> BRART["bronze.pdf_artifact"]:::tbl
  P1 --> BRRAW["bronze.pdf_table_raw"]:::tbl

  BRRAW --> SILSLC["silver.service_level_commitments"]:::tbl
  SILSLC --> SILDQ["silver.service_level_commitments_dq"]:::tbl
  SILSLC --> GEOCACHE["silver.geocode_cache"]:::tbl
  GEOCACHE --> SILGEO["silver.service_level_commitments_geo"]:::tbl

  SILGEO --> GDDISCO["gold.dim_disco"]:::tbl
  SILGEO --> GDDATE["gold.dim_date"]:::tbl
  SILGEO --> GDFEED["gold.dim_feeder"]:::tbl
  SILGEO --> GDLOC["gold.dim_location"]:::tbl
  SILGEO --> GDFACT["gold.fact_supply_commitment"]:::tbl

  GDFACT --> LATEST["latest snapshot"]:::tbl
  SILGEO --> LATEST

  LATEST --> API["REST API / Layers"]:::api
  API --> MAP["Map / Explorer"]:::ui
`.trim();

/** Gold warehouse star schema: fact in center, dimensions around. Uses Mermaid erDiagram types: int, string, decimal. */
export const STAR_SCHEMA_DIAGRAM = `
erDiagram
  fact_supply_commitment ||--o{ dim_disco : disco_key
  fact_supply_commitment ||--o{ dim_date : date_key
  fact_supply_commitment ||--o{ dim_feeder : feeder_key
  fact_supply_commitment ||--o{ dim_location : location_key
  fact_supply_commitment {
    string run_id
    int date_key
    int disco_key
    int feeder_key
    int location_key
    decimal min_supply_hours
    string source_pdf_url
    int source_page_no
  }
  dim_disco {
    int disco_key PK
    string disco_code
    string disco_name
  }
  dim_date {
    int date_key PK
    int year
    int month
    string month_name
  }
  dim_feeder {
    int feeder_key PK
    int disco_key FK
    string feeder_name
    string band
  }
  dim_location {
    int location_key PK
    string location_text_norm
    decimal lat
    decimal lon
  }
`.trim();
