/**
 * useClawStats Hook
 *
 * React hook for aggregated Claw statistics and metrics
 *
 * @packageDocumentation
 */

import { useMemo } from 'react';

// Local enum definition
enum ClawState {
  DORMANT = 'DORMANT',
  THINKING = 'THINKING',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  POSTED = 'POSTED',
  ARCHIVED = 'ARCHIVED',
  ERROR = 'ERROR'
}

/**
 * Individual claw stats
 */
export interface ClawStatsData {
  clawId: string;
  name: string;
  executions: number;
  successes: number;
  failures: number;
  avgExecutionTime: number;
  state: ClawState;
  lastUpdated: number;
}

/**
 * Aggregated statistics
 */
export interface AggregatedStats {
  /** Total number of claws */
  total: number;

  /** Number of active claws (thinking) */
  active: number;

  /** Number of idle claws */
  idle: number;

  /** Number of claws with errors */
  error: number;

  /** Number of claws needing review */
  needsReview: number;

  /** Total executions across all claws */
  totalExecutions: number;

  /** Total successes across all claws */
  totalSuccesses: number;

  /** Total failures across all claws */
  totalFailures: number;

  /** Overall success rate (0-100) */
  successRate: number;

  /** Average execution time across all claws (ms) */
  avgExecutionTime: number;

  /** Most active claw */
  mostActive: ClawStatsData | null;

  /** Most reliable claw (highest success rate) */
  mostReliable: ClawStatsData | null;

  /** State distribution */
  stateDistribution: Record<ClawState, number>;
}

/**
 * Time-based stats
 */
export interface TimeBasedStats {
  /** Stats from last hour */
  lastHour: {
    executions: number;
    successes: number;
    failures: number;
    avgTime: number;
  };

  /** Stats from last 24 hours */
  last24Hours: {
    executions: number;
    successes: number;
    failures: number;
    avgTime: number;
  };

  /** Stats from last 7 days */
  last7Days: {
    executions: number;
    successes: number;
    failures: number;
    avgTime: number;
  };
}

/**
 * Hook configuration
 */
export interface UseClawStatsConfig {
  /** Array of claw stats data */
  claws: ClawStatsData[];

  /** Include time-based stats (default: false) */
  includeTimeStats?: boolean;
}

/**
 * Hook return type
 */
export interface UseClawStatsReturn {
  /** Aggregated statistics */
  aggregated: AggregatedStats;

  /** Time-based statistics */
  timeBased: TimeBasedStats | null;

  /** Calculate stats for a subset of claws */
  calculateSubset: (filter: (claw: ClawStatsData) => boolean) => AggregatedStats;

  /** Get top N claws by executions */
  getTopByExecutions: (n: number) => ClawStatsData[];

  /** Get top N claws by success rate */
  getTopBySuccessRate: (n: number) => ClawStatsData[];

  /** Get claws with errors */
  getClawsWithErrors: () => ClawStatsData[];

  /** Get claws needing review */
  getClawsNeedingReview: () => ClawStatsData[];
}

/**
 * Calculate aggregated stats from claw data
 */
