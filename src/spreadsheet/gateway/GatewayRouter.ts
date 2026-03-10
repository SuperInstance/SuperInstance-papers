/**
 * POLLN Gateway Router
 * Dynamic routing and request matching for API gateway
 */

import { randomUUID } from 'crypto';
import type {
  GatewayRoute,
  GatewayRequest,
  GatewayResponse,
  RouteMatch,
  Middleware,
  UpstreamConfig
} from './types.js';

/**
 * Route entry with compiled pattern
 */
interface CompiledRoute {
  route: GatewayRoute;
  pattern: RegExp;
  paramNames: string[];
}

/**
 * Router configuration
 */
export interface RouterConfig {
  caseSensitive?: boolean;
  strictTrailingSlash?: boolean;
  priority?: 'path' | 'method';
}

/**
 * Gateway Router Class
 */
export class GatewayRouter {
  private routes: CompiledRoute[] = [];
  private config: Required<RouterConfig>;
  private middleware: Middleware[] = [];

  constructor(config: RouterConfig = {}) {
    this.config = {
      caseSensitive: config.caseSensitive ?? true,
      strictTrailingSlash: config.strictTrailingSlash ?? false,
      priority: config.priority ?? 'path'
    };
  }

  /**
   * Add route to router
   */
  addRoute(route: GatewayRoute): void {
    const { pattern, paramNames } = this.compilePattern(route.path);
    this.routes.push({ route, pattern, paramNames });

    // Sort routes by priority
    this.sortRoutes();
  }

  /**
   * Remove route from router
   */
  removeRoute(routeId: string): boolean {
    const before = this.routes.length;
    this.routes = this.routes.filter(r => r.route.id !== routeId);
    return this.routes.length < before;
  }

  /**
   * Add middleware
   */
  use(middleware: Middleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Match incoming request to route
   */
  async match(request: GatewayRequest): Promise<RouteMatch | null> {
    const url = new URL(request.url);
    const path = url.pathname;

    for (const compiled of this.routes) {
      const match = this.matchPath(compiled, path, request.method);
      if (match) {
        return {
          route: compiled.route,
          params: match.params,
          queryParams: Object.fromEntries(url.searchParams.entries()),
          path
        };
      }
    }

    return null;
  }

  /**
   * Handle request through middleware and route
   */
  async handle(request: GatewayRequest): Promise<GatewayResponse> {
    // Run global middleware
    let modifiedRequest = request;
    for (const mw of this.middleware) {
      const result = await mw(modifiedRequest);
      if (result) {
        modifiedRequest = result;
      }
    }

    // Find matching route
    const match = await this.match(modifiedRequest);

    if (!match) {
      return {
        status: 404,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Not Found' }),
        duration: 0
      };
    }

    // Run route-specific middleware
    for (const mw of match.route.middleware || []) {
      const result = await mw(modifiedRequest);
      if (result) {
        modifiedRequest = result;
      }
    }

    // Return match info (actual proxying done by GatewayServer)
    return {
      status: 200,
      headers: {},
      body: '',
      duration: 0,
      _match: match
    };
  }

  /**
   * Get all routes
   */
  getRoutes(): GatewayRoute[] {
    return this.routes.map(r => ({ ...r.route }));
  }

  /**
   * Get route by ID
   */
  getRoute(routeId: string): GatewayRoute | undefined {
    return this.routes.find(r => r.route.id === routeId)?.route;
  }

  /**
   * Update route
   */
  updateRoute(routeId: string, updates: Partial<GatewayRoute>): boolean {
    const index = this.routes.findIndex(r => r.route.id === routeId);
    if (index === -1) return false;

    this.routes[index].route = {
      ...this.routes[index].route,
      ...updates
    };

    return true;
  }

  /**
   * Enable/disable route
   */
  setRouteEnabled(routeId: string, enabled: boolean): boolean {
    return this.updateRoute(routeId, { enabled });
  }

  /**
   * Compile path pattern to regex
   */
  private compilePattern(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];

    // Convert path parameters to named capture groups
    // /users/:id -> /users/(?<id>[^/]+)
    // /files/*path -> /files/(?<path>.*)
    let patternStr = path
      .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
        paramNames.push(name);
        return '(?<' + name + '>[^/]+)';
      })
      .replace(/\*([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
        paramNames.push(name);
        return '(?<' + name + '>.*)';
      });

    // Add strict trailing slash handling
    if (!this.config.strictTrailingSlash) {
      patternStr = patternStr.replace(/\/+$/, '') + '/?';
    }

    // Add start and end anchors
    patternStr = '^' + patternStr + '$';

    const flags = this.config.caseSensitive ? '' : 'i';
    return {
      pattern: new RegExp(patternStr, flags),
      paramNames
    };
  }

  /**
   * Match path against compiled pattern
   */
  private matchPath(
    compiled: CompiledRoute,
    path: string,
    method: string
  ): { params: Record<string, string> } | null {
    // Check method
    if (!compiled.route.methods.includes(method as any)) {
      return null;
    }

    // Check if route is enabled
    if (compiled.route.enabled === false) {
      return null;
    }

    // Match path
    const match = path.match(compiled.pattern);
    if (!match) {
      return null;
    }

    // Extract named parameters
    const params: Record<string, string> = {};
    if (match.groups) {
      for (const name of compiled.paramNames) {
        params[name] = match.groups[name];
      }
    }

    return { params };
  }

  /**
   * Sort routes by priority
   */
  private sortRoutes(): void {
    this.routes.sort((a, b) => {
      // More specific paths (with more segments) first
      const aSegments = a.route.path.split('/').filter(Boolean).length;
      const bSegments = b.route.path.split('/').filter(Boolean).length;

      if (aSegments !== bSegments) {
        return bSegments - aSegments;
      }

      // Then by priority setting
      if (this.config.priority === 'method') {
        const aPriority = this.getMethodPriority(a.route.methods[0]);
        const bPriority = this.getMethodPriority(b.route.methods[0]);
        return aPriority - bPriority;
      }

      return 0;
    });
  }

  /**
   * Get method priority for sorting
   */
  private getMethodPriority(method: string): number {
    const priorities: Record<string, number> = {
      'GET': 1,
      'HEAD': 2,
      'POST': 3,
      'PUT': 4,
      'PATCH': 5,
      'DELETE': 6,
      'OPTIONS': 7,
      'CONNECT': 8,
      'TRACE': 9
    };
    return priorities[method] || 10;
  }
}

