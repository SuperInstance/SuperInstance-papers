/**
 * DashboardServer - HTTP/WebSocket server for the monitoring dashboard
 * 
 * Serves the dashboard UI and provides WebSocket connectivity for real-time updates
 */

import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type {
  DashboardConfig,
  DashboardState,
  HistoricalEntry,
  PlaybackState,
  DashboardMetrics,
  ConfidenceZoneIndicator,
} from './types';
import { DEFAULT_DASHBOARD_CONFIG, getConfidenceZone } from './types';
import { ActivityTracker } from './ActivityTracker';
import { CellVisualizer } from './CellVisualizer';
import { RealTimeMonitor } from './RealTimeMonitor';
import type { OriginCore, EquipmentSlot, Equipment } from '@superinstance/starter-agent';

export interface DashboardServerOptions extends Partial<DashboardConfig> {
  enableCors: boolean;
  serveStatic: boolean;
  staticPath?: string;
}

const DEFAULT_OPTIONS: DashboardServerOptions = {
  ...DEFAULT_DASHBOARD_CONFIG,
  enableCors: true,
  serveStatic: true,
};

export class DashboardServer {
  private app: Express;
  private httpServer: ReturnType<typeof createServer> | null = null;
  private wss: WebSocket.Server | null = null;
  private config: DashboardServerOptions;
  private activityTracker: ActivityTracker;
  private cellVisualizer: CellVisualizer;
  private realTimeMonitor: RealTimeMonitor;
  private agents: Map<string, OriginCore> = new Map();
  private history: HistoricalEntry[] = [];
  private playbackState: PlaybackState = {
    isPlaying: false,
    currentIndex: 0,
    speed: 1,
    startTime: 0,
    endTime: 0,
  };
  private historyInterval: NodeJS.Timeout | null = null;

