const { createServer } = require("http");
const next = require("next");
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    // Set larger body size limit for upload endpoints
    if (req.url && req.url.startsWith('/api/upload')) {
      // Allow 5GB for upload endpoints
      req.socket.setMaxListeners(20); // Increase event listeners
    }
    handle(req, res);
  });

  // Configure server with larger limits
  server.maxRequestSize = '5gb';
  server.maxHeaderSize = 16 * 1024 * 1024; // 16MB headers
  
  server.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Next.js production server running on http://10.0.4.106:3000');
    console.log("> Max request body size: 5GB");
  });
});
