#!/bin/bash

# Test script for minimal CLAW server

echo "Testing Minimal CLAW Server"
echo "============================"

# 1. Health check
echo -e "\n1. Health Check"
curl -s http://localhost:8080/health | jq '.'

# 2. Create an agent
echo -e "\n2. Create Agent for Cell A1"
AGENT_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "seed": "Monitor cell A1 for temperature changes",
    "equipment": ["MEMORY", "REASONING"],
    "trigger": { "type": "data", "source": "spreadsheet" },
    "cellId": { "sheetId": "sheet1", "row": 0, "col": 0 }
  }')
echo "$AGENT_RESPONSE" | jq '.'

AGENT_ID=$(echo "$AGENT_RESPONSE" | jq -r '.data.id')
echo "Agent ID: $AGENT_ID"

# 3. Get agent by ID
echo -e "\n3. Get Agent by ID"
curl -s http://localhost:8080/api/v1/agents/$AGENT_ID | jq '.'

# 4. Get agent by cell
echo -e "\n4. Get Agent by Cell (sheet1:0:0)"
curl -s http://localhost:8080/api/v1/cells/sheet1/0/0/agent | jq '.'

# 5. Trigger agent
echo -e "\n5. Trigger Agent"
curl -s -X POST http://localhost:8080/api/v1/agents/$AGENT_ID/trigger | jq '.'

# 6. List all agents
echo -e "\n6. List All Agents"
curl -s http://localhost:8080/api/v1/agents | jq '.data | length'

# 7. Equip agent
echo -e "\n7. Equip Agent with SPREADSHEET"
curl -s -X POST http://localhost:8080/api/v1/agents/$AGENT_ID/equip \
  -H "Content-Type: application/json" \
  -d '{"equipment": ["SPREADSHEET"]}' | jq '.data.equipped'

# 8. Get agent state
echo -e "\n8. Get Agent State"
curl -s http://localhost:8080/api/v1/agents/$AGENT_ID/state | jq '.'

# Wait for agent to finish processing
echo -e "\nWaiting for agent to finish processing..."
sleep 3

# 9. Get final state
echo -e "\n9. Get Final Agent State"
curl -s http://localhost:8080/api/v1/agents/$AGENT_ID/state | jq '.'

# 10. Delete agent
echo -e "\n10. Delete Agent"
curl -s -X DELETE http://localhost:8080/api/v1/agents/$AGENT_ID | jq '.'

echo -e "\n✅ All tests completed!"
