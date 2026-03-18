/**
 * Claw Cell Components
 *
 * Components for Claw cell type with configuration UI
 *
 * @packageDocumentation
 */

export { ClawCellConfig } from './ClawCellConfig';
export { ClawCellEditor } from './ClawCellEditor';
export { ClawCellRenderer } from './ClawCellRenderer';
export { ClawCellStatusBar } from './ClawCellStatusBar';
export { ClawManagementPanel, ClawAgentManager } from './ClawAgentManager';

// Type exports
export type {
  ClawCellConfiguration,
  ClawCellState,
  ClawCellEditorProps,
  ClawCellRendererProps,
  ClawCellStatusBarProps,
  ClawCellConfigProps,
  EquipmentSlotInfo,
  ModelProviderInfo,
  ClawAgentStatus,
  ClawManagementPanelProps,
  ClawUpdateEvent
} from './types';

// Re-export enums from agent-core for convenience
export {
  ClawState,
  ModelProvider,
  EquipmentSlot,
  TriggerType,
  LearningStrategy
} from './types';
