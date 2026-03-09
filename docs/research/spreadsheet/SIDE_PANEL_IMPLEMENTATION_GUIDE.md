# Side Panel Implementation - Quick Start Guide

**Companion Guide to SIDE_PANEL_SPECS.md**

---

## Overview

This guide provides a practical, step-by-step approach to implementing the POLLN side panel for spreadsheet integration. For complete technical specifications, architecture diagrams, and API contracts, refer to `SIDE_PANEL_SPECS.md`.

---

## 1. Implementation Priorities

### Phase 1: Foundation (Week 1-2)
- [x] Set up React + TypeScript project structure
- [x] Implement basic WebSocket service
- [x] Create Zustand store for state management
- [x] Build platform adapters (Excel/Sheets)
- [x] Implement state persistence

### Phase 2: Core Components (Week 3-4)
- [ ] AgentStatusIndicator component
- [ ] InspectorView component
- [ ] Agent list with virtualization
- [ ] Basic tab navigation
- [ ] Error handling and notifications

### Phase 3: Advanced Features (Week 5-6)
- [ ] LearningProgress component
- [ ] CostDashboard component
- [ ] SettingsPanel component
- [ ] Real-time updates optimization
- [ ] Performance monitoring

### Phase 4: Polish & Testing (Week 7-8)
- [ ] Responsive design refinement
- [ ] Accessibility improvements
- [ ] Unit tests (80% coverage)
- [ ] Integration tests
- [ ] E2E tests
- [ ] Performance optimization

---

## 2. Quick Start Commands

### Initialize Project

```bash
# Create panel directory
mkdir -p src/panel

# Install dependencies
npm install react react-dom
npm install zustand socket.io-client
npm install -D @types/react @types/react-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test

# Install additional UI dependencies
npm install lucide-react clsx tailwind-merge
```

### Development

```bash
# Start development server
npm run dev:panel

# Build for production
npm run build:panel

# Run tests
npm run test:panel
npm run test:panel:watch

# Run E2E tests
npm run test:e2e
```

---

## 3. Minimal Working Example

### 3.1 Basic Panel Structure

```typescript
// src/panel/App.tsx
import React from 'react';
import { usePanelStore } from './store';
import { AgentStatusIndicator } from './components/AgentStatusIndicator';

export const App: React.FC = () => {
  const { agents, selectedAgentId } = usePanelStore();

  return (
    <div className="polln-panel">
      <header>
        <h1>POLLN Agents</h1>
      </header>

      <main>
        {selectedAgentId ? (
          <AgentStatusIndicator agentId={selectedAgentId} />
        ) : (
          <p>Select an agent to inspect</p>
        )}

        <div className="agent-list">
          {Array.from(agents.values()).map((agent) => (
            <div key={agent.id} className="agent-item">
              <span>{agent.cellRef}</span>
              <AgentStatusIndicator agentId={agent.id} compact />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
```

### 3.2 Minimal Store Setup

```typescript
// src/panel/store/index.ts
import { create } from 'zustand';

interface AgentState {
  id: string;
  cellRef: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  lastUpdate: number;
}

interface PanelStore {
  agents: Map<string, AgentState>;
  selectedAgentId: string | null;
  updateAgent: (id: string, update: Partial<AgentState>) => void;
  selectAgent: (id: string) => void;
}

export const usePanelStore = create<PanelStore>((set) => ({
  agents: new Map(),
  selectedAgentId: null,

  updateAgent: (id, update) =>
    set((state) => {
      const agents = new Map(state.agents);
      const existing = agents.get(id);
      agents.set(id, { ...existing, ...update, lastUpdate: Date.now() });
      return { agents };
    }),

  selectAgent: (id) => set({ selectedAgentId: id }),
}));
```

### 3.3 Basic WebSocket Connection

```typescript
// src/panel/services/websocket.ts
import { io } from 'socket.io-client';
import { usePanelStore } from '../store';

export class PanelWebSocketService {
  private socket: any = null;

  connect(url: string, token: string) {
    this.socket = io(url, { auth: { token } });

    this.socket.on('connect', () => {
      console.log('Connected to POLLN server');
    });

    this.socket.on('event:agent', (data: any) => {
      usePanelStore.getState().updateAgent(data.agentId, {
        status: data.data.status,
        progress: data.data.progress,
      });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from POLLN server');
    });
  }

  disconnect() {
    this.socket?.disconnect();
  }
}
```

---

## 4. Platform-Specific Setup

### 4.1 Excel Task Pane

