# Backend

This folder contains the local development server and the boundary for future production integrations.

- `server.py` - dependency-free Python HTTP server for the frontend and `/health` check

The current prototype calculates plans in the browser against synthetic data. A production backend can add authenticated terminal, AIS, weather, and labor-feed adapters here without changing the frontend contract.
