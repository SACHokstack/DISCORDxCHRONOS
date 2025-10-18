#!/bin/bash

# Chronos Bot Startup Script
# This script checks prerequisites and starts the Eliza bot with Chronos integration

set -e

echo "🔬 Starting Chronos Medical Document Processing Bot"
echo "=================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Neo4j is running
echo "Checking prerequisites..."
echo ""

# Check Neo4j
echo -n "📊 Neo4j database: "
if curl -s http://localhost:7474 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Not running${NC}"
    echo ""
    echo "Neo4j is not running. Start it with:"
    echo "  docker run -d --name neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/today-craft-film-snake-enigma-9518 neo4j:latest"
    exit 1
fi

# Check Chronos main.py exists
echo -n "🔬 Chronos pipeline: "
if [ -f "$CHRONOS_MAIN_PATH" ]; then
    echo -e "${GREEN}✓ Found${NC}"
else
    CHRONOS_MAIN_PATH="${CHRONOS_MAIN_PATH:-/home/sach/ELIZAOS!/Discord_working_chronos/hen/HeritageNet-example/app/main.py}"
    if [ -f "$CHRONOS_MAIN_PATH" ]; then
        echo -e "${GREEN}✓ Found${NC}"
    else
        echo -e "${RED}✗ Not found${NC}"
        echo ""
        echo "Chronos main.py not found at: $CHRONOS_MAIN_PATH"
        echo "Set CHRONOS_MAIN_PATH in .env"
        exit 1
    fi
fi

# Check temp directory
echo -n "📁 Temp directory: "
TEMP_DIR="${CHRONOS_TEMP_DIR:-/tmp/chronos}"
if [ -d "$TEMP_DIR" ]; then
    echo -e "${GREEN}✓ Ready${NC}"
else
    mkdir -p "$TEMP_DIR"
    echo -e "${GREEN}✓ Created${NC}"
fi

# Check .env file
echo -n "⚙️  Configuration: "
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ Found${NC}"
else
    echo -e "${RED}✗ .env file not found${NC}"
    echo ""
    echo "Create .env file from .env.example"
    exit 1
fi

echo ""
echo "All prerequisites met! ✓"
echo ""
echo "Starting bot..."
echo "=================================================="
echo ""

# Start the bot
if [ "$1" == "dev" ]; then
    echo "Starting in development mode (with hot reload)..."
    elizaos dev
elif [ "$1" == "debug" ]; then
    echo "Starting in debug mode (verbose logging)..."
    LOG_LEVEL=debug elizaos start
else
    echo "Starting in production mode..."
    elizaos start
fi
