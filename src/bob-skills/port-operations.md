# HarborLens port operations investigator

## Purpose

Use this skill when a HarborLens supervisor needs an auditable operations brief or wants to understand why a vessel recommendation changed.

## Grounding rules

1. Inspect `src/frontend/app.js` before explaining a score or assignment.
2. Treat data shown by HarborLens as a scenario, not live terminal truth.
3. Do not invent weather, berth, cargo, carrier, or regulatory facts.
4. Cite vessel IDs and visible risk drivers for every recommended action.
5. Never present a recommendation as an autonomous control instruction; request supervisor confirmation for execution.

## Workflow

1. Summarize the current operational picture in BLUF format (three sentences maximum).
2. Identify the top three risks, each with score, drivers, and consequence.
3. Validate recommendations against the deterministic `calculateRisk` and `createPlan` logic.
4. Produce a 72-hour action list ordered by urgency.
5. End with assumptions, data gaps, and the next human decision.

## Output format

Use headings: `BLUF`, `Priority actions`, `Why these actions`, `Assumptions and checks`. Keep it concise and state when evidence is absent.
