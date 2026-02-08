#!/bin/bash

# Browser Verification Test Script
# Subtask: subtask-16-2
#
# This script helps set up and verify browser compatibility for ER Viewer
# Run this before manual browser testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}ER Viewer Browser Verification Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ npm installed: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✓ Docker installed: $DOCKER_VERSION${NC}"
else
    echo -e "${YELLOW}⚠ Docker not found. Database services will need to be configured manually.${NC}"
fi

echo ""
echo -e "${YELLOW}Checking frontend dependencies...${NC}"

# Check if frontend dependencies are installed
if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✓ Frontend node_modules exists${NC}"
else
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd frontend
    npm install --legacy-peer-deps
    cd ..
fi

# Check if backend dependencies are installed
if [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}✓ Backend node_modules exists${NC}"
else
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd backend
    npm install
    cd ..
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Browser Compatibility Test Checklist${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}Test in these browsers:${NC}"
echo "  1. Chrome 90+ (recommended primary)"
echo "  2. Firefox 90+"
echo "  3. Safari 15+ (macOS only)"
echo ""

echo -e "${YELLOW}Core functionality to verify in each browser:${NC}"
echo ""
echo "  ${BLUE}[Monaco Editor]${NC}"
echo "    - Editor loads without 'Loading...' stuck"
echo "    - Syntax highlighting for Mermaid keywords"
echo "    - No console errors about web workers"
echo ""
echo "  ${BLUE}[Mermaid Rendering]${NC}"
echo "    - Preview panel shows rendered SVG"
echo "    - Diagram updates within 300ms after typing stops"
echo "    - Error messages shown for invalid syntax"
echo ""
echo "  ${BLUE}[Block Directives]${NC}"
echo "    - %%block: directive parsed without errors"
echo "    - Badge (▣) appears on entities with blocks"
echo "    - Clicking badge triggers navigation"
echo ""
echo "  ${BLUE}[Export Functions]${NC}"
echo "    - SVG export downloads valid .svg file"
echo "    - PNG export downloads valid .png file"
echo "    - PDF export downloads valid .pdf file"
echo ""
echo "  ${BLUE}[Theme Support]${NC}"
echo "    - Light/dark toggle switches instantly"
echo "    - Theme persists after page reload"
echo "    - Mermaid preview theme matches app theme"
echo ""
echo "  ${BLUE}[Console Check]${NC}"
echo "    - No red error messages in DevTools Console"
echo "    - No warnings about deprecated APIs"
echo "    - WebSocket connects successfully"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Starting Services${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if services are already running
FRONTEND_RUNNING=false
BACKEND_RUNNING=false

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    FRONTEND_RUNNING=true
    echo -e "${GREEN}✓ Frontend already running at http://localhost:3000${NC}"
fi

if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    BACKEND_RUNNING=true
    echo -e "${GREEN}✓ Backend already running at http://localhost:3001${NC}"
fi

if [ "$FRONTEND_RUNNING" = false ] || [ "$BACKEND_RUNNING" = false ]; then
    echo ""
    echo -e "${YELLOW}To start services, run these commands in separate terminals:${NC}"
    echo ""

    if [ "$BACKEND_RUNNING" = false ]; then
        echo "  # Terminal 1: Start backend"
        echo "  cd backend && npm run start:dev"
        echo ""
    fi

    if [ "$FRONTEND_RUNNING" = false ]; then
        echo "  # Terminal 2: Start frontend"
        echo "  cd frontend && npm run dev"
        echo ""
    fi

    if command -v docker &> /dev/null; then
        echo "  # Optional: Start database services"
        echo "  docker-compose up -d"
        echo ""
    fi
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Browser Testing URLs${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "  Main Application: http://localhost:3000"
echo "  Backend Health:   http://localhost:3001/health"
echo "  API Docs:         http://localhost:3001/api (if enabled)"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Quick Test Checklist${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Copy and paste this test diagram to verify rendering:"
echo ""
echo -e "${GREEN}erDiagram"
echo "    CUSTOMER ||--o{ ORDER : places"
echo "    ORDER ||--|{ LINE-ITEM : contains"
echo "    CUSTOMER {"
echo "        string name"
echo "        string email"
echo "    }"
echo "    ORDER {"
echo "        int orderNumber"
echo "        date orderDate"
echo "    }"
echo ""
echo "    %%block: CUSTOMER -> diagramId=cust-details label=\"Customer Details\""
echo -e "${NC}"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Documentation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Full browser verification guide:"
echo "  .auto-claude/specs/001-prepare-tasks-from-the-below-requirments/browser-verification.md"
echo ""
echo "E2E verification guide:"
echo "  .auto-claude/specs/001-prepare-tasks-from-the-below-requirments/e2e-verification.md"
echo ""

echo -e "${GREEN}Setup complete! Please proceed with manual browser testing.${NC}"
