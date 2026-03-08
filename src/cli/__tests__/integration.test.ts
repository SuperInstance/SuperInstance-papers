/**
 * CLI Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('CLI Integration Tests', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // Save original working directory
    originalCwd = process.cwd();

    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'polln-cli-test-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    // Restore original working directory
    process.chdir(originalCwd);

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const runCLI = (args: string[]): string => {
    try {
      // Use the full path to the dist folder from the project root
      const distPath = path.join(originalCwd, 'dist', 'cli', 'index.js');
      // Properly escape arguments with spaces
      const escapedArgs = args.map(arg => arg.includes(' ') ? `"${arg}"` : arg).join(' ');
      // Use shell redirection to capture both stdout and stderr
      const result = execSync(`node "${distPath}" ${escapedArgs} 2>&1`, {
        encoding: 'utf-8',
        cwd: tempDir,
        shell: true,
      });
      return result;
    } catch (error: any) {
      return error.stdout || error.stderr || error.message;
    }
  };

  describe('polln init', () => {
    it('should initialize a new colony', () => {
      const output = runCLI(['init', '--name', 'Test Colony', '--force']);

      expect(output).toContain('Test Colony');
      expect(output).toContain('initialized successfully');

      expect(fs.existsSync('.pollnrc')).toBe(true);
      expect(fs.existsSync('.polln')).toBe(true);

      const config = JSON.parse(fs.readFileSync('.pollnrc', 'utf-8'));
      expect(config.colonyName).toBe('Test Colony');
      expect(config.colonyId).toBeDefined();
    });

    it('should fail when already initialized (without force)', () => {
      runCLI(['init', '--name', 'First Colony']);

      const output = runCLI(['init', '--name', 'Second Colony']);
      expect(output).toContain('already initialized');
    });

    it('should reinitialize with force flag', () => {
      runCLI(['init', '--name', 'First Colony']);

      const output = runCLI(['init', '--name', 'Second Colony', '--force']);
      expect(output).toContain('Second Colony');

      const config = JSON.parse(fs.readFileSync('.pollnrc', 'utf-8'));
      expect(config.colonyName).toBe('Second Colony');
    });
  });

  describe('polln status', () => {
    beforeEach(() => {
      runCLI(['init', '--name', 'Status Test Colony']);
    });

    it('should show colony status', () => {
      const output = runCLI(['status']);

      expect(output).toContain('Status Test Colony');
      expect(output).toContain('Colony Information');
      expect(output).toContain('Statistics');
      expect(output).toContain('Cache');
    });

    it('should output JSON when requested', () => {
      const output = runCLI(['status', '--json']);
      const json = JSON.parse(output);

      expect(json.colony).toBeDefined();
      expect(json.colony.name).toBe('Status Test Colony');
      expect(json.health).toBeDefined();
      expect(json.stats).toBeDefined();
      expect(json.cache).toBeDefined();
    });

    it('should fail when no colony exists', () => {
      fs.unlinkSync('.pollnrc');

      const output = runCLI(['status']);
      expect(output).toContain('No colony found');
    });
  });

  describe('polln agents', () => {
    beforeEach(() => {
      runCLI(['init', '--name', 'Agents Test Colony']);
    });

    describe('list', () => {
      it('should list agents', () => {
        const output = runCLI(['agents', 'list']);
        expect(output).toContain('Agents');
      });

      it('should filter by type', () => {
        runCLI(['agents', 'spawn', 'task']);
        runCLI(['agents', 'spawn', 'role']);

        const output = runCLI(['agents', 'list', '--type', 'task']);
        expect(output).toContain('TASK');
      });
    });

    describe('spawn', () => {
      it('should spawn a task agent', () => {
        const output = runCLI(['agents', 'spawn', 'task']);

        expect(output).toContain('spawned successfully');
        expect(output).toContain('TASK');
      });

      it('should spawn different agent types', () => {
        const types = ['task', 'role', 'core'];

        for (const type of types) {
          const output = runCLI(['agents', 'spawn', type]);
          expect(output).toContain(type.toUpperCase());
        }
      });

      it('should reject invalid agent type', () => {
        const output = runCLI(['agents', 'spawn', 'invalid']);
        expect(output).toContain('Invalid agent type');
      });
    });

    describe('kill', () => {
      it('should terminate an agent', () => {
        runCLI(['agents', 'spawn', 'task', '--category', 'test-agent']);
        const listOutput = runCLI(['agents', 'list', '--json']);
        const agents = JSON.parse(listOutput);
        const agentId = agents[0].id.substring(0, 8);

        const output = runCLI(['agents', 'kill', agentId]);
        expect(output).toContain('terminated');
      });

      it('should fail for non-existent agent', () => {
        const output = runCLI(['agents', 'kill', 'nonexistent']);
        expect(output).toContain('not found');
      });
    });

    describe('inspect', () => {
      it('should show agent details', () => {
        runCLI(['agents', 'spawn', 'task', '--category', 'inspect-test']);
        const listOutput = runCLI(['agents', 'list', '--json']);
        const agents = JSON.parse(listOutput);
        const agentId = agents[0].id.substring(0, 8);

        const output = runCLI(['agents', 'inspect', agentId]);
        expect(output).toContain('Agent Details');
        expect(output).toContain('Basic Information');
        expect(output).toContain('Timing');
      });
    });
  });

  describe('polln dream', () => {
    beforeEach(() => {
      runCLI(['init', '--name', 'Dream Test Colony']);
    });

    it('should run dream cycle', () => {
      const output = runCLI(['dream', '--episodes', '5']);

      expect(output).toContain('Dream Cycle');
      expect(output).toContain('completed successfully');
    });

    it('should respect episode count', () => {
      const output = runCLI(['dream', '--episodes', '3', '--verbose']);

      expect(output).toContain('3');
      expect(output).toContain('Episodes');
    });
  });

  describe('polln sync', () => {
    beforeEach(() => {
      runCLI(['init', '--name', 'Sync Test Colony', '--force']);
    });

    it('should fail when federation is disabled', () => {
      const output = runCLI(['sync']);
      expect(output).toContain('not enabled');
    });

    it('should work when federation is enabled', () => {
      // Enable federation
      const configPath = '.pollnrc';
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config.federation.enabled = true;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const output = runCLI(['sync']);
      expect(output).toContain('Federation Sync');
    });
  });

  describe('polln cache', () => {
    beforeEach(() => {
      runCLI(['init', '--name', 'Cache Test Colony']);
    });

    describe('stats', () => {
      it('should show cache statistics', () => {
        const output = runCLI(['cache', 'stats']);

        expect(output).toContain('KV-Cache Statistics');
        expect(output).toContain('Cache Status');
        expect(output).toContain('Performance');
      });

      it('should output JSON when requested', () => {
        const output = runCLI(['cache', 'stats', '--json']);
        const json = JSON.parse(output);

        expect(json.size).toBeDefined();
        expect(json.hits).toBeDefined();
        expect(json.misses).toBeDefined();
      });
    });

    describe('clear', () => {
      it('should clear cache with force flag', () => {
        // Add some cache data first
        runCLI(['cache', 'simulate', '--operations', '50']);

        const output = runCLI(['cache', 'clear', '--force']);
        expect(output).toContain('cleared successfully');
      });
    });

    describe('simulate', () => {
      it('should simulate cache activity', () => {
        const output = runCLI(['cache', 'simulate', '--operations', '20']);

        expect(output).toContain('Simulating Cache Activity');
        expect(output).toContain('Simulation Complete');
        expect(output).toContain('Operations: 20');
      });
    });
  });

  describe('polln config', () => {
    beforeEach(() => {
      runCLI(['init', '--name', 'Config Test Colony']);
    });

    it('should list configuration', () => {
      const output = runCLI(['config', '--list']);

      expect(output).toContain('colonyName');
      expect(output).toContain('Config Test Colony');
    });

    it('should get specific config value', () => {
      const output = runCLI(['config', '--get', 'colonyName']);

      expect(output).toContain('Config Test Colony');
    });

    it('should set config value', () => {
      const output = runCLI(['config', '--set', 'colonyName=Updated Name']);

      expect(output).toContain('Configuration updated');

      const verify = runCLI(['config', '--get', 'colonyName']);
      expect(verify).toContain('Updated Name');
    });

    it('should show config location', () => {
      const output = runCLI(['config']);

      expect(output).toContain('.pollnrc');
    });
  });

  describe('polln version', () => {
    it('should show version information', () => {
      const output = runCLI(['version']);

      expect(output).toContain('POLLN CLI');
      expect(output).toContain('Version');
      expect(output).toContain('Node.js');
      expect(output).toContain('Platform');
    });
  });

  describe('error handling', () => {
    it('should show help when no command provided', () => {
      const output = runCLI([]);

      expect(output).toContain('Usage:');
      expect(output).toContain('Commands:');
    });

    it('should show help for specific command', () => {
      const output = runCLI(['--help']);

      expect(output).toContain('Usage:');
      expect(output).toContain('Options:');
      expect(output).toContain('Commands:');
    });

    it('should handle invalid commands gracefully', () => {
      const output = runCLI(['invalid-command']);

      expect(output).toContain('error') || expect(output).toContain('not found');
    });
  });
});
