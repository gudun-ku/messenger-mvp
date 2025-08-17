#!/bin/bash

echo "🚀 Messenger MVP Quick Start"
echo "============================"

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
command -v terraform >/dev/null 2>&1 || { echo "❌ Terraform is required but not installed."; exit 1; }

echo "✅ Prerequisites checked"

# Install dependencies
echo "📦 Installing dependencies..."
cd backend && npm install && cd ..

# Start local development environment
echo "🐳 Starting local environment..."
docker-compose -f docker-compose.test.yml up -d

# Wait for services
echo "⏳ Waiting for services..."
sleep 10

# Run database migrations
echo "🗄️ Running database migrations..."
cd backend && npm run migrate:up && cd ..

# Run tests
echo "🧪 Running tests..."
./run-tests.sh

echo "✨ Setup complete! Your development environment is ready."
echo ""
echo "Next steps:"
echo "1. Start the backend: cd backend && npm run dev"
echo "2. Open Android Studio and import the android/ directory"
echo "3. Configure your .env file with Yandex Cloud credentials"
echo "4. Run terraform init in infrastructure/terraform/"
echo ""
echo "📚 Documentation: docs/README.md"
echo "💬 Claude context: .claude/claude.md"
