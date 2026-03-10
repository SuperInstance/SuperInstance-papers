/**
 * Plugin System Tests
 *
 * Comprehensive tests for the plugin system including validation,
 * loading, lifecycle, permissions, and security.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  PluginManager,
  PluginValidator,
  PluginHost,
  PluginLoader,
  PluginManifest,
  PluginLoadOptions,
  PluginState,
  PermissionType,
  ExtensionPointType,
  PluginEventType,
} from '../index';

describe('Plugin System', () => {
  let manager: PluginManager;
  let validator: PluginValidator;
  let host: PluginHost;
  let loader: PluginLoader;

  beforeEach(() => {
    manager = new PluginManager('1.0.0');
    validator = new PluginValidator();
    host = new PluginHost();
    loader = new PluginLoader();
  });

  afterEach(async () => {
    await manager.shutdown();
    loader.cleanup();
  });

  describe('Plugin Validator', () => {
    const validManifest: PluginManifest = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin',
      author: {
        name: 'Test Author',
        email: 'test@example.com',
      },
      license: 'MIT',
      pollnVersion: '1.0.0',
      main: 'index.js',
      extensions: [
        {
          type: ExtensionPointType.COMMAND,
          id: 'test-command',
          name: 'Test Command',
        },
      ],
      permissions: [
        {
          type: PermissionType.READ_CELLS,
          reason: 'To read cell values',
        },
      ],
    };

    it('should validate a valid manifest', () => {
      const result = validator.validateManifest(validManifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject manifest with missing required fields', () => {
      const invalidManifest = { ...validManifest, name: undefined };
      const result = validator.validateManifest(invalidManifest as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_REQUIRED_FIELD')).toBe(true);
    });

    it('should reject manifest with invalid plugin ID', () => {
      const invalidManifest = { ...validManifest, id: 'Invalid_ID' };
      const result = validator.validateManifest(invalidManifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_PLUGIN_ID')).toBe(true);
    });

    it('should reject manifest with invalid version format', () => {
      const invalidManifest = { ...validManifest, version: '1.0' };
      const result = validator.validateManifest(invalidManifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_VERSION')).toBe(true);
    });

    it('should reject manifest with invalid email', () => {
      const invalidManifest = {
        ...validManifest,
        author: { ...validManifest.author, email: 'invalid-email' },
      };
      const result = validator.validateManifest(invalidManifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_AUTHOR_EMAIL')).toBe(true);
    });

    it('should detect duplicate extension IDs', () => {
      const invalidManifest = {
        ...validManifest,
        extensions: [
          validManifest.extensions[0],
          validManifest.extensions[0],
        ],
      };
      const result = validator.validateManifest(invalidManifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_EXTENSION_ID')).toBe(true);
    });

    it('should perform security scan', async () => {
      const code = `
        // Safe code
        export function hello() {
          return 'Hello, World!';
        }
      `;

      const result = await validator.performSecurityScan(validManifest, code);
      expect(result.passed).toBe(true);
      expect(result.riskLevel).toBe('low');
    });

    it('should detect suspicious code patterns', async () => {
      const code = `
        // Dangerous code
        export function dangerous(userInput) {
          eval(userInput);
          return innerHTML;
        }
      `;

      const result = await validator.performSecurityScan(validManifest, code);
      expect(result.passed).toBe(false);
      expect(result.issues.some(i => i.type === 'suspicious_code')).toBe(true);
    });

    it('should validate version compatibility', () => {
      const manifest = { ...validManifest, pollnVersion: '1.0.0' };
      const result = validator.validateCompatibility(manifest, '1.0.0');
      expect(result.compatible).toBe(true);
    });

    it('should reject incompatible versions', () => {
      const manifest = { ...validManifest, pollnVersion: '2.0.0' };
      const result = validator.validateCompatibility(manifest, '1.0.0');
      expect(result.compatible).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe('Plugin Manager', () => {
    it('should install a plugin', async () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: { name: 'Test Author' },
        license: 'MIT',
        pollnVersion: '1.0.0',
        main: 'index.js',
        extensions: [],
        permissions: [],
      };

      // Mock loader
      jest.spyOn(loader, 'loadManifest').mockResolvedValue(manifest);

      const pluginId = await manager.installPlugin('./test-plugin');
      expect(pluginId).toBe('test-plugin');

      const plugin = manager.getPluginManifest('test-plugin');
      expect(plugin).toBeDefined();
      expect(plugin?.id).toBe('test-plugin');
    });

    it('should reject duplicate plugin installation', async () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: { name: 'Test Author' },
        license: 'MIT',
        pollnVersion: '1.0.0',
        main: 'index.js',
        extensions: [],
        permissions: [],
      };

      jest.spyOn(loader, 'loadManifest').mockResolvedValue(manifest);

      await manager.installPlugin('./test-plugin');
      await expect(manager.installPlugin('./test-plugin')).rejects.toThrow();
    });

    it('should list installed plugins', async () => {
      const manifest1: PluginManifest = {
        id: 'plugin-1',
        name: 'Plugin 1',
        version: '1.0.0',
        description: 'Test plugin 1',
        author: { name: 'Test Author' },
        license: 'MIT',
        pollnVersion: '1.0.0',
        main: 'index.js',
        extensions: [],
        permissions: [],
      };

      const manifest2: PluginManifest = {
        id: 'plugin-2',
        name: 'Plugin 2',
        version: '1.0.0',
        description: 'Test plugin 2',
        author: { name: 'Test Author' },
        license: 'MIT',
        pollnVersion: '1.0.0',
        main: 'index.js',
        extensions: [],
        permissions: [],
      };

      jest.spyOn(loader, 'loadManifest')
        .mockResolvedValueOnce(manifest1)
        .mockResolvedValueOnce(manifest2);

      await manager.installPlugin('./plugin1');
      await manager.installPlugin('./plugin2');

      const plugins = manager.listPlugins();
      expect(plugins).toHaveLength(2);
      expect(plugins.some(p => p.manifest.id === 'plugin-1')).toBe(true);
      expect(plugins.some(p => p.manifest.id === 'plugin-2')).toBe(true);
    });

    it('should handle plugin permissions', async () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: { name: 'Test Author' },
        license: 'MIT',
        pollnVersion: '1.0.0',
        main: 'index.js',
        extensions: [],
        permissions: [
          { type: PermissionType.READ_CELLS },
          { type: PermissionType.UI_CUSTOMIZATION },
        ],
      };

      jest.spyOn(loader, 'loadManifest').mockResolvedValue(manifest);
      jest.spyOn(loader, 'loadPlugin').mockResolvedValue('module.exports = {};');

      await manager.installPlugin('./test-plugin');
      await manager.loadPlugin('test-plugin');

      expect(manager.hasPermission('test-plugin', PermissionType.READ_CELLS)).toBe(true);
      expect(manager.hasPermission('test-plugin', PermissionType.WRITE_CELLS)).toBe(false);
    });

    it('should uninstall a plugin', async () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: { name: 'Test Author' },
        license: 'MIT',
        pollnVersion: '1.0.0',
        main: 'index.js',
        extensions: [],
        permissions: [],
      };

      jest.spyOn(loader, 'loadManifest').mockResolvedValue(manifest);

      await manager.installPlugin('./test-plugin');
      expect(manager.getPluginManifest('test-plugin')).toBeDefined();

      await manager.uninstallPlugin('test-plugin');
      expect(manager.getPluginManifest('test-plugin')).toBeUndefined();
    });
  });

  describe('Plugin Host', () => {
    it('should create plugin context', async () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: { name: 'Test Author' },
        license: 'MIT',
        pollnVersion: '1.0.0',
        main: 'index.js',
        extensions: [],
        permissions: [],
      };

      const pluginCode = `
        export default function createPlugin() {
          return {
            async activate(context) {
              context.logger.info('Plugin activated');
            },
            async deactivate() {
              console.log('Plugin deactivated');
            }
          };
        }
      `;

      await host.loadPlugin(manifest, pluginCode, {});
      await host.activatePlugin(manifest.id);

      const state = host.getPluginState(manifest.id);
      expect(state).toBeDefined();
      expect(state?.state).toBe(PluginState.ACTIVE);
    });

    it('should handle plugin activation failure', async () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: { name: 'Test Author' },
        license: 'MIT',
        pollnVersion: '1.0.0',
        main: 'index.js',
        extensions: [],
        permissions: [],
      };

      const pluginCode = `
        export default function createPlugin() {
          return {
            async activate() {
              throw new Error('Activation failed');
            }
          };
        }
      `;

      await host.loadPlugin(manifest, pluginCode, {});

      await expect(host.activatePlugin(manifest.id)).rejects.toThrow();

      const state = host.getPluginState(manifest.id);
      expect(state?.state).toBe(PluginState.ERROR);
    });
  });

  describe('Dependency Resolution', () => {
    it('should resolve simple dependencies', async () => {
      const plugin1: PluginManifest = {
        id: 'plugin-1',
        name: 'Plugin 1',
        version: '1.0.0',
        description: 'Test plugin 1',
        author: { name: 'Test Author' },
        license: 'MIT',
        pollnVersion: '1.0.0',
        main: 'index.js',
        extensions: [],
        permissions: [],
      };

      const plugin2: PluginManifest = {
        id: 'plugin-2',
        name: 'Plugin 2',
        version: '1.0.0',
        description: 'Test plugin 2',
        author: { name: 'Test Author' },
        license: 'MIT',
        pollnVersion: '1.0.0',
        main: 'index.js',
        extensions: [],
        permissions: [],
        dependencies: [
          { pluginId: 'plugin-1', version: '1.0.0', required: true },
        ],
      };

      jest.spyOn(loader, 'loadManifest')
        .mockResolvedValueOnce(plugin1)
        .mockResolvedValueOnce(plugin2);

      await manager.installPlugin('./plugin1');
      await manager.installPlugin('./plugin2');

      const plugins = manager.listPlugins();
      expect(plugins).toHaveLength(2);
    });

    it('should detect circular dependencies', async () => {
      const plugin1: PluginManifest = {
        id: 'plugin-1',
        name: 'Plugin 1',
        version: '1.0.0',
        description: 'Test plugin 1',
        author: { name: 'Test Author' },
        license: 'MIT',
        pollnVersion: '1.0.0',
        main: 'index.js',
        extensions: [],
        permissions: [],
        dependencies: [
          { pluginId: 'plugin-2', version: '1.0.0', required: true },
        ],
      };

      const plugin2: PluginManifest = {
        id: 'plugin-2',
        name: 'Plugin 2',
        version: '1.0.0',
        description: 'Test plugin 2',
        author: { name: 'Test Author' },
        license: 'MIT',
        pollnVersion: '1.0.0',
        main: 'index.js',
        extensions: [],
        permissions: [],
        dependencies: [
          { pluginId: 'plugin-1', version: '1.0.0', required: true },
        ],
      };

      jest.spyOn(loader, 'loadManifest')
        .mockResolvedValueOnce(plugin1)
        .mockResolvedValueOnce(plugin2);

      await manager.installPlugin('./plugin1');
      await manager.installPlugin('./plugin2');

      await expect(manager.loadPlugin('plugin-1')).rejects.toThrow(/circular/i);
    });
  });

  describe('Events', () => {
    it('should emit plugin lifecycle events', async () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: { name: 'Test Author' },
        license: 'MIT',
        pollnVersion: '1.0.0',
        main: 'index.js',
        extensions: [],
        permissions: [],
      };

      jest.spyOn(loader, 'loadManifest').mockResolvedValue(manifest);

      const events: string[] = [];
      manager.on('plugin:registered', () => events.push('registered'));
      manager.on('plugin:loaded', () => events.push('loaded'));
      manager.on('plugin:activated', () => events.push('activated'));

      await manager.installPlugin('./test-plugin');
      expect(events).toContain('registered');
    });
  });

  describe('Utility Functions', () => {
    it('should validate plugin ID format', () => {
      const { isValidPluginId } = require('../index');

      expect(isValidPluginId('my-plugin')).toBe(true);
      expect(isValidPluginId('my_plugin')).toBe(false);
      expect(isValidPluginId('My-Plugin')).toBe(false);
      expect(isValidPluginId('-my-plugin')).toBe(false);
      expect(isValidPluginId('my-plugin-')).toBe(false);
    });

    it('should sanitize plugin ID', () => {
      const { sanitizePluginId } = require('../index');

      expect(sanitizePluginId('My Plugin')).toBe('my-plugin');
      expect(sanitizePluginId('my_plugin')).toBe('my-plugin');
      expect(sanitizePluginId('My-Plugin')).toBe('my-plugin');
    });

    it('should parse semantic versions', () => {
      const { parseVersion } = require('../index');

      const version = parseVersion('1.2.3-beta.1+build.123');
      expect(version.major).toBe(1);
      expect(version.minor).toBe(2);
      expect(version.patch).toBe(3);
      expect(version.prerelease).toBe('beta.1');
      expect(version.build).toBe('build.123');
    });

    it('should compare versions', () => {
      const { compareVersions } = require('../index');

      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    });

    it('should check version satisfaction', () => {
      const { satisfiesVersion } = require('../index');

      expect(satisfiesVersion('1.2.3', '1.2.3')).toBe(true);
      expect(satisfiesVersion('1.2.3', '^1.2.0')).toBe(true);
      expect(satisfiesVersion('1.2.3', '^1.0.0')).toBe(true);
      expect(satisfiesVersion('2.0.0', '^1.0.0')).toBe(false);
      expect(satisfiesVersion('1.2.3', '~1.2.0')).toBe(true);
      expect(satisfiesVersion('1.3.0', '~1.2.0')).toBe(false);
      expect(satisfiesVersion('1.2.3', '*')).toBe(true);
    });
  });
});
