# SpreadsheetMoment - Docker Desktop Deployment

**Version:** 1.0
**Last Updated:** 2026-03-14

---

## Overview

This guide covers deploying SpreadsheetMoment as a desktop application using Docker Desktop, with optimized builds for:

- **Linux** (Ubuntu, Fedora, Debian)
- **NVIDIA Jetson** (Orin Nano, Xavier NX, AGX Orin)
- **Windows** (WSL2)
- **macOS** (Intel and Apple Silicon)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Desktop Application                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            Frontend (Electron/Tauri)                  │  │
│  │  - React UI                                            │  │
│  │  - Tensor visualization                                │  │
│  │  - Local-first mode                                    │  │
│  └───────────────────┬───────────────────────────────────┘  │
│                      │                                        │
│  ┌───────────────────▼───────────────────────────────────┐  │
│  │              Local Backend (Node.js)                   │  │
│  │  - Tensor engine (CPU/GPU)                             │  │
│  │  - Local storage (SQLite)                              │  │
│  │  - Hardware integration (Arduino/ESP32)                │  │
│  └───────────────────┬───────────────────────────────────┘  │
│                      │                                        │
│  ┌───────────────────▼───────────────────────────────────┐  │
│  │         Cloudflare Sync Client                         │  │
│  │  - Offline queue                                       │  │
│  │  - Delta sync                                          │  │
│  │  - Conflict resolution                                 │  │
│  └───────────────────┬───────────────────────────────────┘  │
│                      │                                        │
│  ┌───────────────────▼───────────────────────────────────┐  │
│  │         Docker Services                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │  │
│  │  │   Backend    │  │   Database   │  │    Redis    │ │  │
│  │  │   (FastAPI)  │  │   (SQLite)   │  │   (Cache)   │ │  │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │  │
│  │  │   NLP        │  │   Vector     │  │   Hardware  │ │  │
│  │  │  Service     │  │    DB        │  │   Service   │ │  │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    (Cloudflare Edge Sync)
```

---

## Docker Compose Configuration

### docker-compose.yml

```yaml
version: '3.8'

services:
  # Main backend API
  backend:
    build:
      context: .
      dockerfile: docker/Dockerfile.backend
    image: spreadsheetmoment-backend:latest
    container_name: spreadsheetmoment-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=desktop
      - DATABASE_URL=sqlite:///data/spreadsheetmoment.db
      - CLOUDFLARE_API_KEY=${CLOUDFLARE_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ENABLE_GPU=${ENABLE_GPU:-false}
    volumes:
      - ./data:/data
      - ./logs:/logs
      - /dev/ttyUSB0:/dev/ttyUSB0  # Arduino USB connection
    devices:
      - /dev/dri:/dev/dri  # GPU access (if available)
    networks:
      - spreadsheetmoment-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Vector database (for local semantic search)
  vectordb:
    image: qdrant/qdrant:v1.7.0
    container_name: spreadsheetmoment-vectordb
    restart: unless-stopped
    ports:
      - "6333:6333"
    volumes:
      - qdrant-data:/qdrant/storage
    networks:
      - spreadsheetmoment-network

  # Redis (caching and job queue)
  redis:
    image: redis:7-alpine
    container_name: spreadsheetmoment-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - spreadsheetmoment-network
    command: redis-server --appendonly yes

  # NLP Service (local LLM support)
  nlp:
    build:
      context: .
      dockerfile: docker/Dockerfile.nlp
    image: spreadsheetmoment-nlp:latest
    container_name: spreadsheetmoment-nlp
    restart: unless-stopped
    ports:
      - "8001:8001"
    environment:
      - MODEL_PATH=/models
      - DEVICE=${NLP_DEVICE:-cpu}
      - MODEL_NAME=${NLP_MODEL:-mistral-7b-instruct}
    volumes:
      - model-cache:/models
    networks:
      - spreadsheetmoment-network
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  # Hardware integration service
  hardware:
    build:
      context: .
      dockerfile: docker/Dockerfile.hardware
    image: spreadsheetmoment-hardware:latest
    container_name: spreadsheetmoment-hardware
    restart: unless-stopped
    privileged: true  # Required for USB device access
    network_mode: host  # Required for local network discovery
    volumes:
      - /dev:/dev
      - ./data:/data
    environment:
      - BAUD_RATE=115200
      - DISCOVERY_TIMEOUT=5000

  # Cloudflare sync client
  sync-client:
    build:
      context: .
      dockerfile: docker/Dockerfile.sync
    image: spreadsheetmoment-sync:latest
    container_name: spreadsheetmoment-sync
    restart: unless-stopped
    environment:
      - CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID}
      - CLOUDFLARE_API_KEY=${CLOUDFLARE_API_KEY}
      - SYNC_INTERVAL=30000
      - OFFLINE_QUEUE_PATH=/data/offline-queue
    volumes:
      - ./data:/data
      - ./logs:/logs
    networks:
      - spreadsheetmoment-network
    depends_on:
      - backend

