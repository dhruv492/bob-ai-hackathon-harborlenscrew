# Source Code

All HarborLens source code lives under `src/`, following the template's monorepo convention for applications with separate frontend and backend concerns.

```text
src/
├── .env.example                 # Production integration variable template
├── README.md                    # This source map
├── frontend/                    # Browser application
│   ├── index.html               # Dashboard shell
│   ├── styles.css               # Responsive design system
│   └── app.js                   # Risk, plan, scenario, and brief logic
├── backend/                     # Server and future data adapters
│   └── server.py                # Dependency-free local HTTP server
└── bob-skills/                  # IBM Bob project workflow
    └── port-operations.md
```

## Run locally

From the repository root:

```powershell
python src/backend/server.py
```

The backend serves `src/frontend/` at `http://localhost:8000`. The prototype has no package installation or environment-variable requirement.

Verify the backend independently at `http://localhost:8000/health`.

## Extension boundary

Keep browser UI and deterministic planning logic in `frontend/`. Add authenticated terminal, AIS, weather, labor, or optimization integrations to `backend/` so the presentation layer remains independent of production data providers.
