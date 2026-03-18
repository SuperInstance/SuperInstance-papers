# Spreadsheet Moment - Staging Deployment Script (PowerShell)
# Automated deployment to staging environment
#
# Usage: .\deploy.ps1 [options]
# Options:
#   -SkipTests      Skip running tests
#   -SkipBuild      Skip building Docker image
#   -Rollback       Rollback to previous version
#   -DryRun         Show what would be done without executing

[CmdletBinding()]
param(
    [switch]$SkipTests,
    [switch]$SkipBuild,
    [switch]$Rollback,
    [switch]$DryRun
)

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$EnvFile = Join-Path $ProjectRoot "deployment\staging\.env.staging"
$DockerComposeFile = Join-Path $ProjectRoot "deployment\staging\docker-compose.staging.yml"
$HealthCheckUrl = "https://staging.spreadsheet-moment.superinstance.ai/health"

# Functions
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "[INFO] $Message" Blue
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "[SUCCESS] $Message" Green
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "[WARNING] $Message" Yellow
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "[ERROR] $Message" Red
}

function Print-Header {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  Spreadsheet Moment - Staging Deployment" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."

    # Check if Docker is installed
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker is not installed"
        exit 1
    }

    # Check if Docker Compose is installed
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Error "Docker Compose is not installed"
        exit 1
    }

    # Check if pnpm is installed
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        Write-Error "pnpm is not installed"
        exit 1
    }

    # Check if .env.staging exists
    if (-not (Test-Path $EnvFile)) {
        Write-Error "Environment file not found: $EnvFile"
        Write-Info "Please copy .env.staging.template to .env.staging and configure it"
        exit 1
    }

    Write-Success "Prerequisites check passed"
}

function Invoke-Tests {
    if ($SkipTests) {
        Write-Warning "Skipping tests as requested"
        return
    }

    Write-Info "Running test suite..."

    Push-Location $ProjectRoot

    try {
        # Run unit tests
        Write-Info "Running unit tests..."
        pnpm test

        # Run integration tests
        Write-Info "Running integration tests..."
        pnpm test:integration

        # Run linter
        Write-Info "Running linter..."
        pnpm lint

        Write-Success "All tests passed"
    }
    catch {
        Write-Error "Tests failed: $_"
        Pop-Location
        exit 1
    }

    Pop-Location
}

function Build-Image {
    if ($SkipBuild) {
        Write-Warning "Skipping build as requested"
        return
    }

    Write-Info "Building Docker image..."

    Push-Location $ProjectRoot

    try {
        $timestamp = Get-Date -Format "yyyy-MM-dd-HH-mm-ss"
        docker build `
            -f deployment\staging\Dockerfile `
            -t spreadsheet-moment:staging `
            -t spreadsheet-moment:staging-$timestamp `
            .

        Write-Success "Docker image built successfully"
    }
    catch {
        Write-Error "Docker build failed: $_"
        Pop-Location
        exit 1
    }

    Pop-Location
}

function Invoke-DockerComposeDeployment {
    Write-Info "Deploying with Docker Compose..."

    Push-Location $ProjectRoot

    try {
        # Stop existing containers
        Write-Info "Stopping existing containers..."
        docker-compose -f $DockerComposeFile down

        # Start new containers
        Write-Info "Starting new containers..."
        docker-compose -f $DockerComposeFile up -d

        Write-Success "Docker Compose deployment completed"
    }
    catch {
        Write-Error "Docker Compose deployment failed: $_"
        Pop-Location
        exit 1
    }

    Pop-Location
}

function Wait-HealthCheck {
    Write-Info "Waiting for application to be healthy..."

    $maxAttempts = 30
    $attempt = 0

    while ($attempt -lt $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri $HealthCheckUrl -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Success "Application is healthy"
                return
            }
        }
        catch {
            # Ignore errors and retry
        }

        $attempt++
        Write-Info "Health check attempt $attempt/$maxAttempts failed, retrying in 10 seconds..."
        Start-Sleep -Seconds 10
    }

    Write-Error "Health check failed after $maxAttempts attempts"
    exit 1
}

function Invoke-SmokeTests {
    Write-Info "Running smoke tests..."

    try {
        # Test health endpoint
        $response = Invoke-WebRequest -Uri $HealthCheckUrl -UseBasicParsing
        if ($response.StatusCode -ne 200) {
            throw "Health check failed"
        }

        # Test API endpoint
        $apiUrl = "https://staging-api.spreadsheet-moment.superinstance.ai/health"
        $response = Invoke-WebRequest -Uri $apiUrl -UseBasicParsing
        if ($response.StatusCode -ne 200) {
            throw "API health check failed"
        }

        Write-Success "Smoke tests passed"
    }
    catch {
        Write-Error "Smoke tests failed: $_"
        exit 1
    }
}

function Invoke-Rollback {
    Write-Warning "Initiating rollback..."

    Push-Location $ProjectRoot

    try {
        Write-Info "Rolling back Docker Compose deployment..."
        docker-compose -f $DockerComposeFile down
        docker-compose -f $DockerComposeFile up -d

        Write-Success "Rollback completed"
    }
    catch {
        Write-Error "Rollback failed: $_"
        Pop-Location
        exit 1
    }

    Pop-Location
}

function Invoke-Cleanup {
    Write-Info "Cleaning up old Docker images..."

    try {
        # Get all images and remove old ones (keep last 5)
        $images = docker images spreadsheet-moment:staging-* --format "{{.ID}}" | Select-Object -Skip 5
        if ($images) {
            $images | ForEach-Object { docker rmi $_ -f }
        }

        Write-Success "Cleanup completed"
    }
    catch {
        Write-Warning "Cleanup failed (non-critical): $_"
    }
}

# Main deployment flow
function Main {
    Print-Header

    # Handle rollback
    if ($Rollback) {
        Invoke-Rollback
        Wait-HealthCheck
        Write-Success "Rollback completed successfully!"
        return
    }

    # Handle dry run
    if ($DryRun) {
        Write-Info "Dry run mode - no changes will be made"
        Write-Info "Would run tests: $(if ($SkipTests) { 'no' } else { 'yes' })"
        Write-Info "Would build image: $(if ($SkipBuild) { 'no' } else { 'yes' })"
        Write-Info "Would deploy to: Docker Compose"
        return
    }

    # Execute deployment
    Test-Prerequisites
    Invoke-Tests
    Build-Image
    Invoke-DockerComposeDeployment
    Wait-HealthCheck
    Invoke-SmokeTests
    Invoke-Cleanup

    Print-Header
    Write-Success "Deployment to staging completed successfully!"
    Write-Host ""
    Write-Host "Staging URL: https://staging.spreadsheet-moment.superinstance.ai" -ForegroundColor Cyan
    Write-Host "Grafana Dashboard: http://localhost:3000 (admin/admin)" -ForegroundColor Cyan
    Write-Host "Jaeger Tracing: http://localhost:16686" -ForegroundColor Cyan
    Write-Host "Prometheus: http://localhost:9090" -ForegroundColor Cyan
    Write-Host ""
}

# Run main function
Main
