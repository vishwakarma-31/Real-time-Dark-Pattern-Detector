# Build React Dashboard
FROM node:22-alpine AS build
WORKDIR /app/dashboard
COPY dashboard/package*.json ./
RUN npm install
COPY dashboard/ ./
RUN npm run build

# Build Node Backend
FROM node:22-alpine
WORKDIR /app

# Setup backend env
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --production

# Copy backend source
COPY backend/ ./

# Create public directory to serve React built files
RUN mkdir -p public
COPY --from=build /app/dashboard/dist public/

# Make sure server uses the public folder for static files
# PORT 5000 is our API port
EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["npm", "start"]
