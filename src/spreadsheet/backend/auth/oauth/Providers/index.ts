/**
 * Provider Registry and Factory
 *
 * Exports all OAuth providers and provides factory methods
 */

export { GoogleProvider, type GoogleOAuthConfig, type GoogleUser } from './google';
export { GitHubProvider, type GitHubOAuthConfig, type GitHubUser, type GitHubEmail } from './github';
export { MicrosoftProvider, type MicrosoftOAuthConfig, type MicrosoftUser, type MicrosoftTokenResponse } from './microsoft';
export { CustomProvider, type CustomOAuthConfig, type CustomUser } from './CustomProvider';

import { GoogleProvider } from './google';
import { GitHubProvider } from './github';
import { MicrosoftProvider } from './microsoft';
import { CustomProvider } from './CustomProvider';

export type Provider = GoogleProvider | GitHubProvider | MicrosoftProvider | CustomProvider;

export type ProviderType = 'google' | 'github' | 'microsoft' | 'custom';

export interface ProviderConfig {
  type: ProviderType;
  config: any;
}

/**
 * Provider Factory
 */
export class ProviderFactory {
  private static providers = new Map<string, Provider>();

  /**
   * Register a provider instance
   */
  static register(id: string, provider: Provider): void {
    this.providers.set(id, provider);
  }

  /**
   * Get a registered provider
   */
  static get(id: string): Provider | undefined {
    return this.providers.get(id);
  }

  /**
   * Create a new provider instance
   */
  static create(config: ProviderConfig): Provider {
    switch (config.type) {
      case 'google':
        return new GoogleProvider(config.config);
      case 'github':
        return new GitHubProvider(config.config);
      case 'microsoft':
        return new MicrosoftProvider(config.config);
      case 'custom':
        return new CustomProvider(config.config);
      default:
        throw new Error(`Unknown provider type: ${config.type}`);
    }
  }

  /**
   * Create and register a provider
   */
  static createAndRegister(id: string, config: ProviderConfig): Provider {
    const provider = this.create(config);
    this.register(id, provider);
    return provider;
  }

  /**
   * Get all registered providers
   */
  static getAll(): Map<string, Provider> {
    return this.providers;
  }

  /**
   * Check if provider exists
   */
  static has(id: string): boolean {
    return this.providers.has(id);
  }

  /**
   * Remove a provider
   */
  static remove(id: string): boolean {
    return this.providers.delete(id);
  }

  /**
   * Clear all providers
   */
  static clear(): void {
    this.providers.clear();
  }

  /**
   * Get provider info for all registered providers
   */
  static getAllProviderInfo(): Array<{ id: string; info: any }> {
    const result: Array<{ id: string; info: any }> = [];

    for (const [id, provider] of this.providers.entries()) {
      let info: any;

      if (provider instanceof GoogleProvider) {
        info = provider.getProviderInfo();
      } else if (provider instanceof GitHubProvider) {
        info = provider.getProviderInfo();
      } else if (provider instanceof MicrosoftProvider) {
        info = provider.getProviderInfo();
      } else if (provider instanceof CustomProvider) {
        info = provider.getProviderInfo();
      }

      result.push({ id, info });
    }

    return result;
  }
}
