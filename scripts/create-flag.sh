#!/bin/bash

# ============================================================================
# create-flag.sh - Create a new feature flag
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="development"
TYPE="boolean"
DEFAULT_VALUE="false"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -n|--name)
      FLAG_NAME="$2"
      shift 2
      ;;
    -d|--description)
      FLAG_DESCRIPTION="$2"
      shift 2
      ;;
    -e|--environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    -t|--type)
      TYPE="$2"
      shift 2
      ;;
    -p|--percentage)
      PERCENTAGE="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: create-flag.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -n, --name TEXT        Flag name (required)"
      echo "  -d, --description TEXT Flag description (required)"
      echo "  -e, --environment TEXT Environment (default: development)"
      echo "  -t, --type TYPE        Flag type: boolean, percentage, experiment, multivariate (default: boolean)"
      echo "  -p, --percentage INT   Rollout percentage for percentage flags (0-100)"
      echo "  -h, --help             Show this help message"
      echo ""
      echo "Examples:"
      echo "  create-flag.sh -n new_dashboard -d 'Enable new dashboard UI'"
      echo "  create-flag.sh -n gradual_rollout -d 'Gradual rollout' -t percentage -p 10"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Validate required arguments
if [ -z "$FLAG_NAME" ]; then
  echo -e "${RED}Error: Flag name is required (-n|--name)${NC}"
  exit 1
fi

if [ -z "$FLAG_DESCRIPTION" ]; then
  echo -e "${RED}Error: Flag description is required (-d|--description)${NC}"
  exit 1
fi

# Validate type
if [[ ! "$TYPE" =~ ^(boolean|percentage|experiment|multivariate)$ ]]; then
  echo -e "${RED}Error: Invalid type '$TYPE'. Must be: boolean, percentage, experiment, or multivariate${NC}"
  exit 1
fi

# Validate percentage for percentage flags
if [ "$TYPE" = "percentage" ] && [ -n "$PERCENTAGE" ]; then
  if ! [[ "$PERCENTAGE" =~ ^[0-9]+$ ]] || [ "$PERCENTAGE" -lt 0 ] || [ "$PERCENTAGE" -gt 100 ]; then
    echo -e "${RED}Error: Percentage must be between 0 and 100${NC}"
    exit 1
  fi
fi

# Build JSON payload
JSON_PAYLOAD=$(cat <<EOF
{
  "name": "$FLAG_NAME",
  "description": "$FLAG_DESCRIPTION",
  "type": "$TYPE",
  "state": "disabled",
  "environment": "$ENVIRONMENT",
  "defaultValue": $DEFAULT_VALUE,
  $( [ "$TYPE" = "percentage" ] && [ -n "$PERCENTAGE" ] && echo "\"rolloutPercentage\": $PERCENTAGE," || echo "" )
  "tags": [],
  "rules": [],
  "killSwitchEnabled": false,
  "createdBy": "cli"
}
EOF
)

# Call API
API_URL="${FLAG_API_URL:-http://localhost:3000/api/flags}"
echo -e "${YELLOW}Creating flag: $FLAG_NAME${NC}"
echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
echo -e "${YELLOW}Type: $TYPE${NC}"

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

# Check for errors
if echo "$RESPONSE" | grep -q "error"; then
  echo -e "${RED}Error creating flag:${NC}"
  echo "$RESPONSE"
  exit 1
fi

# Extract flag ID from response
FLAG_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -n "$FLAG_ID" ]; then
  echo -e "${GREEN}✓ Flag created successfully!${NC}"
  echo -e "ID: ${GREEN}$FLAG_ID${NC}"
  echo -e "Name: ${GREEN}$FLAG_NAME${NC}"
  echo ""
  echo "To enable the flag:"
  echo "  enable-flag.sh -i $FLAG_ID"
  echo ""
  echo "To view the flag:"
  echo "  get-flag.sh -i $FLAG_ID"
else
  echo -e "${RED}Unexpected response:${NC}"
  echo "$RESPONSE"
  exit 1
fi
