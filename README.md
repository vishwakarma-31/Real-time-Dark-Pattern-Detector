# DarkScan - Local Development Setup

## Prerequisites

- Node.js 22+ (download from [nodejs.org](https://nodejs.org))
- MongoDB Community Edition (download from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community))
- Redis
  - Windows: install Memurai (free) from [memurai.com](https://www.memurai.com)
  - Mac: `brew install redis`
  - Linux: `sudo apt install redis-server`
- Chrome browser
- OpenAI API key from [platform.openai.com](https://platform.openai.com)

## Step 1: Clone and install dependencies

```bash
cd backend && npm install
cd ../dashboard && npm install
```

## Step 2: Environment setup

Create `backend/.env` using these values:

```env
OPENAI_API_KEY=sk-REPLACE_WITH_YOUR_REAL_KEY
MONGO_URI=mongodb://127.0.0.1:27017/darkscan
JWT_SECRET=local_dev_secret_minimum_32_characters_long_for_jwt
PORT=5000
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
NODE_ENV=development
ANALYSIS_CACHE_TTL=600
RATE_LIMIT_MAX_REQUESTS=100
VISION_DAILY_LIMIT=50
USER_DAILY_ANALYSIS_LIMIT=100
ANON_DAILY_ANALYSIS_LIMIT=20
```

## Step 3: Start local services

- MongoDB (Windows): open Services (`Win + R` -> `services.msc`) -> find MongoDB -> Start, or run `net start MongoDB` in an admin terminal
- MongoDB (Mac): `brew services start mongodb-community`
- Redis (Windows): Memurai starts as a Windows service after install
- Redis (Mac): `brew services start redis`

## Step 4: Seed a local test user

```bash
node backend/scripts/seedLocalUser.js
```

Result: creates `test@darkscan.local / test123`.

## Step 5: Generate extension icons

```bash
node extension/assets/generate_icons.js
```

Result: creates `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`.

## Step 6: Start backend API

```bash
cd backend && npm run dev
```

Expected on startup:
- `[MongoDB] Connected successfully`
- `[Redis] Reconnected successfully` (or no Redis error logs)
- `[WebSocket] initialized at /ws`

Backend runs at `http://localhost:5000`.

## Step 7: Start dashboard

```bash
cd dashboard && npm run dev
```

Dashboard runs at `http://localhost:5174`.

## Step 8: Load extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension` folder from this project
5. Confirm the DarkScan icon appears without manifest errors

## Step 9: Test end-to-end flow

1. Open `http://localhost:5174` in Chrome and log in with `test@darkscan.local / test123`
2. Visit any website (for example `amazon.in` or `booking.com`)
3. Click DarkScan extension icon and run analysis
4. Watch popup updates as DOM, NLP, and Visual detectors complete
5. Open `http://localhost:5174/dashboard` to verify audit is recorded

## Ports summary

- Backend API: `http://localhost:5000`
- Backend WebSocket: `ws://localhost:5000/ws`
- Dashboard: `http://localhost:5174`
- MongoDB: `mongodb://127.0.0.1:27017/darkscan`
- Redis: `127.0.0.1:6379`

## Troubleshooting

- MongoDB not connecting: run `mongosh`; if it fails, start MongoDB service
- Redis not connecting: run `redis-cli ping`; expect `PONG`
- Extension shows `ERR` badge: backend is down; run `cd backend && npm run dev`
- WebSocket not connecting: verify backend is on port `5000` and check browser console
- OpenAI errors: ensure `OPENAI_API_KEY` in `backend/.env` starts with `sk-` and has available credits
