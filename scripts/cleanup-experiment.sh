#!/bin/bash

# ============================================================================
# cleanup-experiment.sh - Clean up old or completed experiments
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
OLDER_THAN_DAYS=90
STATE="completed"
DRY_RUN=true
AUTO_CONFIRM=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -s|--state)
      STATE="$2"
      shift 2
      ;;
    -d|--days)
      OLDER_THAN_DAYS="$2"
      shift 2
      ;;
    -e|--execute)
      DRY_RUN=false
      shift
      ;;
    -y|--yes)
      AUTO_CONFIRM=true
      shift
      ;;
    -h|--help)
      echo "Usage: cleanup-experiment.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -s, --state TEXT       Experiment state filter (default: completed)"
      echo "  -d, --days INT         Delete experiments older than this many days (default: 90)"
      echo "  -e, --execute          Execute cleanup (default: dry run)"
      echo "  -y, --yes              Auto-confirm without prompting"
      echo "  -h, --help             Show this help message"
      echo ""
      echo "States: draft, running, paused, completed, archived"
      echo ""
      echo "Examples:"
      echo "  cleanup-experiment.sh -d 30 -e"
      echo "  cleanup-experiment.sh -s archived -d 180 -e"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Calculate cutoff date
CUTOFF_DATE=$(date -d "$OLDER_THAN_DAYS days ago" +"%Y-%m-%d %H:%M:%S")

# Display cleanup plan
echo -e "${BLUE}=== Experiment Cleanup ===${NC}"
echo -e "State Filter: ${GREEN}$STATE${NC}"
echo -e "Older Than: ${GREEN}$OLDER_THAN_DAYS days${NC}"
echo -e "Cutoff Date: ${GREEN}$CUTOFF_DATE${NC}"
echo -e "Mode: ${YELLOW}${DRY_RUN:-DRY RUN}${NC}"
echo ""

# Get experiments to delete
API_URL="${EXPERIMENT_API_URL:-http://localhost:3000/api/experiments}"
RESPONSE=$(curl -s "$API_URL?state=$STATE")

# Parse experiment count
EXPERIMENT_COUNT=$(echo "$RESPONSE" | grep -o '"id":' | wc -l)

if [ "$EXPERIMENT_COUNT" -eq 0 ]; then
  echo -e "${YELLOW}No experiments found matching criteria${NC}"
  exit 0
fi

# List experiments to be deleted
echo -e "${BLUE}Experiments to be deleted:${NC}"
echo "$RESPONSE" | grep -o '"id":"[^"]*","name":"[^"]*"' | sed 's/","id":/ /' | sed 's/","name":"/: /' | while read -r line; do
  echo -e "  ${RED}×${NC} $line"
done
echo ""

# Confirm deletion
if [ "$AUTO_CONFIRM" = false ]; then
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}This is a DRY RUN. No experiments will be deleted.${NC}"
    echo -e "Use ${GREEN}-e, --execute${NC} to perform actual deletion."
    echo ""
  fi

  echo -n "Continue? (y/N): "
  read -r CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "${RED}Cleanup cancelled${NC}"
    exit 0
  fi
fi

# Execute deletion
if [ "$DRY_RUN" = false ]; then
  echo -e "${YELLOW}Deleting experiments...${NC}"

  # Extract experiment IDs and delete them
  echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | while read -r EXP_ID; do
    echo -n "  Deleting $EXP_ID... "

    DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/$EXP_ID")

    if echo "$DELETE_RESPONSE" | grep -q "error"; then
      echo -e "${RED}FAILED${NC}"
      echo "$DELETE_RESPONSE"
    else
      echo -e "${GREEN}✓${NC}"
    fi
  done

  echo -e "\n${GREEN}=== Cleanup Complete ===${NC}"
else
  echo -e "${GREEN}=== Dry Run Complete ===${NC}"
  echo "Run with -e, --execute to perform actual deletion."
fi

# Summary
echo ""
echo -e "Total experiments: ${GREEN}$EXPERIMENT_COUNT${NC}"
if [ "$DRY_RUN" = false ]; then
  echo -e "${GREEN}All deleted${NC}"
else
  echo -e "${YELLOW}Would be deleted (dry run)${NC}"
fi
