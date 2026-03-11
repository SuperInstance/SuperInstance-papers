@echo off
REM POLLN Vector Database Setup Script (Windows)
REM Starts Qdrant in Docker and runs vectorization

setlocal enabledelayedexpansion

echo ==================================================
echo POLLN VECTOR DATABASE SETUP
echo ==================================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo X Docker is not installed. Please install Docker Desktop first.
    echo   Visit: https://www.docker.com/products/docker-desktop
    exit /b 1
)

echo O Docker is installed

REM Check if Qdrant is already running
docker ps 2>nul | find "qdrant" >nul
if errorlevel 1 (
    echo.
    echo Starting Qdrant in Docker...

    REM Stop any existing stopped Qdrant container
    docker rm qdrant 2>nul

    REM Start Qdrant
    docker run -d ^
        --name qdrant ^
        -p 6333:6333 ^
        -p 6334:6334 ^
        -v qdrant_storage:/qdrant/storage ^
        qdrant/qdrant:latest

    echo O Qdrant started (waiting for initialization...)
    timeout /t 3 /nobreak
) else (
    echo O Qdrant is already running
)

echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo X Python is not installed. Please install Python 3.8+
    echo   Visit: https://www.python.org/downloads/
    exit /b 1
)

echo O Python is installed

REM Install Python dependencies
echo.
echo Installing Python dependencies...
pip install -q sentence-transformers qdrant-client >nul 2>&1
if errorlevel 1 (
    echo W Warning: pip install had some issues, but continuing...
)

REM Check Qdrant connection
echo.
echo Checking Qdrant connection...

python << EOF
import sys
try:
    from qdrant_client import QdrantClient
    client = QdrantClient("localhost", port=6333)
    client.get_collections()
    print("O Qdrant is accessible")
except Exception as e:
    print(f"X Cannot connect to Qdrant: {e}")
    print("  Make sure Docker is running: docker logs qdrant")
    sys.exit(1)
EOF

if errorlevel 1 exit /b 1

REM Run vectorization
echo.
echo Starting vectorization...
echo This may take a few minutes...
echo.

python vectorization_setup.py

if errorlevel 1 (
    echo.
    echo X Vectorization failed
    exit /b 1
)

echo.
echo ==================================================
echo O VECTOR DATABASE SETUP COMPLETE
echo ==================================================
echo.
echo Next steps:
echo 1. Test the search engine:
echo    python mcp_codebase_search.py
echo.
echo 2. View vector DB stats:
echo    python mcp_codebase_search.py stats
echo.
echo 3. Test a search:
echo    python mcp_codebase_search.py search "confidence model"
echo.
echo 4. To stop Qdrant:
echo    docker stop qdrant
echo.
echo 5. To remove Qdrant (WARNING: deletes data):
echo    docker rm qdrant
echo.

pause
