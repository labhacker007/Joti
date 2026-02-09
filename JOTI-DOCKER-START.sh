#!/bin/bash
# JOTI Docker Startup Script
# This script starts JOTI with proper configuration

set -e

echo "🚀 Starting JOTI Docker Environment..."
echo ""

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ ERROR: Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found"
    echo "Creating .env from template..."
    cp env.example .env 2>/dev/null || echo "No env.example found"
    exit 1
fi

# Verify required values in .env
required_vars=("POSTGRES_USER" "POSTGRES_PASSWORD" "ADMIN_EMAIL" "ADMIN_PASSWORD")
for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" .env; then
        echo "❌ ERROR: Missing required variable in .env: $var"
        exit 1
    fi
done

echo "✅ Environment configured"
echo ""

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build images
echo "📦 Building Docker images..."
docker-compose -f docker-compose.dev.yml build --no-cache

echo ""
echo "🚀 Starting services..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for backend to be healthy
echo ""
echo "⏳ Waiting for backend to be ready..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    echo -n "."
    sleep 1
    ((attempt++))
done

if [ $attempt -eq $max_attempts ]; then
    echo ""
    echo "⚠️  Backend took too long to start. Check logs with:"
    echo "    docker-compose logs -f backend"
fi

echo ""
echo "⏳ Waiting for frontend to be ready..."
sleep 5
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Frontend is ready!"
        break
    fi
    echo -n "."
    sleep 1
    ((attempt++))
done

echo ""
echo "✅ JOTI is ready!"
echo ""
echo "🌐 Access JOTI at: http://localhost:3000"
echo ""
echo "📝 Login Credentials:"
grep "ADMIN_EMAIL=" .env | cut -d= -f2
grep "ADMIN_PASSWORD=" .env | cut -d= -f2
echo ""
echo "📊 Backend API: http://localhost:8000"
echo "📄 API Docs: http://localhost:8000/docs"
echo ""
echo "View logs with:"
echo "  docker-compose logs -f backend   # Backend logs"
echo "  docker-compose logs -f frontend  # Frontend logs"
echo ""
echo "Stop with:"
echo "  docker-compose down"
echo ""
