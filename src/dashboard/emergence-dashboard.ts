/**
 * POLLN Emergence Dashboard
 *
 * Web-based dashboard for visualizing emergent intelligence
 */

import express from 'express';
import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import {
  EmergenceDetector,
  EmergenceCatalog,
  EmergenceAnalyzer,
  EmergenceMetricsCalculator,
} from '../core/emergence';
import {
  PressureSensor,
  FlowMonitor,
  ValveController,
  PumpManager,
  ReservoirManager,
} from '../core/hydraulic';
import { EnhancedStigmergy } from '../core/stigmergy';

// ========================================================================
// DASHBOARD SERVER
// ========================================================================

export class EmergenceDashboard {
  private app: express.Application;
  private server: Server | null = null;
  private io: SocketIOServer | null = null;
  private port: number;
  private detector: EmergenceDetector;
  private catalog: EmergenceCatalog;
  private analyzer: EmergenceAnalyzer;
  private metricsCalculator: EmergenceMetricsCalculator;
  private pressureSensor: PressureSensor;
  private flowMonitor: FlowMonitor;
  private valveController: ValveController;
  private pumpManager: PumpManager;
  private reservoirManager: ReservoirManager;
  private stigmergy: EnhancedStigmergy;
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();

    // Initialize components
    this.detector = new EmergenceDetector();
    this.catalog = new EmergenceCatalog();
    this.analyzer = new EmergenceAnalyzer();
    this.metricsCalculator = new EmergenceMetricsCalculator();
    this.pressureSensor = new PressureSensor();
    this.flowMonitor = new FlowMonitor();
    this.valveController = new ValveController();
    this.pumpManager = new PumpManager();
    this.reservoirManager = new ReservoirManager();
    this.stigmergy = new EnhancedStigmergy();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
  }

  private setupRoutes(): void {
    // API routes
    this.app.get('/api/metrics', async (req, res) => {
      try {
        const metrics = this.metricsCalculator.getCurrentMetrics();
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get metrics' });
      }
    });

    this.app.get('/api/behaviors', async (req, res) => {
      try {
        const behaviors = this.detector.getAllBehaviors();
        res.json(behaviors);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get behaviors' });
      }
    });

    this.app.get('/api/abilities', async (req, res) => {
      try {
        const abilities = this.catalog.getAllAbilities();
        res.json(abilities);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get abilities' });
      }
    });

    this.app.get('/api/hydraulic', async (req, res) => {
      try {
        const pressure = this.pressureSensor.getStats();
        const flow = this.flowMonitor.getStats();
        const valves = this.valveController.getStats();
        const pumps = this.pumpManager.getStats();

        res.json({ pressure, flow, valves, pumps });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get hydraulic stats' });
      }
    });

    this.app.get('/api/stigmergy', async (req, res) => {
      try {
        const stats = this.stigmergy.getStats();
        const trails = this.stigmergy.getAllTrails();

        res.json({ stats, trails });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get stigmergy stats' });
      }
    });

    // Serve dashboard
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
  }

  private setupWebSocket(): void {
    this.server = new Server(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: { origin: '*' },
    });

    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Send initial data
      this.sendUpdate(socket);

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private sendUpdate(socket?: any): void {
    const metrics = this.metricsCalculator.getCurrentMetrics();
    const behaviors = this.detector.getAllBehaviors();
    const abilities = this.catalog.getAllAbilities();
    const hydraulic = {
      pressure: this.pressureSensor.getStats(),
      flow: this.flowMonitor.getStats(),
      valves: this.valveController.getStats(),
      pumps: this.pumpManager.getStats(),
    };
    const stigmergy = {
      stats: this.stigmergy.getStats(),
      trails: this.stigmergy.getAllTrails(),
    };

    const update = {
      metrics,
      behaviors,
      abilities,
      hydraulic,
      stigmergy,
      timestamp: Date.now(),
    };

    if (socket) {
      socket.emit('update', update);
    } else {
      this.io?.emit('update', update);
    }
  }

  /**
   * Start the dashboard server
   */
  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server?.listen(this.port, () => {
        console.log(`\n🌟 Emergence Dashboard running on http://localhost:${this.port}\n`);

        // Start periodic updates
        this.updateInterval = setInterval(() => {
          this.sendUpdate();
        }, 5000);

        resolve();
      });
    });
  }

  /**
   * Stop the dashboard server
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.io?.close();
    this.server?.close();

    console.log('Dashboard stopped');
  }
}

// ========================================================================
// DASHBOARD HTML
// ========================================================================

export const DASHBOARD_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>POLLN Emergence Dashboard</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #0f0f1a;
      color: #e0e0e0;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 2.5em;
      background: linear-gradient(45deg, #00d4ff, #7b2fff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
    }
    .card {
      background: #1a1a2e;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    .card h2 {
      font-size: 1.2em;
      margin-bottom: 15px;
      color: #00d4ff;
    }
    .metric {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      padding: 8px 0;
      border-bottom: 1px solid #2a2a4e;
    }
    .metric-label { color: #888; }
    .metric-value { font-weight: bold; }
    .progress-bar {
      height: 8px;
      background: #2a2a4e;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 5px;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #00d4ff, #7b2fff);
      transition: width 0.5s ease;
    }
    .behavior-list {
      max-height: 300px;
      overflow-y: auto;
    }
    .behavior-item {
      padding: 10px;
      margin-bottom: 10px;
      background: #252542;
      border-radius: 8px;
      border-left: 3px solid #00d4ff;
    }
    .behavior-name {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .behavior-meta {
      font-size: 0.9em;
      color: #888;
    }
    .last-update {
      text-align: center;
      color: #888;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🌟 POLLN Emergence Dashboard</h1>
    <p>Real-time monitoring of emergent intelligence</p>
  </div>

  <div class="grid">
    <!-- Emergence Metrics -->
    <div class="card">
      <h2>Emergence Metrics</h2>
      <div id="metrics"></div>
    </div>

    <!-- Hydraulic System -->
    <div class="card">
      <h2>Hydraulic System</h2>
      <div id="hydraulic"></div>
    </div>

    <!-- Emergent Behaviors -->
    <div class="card">
      <h2>Emergent Behaviors</h2>
      <div class="behavior-list" id="behaviors"></div>
    </div>

    <!-- Cataloged Abilities -->
    <div class="card">
      <h2>Cataloged Abilities</h2>
      <div class="behavior-list" id="abilities"></div>
    </div>

    <!-- Stigmergy -->
    <div class="card">
      <h2>Stigmergy Trails</h2>
      <div id="stigmergy"></div>
    </div>
  </div>

  <div class="last-update" id="lastUpdate">Connecting...</div>

  <script>
    const socket = io();

    socket.on('update', (data) => {
      updateMetrics(data.metrics);
      updateHydraulic(data.hydraulic);
      updateBehaviors(data.behaviors);
      updateAbilities(data.abilities);
      updateStigmergy(data.stigmergy);
      document.getElementById('lastUpdate').textContent =
        'Last update: ' + new Date(data.timestamp).toLocaleString();
    });

    function updateMetrics(metrics) {
      if (!metrics) return;
      const container = document.getElementById('metrics');
      container.innerHTML = '';

      const items = [
        { label: 'Complexity', value: metrics.complexity?.graphEntropy || 0 },
        { label: 'Pathway Diversity', value: metrics.complexity?.pathwayDiversity || 0 },
        { label: 'Novelty', value: metrics.novelty?.outcomeNovelty || 0 },
        { label: 'Synergy', value: metrics.synergy?.emergence || 0 },
        { label: 'Overall', value: metrics.overallScore || 0 },
      ];

      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'metric';
        div.innerHTML = \`
          <span class="metric-label">\${item.label}</span>
          <span class="metric-value">\${(item.value * 100).toFixed(1)}%</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: \${item.value * 100}%"></div>
          </div>
        \`;
        container.appendChild(div);
      });
    }

    function updateHydraulic(hydraulic) {
      if (!hydraulic) return;
      const container = document.getElementById('hydraulic');
      container.innerHTML = '';

      const pressure = hydraulic.pressure?.avgPressure || 0;
      const flow = hydraulic.flow?.totalFlow || 0;
      const activePumps = hydraulic.pumps?.activePumps || 0;
      const openValves = hydraulic.valves?.openValves || 0;

      const items = [
        { label: 'Pressure', value: pressure },
        { label: 'Flow', value: Math.min(flow, 1) },
        { label: 'Active Pumps', value: activePumps + ' / ' + (hydraulic.pumps?.totalPumps || 0) },
        { label: 'Open Valves', value: openValves + ' / ' + (hydraulic.valves?.totalValves || 0) },
      ];

      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'metric';
        const isNumber = typeof item.value === 'number';
        div.innerHTML = \`
          <span class="metric-label">\${item.label}</span>
          <span class="metric-value">\${isNumber ? (item.value * 100).toFixed(1) + '%' : item.value}</span>
        \`;
        container.appendChild(div);
      });
    }

    function updateBehaviors(behaviors) {
      const container = document.getElementById('behaviors');
      container.innerHTML = '';

      behaviors.slice(0, 10).forEach(b => {
        const div = document.createElement('div');
        div.className = 'behavior-item';
        div.innerHTML = \`
          <div class="behavior-name">\${b.name}</div>
          <div class="behavior-meta">
            Score: \${(b.emergenceScore * 100).toFixed(1)}% |
            Occurrences: \${b.occurrenceCount}
          </div>
        \`;
        container.appendChild(div);
      });
    }

    function updateAbilities(abilities) {
      const container = document.getElementById('abilities');
      container.innerHTML = '';

      abilities.slice(0, 10).forEach(a => {
        const div = document.createElement('div');
        div.className = 'behavior-item';
        div.innerHTML = \`
          <div class="behavior-name">\${a.name}</div>
          <div class="behavior-meta">
            \${a.category} |
            Validation: \${(a.validationScore * 100).toFixed(1)}% |
            Usage: \${a.usageFrequency}
          </div>
        \`;
        container.appendChild(div);
      });
    }

    function updateStigmergy(stigmergy) {
      if (!stigmergy) return;
      const container = document.getElementById('stigmergy');
      container.innerHTML = '';

      const stats = stigmergy.stats;
      if (stats) {
        const items = [
          { label: 'Pheromones', value: stats.pheromoneCount },
          { label: 'Trails', value: stats.trailCount },
        ];

        items.forEach(item => {
          const div = document.createElement('div');
          div.className = 'metric';
          div.innerHTML = \`
            <span class="metric-label">\${item.label}</span>
            <span class="metric-value">\${item.value}</span>
          \`;
          container.appendChild(div);
        });
      }
    }
  </script>
</body>
</html>
`;
