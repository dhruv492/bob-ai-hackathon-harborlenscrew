"""Serve HarborLens without any third-party dependency."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse
import json
import os


class HarborLensHandler(SimpleHTTPRequestHandler):
    """Serve the frontend and expose a minimal backend health check."""

    def do_GET(self):
        if self.path == "/health":
            payload = json.dumps({"status": "ok", "service": "harborlens-backend"}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        super().do_GET()


parser = argparse.ArgumentParser()
parser.add_argument("--port", type=int, default=8000)
args = parser.parse_args()
os.chdir(Path(__file__).resolve().parents[1] / "frontend")
print(f"HarborLens running at http://localhost:{args.port}")
ThreadingHTTPServer(("", args.port), HarborLensHandler).serve_forever()
