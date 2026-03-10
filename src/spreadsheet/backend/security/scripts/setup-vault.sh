#!/bin/bash

# setup-vault.sh - Local HashiCorp Vault setup for development
#
# This script sets up a local Vault instance in dev mode for testing
# the secret management system.

set -e

VAULT_VERSION="${VAULT_VERSION:-1.15.0}"
VAULT_DIR="${VAULT_DIR:-$HOME/.vault}"
VAULT_PID_FILE="$VAULT_DIR/vault.pid"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Vault is already installed
check_vault_installed() {
    if command -v vault &> /dev/null; then
        log_info "Vault is already installed: $(vault version)"
        return 0
    else
        log_warn "Vault not found. Installing..."
        return 1
    fi
}

# Install Vault
install_vault() {
    log_info "Installing Vault $VAULT_VERSION..."
    
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    
    if [ "$ARCH" = "x86_64" ]; then
        ARCH="amd64"
    elif [ "$ARCH" = "aarch64" ]; then
        ARCH="arm64"
    fi
    
    VAULT_ZIP="vault_${VAULT_VERSION}_${OS}_${ARCH}.zip"
    VAULT_URL="https://releases.hashicorp.com/vault/${VAULT_VERSION}/${VAULT_ZIP}"
    
    # Create temp directory
    TMP_DIR=$(mktemp -d)
    cd "$TMP_DIR"
    
    # Download Vault
    log_info "Downloading Vault from $VAULT_URL"
    curl -sSL "$VAULT_URL" -o vault.zip
    
    # Unzip
    log_info "Extracting Vault..."
    unzip -o vault.zip
    
    # Install
    log_info "Installing Vault to $VAULT_DIR/bin..."
    mkdir -p "$VAULT_DIR/bin"
    mv vault "$VAULT_DIR/bin/"
    chmod +x "$VAULT_DIR/bin/vault"
    
    # Add to PATH
    if ! grep -q "$VAULT_DIR/bin" ~/.bashrc 2>/dev/null && ! grep -q "$VAULT_DIR/bin" ~/.zshrc 2>/dev/null; then
        log_info "Adding Vault to PATH..."
        echo "export PATH=\"\$PATH:$VAULT_DIR/bin\"" >> ~/.bashrc
        export PATH="$PATH:$VAULT_DIR/bin"
    fi
    
    # Cleanup
    cd -
    rm -rf "$TMP_DIR"
    
    log_info "Vault installed successfully!"
}

# Start Vault in dev mode
start_vault() {
    log_info "Starting Vault in dev mode..."
    
    mkdir -p "$VAULT_DIR"
    cd "$VAULT_DIR"
    
    # Check if already running
    if [ -f "$VAULT_PID_FILE" ]; then
        PID=$(cat "$VAULT_PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            log_warn "Vault is already running (PID: $PID)"
            return 0
        else
            rm -f "$VAULT_PID_FILE"
        fi
    fi
    
    # Start Vault
    nohup vault server -dev > vault.log 2>&1 &
    VAULT_PID=$!
    echo "$VAULT_PID" > "$VAULT_PID_FILE"
    
    # Wait for Vault to start
    log_info "Waiting for Vault to start..."
    sleep 3
    
    if ps -p "$VAULT_PID" > /dev/null; then
        log_info "Vault started successfully (PID: $VAULT_PID)"
        log_info "Vault logs: $VAULT_DIR/vault.log"
    else
        log_error "Failed to start Vault. Check logs at $VAULT_DIR/vault.log"
        exit 1
    fi
}

# Stop Vault
stop_vault() {
    log_info "Stopping Vault..."
    
    if [ -f "$VAULT_PID_FILE" ]; then
        PID=$(cat "$VAULT_PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            kill "$PID"
            rm -f "$VAULT_PID_FILE"
            log_info "Vault stopped"
        else
            log_warn "Vault is not running"
            rm -f "$VAULT_PID_FILE"
        fi
    else
        log_warn "Vault PID file not found"
    fi
}

# Configure Vault
configure_vault() {
    log_info "Configuring Vault..."
    
    # Set environment variables
    export VAULT_ADDR='http://127.0.0.1:8200'
    
    # Get root token from logs
    ROOT_TOKEN=$(grep 'Root Token' "$VAULT_DIR/vault.log" | awk '{print $NF}')
    
    if [ -z "$ROOT_TOKEN" ]; then
        log_error "Failed to get root token"
        exit 1
    fi
    
    export VAULT_TOKEN="$ROOT_TOKEN"
    
    # Enable secrets engines
    log_info "Enabling KV secrets engine..."
    vault secrets enable -path=secret kv-v2 2>/dev/null || true
    
    # Enable transit for encryption
    log_info "Enabling transit secrets engine..."
    vault secrets enable transit 2>/dev/null || true
    
    # Create test secrets
    log_info "Creating test secrets..."
    vault kv put secret/test/api-key value="test-api-key-12345"
    vault kv put secret/test/database username="admin" password="test-password"
    
    # Create encryption key
    log_info "Creating encryption key..."
    vault write -f transit/keys/test-key
    
    log_info "Vault configured successfully!"
    log_info "Root token: $ROOT_TOKEN"
}

# Show Vault status
show_status() {
    log_info "Vault Status:"
    
    if [ -f "$VAULT_PID_FILE" ]; then
        PID=$(cat "$VAULT_PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "Status: Running"
            echo "PID: $PID"
            echo "Address: http://127.0.0.1:8200"
            echo "Logs: $VAULT_DIR/vault.log"
            
            export VAULT_ADDR='http://127.0.0.1:8200'
            vault status 2>/dev/null || true
        else
            echo "Status: Not running (stale PID file)"
        fi
    else
        echo "Status: Not running"
    fi
}

# Main script
main() {
    case "${1:-setup}" in
        setup)
            check_vault_installed || install_vault
            start_vault
            configure_vault
            show_status
            ;;
        start)
            start_vault
            show_status
            ;;
        stop)
            stop_vault
            ;;
        restart)
            stop_vault
            start_vault
            show_status
            ;;
        status)
            show_status
            ;;
        configure)
            configure_vault
            ;;
        *)
            echo "Usage: $0 {setup|start|stop|restart|status|configure}"
            echo ""
            echo "Commands:"
            echo "  setup     - Install, start, and configure Vault (default)"
            echo "  start     - Start Vault in dev mode"
            echo "  stop      - Stop Vault"
            echo "  restart   - Restart Vault"
            echo "  status    - Show Vault status"
            echo "  configure - Configure Vault with test secrets"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
