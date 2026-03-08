/**
 * CLI Tests
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ConfigManager } from '../utils/config.js';
import { ColonyStateManager } from '../utils/colony-state.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('CLI Utils', () => {
  let tempDir: string;
  let configPath: string;
  let dataDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // Save original working directory
    originalCwd = process.cwd();
    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'polln-test-'));
    configPath = path.join(tempDir, '.pollnrc');
    dataDir = path.join(tempDir, '.polln');
    process.chdir(tempDir);
  });

  afterEach(async () => {
    // Return to original directory first
    try {
      process.chdir(originalCwd);
    } catch {
      // Ignore if original directory no longer exists
    }

    // Clean up temp directory with robust Windows handling
    if (tempDir && fs.existsSync(tempDir)) {
      // On Windows, directory cleanup can fail due to file locks
      // Use a more robust cleanup with retries
      const maxRetries = 3;
      const retryDelay = 100; // ms

      for (let i = 0; i < maxRetries; i++) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 0 });
          break; // Success, exit retry loop
        } catch (error: any) {
          if (error.code === 'EPERM' && i < maxRetries - 1) {
            // Wait and retry on Windows EPERM
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else if (error.code === 'ENOENT') {
            // Already gone, consider it cleaned up
            break;
          } else {
            // Log but don't fail the test
            console.warn(`Failed to cleanup temp dir (${tempDir}):`, error.message);
            break;
          }
        }
      }
    }
  });

  describe('ConfigManager', () => {
    it('should create default config when none exists', () => {
      const config = new ConfigManager(configPath);
      const allConfig = config.getAll();

      expect(allConfig.federation?.enabled).toBe(false);
      expect(allConfig.dreaming?.enabled).toBe(true);
      expect(allConfig.cache?.maxSize).toBe(1000);
      expect(allConfig.agents?.maxCount).toBe(100);
    });

    it('should initialize a new colony', () => {
      const config = new ConfigManager(configPath);
      config.initializeColony('Test Colony');

      expect(config.get('colonyName')).toBe('Test Colony');
      expect(config.get('colonyId')).toBeDefined();
      expect(config.get('dataDir')).toBeDefined();
      expect(config.exists()).toBe(true);
    });

    it('should save and load config', () => {
      const config = new ConfigManager(configPath);
      config.initializeColony('Test Colony', {
        federation: { enabled: true },
      });

      const config2 = new ConfigManager(configPath);
      expect(config2.get('colonyName')).toBe('Test Colony');
      expect(config2.get('federation')?.enabled).toBe(true);
    });

    it('should set and get config values', () => {
      const config = new ConfigManager(configPath);
      config.initializeColony('Test Colony');

      config.set('colonyName', 'Updated Colony');
      expect(config.get('colonyName')).toBe('Updated Colony');
    });

    it('should ensure data directory exists', () => {
      const config = new ConfigManager(configPath);
      config.initializeColony('Test Colony');

      config.ensureDataDir();
      expect(fs.existsSync(config.getDataDir())).toBe(true);
    });
  });

  describe('ColonyStateManager', () => {
    it('should create new state when none exists', () => {
      fs.mkdirSync(dataDir, { recursive: true });
      const manager = new ColonyStateManager(dataDir, 'test-colony-id');
      const state = manager.getState();

      expect(state.colonyId).toBe('test-colony-id');
      expect(state.agents).toHaveLength(0);
      expect(state.stats.totalAgents).toBe(0);
    });

    it('should add and retrieve agents', () => {
      fs.mkdirSync(dataDir, { recursive: true });
      const manager = new ColonyStateManager(dataDir, 'test-colony-id');

      const agent = manager.addAgent('task', 'test-category', { key: 'value' });

      expect(agent.id).toBeDefined();
      expect(agent.type).toBe('task');
      expect(agent.category).toBe('test-category');
      expect(agent.metadata).toEqual({ key: 'value' });
      expect(agent.status).toBe('active');

      const retrieved = manager.getAgent(agent.id);
      expect(retrieved).toEqual(agent);
    });

    it('should get all agents', () => {
      fs.mkdirSync(dataDir, { recursive: true });
      const manager = new ColonyStateManager(dataDir, 'test-colony-id');

      manager.addAgent('task', 'category1');
      manager.addAgent('role', 'category2');
      manager.addAgent('core', 'category3');

      const agents = manager.getAllAgents();
      expect(agents).toHaveLength(3);
    });

    it('should filter agents by type', () => {
      fs.mkdirSync(dataDir, { recursive: true });
      const manager = new ColonyStateManager(dataDir, 'test-colony-id');

      manager.addAgent('task', 'category1');
      manager.addAgent('task', 'category2');
      manager.addAgent('role', 'category3');

      const taskAgents = manager.getAgentsByType('task');
      expect(taskAgents).toHaveLength(2);
      expect(taskAgents.every(a => a.type === 'task')).toBe(true);
    });

    it('should terminate agents', () => {
      fs.mkdirSync(dataDir, { recursive: true });
      const manager = new ColonyStateManager(dataDir, 'test-colony-id');

      const agent = manager.addAgent('task', 'category1');
      expect(manager.getState().stats.activeAgents).toBe(1);

      const success = manager.terminateAgent(agent.id);
      expect(success).toBe(true);

      const terminatedAgent = manager.getAgent(agent.id);
      expect(terminatedAgent?.status).toBe('terminated');
      expect(manager.getState().stats.activeAgents).toBe(0);
    });

    it('should update cache statistics', () => {
      fs.mkdirSync(dataDir, { recursive: true });
      const manager = new ColonyStateManager(dataDir, 'test-colony-id');

      manager.updateCacheStats(100, 75, 25);
      const state = manager.getState();

      expect(state.cache.size).toBe(100);
      expect(state.cache.hits).toBe(75);
      expect(state.cache.misses).toBe(25);
    });

    it('should clear cache', () => {
      fs.mkdirSync(dataDir, { recursive: true });
      const manager = new ColonyStateManager(dataDir, 'test-colony-id');

      manager.updateCacheStats(100, 75, 25);
      manager.clearCache();

      const state = manager.getState();
      expect(state.cache.size).toBe(0);
      expect(state.cache.hits).toBe(0);
      expect(state.cache.misses).toBe(0);
      expect(state.cache.lastClear).toBeDefined();
    });

    it('should increment counters', () => {
      fs.mkdirSync(dataDir, { recursive: true });
      const manager = new ColonyStateManager(dataDir, 'test-colony-id');

      manager.incrementDreams();
      manager.incrementSyncs();

      expect(manager.getState().stats.totalDreams).toBe(1);
      expect(manager.getState().stats.totalSyncs).toBe(1);
    });

    it('should calculate health correctly', () => {
      fs.mkdirSync(dataDir, { recursive: true });
      const manager = new ColonyStateManager(dataDir, 'test-colony-id');

      // Add agents but terminate some
      manager.addAgent('task', 'cat1');
      manager.addAgent('task', 'cat2');
      const agent3 = manager.addAgent('task', 'cat3');
      manager.terminateAgent(agent3.id);

      const health = manager.getHealth();
      expect(health.agentRatio).toBe(2 / 3);
      expect(health.status).toBe('healthy');
      expect(health.uptime).toBeGreaterThan(0);
    });

    it('should show warning status when agent ratio is low', () => {
      fs.mkdirSync(dataDir, { recursive: true });
      const manager = new ColonyStateManager(dataDir, 'test-colony-id');

      const agent1 = manager.addAgent('task', 'cat1');
      const agent2 = manager.addAgent('task', 'cat2');
      const agent3 = manager.addAgent('task', 'cat3');
      manager.terminateAgent(agent1.id);
      manager.terminateAgent(agent2.id);

      const health = manager.getHealth();
      expect(health.status).toBe('warning');
    });

    it('should show critical status when very few agents active', () => {
      fs.mkdirSync(dataDir, { recursive: true });
      const manager = new ColonyStateManager(dataDir, 'test-colony-id');

      const agent1 = manager.addAgent('task', 'cat1');
      const agent2 = manager.addAgent('task', 'cat2');
      const agent3 = manager.addAgent('task', 'cat3');
      const agent4 = manager.addAgent('task', 'cat4');
      const agent5 = manager.addAgent('task', 'cat5');
      manager.terminateAgent(agent1.id);
      manager.terminateAgent(agent2.id);
      manager.terminateAgent(agent3.id);
      manager.terminateAgent(agent4.id);

      const health = manager.getHealth();
      expect(health.status).toBe('critical');
    });

    it('should set and save colony name', () => {
      fs.mkdirSync(dataDir, { recursive: true });
      const manager = new ColonyStateManager(dataDir, 'test-colony-id');

      manager.setName('Test Colony Name');
      expect(manager.getState().colonyName).toBe('Test Colony Name');

      // Load new instance and verify persistence
      const manager2 = new ColonyStateManager(dataDir, 'test-colony-id');
      expect(manager2.getState().colonyName).toBe('Test Colony Name');
    });

    it('should update agent activity', () => {
      fs.mkdirSync(dataDir, { recursive: true });
      const manager = new ColonyStateManager(dataDir, 'test-colony-id');

      const agent = manager.addAgent('task', 'cat1');
      const originalActivity = agent.lastActivity;

      // Wait a bit
      const startTime = Date.now();
      while (Date.now() - startTime < 10) {
        // busy wait
      }

      manager.updateAgentActivity(agent.id);
      const updatedAgent = manager.getAgent(agent.id);

      expect(updatedAgent?.lastActivity).toBeGreaterThan(originalActivity);
    });
  });
});
