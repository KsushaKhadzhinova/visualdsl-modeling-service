import http.server
import socketserver
import json
import os
import sys

# Port must be 3000 according to platform constraints
PORT = 3000

class VisualDSLServer(http.server.SimpleHTTPRequestHandler):
    """
    Custom request handler for the VisualDSL Modeling Service.
    Serves static HTML/CSS/JS and provides a basic REST API.
    """
    
    def do_GET(self):
        # Default route to index.html
        if self.path == '/':
            self.path = '/index.html'
        
        # Log the request
        print(f"GET request for {self.path}")
        
        return super().do_GET()

    def do_POST(self):
        """Handle API requests from the frontend."""
        if self.path == '/api/parse':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                code = data.get('code', '')
                
                # Mock parsing logic for Laboratory Work requirements
                # In Lab 4/5/6 this would be a full DSL parser
                response = {
                    "status": "success",
                    "engine": "Python 3.x",
                    "metadata": {
                        "lines": len(code.split('\n')),
                        "chars": len(code),
                        "project": "VisualDSL"
                    },
                    "message": "Structure analyzed successfully by Python backend."
                }
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                # Enable CORS if needed (though serving from same port here)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                self.wfile.write(json.dumps(response).encode('utf-8'))
                
            except Exception as e:
                self.send_error(500, f"Internal Server Error: {str(e)}")
        else:
            self.send_error(404, "API Endpoint Not Found")

    def end_headers(self):
        # Adding some security and caching headers
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

if __name__ == "__main__":
    # Ensure we are in the correct directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(current_dir)
    
    print(f"--- VisualDSL Backend Starting ---")
    print(f"Python Version: {sys.version}")
    print(f"Server Port: {PORT}")
    
    try:
        # Allow reusing address to prevent "address already in use" errors during dev
        socketserver.TCPServer.allow_reuse_address = True
        with socketserver.TCPServer(("0.0.0.0", PORT), VisualDSLServer) as httpd:
            print("Server is live. Access at http://localhost:3000")
            httpd.serve_forever()
    except Exception as e:
        print(f"Failed to start server: {e}")
        sys.exit(1)
