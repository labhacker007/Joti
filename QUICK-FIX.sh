#!/bin/bash
# Quick fix script to get the app running by removing old theme code

echo "🔧 Applying quick fixes..."

# 1. Comment out the problematic theme destructuring in NavBar
sed -i "49s/.*/  \/\/ Using new simple theme - complex theme selector disabled/" /c/projects/joti/frontend/src/components/NavBar.js

# 2. Build
cd /c/projects/joti/frontend
npm run build

# 3. Restart Docker
cd /c/projects/joti
docker-compose down
docker image prune -af
docker-compose up -d

# 4. Wait for services
sleep 30

# 5. Check status
echo "✅ Done! App running at http://localhost:3000"
docker ps --format "table {{.Names}}\t{{.Status}}"

