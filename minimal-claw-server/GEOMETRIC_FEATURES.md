# Geometric Encoding Integration Guide

## Overview

This guide describes the geometric encoding features integrated into the minimal-claw-server, enabling FPS-style spatial awareness for cellular agents.

## What is Geometric Encoding?

Geometric encoding gives each agent a position in 3D space using **dodecet encoding** (12-bit per coordinate). This enables:

- **Spatial Queries**: Find agents near a position in O(log n) time
- **FPS-Style Perspective**: Agents only "see" neighbors within their vicinity
- **Efficient Scaling**: No central coordinator needed for spatial queries
- **Natural Information Filtering**: Position automatically filters relevant data

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Geometric Agent System                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Agent A1 (Position: 1000, 1500, 2000)                       │
│      │                                                         │
│      │ Spatial Index (Grid-based, O(1) avg)                   │
│      ▼                                                         │
│  ┌─────────────────────────────────────┐                     │
│  │         Spatial Query API           │                     │
│  ├─────────────────────────────────────┤                     │
│  │ • Find nearby agents                │                     │
│  │ • Find nearest neighbors            │                     │
│  │ • Find agents in region             │                     │
│  │ • Update position                   │                     │
│  └─────────────────────────────────────┘                     │
│                                                               │
│  Benefit: Each agent has unique perspective                  │
│  - No global state coordination                              │
│  - O(log n) spatial queries                                  │
│  - Natural load balancing                                    │
└─────────────────────────────────────────────────────────────┘
```

## Dodecet Position Encoding

### Coordinate System

- **Range**: Each coordinate (x, y, z) is 0-4095 (12 bits)
- **Total Space**: 4096³ = 68.7 billion possible positions
- **Memory**: 36 bits per agent position (12 bits × 3)

### Position Format

```javascript
{
  x: 1000,  // 0-4095
  y: 1500,  // 0-4095
  z: 2000   // 0-4095
}
```

### Normalized Coordinates

Convert to [0.0, 1.0] for calculations:

```javascript
const normalized = {
  x: position.x / 4095,
  y: position.y / 4095,
  z: position.z / 4095
};
```

### Signed Coordinates

Convert to [-2048, 2047] for relative calculations:

```javascript
const signed = {
  x: position.x >= 2048 ? position.x - 4096 : position.x,
  y: position.y >= 2048 ? position.y - 4096 : position.y,
  z: position.z >= 2048 ? position.z - 4096 : position.z
};
```

## API Endpoints

### 1. Create Agent with Position

**POST** `/api/v1/agents`

```javascript
{
  "model": "deepseek-chat",
  "seed": "temperature_monitor",
  "equipment": ["MEMORY", "REASONING"],
  "position": {
    "x": 1000,
    "y": 1500,
    "z": 2000
  }
}
```

If no position is provided, a random position is generated.

### 2. Update Agent Position

**PUT** `/api/v1/agents/:id/position`

```javascript
{
  "x": 1500,
  "y": 2000,
  "z": 2500
}
```

### 3. Find Nearby Agents

**GET** `/api/v1/agents/spatial/near`

Query parameters:
- `x`: X coordinate (required)
- `y`: Y coordinate (required)
- `z`: Z coordinate (required)
- `radius`: Search radius (optional, default: 100)

Example:
```
GET /api/v1/agents/spatial/near?x=1000&y=1500&z=2000&radius=500
```

Response:
```javascript
{
  "success": true,
  "data": [
    { "id": "agent-1", "position": { "x": 1050, "y": 1520, "z": 1980 }, ... },
    { "id": "agent-2", "position": { "x": 980, "y": 1490, "z": 2030 }, ... }
  ],
  "meta": {
    "query": { "x": 1000, "y": 1500, "z": 2000, "radius": 500 },
    "count": 2
  }
}
```

### 4. Find Nearest Neighbors

**GET** `/api/v1/agents/:id/neighbors`

Query parameters:
- `count`: Number of neighbors to return (optional, default: 5)

Example:
```
GET /api/v1/agents/agent-1/neighbors?count=10
```

Response:
```javascript
{
  "success": true,
  "data": [
    {
      "agentId": "agent-2",
      "distance": 123.45,
      "id": "agent-2",
      "position": { "x": 1050, "y": 1520, "z": 1980 },
      ...
    }
  ],
  "meta": {
    "agentId": "agent-1",
    "position": { "x": 1000, "y": 1500, "z": 2000 },
    "count": 10
  }
}
```

### 5. Find Agents in Region

**GET** `/api/v1/agents/spatial/region`

Query parameters:
- `minX`, `minY`, `minZ`: Minimum coordinates
- `maxX`, `maxY`, `maxZ`: Maximum coordinates

Example:
```
GET /api/v1/agents/spatial/region?minX=0&minY=0&minZ=0&maxX=1000&maxY=1000&maxZ=1000
```

### 6. Get Spatial Statistics

**GET** `/api/v1/spatial/stats`

Response:
```javascript
{
  "success": true,
  "data": {
    "totalAgents": 100,
    "indexedAgents": 100,
    "totalCells": 27,
    "cellSize": 100,
    "avgAgentsPerCell": 3.7
  }
}
```

## Spatial Index

### How It Works

The spatial index uses a **grid-based approach** for O(1) average case queries:

1. **Grid Partitioning**: Space is divided into cells of configurable size
2. **Agent Mapping**: Each agent is mapped to a cell based on position
3. **Efficient Queries**: Only search cells within query radius

### Performance Characteristics

| Operation | Time Complexity | Space Complexity |
|-----------|----------------|------------------|
| Add agent | O(1) | O(1) |
| Remove agent | O(1) | O(1) |
| Update position | O(1) | O(1) |
| Find nearby | O(k) where k = nearby agents | O(1) |
| Find nearest | O(n log n) | O(1) |
| Find in region | O(k) where k = agents in region | O(1) |

### Configuration

Default cell size: 100 units

Adjust based on your use case:
- **Smaller cells**: More precise queries, more memory
- **Larger cells**: Less precise queries, less memory

## Integration Layer

### TypeScript Client

```typescript
import { ClawClient } from '@superinstance/spreadsheet-claw-integration';

