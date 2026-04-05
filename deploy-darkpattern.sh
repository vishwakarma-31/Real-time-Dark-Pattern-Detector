#!/bin/bash
set -e

echo "Building Docker container for DarkScan..."
docker build -t darkscan/multi-modal-analyzer:latest .

echo "Bringing up services..."
docker-compose up -d

echo "Running post-deploy health check..."
sleep 5
curl -f http://localhost:5000/api/v1/analyze/health || { echo "WARNING: Healthcheck failed!"; exit 1; }

echo "Deployment completed successfully! DarkScan available on port 5000."
