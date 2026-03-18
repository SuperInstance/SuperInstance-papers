# SuperInstance Tutorial

**A hands-on tutorial for building your first cellular agent system**

---

## Welcome to the Tutorial!

This tutorial will walk you through building a complete cellular agent system from scratch. By the end, you'll have:
- ✅ Multiple agents working together
- ✅ Real-time monitoring and updates
- ✅ A working demo you can show others
- ✅ Understanding of how everything fits together

**Time Required**: 30-45 minutes
**Difficulty**: Beginner-friendly
**Prerequisites**: Completed [Getting Started Guide](./GETTING_STARTED.md)

---

## Tutorial Overview

We're going to build a **Temperature Monitoring System** with multiple agents:

```
┌─────────────────────────────────────────────────────────────┐
│                  TEMPERATURE DASHBOARD                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Sensor 1 (A1) → Monitor Agent → Alert if > 100°C           │
│  Sensor 2 (B1) → Monitor Agent → Alert if > 100°C           │
│  Sensor 3 (C1) → Monitor Agent → Alert if > 100°C           │
│                                                               │
│  D1 → Coordinator Agent → Aggregate alerts                   │
│  E1 → Logger Agent → Log all events                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 1: Setup (5 minutes)

### Step 1.1: Start the Server

Open your terminal and navigate to the minimal-claw-server directory:

```bash
cd C:\Users\casey\polln\minimal-claw-server
npm start
```

You should see:
```
╔════════════════════════════════════════════════════════════╗
║           MINIMAL CLAW SERVER - MVP DEMONSTRATION          ║
╠════════════════════════════════════════════════════════════╣
║  Status: Running                                           ║
║  Port: 8080                                                ║
║  Health: http://localhost:8080/health                      ║
║  Agents: 0                                                 ║
╚════════════════════════════════════════════════════════════╝
```

**Keep this terminal open!** The server needs to keep running.

### Step 1.2: Verify Server is Working

Open a **new terminal** (leave the first one running) and test:

```bash
curl http://localhost:8080/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2026-03-18T12:00:00Z",
  "uptime": 1234,
  "agents": 0
}
```

**Great!** The server is working. Let's build something.

---

## Part 2: Your First Agent (10 minutes)

### Step 2.1: Create a Monitor Agent

We'll create an agent that monitors temperature in cell A1.

**Option A: Using curl**

```bash
curl -X POST http://localhost:8080/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "seed": "Monitor temperature in cell A1 and alert if exceeds 100°C",
    "equipment": ["MEMORY", "REASONING"],
    "trigger": {
      "type": "data",
      "source": "temperature_sensor_1"
    },
    "cellId": {
      "sheetId": "temperature_dashboard",
      "row": 0,
      "col": 0
    }
  }'
```

**Option B: Using Node.js**

Create a file called `create-agent.js`:

```javascript
const axios = require('axios');

async function createMonitorAgent() {
  try {
    const response = await axios.post('http://localhost:8080/api/v1/agents', {
      model: 'deepseek-chat',
      seed: 'Monitor temperature in cell A1 and alert if exceeds 100°C',
      equipment: ['MEMORY', 'REASONING'],
      trigger: {
        type: 'data',
        source: 'temperature_sensor_1'
      },
      cellId: {
        sheetId: 'temperature_dashboard',
        row: 0,
        col: 0
      }
    });

    console.log('✅ Agent created successfully!');
    console.log('Agent ID:', response.data.id);
    console.log('State:', response.data.state);
    console.log('Cell:', `${response.data.cellId.sheetId}!${String.fromCharCode(65 + response.data.cellId.col)}${response.data.cellId.row + 1}`);

    return response.data.id;
  } catch (error) {
    console.error('❌ Error creating agent:', error.response?.data || error.message);
  }
}

createMonitorAgent();
```

Run it:
```bash
node create-agent.js
```

### Step 2.2: Check Your Agent

Let's verify the agent was created:

```bash
curl http://localhost:8080/api/v1/agents
```

You should see your agent in the list!

### Step 2.3: Trigger Your Agent

Now let's make the agent do something:

```bash
# Replace {AGENT_ID} with your actual agent ID
curl -X POST http://localhost:8080/api/v1/agents/{AGENT_ID}/trigger
```

Watch the agent state change:
```bash
curl http://localhost:8080/api/v1/agents/{AGENT_ID}/state
```

You should see the state transition: `IDLE → THINKING → ACTING → IDLE`

**Congratulations!** You've created and triggered your first agent! 🎉

---

## Part 3: Building the System (15 minutes)

Now let's build our complete temperature monitoring system with multiple agents.

### Step 3.1: Create the System Script

Create a file called `temperature-system.js`:

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:8080/api/v1';

// Helper function to create agents
async function createAgent(config) {
  try {
    const response = await axios.post(`${API_BASE}/agents`, config);
    console.log(`✅ Created ${config.seed.substring(0, 30)}...`);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to create agent:`, error.response?.data || error.message);
    throw error;
  }
}