networks:
  spreadsheetmoment-network:
    driver: bridge

volumes:
  qdrant-data:
  redis-data:
  model-cache:
```

---

## NVIDIA Jetson Optimization

### Jetson-Specific Dockerfile

**docker/Dockerfile.jetson:**

```dockerfile
FROM nvcr.io/nvidia/l4t-jetpack:r36.2.0

# Install dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    python3-dev \
    git \
    cmake \
    libopencv-dev \
    libusb-1.0-0-dev \
    && rm -rf /var/lib/apt/lists/*

# Enable Python 3.10
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.10 1

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements-jetson.txt requirements.txt

# Install Python packages
RUN pip3 install --no-cache-dir -r requirements.txt

# Install JetPack Python packages
RUN pip3 install --no-cache-dir \
    jetson-stats \
    Jetson.GPIO \
    opencv-python-headless

# Copy application code
COPY . .

# Enable GPU optimizations
ENV TORCH_CUDA_ARCH_LIST="7.2;8.7"
ENV CUDA_VISIBLE_DEVICES=0

# Create data directories
RUN mkdir -p /data /logs

# Expose ports
EXPOSE 8000 8001 6333

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run with GPU optimization
CMD ["python3", "-u", "src/main.py", "--gpu", "--optimize-jetson"]
```

### Jetson-Specific Requirements

**requirements-jetson.txt:**

```txt
# Core dependencies
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
sqlalchemy==2.0.25
alembic==1.13.1

# Tensor operations with Jetson optimization
torch==2.1.0a0+nv23.11
numpy==1.26.3
scipy==1.11.4
pandas==2.1.4

# Vector database
qdrant-client==1.7.0

# Hardware integration
pyserial==3.5
pyusb==1.2.1
websocket-client==1.7.0

# Cloudflare integration
cloudflare==3.0.0
pyjwt==2.8.0

# Async support
httpx==0.26.0
aiofiles==23.2.1

# Monitoring
prometheus-client==0.19.0
```

### Jetson Launch Script

**scripts/jetson-launch.sh:**

```bash
#!/bin/bash

# Jetson performance configuration
echo "Configuring Jetson for maximum performance..."

# Enable maximum performance mode
sudo nvpmodel -m 0
sudo jetson_clocks

# Configure GPU memory
sudo nvpmodel -q 2  # Maximum performance

# Set CPU governor to performance
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Enable swap optimization
sudo sysctl vm.swappiness=10

# Launch Docker containers with GPU support
docker-compose -f docker-compose.jetson.yml up -d

# Monitor performance
echo "Monitoring Jetson performance..."
watch -n 1 'jetson-stats'
```

---

## Desktop Build Scripts

### Linux Package Build

**scripts/build-linux.sh:**

```bash
#!/bin/bash

set -e

VERSION=${1:-"1.0.0"}
BUILD_DIR="build/linux"

echo "Building SpreadsheetMoment for Linux..."

# Create build directory
mkdir -p $BUILD_DIR

# Build Docker image
docker build -f docker/Dockerfile.backend -t spreadsheetmoment-backend:$VERSION .

# Export Docker image
docker save spreadsheetmoment-backend:$VERSION | gzip > $BUILD_DIR/spreadsheetmoment-backend.tar.gz

# Create AppImage structure
mkdir -p $BUILD_DIR/AppImage/usr/{bin,lib,share}
mkdir -p $BUILD_DIR/AppImage/usr/share/applications
mkdir -p $BUILD_DIR/AppImage/usr/share/icons/hicolor/512x512/apps

# Copy application files
cp -r src/* $BUILD_DIR/AppImage/usr/bin/
cp deployment/desktop/spreadsheetmoment.desktop $BUILD_DIR/AppImage/usr/share/applications/
cp deployment/desktop/icons/512x512/spreadsheetmoment.png $BUILD_DIR/AppImage/usr/share/icons/hicolor/512x512/apps/

# Download AppRun
wget -q https://github.com/AppImage/AppImageKit/releases/download/continuous/AppRun-x86_64 -O $BUILD_DIR/AppImage/AppRun
chmod +x $BUILD_DIR/AppImage/AppRun

# Download appimagetool
wget -q https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage -O $BUILD_DIR/appimagetool
chmod +x $BUILD_DIR/appimagetool

# Build AppImage
cd $BUILD_DIR
./appimagetool AppImage SpreadsheetMoment-$VERSION-x86_64.AppImage

echo "Linux build complete: $BUILD_DIR/SpreadsheetMoment-$VERSION-x86_64.AppImage"
```

### Windows/WSL2 Build

**scripts/build-windows.ps1:**

```powershell
param(
    [string]$Version = "1.0.0"
)

$ErrorActionPreference = "Stop"

Write-Host "Building SpreadsheetMoment for Windows/WSL2..." -ForegroundColor Green

# Create build directory
$BuildDir = "build\windows"
New-Item -ItemType Directory -Force -Path $BuildDir

# Build Docker image
docker build -f docker\Dockerfile.backend -t spreadsheetmoment-backend:$Version .

# Export Docker image
docker save spreadsheetmoment-backend:$Version | gzip > "$BuildDir\spreadsheetmoment-backend.tar.gz"

# Create Windows installer script
@"
@echo off
echo Installing SpreadsheetMoment...

REM Check for WSL2
wsl --status >nul 2>&1
if errorlevel 1 (
    echo WSL2 not installed. Please install WSL2 first.
    pause
    exit /b 1
)

REM Copy files
docker load -i spreadsheetmoment-backend.tar.gz

REM Start services
docker-compose -f docker-compose.yml up -d

echo Installation complete!
echo Access the application at http://localhost:8000
pause
"@ | Out-File -FilePath "$BuildDir\install.bat"

# Create uninstall script
@"
@echo off
echo Uninstalling SpreadsheetMoment...

REM Stop services
docker-compose -f docker-compose.yml down

REM Remove Docker image
docker rmi spreadsheetmoment-backend:$Version

echo Uninstallation complete!
pause
"@ | Out-File -FilePath "$BuildDir\uninstall.bat"

Write-Host "Windows build complete: $BuildDir" -ForegroundColor Green
```

### macOS Build

**scripts/build-macos.sh:**

```bash
#!/bin/bash

set -e

VERSION=${1:-"1.0.0"}
BUILD_DIR="build/macos"

echo "Building SpreadsheetMoment for macOS..."

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    echo "Building for Apple Silicon..."
    PLATFORM="arm64"
else
    echo "Building for Intel..."
    PLATFORM="x86_64"
fi

# Create build directory
mkdir -p $BUILD_DIR

# Build Docker image
docker build -f docker/Dockerfile.backend -t spreadsheetmoment-backend:$VERSION .

# Export Docker image
docker save spreadsheetmoment-backend:$VERSION | gzip > $BUILD_DIR/spreadsheetmoment-backend.tar.gz

# Create .app bundle
mkdir -p $BUILD_DIR/SpreadsheetMoment.app/{Contents/{MacOS,Resources},usr/bin}

# Copy application files
cp -r src/* $BUILD_DIR/SpreadsheetMoment.app/usr/bin/
cp deployment/desktop/Info.plist $BUILD_DIR/SpreadsheetMoment.app/Contents/
cp deployment/desktop/icons/mac/icon.icns $BUILD_DIR/SpreadsheetMoment.app/Resources/

# Create launcher script
cat > $BUILD_DIR/SpreadsheetMoment.app/Contents/MacOS/spreadsheetmoment <<'EOF'
#!/bin/bash
SCRIPT_DIR=$(dirname "$0")
cd "$SCRIPT_DIR/../usr/bin"
docker-compose up -d
open http://localhost:8000
EOF

chmod +x $BUILD_DIR/SpreadsheetMoment.app/Contents/MacOS/spreadsheetmoment

# Create DMG
hdiutil create -volname "SpreadsheetMoment" \
               -srcfolder $BUILD_DIR/SpreadsheetMoment.app \
               -ov -format UDZO \
               $BUILD_DIR/SpreadsheetMoment-$VERSION-$PLATFORM.dmg

echo "macOS build complete: $BUILD_DIR/SpreadsheetMoment-$VERSION-$PLATFORM.dmg"
```

---

## Offline Mode Configuration

### Local-First Architecture

```typescript
// services/sync/offline-manager.ts
export class OfflineManager {
  private db: SQLiteDatabase
  private syncQueue: Array<SyncOperation>
  private isOnline: boolean

  constructor(dbPath: string) {
    this.db = new SQLiteDatabase(dbPath)
    this.syncQueue = []
    this.isOnline = navigator.onLine
    this.initialize()
  }

  private async initialize(): Promise<void> {
    // Create local tables
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS local_cells (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        value TEXT NOT NULL,
        temperature REAL DEFAULT 0.0,
        last_synced INTEGER,
        pending_sync INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `)

    // Listen for network changes
    window.addEventListener('online', () => this.handleOnline())
    window.addEventListener('offline', () => this.handleOffline())

    // Start sync loop
    setInterval(() => this.sync(), 30000) // Sync every 30s
  }

  async updateCell(cellId: string, value: any): Promise<void> {
    // Update local copy immediately
    await this.db.run(
      'UPDATE local_cells SET value = ?, pending_sync = 1 WHERE id = ?',
      [JSON.stringify(value), cellId]
    )

    // Queue for sync if online
    if (this.isOnline) {
      await this.queueOperation({
        type: 'cell_update',
        cellId,
        value,
        timestamp: Date.now()
      })
    }
  }

  private async sync(): Promise<void> {
    if (!this.isOnline) return

    const operations = await this.db.all('SELECT * FROM sync_queue LIMIT 100')

    for (const op of operations) {
      try {
        await this.sendOperation(op)
        await this.db.run('DELETE FROM sync_queue WHERE id = ?', [op.id])
      } catch (error) {
        console.error('Sync failed:', error)
        break
      }
    }
  }

  private async sendOperation(operation: any): Promise<void> {
    // Send to Cloudflare Workers
    const response = await fetch('/api/v1/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation)
    })

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`)
    }
  }

  private handleOnline(): void {
    this.isOnline = true
    this.sync() // Sync immediately when coming online
  }

  private handleOffline(): void {
    this.isOnline = false
  }
}
```

### Conflict Resolution

```typescript
// services/sync/conflict-resolver.ts
export class ConflictResolver {
  async resolveConflict(
    localVersion: any,
    remoteVersion: any,
    conflictStrategy: 'local-wins' | 'remote-wins' | 'merge' = 'merge'
  ): Promise<any> {
    switch (conflictStrategy) {
      case 'local-wins':
        return localVersion

      case 'remote-wins':
        return remoteVersion

      case 'merge':
        return await this.mergeVersions(localVersion, remoteVersion)

      default:
        throw new Error(`Unknown conflict strategy: ${conflictStrategy}`)
    }
  }

  private async mergeVersions(local: any, remote: any): Promise<any> {
    // Merge logic for tensor cells
    if (local.temperature > remote.temperature) {
      // Local cell is "hotter", prioritize local
      return {
        ...remote,
        value: local.value,
        temperature: local.temperature
      }
    } else {
      // Remote cell is "hotter", prioritize remote
      return {
        ...local,
        value: remote.value,
        temperature: remote.temperature
      }
    }
  }
}
```

---

## Hardware Integration (Docker)

### Arduino Service

**docker/Dockerfile.hardware:**

```dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pyserial \
    python3-usb \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements-hardware.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements-hardware.txt

# Copy service code
COPY services/hardware/ /app/

# Expose port for WebSocket connections
EXPOSE 9000

# Run hardware service
CMD ["python", "-m", "hardware_service"]
```

### Hardware Service

**services/hardware/hardware_service.py:**

```python
#!/usr/bin/env python3
import asyncio
import serial
import json
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse

app = FastAPI()

# Store active connections
active_connections = []

# Arduino device connections
devices = {}

@app.on_event("startup")
async def startup():
    """Initialize hardware connections on startup."""
    await discover_devices()

async def discover_devices():
    """Discover connected Arduino/ESP32 devices."""
    import serial.tools.list_ports

    ports = serial.tools.list_ports.comports()
    for port in ports:
        if "Arduino" in port.description or "CP210" in port.description:
            devices[port.device] = await connect_device(port.device)
            print(f"Connected to device: {port.device}")

async def connect_device(port: str):
    """Connect to a serial device."""
    try:
        ser = serial.Serial(port, 115200, timeout=1)
        return {"serial": ser, "last_read": None}
    except Exception as e:
        print(f"Failed to connect to {port}: {e}")
        return None

@app.websocket("/ws/hardware/{device_id}")
async def hardware_websocket(websocket: WebSocket, device_id: str):
    """WebSocket endpoint for hardware data streaming."""
    await websocket.accept()
    active_connections.append(websocket)

    try:
        while True:
            # Read from device
            device = devices.get(device_id)
            if device and device["serial"]:
                data = device["serial"].readline().decode('utf-8').strip()
                if data:
                    # Parse sensor data
                    sensor_data = parse_sensor_data(data)

                    # Send to all connected clients
                    await broadcast_update(device_id, sensor_data)

            await asyncio.sleep(0.01)
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        active_connections.remove(websocket)

def parse_sensor_data(data: str) -> dict:
    """Parse sensor data from Arduino."""
    try:
        return json.loads(data)
    except json.JSONDecodeError:
        # Parse simple key-value format
        parts = data.split(',')
        result = {}
        for part in parts:
            key, value = part.split(':')
            result[key.strip()] = float(value)
        return result

async def broadcast_update(device_id: str, data: dict):
    """Broadcast sensor data to all connected clients."""
    message = json.dumps({
        "device_id": device_id,
        "data": data,
        "timestamp": asyncio.get_event_loop().time()
    })

    for connection in active_connections:
        try:
            await connection.send_text(message)
        except Exception as e:
            print(f"Failed to send message: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)
```

---

## Performance Optimization

### GPU Acceleration

**scripts/optimize-gpu.sh:**

```bash
#!/bin/bash

# Check for GPU availability
if command -v nvidia-smi &> /dev/null; then
    echo "NVIDIA GPU detected"

    # Get GPU info
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader

    # Set GPU memory growth
    export TF_FORCE_GPU_ALLOW_GROWTH=true
    export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True

    # Enable cuDNN auto-tuner
    export CUDA_VISIBLE_DEVICES=0
    export CUBLAS_WORKSPACE_CONFIG=:4096:8

    echo "GPU optimizations enabled"
else
    echo "No GPU detected, using CPU"
fi
```

### Memory Optimization

```typescript
// services/performance/memory-optimizer.ts
export class MemoryOptimizer {
  private cache: Map<string, any>
  private maxCacheSize: number

  constructor(maxCacheSize: number = 1000) {
    this.cache = new Map()
    this.maxCacheSize = maxCacheSize
  }

  get(key: string): any | undefined {
    const value = this.cache.get(key)

    if (value) {
      // Move to end (LRU)
      this.cache.delete(key)
      this.cache.set(key, value)
    }

    return value
  }

  set(key: string, value: any): void {
    // Remove oldest if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, value)
  }

  clear(): void {
    this.cache.clear()
  }

  // Optimize tensor operations
  optimizeTensor(tensor: any): any {
    // Convert to typed array for better performance
    if (Array.isArray(tensor)) {
      return new Float32Array(tensor)
    }
    return tensor
  }
}
```

---

## Troubleshooting

### Common Issues

**Issue: Docker containers won't start**
```bash
# Check Docker status
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker

# Check logs
docker-compose logs
```

**Issue: Can't access USB devices**
```bash
# Add user to dialout group
sudo usermod -a -G dialout $USER

# Reboot or log out and back in
```

**Issue: Poor performance on Jetson**
```bash
# Enable maximum performance
sudo nvpmodel -m 0
sudo jetson_clocks

# Check GPU status
tegrastats
```

**Issue: High memory usage**
```bash
# Limit Docker memory
docker-compose up -d --memory 4g

# Monitor memory usage
docker stats
```

---

## Cost & Resource Requirements

### Minimum Requirements

**Standard Desktop:**
- CPU: 4 cores
- RAM: 8GB
- Storage: 50GB
- Network: 10 Mbps

**Jetson Device:**
- Model: Jetson Orin Nano (8GB) or better
- Storage: 64GB SD card or NVMe SSD
- Network: Ethernet or WiFi

### Recommended Requirements

**High-Performance Desktop:**
- CPU: 8+ cores
- RAM: 16GB+
- Storage: 100GB+ NVMe SSD
- GPU: NVIDIA RTX 3050 or better
- Network: 100 Mbps

**Jetson AGX Orin:**
- RAM: 64GB
- Storage: 256GB NVMe SSD
- GPU: 2048 CUDA cores

---

## Next Steps

1. Build Docker images for your platform
2. Test hardware integration
3. Configure offline sync settings
4. Optimize performance for your hardware
5. Set up automatic updates
6. Create desktop shortcuts/icons
7. Configure backup strategy
8. Test disaster recovery

---

**Support:** For issues or questions, contact desktop@spreadsheetmoment.com
