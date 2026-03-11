/**
 * SuperInstance REST API Server
 *
 * Provides RESTful API endpoints for managing SuperInstance cells
 * with rate-based change mechanics, confidence tracking, and origin-centric references.
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { SuperInstanceSystem, SuperInstanceFactory, InstanceType } from '../superinstance/index.js';
import { InstanceConfiguration, CellPosition, RateVector, RateBasedState } from '../superinstance/types/base.js';

// Types for API requests and responses
interface CreateInstanceRequest {
  type: InstanceType;
  name: string;
  description: string;
  cellPosition: CellPosition;
  spreadsheetId: string;
  configuration?: Partial<InstanceConfiguration>;
  capabilities?: string[];
  initialData?: any;
}

interface UpdateInstanceRequest {
  name?: string;
  description?: string;
  configuration?: Partial<InstanceConfiguration>;
}

interface UpdateRateRequest {
  value: any;
  timestamp?: number;
  confidence?: number;
}

interface PredictRequest {
  atTime: number;
}

interface SendMessageRequest {
  type: string;
  recipient: string;
  payload: any;
  priority?: string;
  ttl?: number;
}

interface CreateConnectionRequest {
  targetInstanceId: string;
  connectionType: string;
  bandwidth?: number;
  latency?: number;
  reliability?: number;
}

interface AdjustConfidenceRequest {
  adjustment: number;
  reason: string;
  notes?: string;
}

interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

class SuperInstanceApiServer {
  private app: Application;
  private system: SuperInstanceSystem;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.system = new SuperInstanceSystem();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors());

    // Logging
    this.app.use(morgan('combined'));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      limit: 100, // Limit each IP to 100 requests per windowMs
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: 'Too many requests from this IP, please try again later.'
    });

    this.app.use(limiter);
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Instance management
    this.app.get('/v1/instances', this.getInstances.bind(this));
    this.app.post('/v1/instances', this.createInstance.bind(this));
    this.app.get('/v1/instances/:instanceId', this.getInstance.bind(this));
    this.app.put('/v1/instances/:instanceId', this.updateInstance.bind(this));
    this.app.delete('/v1/instances/:instanceId', this.deleteInstance.bind(this));

    // Instance lifecycle
    this.app.post('/v1/instances/:instanceId/activate', this.activateInstance.bind(this));
    this.app.post('/v1/instances/:instanceId/deactivate', this.deactivateInstance.bind(this));
    this.app.post('/v1/instances/:instanceId/terminate', this.terminateInstance.bind(this));

    // Rate-based operations
    this.app.post('/v1/instances/:instanceId/rate/update', this.updateRate.bind(this));
    this.app.post('/v1/instances/:instanceId/rate/predict', this.predictRate.bind(this));
    this.app.get('/v1/instances/:instanceId/rate/history', this.getRateHistory.bind(this));

    // Message passing
    this.app.post('/v1/instances/:instanceId/messages', this.sendMessage.bind(this));
    this.app.get('/v1/instances/:instanceId/messages', this.getMessages.bind(this));

    // Connections
    this.app.post('/v1/instances/:instanceId/connections', this.createConnection.bind(this));
    this.app.get('/v1/instances/:instanceId/connections', this.getConnections.bind(this));
    this.app.delete('/v1/instances/:instanceId/connections/:connectionId', this.deleteConnection.bind(this));

    // System monitoring
    this.app.get('/v1/system/status', this.getSystemStatus.bind(this));
    this.app.get('/v1/system/metrics', this.getSystemMetrics.bind(this));

    // Confidence cascade
    this.app.get('/v1/instances/:instanceId/confidence', this.getConfidence.bind(this));
    this.app.post('/v1/instances/:instanceId/confidence/adjust', this.adjustConfidence.bind(this));
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const error: ApiError = new Error(`Not Found: ${req.originalUrl}`);
      error.statusCode = 404;
      next(error);
    });

    // Error handler
    this.app.use((error: ApiError, req: Request, res: Response, next: NextFunction) => {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Internal Server Error';

      res.status(statusCode).json({
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message,
          details: {},
          timestamp: new Date().toISOString()
        }
      });
    });
  }

  // Instance management handlers
  private async getInstances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type, state, spreadsheetId, limit = 50, offset = 0 } = req.query;

      let instances = this.system.getAllInstances();

      // Apply filters
      if (type) {
        instances = instances.filter(instance => instance.type === type);
      }

      if (state) {
        instances = instances.filter(instance => instance.state === state);
      }

      if (spreadsheetId) {
        instances = instances.filter(instance => instance.spreadsheetId === spreadsheetId);
      }

      // Apply pagination
      const start = parseInt(offset as string);
      const end = start + parseInt(limit as string);
      const paginatedInstances = instances.slice(start, end);

      res.json({
        instances: paginatedInstances.map(instance => this.formatInstance(instance)),
        total: instances.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error) {
      next(error);
    }
  }

  private async createInstance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request: CreateInstanceRequest = req.body;

      // Validate required fields
      if (!request.type || !request.name || !request.cellPosition || !request.spreadsheetId) {
        const error: ApiError = new Error('Missing required fields: type, name, cellPosition, spreadsheetId');
        error.statusCode = 400;
        error.code = 'MISSING_REQUIRED_FIELDS';
        throw error;
      }

      // Generate ID
      const instanceId = `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create instance
      const instance = await this.system.createInstance({
        type: request.type,
        id: instanceId,
        name: request.name,
        description: request.description || '',
        cellPosition: request.cellPosition,
        spreadsheetId: request.spreadsheetId,
        configuration: request.configuration,
        ...request.initialData
      });

      res.status(201).json({
        instance: this.formatInstance(instance),
        rateState: instance.rateState
      });
    } catch (error) {
      next(error);
    }
  }

  private async getInstance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const instance = this.system.getInstance(instanceId);

      if (!instance) {
        const error: ApiError = new Error(`Instance not found: ${instanceId}`);
        error.statusCode = 404;
        error.code = 'INSTANCE_NOT_FOUND';
        throw error;
      }

      const metrics = await instance.getMetrics();
      const status = await instance.getStatus();

      res.json({
        instance: this.formatInstance(instance),
        metrics,
        status,
        rateState: instance.rateState
      });
    } catch (error) {
      next(error);
    }
  }

  private async updateInstance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const updates: UpdateInstanceRequest = req.body;

      const instance = this.system.getInstance(instanceId);
      if (!instance) {
        const error: ApiError = new Error(`Instance not found: ${instanceId}`);
        error.statusCode = 404;
        error.code = 'INSTANCE_NOT_FOUND';
        throw error;
      }

      // Apply updates
      if (updates.name) instance.name = updates.name;
      if (updates.description) instance.description = updates.description;
      if (updates.configuration) {
        instance.configuration = { ...instance.configuration, ...updates.configuration };
      }

      instance.updatedAt = Date.now();

      res.json({
        instance: this.formatInstance(instance),
        updatedAt: instance.updatedAt
      });
    } catch (error) {
      next(error);
    }
  }

  private async deleteInstance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const success = await this.system.removeInstance(instanceId);

      if (!success) {
        const error: ApiError = new Error(`Instance not found: ${instanceId}`);
        error.statusCode = 404;
        error.code = 'INSTANCE_NOT_FOUND';
        throw error;
      }

      res.json({
        success: true,
        message: 'Instance terminated successfully',
        terminatedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  // Instance lifecycle handlers
  private async activateInstance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const instance = this.system.getInstance(instanceId);

      if (!instance) {
        const error: ApiError = new Error(`Instance not found: ${instanceId}`);
        error.statusCode = 404;
        error.code = 'INSTANCE_NOT_FOUND';
        throw error;
      }

      await instance.activate();

      res.json({
        success: true,
        state: instance.state,
        activatedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  private async deactivateInstance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const instance = this.system.getInstance(instanceId);

      if (!instance) {
        const error: ApiError = new Error(`Instance not found: ${instanceId}`);
        error.statusCode = 404;
        error.code = 'INSTANCE_NOT_FOUND';
        throw error;
      }

      await instance.deactivate();

      res.json({
        success: true,
        state: instance.state,
        deactivatedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  private async terminateInstance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const instance = this.system.getInstance(instanceId);

      if (!instance) {
        const error: ApiError = new Error(`Instance not found: ${instanceId}`);
        error.statusCode = 404;
        error.code = 'INSTANCE_NOT_FOUND';
        throw error;
      }

      await instance.terminate();

      res.json({
        success: true,
        state: instance.state,
        terminatedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  // Rate-based operations handlers
  private async updateRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const request: UpdateRateRequest = req.body;

      const instance = this.system.getInstance(instanceId);
      if (!instance) {
        const error: ApiError = new Error(`Instance not found: ${instanceId}`);
        error.statusCode = 404;
        error.code = 'INSTANCE_NOT_FOUND';
        throw error;
      }

      if (request.value === undefined) {
        const error: ApiError = new Error('Missing required field: value');
        error.statusCode = 400;
        error.code = 'MISSING_REQUIRED_FIELD';
        throw error;
      }

      const timestamp = request.timestamp || Date.now();
      instance.updateRateState(request.value, timestamp);

      res.json({
        rateState: instance.rateState,
        confidenceScore: instance.confidenceScore,
        confidenceZone: instance.confidenceZone,
        deadbandTriggered: false // This would be calculated in real implementation
      });
    } catch (error) {
      next(error);
    }
  }

  private async predictRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const request: PredictRequest = req.body;

      const instance = this.system.getInstance(instanceId);
      if (!instance) {
        const error: ApiError = new Error(`Instance not found: ${instanceId}`);
        error.statusCode = 404;
        error.code = 'INSTANCE_NOT_FOUND';
        throw error;
      }

      if (!request.atTime) {
        const error: ApiError = new Error('Missing required field: atTime');
        error.statusCode = 400;
        error.code = 'MISSING_REQUIRED_FIELD';
        throw error;
      }

      const predictedValue = instance.predictState(request.atTime);

      res.json({
        predictedValue,
        predictionTime: new Date(request.atTime).toISOString(),
        confidence: instance.rateState?.rateOfChange.confidence || 0.5,
        basedOnRate: instance.rateState?.rateOfChange
      });
    } catch (error) {
      next(error);
    }
  }

  private async getRateHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const { startTime, endTime, limit = 100 } = req.query;

      const instance = this.system.getInstance(instanceId);
      if (!instance) {
        const error: ApiError = new Error(`Instance not found: ${instanceId}`);
        error.statusCode = 404;
        error.code = 'INSTANCE_NOT_FOUND';
        throw error;
      }

      // In a real implementation, this would query a time-series database
      // For now, return empty history
      res.json({
        history: [],
        total: 0
      });
    } catch (error) {
      next(error);
    }
  }

  // Message passing handlers (simplified implementation)
  private async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const request: SendMessageRequest = req.body;

      const instance = this.system.getInstance(instanceId);
      if (!instance) {
        const error: ApiError = new Error(`Instance not found: ${instanceId}`);
        error.statusCode = 404;
        error.code = 'INSTANCE_NOT_FOUND';
        throw error;
      }

      // Validate required fields
      if (!request.type || !request.recipient || !request.payload) {
        const error: ApiError = new Error('Missing required fields: type, recipient, payload');
        error.statusCode = 400;
        error.code = 'MISSING_REQUIRED_FIELDS';
        throw error;
      }

      // In a real implementation, this would send the message through a message broker
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      res.json({
        messageId,
        status: 'sent',
        sentAt: new Date().toISOString(),
        estimatedDelivery: new Date(Date.now() + 1000).toISOString() // 1 second estimate
      });
    } catch (error) {
      next(error);
    }
  }

  private async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const { type, status, limit = 50, offset = 0 } = req.query;

      const instance = this.system.getInstance(instanceId);
      if (!instance) {
        const error: ApiError = new Error(`Instance not found: ${instanceId}`);
        error.statusCode = 404;
        error.code = 'INSTANCE_NOT_FOUND';
        throw error;
      }

      // In a real implementation, this would query a message store
      res.json({
        messages: [],
        total: 0,
        unread: 0
      });
    } catch (error) {
      next(error);
    }
  }

  // Connection handlers (simplified implementation)
  private async createConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const request: CreateConnectionRequest = req.body;

      const sourceInstance = this.system.getInstance(instanceId);
      const targetInstance = this.system.getInstance(request.targetInstanceId);

      if (!sourceInstance || !targetInstance) {
        const error: ApiError = new Error('Source or target instance not found');
        error.statusCode = 404;
        error.code = 'INSTANCE_NOT_FOUND';
        throw error;
      }

      // Validate required fields
      if (!request.connectionType) {
        const error: ApiError = new Error('Missing required field: connectionType');
        error.statusCode = 400;
        error.code = 'MISSING_REQUIRED_FIELD';
        throw error;
      }

      // In a real implementation, this would create a connection
      const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      res.json({
        connection: {
          id: connectionId,
          source: instanceId,
          target: request.targetInstanceId,
          type: request.connectionType,
          bandwidth: request.bandwidth || 1000,
          latency: request.latency || 10,
          reliability: request.reliability || 0.99,
          establishedAt: new Date().toISOString(),
          status: 'active'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  private async getConnections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;

      const instance = this.system.getInstance(instanceId);
      if (!instance) {
        const error: ApiError = new Error(`Instance not found: ${instanceId}`);
        error.statusCode = 404;
        error.code = 'INSTANCE_NOT_FOUND';
        throw error;
      }

      // In a real implementation, this would query connections
      res.json({
        connections: [],
        total: 0
      });
    } catch (error) {
      next(error);
    }
  }

  private async deleteConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId, connectionId } = req.params;

      const instance = this.system.getInstance(instanceId);
      if (!instance) {
        const error: ApiError = new Error(`Instance not found: ${instanceId}`);
        error.statusCode = 404;
        error.code = 'INSTANCE_NOT_FOUND';
        throw error;
      }

      // In a real implementation, this would delete the connection
      res.json({
        success: true,
        disconnectedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  // System monitoring handlers
  private async getSystemStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = this.system.getSystemStatus();
      const instances = this.system.getAllInstances();

      // Calculate resource usage
      let totalCPU = 0;
      let usedCPU = 0;
      let totalMemory = 0;
      let usedMemory = 0;
      let totalStorage = 0;
      let usedStorage = 0;

      for (const instance of instances) {
        totalCPU += instance.configuration.resources.cpu;
        usedCPU += instance.configuration.resources.cpu * 0.5; // Simplified usage
        totalMemory += instance.configuration.resources.memory;
        usedMemory += instance.configuration.resources.memory * 0.6; // Simplified usage
        totalStorage += instance.configuration.resources.storage;
        usedStorage += instance.configuration.resources.storage * 0.3; // Simplified usage
      }

      // Count instances by type and state
      const byType: Record<string, number> = {};
      const byState: Record<string, number> = {};

      for (const instance of instances) {
        byType[instance.type] = (byType[instance.type] || 0) + 1;
        byState[instance.state] = (byState[instance.state] || 0) + 1;
      }

      res.json({
        status: status.health,
        timestamp: new Date().toISOString(),
        instances: {
          total: instances.length,
          byType,
          byState
        },
        resources: {
          totalCPU,
          usedCPU,
          totalMemory,
          usedMemory,
          totalStorage,
          usedStorage
        },
        performance: {
          averageLatency: 45,
          errorRate: 0.02,
          throughput: 1500
        }
      });
    } catch (error) {
      next(error);
    }
  }

  private async getSystemMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { timeRange = '1h', metric } = req.query;

      // In a real implementation, this would query metrics from a time-series database
      // For now, return sample data
      const now = Date.now();
      const dataPoints = 12;
      const interval = 5 * 60 * 1000; // 5 minutes

      const metrics: Record<string, Array<{ timestamp: string; value: number }>> = {
        cpuUsage: [],
        memoryUsage: [],
        requestRate: [],
        errorRate: []
      };

      for (let i = 0; i < dataPoints; i++) {
        const timestamp = new Date(now - (dataPoints - i - 1) * interval).toISOString();

        metrics.cpuUsage.push({
          timestamp,
          value: 45 + Math.random() * 10
        });

        metrics.memoryUsage.push({
          timestamp,
          value: 65 + Math.random() * 10
        });

        metrics.requestRate.push({
          timestamp,
          value: 150 + Math.random() * 30
        });

        metrics.errorRate.push({
          timestamp,
          value: 0.02 + Math.random() * 0.01
        });
      }

      res.json({
        metrics: metric ? { [metric as string]: metrics[metric as string] } : metrics,
        timeRange,
        dataPoints
      });
    } catch (error) {
      next(error);
    }
  }

  // Confidence cascade handlers
  private async getConfidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;

      const instance = this.system.getInstance(instanceId);
      if (!instance) {
        const error: ApiError = new Error(`Instance not found: ${instanceId}`);
        error.statusCode = 404;
        error.code = 'INSTANCE_NOT_FOUND';
        throw error;
      }

      // In a real implementation, this would get confidence history
      res.json({
        confidenceScore: instance.confidenceScore,
        confidenceZone: instance.confidenceZone,
        history: [],
        factors: {
          dataQuality: 0.95,
          updateFrequency: 0.90,
          errorRate: 0.98,
          neighborConsensus: 0.85
        }
      });
    } catch (error) {
      next(error);
    }
  }

  private async adjustConfidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const request: AdjustConfidenceRequest = req.body;

      const instance = this.system.getInstance(instanceId);
      if (!instance) {
        const error: ApiError = new Error(`Instance not found: ${instanceId}`);
        error.statusCode = 404;
        error.code = 'INSTANCE_NOT_FOUND';
        throw error;
      }

      if (request.adjustment === undefined || !request.reason) {
        const error: ApiError = new Error('Missing required fields: adjustment, reason');
        error.statusCode = 400;
        error.code = 'MISSING_REQUIRED_FIELDS';
        throw error;
      }

      const previousScore = instance.confidenceScore;
      const previousZone = instance.confidenceZone;

      instance.updateConfidence(instance.confidenceScore + request.adjustment);

      res.json({
        previousScore,
        newScore: instance.confidenceScore,
        previousZone,
        newZone: instance.confidenceZone,
        adjustedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  // Helper methods
  private formatInstance(instance: any): any {
    return {
      id: instance.id,
      type: instance.type,
      name: instance.name,
      description: instance.description,
      state: instance.state,
      cellPosition: instance.cellPosition,
      spreadsheetId: instance.spreadsheetId,
      createdAt: new Date(instance.createdAt).toISOString(),
      updatedAt: new Date(instance.updatedAt).toISOString(),
      configuration: instance.configuration,
      capabilities: instance.capabilities,
      permissions: instance.permissions,
      confidenceScore: instance.confidenceScore,
      confidenceZone: instance.confidenceZone
    };
  }

  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`SuperInstance API Server running on port ${this.port}`);
      console.log(`Health check: http://localhost:${this.port}/health`);
      console.log(`API Base URL: http://localhost:${this.port}/v1`);
    });
  }

  public getApp(): Application {
    return this.app;
  }
}

export { SuperInstanceApiServer };

// If this file is run directly, start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT || '3000');
  const server = new SuperInstanceApiServer(port);
  server.start();
}