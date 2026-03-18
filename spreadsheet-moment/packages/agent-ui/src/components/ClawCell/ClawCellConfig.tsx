/**
 * Claw Cell Configuration Component
 *
 * UI for configuring Claw agent instances in cells
 */

import React, { useState, useEffect } from 'react';
import {
  ClawCellConfiguration,
  ClawCellConfigProps,
  EquipmentSlotInfo,
  ModelProviderInfo,
  ModelProvider,
  EquipmentSlot
} from './types';
import { ClawState, ModelProvider as CoreModelProvider } from '@spreadsheet-moment/agent-core';

/**
 * Equipment slot definitions
 */
const EQUIPMENT_SLOTS: EquipmentSlotInfo[] = [
  {
    slot: EquipmentSlot.MEMORY,
    name: 'Memory',
    description: 'Hierarchical memory for context and learning',
    icon: '🧠',
    category: 'memory',
    required: true
  },
  {
    slot: EquipmentSlot.REASONING,
    name: 'Reasoning',
    description: 'Advanced reasoning and decision-making',
    icon: '🤔',
    category: 'reasoning',
    required: true
  },
  {
    slot: EquipmentSlot.LEARNING,
    name: 'Learning',
    description: 'Adaptive learning and improvement',
    icon: '📚',
    category: 'reasoning',
    required: false
  },
  {
    slot: EquipmentSlot.PERCEPTION,
    name: 'Perception',
    description: 'Data sensing and interpretation',
    icon: '👁️',
    category: 'integration',
    required: false
  },
  {
    slot: EquipmentSlot.ACTION,
    name: 'Action',
    description: 'Execute actions and modify cells',
    icon: '⚡',
    category: 'reasoning',
    required: true
  },
  {
    slot: EquipmentSlot.COMMUNICATION,
    name: 'Communication',
    description: 'Multi-agent coordination and messaging',
    icon: '💬',
    category: 'coordination',
    required: false
  }
];

/**
 * Model provider definitions
 */
const MODEL_PROVIDERS: ModelProviderInfo[] = [
  {
    provider: CoreModelProvider.DEEPSEEK,
    name: 'DeepSeek',
    description: 'High-performance reasoning model',
    models: ['deepseek-chat', 'deepseek-coder'],
    icon: '🔮'
  },
  {
    provider: CoreModelProvider.CLOUDFLARE,
    name: 'Cloudflare Workers AI',
    description: 'Edge-optimized AI models',
    models: ['@cf/meta/llama-2-7b-chat-int8', '@hf/thebloke/neural-chat-7b-v3-1'],
    icon: '☁️'
  },
  {
    provider: CoreModelProvider.OPENAI,
    name: 'OpenAI',
    description: 'GPT models for various tasks',
    models: ['gpt-4', 'gpt-3.5-turbo'],
    icon: '🌐'
  },
  {
    provider: CoreModelProvider.ANTHROPIC,
    name: 'Anthropic',
    description: 'Claude models for advanced reasoning',
    models: ['claude-3-opus', 'claude-3-sonnet'],
    icon: '🧠'
  }
];

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ClawCellConfiguration = {
  id: `claw-${Date.now()}`,
  name: 'New Claw Agent',
  model: 'deepseek-chat',
  provider: CoreModelProvider.DEEPSEEK,
  purpose: 'Describe what this Claw agent does',
  trigger: {
    type: 'manual'
  },
  equipment: [EquipmentSlot.MEMORY, EquipmentSlot.REASONING, EquipmentSlot.ACTION],
  learningStrategy: {
    type: 'reinforcement',
    iterations: 1000,
    learningRate: 0.001
  },
  memory: {
    hierarchical: true,
    maxSize: 1000,
    retentionPolicy: 'lru'
  },
  social: {
    enableSlaves: false,
    maxSlaves: 5,
    enableCoWorkers: false
  }
};

/**
 * ClawCellConfig Component
 */
