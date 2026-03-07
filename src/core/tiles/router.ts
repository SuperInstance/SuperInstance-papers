/**
 * POLLN Router Tile
 *
 * Routes inputs to different sub-tiles based on learned patterns
 */

import { v4 } from 'uuid';
import {
  BaseTile,
  TileCategory,
  TileConfig,
  TileContext,
  TileResult,
  PollenGrain,
} from '../tile.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Route definition
 */
export interface Route {
  id: string;
  name: string;
  pattern: RegExp | ((input: unknown) => boolean);
  priority: number;
}

/**
 * Router tile configuration
 */
export interface RouterTileConfig extends TileConfig {
  routes: Route[];
  defaultRoute?: string;
  learningEnabled?: boolean;
}

// ============================================================================
// ROUTER TILE
// ============================================================================

/**
 * RouterTile - Routes inputs to appropriate sub-tiles
 *
 * Features:
 * - Pattern-based routing
 * - Learned routing preferences
 * - Fallback to default route
 * - Performance-based route adjustment
 */
export class RouterTile extends BaseTile<unknown, { route: string; result: unknown }> {
  private routes: Map<string, Route> = new Map();
  private routeStats: Map<string, { successes: number; failures: number }> = new Map();
  private defaultRoute: string | null;
  private learningEnabled: boolean;

  constructor(config: RouterTileConfig) {
    super({
      ...config,
      name: config.name || 'router',
      category: config.category ?? TileCategory.ROLE,
    });

    this.defaultRoute = config.defaultRoute ?? null;
    this.learningEnabled = config.learningEnabled ?? true;

    // Initialize routes
    for (const route of config.routes) {
      this.addRoute(route);
    }
  }

  /**
   * Add a new route
   */
  addRoute(route: Route): void {
    this.routes.set(route.id, route);
    this.routeStats.set(route.id, { successes: 0, failures: 0 });

    // Set as default if first route
    if (this.routes.size === 1) {
      this.defaultRoute = route.id;
    }
  }

  /**
   * Remove a route
   */
  removeRoute(routeId: string): boolean {
    const deleted = this.routes.delete(routeId);
    this.routeStats.delete(routeId);

    // Update default if needed
    if (this.defaultRoute === routeId) {
      this.defaultRoute = this.routes.keys().next().value ?? null;
    }

    return deleted;
  }

  /**
   * Execute routing logic
   */
  async execute(
    input: unknown,
    context: TileContext
  ): Promise<TileResult<{ route: string; result: unknown }>> {
    const startTime = Date.now();

    // Select route using pattern matching and learned preferences
    const selectedRoute = this.selectRoute(input, context);

    if (!selectedRoute) {
      return {
        output: { route: 'none', result: null },
        success: false,
        confidence: 0,
        executionTimeMs: Date.now() - startTime,
        energyUsed: 0,
        observations: [],
      };
    }

    // Execute the route (in real implementation, would call sub-tile)
    const result = await this.executeRoute(selectedRoute, input, context);

    // Calculate confidence based on route match quality
    const confidence = this.calculateRouteConfidence(selectedRoute, input);

    // Update route stats
    this.updateRouteStats(selectedRoute.id, result.success);

    return {
      output: {
        route: selectedRoute.id,
        result: result.output,
      },
      success: result.success,
      confidence,
      executionTimeMs: Date.now() - startTime,
      energyUsed: 1,
      observations: [],
    };
  }

  /**
   * Select the best route for the input
   */
  private selectRoute(input: unknown, context: TileContext): Route | null {
    const candidates: Array<{ route: Route; score: number }> = [];

    for (const route of this.routes.values()) {
      // Check if pattern matches
      const matches = this.matchesPattern(route.pattern, input);

      if (matches) {
        // Calculate score based on priority and performance
        const stats = this.routeStats.get(route.id)!;
        const total = stats.successes + stats.failures;
        const successRate = total > 0 ? stats.successes / total : 0.5;

        const score = route.priority * 0.5 + successRate * 0.5;
        candidates.push({ route, score });
      }
    }

    if (candidates.length === 0) {
      // Fall back to default route
      if (this.defaultRoute) {
        return this.routes.get(this.defaultRoute) ?? null;
      }
      return null;
    }

    // Sort by score and apply Plinko-style selection
    candidates.sort((a, b) => b.score - a.score);

    // Use variant selection for exploration
    const temperature = context.temperature ?? 1.0;
    if (temperature > 0.1 && candidates.length > 1) {
      // Add Gumbel noise for exploration
      const gumbelNoise = candidates.map(() =>
        -Math.log(-Math.log(Math.random()))
      );
      const scores = candidates.map((c, i) =>
        c.score + temperature * gumbelNoise[i]
      );
      const selectedIndex = scores.indexOf(Math.max(...scores));
      return candidates[selectedIndex].route;
    }

    return candidates[0].route;
  }

