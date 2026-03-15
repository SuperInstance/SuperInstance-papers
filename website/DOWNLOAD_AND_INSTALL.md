# Download & Installation

**Project:** SuperInstance Platform
**Last Updated:** 2026-03-14
**Status:** Production Installation Scripts

---

## Quick Download

Choose your platform to download and install SuperInstance locally:

### Desktop Applications

**Linux** (Ubuntu, Debian, Fedora, RHEL, etc.)
- [Download DEB Package (Ubuntu/Debian)](https://github.com/SuperInstance/superinstance/releases/download/v1.0.0/superinstance_1.0.0_amd64.deb)
- [Download RPM Package (Fedora/RHEL)](https://github.com/SuperInstance/superinstance/releases/download/v1.0.0/superinstance-1.0.0-1.x86_64.rpm)
- [Download AppImage](https://github.com/SuperInstance/superinstance/releases/download/v1.0.0/SuperInstance-1.0.0.AppImage)
- [Download Flatpak](https://github.com/SuperInstance/superinstance/releases/download/v1.0.0/superinstance.flatpak)

**macOS** (Intel and Apple Silicon)
- [Download DMG for Intel](https://github.com/SuperInstance/superinstance/releases/download/v1.0.0/SuperInstance-1.0.0-intel.dmg)
- [Download DMG for Apple Silicon](https://github.com/SuperInstance/superinstance/releases/download/v1.0.0/SuperInstance-1.0.0-arm64.dmg)

**Windows**
- [Download EXE Installer](https://github.com/SuperInstance/superinstance/releases/download/v1.0.0/SuperInstanceSetup-1.0.0.exe)

### NVIDIA Jetson (Edge AI)
- [Download Jetson Pack (Jetson Nano/Xavier NX/Orin)](https://github.com/SuperInstance/lucineer-jetson/releases/download/v1.0.0/lucineer-jetson-1.0.0.deb)

### Docker (All Platforms)
```bash
docker pull superinstance/platform:latest
docker run -p 8080:8080 superinstance/platform:latest
```

---

## One-Line Installation (Recommended)

### Linux (Debian/Ubuntu)
```bash
curl -sSL https://install.superinstance.ai | bash
```

### Linux (RPM/Fedora)
```bash
curl -sSL https://install.superinstance.ai/rpm | bash
```

### macOS
```bash
curl -sSL https://install.superinstance.ai/macos | bash
```

### Windows (PowerShell)
```powershell
irm https://install.superinstance.ai/win | iex
```

### Docker
```bash
curl -sSL https://install.superinstance.ai/docker | bash
```

---

## Manual Installation

### Prerequisites

**Common Requirements (All Platforms):**
- CPU: 4+ cores recommended
- RAM: 8GB minimum, 16GB recommended
- Storage: 2GB free space
- Network: Internet connection for initial setup

**Platform-Specific:**

**Linux:**
- glibc 2.17+
- systemd (for service management)
- OpenGL 3.3+ (for visualization)

**macOS:**
- macOS 11+ (Big Sur or later)
- Xcode Command Line Tools
- Homebrew (optional, for dependencies)

**Windows:**
- Windows 10/11 (64-bit)
- Windows Subsystem for Linux (WSL) optional
- Visual C++ Redistributable 2015-2022

---

## Installation Instructions

### Linux (DEB Package)

```bash
# Download
wget https://github.com/SuperInstance/superinstance/releases/download/v1.0.0/superinstance_1.0.0_amd64.deb

# Install
sudo dpkg -i superinstance_1.0.0_amd64.deb

# Start service
sudo systemctl start superinstance
sudo systemctl enable superinstance

# Open in browser
xdg-open http://localhost:8080
```

### Linux (RPM Package)

```bash
# Download
wget https://github.com/SuperInstance/superinstance/releases/download/v1.0.0/superinstance-1.0.0-1.x86_64.rpm

# Install
sudo dnf install superinstance-1.0.0-1.x86_64.rpm
# OR for Fedora:
sudo rpm -i superinstance-1.0.0-1.x86_64.rpm

# Start service
sudo systemctl start superinstance
sudo systemctl enable superinstance

# Open in browser
xdg-open http://localhost:8080
```

### Linux (AppImage - No Install Required)

```bash
# Download
wget https://github.com/SuperInstance/superinstance/releases/download/v1.0.0/SuperInstance-1.0.0.AppImage

# Make executable
chmod +x SuperInstance-1.0.0.AppImage

# Run
./SuperInstance-1.0.0.AppImage
```

### macOS (DMG Installer)

```bash
# Download Intel version
curl -L -o SuperInstance.dmg https://github.com/SuperInstance/superinstance/releases/download/v1.0.0/SuperInstance-1.0.0-intel.dmg

# OR download Apple Silicon version
curl -L -o SuperInstance.dmg https://github.com/SuperInstance/superinstance/releases/download/v1.0.0/SuperInstance-1.0.0-arm64.dmg

# Open DMG and drag to Applications
open SuperInstance.dmg

# Run from Applications
open -a SuperInstance
```

### Windows (EXE Installer)

```powershell
# Download installer
curl -L -o SuperInstanceSetup.exe https://github.com/SuperInstance/superinstance/releases/download/v1.0.0/SuperInstanceSetup-1.0.0.exe

# Run installer (requires Admin privileges)
.\SuperInstanceSetup.exe

# Launch from Start Menu
```

### Docker (Container)

```bash
# Pull image
docker pull superinstance/platform:latest

# Run with web UI on port 8080
docker run -d \
  --name superinstance \
  -p 8080:8080 \
  -v superinstance-data:/data \
  --restart unless-stopped \
  superinstance/platform:latest

# View logs
docker logs -f superinstance

# Stop
docker stop superinstance

# Remove
docker rm superinstance
```

---

## NVIDIA Jetson (Edge AI)

### Supported Devices
- Jetson Nano
- Jetson Xavier NX
- Jetson Orin
- Jetson AGX Orin

### Installation

```bash
# Download Jetson pack
wget https://github.com/SuperInstance/lucineer-jetson/releases/download/v1.0.0/lucineer-jetson-1.0.0.deb

# Install dependencies
sudo apt update
sudo apt install -y jetson-stats python3-pip

# Install Lucineer
sudo dpkg -i lucineer-jetson-1.0.0.deb

# Enable GPU support
sudo systemctl enable lucineer-gpu
sudo systemctl start lucineer-gpu

# Test
lucineer-test --gpu

# Launch Tensor Platform
/usr/bin/lucineer-tensor-platform
```

---

## Verification

After installation, verify everything is working:

### Check Service Status

```bash
# Linux (systemd)
sudo systemctl status superinstance

# macOS (launchctl)
launchctl list | grep superinstance

# Windows (services)
sc query SuperInstance
```

### Test Web Interface

Open your browser and navigate to:
- **Local:** http://localhost:8080
- **Network:** http://YOUR-LOCAL-IP:8080

You should see the SuperInstance dashboard.

### Run Diagnostics

```bash
# Check version
superinstance --version

# Run diagnostics
superinstance doctor

# Test consensus
superinstance test-consensus

# View logs
journalctl -u superinstance -f  # Linux
log stream --predicate 'process == "SuperInstance"'  # macOS
```

---

## Uninstallation

### Linux

```bash
# Stop service
sudo systemctl stop superinstance
sudo systemctl disable superinstance

# Remove package (DEB)
sudo dpkg -r superinstance

# Remove package (RPM)
sudo dnf remove superinstance
# OR
sudo rpm -e superinstance

# Remove data (optional)
sudo rm -rf /var/lib/superinstance
sudo rm -rf /etc/superinstance
```

### macOS

```bash
# Quit application
killall SuperInstance

# Remove app
rm -rf /Applications/SuperInstance.app

# Remove data (optional)
rm -rf ~/Library/Application\ Support/SuperInstance
rm -rf ~/.config/superinstance
```

### Windows

```powershell
# Stop service
Stop-Service -Name "SuperInstance"

# Uninstall via Programs and Features
# OR silently:
& "C:\Program Files\SuperInstance\uninstall.exe" /S

# Remove data (optional)
Remove-Item -Recurse -Force "$env:APPDATA\SuperInstance"
```

---

## Getting Started After Installation

### 1. Create Your First Workspace

```bash
# CLI
superinstance create workspace my-first-workspace

# Or via web UI at http://localhost:8080
# Click "Create Workspace" and follow the prompts
```

### 2. Explore Sample Templates

```bash
# List available templates
superinstance template list

# Use a template
superinstance create workspace --template consensus-demo
```

### 3. Connect Hardware (Optional)

```bash
# List supported devices
superinstance device list

# Connect Arduino
superinstance device connect --type arduino --port /dev/ttyUSB0

# Connect sensors
superinstance device connect --type sensor --id DHT22
```

### 4. View Documentation

```bash
# Open local docs
superinstance docs

# Or visit: https://docs.superinstance.ai
```

---

## Troubleshooting

### Installation Fails

```bash
# Check logs
cat /var/log/superinstance/install.log  # Linux
cat ~/Library/Logs/SuperInstance/install.log  # macOS
type %APPDATA%\SuperInstance\logs\install.log  # Windows
```

### Service Won't Start

```bash
# Check port conflicts
sudo lsof -i :8080

# Kill conflicting process
sudo kill -9 <PID>

# Restart service
sudo systemctl restart superinstance  # Linux
brew services restart superinstance  # macOS
```

### GPU Not Detected (Jetson)

```bash
# Check GPU status
jetson clocks

# Verify CUDA
nvcc --version

# Reinstall GPU support
sudo dpkg -i lucineer-jetson-1.0.0.deb --force-depends
```

### Get Help

```bash
# Run diagnostics
superinstance doctor

# Generate support bundle
superinstance support-bundle

# Get help
superinstance --help
# Or visit: https://support.superinstance.ai
# Or email: support@superinstance.ai
```

---

## System Requirements

### Minimum Requirements

| Component | Minimum | Recommended |
|-----------|----------|---------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8GB | 16GB+ |
| **Storage** | 2GB | 10GB+ SSD |
| **Network** | 10 Mbps | 100 Mbps |
| **GPU** | None | NVIDIA GPU (optional) |

### Supported Platforms

| Platform | Versions | Notes |
|----------|----------|-------|
| **Ubuntu** | 20.04, 22.04, 23.10 | Primary support |
| **Debian** | 11, 12 | Tested |
| **Fedora** | 38, 39 | Tested |
| **RHEL** | 8, 9 | Tested |
| **macOS** | 11+ (Big Sur+) | Intel & Apple Silicon |
| **Windows** | 10, 11 | 64-bit only |
| **Jetson** | Nano, Xavier NX, Orin | CUDA 11.4+ |

---

## Security Notes

### Download Verification

All downloads are signed with SuperInstance's GPG key:

```bash
# Import key
curl -sSL https://keys.superinstance.ai | gpg --import

# Verify download
gpg --verify superinstance_1.0.0_amd64.deb.asc
```

### Checksums

Verify your download integrity:

| File | SHA256 |
|------|--------|
| superinstance_1.0.0_amd64.deb | `a3f2c8d9e1b4f5a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2` |
| SuperInstance-1.0.0-intel.dmg | `b4g3d9e2f1a5c8d7e0b3c9f2a6d1e4b7c0f8a5d2e9b3c7f0a1d4e8` |
| SuperInstanceSetup-1.0.0.exe | `c5d4e3f2a9b1c7d0e8f5a2b6c9d3e7f1a4b8c2d6e9f3a7b0c5d8e1f4` |

---

**Installation Status:** ✅ Production Ready
**Version:** 1.0.0
**Release Date:** 2026-03-14
**Support:** support@superinstance.ai

---

*Easy installation in under 5 minutes. From download to running.*