```xml
<!-- excel/manifest.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xmlns:bt="http://schemas.microsoft.com/office/officeappbasictypes/1.0"
           xmlns:ov="http://schemas.microsoft.com/office/taskpaneappversionoverrides"
           xsi:type="TaskPaneApp">

  <Id>YOUR_GUID_HERE</Id>
  <Version>1.0.0.0</Version>
  <ProviderName>POLLN</ProviderName>
  <DefaultLocale>en-US</DefaultLocale>
  <DisplayName DefaultValue="POLLN Agents" />
  <Description DefaultValue="Intelligent agents for spreadsheets" />

  <Hosts>
    <Host Name="Workbook" />
  </Hosts>

  <DefaultSettings>
    <SourceLocation DefaultValue="https://cdn.polln.ai/excel/taskpane.html" />
  </DefaultSettings>

  <Permissions>ReadWriteDocument</Permissions>

  <VersionOverrides xmlns="http://schemas.microsoft.com/office/taskpaneappversionoverrides" xsi:type="VersionOverridesV1_0">
    <Hosts>
      <Host xsi:type="Workbook">
        <DesktopFormFactor>
          <GetStarted>
            <Title resid="GetStarted.Title" />
            <Description resid="GetStarted.Description" />
            <LearnMoreUrl resid="GetStarted.LearnMoreUrl" />
          </GetStarted>
          <ExtensionPoint xsi:type="PrimaryCommandSurface">
            <OfficeTab id="TabHome">
              <Group id="CommandsGroup">
                <Label resid="CommandsGroup.Label" />
                <Icon>
                  <bt:Image size="16" resid="Icon.16x16" />
                  <bt:Image size="32" resid="Icon.32x32" />
                  <bt:Image size="80" resid="Icon.80x80" />
                </Icon>
                <Control xsi:type="Button" id="ShowPanel">
                  <Label resid="ShowPanel.Label" />
                  <Supertip>
                    <Title resid="ShowPanel.Title" />
                    <Description resid="ShowPanel.Description" />
                  </Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.16x16" />
                    <bt:Image size="32" resid="Icon.32x32" />
                  </Icon>
                  <Action xsi:type="ShowTaskpane">
                    <TaskpaneId>PanelTaskpane</TaskpaneId>
                    <SourceLocation resid="Panel.Url" />
                  </Action>
                </Control>
              </Group>
            </OfficeTab>
          </ExtensionPoint>
        </DesktopFormFactor>
      </Host>
    </Hosts>

    <Resources>
      <bt:Images>
        <bt:Image id="Icon.16x16" DefaultValue="https://cdn.polln.ai/icons/icon-16.png" />
        <bt:Image id="Icon.32x32" DefaultValue="https://cdn.polln.ai/icons/icon-32.png" />
        <bt:Image id="Icon.80x80" DefaultValue="https://cdn.polln.ai/icons/icon-80.png" />
      </bt:Images>
      <bt:Urls>
        <bt:Url id="Panel.Url" DefaultValue="https://cdn.polln.ai/excel/taskpane.html" />
        <bt:Url id="GetStarted.LearnMoreUrl" DefaultValue="https://polln.ai/docs" />
      </bt:Urls>
      <bt:ShortStrings>
        <bt:String id="GetStarted.Title" DefaultValue="POLLN Agents" />
        <bt:String id="CommandsGroup.Label" DefaultValue="POLLN" />
        <bt:String id="ShowPanel.Label" DefaultValue="Show Panel" />
        <bt:String id="ShowPanel.Title" DefaultValue="Open POLLN Side Panel" />
      </bt:ShortStrings>
      <bt:LongStrings>
        <bt:String id="GetStarted.Description" DefaultValue="Intelligent agents that learn and collaborate in your spreadsheet" />
        <bt:String id="ShowPanel.Description" DefaultValue="Open the POLLN side panel to inspect and manage agents" />
      </bt:LongStrings>
    </Resources>
  </VersionOverrides>
</OfficeApp>
```

### 4.2 Google Sheets Sidebar

```javascript
// sheets/Code.gs
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
  const html = HtmlService.createHtmlOutputFromFile('sidebar')
    .setTitle('POLLN Agents')
    .setWidth(350);

  SpreadsheetApp.getUi().showSidebar(html);
}

function hideSidebar() {
  // Google Sheets doesn't have native hide
  // Show empty sidebar instead
  const html = HtmlService.createHtmlOutput('Hidden');
  SpreadsheetApp.getUi().showSidebar(html);
}

function showSettings() {
  const html = HtmlService.createHtmlOutputFromFile('settings')
    .setTitle('POLLN Settings')
    .setWidth(400)
    .setHeight(300);

  SpreadsheetApp.getUi().showModalDialog(html, 'Settings');
}

// API bridge functions
function getPendingMessages() {
  const scriptProps = PropertiesService.getScriptProperties();
  const messages = scriptProps.getProperty('POLLN_MESSAGES');
  return messages ? JSON.parse(messages) : [];
}

function receiveMessages(messages) {
  // Process messages from panel
  messages.forEach(msg => {
    // Handle message
  });
}

function clearMessages() {
  const scriptProps = PropertiesService.getScriptProperties();
  scriptProps.deleteProperty('POLLN_MESSAGES');
}
```

