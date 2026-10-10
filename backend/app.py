"""
Python API Server for Social Media Analytics
Team: White Walkers
Provides REST endpoints for sentiment analysis and dataset processing.
Runs with Python standard library (no pip install required) or Flask if installed.
"""

import json
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Import local analyzer module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analyzer import analyze_sentiment, batch_analyze_posts, extract_trending_keywords


class AnalyticsHTTPRequestHandler(BaseHTTPRequestHandler):

    def _set_cors_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_cors_headers(204)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in ["/health", "/", "/api/health"]:
            self._set_cors_headers(200)
            res = {
                "status": "healthy",
                "service": "Social Media Analytics Python API",
                "team": "White Walkers",
                "version": "1.0.0"
            }
            self.wfile.write(json.dumps(res).encode("utf-8"))
        else:
            self._set_cors_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

    def do_POST(self):
        parsed = urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)

        if parsed.path in ["/analyze", "/api/analyze"]:
            try:
                body = json.loads(post_data.decode("utf-8"))
                if "text" in body and isinstance(body["text"], str):
                    # Single text analysis
                    result = analyze_sentiment(body["text"])
                    self._set_cors_headers(200)
                    self.wfile.write(json.dumps(result).encode("utf-8"))
                elif "posts" in body and isinstance(body["posts"], list):
                    # Batch post analysis
                    result = batch_analyze_posts(body["posts"])
                    self._set_cors_headers(200)
                    self.wfile.write(json.dumps(result).encode("utf-8"))
                else:
                    self._set_cors_headers(400)
                    self.wfile.write(json.dumps({"error": "Invalid request: provide 'text' string or 'posts' array"}).encode("utf-8"))
            except Exception as e:
                self._set_cors_headers(500)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        else:
            self._set_cors_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

    def log_message(self, format, *args):
        # Clean logging format
        sys.stderr.write(f"[White Walkers Python Server] {args[0]} {args[1]} -> {args[2]}\n")


def run(port=5000):
    server_address = ("0.0.0.0", port)
    httpd = HTTPServer(server_address, AnalyticsHTTPRequestHandler)
    print(f"==================================================")
    print(f"  White Walkers Social Media Analytics API Server")
    print(f"  Running on: http://localhost:{port}")
    print(f"  Endpoints: /health, /analyze")
    print(f"==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    run(port)
