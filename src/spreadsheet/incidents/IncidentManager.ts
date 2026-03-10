/**
 * POLLN Incident Manager
 * Track and manage incidents throughout their lifecycle
 */

import { randomUUID } from 'crypto';
import type {
  Incident,
  IncidentStatus,
  IncidentSeverity,
  IncidentAction,
  ActionResult,
  DashboardFilter
} from './types.js';

/**
 * Incident Manager Configuration
 */
export interface IncidentManagerConfig {
  maxIncidents: number;
  retentionDays: number;
  autoAssign: boolean;
  defaultAssignee?: string;
}

/**
 * Incident Manager Class
 */
export class IncidentManager {
  private incidents: Map<string, Incident> = new Map();
  private config: IncidentManagerConfig;

  constructor(config?: Partial<IncidentManagerConfig>) {
    this.config = {
      maxIncidents: 1000,
      retentionDays: 90,
      autoAssign: false,
      ...config
    };
  }

  /**
   * Create new incident
   */
  createIncident(incident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>): Incident {
    // Check max incidents limit
    if (this.incidents.size >= this.config.maxIncidents) {
      throw new Error('Maximum incident limit reached');
    }

    const newIncident: Incident = {
      ...incident,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      detectedAt: incident.detectedAt || new Date()
    };

    // Auto-assign if configured
    if (this.config.autoAssign && this.config.defaultAssignee) {
      newIncident.assignee = this.config.defaultAssignee;
    }

    this.incidents.set(newIncident.id, newIncident);
    return newIncident;
  }

  /**
   * Get incident by ID
   */
  getIncident(id: string): Incident | undefined {
    return this.incidents.get(id);
  }

  /**
   * Update incident
   */
  updateIncident(
    id: string,
    updates: Partial<Omit<Incident, 'id' | 'createdAt'>>,
    userId: string
  ): Incident | undefined {
    const incident = this.incidents.get(id);

    if (!incident) {
      return undefined;
    }

    // Apply updates
    Object.assign(incident, updates);
    incident.updatedAt = new Date();

    // Record update as action
    if (updates.status) {
      incident.actions.push({
        id: randomUUID(),
        type: 'investigation',
        executor: userId,
        timestamp: new Date(),
        result: {
          success: true,
          message: `Status updated to ${updates.status}`,
          duration: 0
        }
      });
    }

    this.incidents.set(id, incident);
    return incident;
  }

  /**
   * Resolve incident
   */
  resolveIncident(
    id: string,
    resolution: string,
    userId: string
  ): Incident | undefined {
    return this.updateIncident(id, {
      status: IncidentStatus.RESOLVED,
      resolvedAt: new Date()
    }, userId);
  }

  /**
   * Close incident
   */
  closeIncident(id: string, userId: string): Incident | undefined {
    return this.updateIncident(id, {
      status: IncidentStatus.CLOSED
    }, userId);
  }

  /**
   * Add action to incident
   */
  addAction(
    id: string,
    type: IncidentAction['type'],
    executor: string,
    result: ActionResult
  ): Incident | undefined {
    const incident = this.incidents.get(id);

    if (!incident) {
      return undefined;
    }

    incident.actions.push({
      id: randomUUID(),
      type,
      executor,
      timestamp: new Date(),
      result
    });

    incident.updatedAt = new Date();
    this.incidents.set(id, incident);
    return incident;
  }

  /**
   * Assign incident
   */
  assignIncident(id: string, assignee: string): Incident | undefined {
    return this.updateIncident(id, { assignee }, 'system');
  }

  /**
   * Query incidents
   */
  queryIncidents(filter?: DashboardFilter): Incident[] {
    let incidents = Array.from(this.incidents.values());

    if (!filter) {
      return incidents;
    }

    // Apply filters
    if (filter.types && filter.types.length > 0) {
      incidents = incidents.filter(i => filter.types!.includes(i.type));
    }

    if (filter.severities && filter.severities.length > 0) {
      incidents = incidents.filter(i => filter.severities!.includes(i.severity));
    }

    if (filter.statuses && filter.statuses.length > 0) {
      incidents = incidents.filter(i => filter.statuses!.includes(i.status));
    }

    if (filter.dateRange) {
      incidents = incidents.filter(i =>
        i.detectedAt >= filter.dateRange!.start &&
        i.detectedAt <= filter.dateRange!.end
      );
    }

    if (filter.tags && filter.tags.length > 0) {
      incidents = incidents.filter(i =>
        filter.tags!.some(tag => i.tags.includes(tag))
      );
    }

    if (filter.assignee) {
      incidents = incidents.filter(i => i.assignee === filter.assignee);
    }

    // Sort by detected date descending
    return incidents.sort((a, b) =>
      b.detectedAt.getTime() - a.detectedAt.getTime()
    );
  }

