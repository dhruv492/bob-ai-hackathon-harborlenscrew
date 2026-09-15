# Screenshots

Capture these three screenshots after running `python src/backend/server.py` and signing in.

## 01 — Home Dashboard (`01-home-dashboard.png`)

**URL:** `http://localhost:8000/dashboard.html`  
**What to show:** Full dashboard with the new SVG ring gauges visible on vessel cards, the fleet utilization bar chart panel below the 4 metrics, and the vessel priority queue showing Critical/Watch level badges.  
**Suggested state:** Baseline plan (no scenario applied).

## 02 — Scenario Studio with Diff (`02-scenario-studio.png`)

**URL:** `http://localhost:8000/dashboard.html`  
**What to show:** Set Weather → Severe, Unavailable berths → 1, Arrival variance → 6h. Click **Apply scenario**. Capture the yellow-highlighted diff rows in the Berth Plan table (showing struck-through old berths → new berths and ▲/▼ score deltas), and the red "Stress active" chip in the What-If Studio panel.  
**Suggested state:** After clicking "Apply scenario" so the diff banner and row highlights are visible.

## 03 — IBM Bob-Ready Brief (`03-bob-ready-brief.png`)

**URL:** `http://localhost:8000/dashboard.html`  
**What to show:** Click **Generate shift brief** (with stress scenario still active). Capture the new two-column polished brief panel showing: timestamp + "⚠ Stress scenario active" badge, BLUF paragraph, numbered priority action rows with risk pills, and the Top-3 Risk Vessels table with mini ring gauges.  
**Suggested state:** Stress scenario active so the brief shows critical content and the stress badge.

---

The application is local-first — screenshots must be captured from the running app before final submission.
