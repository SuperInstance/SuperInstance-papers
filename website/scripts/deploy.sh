#!/bin/bash

# SuperInstance Website Deployment Script
# This script handles deployment to different environments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="staging"
SKIP_TESTS=false
SKIP_BUILD=false
VERBOSE=false
DRY_RUN=false

# Help function
show_help() {
    cat << EOF
SuperInstance Website Deployment Script

USAGE:
    ./deploy.sh [OPTIONS]

OPTIONS:
    -e, --environment ENV    Target environment (development, staging, production)
    -s, --skip-tests        Skip running tests
    -b, --skip-build        Skip build step
    -v, --verbose           Verbose output
    -d, --dry-run           Show what would be deployed without deploying
    -h, --help              Show this help message

EXAMPLES:
    ./deploy.sh                                    # Deploy to staging (default)
    ./deploy.sh -e production                      # Deploy to production
    ./deploy.sh -e production --skip-tests         # Deploy to production without tests
    ./deploy.sh -e production --dry-run            # Show production deployment plan

ENVIRONMENTS:
    development     Local development server (wrangler dev)
    staging         Staging environment on Cloudflare Pages
    production      Production environment on Cloudflare Pages (manual approval)

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -b|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Set verbose mode
if [ "$VERBOSE" = true ]; then
    set -x
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'${NC}"
    echo -e "Valid environments: development, staging, production"
    exit 1
fi

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEBSITE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to website directory
cd "$WEBSITE_DIR"

echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE} SuperInstance Website Deployment ${NC}"
echo -e "${BLUE}====================================${NC}"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "Skip tests: ${YELLOW}$SKIP_TESTS${NC}"
echo -e "Skip build: ${YELLOW}$SKIP_BUILD${NC}"
echo -e "Dry run: ${YELLOW}$DRY_RUN${NC}"
echo -e "${BLUE}====================================${NC}"
echo

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"

    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}Error: npm is not installed${NC}"
        exit 1
    fi

    # Check if wrangler is installed
    if ! command -v wrangler &> /dev/null; then
        echo -e "${YELLOW}Installing Wrangler CLI...${NC}"
        npm install -g wrangler@latest
    fi

    # Check if wrangler is logged in (only for staging/production)
    if [[ "$ENVIRONMENT" != "development" ]] && ! wrangler whoami &> /dev/null; then
        echo -e "${RED}Error: Not logged into Wrangler${NC}"
        echo -e "Run: ${YELLOW}wrangler login${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ All prerequisites met${NC}"
    echo
}

# Run tests
run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        echo -e "${YELLOW}Skipping tests${NC}"
        return
    fi

    echo -e "${BLUE}Running tests...${NC}"

    # Install dependencies
    echo -e "Installing dependencies..."
    npm ci

    # Run security audit
    echo -e "Running security audit..."
    npm audit --audit-level=high || echo -e "${YELLOW}Warning: Security audit found issues${NC}"

    # Run linting
    echo -e "Running linting..."
    npm run lint

    # Run format check
    echo -e "Checking code formatting..."
    npm run format:check

    # Run unit tests
    echo -e "Running unit tests..."
    npm run test:coverage

    # Run build to ensure it works
    if [ "$SKIP_BUILD" = false ]; then
        echo -e "Testing build..."
        npm run build
    fi

    echo -e "${GREEN}✅ All tests passed${NC}"
    echo
}

# Build the project
build_project() {
    if [ "$SKIP_BUILD" = true ]; then
        echo -e "${YELLOW}Skipping build${NC}"
        return
    fi

    echo -e "${BLUE}Building project...${NC}"

    # Set environment-specific build flags
    case $ENVIRONMENT in
        development)
            export NODE_ENV=development
            ;;
        staging)
            export NODE_ENV=staging
            ;;
        production)
            export NODE_ENV=production
            ;;
    esac

    # Build
    npm run build

    # Verify build output
    if [ ! -d "dist" ]; then
        echo -e "${RED}Error: Build failed - dist directory not found${NC}"
        exit 1
    fi

    # Show build statistics
    if [ -f "dist/index.html" ]; then
        BUILD_SIZE=$(du -sh dist | cut -f1)
        echo -e "Build size: ${GREEN}$BUILD_SIZE${NC}"
    fi

    echo -e "${GREEN}✅ Build completed successfully${NC}"
    echo
}

# Deploy to environment
deploy_to_environment() {
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}DRY RUN: Would deploy to $ENVIRONMENT${NC}"
        echo -e "Command: wrangler pages deploy dist"
        return
    fi

    echo -e "${BLUE}Deploying to $ENVIRONMENT...${NC}"

    case $ENVIRONMENT in
        development)
            # Run development server
            echo -e "Starting development server..."
            npm run dev
            ;;

        staging)
            # Deploy to staging
            echo -e "Deploying to staging environment..."
            wrangler pages deploy dist \
                --project-name=superinstance-website \
                --env=staging \
                --branch=main \
                --commit-hash=$(git rev-parse HEAD) \
                --commit-message="$(git log -1 --pretty=%B)" \
                --commit-dirty=true \
                --compatibility-date=2026-03-11
            ;;

        production)
            # Deploy to production (with confirmation)
            echo -e "${YELLOW}⚠️  PRODUCTION DEPLOYMENT ⚠️${NC}"
            echo -e "This will deploy to https://superinstance.ai"
            echo -e "Build version: $(git rev-parse --short HEAD)"
            echo -e "Are you sure you want to continue? (yes/no)"

            read -r response
            if [[ ! "$response" =~ ^[Yy][Ee][Ss]$ ]]; then
                echo -e "${RED}Production deployment cancelled${NC}"
                exit 0
            fi

            echo -e "Deploying to production..."
            wrangler pages deploy dist \
                --project-name=superinstance-website \
                --env=production \
                --branch=main \
                --commit-hash=$(git rev-parse HEAD) \
                --commit-message="$(git log -1 --pretty=%B)" \
                --commit-dirty=true \
                --compatibility-date=2026-03-11
            ;;
    esac

    echo -e "${GREEN}✅ Deployment completed${NC}"
}

# Post-deployment verification
verify_deployment() {
    if [ "$DRY_RUN" = true ] || [ "$ENVIRONMENT" = "development" ]; then
        return
    fi

    echo -e "${BLUE}Verifying deployment...${NC}"

    # Wait for deployment to propagate
    echo -e "Waiting for deployment to propagate (30 seconds)..."
    sleep 30

    # Set URL based on environment
    case $ENVIRONMENT in
        staging)
            URL="https://staging.superinstance.ai"
            ;;
        production)
            URL="https://superinstance.ai"
            ;;
    esac

    # Basic health check
    echo -e "Performing health check on $URL..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL")

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Health check passed (HTTP 200)${NC}"
    else
        echo -e "${RED}❌ Health check failed (HTTP $HTTP_CODE)${NC}"
        echo -e "${YELLOW}The deployment may still be propagating${NC}"
    fi

    echo -e "${BLUE}Deployment URL: $URL${NC}"
}

# Main execution
main() {
    check_prerequisites
    run_tests
    build_project
    deploy_to_environment
    verify_deployment

    echo
    echo -e "${GREEN}====================================${NC}"
    echo -e "${GREEN} Deployment completed successfully! ${NC}"
    echo -e "${GREEN}====================================${NC}"
}

# Run main function
main "$@" || {
    echo -e "${RED}Deployment failed!${NC}"
    exit 1
}

# Reset verbose mode on exit
if [ "$VERBOSE" = true ]; then
    set +x
fi