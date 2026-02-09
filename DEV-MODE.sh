#!/bin/bash
# DEV-MODE: Start with hot-reload for faster development

set -e

echo "🚀 Starting DEV MODE with hot-reload..."
echo ""
echo "This mode enables:"
echo "  ✅ Frontend hot-reload (src/ changes are instant)"
echo "  ✅ Backend auto-reload (app/ changes are instant)"
echo "  ✅ No Docker image rebuild needed"
echo "  ✅ 10x faster iteration"
echo ""

cd /c/projects/joti

# Ensure database and cache are ready
echo "📦 Starting services..."
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Wait for postgres
echo "⏳ Waiting for database..."
sleep 10

# Start backend with live reload
echo "🔧 Starting backend (live reload enabled)..."
docker-compose -f docker-compose.dev.yml up -d backend

echo "⏳ Waiting for backend..."
sleep 10

# Start frontend with hot reload
echo "🎨 Starting frontend (hot reload enabled)..."
docker-compose -f docker-compose.dev.yml up frontend

echo ""
echo "💡 Frontend running at http://localhost:3000"
echo "💡 Backend API at http://localhost:8000"
echo ""
echo "To make changes:"
echo "  1. Edit files in frontend/src/ - page auto-reloads instantly"
echo "  2. Edit files in backend/app/ - server auto-reloads instantly"
echo "  3. No need to rebuild Docker or restart containers!"
echo ""
echo "Press Ctrl+C to stop"
