#!/bin/bash
# JOTI Setup Verification Script
# This script verifies all JOTI configurations are correct

set -e

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║     JOTI Docker Setup Verification Script           ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_count=0
pass_count=0

# Helper functions
check_item() {
    check_count=$((check_count + 1))
    echo -n "[$check_count] Checking: $1... "
}

pass_check() {
    pass_count=$((pass_count + 1))
    echo -e "${GREEN}✅ PASS${NC}"
}

fail_check() {
    echo -e "${RED}❌ FAIL${NC}: $1"
}

warn_check() {
    echo -e "${YELLOW}⚠️  WARNING${NC}: $1"
}

echo "Verifying JOTI Configuration..."
echo ""

# 1. Check .env exists
check_item ".env file exists"
if [ -f .env ]; then
    pass_check
else
    fail_check ".env file not found"
    exit 1
fi

# 2. Check JOTI branding in .env
check_item "JOTI branding in .env (not HuntSphere)"
if ! grep -q "huntsphere\|HuntSphere" .env; then
    if grep -q "joti\|JOTI" .env; then
        pass_check
    else
        fail_check "JOTI references not found in .env"
    fi
else
    fail_check "Old HuntSphere references still in .env"
    exit 1
fi

# 3. Check required env variables
check_item "POSTGRES_USER configured"
if grep -q "^POSTGRES_USER=joti_user" .env; then
    pass_check
else
    fail_check "POSTGRES_USER not set to joti_user"
fi

check_item "POSTGRES_PASSWORD configured"
if grep -q "^POSTGRES_PASSWORD=" .env; then
    pass_check
else
    fail_check "POSTGRES_PASSWORD not set"
fi

check_item "ADMIN_EMAIL configured"
if grep -q "^ADMIN_EMAIL=admin@joti.local" .env; then
    pass_check
else
    fail_check "ADMIN_EMAIL not set correctly"
fi

check_item "ADMIN_PASSWORD configured"
if grep -q "^ADMIN_PASSWORD=" .env; then
    pass_check
else
    fail_check "ADMIN_PASSWORD not set"
fi

check_item "SECRET_KEY configured"
if grep -q "^SECRET_KEY=" .env; then
    pass_check
else
    fail_check "SECRET_KEY not set"
fi

# 4. Check Docker files
check_item "docker-compose.yml exists"
if [ -f docker-compose.yml ]; then
    pass_check
else
    fail_check "docker-compose.yml not found"
fi

check_item "docker-compose.dev.yml exists"
if [ -f docker-compose.dev.yml ]; then
    pass_check
else
    fail_check "docker-compose.dev.yml not found"
fi

# 5. Check Dockerfile paths
check_item "Backend Dockerfile exists"
if [ -f infra/Dockerfile.backend ]; then
    pass_check
else
    fail_check "infra/Dockerfile.backend not found"
fi

check_item "Frontend Dockerfile exists"
if [ -f infra/Dockerfile.frontend ]; then
    pass_check
else
    fail_check "infra/Dockerfile.frontend not found"
fi

# 6. Check API configuration
check_item "Frontend API client exists"
if [ -f frontend/src/api/client.js ]; then
    pass_check
else
    fail_check "frontend/src/api/client.js not found"
fi

check_item "REACT_APP_API_URL in docker-compose.yml"
if grep -q "REACT_APP_API_URL" docker-compose.yml; then
    pass_check
else
    fail_check "REACT_APP_API_URL not found in docker-compose.yml"
fi

# 7. Check old files removed
check_item "Parshu.code-workspace removed"
if [ ! -f Parshu.code-workspace ]; then
    pass_check
else
    fail_check "Parshu.code-workspace still exists"
fi

check_item "Start Orion.command removed"
if [ ! -f "Start Orion.command" ]; then
    pass_check
else
    fail_check "Start Orion.command still exists"
fi

# 8. Check documentation
check_item "DOCKER-SETUP.md exists"
if [ -f DOCKER-SETUP.md ]; then
    pass_check
else
    fail_check "DOCKER-SETUP.md not found"
fi

check_item "JOTI-DOCKER-STATUS.md exists"
if [ -f JOTI-DOCKER-STATUS.md ]; then
    pass_check
else
    fail_check "JOTI-DOCKER-STATUS.md not found"
fi

check_item "QUICK-DOCKER-REFERENCE.txt exists"
if [ -f QUICK-DOCKER-REFERENCE.txt ]; then
    pass_check
else
    fail_check "QUICK-DOCKER-REFERENCE.txt not found"
fi

# 9. Check startup scripts
check_item "JOTI-DOCKER-START.sh exists"
if [ -f JOTI-DOCKER-START.sh ]; then
    pass_check
else
    fail_check "JOTI-DOCKER-START.sh not found"
fi

check_item "JOTI-DOCKER-START.bat exists"
if [ -f JOTI-DOCKER-START.bat ]; then
    pass_check
else
    fail_check "JOTI-DOCKER-START.bat not found"
fi

# 10. Check if Docker is available
check_item "Docker is installed"
if command -v docker &> /dev/null; then
    pass_check
else
    fail_check "Docker is not installed or not in PATH"
fi

check_item "Docker Compose is installed"
if command -v docker-compose &> /dev/null; then
    pass_check
else
    fail_check "Docker Compose is not installed or not in PATH"
fi

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║                  VERIFICATION RESULTS              ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""
echo "Total Checks: $check_count"
echo -e "Passed: ${GREEN}$pass_count${NC}"
echo -e "Failed: ${RED}$((check_count - pass_count))${NC}"
echo ""

if [ $pass_count -eq $check_count ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "JOTI is ready to deploy. Start with:"
    echo ""
    echo "  Option 1: bash JOTI-DOCKER-START.sh"
    echo "  Option 2: docker-compose -f docker-compose.dev.yml up -d"
    echo ""
    echo "Then open: http://localhost:3000"
    echo ""
    exit 0
else
    echo -e "${RED}❌ SOME CHECKS FAILED${NC}"
    echo ""
    echo "Please fix the issues above and run this script again."
    echo ""
    exit 1
fi