export const ClawCellConfig: React.FC<ClawCellConfigProps> = ({
  config: initialConfig,
  onConfigChange,
  onSave,
  onCancel,
  readOnly = false,
  showAdvanced = false,
  className = ''
}) => {
  const [config, setConfig] = useState<ClawCellConfiguration>(initialConfig || DEFAULT_CONFIG);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'trigger' | 'equipment' | 'advanced'>('basic');

  /**
   * Update config field
   */
  const updateConfig = <K extends keyof ClawCellConfiguration>(
    field: K,
    value: ClawCellConfiguration[K]
  ) => {
    const updated = { ...config, [field]: value };
    setConfig(updated);
    onConfigChange(updated);
  };

  /**
   * Update nested field
   */
  const updateNestedField = <T extends keyof ClawCellConfiguration>(
    field: T,
    subField: string,
    value: unknown
  ) => {
    const fieldData = config[field] as Record<string, unknown> | undefined;
    const updated = {
      ...config,
      [field]: { ...(fieldData || {}), [subField]: value }
    };
    setConfig(updated);
    onConfigChange(updated);
  };

  /**
   * Toggle equipment slot
   */
  const toggleEquipment = (slot: EquipmentSlot) => {
    const slotInfo = EQUIPMENT_SLOTS.find(s => s.slot === slot);
    if (slotInfo?.required) {
      return; // Can't toggle required slots
    }

    const updated = {
      ...config,
      equipment: config.equipment.includes(slot)
        ? config.equipment.filter(s => s !== slot)
        : [...config.equipment, slot]
    };
    setConfig(updated);
    onConfigChange(updated);
  };

  /**
   * Validate configuration
   */
  const validateConfig = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!config.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!config.purpose.trim()) {
      newErrors.purpose = 'Purpose is required';
    }
    if (config.trigger.type === 'periodic' && !config.trigger.interval) {
      newErrors.interval = 'Interval is required for periodic triggers';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle save
   */
  const handleSave = () => {
    if (validateConfig()) {
      onSave();
    }
  };

  /**
   * Get equipment slots by category
   */
  const getEquipmentByCategory = (category: string) => {
    return EQUIPMENT_SLOTS.filter(slot => slot.category === category);
  };

  return (
    <div className={`claw-cell-config ${className}`}>
      {/* Header */}
      <div className="claw-config-header">
        <h2>Configure Claw Agent</h2>
        <p className="claw-config-subtitle">
          Set up your AI-powered cellular agent
        </p>
      </div>

      {/* Tabs */}
      <div className="claw-config-tabs">
        <button
          className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          Basic
        </button>
        <button
          className={`tab-button ${activeTab === 'trigger' ? 'active' : ''}`}
          onClick={() => setActiveTab('trigger')}
        >
          Trigger
        </button>
        <button
          className={`tab-button ${activeTab === 'equipment' ? 'active' : ''}`}
          onClick={() => setActiveTab('equipment')}
        >
          Equipment
        </button>
        {showAdvanced && (
          <button
            className={`tab-button ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            Advanced
          </button>
        )}
      </div>

      {/* Content */}
      <div className="claw-config-content">
        {/* Basic Tab */}
        {activeTab === 'basic' && (
          <div className="config-tab">
            {/* Name */}
            <div className="form-group">
              <label htmlFor="claw-name">Agent Name *</label>
              <input
                id="claw-name"
                type="text"
                value={config.name}
                onChange={e => updateConfig('name', e.target.value)}
                disabled={readOnly}
                className="form-input"
                placeholder="My Claw Agent"
              />
              {errors.name && <div className="error-message">{errors.name}</div>}
            </div>

            {/* Purpose */}
            <div className="form-group">
              <label htmlFor="claw-purpose">Purpose *</label>
              <textarea
                id="claw-purpose"
                value={config.purpose}
                onChange={e => updateConfig('purpose', e.target.value)}
                disabled={readOnly}
                rows={4}
                className="form-textarea"
                placeholder="Describe what this agent should do..."
              />
              {errors.purpose && <div className="error-message">{errors.purpose}</div>}
            </div>

            {/* Provider and Model */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="claw-provider">Provider</label>
                <select
                  id="claw-provider"
                  value={config.provider}
                  onChange={e => updateConfig('provider', e.target.value as ModelProvider)}
                  disabled={readOnly}
                  className="form-select"
                >
                  {MODEL_PROVIDERS.map(provider => (
                    <option key={provider.provider} value={provider.provider}>
                      {provider.icon} {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="claw-model">Model</label>
                <select
                  id="claw-model"
                  value={config.model}
                  onChange={e => updateConfig('model', e.target.value)}
                  disabled={readOnly}
                  className="form-select"
                >
                  {MODEL_PROVIDERS.find(p => p.provider === config.provider)?.models.map(model => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Trigger Tab */}
        {activeTab === 'trigger' && (
          <div className="config-tab">
            <div className="form-group">
              <label htmlFor="trigger-type">Trigger Type</label>
              <select
                id="trigger-type"
                value={config.trigger.type}
                onChange={e => updateNestedField('trigger', 'type', e.target.value)}
                disabled={readOnly}
                className="form-select"
              >
                <option value="manual">Manual (on-demand)</option>
                <option value="data">Data-driven (watch cells)</option>
                <option value="periodic">Periodic (scheduled)</option>
                <option value="event">Event-driven</option>
              </select>
            </div>

            {config.trigger.type === 'periodic' && (
              <div className="form-group">
                <label htmlFor="trigger-interval">Interval (milliseconds)</label>
                <input
                  id="trigger-interval"
                  type="number"
                  value={config.trigger.interval || ''}
                  onChange={e =>
                    updateNestedField('trigger', 'interval', parseInt(e.target.value))
                  }
                  disabled={readOnly}
                  className="form-input"
                  placeholder="5000"
                  min={100}
                />
                {errors.interval && <div className="error-message">{errors.interval}</div>}
              </div>
            )}

            {config.trigger.type === 'data' && (
              <div className="form-group">
                <label htmlFor="trigger-source">Data Source</label>
                <input
                  id="trigger-source"
                  type="text"
                  value={config.trigger.dataSource || ''}
                  onChange={e => updateNestedField('trigger', 'dataSource', e.target.value)}
                  disabled={readOnly}
                  className="form-input"
                  placeholder="A1:B10"
                />
              </div>
            )}

            {config.trigger.type === 'event' && (
              <div className="form-group">
                <label htmlFor="trigger-event">Event Type</label>
                <input
                  id="trigger-event"
                  type="text"
                  value={config.trigger.eventType || ''}
                  onChange={e => updateNestedField('trigger', 'eventType', e.target.value)}
                  disabled={readOnly}
                  className="form-input"
                  placeholder="cell.changed"
                />
              </div>
            )}
          </div>
        )}

        {/* Equipment Tab */}
        {activeTab === 'equipment' && (
          <div className="config-tab">
            <div className="equipment-sections">
              {['memory', 'reasoning', 'coordination', 'integration'].map(category => (
                <div key={category} className="equipment-category">
                  <h3 className="category-title">
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </h3>
                  <div className="equipment-grid">
                    {getEquipmentByCategory(category).map(slot => (
                      <div
                        key={slot.slot}
                        className={`equipment-item ${
                          config.equipment.includes(slot.slot) ? 'equipped' : ''
                        } ${slot.required ? 'required' : ''}`}
                        onClick={() => !readOnly && toggleEquipment(slot.slot)}
                      >
                        <span className="equipment-icon">{slot.icon}</span>
                        <div className="equipment-info">
                          <div className="equipment-name">{slot.name}</div>
                          <div className="equipment-description">{slot.description}</div>
                          {slot.required && (
                            <div className="equipment-required">Required</div>
                          )}
                        </div>
                        <div className="equipment-check">
                          {config.equipment.includes(slot.slot) ? '✓' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Tab */}
        {showAdvanced && activeTab === 'advanced' && (
          <div className="config-tab">
            {/* Learning Strategy */}
            <div className="form-group">
              <label>Learning Strategy</label>
              <select
                value={config.learningStrategy?.type}
                onChange={e =>
                  updateNestedField('learningStrategy', 'type', e.target.value)
                }
                disabled={readOnly}
                className="form-select"
              >
                <option value="reinforcement">Reinforcement Learning</option>
                <option value="supervised">Supised Learning</option>
                <option value="unsupervised">Unsupervised Learning</option>
              </select>
            </div>

            {/* Social Configuration */}
            <div className="form-group">
              <label>Social Configuration</label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.social?.enableSlaves || false}
                  onChange={e =>
                    updateNestedField('social', 'enableSlaves', e.target.checked)
                  }
                  disabled={readOnly}
                />
                Enable slave spawning
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.social?.enableCoWorkers || false}
                  onChange={e =>
                    updateNestedField('social', 'enableCoWorkers', e.target.checked)
                  }
                  disabled={readOnly}
                />
                Enable co-worker collaboration
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {!readOnly && (
        <div className="claw-config-footer">
          <button className="button secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="button primary" onClick={handleSave}>
            Save Configuration
          </button>
        </div>
      )}
    </div>
  );
};

export default ClawCellConfig;