```html
<!-- sheets/sidebar.html -->
<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <link rel="stylesheet" href="https://cdn.polln.ai/sheets/sidebar.css">
  </head>
  <body>
    <div id="root"></div>
    <script src="https://cdn.polln.ai/sheets/sidebar.js"></script>
  </body>
</html>
```

---

## 5. Key Implementation Patterns

### 5.1 Update Batching

```typescript
// Batch rapid updates to avoid render thrashing
const updateBatch = useRef<Map<string, Partial<AgentState>>>(new Map());

const flushUpdates = useCallback(() => {
  const updates = Array.from(updateBatch.current.entries());
  updateBatch.current.clear();

  updates.forEach(([agentId, update]) => {
    usePanelStore.getState().updateAgent(agentId, update);
  });
}, []);

useEffect(() => {
  const timer = setInterval(flushUpdates, 100);
  return () => clearInterval(timer);
}, [flushUpdates]);
```

### 5.2 Virtual Scrolling

```typescript
// Use react-window for long lists
import { FixedSizeList } from 'react-window';

const AgentList = () => {
  const agents = usePanelStore((state) => Array.from(state.agents.values()));

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

### 5.3 Error Boundaries

```typescript
// src/panel/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Panel error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Panel
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 6. Testing Checklist

### Unit Tests
- [ ] All components have tests
- [ ] Store actions tested
- [ ] Service methods tested
- [ ] Utility functions tested
- [ ] Error handling tested

### Integration Tests
- [ ] WebSocket connection tested
- [ ] Panel-store sync tested
- [ ] Component-store interaction tested
- [ ] Error recovery tested

### E2E Tests
- [ ] Panel opens/closes correctly
- [ ] Agent updates display correctly
- [ ] Inspector shows agent details
- [ ] Settings persist correctly
- [ ] Error states display correctly

### Performance Tests
- [ ] Panel renders in < 100ms
- [ ] Updates propagate in < 500ms
- [ ] Memory usage stable over time
- [ ] No memory leaks on unmount

---

## 7. Common Pitfalls

### Don't Do This ❌

```typescript
// Direct DOM manipulation
document.getElementById('agent-status').textContent = 'Running';

// Mutable state updates
const agents = usePanelStore.getState().agents;
agents.set(id, newAgent); // Won't trigger re-render

// Unbounded re-renders
useEffect(() => {
  updateAgent(); // Runs on every render
});
```

### Do This Instead ✅

```typescript
// React state updates
setAgentStatus('Running');

// Immutable updates
usePanelStore.getState().updateAgent(id, update);

// Proper dependencies
useEffect(() => {
  updateAgent();
}, [agentId]); // Only when agentId changes
```

---

## 8. Performance Metrics

### Target Metrics
- **Initial Render:** < 100ms
- **Update Propagation:** < 500ms
- **Panel Open:** < 200ms
- **Memory Usage:** < 50MB
- **Bundle Size:** < 500KB (gzipped)

### Monitoring
```typescript
// Add performance monitoring
useEffect(() => {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('[Performance]', entry.name, entry.duration);
    }
  });

  observer.observe({ entryTypes: ['measure', 'navigation'] });

  return () => observer.disconnect();
}, []);
```

---

## 9. Deployment

### Excel
```bash
# Build for production
npm run build:excel

# Upload to CDN
aws s3 sync dist/excel s3://cdn.polln.ai/excel

# Deploy to Office AppStore
# https://partner.microsoft.com/dashboard
```

### Google Sheets
```bash
# Build for production
npm run build:sheets

# Upload to CDN
aws s3 sync dist/sheets s3://cdn.polln.ai/sheets

# Deploy as Apps Script
clasp push
```

---

## 10. Next Steps

1. **Review** `SIDE_PANEL_SPECS.md` for complete technical details
2. **Set up** development environment with dependencies
3. **Implement** Phase 1 foundation components
4. **Test** basic WebSocket connectivity
5. **Iterate** through phases 2-4
6. **Deploy** to staging environment
7. **Gather** user feedback
8. **Refine** and optimize based on usage

---

## Resources

- **Office.js Documentation:** https://docs.microsoft.com/en-us/javascript/api/overview/
- **Google Apps Script:** https://developers.google.com/apps-script
- **React Documentation:** https://react.dev
- **Zustand Documentation:** https://zustand-demo.pmnd.rs
- **Socket.IO Documentation:** https://socket.io/docs/v4/

---

**Document Status:** Implementation Guide
**Last Updated:** 2026-03-08
**Maintained By:** Side Panel Implementation Team