// Helper function to trigger agent
async function triggerAgent(agentId, data = {}) {
  try {
    const response = await axios.post(`${API_BASE}/agents/${agentId}/trigger`, { data });
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to trigger agent:`, error.response?.data || error.message);
    throw error;
  }
}

// Helper function to get agent state
async function getAgentState(agentId) {
  try {
    const response = await axios.get(`${API_BASE}/agents/${agentId}/state`);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to get agent state:`, error.response?.data || error.message);
    throw error;
  }
}

// Main function to build the system
async function buildTemperatureSystem() {
  console.log('🏗️  Building Temperature Monitoring System...\n');

  const agents = {};

  // Step 1: Create sensor monitoring agents
  console.log('Step 1: Creating sensor monitoring agents...');
  agents.sensor1 = await createAgent({
    model: 'deepseek-chat',
    seed: 'Monitor temperature sensor 1 and alert if > 100°C',
    equipment: ['MEMORY', 'REASONING'],
    trigger: { type: 'data', source: 'temperature_sensor_1' },
    cellId: { sheetId: 'temperature_dashboard', row: 0, col: 0 }
  });

  agents.sensor2 = await createAgent({
    model: 'deepseek-chat',
    seed: 'Monitor temperature sensor 2 and alert if > 100°C',
    equipment: ['MEMORY', 'REASONING'],
    trigger: { type: 'data', source: 'temperature_sensor_2' },
    cellId: { sheetId: 'temperature_dashboard', row: 0, col: 1 }
  });

  agents.sensor3 = await createAgent({
    model: 'deepseek-chat',
    seed: 'Monitor temperature sensor 3 and alert if > 100°C',
    equipment: ['MEMORY', 'REASONING'],
    trigger: { type: 'data', source: 'temperature_sensor_3' },
    cellId: { sheetId: 'temperature_dashboard', row: 0, col: 2 }
  });

  // Step 2: Create coordinator agent
  console.log('\nStep 2: Creating coordinator agent...');
  agents.coordinator = await createAgent({
    model: 'deepseek-chat',
    seed: 'Coordinate alerts from all sensors and aggregate them',
    equipment: ['MEMORY', 'REASONING', 'COORDINATION'],
    trigger: { type: 'event' },
    cellId: { sheetId: 'temperature_dashboard', row: 0, col: 3 }
  });

  // Step 3: Create logger agent
  console.log('Step 3: Creating logger agent...');
  agents.logger = await createAgent({
    model: 'deepseek-chat',
    seed: 'Log all temperature alerts and system events',
    equipment: ['MEMORY'],
    trigger: { type: 'event' },
    cellId: { sheetId: 'temperature_dashboard', row: 0, col: 4 }
  });

  console.log('\n✅ System built successfully!');
  console.log('\n📊 Agent Summary:');
  console.log(`   Sensor Agents: 3`);
  console.log(`   Coordinator Agent: 1`);
  console.log(`   Logger Agent: 1`);
  console.log(`   Total Agents: ${Object.keys(agents).length}`);

  return agents;
}

// Simulate temperature readings
async function simulateTemperature(agents) {
  console.log('\n🌡️  Simulating temperature readings...\n');

  const readings = [
    { sensor: 'sensor1', temp: 85 },
    { sensor: 'sensor2', temp: 105 },  // This should trigger an alert!
    { sensor: 'sensor3', temp: 92 }
  ];

  for (const reading of readings) {
    const agent = agents[reading.sensor];
    console.log(`📍 ${reading.sensor}: ${reading.temp}°C`);

    // Trigger the agent with temperature data
    await triggerAgent(agent.id, { temperature: reading.temp });

    // Wait a bit for the agent to process
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check the agent's state
    const state = await getAgentState(agent.id);
    console.log(`   State: ${state.data.state}`);

    if (reading.temp > 100) {
      console.log(`   ⚠️  ALERT: Temperature exceeds 100°C!`);
    }

    console.log('');
  }
}

