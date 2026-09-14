"""HarborLens FastAPI application — serves frontend + REST API."""
import sys
from pathlib import Path

# Ensure backend directory is on sys.path for sibling imports
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import uvicorn

from sqlalchemy import text, inspect

from database import engine, Base
import models
from routes import router as vessel_router
from auth_routes import router as auth_router


def _ensure_vessel_user_id():
    """Upgrade shared-fleet schema to per-user ownership."""
    insp = inspect(engine)
    if "vessels" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("vessels")}
    dialect = engine.dialect.name
    with engine.begin() as conn:
        if "user_id" not in cols:
            if dialect == "sqlite":
                # recreate handled by create_all on fresh sqlite; skip complex alter
                pass
            else:
                conn.execute(text("ALTER TABLE vessels ADD COLUMN user_id INTEGER"))
                conn.execute(
                    text(
                        "UPDATE vessels SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1) "
                        "WHERE user_id IS NULL"
                    )
                )
                conn.execute(text("DELETE FROM vessels WHERE user_id IS NULL"))
                try:
                    conn.execute(text("ALTER TABLE vessels ALTER COLUMN user_id SET NOT NULL"))
                except Exception:
                    pass
        if dialect == "postgresql":
            conn.execute(text("ALTER TABLE vessels DROP CONSTRAINT IF EXISTS vessels_vessel_id_key"))
            conn.execute(text("DROP INDEX IF EXISTS ix_vessels_vessel_id"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_vessels_vessel_id ON vessels (vessel_id)"))
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_user_vessel_id ON vessels (user_id, vessel_id)"
                )
            )
        elif dialect == "sqlite":
            # SQLite cannot easily drop unique indexes from old schema; wipe if still global-unique
            try:
                conn.execute(
                    text(
                        "INSERT INTO vessels (user_id, vessel_id, eta, berth, cargo, priority, dwell, cranes, utilization) "
                        "VALUES (-1, '__probe__', '0', 'B', 'x', 'Standard', 1, 1, 1)"
                    )
                )
                conn.execute(text("DELETE FROM vessels WHERE vessel_id = '__probe__'"))
                conn.execute(
                    text(
                        "INSERT INTO vessels (user_id, vessel_id, eta, berth, cargo, priority, dwell, cranes, utilization) "
                        "VALUES (-2, '__probe__', '0', 'B', 'x', 'Standard', 1, 1, 1)"
                    )
                )
                conn.execute(text("DELETE FROM vessels WHERE vessel_id = '__probe__'"))
            except Exception:
                conn.execute(text("DELETE FROM vessels"))
                # table may still have unique; recreate by dropping
                conn.execute(text("DROP TABLE IF EXISTS vessels"))
                Base.metadata.create_all(bind=engine)


# Create tables on startup if they don't exist
Base.metadata.create_all(bind=engine)
_ensure_vessel_user_id()

app = FastAPI(title="HarborLens", version="2.0.0")

# --- API routes ---
app.include_router(vessel_router)
app.include_router(auth_router)


@app.get("/health")
def health_check():
    """Backward-compatible health endpoint."""
    return JSONResponse({"status": "ok", "service": "harborlens-backend"})


# --- Serve frontend static files (must be last) ---
FRONTEND_DIR = Path(__file__).resolve().parents[1] / "frontend"
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    print(f"HarborLens running at http://localhost:{args.port}")
    uvicorn.run(app, host="0.0.0.0", port=args.port)
