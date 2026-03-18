/**
 * ClawClientManager - Singleton Client Management with Proper Disposal
 *
 * Phase 3: Enhanced singleton pattern with disposal mechanism
 * - Centralized client instance management
 * - Proper cleanup on dispose
 * - Re-creation after disposal
 * - Thread-safe operations
 *
 * @packageDocumentation
 * @version 3.0.0
 */

import { ClawClient, ClawClientConfig } from '@spreadsheet-moment/agent-core';

/**
 * Singleton manager for ClawClient instances
 *
 * This ensures that only one client instance exists per configuration
 * and provides proper disposal mechanism for cleanup.
 */
class ClawClientManager {
  private static instance: ClawClient | null = null;
  private static config: ClawClientConfig | null = null;

  /**
   * Get or create ClawClient singleton instance
   *
   * @param config - Optional configuration for new instance
   * @returns ClawClient instance or null if no configuration
   */
  static getClient(config?: ClawClientConfig): ClawClient | null {
    const apiUrl = process.env.CLAW_API_URL;
    const wsUrl = process.env.CLAW_WS_URL;
    const apiKey = process.env.CLAW_API_KEY;

    // No API URL configured - return null for local-only mode
    if (!apiUrl) {
      return null;
    }

    // Build configuration
    const clientConfig: ClawClientConfig = config || {
      baseUrl: apiUrl,
      wsUrl: wsUrl || apiUrl.replace('http', 'ws'),
      apiKey: apiKey,
      timeout: parseInt(process.env.CLAW_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.CLAW_MAX_RETRIES || '3'),
      enableWebSocket: false,
      debug: process.env.CLAW_DEBUG === 'true'
    };

    // Check if we need to create a new instance
    if (!this.instance) {
      this.config = clientConfig;
      this.instance = new ClawClient(clientConfig);
      return this.instance;
    }

    // Check if configuration has changed significantly
    if (this.hasConfigChanged(clientConfig)) {
      // Dispose old instance and create new one
      this.dispose();
      this.config = clientConfig;
      this.instance = new ClawClient(clientConfig);
    }

    return this.instance;
  }

  /**
   * Check if configuration has changed
   */
  private static hasConfigChanged(newConfig: ClawClientConfig): boolean {
    if (!this.config) {
      return true;
    }

    return (
      this.config.baseUrl !== newConfig.baseUrl ||
      this.config.wsUrl !== newConfig.wsUrl ||
      this.config.apiKey !== newConfig.apiKey
    );
  }

  /**
   * Dispose of the current ClawClient instance
   *
   * This should be called when the spreadsheet is closed or
   * when switching to a different environment.
   */
  static dispose(): void {
    if (this.instance) {
      this.instance.dispose();
      this.instance = null;
      this.config = null;
    }
  }

  /**
   * Check if client instance exists
   */
  static hasClient(): boolean {
    return this.instance !== null;
  }

  /**
   * Get current configuration
   */
  static getConfig(): ClawClientConfig | null {
    return this.config;
  }

  /**
   * Force re-create client instance
   *
   * Useful for testing or when you need to reset the connection
   */
  static reset(config?: ClawClientConfig): ClawClient | null {
    this.dispose();
    return this.getClient(config);
  }
}

export default ClawClientManager;
