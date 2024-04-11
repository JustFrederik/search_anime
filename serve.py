import http.server
import socketserver
DIRECTORY = "./"
PORT = 8082

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        super().do_GET()

httpd = socketserver.TCPServer(("0.0.0.0", PORT), MyHandler)
print("Server started on ", PORT)
httpd.serve_forever()
