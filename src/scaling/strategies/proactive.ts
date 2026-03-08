/**
 * Proactive Scaling Strategy
 *
 * Time-based scheduled scaling
 */

import type {
  ScalingPolicy,
  ResourceMetrics,
  ScalingDecision,
  TimeSeriesPoint,
} from '../types.js';
import { v4 as uuidv4 } from 'uuid';
import { ScalingDirection } from '../types.js';

/**
 * Schedule definition
 */
interface Schedule {
  hours: number[]; // Hours of day (0-23)
  daysOfWeek?: number[]; // Days of week (0-6, 0 = Sunday)
  timezone?: string;
}

/**
 * Proactive Scaling Strategy
 */
export class ProactiveScalingStrategy {
  private schedules: Map<string, Schedule> = new Map();

  constructor() {
    // Initialize default schedules
    this.initializeDefaultSchedules();
  }

  /**
   * Initialize default schedules
   */
  private initializeDefaultSchedules(): void {
    // Business hours schedule
    this.schedules.set('business_hours', {
      hours: [9, 10, 11, 14, 15, 16],
      daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      timezone: 'UTC',
    });

    // Peak traffic schedule
    this.schedules.set('peak_traffic', {
      hours: [8, 9, 12, 13, 17, 18, 20, 21],
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      timezone: 'UTC',
    });

    // Night schedule
    this.schedules.set('night', {
      hours: [22, 23, 0, 1, 2, 3, 4, 5],
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      timezone: 'UTC',
    });
  }

  /**
   * Add schedule
   */
  public addSchedule(id: string, schedule: Schedule): void {
    this.schedules.set(id, schedule);
  }

  /**
   * Remove schedule
   */
  public removeSchedule(id: string): void {
    this.schedules.delete(id);
  }

  /**
   * Get current time in specified timezone
   */
  private getCurrentHour(timezone?: string): number {
    if (timezone) {
      return new Date().toLocaleString('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false,
      }) as unknown as number;
    }
    return new Date().getHours();
  }

  /**
   * Get current day of week
   */
  private getCurrentDayOfWeek(): number {
    return new Date().getDay();
  }

  /**
   * Check if current time matches schedule
   */
  private matchesSchedule(schedule: Schedule): boolean {
    const currentHour = this.getCurrentHour(schedule.timezone);
    const currentDay = this.getCurrentDayOfWeek();

    // Check hour
    if (!schedule.hours.includes(currentHour)) {
      return false;
    }

    // Check day of week if specified
    if (schedule.daysOfWeek && !schedule.daysOfWeek.includes(currentDay)) {
      return false;
    }

    return true;
  }

  /**
   * Evaluate policy and make scaling decision
   */
  async evaluate(
    policy: ScalingPolicy,
    metrics: ResourceMetrics,
    history: TimeSeriesPoint[][]
  ): Promise<ScalingDecision | null> {
    // Check if any schedule matches
    const matchedSchedule = this.findMatchingSchedule();

    if (!matchedSchedule) {
      return null;
    }

    // Determine if we should scale up or down
    const scheduleId = matchedSchedule;
    const schedule = this.schedules.get(scheduleId)!;
    const direction = this.determineDirection(scheduleId, metrics);

    // Filter actions by direction
    const applicableActions = policy.actions.filter(
      (a) => a.direction === direction
    );

    if (applicableActions.length === 0) {
      return null;
    }

    // Create decision
    const decision: ScalingDecision = {
      id: uuidv4(),
      policyId: policy.id,
      timestamp: Date.now(),
      metrics,
      triggeredTriggers: [`schedule_${scheduleId}`],
      actions: applicableActions,
      reason: `Proactive scaling for schedule: ${scheduleId}`,
      confidence: 0.85, // High confidence for scheduled scaling
      estimatedImpact: {
        resourceChange: this.estimateResourceChange(metrics, applicableActions),
        cost:
          applicableActions.reduce((sum, a) => sum + (a.estimatedCost || 0), 0) *
          (direction === 'up' ? 1 : -1),
        duration:
          Math.max(...applicableActions.map((a) => a.estimatedDuration)),
      },
      status: 'pending',
    };

    return decision;
  }

  /**
   * Find matching schedule
   */
  private findMatchingSchedule(): string | null {
    for (const [id, schedule] of this.schedules) {
      if (this.matchesSchedule(schedule)) {
        return id;
      }
    }
    return null;
  }

  /**
   * Determine scaling direction based on schedule
   */
  private determineDirection(
    scheduleId: string,
    metrics: ResourceMetrics
  ): ScalingDirection {
    // Business hours: scale up
    if (scheduleId === 'business_hours') {
      return ScalingDirection.UP;
    }

    // Peak traffic: scale up
    if (scheduleId === 'peak_traffic') {
      return ScalingDirection.UP;
    }

    // Night: scale down
    if (scheduleId === 'night') {
      return ScalingDirection.DOWN;
    }

    // Default: scale up
    return ScalingDirection.UP;
  }

  /**
   * Estimate resource change from actions
   */
  private estimateResourceChange(
    metrics: ResourceMetrics,
    actions: any[]
  ): ResourceMetrics {
    const result = JSON.parse(JSON.stringify(metrics)) as ResourceMetrics;

    for (const action of actions) {
      switch (action.type) {
        case 'spawn_agents':
          result.agents.total += action.magnitude;
          result.agents.active += action.magnitude;
          break;
        case 'despawn_agents':
          result.agents.total = Math.max(
            result.agents.total - action.magnitude,
            0
          );
          result.agents.active = Math.max(
            result.agents.active - action.magnitude,
            0
          );
          break;
        case 'expand_kv_cache':
          if (result.kvCache) {
            result.kvCache.totalSize += action.magnitude;
          }
          break;
        case 'shrink_kv_cache':
          if (result.kvCache) {
            result.kvCache.totalSize = Math.max(
              result.kvCache.totalSize - action.magnitude,
              0
            );
          }
          break;
      }
    }

    return result;
  }
}