  constructor(
    activityTracker: ActivityTracker,
    cellVisualizer: CellVisualizer,
    realTimeMonitor: RealTimeMonitor,
    options: Partial<DashboardServerOptions> = {}
  ) {
    this.config = { ...DEFAULT_OPTIONS, ...options };
    this.activityTracker = activityTracker;
    this.cellVisualizer = cellVisualizer;
    this.realTimeMonitor = realTimeMonitor;
    this.app = express();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.httpServer = createServer(this.app);
        
        this.wss = new WebSocket.Server({ server: this.httpServer });
        this.setupWebSocket();
        
        this.httpServer.listen(this.config.port, this.config.host, () => {
          console.log(`Dashboard server running at http://${this.config.host}:${this.config.port}`);
          
          // Start history recording if playback is enabled
          if (this.config.enablePlayback) {
            this.startHistoryRecording();
          }
          
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.historyInterval) {
        clearInterval(this.historyInterval);
        this.historyInterval = null;
      }
      
      if (this.wss) {
        this.wss.close();
      }
      
      if (this.httpServer) {
        this.httpServer.close(() => {
          console.log('Dashboard server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Register an agent for monitoring
   */
  registerAgent(agent: OriginCore): void {
    this.agents.set(agent.id, agent);
    this.realTimeMonitor.registerAgent(agent);
    this.recordHistory();
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.realTimeMonitor.unregisterAgent(agentId);
    this.recordHistory();
  }

  /**
   * Get current metrics
   */
  getMetrics(): DashboardMetrics {
    const snapshots = this.activityTracker.getAllAgentSnapshots();
    const cells = this.cellVisualizer.getAllCells();
    
    let activeAgents = 0;
    const zoneCounts: Record<string, number> = { GREEN: 0, YELLOW: 0, RED: 0 };
    
    snapshots.forEach(snapshot => {
      zoneCounts[snapshot.zone]++;
      if (snapshot.currentActivity.type !== 'idle') {
        activeAgents++;
      }
    });
    
    const total = snapshots.size;
    const confidenceDistribution: ConfidenceZoneIndicator[] = [
      { zone: 'GREEN', count: zoneCounts.GREEN, percentage: total > 0 ? (zoneCounts.GREEN / total) * 100 : 0, agents: [] },
      { zone: 'YELLOW', count: zoneCounts.YELLOW, percentage: total > 0 ? (zoneCounts.YELLOW / total) * 100 : 0, agents: [] },
      { zone: 'RED', count: zoneCounts.RED, percentage: total > 0 ? (zoneCounts.RED / total) * 100 : 0, agents: [] },
    ];
    
    // Get equipment usage
    const equipmentUsage = new Map<string, ReturnType<typeof this.getEquipmentStatus>>();
    this.agents.forEach(agent => {
      agent.equipment.forEach((equipment, slot) => {
        equipmentUsage.set(equipment.name, this.getEquipmentStatus(equipment, slot));
      });
    });
    
    // Calculate throughput
    const activities = this.activityTracker.getActivities({ since: Date.now() - 60000 });
    const processingActivities = activities.filter(a => a.type === 'processing');
    
    return {
      totalAgents: total,
      activeAgents,
      totalCells: cells.size,
      confidenceDistribution,
      equipmentUsage,
      averageProcessingTime: this.calculateAverageProcessingTime(),
      throughputPerMinute: processingActivities.length,
    };
  }

  /**
   * Get playback state
   */
  getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }

  /**
   * Control playback
   */
  controlPlayback(action: 'play' | 'pause' | 'stop' | 'step' | 'speed', value?: number): void {
    switch (action) {
      case 'play':
        this.playbackState.isPlaying = true;
        if (this.history.length > 0) {
          this.playbackState.startTime = this.history[0].timestamp;
          this.playbackState.endTime = this.history[this.history.length - 1].timestamp;
        }
        break;
      case 'pause':
        this.playbackState.isPlaying = false;
        break;
      case 'stop':
        this.playbackState.isPlaying = false;
        this.playbackState.currentIndex = 0;
        break;
      case 'step':
        if (value !== undefined) {
          this.playbackState.currentIndex = Math.max(0, Math.min(value, this.history.length - 1));
        }
        break;
      case 'speed':
        if (value !== undefined) {
          this.playbackState.speed = value;
        }
        break;
    }
  }

  /**
   * Get historical entries
   */
  getHistory(from?: number, to?: number): HistoricalEntry[] {
    let entries = this.history;
    
    if (from !== undefined) {
      entries = entries.filter(e => e.timestamp >= from);
    }
    if (to !== undefined) {
      entries = entries.filter(e => e.timestamp <= to);
    }
    
    return entries;
  }

  // Private methods

  private setupMiddleware(): void {
    this.app.use(express.json());
    
    if (this.config.enableCors) {
      this.app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') {
          return res.sendStatus(200);
        }
        next();
      });
    }
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });
    
    // Get current state
    this.app.get('/api/state', (_req: Request, res: Response) => {
      const state = this.getCurrentState();
      res.json(this.serializeState(state));
    });
    
    // Get metrics
    this.app.get('/api/metrics', (_req: Request, res: Response) => {
      const metrics = this.getMetrics();
      res.json({
        ...metrics,
        equipmentUsage: Object.fromEntries(metrics.equipmentUsage),
      });
    });
    
    // Get agents
    this.app.get('/api/agents', (_req: Request, res: Response) => {
      const agents = Array.from(this.activityTracker.getAllAgentSnapshots().values());
      res.json(agents);
    });
    
    // Get specific agent
    this.app.get('/api/agents/:id', (req: Request, res: Response) => {
      const agent = this.activityTracker.getAgentSnapshot(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json(agent);
    });
    
    // Get cells
    this.app.get('/api/cells', (_req: Request, res: Response) => {
      const cellData = this.cellVisualizer.toJSON();
      res.json(cellData);
    });
    
    // Get specific cell
    this.app.get('/api/cells/:id', (req: Request, res: Response) => {
      const cell = this.cellVisualizer.getCell(req.params.id);
      if (!cell) {
        return res.status(404).json({ error: 'Cell not found' });
      }
      res.json(cell);
    });
    
    // Get activities
    this.app.get('/api/activities', (req: Request, res: Response) => {
      const since = req.query.since ? parseInt(req.query.since as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const agentId = req.query.agentId as string | undefined;
      
      const activities = this.activityTracker.getActivities({
        since,
        limit,
        agentId,
      });
      
      res.json(activities);
    });
    
    // Get provenance for a cell
    this.app.get('/api/cells/:id/provenance', (req: Request, res: Response) => {
      const provenance = this.cellVisualizer.getProvenance(req.params.id);
      if (!provenance) {
        return res.status(404).json({ error: 'Provenance not found' });
      }
      res.json(provenance);
    });
    
    // Playback endpoints
    this.app.get('/api/playback', (_req: Request, res: Response) => {
      res.json({
        state: this.playbackState,
        historyLength: this.history.length,
      });
    });
    
    this.app.post('/api/playback/control', (req: Request, res: Response) => {
      const { action, value } = req.body;
      this.controlPlayback(action, value);
      res.json({ success: true, state: this.playbackState });
    });
    
    this.app.get('/api/playback/history', (req: Request, res: Response) => {
      const from = req.query.from ? parseInt(req.query.from as string) : undefined;
      const to = req.query.to ? parseInt(req.query.to as string) : undefined;
      const history = this.getHistory(from, to);
      res.json(history);
    });
    
    // Get ASCII visualization
    this.app.get('/api/visualize/ascii', (_req: Request, res: Response) => {
      res.type('text/plain').send(this.cellVisualizer.toASCII());
    });
    
    // Get HTML visualization
    this.app.get('/api/visualize/html', (_req: Request, res: Response) => {
      res.type('text/html').send(this.cellVisualizer.toHTML());
    });
    
    // Dashboard HTML page
    this.app.get('/', (_req: Request, res: Response) => {
      res.type('text/html').send(this.getDashboardHTML());
    });
    
    // Static assets (if enabled)
    if (this.config.serveStatic && this.config.staticPath) {
      this.app.use(express.static(this.config.staticPath));
    }
  }

  private setupWebSocket(): void {
    if (!this.wss) return;
    
    this.wss.on('connection', (ws, req) => {
      const clientId = uuidv4();
      console.log(`WebSocket client connected: ${clientId}`);
      
      // Send initial state
      const state = this.getCurrentState();
      ws.send(JSON.stringify({
        type: 'state_sync',
        payload: this.serializeState(state),
        timestamp: Date.now(),
      }));
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(ws, message);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });
      
      ws.on('close', () => {
        console.log(`WebSocket client disconnected: ${clientId}`);
      });
    });
  }

