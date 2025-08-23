#!/bin/bash

# Development setup script for Messenger MVP Authentication Service

set -e

echo "🚀 Setting up Messenger MVP Authentication Service..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your actual configuration values!"
    echo "   Required: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET"
else
    echo "✅ .env file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd backend
npm install

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Start Docker services
echo "🐳 Starting Docker services..."
cd ..
docker-compose up -d postgres redis

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run database migrations
echo "🗄️  Running database migrations..."
cd backend
npm run migrate

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Start the auth service: npm run dev"
echo "3. Run tests: npm test"
echo ""
echo "📖 Available commands:"
echo "   npm run dev         - Start development server"
echo "   npm run test        - Run all tests"
echo "   npm run test:auth   - Run auth service tests only"
echo "   npm run migrate     - Run database migrations"
echo "   npm run build       - Build for production"
echo ""
echo "🌐 Service will be available at: http://localhost:3001"
echo "🔍 Health check: http://localhost:3001/health"