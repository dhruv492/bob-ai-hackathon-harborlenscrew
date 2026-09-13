# Setup guide

## Prerequisites

- Python 3.9 or later
- A modern browser
- Optional: IBM Bob, for the guided investigation workflow described below

## Run locally

From the repository root:

```powershell
python src/backend/server.py
```

Open `http://localhost:8000`. No package installation, account, or external API is required for the prototype.

## Verify

1. Confirm the **Operational picture** shows four metrics and a vessel risk queue.
2. Move **Weather severity** to `Severe` and select **Apply scenario**.
3. Confirm that risk scores and the 72-hour plan update.
4. Select **Generate shift brief** and confirm that it cites vessel IDs from the current plan.

## IBM Bob workflow

Open this repository in IBM Bob and add the content of `src/bob-skills/port-operations.md` as a project skill, or attach it to a chat. Ask: `Use the port-operations skill to review the current HarborLens plan and draft a BLUF shift brief. Cite only data visible in the app or source.` Bob can inspect the deterministic calculation in `src/frontend/app.js` before drafting its response.

## Environment variables

The demo needs none. `src/.env.example` is intentionally present for a production data-adapter configuration.

## Troubleshooting

| Issue | Resolution |
| --- | --- |
| `python` is not found | Install Python 3 and ensure it is on PATH, then retry. |
| Port 8000 is busy | Run `python src/backend/server.py --port 8080` and open `http://localhost:8080`. |
| Blank page | Open browser developer tools and hard-refresh; the app has no build step. |
| Bob invents operational details | Reattach the skill and instruct Bob to cite only the generated plan data. |
