# Enhanced build prompt

A desktop-first web command dashboard for port shift supervisors, designed to convert vessel schedules and berth constraints into confident, explainable 72-hour actions. The tone is operational, calm, and precise - never a generic analytics dashboard.

**DESIGN SYSTEM (REQUIRED):**

- Platform: responsive web, desktop-first
- Theme: light, high-trust industrial operations interface with generous whitespace
- Background: Mist White (#F7F9FC)
- Primary accent: IBM Blue (#0F62FE) for primary actions and active states
- Risk accent: Signal Amber (#F1C21B) for attention; Alert Red (#DA1E28) for critical conditions
- Success: Evergreen (#198038) for recommended capacity
- Text: Carbon (#161616), secondary Slate (#525252)
- Surfaces: white cards, 12px radius, subtle border (#DDE1E6), no decorative gradients
- Typography: IBM Plex Sans or system sans-serif; tabular numerals for schedules

**Page structure:**

1. **Command header:** HarborLens identity, operational timestamp, scenario selector, concise status.
2. **Decision summary:** fleet risk, berth utilization, delayed vessels, and a primary "Generate shift brief" action.
3. **Risk queue:** sortable vessel cards with arrival windows, risk indicator, causal factors, and recommended response.
4. **Berth plan:** a visual 72-hour assignment table showing berth, vessel, crane count, and confidence.
5. **What-if studio:** controls for weather severity, unavailable capacity, and arrival delay; apply changes without losing baseline.
6. **IBM Bob brief:** grounded narrative based only on the visible structured plan, with citations back to vessel identifiers.
7. **Accessibility:** keyboard-reachable controls, visible focus, text labels beside every status color, sufficient contrast.

Implement as a functional prototype using realistic synthetic port data. Keep the risk math deterministic and expose the drivers so a supervisor can challenge every recommendation.

---

Tip: This repository intentionally treats this prompt as its compact design-system source of truth.
