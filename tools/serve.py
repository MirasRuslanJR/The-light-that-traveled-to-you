"""Local preview server that never lets the browser cache anything.

Usage: python tools/serve.py [port]   (default 5173), then open http://127.0.0.1:5173
Plain `python -m http.server` lets browsers keep old copies of index.html and the scripts,
so a reload can show yesterday's site. This one sends Cache-Control: no-store on every file.
"""
import functools
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    handler = functools.partial(NoCacheHandler, directory=root)
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"Serving {root} at http://127.0.0.1:{port} (no caching)")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