function calculateAggregatedStats(claws: ClawStatsData[]): AggregatedStats {
  const total = claws.length;

  if (total === 0) {
    return {
      total: 0,
      active: 0,
      idle: 0,
      error: 0,
      needsReview: 0,
      totalExecutions: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      successRate: 0,
      avgExecutionTime: 0,
      mostActive: null,
      mostReliable: null,
      stateDistribution: {
        [ClawState.DORMANT]: 0,
        [ClawState.THINKING]: 0,
        [ClawState.NEEDS_REVIEW]: 0,
        [ClawState.POSTED]: 0,
        [ClawState.ARCHIVED]: 0,
        [ClawState.ERROR]: 0
      }
    };
  }

  let totalExecutions = 0;
  let totalSuccesses = 0;
  let totalFailures = 0;
  let totalTime = 0;
  let timeCount = 0;
  let mostActive: ClawStatsData | null = null;
  let mostReliable: ClawStatsData | null = null;
  let highestReliability = 0;

  const stateDistribution: Record<ClawState, number> = {
    [ClawState.DORMANT]: 0,
    [ClawState.THINKING]: 0,
    [ClawState.NEEDS_REVIEW]: 0,
    [ClawState.POSTED]: 0,
    [ClawState.ARCHIVED]: 0,
    [ClawState.ERROR]: 0
  };

  claws.forEach(claw => {
    totalExecutions += claw.executions;
    totalSuccesses += claw.successes;
    totalFailures += claw.failures;

    if (claw.avgExecutionTime > 0) {
      totalTime += claw.avgExecutionTime;
      timeCount++;
    }

    // Track state distribution
    stateDistribution[claw.state] = (stateDistribution[claw.state] || 0) + 1;

    // Track most active
    if (!mostActive || claw.executions > mostActive.executions) {
      mostActive = claw;
    }

    // Track most reliable (min 5 executions)
    if (claw.executions >= 5) {
      const reliability = claw.executions > 0
        ? claw.successes / claw.executions
        : 0;

      if (reliability > highestReliability) {
        highestReliability = reliability;
        mostReliable = claw;
      }
    }
  });

  const successRate = totalExecutions > 0
    ? (totalSuccesses / totalExecutions) * 100
    : 0;

  const avgExecutionTime = timeCount > 0
    ? totalTime / timeCount
    : 0;

  return {
    total,
    active: stateDistribution[ClawState.THINKING] || 0,
    idle: stateDistribution[ClawState.DORMANT] || 0,
    error: stateDistribution[ClawState.ERROR] || 0,
    needsReview: stateDistribution[ClawState.NEEDS_REVIEW] || 0,
    totalExecutions,
    totalSuccesses,
    totalFailures,
    successRate,
    avgExecutionTime,
    mostActive,
    mostReliable,
    stateDistribution
  };
}

/**
 * Calculate time-based stats (mock implementation)
 */
function calculateTimeBasedStats(): TimeBasedStats {
  // In a real implementation, this would filter by timestamp
  return {
    lastHour: {
      executions: 0,
      successes: 0,
      failures: 0,
      avgTime: 0
    },
    last24Hours: {
      executions: 0,
      successes: 0,
      failures: 0,
      avgTime: 0
    },
    last7Days: {
      executions: 0,
      successes: 0,
      failures: 0,
      avgTime: 0
    }
  };
}

/**
 * useClawStats Hook
 *
 * Provides aggregated statistics and metrics for Claw agents
 *
 * @example
 * ```tsx
 * const { aggregated, getTopByExecutions } = useClawStats({
 *   claws: clawDataArray
 * });
 *
 * console.log(`Total agents: ${aggregated.total}`);
 * console.log(`Success rate: ${aggregated.successRate}%`);
 * ```
 */
export function useClawStats(config: UseClawStatsConfig): UseClawStatsReturn {
  const { claws, includeTimeStats = false } = config;

  // Calculate aggregated stats
  const aggregated = useMemo(() => {
    return calculateAggregatedStats(claws);
  }, [claws]);

  // Calculate time-based stats
  const timeBased = useMemo(() => {
    if (!includeTimeStats) {
      return null;
    }
    return calculateTimeBasedStats();
  }, [includeTimeStats]);

  // Calculate subset stats
  const calculateSubset = useMemo(() => {
    return (filter: (claw: ClawStatsData) => boolean) => {
      const filtered = claws.filter(filter);
      return calculateAggregatedStats(filtered);
    };
  }, [claws]);

  // Get top by executions
  const getTopByExecutions = useMemo(() => {
    return (n: number) => {
      return [...claws]
        .sort((a, b) => b.executions - a.executions)
        .slice(0, n);
    };
  }, [claws]);

  // Get top by success rate
  const getTopBySuccessRate = useMemo(() => {
    return (n: number) => {
      return [...claws]
        .filter(c => c.executions >= 5) // Min 5 executions
        .sort((a, b) => {
          const rateA = a.executions > 0 ? a.successes / a.executions : 0;
          const rateB = b.executions > 0 ? b.successes / b.executions : 0;
          return rateB - rateA;
        })
        .slice(0, n);
    };
  }, [claws]);

  // Get claws with errors
  const getClawsWithErrors = useMemo(() => {
    return () => claws.filter(c => c.state === ClawState.ERROR);
  }, [claws]);

  // Get claws needing review
  const getClawsNeedingReview = useMemo(() => {
    return () => claws.filter(c => c.state === ClawState.NEEDS_REVIEW);
  }, [claws]);

  return {
    aggregated,
    timeBased,
    calculateSubset,
    getTopByExecutions,
    getTopBySuccessRate,
    getClawsWithErrors,
    getClawsNeedingReview
  };
}

export default useClawStats;
