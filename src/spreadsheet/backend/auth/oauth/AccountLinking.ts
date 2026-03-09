/**
 * Account Linking Service
 *
 * Manages linking multiple OAuth providers to a single user account:
 * - Link providers to existing accounts
 * - Prevent account duplication
 * - Provider management
 * - Unlink functionality
 */

import { OAuthManager } from './OAuthManager';
import { ProviderType } from './Providers';

export interface LinkedAccount {
  id: string;
  provider: ProviderType;
  providerUserId: string;
  email: string;
  name: string;
  picture?: string;
  linkedAt: number;
  lastUsed: number;
}

export interface UserAccount {
  id: string;
  primaryProvider: ProviderType;
  primaryAccountId: string;
  email: string;
  name: string;
  picture?: string;
  linkedAccounts: LinkedAccount[];
  createdAt: number;
  updatedAt: number;
}

export interface LinkRequest {
  userId: string;
  provider: ProviderType;
  code: string;
  state: string;
}

export class AccountLinkingService {
  private accounts = new Map<string, UserAccount>();
  private providerIndex = new Map<string, string>(); // provider:providerUserId -> userId
  private emailIndex = new Map<string, string[]>(); // email -> userId[]

  constructor(private oauthManager: OAuthManager) {}

  /**
   * Create or get user account from OAuth
   */
  async createOrGetAccount(
    provider: ProviderType,
    providerUserId: string,
    profile: {
      email: string;
      name: string;
      picture?: string;
    }
  ): Promise<{ account: UserAccount; created: boolean }> {
    const compositeKey = `${provider}:${providerUserId}`;

    // Check if already linked
    const existingUserId = this.providerIndex.get(compositeKey);
    if (existingUserId) {
      const account = this.accounts.get(existingUserId);
      if (account) {
        // Update last used
        const linkedAccount = account.linkedAccounts.find(
          la => la.provider === provider && la.providerUserId === providerUserId
        );
        if (linkedAccount) {
          linkedAccount.lastUsed = Date.now();
        }
        return { account, created: false };
      }
    }

    // Check for existing account by email
    const existingByUserIds = this.emailIndex.get(profile.email);
    if (existingByUserIds && existingByUserIds.length > 0) {
      const userId = existingByUserIds[0];
      const account = this.accounts.get(userId);

      if (account) {
        // Link new provider to existing account
        return this.linkProviderToAccount(userId, {
          id: `${provider}:${providerUserId}`,
          provider,
          providerUserId,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          linkedAt: Date.now(),
          lastUsed: Date.now()
        });
      }
    }

    // Create new account
    const userId = this.generateUserId();
    const account: UserAccount = {
      id: userId,
      primaryProvider: provider,
      primaryAccountId: `${provider}:${providerUserId}`,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      linkedAccounts: [
        {
          id: `${provider}:${providerUserId}`,
          provider,
          providerUserId,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          linkedAt: Date.now(),
          lastUsed: Date.now()
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.accounts.set(userId, account);
    this.providerIndex.set(compositeKey, userId);

    // Update email index
    const emailUsers = this.emailIndex.get(profile.email) || [];
    emailUsers.push(userId);
    this.emailIndex.set(profile.email, emailUsers);

    return { account, created: true };
  }

  /**
   * Link a provider to an existing account
   */
  async linkProviderToAccount(
    userId: string,
    providerAccount: Omit<LinkedAccount, 'linkedAt' | 'lastUsed'>
  ): Promise<{ account: UserAccount; created: boolean }> {
    const account = this.accounts.get(userId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Check if already linked
    const existingLink = account.linkedAccounts.find(
      la => la.provider === providerAccount.provider && la.providerUserId === providerAccount.providerUserId
    );

    if (existingLink) {
      return { account, created: false };
    }

    // Check if provider account is linked to another user
    const compositeKey = `${providerAccount.provider}:${providerAccount.providerUserId}`;
    const otherUserId = this.providerIndex.get(compositeKey);
    if (otherUserId && otherUserId !== userId) {
      throw new Error('Provider account already linked to another user');
    }

    // Add linked account
    const linkedAccount: LinkedAccount = {
      ...providerAccount,
      linkedAt: Date.now(),
      lastUsed: Date.now()
    };

    account.linkedAccounts.push(linkedAccount);
    account.updatedAt = Date.now();

    // Update provider index
    this.providerIndex.set(compositeKey, userId);

    // Update email index
    const emailUsers = this.emailIndex.get(providerAccount.email) || [];
    if (!emailUsers.includes(userId)) {
      emailUsers.push(userId);
      this.emailIndex.set(providerAccount.email, emailUsers);
    }

    return { account, created: true };
  }

  /**
   * Unlink a provider from an account
   */
  async unlinkProvider(
    userId: string,
    provider: ProviderType,
    providerUserId: string
  ): Promise<void> {
    const account = this.accounts.get(userId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Check if trying to unlink primary provider
    if (account.primaryProvider === provider && account.primaryAccountId === `${provider}:${providerUserId}`) {
      if (account.linkedAccounts.length > 1) {
        // Promote another provider to primary
        const newPrimary = account.linkedAccounts.find(
          la => !(la.provider === provider && la.providerUserId === providerUserId)
        );
        if (newPrimary) {
          account.primaryProvider = newPrimary.provider;
          account.primaryAccountId = newPrimary.id;
        }
      } else {
        throw new Error('Cannot unlink the only provider on the account');
      }
    }

    // Remove linked account
    account.linkedAccounts = account.linkedAccounts.filter(
      la => !(la.provider === provider && la.providerUserId === providerUserId)
    );
    account.updatedAt = Date.now();

    // Update provider index
    const compositeKey = `${provider}:${providerUserId}`;
    this.providerIndex.delete(compositeKey);
  }

  /**
   * Get user account
   */
  getAccount(userId: string): UserAccount | null {
    return this.accounts.get(userId) || null;
  }

  /**
   * Find account by provider
   */
  findAccountByProvider(provider: ProviderType, providerUserId: string): UserAccount | null {
    const compositeKey = `${provider}:${providerUserId}`;
    const userId = this.providerIndex.get(compositeKey);
    if (!userId) {
      return null;
    }
    return this.accounts.get(userId) || null;
  }

  /**
   * Find accounts by email
   */
  findAccountsByEmail(email: string): UserAccount[] {
    const userIds = this.emailIndex.get(email) || [];
    return userIds
      .map(id => this.accounts.get(id))
      .filter((acc): acc is UserAccount => acc !== undefined);
  }

  /**
   * Update account profile
   */
  updateAccount(
    userId: string,
    updates: {
      name?: string;
      picture?: string;
    }
  ): UserAccount | null {
    const account = this.accounts.get(userId);
    if (!account) {
      return null;
    }

    if (updates.name) {
      account.name = updates.name;
    }

    if (updates.picture) {
      account.picture = updates.picture;
    }

    account.updatedAt = Date.now();

    return account;
  }

  /**
   * Delete account
   */
  deleteAccount(userId: string): void {
    const account = this.accounts.get(userId);
    if (!account) {
      return;
    }

    // Remove from provider index
    account.linkedAccounts.forEach(la => {
      const compositeKey = `${la.provider}:${la.providerUserId}`;
      this.providerIndex.delete(compositeKey);
    });

    // Remove from email index
    const emailUsers = this.emailIndex.get(account.email) || [];
    const filteredUsers = emailUsers.filter(id => id !== userId);
    this.emailIndex.set(account.email, filteredUsers);

    // Remove account
    this.accounts.delete(userId);
  }

  /**
   * Merge two accounts
   */
  async mergeAccounts(
    primaryUserId: string,
    secondaryUserId: string
  ): Promise<UserAccount> {
    const primaryAccount = this.accounts.get(primaryUserId);
    const secondaryAccount = this.accounts.get(secondaryUserId);

    if (!primaryAccount || !secondaryAccount) {
      throw new Error('One or both accounts not found');
    }

    // Merge linked accounts
    secondaryAccount.linkedAccounts.forEach(secondaryLinked => {
      const existingLink = primaryAccount.linkedAccounts.find(
        la => la.provider === secondaryLinked.provider && la.providerUserId === secondaryLinked.providerUserId
      );

      if (!existingLink) {
        // Update provider index
        const compositeKey = `${secondaryLinked.provider}:${secondaryLinked.providerUserId}`;
        this.providerIndex.set(compositeKey, primaryUserId);

        primaryAccount.linkedAccounts.push(secondaryLinked);
      }
    });

    primaryAccount.updatedAt = Date.now();

    // Delete secondary account
    this.deleteAccount(secondaryUserId);

    return primaryAccount;
  }

  /**
   * Get all linked providers for a user
   */
  getLinkedProviders(userId: string): ProviderType[] {
    const account = this.accounts.get(userId);
    if (!account) {
      return [];
    }

    return account.linkedAccounts.map(la => la.provider);
  }

  /**
   * Check if provider is linked
   */
  isProviderLinked(userId: string, provider: ProviderType): boolean {
    const account = this.accounts.get(userId);
    if (!account) {
      return false;
    }

    return account.linkedAccounts.some(la => la.provider === provider);
  }

  /**
   * Get primary provider for user
   */
  getPrimaryProvider(userId: string): ProviderType | null {
    const account = this.accounts.get(userId);
    return account?.primaryProvider || null;
  }

  /**
   * Switch primary provider
   */
  switchPrimaryProvider(
    userId: string,
    newPrimaryProvider: ProviderType,
    newPrimaryProviderUserId: string
  ): UserAccount | null {
    const account = this.accounts.get(userId);
    if (!account) {
      return null;
    }

    const newPrimaryLink = account.linkedAccounts.find(
      la => la.provider === newPrimaryProvider && la.providerUserId === newPrimaryProviderUserId
    );

    if (!newPrimaryLink) {
      throw new Error('Provider not linked to account');
    }

    account.primaryProvider = newPrimaryProvider;
    account.primaryAccountId = newPrimaryLink.id;
    account.updatedAt = Date.now();

    return account;
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Export state (for persistence)
   */
  exportState(): {
    accounts: Array<[string, UserAccount]>;
    providerIndex: Array<[string, string]>;
    emailIndex: Array<[string, string[]]>;
  } {
    return {
      accounts: Array.from(this.accounts.entries()),
      providerIndex: Array.from(this.providerIndex.entries()),
      emailIndex: Array.from(this.emailIndex.entries())
    };
  }

  /**
   * Import state (for restoration)
   */
  importState(state: {
    accounts: Array<[string, UserAccount]>;
    providerIndex: Array<[string, string]>;
    emailIndex: Array<[string, string[]]>;
  }): void {
    this.accounts = new Map(state.accounts);
    this.providerIndex = new Map(state.providerIndex);
    this.emailIndex = new Map(state.emailIndex);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalAccounts: number;
    totalLinks: number;
    providerDistribution: Record<ProviderType, number>;
  } {
    const providerDistribution: Record<string, number> = {};

    for (const account of this.accounts.values()) {
      for (const link of account.linkedAccounts) {
        providerDistribution[link.provider] = (providerDistribution[link.provider] || 0) + 1;
      }
    }

    const totalLinks = Array.from(this.accounts.values()).reduce(
      (sum, acc) => sum + acc.linkedAccounts.length,
      0
    );

    return {
      totalAccounts: this.accounts.size,
      totalLinks,
      providerDistribution: providerDistribution as Record<ProviderType, number>
    };
  }
}