const client = new ClawClient({
  baseUrl: 'http://localhost:8080'
});

// Create agent with position
const agent = await client.createAgent({
  model: 'deepseek-chat',
  seed: 'temperature_monitor',
  equipment: ['MEMORY', 'REASONING'],
  position: { x: 1000, y: 1500, z: 2000 }
});

// Find nearby agents
const nearby = await client.findAgentsNear({
  x: 1000,
  y: 1500,
  z: 2000,
  radius: 500
});

// Find nearest neighbors
const neighbors = await client.getNearestNeighbors(agent.id, 5);

// Update position
await client.updateAgentPosition(agent.id, {
  x: 1500,
  y: 2000,
  z: 2500
});

// Get spatial stats
const stats = await client.getSpatialStats();
```

## Use Cases

### 1. FPS-Style Perspective Filtering

Agents only see neighbors within their vicinity:

```javascript
const myAgent = await client.getAgent(agentId);
const neighbors = await client.findAgentsNear({
  x: myAgent.position.x,
  y: myAgent.position.y,
  z: myAgent.position.z,
  radius: 500  // Only see agents within 500 units
});

// Process only visible neighbors
neighbors.forEach(neighbor => {
  // Agent-specific perspective processing
});
```

### 2. Spatial Load Balancing

Distribute work based on proximity:

```javascript
const tasks = await getPendingTasks();
const myPosition = await getMyPosition();

for (const task of tasks) {
  const nearbyAgents = await client.findAgentsNear({
    x: task.position.x,
    y: task.position.y,
    z: task.position.z,
    radius: 1000
  });

  // Assign to closest agent
  const closest = nearbyAgents[0];
  await assignTask(closest.id, task.id);
}
```

### 3. Geographic Monitoring

Monitor spatial regions:

```javascript
const regionAgents = await client.findAgentsInRegion({
  min: { x: 0, y: 0, z: 0 },
  max: { x: 1000, y: 1000, z: 1000 }
});

console.log(`Found ${regionAgents.length} agents in region`);
```

### 4. Proximity-Based Coordination

Coordinate with nearest neighbors:

```javascript
const neighbors = await client.getNearestNeighbors(myAgentId, 5);

for (const neighbor of neighbors) {
  await coordinateWith(neighbor.agentId, neighbor.distance);
}
```

## Performance Tips

### 1. Optimize Cell Size

Choose cell size based on query radius:

```javascript
// If most queries use radius=500, set cell size to 250
const optimalCellSize = queryRadius / 2;
```

### 2. Batch Queries

Query multiple positions in one request:

```javascript
// Instead of multiple queries:
for (const pos of positions) {
  await client.findAgentsNear(pos);
}

// Use region query if possible:
const bbox = calculateBoundingBox(positions);
await client.findAgentsInRegion(bbox);
```

### 3. Cache Results

Cache frequently accessed spatial queries:

```javascript
const cache = new Map();

async function getCachedNearby(position) {
  const key = `${position.x},${position.y},${position.z}`;
  if (cache.has(key)) {
    return cache.get(key);
  }

  const result = await client.findAgentsNear(position);
  cache.set(key, result);
  return result;
}
```

## Demo

### Interactive Demo

Open `geometric-demo.html` in your browser to see:

- 3D visualization of agent positions
- Interactive spatial queries
- Real-time statistics
- FPS-style perspective demonstration

### Running the Demo

1. Start the server:
```bash
cd minimal-claw-server
npm start
```

2. Open `geometric-demo.html` in your browser

3. Create agents and run spatial queries

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Performance Tests

```bash
npm run test:performance
```

## Troubleshooting

### Issue: Agents not found in spatial queries

**Solution**: Ensure agents have positions assigned:

```javascript
const agent = await client.getAgent(agentId);
if (!agent.position) {
  await client.updateAgentPosition(agentId, {
    x: 1000, y: 1000, z: 1000
  });
}
```

### Issue: Slow spatial queries

**Solution**: Check spatial index statistics:

```javascript
const stats = await client.getSpatialStats();
console.log('Avg agents per cell:', stats.avgAgentsPerCell);

// If too high, consider reducing cell size or reindexing
```

### Issue: Memory usage growing

**Solution**: Remove old agents from spatial index:

```javascript
await client.deleteAgent(oldAgentId);
```

## Best Practices

1. **Always assign positions** when creating agents
2. **Use appropriate cell sizes** for your use case
3. **Cache spatial queries** when possible
4. **Monitor spatial statistics** for performance
5. **Clean up old agents** to free memory
6. **Use region queries** for batch operations
7. **Implement perspective filtering** for FPS-style behavior

## References

- [Dodecet Encoder Documentation](https://github.com/SuperInstance/dodecet-encoder)
- [Constraint Theory](https://github.com/SuperInstance/constrainttheory)
- [Spreadsheet Integration](https://github.com/SuperInstance/spreadsheet-claw-integration)

## Support

For issues and questions:
- GitHub: https://github.com/SuperInstance/minimal-claw-server
- Documentation: https://docs.superinstance.ai