/**
 * Route builder helper
 */
export class RouteBuilder {
  private route: Partial<GatewayRoute> = {
    id: randomUUID(),
    enabled: true,
    methods: ['GET'],
    middleware: [],
    timeout: 30000
  };

  static create(path: string): RouteBuilder {
    return new RouteBuilder().path(path);
  }

  path(path: string): this {
    this.route.path = path;
    return this;
  }

  id(id: string): this {
    this.route.id = id;
    return this;
  }

  methods(...methods: Array<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>): this {
    this.route.methods = methods;
    return this;
  }

  upstream(upstream: UpstreamConfig): this {
    this.route.upstream = upstream;
    return this;
  }

  to(host: string, port: number, protocol: 'http' | 'https' = 'http'): this {
    this.route.upstream = {
      host,
      port,
      protocol,
      path: '/'
    };
    return this;
  }

  enabled(enabled: boolean): this {
    this.route.enabled = enabled;
    return this;
  }

  timeout(ms: number): this {
    this.route.timeout = ms;
    return this;
  }

  addMiddleware(middleware: Middleware): this {
    if (!this.route.middleware) {
      this.route.middleware = [];
    }
    this.route.middleware.push(middleware);
    return this;
  }

  stripPrefix(strip: boolean): this {
    this.route.stripPrefix = strip;
    return this;
  }

  build(): GatewayRoute {
    if (!this.route.path || !this.route.upstream) {
      throw new Error('Route must have path and upstream');
    }
    return this.route as GatewayRoute;
  }
}

/**
 * Predefined routes for common services
 */
export class CommonRoutes {
  static healthCheck(routePath: string = '/health'): GatewayRoute {
    return RouteBuilder.create(routePath)
      .id('health-check')
      .methods('GET')
      .to('localhost', 3000)
      .timeout(5000)
      .build();
  }

  static apiProxy(apiPath: string, backendHost: string, backendPort: number): GatewayRoute {
    return RouteBuilder.create(apiPath)
      .id(`api-proxy-${backendPort}`)
      .methods('GET', 'POST', 'PUT', 'PATCH', 'DELETE')
      .to(backendHost, backendPort)
      .stripPrefix(true)
      .build();
  }

  static staticAssets(assetPath: string, assetHost: string, assetPort: number): GatewayRoute {
    return RouteBuilder.create(assetPath)
      .id(`static-assets-${assetPort}`)
      .methods('GET', 'HEAD')
      .to(assetHost, assetPort)
      .timeout(60000)
      .build();
  }

  static websocket(wsPath: string, wsHost: string, wsPort: number): GatewayRoute {
    return RouteBuilder.create(wsPath)
      .id(`websocket-${wsPort}`)
      .methods('GET')
      .to(wsHost, wsPort)
      .addMiddleware(async (req) => {
        // WebSocket upgrade check
        const headers = req.headers as Record<string, string>;
        if (headers['upgrade']?.toLowerCase() === 'websocket') {
          return req;
        }
        throw new Error('WebSocket upgrade required');
      })
      .build();
  }
}
