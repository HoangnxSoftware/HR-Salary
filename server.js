import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// In AI Studio / Cloud Run with reverse proxy (Nginx on 8080), the Node app must listen on 3000
const defaultPort = 3000;
const configuredPort = process.env.APP_PORT 
  ? parseInt(process.env.APP_PORT, 10) 
  : (process.env.PORT && process.env.PORT !== '8080' ? parseInt(process.env.PORT, 10) : defaultPort);

const targetPort = isNaN(configuredPort) ? defaultPort : configuredPort;

const distDir = path.join(__dirname, 'dist');

// Health check endpoints for Cloud Run / load balancers
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Serve static files from dist
app.use(express.static(distDir));
app.use('/HR-Salary', express.static(distDir));

// Fallback to index.html for client-side SPA routing
app.get('*', (req, res) => {
  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('<!doctype html><html><head><meta charset="utf-8"><title>App Loading</title></head><body><h3>Ứng dụng đang khởi động. Vui lòng tải lại trang sau giây lát...</h3><script>setTimeout(() => window.location.reload(), 3000);</script></body></html>');
  }
});

const startServer = (port) => {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Application server running on http://0.0.0.0:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (port !== defaultPort) {
        console.warn(`Port ${port} is in use, falling back to default port ${defaultPort}...`);
        startServer(defaultPort);
      } else {
        console.error(`Port ${port} is already in use. Server could not be started.`);
      }
    } else {
      console.error('Server error:', err);
    }
  });
};

startServer(targetPort);