  /**
   * Check if input matches a pattern
   */
  private matchesPattern(pattern: Route['pattern'], input: unknown): boolean {
    if (typeof pattern === 'function') {
      return pattern(input);
    }

    // RegExp pattern - convert input to string
    const inputStr = typeof input === 'string'
      ? input
      : JSON.stringify(input);

    return pattern.test(inputStr);
  }

  /**
   * Execute the selected route
   */
  private async executeRoute(
    route: Route,
    input: unknown,
    _context: TileContext
  ): Promise<{ success: boolean; output: unknown }> {
    // In real implementation, would route to actual sub-tile
    // For now, return success
    return {
      success: true,
      output: { routed: true, via: route.name },
    };
  }

  /**
   * Calculate confidence in route selection
   */
  private calculateRouteConfidence(route: Route, input: unknown): number {
    const stats = this.routeStats.get(route.id)!;
    const total = stats.successes + stats.failures;

    if (total === 0) return 0.5;

    const successRate = stats.successes / total;
    const sampleConfidence = Math.min(1, total / 10); // More confident with more samples

    return successRate * sampleConfidence + 0.5 * (1 - sampleConfidence);
  }

  /**
   * Update route statistics
   */
  private updateRouteStats(routeId: string, success: boolean): void {
    const stats = this.routeStats.get(routeId);
    if (stats) {
      if (success) {
        stats.successes++;
      } else {
        stats.failures++;
      }
    }
  }

  /**
   * Deserialize from pollen grain
   */
  static deserialize(grain: PollenGrain): RouterTile {
    const configData = grain.config ?? {};

    const routesData = (configData['routes'] as Array<{
      id: string;
      name: string;
      pattern: string;
      priority: number;
    }>) ?? [];

    const routes: Route[] = routesData.map(r => ({
      id: r.id,
      name: r.name,
      pattern: new RegExp(r.pattern),
      priority: r.priority,
    }));

    const config: RouterTileConfig = {
      id: grain.tileId,
      name: grain.tileName,
      category: grain.category,
      routes,
      defaultRoute: configData['defaultRoute'] as string | undefined,
      initialWeights: grain.weights,
    };

    const tile = new RouterTile(config);

    // Restore route stats
    const statsData = configData['routeStats'] as Record<string, { successes: number; failures: number }>;
    if (statsData) {
      for (const [id, stats] of Object.entries(statsData)) {
        tile.routeStats.set(id, stats);
      }
    }

    return tile;
  }

  /**
   * Override serialization
   */
  override serialize(): PollenGrain {
    const grain = super.serialize();

    // Serialize routes
    const routesData = Array.from(this.routes.values()).map(r => ({
      id: r.id,
      name: r.name,
      pattern: r.pattern instanceof RegExp ? r.pattern.source : 'custom',
      priority: r.priority,
    }));

    // Serialize stats
    const statsData: Record<string, { successes: number; failures: number }> = {};
    for (const [id, stats] of this.routeStats) {
      statsData[id] = stats;
    }

    grain.config = {
      routes: routesData,
      routeStats: statsData,
      defaultRoute: this.defaultRoute,
    };

    return grain;
  }

  /**
   * Get route statistics
   */
  getRouteStats(): Map<string, { successes: number; failures: number; successRate: number }> {
    const result = new Map();
    for (const [id, stats] of this.routeStats) {
      const total = stats.successes + stats.failures;
      result.set(id, {
        ...stats,
        successRate: total > 0 ? stats.successes / total : 0,
      });
    }
    return result;
  }
}
