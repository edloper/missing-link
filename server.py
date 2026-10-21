import http.server
import socketserver
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000  # e.g. python server.py 8001
DIRECTORY = os.path.dirname(os.path.abspath(__file__))  # Serve the folder this script is in

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_my_headers()
        http.server.SimpleHTTPRequestHandler.end_headers(self)


    def send_my_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print("serving", DIRECTORY, "at http://localhost:%d/" % PORT)
    httpd.serve_forever()