// Run the system
async function run() {
  try {
    const agents = await buildTemperatureSystem();
    await simulateTemperature(agents);

    console.log('✅ Simulation complete!');
    console.log('\n💡 Next steps:');
    console.log('   - Check agent states using the API');
    console.log('   - Open demo.html to see agents in action');
    console.log('   - Try triggering agents manually');

  } catch (error) {
    console.error('❌ System error:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  run();
}

module.exports = { buildTemperatureSystem, simulateTemperature };
```

### Step 3.2: Run the System

```bash
node temperature-system.js
```

You should see something like:

```
🏗️  Building Temperature Monitoring System...

Step 1: Creating sensor monitoring agents...
✅ Created Monitor temperature sensor 1...
✅ Created Monitor temperature sensor 2...
✅ Created Monitor temperature sensor 3...

Step 2: Creating coordinator agent...
✅ Created Coordinate alerts from all sensors...

Step 3: Creating logger agent...
✅ Created Log all temperature alerts...

✅ System built successfully!

📊 Agent Summary:
   Sensor Agents: 3
   Coordinator Agent: 1
   Logger Agent: 1
   Total Agents: 5

🌡️  Simulating temperature readings...

📍 sensor1: 85°C
   State: IDLE

📍 sensor2: 105°C
   State: IDLE
   ⚠️  ALERT: Temperature exceeds 100°C!

📍 sensor3: 92°C
   State: IDLE

✅ Simulation complete!
```

---

## Part 4: Real-Time Monitoring (10 minutes)

Now let's set up real-time monitoring using WebSockets.

### Step 4.1: Create WebSocket Monitor

Create a file called `websocket-monitor.js`:

```javascript
const WebSocket = require('ws');

function connectToAgent(agentId, agentName) {
  const ws = new WebSocket('ws://localhost:8080/ws');

  ws.on('open', () => {
    console.log(`✅ Connected to ${agentName}`);

    // Subscribe to agent updates
    ws.send(JSON.stringify({
      type: 'SUBSCRIBE',
      agentId: agentId
    }));
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data);

    switch (message.type) {
      case 'SUBSCRIBED':
        console.log(`📡 Subscribed to ${agentName} updates`);
        break;

      case 'AGENT_STATE_CHANGE':
        console.log(`🔄 ${agentName}: ${message.oldState} → ${message.newState}`);
        break;

      case 'AGENT_DELETED':
        console.log(`🗑️  ${agentName} was deleted`);
        ws.close();
        break;

      case 'ERROR':
        console.error(`❌ WebSocket error for ${agentName}:`, message.error);
        break;

      default:
        console.log(`📨 ${agentName}:`, message);
    }
  });

  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${agentName}:`, error.message);
  });

  ws.on('close', () => {
    console.log(`🔌 Disconnected from ${agentName}`);
  });

  return ws;
}

// Monitor multiple agents
function monitorAgents(agentIds) {
  const connections = [];

  for (const [name, id] of Object.entries(agentIds)) {
    const ws = connectToAgent(id, name);
    connections.push(ws);
  }

  return connections;
}

// Example usage
async function main() {
  const axios = require('axios');

  // Get all agents
  const response = await axios.get('http://localhost:8080/api/v1/agents');
  const agents = response.data.data.agents;

  console.log(`Found ${agents.length} agents to monitor\n`);

  // Create agent ID map
  const agentMap = {};
  agents.forEach(agent => {
    const cell = `${agent.cellId.sheetId}!${String.fromCharCode(65 + agent.cellId.col)}${agent.cellId.row + 1}`;
    agentMap[cell] = agent.id;
  });

  // Start monitoring
  const connections = monitorAgents(agentMap);

  // Keep running
  console.log('\n🎯 Monitoring agents... (Press Ctrl+C to stop)\n');

  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down monitor...');
    connections.forEach(ws => ws.close());
    process.exit(0);
  });
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { connectToAgent, monitorAgents };
```

### Step 4.2: Run the Monitor

```bash
node websocket-monitor.js
```

Now, in another terminal, trigger an agent:

```bash
curl -X POST http://localhost:8080/api/v1/agents/{AGENT_ID}/trigger
```

You should see the state change in real-time in your monitor!

---

## Part 5: Visual Dashboard (5 minutes)

Let's use the demo interface to see our agents visually.

### Step 5.1: Open the Demo

1. Make sure the server is running
2. Open `demo.html` in your web browser
3. You should see a 4x4 grid

### Step 5.2: View Your Agents

Click on different cells to see if agents are attached:

```bash
# Check cell A1
curl http://localhost:8080/api/v1/cells/temperature_dashboard/0/0/agent

# Check cell B1
curl http://localhost:8080/api/v1/cells/temperature_dashboard/0/1/agent

# Check cell C1
curl http://localhost:8080/api/v1/cells/temperature_dashboard/0/2/agent
```

### Step 5.3: Create Agents from Demo

1. Click on a cell (e.g., A2)
2. Click "Create Agent"
3. Fill in the form:
   - Model: deepseek-chat
   - Seed: "Monitor this cell"
   - Equipment: MEMORY, REASONING
   - Trigger: data
4. Click "Create"
5. Watch the agent appear!

---

## Part 6: Advanced Features (Optional)

### Feature 1: Equipment Hot-Swapping

Agents can change their equipment on the fly:

```javascript
// Add equipment
await axios.post(`http://localhost:8080/api/v1/agents/${agentId}/equip`, {
  equipment: ['CONSENSUS', 'COORDINATION']
});

