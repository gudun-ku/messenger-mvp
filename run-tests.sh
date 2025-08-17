#!/bin/bash

echo "🚀 Starting test environment..."

# Start test containers
docker-compose -f docker-compose.test.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run integration tests
echo "🧪 Running integration tests..."
npm test -- tests/integration/

# Run load tests
echo "📊 Running load tests..."
docker run --rm -i --network=host \
  -e API_URL=http://localhost:3001 \
  grafana/k6 run - < tests/load/basic-load.js

# Cleanup
echo "🧹 Cleaning up..."
docker-compose -f docker-compose.test.yml down

echo "✅ Tests completed!"
