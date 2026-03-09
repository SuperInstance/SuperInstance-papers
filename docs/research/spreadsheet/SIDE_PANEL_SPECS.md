# POLLN Spreadsheet Integration - Side Panel Implementation Specifications

**Version:** 1.0
**Date:** 2026-03-08
**Status:** Technical Implementation Guide
**Author:** Side Panel Implementation Researcher

---

## Executive Summary

This document provides comprehensive technical specifications for implementing the POLLN side panel interface in spreadsheet platforms (Excel and Google Sheets). The side panel serves as the primary UI for inspecting agents, monitoring colony activity, and accessing advanced features without disrupting spreadsheet workflow.

**Key Design Goals:**
1. **Non-Blocking:** Panel never blocks spreadsheet operations
2. **Real-Time:** WebSocket-based live updates with intelligent batching
3. **Platform-Native:** Feels native to Excel/Sheets while maintaining consistency
4. **Inspectable:** Every agent decision is traceable through the panel
5. **Performance:** < 100ms panel response time, < 500ms update propagation

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Office.js Side Panel Implementation](#2-officejs-side-panel-implementation)
3. [Google Sheets Sidebar Implementation](#3-google-sheets-sidebar-implementation)
4. [Panel UI Architecture](#4-panel-ui-architecture)
5. [Panel Components](#5-panel-components)
6. [Communication Protocol](#6-communication-protocol)
7. [State Management](#7-state-management)
8. [Code Structure](#8-code-structure)
9. [Testing Strategy](#9-testing-strategy)
10. [Performance Optimization](#10-performance-optimization)

---

## 1. Architecture Overview

### 1.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Spreadsheet Platform                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Excel Cells   │  │ Google Sheets   │  │   Spreadsheet   │ │
│  │   =AGENT()      │  │   =AGENT()      │  │   Formulas      │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼────────────────────┼────────────────────┼───────────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Side Panel Container                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Platform-Specific Container                            │    │
│  │  • Office.js TaskPane / Apps Script Sidebar            │    │
│  │  • Size: 350px width, resizable                        │    │
│  │  • Position: Right side, dismissible                   │    │
│  └────────────────────┬────────────────────────────────────┘    │
│                       ▼                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Shared Panel UI (React)                               │    │
│  │  • Agent Status View                                   │    │
│  │  • Inspector Pane                                      │    │
│  │  • Learning Progress                                   │    │
│  │  • Cost Dashboard                                      │    │
│  │  • Settings                                            │    │
│  └────────────────────┬────────────────────────────────────┘    │
└───────────────────────┼──────────────────────────────────────────┘
                        │ WebSocket + HTTP
┌───────────────────────▼──────────────────────────────────────────┐
│                    POLLN API Server                              │
│  • WebSocket connections for real-time updates                   │
│  • REST API for queries and commands                             │
│  • Agent lifecycle management                                    │
│  • State synchronization                                         │
└───────────────────────────────────────────────────────────────────┘
```

### 1.2 Panel States

```
┌─────────────────────────────────────────────────────────────┐
│                      Panel Lifecycle                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CLOSED ──► OPENING ──► LOADING ──► READY                   │
│    ▲                                    │                   │
│    │                                    ▼                   │
│    └───────────────────────────── UPDATING ◄────────────────┘
│                                    │
│                                    ▼
│                                 ERROR
│                                    │
│                                    ▼
│                                CLOSED
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Design Constraints

| Constraint | Excel | Google Sheets | Rationale |
|------------|-------|---------------|-----------|
| **Min Width** | 280px | 280px | Usable mobile width |
| **Default Width** | 350px | 350px | Balance content & workspace |
| **Max Width** | 600px | 600px | Don't overwhelm spreadsheet |
| **Height** | Full viewport | Full viewport | Maximum content visibility |
| **Resizable** | Yes | Yes (limited) | User preference |
| **Collapsible** | Yes | Yes | Workspace management |
| **Dismissible** | Yes | Yes | Not forced on user |
| **Z-Index** | Platform default | Platform default | Avoid conflicts |
| **Background** | White/transparent | White/transparent | Match spreadsheet theme |

---

## 2. Office.js Side Panel Implementation

### 2.1 Task Pane Registration

```typescript
// src/spreadsheet/excel/taskpane.ts
import * as Office from 'office-js';

export interface TaskPaneConfig {
  id: string;
  title: string;
  width: number;
  height: number;
  position: 'right' | 'left';
}

export class ExcelTaskPaneManager {
  private config: TaskPaneConfig;
  private pane: Office.AddinDetails | null = null;

  constructor(config: Partial<TaskPaneConfig> = {}) {
    this.config = {
      id: 'POLLN.SidePanel',
      title: 'POLLN Agents',
      width: 350,
      height: undefined, // Full height
      position: 'right',
      ...config,
    };
  }

  /**
   * Register the side panel with Office.js
   */
  async register(): Promise<void> {
    await Office.onReady((info) => {
      if (info.host === Office.HostType.Excel) {
        this.initializePanel();
      }
    });
  }

  /**
   * Initialize the task pane
   */
  private initializePanel(): void {
    Office.addin.setStartupBehavior(Office.StartupBehavior.load);

    // Register the task pane
    Office.context.document.taskPanes.add({
      id: this.config.id,
      title: this.config.title,
      url: this.getPanelURL(),
      width: this.config.width,
      height: this.config.height,
      position: this.config.position,
      canClose: true,
      canResize: true,
    });
  }

  /**
   * Get the URL for the task pane HTML
   */
  private getPanelURL(): string {
    // Development: Local server
    if (process.env.NODE_ENV === 'development') {
      return 'https://localhost:3000/taskpane.html';
    }
    // Production: CDN
    return 'https://cdn.polln.ai/excel/taskpane.html';
  }

  /**
   * Show the task pane
   */
  async show(): Promise<void> {
    await Office.context.document.taskPanes.getById(this.config.id).show();
  }

  /**
   * Hide the task pane
   */
  async hide(): Promise<void> {
    await Office.context.document.taskPanes.getById(this.config.id).hide();
  }

  /**
   * Check if panel is visible
   */
  async isVisible(): Promise<boolean> {
    const pane = Office.context.document.taskPanes.getById(this.config.id);
    return pane.isVisible;
  }
}
```

### 2.2 Communication Between Panel and Spreadsheet

```typescript
// src/spreadsheet/excel/panel-bridge.ts
import * as Office from 'office-js';

export interface PanelMessage {
  type: 'fromPanel' | 'fromSpreadsheet';
  action: string;
  payload: unknown;
  timestamp: number;
}

export class ExcelPanelBridge {
  private messageQueue: PanelMessage[] = [];
  private messageHandlers: Map<string, (payload: unknown) => void> = new Map();

  constructor() {
    this.initializeMessageHandler();
  }

  /**
   * Initialize message handler for panel communication
   */
  private initializeMessageHandler(): void {
    // Listen for messages from the panel
    Office.context.document.addHandlerAsync(
      Office.EventType.DialogMessageReceived,
      this.handleMessageFromPanel.bind(this)
    );

    // Listen for selection changes in spreadsheet
    Office.context.document.addHandlerAsync(
      Office.EventType.DocumentSelectionChanged,
      this.handleSelectionChange.bind(this)
    );
  }

  /**
   * Handle message from panel
   */
  private handleMessageFromPanel(args: { message: string }): void {
    try {
      const message: PanelMessage = JSON.parse(args.message);
      const handler = this.messageHandlers.get(message.action);

      if (handler) {
        handler(message.payload);
      } else {
        console.warn(`No handler for action: ${message.action}`);
      }
    } catch (error) {
      console.error('Failed to parse panel message:', error);
    }
  }

  /**
   * Handle selection change in spreadsheet
   */
  private handleSelectionChange(): void {
    Office.run(async (context) => {
      const range = context.workbook.getSelectedRange();
      await context.sync();

      const address = range.address;
      const value = range.values;

      // Send to panel
      this.sendMessage('selectionChanged', { address, value });
    });
  }

  /**
   * Register a message handler
   */
  on(action: string, handler: (payload: unknown) => void): void {
    this.messageHandlers.set(action, handler);
  }

  /**
   * Send message to panel
   */
  async sendMessage(action: string, payload: unknown): Promise<void> {
    const message: PanelMessage = {
      type: 'fromSpreadsheet',
      action,
      payload,
      timestamp: Date.now(),
    };

    // Store in message queue for panel to poll
    this.messageQueue.push(message);

    // Notify panel via storage
    await this.storeMessage(message);
  }

  /**
   * Store message in CustomXMLPart for panel to retrieve
   */
  private async storeMessage(message: PanelMessage): Promise<void> {
    Office.context.document.customXmlParts.addAsync(
      JSON.stringify(message),
      (result) => {
        if (result.status === Office.AsyncResultStatus.Failed) {
          console.error('Failed to store message:', result.error);
        }
      }
    );
  }

  /**
   * Get pending messages
   */
  getPendingMessages(): PanelMessage[] {
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    return messages;
  }
}
```

### 2.3 State Persistence Across Sessions

```typescript
// src/spreadsheet/excel/state-persistence.ts
import * as Office from 'office-js';

export interface PanelState {
  version: string;
  width: number;
  selectedAgentId: string | null;
  collapsedSections: string[];
  lastUpdate: number;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    updatesEnabled: boolean;
    notificationsEnabled: boolean;
  };
}

export class ExcelStatePersistence {
  private readonly STORAGE_KEY = 'POLLN.PanelState';
  private currentState: PanelState;

  constructor() {
    this.currentState = this.getDefaultState();
  }

  /**
   * Get default panel state
   */
  private getDefaultState(): PanelState {
    return {
      version: '1.0.0',
      width: 350,
      selectedAgentId: null,
      collapsedSections: [],
      lastUpdate: Date.now(),
      preferences: {
        theme: 'auto',
        updatesEnabled: true,
        notificationsEnabled: true,
      },
    };
  }

  /**
   * Load state from spreadsheet document
   */
  async load(): Promise<PanelState> {
    return new Promise((resolve, reject) => {
      Office.context.document.customXmlParts.getByNamespaceAsync(
        'https://polln.ai/state',
        (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            const parts = result.value;
            if (parts.length > 0) {
              parts.get(0).getXmlAsync((xmlResult) => {
                if (xmlResult.status === Office.AsyncResultStatus.Succeeded) {
                  try {
                    const state = JSON.parse(xmlResult.value);
                    this.currentState = { ...this.getDefaultState(), ...state };
                    resolve(this.currentState);
                  } catch (error) {
                    console.error('Failed to parse state:', error);
                    resolve(this.getDefaultState());
                  }
                } else {
                  resolve(this.getDefaultState());
                }
              });
            } else {
              resolve(this.getDefaultState());
            }
          } else {
            reject(result.error);
          }
        }
      );
    });
  }

  /**
   * Save state to spreadsheet document
   */
  async save(state: Partial<PanelState>): Promise<void> {
    this.currentState = {
      ...this.currentState,
      ...state,
      lastUpdate: Date.now(),
    };

    return new Promise((resolve, reject) => {
      // Remove old state
      Office.context.document.customXmlParts.getByNamespaceAsync(
        'https://polln.ai/state',
        (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            // Delete existing parts
            result.value.forEach((part) => {
              part.deleteAsync();
            });
          }

          // Add new state
          Office.context.document.customXmlParts.addAsync(
            JSON.stringify(this.currentState),
            (addResult) => {
              if (addResult.status === Office.AsyncResultStatus.Succeeded) {
                resolve();
              } else {
                reject(addResult.error);
              }
            }
          );
        }
      );
    });
  }

  /**
   * Get current state
   */
  getState(): PanelState {
    return { ...this.currentState };
  }
}
```

### 2.4 Size Constraints and Responsiveness

```typescript
// src/spreadsheet/excel/responsive-adapter.ts
import * as Office from 'office-js';

export interface SizeConstraints {
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  step: number; // Resize increment
}

export class ExcelResponsiveAdapter {
  private constraints: SizeConstraints = {
    minWidth: 280,
    maxWidth: 600,
    defaultWidth: 350,
    step: 10,
  };

  /**
   * Handle panel resize
   */
  async handleResize(newWidth: number): Promise<void> {
    // Clamp to constraints
    const clampedWidth = Math.max(
      this.constraints.minWidth,
      Math.min(this.constraints.maxWidth, newWidth)
    );

    // Round to nearest step
    const steppedWidth = Math.round(clampedWidth / this.constraints.step) * this.constraints.step;

    // Apply resize
    await Office.context.document.taskPanes.getById('POLLN.SidePanel').resize(steppedWidth);

    // Notify panel of new size
    this.notifyPanelResize(steppedWidth);
  }

  /**
   * Notify panel of size change
   */
  private notifyPanelResize(width: number): void {
    // Post message to panel iframe
    const panel = document.getElementById('POLLN.SidePanel') as HTMLIFrameElement;
    if (panel && panel.contentWindow) {
      panel.contentWindow.postMessage(
        {
          type: 'resize',
          width,
        },
        '*'
      );
    }
  }

  /**
   * Get optimal width for current content
   */
  getOptimalWidth(contentWidth: number): number {
    const padding = 40; // Side padding
    const totalWidth = contentWidth + padding;

    return Math.max(
      this.constraints.minWidth,
      Math.min(this.constraints.maxWidth, totalWidth)
    );
  }
}
```

---

## 3. Google Sheets Sidebar Implementation

### 3.1 Sidebar Registration

```typescript
// src/spreadsheet/sheets/sidebar.ts
// Note: This is Apps Script code, deployed to Google Apps Script

export interface SidebarConfig {
  title: string;
  width: number;
  height: number;
}

export class SheetsSidebarManager {
  private config: SidebarConfig;

  constructor(config: Partial<SidebarConfig> = {}) {
    this.config = {
      title: 'POLLN Agents',
      width: 350,
      height: undefined, // Auto height
      ...config,
    };
  }

  /**
   * Show the sidebar
   */
  show(): void {
    const html = HtmlService.createHtmlOutputFromFile('sidebar')
      .setTitle(this.config.title)
      .setWidth(this.config.width);

    if (this.config.height) {
      html.setHeight(this.config.height);
    }

    SpreadsheetApp.getUi().showSidebar(html);
  }

  /**
   * Get the sidebar HTML template
   */
  getHTML(): string {
    // Development: Local server
    if (this.isDevelopment()) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <base target="_top">
            <script src="https://localhost:3000/sidebar.js"></script>
            <link rel="stylesheet" href="https://localhost:3000/sidebar.css">
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>
      `;
    }

    // Production: CDN
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <base target="_top">
          <script src="https://cdn.polln.ai/sheets/sidebar.js"></script>
          <link rel="stylesheet" href="https://cdn.polln.ai/sheets/sidebar.css">
        </head>
        <body>
          <div id="root"></div>
        </body>
      </html>
    `;
  }

  /**
   * Check if in development mode
   */
  private isDevelopment(): boolean {
    // Check for development flag in script properties
    const props = PropertiesService.getScriptProperties();
    return props.getProperty('DEVELOPMENT') === 'true';
  }
}

// Global function for sidebar menu
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('POLLN')
    .addItem('Show Agent Panel', 'showSidebar')
    .addItem('Hide Agent Panel', 'hideSidebar')
    .addSeparator()
    .addItem('Configure', 'showSettings')
    .addToUi();
}

function showSidebar() {
  const manager = new SheetsSidebarManager();
  manager.show();
}

function hideSidebar() {
  // Google Sheets doesn't have a native hide sidebar API
  // We can only show a different sidebar or close it manually
}

function showSettings() {
  // Show settings dialog
  const html = HtmlService.createHtmlOutputFromFile('settings')
    .setTitle('POLLN Settings')
    .setWidth(400)
    .setHeight(300);

  SpreadsheetApp.getUi().showModalDialog(html, 'Settings');
}
```

### 3.2 HtmlService Panel UI

```html
<!-- src/spreadsheet/sheets/sidebar.html -->
<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>POLLN Agents</title>

    <!-- Styles -->
    <link rel="stylesheet" href="https://cdn.polln.ai/sheets/sidebar.css">

    <!-- Polyfills for older browsers -->
    <script src="https://polyfill.io/v3/polyfill.min.js?features=es6,fetch"></script>
  </head>
  <body>
    <!-- React root -->
    <div id="root"></div>

    <!-- Scripts -->
    <script src="https://cdn.polln.ai/sheets/sidebar.js"></script>

    <!-- Google Apps Script bridge -->
    <script>
      // Initialize Google Apps Script bridge
      window.google = window.google || {};
      window.google.script = window.google.script || {
        run: (functionName, ...args) => {
          return new Promise((resolve, reject) => {
            google.script.run
              .withSuccessHandler(resolve)
              .withFailureHandler(reject)
              [functionName](...args);
          });
        }
      };

      // Initialize panel
      window.POLLN_PANEL.init({
        platform: 'google-sheets',
        bridge: window.google.script,
      });
    </script>
  </body>
</html>
```

### 3.3 google.script.run Communication

```typescript
// src/spreadsheet/sheets/sidebar-bridge.ts
// Note: This runs in the sidebar context

export interface SheetsMessage {
  type: string;
  action: string;
  payload: unknown;
  timestamp: number;
}

export class SheetsSidebarBridge {
  private messageHandlers: Map<string, (payload: unknown) => void> = new Map();
  private messageBuffer: SheetsMessage[] = [];
  private pollInterval: number | null = null;

  constructor() {
    this.initializePolling();
  }

  /**
   * Initialize polling for messages from spreadsheet
   */
  private initializePolling(): void {
    // Poll every 100ms for messages
    this.pollInterval = window.setInterval(() => {
      this.pollMessages();
    }, 100) as unknown as number;
  }

  /**
   * Poll for messages from spreadsheet
   */
  private async pollMessages(): Promise<void> {
    try {
      const messages = await this.invokeServerFunction<string[]>('getPendingMessages');

      if (messages && messages.length > 0) {
        messages.forEach((messageStr) => {
          const message: SheetsMessage = JSON.parse(messageStr);
          this.handleMessage(message);
        });

        // Clear messages
        await this.invokeServerFunction('clearMessages');
      }
    } catch (error) {
      console.error('Failed to poll messages:', error);
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: SheetsMessage): void {
    const handler = this.messageHandlers.get(message.action);
    if (handler) {
      handler(message.payload);
    }
  }

  /**
   * Register message handler
   */
  on(action: string, handler: (payload: unknown) => void): void {
    this.messageHandlers.set(action, handler);
  }

  /**
   * Send message to spreadsheet
   */
  async sendMessage(action: string, payload: unknown): Promise<void> {
    const message: SheetsMessage = {
      type: 'fromPanel',
      action,
      payload,
      timestamp: Date.now(),
    };

    // Buffer message
    this.messageBuffer.push(message);

    // Flush if buffer is full
    if (this.messageBuffer.length >= 10) {
      await this.flushMessages();
    }
  }

  /**
   * Flush buffered messages to spreadsheet
   */
  private async flushMessages(): Promise<void> {
    if (this.messageBuffer.length === 0) return;

    try {
      await this.invokeServerFunction('receiveMessages', this.messageBuffer);
      this.messageBuffer = [];
    } catch (error) {
      console.error('Failed to flush messages:', error);
    }
  }

  /**
   * Invoke server-side Apps Script function
   */
  private async invokeServerFunction<T>(functionName: string, ...args: unknown[]): Promise<T> {
    return new Promise((resolve, reject) => {
      (window as any).google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        [functionName](...args);
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
    }
    this.flushMessages();
  }
}
```

### 3.4 State Persistence (PropertiesService)

```typescript
// src/spreadsheet/sheets/state-persistence.ts
// Note: This is Apps Script code (server-side)

export interface SheetsPanelState {
  version: string;
  width: number;
  selectedAgentId: string | null;
  collapsedSections: string[];
  lastUpdate: number;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    updatesEnabled: boolean;
    notificationsEnabled: boolean;
  };
}

export class SheetsStatePersistence {
  private readonly STORAGE_KEY = 'POLLN.PanelState';

  /**
   * Load state from document properties
   */
  load(): SheetsPanelState {
    const props = PropertiesService.getDocumentProperties();
    const stateJson = props.getProperty(this.STORAGE_KEY);

    if (stateJson) {
      try {
        return JSON.parse(stateJson);
      } catch (error) {
        console.error('Failed to parse state:', error);
        return this.getDefaultState();
      }
    }

    return this.getDefaultState();
  }

  /**
   * Save state to document properties
   */
  save(state: Partial<SheetsPanelState>): void {
    const currentState = this.load();
    const newState = {
      ...currentState,
      ...state,
      lastUpdate: Date.now(),
    };

    const props = PropertiesService.getDocumentProperties();
    props.setProperty(this.STORAGE_KEY, JSON.stringify(newState));
  }

  /**
   * Get default state
   */
  private getDefaultState(): SheetsPanelState {
    return {
      version: '1.0.0',
      width: 350,
      selectedAgentId: null,
      collapsedSections: [],
      lastUpdate: Date.now(),
      preferences: {
        theme: 'auto',
        updatesEnabled: true,
        notificationsEnabled: true,
      },
    };
  }

  /**
   * Clear all state
   */
  clear(): void {
    const props = PropertiesService.getDocumentProperties();
    props.deleteProperty(this.STORAGE_KEY);
  }
}

// Server-side functions for sidebar
function getPanelState(): string {
  const persistence = new SheetsStatePersistence();
  return JSON.stringify(persistence.load());
}

function savePanelState(stateJson: string): void {
  const persistence = new SheetsStatePersistence();
  const state = JSON.parse(stateJson);
  persistence.save(state);
}

function clearPanelState(): void {
  const persistence = new SheetsStatePersistence();
  persistence.clear();
}
```

---

## 4. Panel UI Architecture

### 4.1 UI Framework Selection

**Recommendation: React with TypeScript**

**Rationale:**
- ✅ Component-based architecture matches panel structure
- ✅ Strong TypeScript integration for type safety
- ✅ Large ecosystem for state management, routing, etc.
- ✅ Good performance with proper optimization
- ✅ Easy to test
- ✅ Familiar to most frontend developers

**Alternatives Considered:**
- Vue.js: Simpler but less TypeScript support
- Svelte: Excellent performance but smaller ecosystem
- Vanilla JS: Too complex for this level of interactivity

### 4.2 State Management

**Recommendation: Zustand**

```typescript
// src/panel/store/index.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Types
export interface AgentState {
  id: string;
  cellRef: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  result?: unknown;
  error?: string;
  lastUpdate: number;
}

export interface ColonyStats {
  totalAgents: number;
  activeAgents: number;
  completedTasks: number;
  cacheHits: number;
  cacheMisses: number;
  estimatedCost: number;
}

export interface PanelStore {
  // UI State
  isPanelOpen: boolean;
  selectedAgentId: string | null;
  activeTab: 'agents' | 'inspector' | 'learning' | 'cost' | 'settings';
  collapsedSections: string[];

  // Agent State
  agents: Map<string, AgentState>;
  colonyStats: ColonyStats | null;

  // Connection State
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Actions
  setPanelOpen: (open: boolean) => void;
  setSelectedAgent: (agentId: string | null) => void;
  setActiveTab: (tab: PanelStore['activeTab']) => void;
  toggleSection: (section: string) => void;

  // Agent Actions
  updateAgent: (agentId: string, update: Partial<AgentState>) => void;
  removeAgent: (agentId: string) => void;
  selectAgent: (agentId: string) => void;

  // Colony Actions
  updateColonyStats: (stats: ColonyStats) => void;

  // Connection Actions
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;

  // Reset
  reset: () => void;
}

// Create store
export const usePanelStore = create<PanelStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        isPanelOpen: true,
        selectedAgentId: null,
        activeTab: 'agents',
        collapsedSections: [],

        agents: new Map(),
        colonyStats: null,

        isConnected: false,
        isConnecting: false,
        connectionError: null,

        // Actions
        setPanelOpen: (open) => set({ isPanelOpen: open }),

        setSelectedAgent: (agentId) => set({ selectedAgentId: agentId }),

        setActiveTab: (tab) => set({ activeTab: tab }),

        toggleSection: (section) => {
          const { collapsedSections } = get();
          const isCollapsed = collapsedSections.includes(section);

          set({
            collapsedSections: isCollapsed
              ? collapsedSections.filter((s) => s !== section)
              : [...collapsedSections, section],
          });
        },

        updateAgent: (agentId, update) => {
          const { agents } = get();
          const existing = agents.get(agentId);

          if (existing) {
            agents.set(agentId, { ...existing, ...update, lastUpdate: Date.now() });
          } else {
            agents.set(agentId, {
              id: agentId,
              cellRef: '',
              status: 'idle',
              progress: 0,
              lastUpdate: Date.now(),
              ...update,
            });
          }

          set({ agents: new Map(agents) });
        },

        removeAgent: (agentId) => {
          const { agents } = get();
          agents.delete(agentId);
          set({ agents: new Map(agents) });
        },

        selectAgent: (agentId) => {
          set({ selectedAgentId: agentId, activeTab: 'inspector' });
        },

        updateColonyStats: (stats) => set({ colonyStats: stats }),

        setConnected: (connected) => set({ isConnected: connected }),

        setConnecting: (connecting) => set({ isConnecting: connecting }),

        setConnectionError: (error) => set({ connectionError: error }),

        reset: () => {
          set({
            selectedAgentId: null,
            activeTab: 'agents',
            agents: new Map(),
            colonyStats: null,
            connectionError: null,
          });
        },
      }),
      {
        name: 'polln-panel-storage',
        // Only persist UI state, not ephemeral agent state
        partialize: (state) => ({
          isPanelOpen: state.isPanelOpen,
          activeTab: state.activeTab,
          collapsedSections: state.collapsedSections,
        }),
      }
    ),
    { name: 'POLLN Panel Store' }
  )
);
```

### 4.3 Real-Time Communication

```typescript
// src/panel/services/websocket.ts
import { io, Socket } from 'socket.io-client';
import { usePanelStore } from '../store';

export interface WebSocketConfig {
  url: string;
  token: string;
  colonyId: string;
  autoReconnect: boolean;
  reconnectInterval: number;
}

export class PanelWebSocketService {
  private socket: Socket | null = null;
  private config: WebSocketConfig;
  private reconnectTimer: number | null = null;
  private messageQueue: unknown[] = [];

  constructor(config: WebSocketConfig) {
    this.config = {
      autoReconnect: true,
      reconnectInterval: 5000,
      ...config,
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    usePanelStore.getState().setConnecting(true);

    this.socket = io(this.config.url, {
      auth: { token: this.config.token },
      reconnection: this.config.autoReconnect,
      reconnectionDelay: this.config.reconnectInterval,
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', this.handleConnect.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));
    this.socket.on('error', this.handleError.bind(this));

    // Colony events
    this.socket.on('event:colony', this.handleColonyEvent.bind(this));

    // Agent events
    this.socket.on('event:agent', this.handleAgentEvent.bind(this));

    // Stats events
    this.socket.on('event:stats', this.handleStatsEvent.bind(this));
  }

  /**
   * Handle connection
   */
  private handleConnect(): void {
    console.log('WebSocket connected');

    usePanelStore.getState().setConnecting(false);
    usePanelStore.getState().setConnected(true);
    usePanelStore.getState().setConnectionError(null);

    // Flush queued messages
    this.flushMessageQueue();

    // Subscribe to colony events
    this.subscribe();
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(reason: string): void {
    console.log('WebSocket disconnected:', reason);

    usePanelStore.getState().setConnected(false);

    // Schedule reconnect if auto-reconnect is enabled
    if (this.config.autoReconnect && reason !== 'io client disconnect') {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle error
   */
  private handleError(error: Error): void {
    console.error('WebSocket error:', error);

    usePanelStore.getState().setConnecting(false);
    usePanelStore.getState().setConnectionError(error.message);
  }

  /**
   * Handle colony event
   */
  private handleColonyEvent(data: unknown): void {
    console.log('Colony event:', data);
    // Handle colony-specific events
  }

  /**
   * Handle agent event
   */
  private handleAgentEvent(data: { agentId: string; eventType: string; data: unknown }): void {
    const { agentId, eventType, data: eventData } = data;

    switch (eventType) {
      case 'status:changed':
        usePanelStore.getState().updateAgent(agentId, {
          status: eventData.status,
        });
        break;

      case 'progress:updated':
        usePanelStore.getState().updateAgent(agentId, {
          progress: eventData.progress,
        });
        break;

      case 'result:ready':
        usePanelStore.getState().updateAgent(agentId, {
          status: 'completed',
          result: eventData.result,
          progress: 100,
        });
        break;

      case 'error:occurred':
        usePanelStore.getState().updateAgent(agentId, {
          status: 'error',
          error: eventData.error,
        });
        break;
    }
  }

  /**
   * Handle stats event
   */
  private handleStatsEvent(data: unknown): void {
    usePanelStore.getState().updateColonyStats(data as any);
  }

  /**
   * Subscribe to colony events
   */
  private subscribe(): void {
    if (!this.socket) return;

    this.socket.emit('subscribe:colony', {
      colonyId: this.config.colonyId,
      events: ['agent:spawned', 'agent:despawned', 'agent:updated'],
    });
  }

  /**
   * Send message
   */
  send(event: string, data: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      // Queue message for later
      this.messageQueue.push({ event, data });
    }
  }

  /**
   * Flush message queue
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.socket?.connected) {
      const message = this.messageQueue.shift() as { event: string; data: unknown };
      this.socket.emit(message.event, message.data);
    }
  }

  /**
   * Schedule reconnect
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;

    this.reconnectTimer = window.setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.connect();
      this.reconnectTimer = null;
    }, this.config.reconnectInterval) as unknown as number;
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.socket?.disconnect();
    this.socket = null;

    usePanelStore.getState().setConnected(false);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}
```

### 4.4 Responsive Design Patterns

```typescript
// src/panel/hooks/use-responsive.ts
import { useEffect, useState } from 'react';

export interface Breakpoints {
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export const defaultBreakpoints: Breakpoints = {
  sm: 280,
  md: 350,
  lg: 450,
  xl: 600,
};

export function useResponsive(breakpoints: Breakpoints = defaultBreakpoints) {
  const [width, setWidth] = useState<number>(defaultBreakpoints.md);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<keyof Breakpoints>('md');

  useEffect(() => {
    // Listen for resize events from parent
    const handleResize = (event: MessageEvent) => {
      if (event.data.type === 'resize') {
        setWidth(event.data.width);
      }
    };

    window.addEventListener('message', handleResize);

    // Get initial width from parent
    window.parent.postMessage({ type: 'requestSize' }, '*');

    return () => {
      window.removeEventListener('message', handleResize);
    };
  }, []);

  useEffect(() => {
    // Determine current breakpoint
    if (width < breakpoints.sm) {
      setCurrentBreakpoint('sm');
    } else if (width < breakpoints.md) {
      setCurrentBreakpoint('md');
    } else if (width < breakpoints.lg) {
      setCurrentBreakpoint('lg');
    } else {
      setCurrentBreakpoint('xl');
    }
  }, [width, breakpoints]);

  return {
    width,
    breakpoint: currentBreakpoint,
    is: {
      sm: width >= breakpoints.sm,
      md: width >= breakpoints.md,
      lg: width >= breakpoints.lg,
      xl: width >= breakpoints.xl,
    },
  };
}

// Usage example
function ResponsivePanel() {
  const { breakpoint, is } = useResponsive();

  return (
    <div className={`panel panel-${breakpoint}`}>
      {is.sm ? <SmallLayout /> : is.md ? <MediumLayout /> : <LargeLayout />}
    </div>
  );
}
```

---

## 5. Panel Components

### 5.1 Agent Status Indicator

```typescript
// src/panel/components/AgentStatusIndicator.tsx
import React from 'react';
import { usePanelStore } from '../store';

export interface AgentStatusIndicatorProps {
  agentId: string;
  showLabel?: boolean;
  compact?: boolean;
}

export const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({
  agentId,
  showLabel = true,
  compact = false,
}) => {
  const agent = usePanelStore((state) => state.agents.get(agentId));

  if (!agent) return null;

  const statusConfig = {
    idle: {
      icon: '⚪',
      label: 'Idle',
      color: '#9CA3AF',
      bgColor: '#F9FAFB',
    },
    running: {
      icon: '🔄',
      label: 'Running',
      color: '#3B82F6',
      bgColor: '#DBEAFE',
    },
    completed: {
      icon: '✅',
      label: 'Complete',
      color: '#10B981',
      bgColor: '#D1FAE5',
    },
    error: {
      icon: '❌',
      label: 'Error',
      color: '#EF4444',
      bgColor: '#FEE2E2',
    },
  };

  const config = statusConfig[agent.status];

  if (compact) {
    return (
      <div
        className="agent-status-compact"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 6px',
          borderRadius: '4px',
          backgroundColor: config.bgColor,
          fontSize: '12px',
          color: config.color,
        }}
      >
        <span className="status-icon">{config.icon}</span>
        {showLabel && <span className="status-label">{config.label}</span>}
      </div>
    );
  }

  return (
    <div
      className="agent-status-full"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 10px',
        borderRadius: '6px',
        backgroundColor: config.bgColor,
        border: `1px solid ${config.color}`,
      }}
    >
      <span
        className="status-icon"
        style={{
          fontSize: agent.status === 'running' ? '16px' : '14px',
          animation: agent.status === 'running' ? 'spin 1s linear infinite' : 'none',
        }}
      >
        {config.icon}
      </span>

      {showLabel && (
        <span
          className="status-label"
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: config.color,
          }}
        >
          {config.label}
        </span>
      )}

      {agent.status === 'running' && (
        <div
          className="progress-bar"
          style={{
            flex: 1,
            height: '4px',
            backgroundColor: '#E5E7EB',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${agent.progress}%`,
              height: '100%',
              backgroundColor: config.color,
              transition: 'width 300ms ease-out',
            }}
          />
        </div>
      )}

      {agent.status === 'error' && agent.error && (
        <span
          className="error-message"
          style={{
            fontSize: '11px',
            color: '#DC2626',
            maxWidth: '150px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {agent.error}
        </span>
      )}
    </div>
  );
};
```

### 5.2 Inspector View

```typescript
// src/panel/components/InspectorView.tsx
import React, { useState } from 'react';
import { usePanelStore } from '../store';

export interface InspectorViewProps {
  agentId: string;
}

export const InspectorView: React.FC<InspectorViewProps> = ({ agentId }) => {
  const agent = usePanelStore((state) => state.agents.get(agentId));
  const [activeTab, setActiveTab] = useState<'details' | 'trace' | 'a2a'>('details');

  if (!agent) {
    return (
      <div className="inspector-empty">
        <p>Select an agent to inspect</p>
      </div>
    );
  }

  return (
    <div className="inspector-view">
      {/* Header */}
      <div className="inspector-header">
        <h3>Agent Inspector</h3>
        <span className="agent-id">{agent.id}</span>
      </div>

      {/* Tabs */}
      <div className="inspector-tabs">
        <button
          className={activeTab === 'details' ? 'active' : ''}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button
          className={activeTab === 'trace' ? 'active' : ''}
          onClick={() => setActiveTab('trace')}
        >
          Trace
        </button>
        <button
          className={activeTab === 'a2a' ? 'active' : ''}
          onClick={() => setActiveTab('a2a')}
        >
          A2A Packages
        </button>
      </div>

      {/* Content */}
      <div className="inspector-content">
        {activeTab === 'details' && <AgentDetails agent={agent} />}
        {activeTab === 'trace' && <ExecutionTrace agentId={agent.id} />}
        {activeTab === 'a2a' && <A2APackages agentId={agent.id} />}
      </div>
    </div>
  );
};

// Agent Details Component
const AgentDetails: React.FC<{ agent: AgentState }> = ({ agent }) => {
  return (
    <div className="agent-details">
      <div className="detail-row">
        <span className="label">Cell Reference:</span>
        <span className="value">{agent.cellRef}</span>
      </div>

      <div className="detail-row">
        <span className="label">Status:</span>
        <span className="value">
          <AgentStatusIndicator agentId={agent.id} compact />
        </span>
      </div>

      <div className="detail-row">
        <span className="label">Last Update:</span>
        <span className="value">
          {new Date(agent.lastUpdate).toLocaleTimeString()}
        </span>
      </div>

      {agent.result && (
        <div className="detail-row">
          <span className="label">Result:</span>
          <pre className="value result-value">{JSON.stringify(agent.result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

// Execution Trace Component
const ExecutionTrace: React.FC<{ agentId: string }> = ({ agentId }) => {
  const [trace, setTrace] = useState<ExecutionStep[]>([]);

  // Fetch trace from API
  React.useEffect(() => {
    // API call to fetch execution trace
    // fetchExecutionTrace(agentId).then(setTrace);
  }, [agentId]);

  return (
    <div className="execution-trace">
      {trace.length === 0 ? (
        <p>No execution trace available</p>
      ) : (
        <ul className="trace-list">
          {trace.map((step, index) => (
            <li key={index} className="trace-step">
              <span className="step-timestamp">
                {new Date(step.timestamp).toLocaleTimeString()}
              </span>
              <span className="step-action">{step.action}</span>
              <span className="step-details">{step.details}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// A2A Packages Component
const A2APackages: React.FC<{ agentId: string }> = ({ agentId }) => {
  const [packages, setPackages] = useState<A2APackage[]>([]);

  // Fetch packages from API
  React.useEffect(() => {
    // API call to fetch A2A packages
    // fetchA2APackages(agentId).then(setPackages);
  }, [agentId]);

  return (
    <div className="a2a-packages">
      {packages.length === 0 ? (
        <p>No A2A packages recorded</p>
      ) : (
        <ul className="package-list">
          {packages.map((pkg) => (
            <li key={pkg.id} className="package-item">
              <span className="package-id">{pkg.id}</span>
              <span className="package-type">{pkg.type}</span>
              <span className="package-timestamp">
                {new Date(pkg.timestamp).toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

### 5.3 Learning Progress

```typescript
// src/panel/components/LearningProgress.tsx
import React, { useEffect, useState } from 'react';

export interface LearningProgressProps {
  agentId?: string;
  showDetails?: boolean;
}

export const LearningProgress: React.FC<LearningProgressProps> = ({
  agentId,
  showDetails = false,
}) => {
  const [progress, setProgress] = useState<LearningMetrics | null>(null);

  useEffect(() => {
    // Fetch learning progress
    if (agentId) {
      fetchAgentLearningProgress(agentId).then(setProgress);
    } else {
      fetchColonyLearningProgress().then(setProgress);
    }
  }, [agentId]);

  if (!progress) {
    return <div className="loading">Loading learning progress...</div>;
  }

  return (
    <div className="learning-progress">
      {/* Overall Progress */}
      <div className="progress-overview">
        <div className="progress-bar-container">
          <div className="progress-label">
            <span>Learning Progress</span>
            <span className="percentage">{progress.overallProgress}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress.overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metrics */}
      {showDetails && (
        <div className="progress-metrics">
          <div className="metric">
            <span className="metric-label">Episodes</span>
            <span className="metric-value">{progress.episodesCompleted}</span>
          </div>

          <div className="metric">
            <span className="metric-label">Reward</span>
            <span className="metric-value">{progress.averageReward.toFixed(3)}</span>
          </div>

          <div className="metric">
            <span className="metric-label">Loss</span>
            <span className="metric-value">{progress.loss.toFixed(4)}</span>
          </div>

          <div className="metric">
            <span className="metric-label">Accuracy</span>
            <span className="metric-value">{`${(progress.accuracy * 100).toFixed(1)}%`}</span>
          </div>
        </div>
      )}

      {/* Recent Rewards Chart */}
      {showDetails && progress.recentRewards.length > 0 && (
        <div className="recent-rewards">
          <h4>Recent Rewards</h4>
          <div className="rewards-chart">
            {progress.recentRewards.map((reward, index) => (
              <div
                key={index}
                className="reward-bar"
                style={{
                  height: `${Math.abs(reward) * 100}%`,
                  backgroundColor: reward >= 0 ? '#10B981' : '#EF4444',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Types
interface LearningMetrics {
  overallProgress: number;
  episodesCompleted: number;
  averageReward: number;
  loss: number;
  accuracy: number;
  recentRewards: number[];
}

// API functions
async function fetchAgentLearningProgress(agentId: string): Promise<LearningMetrics> {
  const response = await fetch(`/api/agents/${agentId}/learning`);
  return response.json();
}

async function fetchColonyLearningProgress(): Promise<LearningMetrics> {
  const response = await fetch('/api/colony/learning');
  return response.json();
}
```

### 5.4 Cost Dashboard

```typescript
// src/panel/components/CostDashboard.tsx
import React, { useEffect, useState } from 'react';

export interface CostDashboardProps {
  timeframe?: 'session' | 'today' | 'week' | 'month';
}

export const CostDashboard: React.FC<CostDashboardProps> = ({
  timeframe = 'session',
}) => {
  const [costs, setCosts] = useState<CostMetrics | null>(null);

  useEffect(() => {
    fetchCostMetrics(timeframe).then(setCosts);
  }, [timeframe]);

  if (!costs) {
    return <div className="loading">Loading cost metrics...</div>;
  }

  return (
    <div className="cost-dashboard">
      {/* Total Cost */}
      <div className="total-cost">
        <span className="label">Total Cost</span>
        <span className="value">${costs.totalCost.toFixed(4)}</span>
      </div>

      {/* Cost Breakdown */}
      <div className="cost-breakdown">
        <h4>Cost Breakdown</h4>

        <div className="cost-item">
          <span className="item-label">LLM API Calls</span>
          <span className="item-value">${costs.llmCost.toFixed(4)}</span>
          <span className="item-count">{costs.llmCalls} calls</span>
        </div>

        <div className="cost-item">
          <span className="item-label">Cache Hits</span>
          <span className="item-value saved">${costs.cacheSaved.toFixed(4)}</span>
          <span className="item-count">{costs.cacheHits} hits</span>
        </div>

        <div className="cost-item">
          <span className="item-label">Dreaming Cycles</span>
          <span className="item-value">${costs.dreamingCost.toFixed(4)}</span>
          <span className="item-count">{costs.dreamingCycles} cycles</span>
        </div>
      </div>

      {/* Cache Efficiency */}
      <div className="cache-efficiency">
        <h4>Cache Efficiency</h4>
        <div className="efficiency-meter">
          <div
            className="efficiency-fill"
            style={{ width: `${costs.cacheEfficiency * 100}%` }}
          />
          <span className="efficiency-value">
            {(costs.cacheEfficiency * 100).toFixed(1)}%
          </span>
        </div>
        <p className="efficiency-savings">
          You've saved ${costs.cacheSaved.toFixed(4)} through caching!
        </p>
      </div>

      {/* Cost Trend */}
      <div className="cost-trend">
        <h4>Cost Trend</h4>
        <div className="trend-chart">
          {costs.costOverTime.map((point, index) => (
            <div
              key={index}
              className="trend-point"
              style={{
                left: `${(index / costs.costOverTime.length) * 100}%`,
                bottom: `${(point.cost / costs.maxCost) * 100}%`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Types
interface CostMetrics {
  totalCost: number;
  llmCost: number;
  llmCalls: number;
  cacheSaved: number;
  cacheHits: number;
  cacheEfficiency: number;
  dreamingCost: number;
  dreamingCycles: number;
  costOverTime: { timestamp: number; cost: number }[];
  maxCost: number;
}

// API function
async function fetchCostMetrics(timeframe: string): Promise<CostMetrics> {
  const response = await fetch(`/api/costs?timeframe=${timeframe}`);
  return response.json();
}
```

### 5.5 Settings Panel

```typescript
// src/panel/components/SettingsPanel.tsx
import React from 'react';
import { usePanelStore } from '../store';

export const SettingsPanel: React.FC = () => {
  const { collapsedSections, toggleSection } = usePanelStore();

  return (
    <div className="settings-panel">
      <h3>Settings</h3>

      {/* Appearance */}
      <CollapsibleSection
        id="appearance"
        title="Appearance"
        isCollapsed={collapsedSections.includes('appearance')}
        onToggle={() => toggleSection('appearance')}
      >
        <SettingItem
          id="theme"
          label="Theme"
          type="select"
          options={['light', 'dark', 'auto']}
          defaultValue="auto"
        />

        <SettingItem
          id="fontSize"
          label="Font Size"
          type="select"
          options={['small', 'medium', 'large']}
          defaultValue="medium"
        />
      </CollapsibleSection>

      {/* Notifications */}
      <CollapsibleSection
        id="notifications"
        title="Notifications"
        isCollapsed={collapsedSections.includes('notifications')}
        onToggle={() => toggleSection('notifications')}
      >
        <SettingItem
          id="notificationsEnabled"
          label="Enable Notifications"
          type="checkbox"
          defaultValue={true}
        />

        <SettingItem
          id="soundEnabled"
          label="Sound Effects"
          type="checkbox"
          defaultValue={false}
        />
      </CollapsibleSection>

      {/* Performance */}
      <CollapsibleSection
        id="performance"
        title="Performance"
        isCollapsed={collapsedSections.includes('performance')}
        onToggle={() => toggleSection('performance')}
      >
        <SettingItem
          id="updateInterval"
          label="Update Interval"
          type="select"
          options={['100ms', '500ms', '1s', '5s']}
          defaultValue="500ms"
        />

        <SettingItem
          id="enableCache"
          label="Enable Caching"
          type="checkbox"
          defaultValue={true}
        />

        <SettingItem
          id="batchUpdates"
          label="Batch Updates"
          type="checkbox"
          defaultValue={true}
        />
      </CollapsibleSection>

      {/* Advanced */}
      <CollapsibleSection
        id="advanced"
        title="Advanced"
        isCollapsed={collapsedSections.includes('advanced')}
        onToggle={() => toggleSection('advanced')}
      >
        <SettingItem
          id="debugMode"
          label="Debug Mode"
          type="checkbox"
          defaultValue={false}
        />

        <SettingItem
          id="verboseLogging"
          label="Verbose Logging"
          type="checkbox"
          defaultValue={false}
        />

        <div className="setting-actions">
          <button onClick={clearCache}>Clear Cache</button>
          <button onClick={resetSettings}>Reset Settings</button>
        </div>
      </CollapsibleSection>
    </div>
  );
};

// Collapsible Section Component
const CollapsibleSection: React.FC<{
  id: string;
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ id, title, isCollapsed, onToggle, children }) => {
  return (
    <div className={`collapsible-section ${isCollapsed ? 'collapsed' : ''}`}>
      <button className="section-header" onClick={onToggle}>
        <span className="section-title">{title}</span>
        <span className="section-toggle">{isCollapsed ? '▶' : '▼'}</span>
      </button>
      <div className="section-content">{children}</div>
    </div>
  );
};

// Setting Item Component
const SettingItem: React.FC<{
  id: string;
  label: string;
  type: 'checkbox' | 'select' | 'text' | 'number';
  options?: string[];
  defaultValue?: any;
}> = ({ id, label, type, options, defaultValue }) => {
  return (
    <div className="setting-item">
      <label htmlFor={id}>{label}</label>

      {type === 'checkbox' && (
        <input
          type="checkbox"
          id={id}
          defaultChecked={defaultValue}
          onChange={(e) => updateSetting(id, e.target.checked)}
        />
      )}

      {type === 'select' && options && (
        <select
          id={id}
          defaultValue={defaultValue}
          onChange={(e) => updateSetting(id, e.target.value)}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}

      {type === 'text' && (
        <input
          type="text"
          id={id}
          defaultValue={defaultValue}
          onChange={(e) => updateSetting(id, e.target.value)}
        />
      )}

      {type === 'number' && (
        <input
          type="number"
          id={id}
          defaultValue={defaultValue}
          onChange={(e) => updateSetting(id, parseFloat(e.target.value))}
        />
      )}
    </div>
  );
};

// Actions
function clearCache() {
  // Clear cache logic
}

function resetSettings() {
  // Reset settings logic
}

function updateSetting(id: string, value: any) {
  // Update setting logic
}
```

---

## 6. Communication Protocol

### 6.1 Panel ↔ Spreadsheet Sync

```typescript
// src/panel/services/sheet-sync.ts
export interface SheetSyncMessage {
  type: 'sync' | 'update' | 'query';
  source: 'panel' | 'spreadsheet';
  payload: {
    cellRef?: string;
    agentId?: string;
    data?: unknown;
  };
  timestamp: number;
}

export class SheetSyncService {
  private syncQueue: SheetSyncMessage[] = [];
  private syncInterval: number | null = null;

  constructor(private bridge: PanelBridge) {
    this.startSync();
  }

  /**
   * Start sync interval
   */
  private startSync(): void {
    this.syncInterval = window.setInterval(() => {
      this.flushSyncQueue();
    }, 100) as unknown as number;
  }

  /**
   * Send sync message to spreadsheet
   */
  sync(cellRef: string, data: unknown): void {
    const message: SheetSyncMessage = {
      type: 'sync',
      source: 'panel',
      payload: { cellRef, data },
      timestamp: Date.now(),
    };

    this.syncQueue.push(message);
  }

  /**
   * Flush sync queue
   */
  private flushSyncQueue(): void {
    if (this.syncQueue.length === 0) return;

    const messages = [...this.syncQueue];
    this.syncQueue = [];

    messages.forEach((message) => {
      this.bridge.sendMessage('sheet:sync', message);
    });
  }

  /**
   * Stop sync
   */
  stop(): void {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
    }
    this.flushSyncQueue();
  }
}
```

### 6.2 Agent Lifecycle Events

```typescript
// src/panel/services/agent-events.ts
export interface AgentEvent {
  type: 'spawn' | 'update' | 'complete' | 'error' | 'despawn';
  agentId: string;
  cellRef: string;
  timestamp: number;
  data?: {
    result?: unknown;
    error?: string;
    progress?: number;
  };
}

export class AgentEventService {
  private eventHandlers: Map<string, (event: AgentEvent) => void> = new Map();

  constructor(private wsService: PanelWebSocketService) {
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for agent events from WebSocket
    // Already handled in WebSocket service
  }

  /**
   * Handle agent spawned
   */
  onAgentSpawned(callback: (event: AgentEvent) => void): void {
    this.eventHandlers.set('spawn', callback);
  }

  /**
   * Handle agent updated
   */
  onAgentUpdated(callback: (event: AgentEvent) => void): void {
    this.eventHandlers.set('update', callback);
  }

  /**
   * Handle agent completed
   */
  onAgentCompleted(callback: (event: AgentEvent) => void): void {
    this.eventHandlers.set('complete', callback);
  }

  /**
   * Handle agent error
   */
  onAgentError(callback: (event: AgentEvent) => void): void {
    this.eventHandlers.set('error', callback);
  }

  /**
   * Handle agent despawned
   */
  onAgentDespawned(callback: (event: AgentEvent) => void): void {
    this.eventHandlers.set('despawn', callback);
  }
}
```

### 6.3 Error Handling and Display

```typescript
// src/panel/services/error-handler.ts
export interface PanelError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: number;
  recoverable: boolean;
}

export class ErrorHandlerService {
  private errorHandlers: Map<string, (error: PanelError) => void> = new Map();

  /**
   * Handle error
   */
  handleError(error: PanelError): void {
    // Log error
    console.error('[Panel Error]', error);

    // Show notification
    this.showNotification(error);

    // Call registered handler
    const handler = this.errorHandlers.get(error.code);
    if (handler) {
      handler(error);
    }
  }

  /**
   * Show error notification
   */
  private showNotification(error: PanelError): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.innerHTML = `
      <div class="error-icon">⚠️</div>
      <div class="error-content">
        <div class="error-message">${error.message}</div>
        ${error.recoverable ? '<button class="error-retry">Retry</button>' : ''}
      </div>
    `;

    // Add to DOM
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);

    // Add retry handler
    if (error.recoverable) {
      const retryButton = notification.querySelector('.error-retry') as HTMLButtonElement;
      retryButton?.addEventListener('click', () => {
        this.retry(error);
        notification.remove();
      });
    }
  }

  /**
   * Retry failed operation
   */
  private retry(error: PanelError): void {
    // Retry logic based on error code
    console.log('Retrying operation:', error.code);
  }

  /**
   * Register error handler
   */
  onError(code: string, handler: (error: PanelError) => void): void {
    this.errorHandlers.set(code, handler);
  }
}
```

### 6.4 Performance Optimization

```typescript
// src/panel/services/performance.ts
export class PerformanceOptimizer {
  private updateQueue: Map<string, unknown> = new Map();
  private updateTimer: number | null = null;
  private readonly batchInterval = 100; // ms

  /**
   * Queue update for batching
   */
  queueUpdate(key: string, value: unknown): void {
    this.updateQueue.set(key, value);

    if (this.updateTimer === null) {
      this.updateTimer = window.setTimeout(() => {
        this.flushUpdates();
      }, this.batchInterval) as unknown as number;
    }
  }

  /**
   * Flush queued updates
   */
  private flushUpdates(): void {
    if (this.updateQueue.size === 0) {
      this.updateTimer = null;
      return;
    }

    const updates = Object.fromEntries(this.updateQueue);
    this.updateQueue.clear();

    // Apply updates
    this.applyUpdates(updates);

    this.updateTimer = null;
  }

  /**
   * Apply batched updates
   */
  private applyUpdates(updates: Record<string, unknown>): void {
    // Apply updates to store
    Object.entries(updates).forEach(([key, value]) => {
      // Update logic
    });
  }

  /**
   * Debounce function
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: number | null = null;

    return (...args: Parameters<T>) => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }

      timeout = window.setTimeout(() => {
        func(...args);
        timeout = null;
      }, wait) as unknown as number;
    };
  }

  /**
   * Throttle function
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }
}
```

---

## 7. State Management

### 7.1 State Synchronization

```typescript
// src/panel/store/sync.ts
import { usePanelStore } from './index';

export class StoreSyncService {
  private syncInterval: number | null = null;
  private lastSync: number = 0;
  private readonly syncIntervalMs = 1000; // 1 second

  constructor(private wsService: PanelWebSocketService) {
    this.startSync();
  }

  /**
   * Start sync loop
   */
  private startSync(): void {
    this.syncInterval = window.setInterval(() => {
      this.sync();
    }, this.syncIntervalMs) as unknown as number;
  }

  /**
   * Sync state with server
   */
  private sync(): void {
    const state = usePanelStore.getState();

    // Only sync if there are changes
    if (Date.now() - this.lastSync > this.syncIntervalMs) {
      this.wsService.send('sync:state', {
        agents: Array.from(state.agents.entries()),
        selectedAgentId: state.selectedAgentId,
      });

      this.lastSync = Date.now();
    }
  }

  /**
   * Stop sync
   */
  stop(): void {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
    }
  }
}
```

### 7.2 State Persistence

```typescript
// src/panel/store/persistence.ts
import { usePanelStore } from './index';

export class StorePersistenceService {
  private readonly STORAGE_KEY = 'polln-panel-state';

  constructor() {
    this.load();
    this.setupAutoSave();
  }

  /**
   * Load state from storage
   */
  private load(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const state = JSON.parse(stored);
        usePanelStore.setState(state);
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }

  /**
   * Save state to storage
   */
  private save(): void {
    try {
      const state = usePanelStore.getState();
      const toSave = {
        activeTab: state.activeTab,
        collapsedSections: state.collapsedSections,
        // Don't save ephemeral agent state
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  /**
   * Setup auto-save
   */
  private setupAutoSave(): void {
    // Save on state changes
    usePanelStore.subscribe(
      (state) => ({
        activeTab: state.activeTab,
        collapsedSections: state.collapsedSections,
      }),
      () => {
        this.save();
      }
    );
  }

  /**
   * Clear stored state
   */
  clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
```

---

## 8. Code Structure

### 8.1 File Organization

```
src/
├── panel/                          # Side panel code
│   ├── components/                 # React components
│   │   ├── AgentStatusIndicator.tsx
│   │   ├── InspectorView.tsx
│   │   ├── LearningProgress.tsx
│   │   ├── CostDashboard.tsx
│   │   ├── SettingsPanel.tsx
│   │   └── index.ts
│   ├── hooks/                      # Custom React hooks
│   │   ├── use-responsive.ts
│   │   ├── use-agent-updates.ts
│   │   └── index.ts
│   ├── services/                   # Services
│   │   ├── websocket.ts
│   │   ├── sheet-sync.ts
│   │   ├── agent-events.ts
│   │   ├── error-handler.ts
│   │   └── performance.ts
│   ├── store/                      # State management
│   │   ├── index.ts
│   │   ├── sync.ts
│   │   └── persistence.ts
│   ├── utils/                      # Utilities
│   │   ├── formatting.ts
│   │   ├── validation.ts
│   │   └── constants.ts
│   ├── types/                      # TypeScript types
│   │   ├── components.ts
│   │   ├── store.ts
│   │   └── api.ts
│   ├── styles/                     # CSS styles
│   │   ├── variables.css
│   │   ├── components.css
│   │   └── themes.css
│   ├── App.tsx                     # Root component
│   ├── index.tsx                   # Entry point
│   └── panel.html                  # HTML template
│
├── spreadsheet/                    # Platform integration
│   ├── bridge/                     # Bridge layer
│   │   ├── ISpreadsheetBridge.ts
│   │   └── ...
│   ├── excel/                      # Excel-specific
│   │   ├── taskpane.ts
│   │   ├── panel-bridge.ts
│   │   ├── state-persistence.ts
│   │   └── responsive-adapter.ts
│   ├── sheets/                     # Google Sheets-specific
│   │   ├── sidebar.ts
│   │   ├── sidebar-bridge.ts
│   │   └── state-persistence.ts
│   └── shared/                     # Shared code
│       ├── types.ts
│       ├── utils.ts
│       └── constants.ts
│
└── api/                            # Existing POLLN API
    └── ...
```

### 8.2 Shared Code Between Excel/Sheets

```typescript
// src/spreadsheet/shared/types.ts
export interface SpreadsheetPlatform {
  type: 'excel' | 'google-sheets';
  version: string;
}

export interface PanelConfig {
  platform: SpreadsheetPlatform;
  width: number;
  height: number;
  position: 'left' | 'right';
}

export interface PanelState {
  config: PanelConfig;
  selectedAgentId: string | null;
  activeTab: string;
  collapsedSections: string[];
}
```

### 8.3 Platform-Specific Adapters

```typescript
// src/spreadsheet/shared/adapters.ts
export interface PlatformAdapter {
  registerPanel(): Promise<void>;
  showPanel(): Promise<void>;
  hidePanel(): Promise<void>;
  sendMessage(action: string, payload: unknown): Promise<void>;
  onMessage(action: string, handler: (payload: unknown) => void): void;
  loadState(): Promise<PanelState>;
  saveState(state: Partial<PanelState>): Promise<void>;
}

// Excel adapter
export class ExcelAdapter implements PlatformAdapter {
  // Excel-specific implementation
}

// Google Sheets adapter
export class SheetsAdapter implements PlatformAdapter {
  // Sheets-specific implementation
}
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
// src/panel/components/__tests__/AgentStatusIndicator.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AgentStatusIndicator } from '../AgentStatusIndicator';
import { usePanelStore } from '../../store';

describe('AgentStatusIndicator', () => {
  beforeEach(() => {
    // Reset store before each test
    usePanelStore.setState({
      agents: new Map([
        ['agent-1', {
          id: 'agent-1',
          cellRef: 'A1',
          status: 'running',
          progress: 50,
          lastUpdate: Date.now(),
        }],
      ]),
    });
  });

  it('renders running status', () => {
    render(<AgentStatusIndicator agentId="agent-1" />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('renders compact view when prop is true', () => {
    const { container } = render(
      <AgentStatusIndicator agentId="agent-1" compact />
    );
    expect(container.querySelector('.agent-status-compact')).toBeInTheDocument();
  });

  it('shows progress when status is running', () => {
    render(<AgentStatusIndicator agentId="agent-1" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
```

### 9.2 Integration Tests

```typescript
// src/panel/__integration__/panel-integration.test.ts
import { render, waitFor } from '@testing-library/react';
import { PanelWebSocketService } from '../services/websocket';
import { App } from '../App';

describe('Panel Integration', () => {
  it('connects to WebSocket on mount', async () => {
    const mockWS = {
      connect: jest.fn(),
      isConnected: () => true,
    } as unknown as PanelWebSocketService;

    render(<App wsService={mockWS} />);

    await waitFor(() => {
      expect(mockWS.connect).toHaveBeenCalled();
    });
  });

  it('receives and displays agent updates', async () => {
    const { container } = render(<App />);

    // Simulate WebSocket message
    const wsMessage = {
      type: 'event:agent',
      data: {
        agentId: 'agent-1',
        eventType: 'status:changed',
        data: { status: 'completed' },
      },
    };

    // Trigger message handling
    // ...

    await waitFor(() => {
      expect(container.textContent).toContain('Complete');
    });
  });
});
```

### 9.3 E2E Tests

```typescript
// e2e/panel.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Side Panel', () => {
  test('opens panel and displays agents', async ({ page }) => {
    // Navigate to spreadsheet
    await page.goto('https://docs.google.com/spreadsheets/d/test');

    // Open panel
    await page.click('button[POLLN="show-panel"]');

    // Wait for panel to load
    await page.waitForSelector('.polln-panel');

    // Check agents are displayed
    const agents = await page.locator('.agent-item').count();
    expect(agents).toBeGreaterThan(0);
  });

  test('inspects agent on double-click', async ({ page }) => {
    // Open panel
    await page.click('button[POLLN="show-panel"]');

    // Double-click agent
    await page.dblclick('.agent-item:first-child');

    // Check inspector view is shown
    await expect(page.locator('.inspector-view')).toBeVisible();
    await expect(page.locator('.agent-details')).toBeVisible();
  });
});
```

---

## 10. Performance Optimization

### 10.1 Update Debouncing

```typescript
// Debounce rapid updates
const debouncedUpdate = useMemo(
  () => debounce((agentId: string, update: Partial<AgentState>) => {
    usePanelStore.getState().updateAgent(agentId, update);
  }, 100),
  []
);
```

### 10.2 Render Optimization

```typescript
// Use React.memo for expensive components
export const AgentList = React.memo(({ agents }: AgentListProps) => {
  // Component implementation
});

// Use virtualization for long lists
import { FixedSizeList } from 'react-window';

export const VirtualAgentList: React.FC<{ agents: AgentState[] }> = ({ agents }) => {
  return (
    <FixedSizeList
      height={600}
      itemCount={agents.length}
      itemSize={80}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <AgentItem agent={agents[index]} />
        </div>
      )}
    </FixedSizeList>
  );
};
```

### 10.3 Memory Management

```typescript
// Cleanup on unmount
useEffect(() => {
  const wsService = new PanelWebSocketService(config);
  wsService.connect();

  return () => {
    wsService.disconnect();
  };
}, []);

// Clear old agent data
useEffect(() => {
  const interval = setInterval(() => {
    const state = usePanelStore.getState();
    const now = Date.now();

    // Remove agents older than 1 hour
    state.agents.forEach((agent, id) => {
      if (now - agent.lastUpdate > 3600000) {
        state.removeAgent(id);
      }
    });
  }, 60000); // Check every minute

  return () => clearInterval(interval);
}, []);
```

---

## Appendix A: TypeScript Interfaces

```typescript
// Core Types
export interface AgentState {
  id: string;
  cellRef: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  result?: unknown;
  error?: string;
  lastUpdate: number;
}

export interface ColonyStats {
  totalAgents: number;
  activeAgents: number;
  completedTasks: number;
  cacheHits: number;
  cacheMisses: number;
  estimatedCost: number;
}

export interface PanelConfig {
  platform: 'excel' | 'google-sheets';
  width: number;
  height: number;
  position: 'left' | 'right';
}

export interface PanelState {
  config: PanelConfig;
  selectedAgentId: string | null;
  activeTab: string;
  collapsedSections: string[];
}

// Message Types
export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: number;
}

export interface SheetSyncMessage {
  type: 'sync' | 'update' | 'query';
  source: 'panel' | 'spreadsheet';
  payload: {
    cellRef?: string;
    agentId?: string;
    data?: unknown;
  };
  timestamp: number;
}

// Component Props
export interface AgentStatusIndicatorProps {
  agentId: string;
  showLabel?: boolean;
  compact?: boolean;
}

export interface InspectorViewProps {
  agentId: string;
}

export interface LearningProgressProps {
  agentId?: string;
  showDetails?: boolean;
}

export interface CostDashboardProps {
  timeframe?: 'session' | 'today' | 'week' | 'month';
}
```

---

## Appendix B: API Contracts

### B.1 WebSocket API

```typescript
// Client -> Server
interface ClientToServerEvents {
  'subscribe:colony': (data: { colonyId: string; events: string[] }) => void;
  'unsubscribe:colony': (data: { colonyId: string }) => void;
  'subscribe:agent': (data: { agentId: string; events: string[] }) => void;
  'unsubscribe:agent': (data: { agentId: string }) => void;
  'command:spawn': (data: { typeId: string; config?: unknown }) => void;
  'command:despawn': (data: { agentId: string }) => void;
  'query:stats': (data: { colonyId?: string }) => void;
  'sync:state': (data: { agents: [string, AgentState][]; selectedAgentId: string | null }) => void;
}

// Server -> Client
interface ServerToClientEvents {
  'event:colony': (data: { colonyId: string; eventType: string; data: unknown }) => void;
  'event:agent': (data: { agentId: string; colonyId: string; eventType: string; data: unknown }) => void;
  'event:stats': (data: ColonyStats) => void;
  'response:stats': (data: ColonyStats) => void;
  'response:agents': (data: AgentState[]) => void;
  'error': (data: { code: string; message: string }) => void;
}
```

### B.2 REST API

```typescript
// GET /api/colony/stats
interface GetColonyStatsResponse {
  totalAgents: number;
  activeAgents: number;
  completedTasks: number;
  cacheHits: number;
  cacheMisses: number;
  estimatedCost: number;
}

// GET /api/agents/:id
interface GetAgentResponse {
  id: string;
  cellRef: string;
  status: string;
  progress: number;
  result?: unknown;
  error?: string;
  lastUpdate: number;
}

// GET /api/agents/:id/trace
interface GetAgentTraceResponse {
  steps: ExecutionStep[];
}

// GET /api/agents/:id/a2a
interface GetAgentA2AResponse {
  packages: A2APackage[];
}

// GET /api/costs
interface GetCostsResponse {
  totalCost: number;
  llmCost: number;
  llmCalls: number;
  cacheSaved: number;
  cacheHits: number;
  cacheEfficiency: number;
  timeframe: string;
}

// GET /api/colony/learning
interface GetLearningProgressResponse {
  overallProgress: number;
  episodesCompleted: number;
  averageReward: number;
  loss: number;
  accuracy: number;
  recentRewards: number[];
}
```

---

## Appendix C: Platform-Specific Implementation Notes

### C.1 Excel Considerations

- **Desktop vs Online:** Desktop has full WebSocket support, Online has some limitations
- **Task Pane Size:** Minimum 280px width, recommended 350px
- **Custom XML Parts:** Limited to ~10MB per document
- **Performance:** Desktop is faster, Online has additional network latency
- **Authentication:** Uses Office.js identity API
- **Deployment:** AppSource or sideloading via manifest.xml

### C.2 Google Sheets Considerations

- **Sidebar Size:** Fixed width when set, limited resize capability
- **HtmlService:** Sandboxed, no direct DOM access to spreadsheet
- **PropertiesService:** Document properties limited to ~9KB per property
- **Performance:** Server-side execution, additional latency
- **Authentication:** Uses OAuth 2.0 via Apps Script
- **Deployment:** Marketplace or script URL sharing

### C.3 Shared Considerations

- **WebSocket Fallback:** Both platforms should support HTTP long-polling fallback
- **Offline Mode:** Panel should work offline with cached data
- **Cross-Origin:** Panel and API must handle CORS properly
- **Error Recovery:** Graceful degradation when API is unavailable
- **Rate Limiting:** Implement client-side rate limiting for API calls

---

## Conclusion

This specification provides a comprehensive technical foundation for implementing the POLLN side panel across Excel and Google Sheets platforms. The architecture prioritizes:

1. **Performance:** Sub-100ms panel response, intelligent update batching
2. **User Experience:** Non-blocking, responsive, inspectable
3. **Platform Native:** Feels at home in both Excel and Sheets
4. **Maintainability:** Clean separation of concerns, reusable components
5. **Scalability:** Efficient state management, memory-conscious design

The implementation follows modern best practices with React, TypeScript, and WebSockets, ensuring a robust and maintainable codebase that can evolve with the POLLN ecosystem.

---

**Document Status:** Complete
**Last Updated:** 2026-03-08
**Next Review:** After MVP implementation
