/**
 * Monitoring and Analytics for Spreadsheet Moment
 *
 * Provides comprehensive monitoring capabilities including:
 * - Cell update metrics
 * - Agent cell metrics
 * - WebSocket connection metrics
 * - Formula execution metrics
 * - Memory usage tracking
 */

interface MetricConfig {
    name: string;
    type: 'counter' | 'gauge' | 'histogram';
    help: string;
    labels?: string[];
}

interface MetricValue {
    value: number;
    labels?: Record<string, string>;
    timestamp?: number;
}

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
  memoryUsage: number;
  activeConnections: number;
  errorsPerSecond: number;
}

export class SpreadsheetMetrics {
    private metrics: Map<string, MetricValue[]> = new Map();
    private counters: Map<string, number> = new Map();
    private gauges: Map<string, number> = new Map();
    private histograms: Map<string, number[]> = new Map();
    private startTime: number = Date.now();
    private observers: Array<(event: string, data: any) => void> = [];

    constructor() {
        this.initializeMetrics();
    }

    private initializeMetrics(): void {
        // Cell metrics
        this.registerCounter('cell_updates_total', 'Total number of cell updates');
        this.registerCounter('cell_updates_failed', 'Total number of failed cell updates');
        this.registerHistogram('cell_update_duration_seconds', 'Cell update duration in seconds');

        // Agent metrics
        this.registerGauge('agent_cells_active', 'Current number of active agent cells');
        this.registerCounter('agent_cells_created_total', 'Total number of agent cells created');
        this.registerCounter('agent_cells_deleted_total', 'Total number of agent cells deleted');
        this.registerHistogram('agent_execution_duration_seconds', 'Agent execution duration in seconds');

        // WebSocket metrics
        this.registerGauge('websocket_connections_active', 'Current number of active WebSocket connections');
        this.registerCounter('websocket_connections_total', 'Total number of WebSocket connections');
        this.registerCounter('websocket_messages_sent_total', 'Total number of WebSocket messages sent');
        this.registerCounter('websocket_messages_received_total', 'Total number of WebSocket messages received');

        // Formula metrics
        this.registerCounter('formula_executions_total', 'Total number of formula executions');
        this.registerCounter('formula_executions_failed', 'Total number of failed formula executions');
        this.registerHistogram('formula_execution_duration_seconds', 'Formula execution duration in seconds');

        // Performance metrics
        this.registerGauge('memory_usage_bytes', 'Current memory usage in bytes');
        this.registerGauge('cpu_usage_percent', 'Current CPU usage percentage');
        this.registerHistogram('request_duration_seconds', 'Request duration in seconds');

        // Error metrics
        this.registerCounter('errors_total', 'Total number of errors', ['error_type', 'component']);
    }

    private registerCounter(name: string, help: string, labels: string[] = []): void {
        this.counters.set(name, 0);
        this.metrics.set(name, []);
    }

    private registerGauge(name: string, help: string, labels: string[] = []): void {
        this.gauges.set(name, 0);
        this.metrics.set(name, []);
    }

    private registerHistogram(name: string, help: string, labels: string[] = []): void {
        this.histograms.set(name, []);
        this.metrics.set(name, []);
    }

    /**
     * Increment a counter metric
     */
    incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
        const current = this.counters.get(name) || 0;
        this.counters.set(name, current + value);

        const metricValue: MetricValue = { value: current + value, labels, timestamp: Date.now() };
        const values = this.metrics.get(name) || [];
        values.push(metricValue);
        this.metrics.set(name, values);

