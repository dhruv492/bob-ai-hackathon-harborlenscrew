# Solution overview

HarborLens converts a small operational snapshot into a ranked decision queue and berth plan. Each vessel receives an explainable score from four signals: schedule pressure, cargo urgency, berth utilization, and active disruption. The app assigns the highest-priority compatible vessel to the earliest feasible berth slot, then exposes the resulting constraints in plain language.

The differentiator is traceability. A risk score alone is not a recommendation, so every alert contains its drivers and suggested action. A supervisor can alter weather severity, remove a berth, or delay arrivals, then compare the new plan with the baseline.

## IBM Bob workflow

The `src/bob-skills/port-operations.md` file is a reusable IBM Bob skill. It tells Bob how to inspect this codebase, validate the plan data, and produce a BLUF-style shift brief without inventing facts. The app's **Bob-ready brief** panel emits a bounded, structured context that the skill can consume. This makes Bob useful for investigation and narrative synthesis while the deterministic engine remains the source of operational calculations in `src/frontend/app.js`.

## User journey

1. Open the dashboard and review the risk queue.
2. Inspect a vessel's labeled risk drivers and recommended action.
3. Simulate a disruption or capacity loss.
4. Apply the scenario and review the revised berth plan.
5. Generate a grounded shift brief, or ask IBM Bob to investigate the plan using the included skill.
