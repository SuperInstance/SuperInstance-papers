/**
 * Test script for minimal CLAW server
 * Run this after starting the server to verify it works
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080';

async function test() {
  console.log('Testing Minimal CLAW Server\n');

  try {
    // 1. Health check
    console.log('1. Health Check');
    const health = await fetch(`${BASE_URL}/health`).then(r => r.json());
    console.log('   ✓ Server is healthy:', health);

    // 2. Create an agent
    console.log('\n2. Create Agent');
    const createAgent = await fetch(`${BASE_URL}/api/v1/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        seed: 'Monitor cell A1 for temperature changes',
        equipment: ['MEMORY', 'REASONING'],
        trigger: { type: 'data', source: 'spreadsheet' },
        cellId: { sheetId: 'sheet1', row: 0, col: 0 },
      }),
    }).then(r => r.json());
    console.log('   ✓ Agent created:', createAgent.data.id);

    const agentId = createAgent.data.id;

    // 3. Get agent by ID
    console.log('\n3. Get Agent by ID');
    const getAgent = await fetch(`${BASE_URL}/api/v1/agents/${agentId}`).then(r => r.json());
    console.log('   ✓ Agent retrieved:', getAgent.data.state);

    // 4. Get agent by cell
    console.log('\n4. Get Agent by Cell');
    const getCellAgent = await fetch(`${BASE_URL}/api/v1/cells/sheet1/0/0/agent`).then(r => r.json());
    console.log('   ✓ Cell agent retrieved:', getCellAgent.data.id);

    // 5. Trigger agent
    console.log('\n5. Trigger Agent');
    const triggerAgent = await fetch(`${BASE_URL}/api/v1/agents/${agentId}/trigger`, {
      method: 'POST',
    }).then(r => r.json());
    console.log('   ✓ Agent triggered, now:', triggerAgent.data.state);

    // 6. List all agents
    console.log('\n6. List All Agents');
    const listAgents = await fetch(`${BASE_URL}/api/v1/agents`).then(r => r.json());
    console.log(`   ✓ ${listAgents.data.length} agent(s) total`);

    // 7. Equip agent
    console.log('\n7. Equip Agent');
    const equipAgent = await fetch(`${BASE_URL}/api/v1/agents/${agentId}/equip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipment: ['SPREADSHEET'] }),
    }).then(r => r.json());
    console.log('   ✓ Agent equipped:', equipAgent.data.equipped);

    // 8. Get agent state
    console.log('\n8. Get Agent State');
    const getAgentState = await fetch(`${BASE_URL}/api/v1/agents/${agentId}/state`).then(r => r.json());
    console.log('   ✓ Agent state:', getAgentState.data.state);

    // 9. Delete agent
    console.log('\n9. Delete Agent');
    await fetch(`${BASE_URL}/api/v1/agents/${agentId}`, {
      method: 'DELETE',
    });
    console.log('   ✓ Agent deleted');

    // 10. Verify deletion
    console.log('\n10. Verify Deletion');
    const verifyDelete = await fetch(`${BASE_URL}/api/v1/agents/${agentId}`).then(r => r.json());
    console.log('   ✓ Agent not found:', verifyDelete.success === false);

    console.log('\n✅ All tests passed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

test();
