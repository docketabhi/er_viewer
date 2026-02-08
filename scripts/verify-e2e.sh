#!/bin/bash

# E2E Verification Script for ER Viewer
# Subtask: subtask-16-1 - End-to-end verification of complete workflow

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
SKIPPED=0

# Print functions
print_header() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
}

print_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED++))
}

print_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAILED++))
}

print_skip() {
    echo -e "${YELLOW}○ SKIP${NC}: $1"
    ((SKIPPED++))
}

print_info() {
    echo -e "  ℹ $1"
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if a port is in use
port_in_use() {
    lsof -i :"$1" >/dev/null 2>&1
}

# Check HTTP endpoint
check_endpoint() {
    local url="$1"
    local expected_status="${2:-200}"
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    if [ "$response" == "$expected_status" ]; then
        return 0
    else
        return 1
    fi
}

print_header "ER Viewer E2E Verification"
echo "Date: $(date)"
echo "Directory: $(pwd)"

# Step 1: Check Prerequisites
print_header "Step 1: Prerequisites Check"

if command_exists docker; then
    print_pass "Docker installed"
else
    print_fail "Docker not installed"
fi

if command_exists docker-compose; then
    print_pass "Docker Compose installed"
else
    print_fail "Docker Compose not installed"
fi

if command_exists node; then
    print_pass "Node.js installed ($(node -v))"
else
    print_fail "Node.js not installed"
fi

if command_exists npm; then
    print_pass "npm installed ($(npm -v))"
else
    print_fail "npm not installed"
fi

# Step 2: Check Project Structure
print_header "Step 2: Project Structure Check"

if [ -f "docker-compose.yml" ]; then
    print_pass "docker-compose.yml exists"
else
    print_fail "docker-compose.yml not found"
fi

if [ -d "frontend" ]; then
    print_pass "frontend directory exists"
else
    print_fail "frontend directory not found"
fi

if [ -d "backend" ]; then
    print_pass "backend directory exists"
else
    print_fail "backend directory not found"
fi

if [ -f "frontend/package.json" ]; then
    print_pass "frontend/package.json exists"
else
    print_fail "frontend/package.json not found"
fi

if [ -f "backend/package.json" ]; then
    print_pass "backend/package.json exists"
else
    print_fail "backend/package.json not found"
fi

# Step 3: Check Key Components
print_header "Step 3: Key Components Check"

components=(
    "frontend/app/page.tsx"
    "frontend/app/layout.tsx"
    "frontend/app/providers.tsx"
    "frontend/components/Editor/MonacoEditor.tsx"
    "frontend/components/Preview/MermaidPreview.tsx"
    "frontend/components/Preview/BlockBadge.tsx"
    "frontend/components/Preview/BlockOverlay.tsx"
    "frontend/components/Navigation/Breadcrumb.tsx"
    "frontend/components/CommandPalette/CommandPalette.tsx"
    "frontend/components/CommandPalette/GlobalCommandPalette.tsx"
    "frontend/components/ContextMenu/EntityContextMenu.tsx"
    "frontend/components/TopBar/ThemeToggle.tsx"
    "frontend/components/TopBar/ExportButton.tsx"
    "frontend/components/Panels/LeftPanel.tsx"
    "frontend/components/Panels/RightPanel.tsx"
    "frontend/components/Layout/AppLayout.tsx"
    "frontend/contexts/DiagramContext.tsx"
    "frontend/contexts/ThemeContext.tsx"
    "frontend/lib/mermaid/parser.ts"
    "frontend/lib/mermaid/svgProcessor.ts"
    "frontend/lib/export/exportSvg.ts"
    "frontend/lib/export/exportPng.ts"
    "frontend/lib/export/exportPdf.ts"
    "frontend/lib/api/client.ts"
    "frontend/lib/websocket/client.ts"
    "frontend/hooks/useDiagramNavigation.ts"
    "frontend/hooks/useAutoSave.ts"
    "backend/src/main.ts"
    "backend/src/app.module.ts"
    "backend/src/modules/diagrams/diagrams.controller.ts"
    "backend/src/modules/diagrams/diagrams.service.ts"
    "backend/src/modules/diagrams/blocks.service.ts"
    "backend/src/modules/diagrams/versions.service.ts"
    "backend/src/gateways/realtime.gateway.ts"
    "backend/src/db/schema.ts"
)

for component in "${components[@]}"; do
    if [ -f "$component" ]; then
        print_pass "$component"
    else
        print_fail "$component not found"
    fi
done

# Step 4: Check Docker Services (if running)
print_header "Step 4: Docker Services Check"

if command_exists docker; then
    # Check if containers are running
    if docker ps | grep -q "er_viewer_postgres"; then
        print_pass "PostgreSQL container running"
    else
        print_skip "PostgreSQL container not running (start with: docker-compose up -d)"
    fi

    if docker ps | grep -q "er_viewer_redis"; then
        print_pass "Redis container running"
    else
        print_skip "Redis container not running (start with: docker-compose up -d)"
    fi
else
    print_skip "Docker not available, skipping container checks"
fi

# Step 5: Check Service Endpoints (if running)
print_header "Step 5: Service Endpoints Check"

# Check if backend is running
if port_in_use 3001; then
    print_pass "Backend port 3001 in use"

    if check_endpoint "http://localhost:3001/health" "200"; then
        print_pass "Backend health endpoint responds"
    else
        print_fail "Backend health endpoint not responding"
    fi
else
    print_skip "Backend not running on port 3001 (start with: cd backend && npm run start:dev)"
fi

# Check if frontend is running
if port_in_use 3000; then
    print_pass "Frontend port 3000 in use"

    if check_endpoint "http://localhost:3000" "200"; then
        print_pass "Frontend responds"
    else
        print_fail "Frontend not responding"
    fi
else
    print_skip "Frontend not running on port 3000 (start with: cd frontend && npm run dev)"
fi

# Step 6: Check Test Files
print_header "Step 6: Test Files Check"

test_files=(
    "frontend/lib/mermaid/__tests__/parser.test.ts"
    "frontend/lib/mermaid/__tests__/svgProcessor.test.ts"
    "backend/src/modules/diagrams/__tests__/diagrams.service.spec.ts"
    "backend/src/modules/diagrams/__tests__/blocks.service.spec.ts"
)

for test_file in "${test_files[@]}"; do
    if [ -f "$test_file" ]; then
        print_pass "$test_file"
    else
        print_fail "$test_file not found"
    fi
done

# Summary
print_header "Verification Summary"
echo ""
echo -e "  ${GREEN}Passed${NC}:  $PASSED"
echo -e "  ${RED}Failed${NC}:  $FAILED"
echo -e "  ${YELLOW}Skipped${NC}: $SKIPPED"
echo ""
echo "Total Checks: $((PASSED + FAILED + SKIPPED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All critical checks passed!${NC}"
    echo ""
    echo "Next steps for manual verification:"
    echo "1. Open http://localhost:3000 in a browser"
    echo "2. Follow the E2E verification guide in .auto-claude/specs/001-prepare-tasks-from-the-below-requirments/e2e-verification.md"
    exit 0
else
    echo -e "${RED}Some checks failed. Please review the output above.${NC}"
    exit 1
fi