// Remove equipment
await axios.post(`http://localhost:8080/api/v1/agents/${agentId}/unequip`, {
  equipment: ['MEMORY']
});
```

### Feature 2: Periodic Triggers

Create agents that trigger on a schedule:

```javascript
const agent = await createAgent({
  model: 'deepseek-chat',
  seed: 'Check system status every 10 seconds',
  equipment: ['MEMORY'],
  trigger: {
    type: 'periodic',
    interval: 10000  // 10 seconds
  }
});
```

### Feature 3: Agent Chaining

Create a pipeline of agents:

```javascript
// Agent 1: Fetch data
const fetcher = await createAgent({
  seed: 'Fetch data from API',
  cellId: { sheetId: 'pipeline', row: 0, col: 0 }
});

// Agent 2: Process data
const processor = await createAgent({
  seed: 'Process the data',
  cellId: { sheetId: 'pipeline', row: 0, col: 1 }
});

// Agent 3: Save results
const saver = await createAgent({
  seed: 'Save to database',
  cellId: { sheetId: 'pipeline', row: 0, col: 2 }
});
```

---

## Part 7: Troubleshooting

### Problem: Server Won't Start

**Error**: `EADDRINUSE: address already in use :::8080`

**Solution**:
```bash
# Find the process using port 8080
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Problem: Agent Creation Fails

**Error**: `400 Bad Request`

**Solution**: Check your JSON:
- All required fields must be present
- Equipment must be valid (MEMORY, REASONING, etc.)
- Trigger type must be valid (manual, data, periodic, event)

### Problem: Agent Not Responding

**Error**: Agent stays in THINKING state

**Solution**:
- Check the server logs for errors
- Verify the agent ID is correct
- Try triggering again after a few seconds

---

## Part 8: Next Steps

Congratulations! You've built a complete multi-agent system! 🎉

### What You've Learned

✅ How to create agents programmatically
✅ How to trigger agents and monitor state
✅ How to use WebSockets for real-time updates
✅ How to build multi-agent systems
✅ How to visualize agents in the demo

### Continue Learning

- 📖 **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- 🏗️ **[Architecture](./ARCHITECTURE.md)** - How it works under the hood
- 🤝 **[Contributing](./CONTRIBUTING.md)** - How to contribute

### Build More Things

- 🌡️ **Weather Monitor** - Track weather across multiple cities
- 📊 **Stock Portfolio** - Monitor stocks and alert on changes
- 🎮 **Game Bot** - Build a simple game-playing agent
- 🏠 **Smart Home** - Monitor and control IoT devices

---

## Summary

You've successfully:
1. ✅ Started the CLAW server
2. ✅ Created your first agent
3. ✅ Built a multi-agent system
4. ✅ Implemented real-time monitoring
5. ✅ Used the visual demo interface

**You're now ready to build your own agent systems!**

---

## Got Questions?

- 📚 Check the [FAQ](./FAQ.md)
- 🐛 [Report a bug](https://github.com/SuperInstance/minimal-claw-server/issues)
- 💡 [Request a feature](https://github.com/SuperInstance/minimal-claw-server/issues)
- 💬 [Start a discussion](https://github.com/SuperInstance/minimal-claw-server/discussions)

---

**Happy building! 🚀**
