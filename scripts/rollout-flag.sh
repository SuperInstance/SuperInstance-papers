#!/bin/bash

# ============================================================================
# rollout-flag.sh - Gradual percentage rollout for a feature flag
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
STEPS=5
DURATION_PER_STEP=60  # minutes
WAIT_BETWEEN_STEPS=1440  # 24 hours in minutes
AUTO_CONFIRM=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -i|--id)
      FLAG_ID="$2"
      shift 2
      ;;
    -n|--name)
      FLAG_NAME="$2"
      shift 2
      ;;
    -s|--steps)
      STEPS="$2"
      shift 2
      ;;
    -d|--duration)
      DURATION_PER_STEP="$2"
      shift 2
      ;;
    -w|--wait)
      WAIT_BETWEEN_STEPS="$2"
      shift 2
      ;;
    -y|--yes)
      AUTO_CONFIRM=true
      shift
      ;;
    -h|--help)
      echo "Usage: rollout-flag.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -i, --id TEXT          Flag ID (required if name not provided)"
      echo "  -n, --name TEXT        Flag name (required if ID not provided)"
      echo "  -s, --steps INT        Number of rollout steps (default: 5)"
      echo "  -d, --duration INT     Duration per step in minutes (default: 60)"
      echo "  -w, --wait INT         Wait between steps in minutes (default: 1440)"
      echo "  -y, --yes              Auto-confirm without prompting"
      echo "  -h, --help             Show this help message"
      echo ""
      echo "Examples:"
      echo "  rollout-flag.sh -n new_dashboard -s 10"
      echo "  rollout-flag.sh -i flag_123 -s 3 -d 120 -w 2880"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Validate inputs
if [ -z "$FLAG_ID" ] && [ -z "$FLAG_NAME" ]; then
  echo -e "${RED}Error: Flag ID or name is required (-i|--id or -n|--name)${NC}"
  exit 1
fi

# If name is provided, get flag ID
if [ -n "$FLAG_NAME" ]; then
  API_URL="${FLAG_API_URL:-http://localhost:3000/api/flags}"
  FLAG_ID=$(curl -s "$API_URL?name=$FLAG_NAME" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

  if [ -z "$FLAG_ID" ]; then
    echo -e "${RED}Error: Flag '$FLAG_NAME' not found${NC}"
    exit 1
  fi
fi

# Calculate rollout percentages
PERCENTAGE_STEP=$((100 / STEPS))
declare -a ROLLOUT_PLAN=()

for ((i=1; i<=STEPS; i++)); do
  PERCENTAGE=$((i * PERCENTAGE_STEP))
  if [ $PERCENTAGE -gt 100 ]; then
    PERCENTAGE=100
  fi
  ROLLOUT_PLAN+=($PERCENTAGE)
done

# Display rollout plan
echo -e "${BLUE}=== Rollout Plan ===${NC}"
echo -e "Flag ID: ${GREEN}$FLAG_ID${NC}"
echo -e "Total Steps: ${GREEN}$STEPS${NC}"
echo -e "Duration per Step: ${GREEN}$DURATION_PER_STEP minutes${NC}"
echo -e "Wait Between Steps: ${GREEN}$WAIT_BETWEEN_STEPS minutes${NC}"
echo ""
echo "Rollout Schedule:"
for ((i=0; i<${#ROLLOUT_PLAN[@]}; i++)); do
  STEP_NUM=$((i + 1))
  PERCENTAGE=${ROLLOUT_PLAN[$i]}
  echo -e "  Step ${GREEN}$STEP_NUM${NC}: ${YELLOW}${PERCENTAGE}%${NC}"
done
echo ""

# Confirm rollout
if [ "$AUTO_CONFIRM" = false ]; then
  echo -n "Start rollout? (y/N): "
  read -r CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "${RED}Rollout cancelled${NC}"
    exit 0
  fi
fi

# Execute rollout
API_URL="${FLAG_API_URL:-http://localhost:3000/api/flags}"

echo -e "${YELLOW}Starting rollout...${NC}"

for ((i=0; i<${#ROLLOUT_PLAN[@]}; i++)); do
  STEP_NUM=$((i + 1))
  PERCENTAGE=${ROLLOUT_PLAN[$i]}

  echo -e "\n${BLUE}=== Step $STEP_NUM of $STEPS ===${NC}"
  echo -e "Setting rollout to ${GREEN}${PERCENTAGE}%${NC}"

  # Update flag
  RESPONSE=$(curl -s -X PATCH "$API_URL/$FLAG_ID" \
    -H "Content-Type: application/json" \
    -d "{
      \"state\": \"rollout\",
      \"rolloutPercentage\": $PERCENTAGE,
      \"rolloutStrategy\": \"gradual\"
    }")

  # Check for errors
  if echo "$RESPONSE" | grep -q "error"; then
    echo -e "${RED}Error updating flag:${NC}"
    echo "$RESPONSE"
    exit 1
  fi

  echo -e "${GREEN}✓ Flag updated to ${PERCENTAGE}%${NC}"

  # Get current stats
  STATS=$(curl -s "$API_URL/$FLAG_ID/stats")
  TRUE_COUNT=$(echo "$STATS" | grep -o '"trueCount":[0-9]*' | cut -d':' -f2)
  FALSE_COUNT=$(echo "$STATS" | grep -o '"falseCount":[0-9]*' | cut -d':' -f2)
  TOTAL=$((TRUE_COUNT + FALSE_COUNT))
  TRUE_RATE=0
  if [ $TOTAL -gt 0 ]; then
    TRUE_RATE=$((TRUE_COUNT * 100 / TOTAL))
  fi

  echo -e "Evaluations: ${GREEN}$TOTAL${NC}"
  echo -e "True Rate: ${GREEN}${TRUE_RATE}%${NC}"

  # Wait for step duration (except for last step)
  if [ $STEP_NUM -lt $STEPS ]; then
    echo -e "\n${YELLOW}Waiting ${WAIT_BETWEEN_STEPS} minutes before next step...${NC}"
    echo "(Press Ctrl+C to cancel rollout)"

    # Convert minutes to seconds for sleep
    SLEEP_TIME=$((WAIT_BETWEEN_STEPS * 60))
    sleep $SLEEP_TIME
  fi
done

echo -e "\n${GREEN}=== Rollout Complete ===${NC}"
echo -e "Flag is now at ${GREEN}100%${NC}"
echo ""
echo "To enable the flag permanently:"
echo "  enable-flag.sh -i $FLAG_ID"
