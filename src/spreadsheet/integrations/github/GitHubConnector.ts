/**
 * POLLN GitHub Integration Connector
 *
 * Integrates POLLN cells with GitHub for repository operations,
 * issue/PR management, webhook handling, and Actions triggers.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  IntegrationConnector,
  IntegrationConfig,
  IntegrationType,
  ConnectionState,
  IntegrationResult,
  IntegrationError,
  HealthStatus,
  IntegrationMetrics,
  ErrorCode,
} from '../types.js';

// ============================================================================
// GitHub-Specific Types
// ============================================================================

export interface GitHubConfig extends IntegrationConfig {
  type: IntegrationType.GITHUB;
  credentials: {
    apiToken: string;
    webhookSecret?: string;
    appId?: number;
    installationId?: number;
    privateKey?: string;
  };
  options?: {
    baseUrl?: string;
    defaultOwner?: string;
    defaultRepo?: string;
  };
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    id: number;
  };
  private: boolean;
  description?: string;
  url: string;
  html_url: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  user: {
    login: string;
    id: number;
  };
  labels: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  assignees: Array<{
    login: string;
    id: number;
  }>;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  user: {
    login: string;
    id: number;
  };
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GitHubFile {
  sha: string;
  name: string;
  path: string;
  size: number;
  content?: string;
  encoding?: string;
  type: string;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  run_number: number;
  created_at: string;
  updated_at: string;
  html_url: string;
}

// ============================================================================
// GitHub API Client
// ============================================================================

class GitHubAPIClient {
  constructor(
    private apiToken: string,
    private baseUrl: string = 'https://api.github.com'
  ) {}

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'POLLN-Integration',
    };
  }

  async request(
    method: string,
    path: string,
    body?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const headers = this.getHeaders();

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }

    // Some endpoints return 204 No Content
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  }

  async get(path: string): Promise<any> {
    return this.request('GET', path);
  }

  async post(path: string, body: any): Promise<any> {
    return this.request('POST', path, body);
  }

  async put(path: string, body: any): Promise<any> {
    return this.request('PUT', path, body);
  }

  async patch(path: string, body: any): Promise<any> {
    return this.request('PATCH', path, body);
  }

  async delete(path: string): Promise<any> {
    return this.request('DELETE', path);
  }
}

// ============================================================================
// GitHub Connector
// ============================================================================

export class GitHubConnector extends EventEmitter implements IntegrationConnector {
  readonly id: string;
  readonly name: string;
  readonly type = IntegrationType.GITHUB;
  state: ConnectionState = ConnectionState.DISCONNECTED;

  private config: GitHubConfig;
  private apiClient: GitHubAPIClient;
  private metrics: IntegrationMetrics;
  private connectionTime: number = 0;

  // Rate limiting (GitHub API is 5000 requests/hour for authenticated)
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  private readonly rateLimitWindow = 3600000; // 1 hour
  private readonly maxRequestsPerWindow = 5000;

  constructor(config: GitHubConfig) {
    super();
    this.id = config.id;
    this.name = config.name;
    this.config = config;
    this.apiClient = new GitHubAPIClient(
      config.credentials.apiToken,
      config.options?.baseUrl
    );
    this.metrics = this.createEmptyMetrics();
  }

  // ========================================================================
  // Connector Interface Implementation
  // ========================================================================

  async initialize(config: IntegrationConfig): Promise<void> {
    this.config = config as GitHubConfig;
    this.apiClient = new GitHubAPIClient(
      this.config.credentials.apiToken,
      this.config.options?.baseUrl
    );
    this.state = ConnectionState.DISCONNECTED;
    this.emit('initialized', { timestamp: Date.now() });
  }

  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) {
      return;
    }

    this.state = ConnectionState.CONNECTING;

    try {
      // Test connection by getting user info
      await this.apiClient.get('/user');

      this.state = ConnectionState.CONNECTED;
      this.connectionTime = Date.now();

      this.emit('connected', {
        timestamp: Date.now(),
        connectionTime: this.connectionTime,
      });
    } catch (error) {
      this.state = ConnectionState.ERROR;
      throw this.createError(
        ErrorCode.UNAUTHORIZED,
        `Failed to connect to GitHub: ${error.message}`,
        error
      );
    }
  }

  async disconnect(): Promise<void> {
    this.state = ConnectionState.DISCONNECTED;
    this.connectionTime = 0;
    this.emit('disconnected', { timestamp: Date.now() });
  }

  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }

  async send(operation: string, data: any): Promise<IntegrationResult> {
    if (!this.isConnected()) {
      return this.errorResult(
        ErrorCode.CONNECTION_REFUSED,
        'Not connected to GitHub'
      );
    }

    // Rate limiting
    await this.checkRateLimit();

    const startTime = Date.now();

    try {
      let result: any;

      switch (operation) {
        case 'repo':
        case 'getRepository':
          result = await this.getRepository(data.owner, data.repo);
          break;

        case 'repos':
        case 'listRepositories':
          result = await this.listRepositories(data);
          break;

        case 'issue':
        case 'getIssue':
          result = await this.getIssue(data.owner, data.repo, data.issueNumber);
          break;

        case 'issues':
        case 'listIssues':
          result = await this.listIssues(data.owner, data.repo, data.filters);
          break;

        case 'createIssue':
          result = await this.createIssue(data.owner, data.repo, data);
          break;

        case 'updateIssue':
          result = await this.updateIssue(data.owner, data.repo, data.issueNumber, data);
          break;

        case 'closeIssue':
          result = await this.closeIssue(data.owner, data.repo, data.issueNumber);
          break;

        case 'pr':
        case 'getPullRequest':
          result = await this.getPullRequest(data.owner, data.repo, data.prNumber);
          break;

        case 'prs':
        case 'listPullRequests':
          result = await this.listPullRequests(data.owner, data.repo, data.filters);
          break;

        case 'createPR':
          result = await this.createPullRequest(data.owner, data.repo, data);
          break;

        case 'mergePR':
          result = await this.mergePullRequest(data.owner, data.repo, data.prNumber, data);
          break;

        case 'file':
        case 'getFile':
          result = await this.getFile(data.owner, data.repo, data.path, data.ref);
          break;

        case 'createFile':
          result = await this.createFile(data.owner, data.repo, data.path, data.content, data.message, data.branch);
          break;

        case 'updateFile':
          result = await this.updateFile(data.owner, data.repo, data.path, data.content, data.message, data.sha, data.branch);
          break;

        case 'deleteFile':
          result = await this.deleteFile(data.owner, data.repo, data.path, data.message, data.sha, data.branch);
          break;

        case 'workflow':
        case 'triggerWorkflow':
          result = await this.triggerWorkflow(data.owner, data.repo, data.workflow, data.ref, data.inputs);
          break;

        case 'run':
        case 'getWorkflowRun':
          result = await this.getWorkflowRun(data.owner, data.repo, data.runId);
          break;

        case 'runs':
        case 'listWorkflowRuns':
          result = await this.listWorkflowRuns(data.owner, data.repo, data.workflow);
          break;

        case 'comment':
        case 'createComment':
          result = await this.createComment(data.owner, data.repo, data.issueNumber, data.body);
          break;

        case 'webhook':
        case 'createWebhook':
          result = await this.createWebhook(data.owner, data.repo, data.url, data.events, data.secret);
          break;

        case 'branch':
        case 'createBranch':
          result = await this.createBranch(data.owner, data.repo, data.branch, data.from);
          break;

        default:
          return this.errorResult(
            ErrorCode.OPERATION_NOT_SUPPORTED,
            `Unsupported operation: ${operation}`
          );
      }

      const duration = Date.now() - startTime;
      this.recordSuccess(duration, 0, 0);

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: Date.now(),
          duration,
          retries: 0,
          requestId: this.generateRequestId(),
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordError(duration);

      return this.errorResult(
        this.mapErrorCode(error),
        error.message,
        error
      );
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const details: any = {
      connection: false,
      authentication: false,
      rateLimit: true,
      errors: [],
    };

    try {
      // Check connection
      details.connection = this.isConnected();

      // Check authentication
      try {
        await this.apiClient.get('/user');
        details.authentication = true;
      } catch (error) {
        details.authentication = false;
      }

      // Check rate limit status
      const now = Date.now();
      const inCurrentWindow =
        now - this.lastResetTime < this.rateLimitWindow;
      details.rateLimit =
        this.requestCount < this.maxRequestsPerWindow || !inCurrentWindow;

      return {
        status:
          details.connection && details.authentication ? 'healthy' : 'unhealthy',
        details,
        lastCheck: Date.now(),
      };
    } catch (error) {
      details.errors.push(error.message);
      return {
        status: 'unhealthy',
        details,
        lastCheck: Date.now(),
      };
    }
  }

  getMetrics(): IntegrationMetrics {
    return { ...this.metrics };
  }

  async dispose(): Promise<void> {
    await this.disconnect();
    this.removeAllListeners();
  }

  // ========================================================================
  // Repository Operations
  // ========================================================================

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return await this.apiClient.get(`/repos/${owner}/${repo}`);
  }

  async listRepositories(filters?: {
    type?: 'all' | 'owner' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    per_page?: number;
  }): Promise<GitHubRepository[]> {
    const params = new URLSearchParams(filters as any);
    return await this.apiClient.get(`/user/repos?${params}`);
  }

  // ========================================================================
  // Issue Operations
  // ========================================================================

  async getIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    return await this.apiClient.get(`/repos/${owner}/${repo}/issues/${issueNumber}`);
  }

  async listIssues(
    owner: string,
    repo: string,
    filters?: {
      state?: 'open' | 'closed' | 'all';
      labels?: string;
      sort?: 'created' | 'updated' | 'comments';
      direction?: 'asc' | 'desc';
      per_page?: number;
    }
  ): Promise<GitHubIssue[]> {
    const params = new URLSearchParams(filters as any);
    return await this.apiClient.get(`/repos/${owner}/${repo}/issues?${params}`);
  }

  async createIssue(
    owner: string,
    repo: string,
    data: {
      title: string;
      body?: string;
      labels?: string[];
      assignees?: string[];
    }
  ): Promise<GitHubIssue> {
    return await this.apiClient.post(`/repos/${owner}/${repo}/issues`, data);
  }

  async updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    data: {
      title?: string;
      body?: string;
      state?: 'open' | 'closed';
      labels?: string[];
      assignees?: string[];
    }
  ): Promise<GitHubIssue> {
    return await this.apiClient.patch(
      `/repos/${owner}/${repo}/issues/${issueNumber}`,
      data
    );
  }

  async closeIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    return await this.apiClient.patch(
      `/repos/${owner}/${repo}/issues/${issueNumber}`,
      { state: 'closed' }
    );
  }

  // ========================================================================
  // Pull Request Operations
  // ========================================================================

  async getPullRequest(owner: string, repo: string, prNumber: number): Promise<GitHubPullRequest> {
    return await this.apiClient.get(`/repos/${owner}/${repo}/pulls/${prNumber}`);
  }

  async listPullRequests(
    owner: string,
    repo: string,
    filters?: {
      state?: 'open' | 'closed' | 'all';
      sort?: 'created' | 'updated' | 'popularity' | 'long-running';
      direction?: 'asc' | 'desc';
      per_page?: number;
    }
  ): Promise<GitHubPullRequest[]> {
    const params = new URLSearchParams(filters as any);
    return await this.apiClient.get(`/repos/${owner}/${repo}/pulls?${params}`);
  }

  async createPullRequest(
    owner: string,
    repo: string,
    data: {
      title: string;
      body?: string;
      head: string;
      base: string;
    }
  ): Promise<GitHubPullRequest> {
    return await this.apiClient.post(`/repos/${owner}/${repo}/pulls`, data);
  }

  async mergePullRequest(
    owner: string,
    repo: string,
    prNumber: number,
    options?: {
      commitTitle?: string;
      commitMessage?: string;
      mergeMethod?: 'merge' | 'squash' | 'rebase';
    }
  ): Promise<any> {
    return await this.apiClient.put(
      `/repos/${owner}/${repo}/pulls/${prNumber}/merge`,
      options || {}
    );
  }

  // ========================================================================
  // File Operations
  // ========================================================================

  async getFile(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<GitHubFile> {
    const params = ref ? `?ref=${ref}` : '';
    return await this.apiClient.get(`/repos/${owner}/${repo}/contents/${path}${params}`);
  }

  async createFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch?: string
  ): Promise<GitHubFile> {
    const contentEncoded = Buffer.from(content).toString('base64');

    return await this.apiClient.put(`/repos/${owner}/${repo}/contents/${path}`, {
      message,
      content: contentEncoded,
      branch,
    });
  }

  async updateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha: string,
    branch?: string
  ): Promise<GitHubFile> {
    const contentEncoded = Buffer.from(content).toString('base64');

    return await this.apiClient.put(`/repos/${owner}/${repo}/contents/${path}`, {
      message,
      content: contentEncoded,
      sha,
      branch,
    });
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    sha: string,
    branch?: string
  ): Promise<any> {
    return await this.apiClient.delete(`/repos/${owner}/${repo}/contents/${path}?sha=${sha}&message=${encodeURIComponent(message)}${branch ? `&branch=${branch}` : ''}`);
  }

  // ========================================================================
  // Workflow Operations
  // ========================================================================

  async triggerWorkflow(
    owner: string,
    repo: string,
    workflow: string,
    ref: string,
    inputs?: Record<string, any>
  ): Promise<any> {
    return await this.apiClient.post(
      `/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`,
      { ref, inputs }
    );
  }

  async getWorkflowRun(owner: string, repo: string, runId: number): Promise<GitHubWorkflowRun> {
    return await this.apiClient.get(`/repos/${owner}/${repo}/actions/runs/${runId}`);
  }

  async listWorkflowRuns(
    owner: string,
    repo: string,
    workflow?: string
  ): Promise<GitHubWorkflowRun[]> {
    const path = workflow
      ? `/repos/${owner}/${repo}/actions/workflows/${workflow}/runs`
      : `/repos/${owner}/${repo}/actions/runs`;
    const result = await this.apiClient.get(path);
    return result.workflow_runs;
  }

  // ========================================================================
  // Comment Operations
  // ========================================================================

  async createComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string
  ): Promise<any> {
    return await this.apiClient.post(
      `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      { body }
    );
  }

  // ========================================================================
  // Webhook Operations
  // ========================================================================

  async createWebhook(
    owner: string,
    repo: string,
    url: string,
    events: string[],
    secret?: string
  ): Promise<any> {
    return await this.apiClient.post(`/repos/${owner}/${repo}/hooks`, {
      name: 'web',
      config: {
        url,
        content_type: 'json',
        secret,
        insecure_ssl: '0',
      },
      events,
      active: true,
    });
  }

  // ========================================================================
  // Branch Operations
  // ========================================================================

  async createBranch(
    owner: string,
    repo: string,
    branch: string,
    from: string
  ): Promise<any> {
    // Get the SHA of the ref to branch from
    const refData = await this.apiClient.get(`/repos/${owner}/${repo}/git/refs/${from}`);

    return await this.apiClient.post(`/repos/${owner}/${repo}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha: refData.object.sha,
    });
  }

  // ========================================================================
  // Webhook Signature Verification
  // ========================================================================

  /**
   * Verify GitHub webhook signature
   */
  static verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const signatureBuffer = Buffer.from(signature, 'utf8');
    const keyBuffer = Buffer.from(secret, 'utf8');

    const hmac = crypto.createHmac('sha256', keyBuffer);
    const digest = hmac.update(payload).digest('base64');
    const digestBuffer = Buffer.from(`sha256=${digest}`, 'utf8');

    return crypto.timingSafeEqual(signatureBuffer, digestBuffer);
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset counters if new window
    if (now - this.lastResetTime >= this.rateLimitWindow) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    this.requestCount++;

    // GitHub will return 403 if we exceed the limit
    // For now, just emit a warning if we're getting close
    if (this.requestCount > this.maxRequestsPerWindow * 0.9) {
      this.emit('warning', {
        message: 'Approaching GitHub rate limit',
        requestsRemaining: this.maxRequestsPerWindow - this.requestCount,
        timestamp: Date.now(),
      });
    }
  }

  private createEmptyMetrics(): IntegrationMetrics {
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageDuration: 0,
      bytesSent: 0,
      bytesReceived: 0,
      rateLimitHits: 0,
      retryAttempts: 0,
      uptime: 100,
    };
  }

  private recordSuccess(duration: number, bytesSent: number, bytesReceived: number): void {
    this.metrics.totalOperations++;
    this.metrics.successfulOperations++;
    this.metrics.bytesSent += bytesSent;
    this.metrics.bytesReceived += bytesReceived;

    const totalDuration =
      this.metrics.averageDuration * (this.metrics.totalOperations - 1) + duration;
    this.metrics.averageDuration = totalDuration / this.metrics.totalOperations;
  }

  private recordError(duration: number): void {
    this.metrics.totalOperations++;
    this.metrics.failedOperations++;

    const totalDuration =
      this.metrics.averageDuration * (this.metrics.totalOperations - 1) + duration;
    this.metrics.averageDuration = totalDuration / this.metrics.totalOperations;
  }

  private errorResult(
    code: ErrorCode,
    message: string,
    cause?: Error
  ): IntegrationResult {
    return {
      success: false,
      error: this.createError(code, message, cause),
      metadata: {
        timestamp: Date.now(),
        duration: 0,
        retries: 0,
      },
    };
  }

  private createError(
    code: ErrorCode,
    message: string,
    cause?: Error
  ): IntegrationError {
    return {
      code,
      message,
      cause,
      retryable: this.isRetryable(code),
      retryDelay: this.calculateRetryDelay(code),
    };
  }

  private mapErrorCode(error: any): ErrorCode {
    const message = error.message?.toLowerCase() || '';

    if (message.includes('token') || message.includes('auth') || message.includes('401')) {
      return ErrorCode.UNAUTHORIZED;
    }
    if (message.includes('rate limit') || message.includes('403')) {
      return ErrorCode.RATE_LIMITED;
    }
    if (message.includes('not found') || message.includes('404')) {
      return ErrorCode.NOT_FOUND;
    }
    if (message.includes('timeout')) {
      return ErrorCode.TIMEOUT;
    }

    return ErrorCode.INTERNAL_ERROR;
  }

  private isRetryable(code: ErrorCode): boolean {
    return [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT,
      ErrorCode.RATE_LIMITED,
      ErrorCode.SERVICE_UNAVAILABLE,
    ].includes(code);
  }

  private calculateRetryDelay(code: ErrorCode): number {
    switch (code) {
      case ErrorCode.RATE_LIMITED:
        return 60000; // 1 minute
      case ErrorCode.TIMEOUT:
      case ErrorCode.NETWORK_ERROR:
        return 5000; // 5 seconds
      default:
        return 1000; // 1 second
    }
  }

  private generateRequestId(): string {
    return `github_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
