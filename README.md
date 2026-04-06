# DarkScan

## Local setup note (Node engine)

Before building the dashboard, use Node 22 and reinstall dependencies if your `node_modules` were created with Node 18:

`nvm use 22 && cd dashboard && rm -rf node_modules && npm install`

This avoids native module ABI mismatches with Vite 8/rolldown.

## Security: Secrets setup

`JWT_SECRET` must be a strong random value and must never be committed to git.

Generate one with:

`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Store this in your server environment (or deployment secret manager) before starting the backend.
