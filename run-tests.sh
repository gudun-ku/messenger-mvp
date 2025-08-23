#!/bin/bash

echo "🚀 Starting test environment..."

# Start test containers
docker-compose -f docker-compose.test.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run backend unit tests
echo "🧪 Running backend unit tests..."
(cd backend && npm test)

# Wait for services to be fully ready
echo "⏳ Waiting for auth service to be ready..."
sleep 15

# Basic service health check
echo "🔍 Checking service health..."
curl -f http://localhost:3001/health || echo "Auth service health check failed"

# Run load tests
echo "📊 Running load tests..."
docker run --rm -i --network=host \
  -e API_URL=http://localhost:3001 \
  grafana/k6 run - < tests/load/basic-load.js

# Cleanup
echo "🧹 Cleaning up..."
docker-compose -f docker-compose.test.yml down

echo "✅ Tests completed!"
