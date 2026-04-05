const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const analyzeRoutes = require('./routes/analyze');

const app = express();
const server = http.createServer(app);

const mongoose = require('mongoose');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database connection
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/darkscan';
mongoose.connect(mongoUri)
  .then(() => console.log('[MongoDB] Connected successfully'))
  .catch((err) => console.error('[MongoDB] Connection error:', err));

// Routes
app.use('/api/v1', analyzeRoutes);

// WebSocket Setup
const wss = new WebSocketServer({ server, path: '/ws' });
app.locals.wss = wss; // Expose to controllers

wss.on('connection', (ws, req) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'register' && data.sessionId) {
        ws.sessionId = data.sessionId;
      }
    } catch (e) {
      console.error('WS parse error', e);
    }
  });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, 'public');
  app.use(express.static(publicPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(publicPath, 'index.html'));
    }
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
