#!/bin/bash
# POLLN Vector Database Setup Script
# Starts Qdrant in Docker and runs vectorization

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=================================================="
echo "POLLN VECTOR DATABASE SETUP"
echo "=================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✓ Docker is installed"

# Check if Qdrant is already running
if docker ps | grep -q "qdrant"; then
    echo "✓ Qdrant is already running"
else
    echo "🚀 Starting Qdrant in Docker..."

    # Stop any existing stopped Qdrant container
    docker rm qdrant 2>/dev/null || true

    # Start Qdrant
    docker run -d \
        --name qdrant \
        -p 6333:6333 \
        -p 6334:6334 \
        -v qdrant_storage:/qdrant/storage \
        qdrant/qdrant:latest

    echo "✓ Qdrant started (waiting for initialization...)"
    sleep 3
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+"
    exit 1
fi

echo "✓ Python 3 is installed"

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -q sentence-transformers qdrant-client || {
    echo "⚠️  pip install had some issues, but continuing..."
}

# Check if Qdrant is accessible
echo "🔌 Checking Qdrant connection..."
python3 << EOF
import time
import sys
try:
    from qdrant_client import QdrantClient
    client = QdrantClient("localhost", port=6333)
    client.get_collections()
    print("✓ Qdrant is accessible")
except Exception as e:
    print(f"❌ Cannot connect to Qdrant: {e}")
    print("   Make sure Docker is running: docker logs qdrant")
    sys.exit(1)
EOF

# Run vectorization
echo ""
echo "🔗 Starting vectorization..."
echo "   This may take a few minutes..."
echo ""

cd "$PROJECT_ROOT"
python3 vectorization_setup.py

echo ""
echo "=================================================="
echo "✓ VECTOR DATABASE SETUP COMPLETE"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Test the search engine:"
echo "   python3 mcp_codebase_search.py"
echo ""
echo "2. View vector DB stats:"
echo "   python3 mcp_codebase_search.py stats"
echo ""
echo "3. Test a search:"
echo "   python3 mcp_codebase_search.py search 'confidence model'"
echo ""
echo "4. To stop Qdrant:"
echo "   docker stop qdrant"
echo ""
echo "5. To remove Qdrant (WARNING: deletes data):"
echo "   docker rm qdrant"
echo ""
