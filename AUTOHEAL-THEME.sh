#!/bin/bash
# AUTO-HEAL: Fix theme system issues quickly

set -e

echo "🔧 AUTOHEAL: Fixing theme system..."

cd /c/projects/joti

# 1. Ensure old context folder is deleted
if [ -d "frontend/src/context" ]; then
    echo "❌ Old context folder detected, deleting..."
    rm -rf frontend/src/context
fi

# 2. Rebuild frontend (fast - only JS/CSS)
echo "📦 Building frontend..."
cd frontend
npm run build > /dev/null 2>&1
cd ..

# 3. Restart Docker
echo "🐳 Restarting Docker..."
docker-compose down -v 2>/dev/null || true
docker image prune -af --volumes > /dev/null 2>&1
docker-compose up -d

# 4. Wait for services
echo "⏳ Waiting for services to start..."
sleep 30

# 5. Verify
echo ""
echo "✅ AUTOHEAL Complete!"
echo ""
docker ps --format "table {{.Names}}\t{{.Status}}"
echo ""
echo "📍 App URL: http://localhost:3000"
echo "📍 API URL: http://localhost:8000"
echo ""
echo "Test credentials:"
echo "  Email: admin@huntsphere.local"
echo "  Password: Admin123!@2026"
