"""HarborLens FastAPI application — serves frontend + REST API."""
import sys
from pathlib import Path

# Ensure backend directory is on sys.path for sibling imports
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import uvicorn

from database import engine, Base
import models
from routes import router as vessel_router
from auth_routes import router as auth_router

# Create tables on startup if they don't exist
Base.metadata.create_all(bind=engine)

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
