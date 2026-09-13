"""Serve HarborLens without any third-party dependency."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse
import os

parser = argparse.ArgumentParser()
parser.add_argument("--port", type=int, default=8000)
args = parser.parse_args()
os.chdir(Path(__file__).resolve().parents[1] / "frontend")
print(f"HarborLens running at http://localhost:{args.port}")
ThreadingHTTPServer(("", args.port), SimpleHTTPRequestHandler).serve_forever()