  /**
   * Delete incident
   */
  deleteIncident(id: string): boolean {
    return this.incidents.delete(id);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const incidents = Array.from(this.incidents.values());

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Calculate MTTD (Mean Time To Detect)
    // In real scenario, this would be time from occurrence to detection
    const mttd = incidents.length > 0
      ? incidents.reduce((sum, i) => sum + (i.detectedAt.getTime() - i.createdAt.getTime()), 0) / incidents.length
      : 0;

    // Calculate MTTR (Mean Time To Resolve)
    const resolved = incidents.filter(i => i.resolvedAt);
    const mttr = resolved.length > 0
      ? resolved.reduce((sum, i) => sum + (i.resolvedAt!.getTime() - i.detectedAt.getTime()), 0) / resolved.length
      : 0;

    // Trend analysis
    const last24h = incidents.filter(i => now - i.detectedAt.getTime() < dayMs).length;
    const last7d = incidents.filter(i => now - i.detectedAt.getTime() < 7 * dayMs).length;
    const last30d = incidents.filter(i => now - i.detectedAt.getTime() < 30 * dayMs).length;

    let trend: 'improving' | 'stable' | 'degrading';
    if (last24h > last7d / 7 && last7d > last30d / 30) {
      trend = 'degrading';
    } else if (last24h < last7d / 7 && last7d < last30d / 30) {
      trend = 'improving';
    } else {
      trend = 'stable';
    }

    return {
      total: incidents.length,
      byStatus: {
        detected: incidents.filter(i => i.status === IncidentStatus.DETECTED).length,
        investigating: incidents.filter(i => i.status === IncidentStatus.INVESTIGATING).length,
        resolving: incidents.filter(i => i.status === IncidentStatus.RESOLVING).length,
        resolved: incidents.filter(i => i.status === IncidentStatus.RESOLVED).length,
        closed: incidents.filter(i => i.status === IncidentStatus.CLOSED).length
      },
      bySeverity: {
        critical: incidents.filter(i => i.severity === IncidentSeverity.CRITICAL).length,
        high: incidents.filter(i => i.severity === IncidentSeverity.HIGH).length,
        medium: incidents.filter(i => i.severity === IncidentSeverity.MEDIUM).length,
        low: incidents.filter(i => i.severity === IncidentSeverity.LOW).length,
        info: incidents.filter(i => i.severity === IncidentSeverity.INFO).length
      },
      byType: {
        security: incidents.filter(i => i.type === 'security').length,
        performance: incidents.filter(i => i.type === 'performance').length,
        data: incidents.filter(i => i.type === 'data').length,
        availability: incidents.filter(i => i.type === 'availability').length,
        compliance: incidents.filter(i => i.type === 'compliance').length
      },
      unassigned: incidents.filter(i => !i.assignee).length,
      mttd: mttd / (1000 * 60), // Convert to minutes
      mttr: mttr / (1000 * 60), // Convert to minutes
      trend,
      recentActivity: {
        last24h,
        last7d,
        last30d
      }
    };
  }

  /**
   * Clean up old incidents
   */
  cleanup(): number {
    const now = Date.now();
    const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
    let cleaned = 0;

    for (const [id, incident] of this.incidents.entries()) {
      const lastActivity = incident.resolvedAt || incident.updatedAt;
      if (now - lastActivity.getTime() > retentionMs) {
        if (incident.status === IncidentStatus.CLOSED) {
          this.incidents.delete(id);
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  /**
   * Export incidents
   */
  exportIncidents(filter?: DashboardFilter): string {
    const incidents = this.queryIncidents(filter);
    return JSON.stringify({
      incidents,
      exportedAt: new Date(),
      version: '1.0.0'
    }, null, 2);
  }

  /**
   * Import incidents
   */
  importIncidents(data: string): number {
    const parsed = JSON.parse(data);
    let imported = 0;

    for (const incident of parsed.incidents || []) {
      try {
        this.incidents.set(incident.id, {
          ...incident,
          createdAt: new Date(incident.createdAt),
          updatedAt: new Date(incident.updatedAt),
          detectedAt: new Date(incident.detectedAt),
          resolvedAt: incident.resolvedAt ? new Date(incident.resolvedAt) : undefined
        });
        imported++;
      } catch (error) {
        console.error(`Failed to import incident ${incident.id}:`, error);
      }
    }

    return imported;
  }
}