        this.notifyObservers(name, { type: 'counter', value: current + value, labels });
    }

    /**
     * Set a gauge metric
     */
    setGauge(name: string, value: number, labels?: Record<string, string>): void {
        this.gauges.set(name, value);

        const metricValue: MetricValue = { value, labels, timestamp: Date.now() };
        const values = this.metrics.get(name) || [];
        values.push(metricValue);
        this.metrics.set(name, values);

        this.notifyObservers(name, { type: 'gauge', value, labels });
    }

    /**
     * Record a histogram value
     */
    recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
        const values = this.histograms.get(name) || [];
        values.push(value);
        this.histograms.set(name, values);

        const metricValue: MetricValue = { value, labels, timestamp: Date.now() };
        const metricValues = this.metrics.get(name) || [];
        metricValues.push(metricValue);
        this.metrics.set(name, metricValues);

        this.notifyObservers(name, { type: 'histogram', value, labels });
    }

    /**
     * Record cell update
     */
    recordCellUpdate(duration: number, success: boolean = true): void {
        this.recordHistogram('cell_update_duration_seconds', duration);
        if (success) {
            this.incrementCounter('cell_updates_total');
        } else {
            this.incrementCounter('cell_updates_failed');
        }
    }

    /**
     * Record agent cell creation
     */
    recordAgentCellCreated(): void {
        this.incrementCounter('agent_cells_created_total');
        const current = this.gauges.get('agent_cells_active') || 0;
        this.setGauge('agent_cells_active', current + 1);
    }

    /**
     * Record agent cell deletion
     */
    recordAgentCellDeleted(): void {
        this.incrementCounter('agent_cells_deleted_total');
        const current = this.gauges.get('agent_cells_active') || 0;
        this.setGauge('agent_cells_active', Math.max(0, current - 1));
    }

    /**
     * Record agent execution
     */
    recordAgentExecution(duration: number): void {
        this.recordHistogram('agent_execution_duration_seconds', duration);
    }

    /**
     * Record WebSocket connection
     */
    recordWebSocketConnection(): void {
        this.incrementCounter('websocket_connections_total');
        const current = this.gauges.get('websocket_connections_active') || 0;
        this.setGauge('websocket_connections_active', current + 1);
    }

    /**
     * Record WebSocket disconnection
     */
    recordWebSocketDisconnection(): void {
        const current = this.gauges.get('websocket_connections_active') || 0;
        this.setGauge('websocket_connections_active', Math.max(0, current - 1));
    }

    /**
     * Record WebSocket message
     */
    recordWebSocketMessage(sent: boolean, received: boolean = false): void {
        if (sent) {
            this.incrementCounter('websocket_messages_sent_total');
        }
        if (received) {
            this.incrementCounter('websocket_messages_received_total');
        }
    }

    /**
     * Record formula execution
     */
    recordFormulaExecution(duration: number, success: boolean = true): void {
        this.recordHistogram('formula_execution_duration_seconds', duration);
        if (success) {
            this.incrementCounter('formula_executions_total');
        } else {
            this.incrementCounter('formula_executions_failed');
        }
    }

    /**
     * Update memory usage
     */
    updateMemoryUsage(): void {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const usage = process.memoryUsage();
            this.setGauge('memory_usage_bytes', usage.heapUsed);
        }
    }

    /**
     * Record error
     */
    recordError(errorType: string, component: string): void {
        this.incrementCounter('errors_total', 1, { error_type: errorType, component });
    }

    /**
     * Get metric value
     */
    getMetric(name: string): MetricValue[] {
        return this.metrics.get(name) || [];
    }

    /**
     * Get counter value
     */
    getCounter(name: string): number {
        return this.counters.get(name) || 0;
    }

    /**
     * Get gauge value
     */
    getGauge(name: string): number {
        return this.gauges.get(name) || 0;
    }

    /**
     * Get histogram statistics
     */
    getHistogramStats(name: string): { count: number; min: number; max: number; avg: number; p50: number; p95: number; p99: number } | null {
        const values = this.histograms.get(name);
        if (!values || values.length === 0) return null;

        const sorted = [...values].sort((a, b) => a - b);
        const count = sorted.length;
        const sum = sorted.reduce((a, b) => a + b, 0);

        return {
            count,
            min: sorted[0],
            max: sorted[count - 1],
            avg: sum / count,
            p50: sorted[Math.floor(count * 0.5)],
            p95: sorted[Math.floor(count * 0.95)],
            p99: sorted[Math.floor(count * 0.99)],
        };
    }

    /**
     * Get health status
     */
    getHealthStatus(): HealthStatus {
        const uptime = Date.now() - this.startTime;
        const memoryUsage = this.getGauge('memory_usage_bytes');
        const activeConnections = this.getGauge('websocket_connections_active');
        const errorsPerSecond = this.getCounter('errors_total') / (uptime / 1000);

        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        if (errorsPerSecond > 10) {
            status = 'unhealthy';
        } else if (errorsPerSecond > 1) {
            status = 'degraded';
        }

        return {
            status,
            uptime,
            memoryUsage,
            activeConnections,
            errorsPerSecond,
        };
    }

    /**
     * Export metrics as JSON
     */
    toJSON(): any {
        return {
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.startTime,
            counters: Object.fromEntries(this.counters),
            gauges: Object.fromEntries(this.gauges),
            histograms: Object.fromEntries(
                Array.from(this.histograms.entries()).map(([name, values]) => [
                    name,
                    this.getHistogramStats(name),
                ])
            ),
            health: this.getHealthStatus(),
        };
    }

    /**
     * Export metrics for Prometheus
     */
    toPrometheus(): string {
        const lines: string[] = [];

        // Counters
        for (const [name, value] of this.counters.entries()) {
            lines.push(`# HELP spreadsheet_${name} ${name}`);
            lines.push(`# TYPE spreadsheet_${name} counter`);
            lines.push(`spreadsheet_${name} ${value}`);
        }

        // Gauges
        for (const [name, value] of this.gauges.entries()) {
            lines.push(`# HELP spreadsheet_${name} ${name}`);
            lines.push(`# TYPE spreadsheet_${name} gauge`);
            lines.push(`spreadsheet_${name} ${value}`);
        }

        // Histograms
        for (const [name, values] of this.histograms.entries()) {
            const stats = this.getHistogramStats(name);
            if (stats) {
                lines.push(`# HELP spreadsheet_${name} ${name}`);
                lines.push(`# TYPE spreadsheet_${name} histogram`);
                lines.push(`spreadsheet_${name}_sum ${values.reduce((a, b) => a + b, 0)}`);
                lines.push(`spreadsheet_${name}_count ${stats.count}`);
            }
        }

        return lines.join('\n');
    }

    /**
     * Subscribe to metric updates
     */
    subscribe(observer: (event: string, data: any) => void): void {
        this.observers.push(observer);
    }

    /**
     * Unsubscribe from metric updates
     */
    unsubscribe(observer: (event: string, data: any) => void): void {
        const index = this.observers.indexOf(observer);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }

    /**
     * Notify observers of metric updates
     */
    private notifyObservers(event: string, data: any): void {
        this.observers.forEach((observer) => {
            try {
                observer(event, data);
            } catch (error) {
                console.error('Error notifying observer:', error);
            }
        });
    }

    /**
     * Reset all metrics
     */
    reset(): void {
        this.counters.clear();
        this.gauges.clear();
        this.histograms.clear();
        this.metrics.clear();
        this.startTime = Date.now();
        this.initializeMetrics();
    }
}

// Global metrics instance
export const globalMetrics = new SpreadsheetMetrics();

// Export for use in other modules
export default SpreadsheetMetrics;
