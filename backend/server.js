const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// HARDENED: RISK_1 — startup validation crashes fast on missing config
const REQUIRED_ENV_VARS = [
  'OPENAI_API_KEY',
  'MONGO_URI',
  'JWT_SECRET',
];

const OPTIONAL_ENV_VARS_WITH_DEFAULTS = {
  'PORT': '5000',
  'REDIS_HOST': '127.0.0.1',
  'REDIS_PORT': '6379',
  'ANALYSIS_CACHE_TTL': '600',
  'RATE_LIMIT_MAX_REQUESTS': '20',
  'NODE_ENV': 'development'
};

// Apply defaults for optional vars
Object.entries(OPTIONAL_ENV_VARS_WITH_DEFAULTS).forEach(([key, defaultVal]) => {
  if (!process.env[key]) {
    process.env[key] = defaultVal;
    console.log(`[Config] ${key} not set, using default: ${defaultVal}`);
  }
});

// Crash fast on missing required vars
const missingVars = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error('FATAL: Missing required environment variables:', missingVars.join(', '));
  console.error('Server cannot start without these. Check your .env file or Docker environment.');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET is too short — minimum 32 characters required for security.');
  process.exit(1);
}

if (process.env.JWT_SECRET === 'darkscan_dev_secret_change_in_production') {
  console.error('FATAL: JWT_SECRET is the insecure default. Set a real random secret.');
  process.exit(1);
}

// Validate OPENAI_API_KEY format (must start with sk-)
if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
  console.error('FATAL: OPENAI_API_KEY appears invalid — must start with sk-');
  process.exit(1);
}

console.log('[Config] Environment validated successfully');
console.log(`[Config] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[Config] OpenAI key present: sk-...${process.env.OPENAI_API_KEY.slice(-4)}`);

const authRoutes = require('./routes/auth');
const analyzeRoutes = require('./routes/analyze');

const app = express();
const server = http.createServer(app);

const mongoose = require('mongoose');

// Middleware
app.use(cors());
// HARDENED: RISK_2 — reduced body limit to 5MB to prevent OOM on small VPS
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Database connection
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/darkscan';
mongoose.connect(mongoUri)
  .then(() => console.log('[MongoDB] Connected successfully'))
  .catch((err) => console.error('[MongoDB] Connection error:', err));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', analyzeRoutes);

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

// FIXED: BLOCKER_2 — WebSocket now initialized via websocketService, single source of truth
const wsService = require('./services/websocketService');
wsService.initWebSocketServer(server);
