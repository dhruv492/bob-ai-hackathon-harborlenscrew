# HarborLens: Explainable Port Congestion Copilot

HarborLens turns a changing vessel schedule into an explainable 72-hour operating plan for port shift supervisors. It ranks congestion risk, recommends berth and crane assignments, and gives IBM Bob structured, grounded context for an auditable shift brief.

---

## Team

| Field | Value |
|---|---|
| **Team Name** | HarborLens Crew |
| **Track** | AI |
| **Team Lead** | Dhruv Patel    -  24ce077@charusat.edu.in  |
| **Members** | 1. Kavya Patel   -  24aiml038@charusat.edu.in|
|               2. Tirth Kakadia -  25aiml025@charusat.edu.in|
|               3. Om Patel      -  25cs074@charusat.edu.in  |

---

## Problem Statement

Port planners coordinate vessel arrivals, berth capacity, cranes, and priority cargo through fragmented schedules and spreadsheets. This makes it difficult to identify the next operational conflict before vessels begin queuing and cold-chain or connection-sensitive cargo is exposed to delay.

---

## Solution

HarborLens uses deterministic, explainable risk calculation to rank vessels by schedule pressure, cargo urgency, berth utilization, and disruption conditions. It produces a constrained 72-hour berth sequence and a grounded shift brief that IBM Bob can investigate through the included project skill.

---

## Key Features

- **Explainable risk scoring:** Every score states the utilization, priority, and scenario conditions that drove it.
- **Constraint-aware planning:** Compatible berths and cranes are sequenced for high-risk vessels first.
- **Scenario simulation:** Operators can test weather, capacity, and ETA changes without losing the baseline plan.
- **IBM Bob investigation workflow:** `src/bob-skills/port-operations.md` guides Bob to validate data and write a cited BLUF brief.

---

## Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | JavaScript, HTML, CSS, Python |
| **Frameworks** | Python standard-library HTTP server |
| **IBM Technologies** | IBM Bob, IBMid authentication |
| **Databases** | None in prototype |
| **Other** | GitHub Actions, Mermaid, ReportLab |

---

## Repository Structure

```text
.
├── submission.yaml          # Structured submission metadata
├── README.md                # Project overview
├── src/                     # Application source code
│   ├── .env.example         # Production adapter variable template
│   ├── README.md            # Frontend/backend source map
│   ├── frontend/            # Browser application
│   └── backend/             # Server and future data adapters
│   └── bob-skills/          # IBM Bob project skill
├── docs/                    # Written documentation
│   ├── problem-statement.md
│   ├── solution-overview.md
│   ├── architecture.md
│   ├── setup-guide.md
│   └── template-guide.md
├── demo/                    # Demo artifacts
│   ├── demo-video-link.txt
│   ├── live-demo-url.txt
│   └── screenshots/         # Three running-app captures
├── presentation/            # slides.pdf and format guidance
├── CONTRIBUTING.md          # Submission instructions
└── .github/workflows/       # Template validation workflow
```

---

## How to Run

```powershell
# 1. Clone the repository
git clone https://github.com/dhruv492/bob-ai-hackathon-harborlenscrew.git
cd bob-ai-hackathon-harborlenscrew

# 2. Run the dependency-free local server
python src/backend/server.py
```

Open `http://localhost:8000`. Full prerequisites, verification steps, IBM Bob workflow, and troubleshooting are in [docs/setup-guide.md](docs/setup-guide.md).

---

## Documentation

- [Problem statement](docs/problem-statement.md)
- [Solution overview](docs/solution-overview.md)
- [Architecture](docs/architecture.md)
- [Setup guide](docs/setup-guide.md)
- [Template guide](docs/template-guide.md)
- [IBM Bob skill](src/bob-skills/port-operations.md)

---

## Demo

| Artifact | Link |
|---|---|
| Demo Video | [demo/demo-video-link.txt](demo/demo-video-link.txt) |
| Live Demo | [demo/live-demo-url.txt](demo/live-demo-url.txt) |
| Screenshots | [demo/screenshots/](demo/screenshots/) |
| Presentation | [presentation/slides.pdf](presentation/slides.pdf) |

---

## Known Limitations

- The prototype uses synthetic data and a transparent heuristic rather than a production-grade optimization solver.
- A production system needs authenticated terminal, AIS, weather, and labor feeds.
- Supervisors must approve operational actions; the prototype does not control terminal systems.

---

## What We're Most Proud Of

HarborLens makes recommendations challengeable. The operator sees why a vessel is risky, can apply a scenario, and receives a revised plan and Bob-ready brief that cite the same underlying data.
