from pathlib import Path
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import landscape
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "presentation" / "slides.pdf"
W, H = 1280, 720
BLUE, NAVY, INK, MUTED, PALE, RED = map(HexColor, ["#0F62FE", "#001D6C", "#161616", "#525252", "#EDF5FF", "#DA1E28"])

def text(c, value, x, y, size=20, color=INK, font="Helvetica", max_width=None, leading=None):
    c.setFont(font, size); c.setFillColor(color)
    leading = leading or size * 1.25
    words, line, lines = value.split(), "", []
    if not max_width:
        lines = [value]
    else:
        for word in words:
            candidate = (line + " " + word).strip()
            if c.stringWidth(candidate, font, size) <= max_width: line = candidate
            else: lines.append(line); line = word
        if line: lines.append(line)
    for line in lines:
        c.drawString(x, y, line); y -= leading
    return y

def footer(c, number):
    c.setStrokeColor(HexColor("#DDE1E6")); c.line(64, 38, W-64, 38)
    text(c, "HarborLens prototype | Synthetic operational data | IBM Bob Hackathon 2026", 64, 20, 10, MUTED)
    text(c, str(number).zfill(2), W-85, 20, 10, MUTED, "Helvetica-Bold")

def title(c, kicker, heading, number):
    text(c, kicker.upper(), 64, H-72, 11, BLUE, "Helvetica-Bold")
    text(c, heading, 64, H-128, 30, INK, "Helvetica-Bold", max_width=1120, leading=37)
    footer(c, number)

def bullet(c, value, x, y, width):
    c.setFillColor(BLUE); c.circle(x, y+5, 4, fill=1, stroke=0)
    return text(c, value, x+18, y, 17, INK, max_width=width, leading=25) - 12

OUT.parent.mkdir(exist_ok=True)
c = Canvas(str(OUT), pagesize=(W,H))

# 1 cover
c.setFillColor(NAVY); c.rect(0,0,W,H,fill=1,stroke=0)
c.setFillColor(BLUE); c.rect(0,0,18,H,fill=1,stroke=0)
text(c, "IBM BOB HACKATHON 2026", 80, 590, 13, HexColor("#A6C8FF"), "Helvetica-Bold")
text(c, "HarborLens", 80, 460, 65, white, "Helvetica-Bold")
text(c, "Explainable port congestion planning for the next 72 hours", 82, 402, 25, white)
text(c, "Port operations copilot | AI track", 82, 120, 16, HexColor("#C6C6C6"))
text(c, "Team: HarborLens Crew", 82, 86, 14, HexColor("#C6C6C6"))
text(c, "Synthetic demo data. Human approval remains required.", 82, 52, 11, HexColor("#A6C8FF"))
c.showPage()

# 2 problem
title(c, "Problem", "Congestion appears after the useful action window", 2)
text(c, "Port supervisors coordinate vessel arrivals, berth capacity, crane availability, and priority cargo across disconnected schedules and spreadsheets.", 64, 500, 22, MUTED, max_width=830, leading=31)
for label, body, x in [
    ("Fragmented inputs", "Schedules show events, but not the operational trade-offs between vessels.", 64),
    ("Cascading delays", "A late vessel or reduced berth capacity can create queue pressure across the shift.", 430),
    ("Priority cargo", "Cold-chain and connection-sensitive loads require a defensible response before they wait offshore.", 796),
]:
    c.setFillColor(PALE); c.roundRect(x, 210, 315, 160, 12, fill=1, stroke=0)
    text(c, label, x+22, 330, 18, NAVY, "Helvetica-Bold")
    text(c, body, x+22, 290, 15, INK, max_width=268, leading=22)
text(c, "Challenge context: 2021 LA/Long Beach backlog exceeded 100 ships, with an estimated $10B supply-chain cost.", 64, 145, 13, MUTED)
text(c, "Source: Industry Problem Statements 2026, Logistics and Ports L1", 64, 118, 11, MUTED)
c.showPage()

# 3 solution
title(c, "Solution", "A transparent recommendation engine for the supervisor's shift", 3)
steps = [("1", "Ingest snapshot", "Vessel schedules, berth capacity, cargo urgency, and disruption settings."), ("2", "Score risk", "Deterministic scoring exposes utilization, dwell, urgency, and scenario drivers."), ("3", "Plan response", "A compatible berth sequence and crane allocation create a 72-hour operating plan."), ("4", "Brief with Bob", "IBM Bob reviews grounded context and drafts an auditable BLUF shift brief.")]
for i,(n,head,body) in enumerate(steps):
    y = 495 - i*90
    c.setFillColor(BLUE); c.circle(92,y+10,19,fill=1,stroke=0)
    text(c,n,86,y+3,16,white,"Helvetica-Bold")
    text(c,head,135,y+10,19,INK,"Helvetica-Bold")
    text(c,body,350,y+10,15,MUTED,max_width=770)
text(c, "The prototype never controls terminal systems. Supervisors review recommendations before any action.", 64, 105, 15, RED, "Helvetica-Bold")
c.showPage()

# 4 product
title(c, "Working prototype", "Risk queue, what-if simulation, and grounded shift brief", 4)
img = ROOT / "demo" / "screenshots" / "01-home-dashboard.png"
c.drawImage(ImageReader(str(img)), 64, 100, width=920, height=400, preserveAspectRatio=True, anchor='sw')
text(c, "Evidence in code", 1020, 545, 18, NAVY, "Helvetica-Bold")
y = 475
for item in ["Explainable risk drivers", "Berth and crane recommendation", "Weather, capacity, and ETA scenario", "Bob-ready structured briefing context"]:
    y = bullet(c,item,1025,y,190)
c.showPage()

# 5 architecture and impact
title(c, "Architecture and impact", "Deterministic planning plus IBM Bob investigation", 5)
text(c, "HarborLens keeps calculations and the narrative aligned by using the same computed plan for the dashboard and Bob context.", 64, 505, 21, MUTED, max_width=1050)
items=[("Web application", "Renders synthetic schedule data, risk queue, scenario controls, and plan."), ("Risk and plan engine", "Ranks risk and assigns compatible berths with transparent logic."), ("IBM Bob skill", "Guides codebase investigation and produces a cited BLUF brief without inventing facts.")]
for i,(head,body) in enumerate(items):
    x=64+i*390
    c.setStrokeColor(HexColor("#A6C8FF")); c.setLineWidth(2); c.roundRect(x,250,340,170,12,fill=0,stroke=1)
    text(c,head,x+22,375,19,NAVY,"Helvetica-Bold")
    text(c,body,x+22,335,15,INK,max_width=290,leading=22)
text(c, "Next step: connect authenticated terminal, AIS, weather, and labor feeds while preserving human approval and plan audit history.", 64, 155, 17, INK, "Helvetica-Bold", max_width=1050)
c.save()
print(OUT)
