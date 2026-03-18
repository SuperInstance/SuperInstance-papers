/**
 * SpreadsheetMoment Agent UI Package
 *
 * This package provides UI components for agentic features:
 * - Visual Thinking Panel: Real-time reasoning display
 * - HITL Buttons: Human-in-the-Loop approval controls
 * - Cell Renderers: Agent cell state indicators
 * - WebSocket Components: Real-time streaming
 *
 * @packageDocumentation
 */

// Components - export everything except useClawRealtime (exported from hooks)
export {
  ReasoningPanel,
  HITLButtons,
  AgentCellRenderer,
  ClawStatus,
  TemplateGallery,
  TemplateCard,
  TemplatePreview,
  TemplateEditor,
  ClawCellConfig,
  ClawCellEditor,
  ClawCellRenderer,
  ClawCellStatusBar,
  Tutorial,
  TutorialOverlay,
  TutorialStep,
  TutorialProgress,
  TutorialManager,
  ClawManagementPanel,
  useClawClient,
  useClawStats
} from './components';

export type {
  Template,
  TemplateCategory,
  ClawCellConfiguration,
  ClawCellState,
  ClawCellEditorProps,
  ClawCellRendererProps,
  ClawCellStatusBarProps,
  ClawCellConfigProps,
  EquipmentSlotInfo,
  ModelProviderInfo,
  TutorialConfig,
  TutorialStepConfig,
  ClawManagementPanelProps,
  UseClawClientConfig,
  UseClawClientReturn,
  UseClawStatsConfig,
  UseClawStatsReturn,
  ClawStatsData,
  AggregatedStats,
  RealtimeClawState
} from './components';

// Hooks - useClawRealtime is here
export * from './hooks';

// Providers
export * from './providers';