  private handleWebSocketMessage(ws: WebSocket, message: { type: string; payload?: unknown }): void {
    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
      case 'get_state':
        const state = this.getCurrentState();
        ws.send(JSON.stringify({
          type: 'state_sync',
          payload: this.serializeState(state),
          timestamp: Date.now(),
        }));
        break;
      case 'playback_control':
        if (message.payload && typeof message.payload === 'object') {
          const payload = message.payload as { action: string; value?: number };
          this.controlPlayback(payload.action as 'play' | 'pause' | 'stop' | 'step' | 'speed', payload.value);
        }
        break;
    }
  }

  private getCurrentState(): DashboardState {
    return {
      agents: this.activityTracker.getAllAgentSnapshots(),
      cells: this.cellVisualizer.getAllCells(),
      activities: this.activityTracker.getActivities(),
      provenance: new Map(),
      timestamp: Date.now(),
    };
  }

  private serializeState(state: DashboardState): object {
    return {
      agents: Object.fromEntries(state.agents),
      cells: Object.fromEntries(state.cells),
      activities: state.activities,
      timestamp: state.timestamp,
    };
  }

  private getEquipmentStatus(equipment: Equipment, _slot: EquipmentSlot) {
    return {
      name: equipment.name,
      slot: equipment.slot,
      isActive: true,
      equippedBy: [],
      lastUsed: Date.now(),
      usageCount: 1,
      averageConfidence: 0.8,
    };
  }

  private calculateAverageProcessingTime(): number {
    const activities = this.activityTracker.getActivities({ type: 'processing' });
    const times = activities
      .filter(a => a.details.processingTime)
      .map(a => a.details.processingTime as number);
    
    if (times.length === 0) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  private startHistoryRecording(): void {
    this.historyInterval = setInterval(() => {
      this.recordHistory();
    }, 1000); // Record every second
  }

  private recordHistory(): void {
    if (!this.config.enablePlayback) return;
    
    const entry: HistoricalEntry = {
      timestamp: Date.now(),
      state: this.getCurrentState(),
      activities: this.activityTracker.getActivities({ since: Date.now() - 1000 }),
    };
    
    this.history.push(entry);
    
    // Trim history if needed
    if (this.history.length > this.config.playbackMaxEntries) {
      this.history = this.history.slice(-this.config.playbackMaxEntries);
    }
    
    this.playbackState.endTime = Date.now();
  }

  private getDashboardHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SuperInstance Monitoring Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
    }
    .dashboard {
      display: grid;
      grid-template-columns: 250px 1fr 300px;
      grid-template-rows: 60px 1fr;
      gap: 1px;
      background: #1e293b;
      min-height: 100vh;
    }
    .header {
      grid-column: 1 / -1;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      border-bottom: 1px solid #334155;
    }
    .header h1 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #3b82f6;
    }
    .metrics {
      display: flex;
      gap: 20px;
    }
    .metric {
      text-align: center;
    }
    .metric-value {
      font-size: 1.5rem;
      font-weight: 700;
    }
    .metric-label {
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .sidebar {
      background: #1e293b;
      padding: 20px;
      overflow-y: auto;
    }
    .sidebar h2 {
      font-size: 0.875rem;
      color: #94a3b8;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .agent-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .agent-card {
      background: #0f172a;
      border-radius: 8px;
      padding: 12px;
      border: 1px solid #334155;
      cursor: pointer;
      transition: all 0.2s;
    }
    .agent-card:hover {
      border-color: #3b82f6;
    }
    .agent-card.selected {
      border-color: #3b82f6;
      background: rgba(59, 130, 246, 0.1);
    }
    .agent-id {
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .agent-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.75rem;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .status-dot.green { background: #22c55e; }
    .status-dot.yellow { background: #eab308; }
    .status-dot.red { background: #ef4444; }
    .main-content {
      background: #0f172a;
      padding: 20px;
      overflow-y: auto;
    }
    .grid-container {
      display: flex;
      flex-wrap: wrap;
      gap: 2px;
    }
    .cell {
      width: 40px;
      height: 40px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      transition: all 0.3s;
    }
    .thinking-panel {
      background: #1e293b;
      padding: 20px;
      overflow-y: auto;
    }
    .thinking-panel h2 {
      font-size: 0.875rem;
      color: #94a3b8;
      margin-bottom: 15px;
      text-transform: uppercase;
    }
    .thinking-process {
      background: #0f172a;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .thought-step {
      display: flex;
      gap: 10px;
      padding: 8px 0;
      border-bottom: 1px solid #334155;
    }
    .thought-step:last-child {
      border-bottom: none;
    }
    .step-number {
      background: #3b82f6;
      color: white;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .step-text {
      font-size: 0.875rem;
      color: #e2e8f0;
    }
    .activity-feed {
      margin-top: 20px;
    }
    .activity-item {
      background: #0f172a;
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 8px;
      font-size: 0.75rem;
    }
    .activity-time {
      color: #64748b;
      font-size: 0.625rem;
    }
    .provenance-chain {
      margin-top: 20px;
    }
    .provenance-node {
      background: #0f172a;
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 5px;
      border-left: 3px solid #3b82f6;
    }
    .provenance-arrow {
      text-align: center;
      color: #64748b;
      font-size: 1.25rem;
    }
  </style>
</head>
<body>
  <div class="dashboard">
    <header class="header">
      <h1>🧠 SuperInstance Monitor</h1>
      <div class="metrics">
        <div class="metric">
          <div class="metric-value" id="agentCount">0</div>
          <div class="metric-label">Agents</div>
        </div>
        <div class="metric">
          <div class="metric-value" id="cellCount">0</div>
          <div class="metric-label">Cells</div>
        </div>
        <div class="metric">
          <div class="metric-value" id="greenZone">0%</div>
          <div class="metric-label">Green Zone</div>
        </div>
      </div>
    </header>
    
    <aside class="sidebar">
      <h2>Active Agents</h2>
      <div class="agent-list" id="agentList">
        <div style="color: #64748b; font-size: 0.875rem;">No agents connected</div>
      </div>
    </aside>
    
    <main class="main-content">
      <h2 style="margin-bottom: 15px; font-size: 0.875rem; color: #94a3b8;">Cell Grid</h2>
      <div class="grid-container" id="cellGrid">
        <div style="color: #64748b;">Waiting for data...</div>
      </div>
    </main>
    
    <aside class="thinking-panel">
      <h2>Thinking Process</h2>
      <div id="thinkingContent">
        <div class="thinking-process">
          <div style="color: #64748b; font-size: 0.875rem;">Select an agent to view thinking</div>
        </div>
      </div>
      
      <h2 style="margin-top: 20px;">Recent Activity</h2>
      <div class="activity-feed" id="activityFeed">
        <div class="activity-item">
          <div style="color: #64748b;">No recent activity</div>
        </div>
      </div>
    </aside>
  </div>
  
  <script>
    const ws = new WebSocket('ws://' + window.location.host);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      ws.send(JSON.stringify({ type: 'get_state' }));
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'state_sync') {
        updateDashboard(message.payload);
      }
    };
    
    function updateDashboard(state) {
      // Update metrics
      const agentCount = Object.keys(state.agents || {}).length;
      document.getElementById('agentCount').textContent = agentCount;
      document.getElementById('cellCount').textContent = Object.keys(state.cells || {}).length;
      
      // Calculate green zone percentage
      const zones = Object.values(state.agents || {}).reduce((acc, a) => {
        acc[a.zone] = (acc[a.zone] || 0) + 1;
        return acc;
      }, {});
      const greenPercent = agentCount > 0 ? Math.round((zones.GREEN || 0) / agentCount * 100) : 0;
      document.getElementById('greenZone').textContent = greenPercent + '%';
      
      // Update agent list
      const agentList = document.getElementById('agentList');
      if (agentCount > 0) {
        agentList.innerHTML = Object.entries(state.agents || {}).map(([id, agent]) => \`
          <div class="agent-card" onclick="selectAgent('\${id}')">
            <div class="agent-id">\${id.substring(0, 8)}...</div>
            <div class="agent-status">
              <span class="status-dot \${agent.zone.toLowerCase()}"></span>
              <span>\${agent.currentActivity?.type || 'idle'}</span>
            </div>
          </div>
        \`).join('');
      }
      
      // Update cell grid
      const cellGrid = document.getElementById('cellGrid');
      const cells = Object.entries(state.cells || {});
      if (cells.length > 0) {
        cellGrid.innerHTML = cells.map(([id, cell]) => \`
          <div class="cell" style="background: \${getZoneColor(cell.zone)}">
            \${(cell.confidence || 0).toFixed(1)}
          </div>
        \`).join('');
      }
      
      // Update activity feed
      const activityFeed = document.getElementById('activityFeed');
      if (state.activities && state.activities.length > 0) {
        activityFeed.innerHTML = state.activities.slice(-10).reverse().map(a => \`
          <div class="activity-item">
            <div>\${a.description}</div>
            <div class="activity-time">\${new Date(a.timestamp).toLocaleTimeString()}</div>
          </div>
        \`).join('');
      }
    }
    
    function getZoneColor(zone) {
      switch(zone) {
        case 'GREEN': return '#22c55e';
        case 'YELLOW': return '#eab308';
        case 'RED': return '#ef4444';
        default: return '#334155';
      }
    }
    
    function selectAgent(id) {
      console.log('Selected agent:', id);
    }
    
    // Request state every 5 seconds as fallback
    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'get_state' }));
      }
    }, 5000);
  </script>
</body>
</html>`;
  }
}

export default DashboardServer;
