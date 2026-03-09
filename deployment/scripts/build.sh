#!/bin/bash
# POLLN Build Script
# Builds Docker images for deployment

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DOCKERFILE="${PROJECT_ROOT}/deployment/docker/Dockerfile"
IMAGE_NAME="polln/polln"
REGISTRY="${REGISTRY:-docker.io}"
TAG="${TAG:-latest}"
BUILD_TYPE="${BUILD_TYPE:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =============================================================================
# Functions
# =============================================================================
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."

    if ! command -v docker &> /dev/null; then
        log_error "docker is not installed"
        exit 1
    fi

    if ! command -v git &> /dev/null; then
        log_error "git is not installed"
        exit 1
    fi

    log_info "Dependencies OK"
}

build_image() {
    local target="${1:-production}"
    local tag="${2:-$TAG}"

    log_info "Building Docker image..."
    log_info "Target: $target"
    log_info "Tag: $tag"

    docker build \
        --file "$DOCKERFILE" \
        --target "$target" \
        --tag "$IMAGE_NAME:$tag" \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        --progress=plain \
        "$PROJECT_ROOT"

    log_info "Build complete: $IMAGE_NAME:$tag"
}

tag_image() {
    local source_tag="$1"
    local target_tag="$2"

    log_info "Tagging $source_tag -> $target_tag"
    docker tag "$IMAGE_NAME:$source_tag" "$IMAGE_NAME:$target_tag"
}

push_image() {
    local tag="${1:-$TAG}"

    log_info "Pushing image: $IMAGE_NAME:$tag"

    docker push "$IMAGE_NAME:$tag"

    log_info "Push complete"
}

scan_image() {
    local tag="${1:-$TAG}"

    log_info "Scanning image for vulnerabilities..."

    if command -v trivy &> /dev/null; then
        trivy image --severity HIGH,CRITICAL "$IMAGE_NAME:$tag"
    else
        log_warn "trivy not installed, skipping security scan"
        log_warn "Install with: brew install trivy"
    fi
}

run_tests() {
    log_info "Running tests..."

    cd "$PROJECT_ROOT"

    if ! npm test; then
        log_error "Tests failed"
        exit 1
    fi

    log_info "Tests passed"
}

create_build_info() {
    local tag="$1"
    local git_sha="$(git rev-parse --short HEAD)"
    local git_branch="$(git rev-parse --abbrev-ref HEAD)"
    local build_date="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    local build_info_file="${PROJECT_ROOT}/dist/BUILD_INFO"

    cat > "$build_info_file" <<EOF
Build Information
=================
Image: ${IMAGE_NAME}:${tag}
Git SHA: ${git_sha}
Git Branch: ${git_branch}
Build Date: ${build_date}
Build Type: ${BUILD_TYPE}
EOF

    log_info "Build info written to $build_info_file"
}

print_usage() {
    cat <<EOF
Usage: $0 [COMMAND] [OPTIONS]

Commands:
    build           Build Docker image (default)
    test            Run tests before building
    push            Push image to registry
    scan            Scan image for vulnerabilities
    all             Run tests, build, tag, and push
    help            Show this help message

Options:
    TAG             Image tag (default: latest)
    BUILD_TYPE      Build target: production|development (default: production)
    REGISTRY        Docker registry (default: docker.io)

Environment Variables:
    TAG             Override image tag
    BUILD_TYPE      Override build type
    REGISTRY        Override registry

Examples:
    $0 build
    $0 build TAG=v1.0.0
    $0 build BUILD_TYPE=development
    $0 test && $0 build
    $0 all TAG=v1.0.0

EOF
}

# =============================================================================
# Main
# =============================================================================
main() {
    local command="${1:-build}"
    shift || true

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            TAG=*)
                TAG="${1#*=}"
                shift
                ;;
            BUILD_TYPE=*)
                BUILD_TYPE="${1#*=}"
                shift
                ;;
            REGISTRY=*)
                REGISTRY="${1#*=}"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done

    # Execute command
    case $command in
        build)
            check_dependencies
            build_image "$BUILD_TYPE" "$TAG"
            create_build_info "$TAG"
            ;;
        test)
            run_tests
            ;;
        push)
            push_image "$TAG"
            ;;
        scan)
            scan_image "$TAG"
            ;;
        all)
            check_dependencies
            run_tests
            build_image "$BUILD_TYPE" "$TAG"
            create_build_info "$TAG"
            scan_image "$TAG"
            push_image "$TAG"
            ;;
        help|--help|-h)
            print_usage
            ;;
        *)
            log_error "Unknown command: $command"
            print_usage
            exit 1
            ;;
    esac
}

main "$@"
