# Side Panel Architecture Diagrams

**Visual Documentation for POLLN Side Panel Implementation**

---

## 1. Overall System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER WORKSPACE                             │
│                                                                     │
│  ┌─────────────────────────────────────┐  ┌──────────────────────┐ │
│  │         SPREADSHEET AREA            │  │    SIDE PANEL        │ │
│  │                                     │  │                      │ │
│  │  ┌─────┬─────┬─────┬─────┐        │  │  ┌────────────────┐  │ │
│  │  │  A  │  B  │  C  │  D  │        │  │  │ Agent Status    │  │ │
│  │  ├─────┼─────┼─────┼─────┤        │  │  │                │  │ │
│  │  │=AG  │=AG  │  5  │=AG  │        │  │  │ 🔄 Running      │  │ │
│  │  │ENT() │ENT() │     │ENT() │        │  │  │ ████████░░ 80% │  │ │
│  │  ├─────┼─────┼─────┼─────┤        │  │  └────────────────┘  │ │
│  │  │  10 │  25 │  30 │  40 │        │  │                      │ │
│  │  └─────┴─────┴─────┴─────┘        │  │  ┌────────────────┐  │ │
│  │                                     │  │  │ Agent List     │  │ │
│  │  Selected: A2                      │  │  │                │  │ │
│  │  Double-click to inspect           │  │  │ • A2: Running  │  │ │
│  └─────────────────────────────────────┘  │  │ • B1: Complete │  │ │
│                                            │  │ • D1: Idle     │  │ │
│                                            │  └────────────────┘  │ │
│                                            │                      │ │
│                                            │  ┌────────────────┐  │ │
│                                            │  │ Inspector      │  │ │
│                                            │  │ (when selected)│  │ │
│                                            │  │                │  │ │
│                                            │  │ Cell: A2       │  │ │
│                                            │  │ Status: Running│  │ │
│                                            │  │ Progress: 80%  │  │ │
│                                            │  └────────────────┘  │ │
│                                            │                      │ │
│                                            └──────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    POLLN RUNTIME SERVER                             │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Agent      │  │   Colony     │  │  WebSocket   │             │
│  │  Lifecycle   │  │  Manager     │  │   Gateway    │             │
│  │              │  │              │  │              │             │
│  │  • Spawn     │  │  • Schedule  │  │  • Real-time │             │
│  │  • Execute   │  │  • Monitor   │  │  • Events    │             │
│  │  • Track     │  │  • Optimize  │  │  • Commands  │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                  │                  │                     │
│         └──────────────────┼──────────────────┘                     │
│                            │                                        │
│                   ┌────────▼────────┐                              │
│                   │  State Storage  │                              │
│                   │                │                              │
│                   │  • Agents       │                              │
│                   │  • History      │                              │
│                   │  • A2A Packages │                              │
│                   └─────────────────┘                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Panel Component Hierarchy

```
App (Root)
│
├── PanelContainer
│   ├── Header
│   │   ├── Title
│   │   ├── ConnectionStatus
│   │   └── Actions
│   │       ├── Refresh
│   │       ├── Settings
│   │       └── Close
│   │
│   ├── TabNavigation
│   │   ├── AgentsTab
│   │   ├── InspectorTab
│   │   ├── LearningTab
│   │   ├── CostTab
│   │   └── SettingsTab
│   │
│   └── TabContent
│       │
│       ├── AgentsView
│       │   ├── AgentList (VirtualScroll)
│       │   │   └── AgentItem
│       │   │       ├── AgentStatusIndicator
│       │   │       ├── CellReference
│       │   │       ├── ProgressBar
│       │   │       └── QuickActions
│       │   │
│       │   ├── FilterBar
│       │   │   ├── StatusFilter
│       │   │   ├── SearchInput
│       │   │   └── SortOptions
│       │   │
│       │   └── BatchActions
│       │       ├── SelectAll
│       │       ├── StopSelected
│       │       └── RemoveSelected
│       │
│       ├── InspectorView
│       │   ├── InspectorHeader
│       │   │   ├── AgentId
│       │   │   ├── CellRef
│       │   │   └── StatusBadge
│       │   │
│       │   ├── InspectorTabs
│       │   │   ├── DetailsTab
│       │   │   │   ├── Configuration
│       │   │   │   ├── Inputs
│       │   │   │   ├── Outputs
│       │   │   │   └── Metadata
│       │   │   │
│       │   │   ├── TraceTab
│       │   │   │   ├── ExecutionTrace
│       │   │   │   │   └── TraceStep[]
│       │   │   │   │       ├── Timestamp
│       │   │   │   │       ├── Action
│       │   │   │   │       └── Details
│       │   │   │   └── Timeline
│       │   │   │
│       │   │   └── A2ATab
│       │   │       ├── A2APackageList
│       │   │       │   └── A2APackageItem
│       │   │       │       ├── PackageId
│       │   │       │       ├── Type
│       │   │       │       ├── Timestamp
│       │   │       │       └── Payload
│       │   │       └── CausalChain
│       │   │
│       │   └── InspectorActions
│       │       ├── Retry
│       │       ├── Stop
│       │       └── Remove
│       │
│       ├── LearningProgress
│       │   ├── ProgressOverview
│       │   │   ├── OverallProgressBar
│       │   │   └── ProgressPercentage
│       │   │
│       │   ├── MetricsGrid
│       │   │   ├── EpisodesCompleted
│       │   │   ├── AverageReward
│       │   │   ├── Loss
│       │   │   └── Accuracy
│       │   │
│       │   ├── RewardsChart
│       │   │   └── RewardBar[]
│       │   │
│       │   └── LearningControls
│       │       ├── TriggerDream
│       │       ├── AdjustParams
│       │       └── ViewHistory
│       │
│       ├── CostDashboard
│       │   ├── TotalCostDisplay
│       │   │   ├── CostValue
│       │   │   └── TimeframeSelector
│       │   │
│       │   ├── CostBreakdown
│       │   │   ├── LLMAPICalls
│       │   │   ├── CacheHits
│       │   │   └── DreamingCycles
│       │   │
│       │   ├── CacheEfficiency
│       │   │   ├── EfficiencyMeter
│       │   │   ├── EfficiencyPercentage
│       │   │   └── SavingsDisplay
│       │   │
│       │   └── CostTrend
│       │       └── TrendChart
│       │
│       └── SettingsPanel
│           ├── AppearanceSettings
│           │   ├── ThemeSelector
│           │   └── FontSizeSelector
│           │
│           ├── NotificationSettings
│           │   ├── EnableNotifications
│           │   └── SoundEffects
│           │
│           ├── PerformanceSettings
│           │   ├── UpdateInterval
│           │   ├── EnableCache
│           │   └── BatchUpdates
│           │
│           └── AdvancedSettings
│               ├── DebugMode
│               ├── VerboseLogging
│               └── DeveloperTools
│                   ├── ClearCache
│                   ├── ExportState
│                   └── ResetSettings
│
└── ErrorBoundary
```

---

## 3. Data Flow Diagrams

### 3.1 Agent Spawn Flow

```
┌─────────────┐
│   User      │
│             │
│ Types =AG   │
│ ENT(...)    │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│                    Spreadsheet Layer                          │
│                                                               │
│  1. Parse formula: =AGENT("TaskAgent", "input data")        │
│  2. Extract parameters                                       │
│  3. Send to POLLN runtime                                    │
│                                                               │
└───────────────────────┬──────────────────────────────────────┘
                        │ HTTP POST
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                  POLLN Runtime Server                        │
│                                                               │
│  1. Receive spawn request                                    │
│  2. Create agent configuration                               │
│  3. Initialize agent                                         │
│  4. Add to colony                                            │
│  5. Return agent ID                                          │
│                                                               │
└───────────────────────┬──────────────────────────────────────┘
                        │ WebSocket Event
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                      Side Panel                              │
│                                                               │
│  1. Receive agent:spawned event                              │
│  2. Update store with new agent                              │
│  3. Render agent in list                                     │
│  4. Show "spawned" notification                              │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Real-Time Update Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  POLLN Runtime Server                        │
│                                                               │
│  Agent execution in progress...                              │
│  │                                                            │
│  ├─ Step 1: Parsing input                                   │
│  ├─ Step 2: Processing                                      │
│  ├─ Step 3: Generating output                               │
│  └─ Step 4: Finalizing                                      │
│                                                               │
│  After each step:                                            │
│  1. Calculate progress percentage                            │
│  2. Create event:agent.progress message                     │
│  3. Send via WebSocket                                       │
│                                                               │
└───────────────────────┬──────────────────────────────────────┘
                        │ WebSocket Message
                        │ { type: 'event:agent',
                        │   data: { agentId, progress, status } }
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                      Side Panel                              │
│                                                               │
│  1. WebSocket receives message                               │
│  2. Parse event data                                         │
│  3. Queue update (batched every 100ms)                       │
│  4. Update Zustand store                                     │
│  5. React components re-render                               │
│  6. User sees progress bar update                            │
│                                                               │
│  Store Update:                                               │
│  ┌────────────────────────────────────┐                     │
│  │ updateAgent(agentId, {             │                     │
│  │   status: 'running',               │                     │
│  │   progress: 25                     │                     │
│  │ })                                 │                     │
│  └────────────────────────────────────┘                     │
│                                                               │
│  Component Update:                                           │
│  ┌────────────────────────────────────┐                     │
│  │ <AgentStatusIndicator              │                     │
│  │   agentId={agentId}                │                     │
│  │   progress={25}                    │                     │
│  │ />                                 │                     │
│  └────────────────────────────────────┘                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 Inspector Selection Flow

```
┌─────────────┐
│   User      │
│             │
│ Double-     │
│ clicks agent│
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│                      Side Panel                              │
│                                                               │
│  1. Capture double-click event                               │
│  2. Get agent ID from event target                           │
│  3. Update store: selectAgent(agentId)                       │
│  4. Switch to Inspector tab                                  │
│  5. Fetch agent details from API                             │
│  6. Display agent inspector                                  │
│                                                               │
│  Store Update:                                               │
│  ┌────────────────────────────────────┐                     │
│  │ selectedAgentId: 'agent-123'       │                     │
│  │ activeTab: 'inspector'             │                     │
│  └────────────────────────────────────┘                     │
│                                                               │
│  API Request:                                                │
│  ┌────────────────────────────────────┐                     │
│  │ GET /api/agents/agent-123          │                     │
│  │    ?includeHistory=true            │                     │
│  └────────────────────────────────────┘                     │
│       │                                                         │
│       ▼                                                         │
│  API Response:                                                │
│  ┌────────────────────────────────────┐                     │
│  │ {                                  │                     │
│  │   id: 'agent-123',                 │                     │
│  │   cellRef: 'A2',                   │                     │
│  │   status: 'running',               │                     │
│  │   progress: 60,                    │                     │
│  │   config: { ... },                 │                     │
│  │   history: [ ... ]                 │                     │
│  │ }                                  │                     │
│  └────────────────────────────────────┘                     │
│                                                               │
│  Inspector Display:                                          │
│  ┌────────────────────────────────────┐                     │
│  │ ┌──────────────────────────────┐  │                     │
│  │ │ Agent Inspector              │  │                     │
│  │ ├──────────────────────────────┤  │                     │
│  │ │ ID: agent-123                │  │                     │
│  │ │ Cell: A2                     │  │                     │
│  │ │ Status: 🔄 Running           │  │                     │
│  │ │ Progress: ████████░░ 60%     │  │                     │
│  │ ├──────────────────────────────┤  │                     │
│  │ │ [Details] [Trace] [A2A]      │  │                     │
│  │ └──────────────────────────────┘  │                     │
│  └────────────────────────────────────┘                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. State Management Flow

```
┌──────────────────────────────────────────────────────────────┐
│                        Zustand Store                         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │                    State                            │     │
│  ├────────────────────────────────────────────────────┤     │
│  │  agents: Map<string, AgentState>                   │     │
│  │  selectedAgentId: string | null                    │     │
│  │  activeTab: 'agents' | 'inspector' | ...           │     │
│  │  collapsedSections: string[]                       │     │
│  │  isConnected: boolean                              │     │
│  │  connectionError: string | null                    │     │
│  └────────────────────────────────────────────────────┘     │
│                         │                                    │
│                         │ Actions                            │
│                         ▼                                    │
│  ┌────────────────────────────────────────────────────┐     │
│  │                   Actions                           │     │
│  ├────────────────────────────────────────────────────┤     │
│  │  updateAgent(id, update)                           │     │
│  │  selectAgent(id)                                   │     │
│  │  setActiveTab(tab)                                 │     │
│  │  toggleSection(section)                            │     │
│  │  setConnected(connected)                           │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │          │    │          │    │          │
    │WebSocket │    │ Persist  │    │ React    │
    │ Service  │    │  Service │    │Components│
    │          │    │          │    │          │
    └─────┬────┘    └─────┬────┘    └─────┬────┘
          │               │               │
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Events   │    │localStorage│  │ Re-render│
    │ from     │───▶│          │───▶│ on state │
    │ server   │    │          │    │ change   │
    └──────────┘    └──────────┘    └──────────┘
```

---

## 5. Platform-Specific Architecture

### 5.1 Excel (Office.js)

```
┌──────────────────────────────────────────────────────────────┐
│                      Excel Desktop                           │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Excel Application                       │     │
│  │                                                       │     │
│  │  ┌─────────────────┐      ┌──────────────────────┐ │     │
│  │  │  Worksheet      │      │  Task Pane           │ │     │
│  │  │                 │      │                      │ │     │
│  │  │  ┌───┬───┬───┐  │      │  ┌────────────────┐  │ │     │
│  │  │  │ A │ B │ C │  │      │  │ POLLN Panel    │  │ │     │
│  │  │  ├───┼───┼───┤  │      │  │                │  │ │     │
│  │  │  │=AG│=AG│ 5 │  │◄─────┼─┤ Agent Status    │  │ │     │
│  │  │  │ENT│ENT│   │  │      │  │ Inspector View  │  │ │     │
│  │  │  └───┴───┴───┘  │      │  └────────────────┘  │ │     │
│  │  │                 │      │                      │ │     │
│  │  └─────────────────┘      └──────────────────────┘ │     │
│  └────────────────────────────────────────────────────┘     │
│                          │                                   │
│                          │ Office.js API                     │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │           Excel Add-in Runtime                      │     │
│  │                                                       │     │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │     │
│  │  │   Custom    │  │   Task      │  │   Storage   │  │     │
│  │  │ Functions   │  │   Pane     │  │   Service   │  │     │
│  │  │             │  │             │  │             │  │     │
│  │  │ =AGENT()    │  │   HTML/JS   │  │ CustomXML   │  │     │
│  │  │ =CONNECT()  │  │   Panel     │  │ Parts       │  │     │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │     │
│  └─────────┼─────────────────┼─────────────────┼─────────┘     │
│            │                 │                 │               │
│            └─────────────────┼─────────────────┘               │
│                              ▼                                 │
│  ┌────────────────────────────────────────────────────┐     │
│  │              POLLN Runtime Server                   │     │
│  │                                                       │     │
│  │  WebSocket + REST API                                 │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Google Sheets (Apps Script)

```
┌──────────────────────────────────────────────────────────────┐
│                   Google Sheets Web                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │           Google Spreadsheet                        │     │
│  │                                                       │     │
│  │  ┌─────────────────┐      ┌──────────────────────┐ │     │
│  │  │  Spreadsheet    │      │  Sidebar             │ │     │
│  │  │                 │      │                      │ │     │
│  │  │  ┌───┬───┬───┐  │      │  ┌────────────────┐  │ │     │
│  │  │  │ A │ B │ C │  │      │  │ POLLN Panel    │  │ │     │
│  │  │  ├───┼───┼───┤  │      │  │                │  │ │     │
│  │  │  │=AG│=AG│ 5 │  │◄─────┼─┤ Agent Status    │  │ │     │
│  │  │  │ENT│ENT│   │  │      │  │ Inspector View  │  │ │     │
│  │  │  └───┴───┴───┘  │      │  └────────────────┘  │ │     │
│  │  │                 │      │                      │ │     │
│  │  └─────────────────┘      └──────────────────────┘ │     │
│  └────────────────────────────────────────────────────┘     │
│                          │                                   │
│                          │ Apps Script API                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │          Google Apps Script Runtime                 │     │
│  │                                                       │     │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │     │
│  │  │   Custom    │  │   Sidebar   │  │  Properties │  │     │
│  │  │ Functions   │  │             │  │   Service   │  │     │
│  │  │             │  │   HtmlSvc   │  │             │  │     │
│  │  │ =AGENT()    │  │   Panel     │  │ Document    │  │     │
│  │  │ =CONNECT()  │  │             │  │ Properties  │  │     │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │     │
│  └─────────┼─────────────────┼─────────────────┼─────────┘     │
│            │                 │                 │               │
│            └─────────────────┼─────────────────┘               │
│                              ▼                                 │
│  ┌────────────────────────────────────────────────────┐     │
│  │              POLLN Runtime Server                   │     │
│  │                                                       │     │
│  │  WebSocket + REST API                                 │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Communication Protocol Sequence Diagrams

### 6.1 Panel Initialization

```
Panel              Spreadsheet            POLLN Server
 │                       │                      │
 ├──[1. Load]──────────▶│                      │
 │◀─────────────────────│                      │
 │                       │                      │
 ├──[2. Show Panel]─────▶│                      │
 │◀─────────────────────│                      │
 │                       │                      │
 ├──[3. Connect WS]────────────────────────────▶│
 │◀─────────────────────────────────────────────│[4. Connected]
 │                       │                      │
 ├──[5. Subscribe]─────────────────────────────▶│
 │       ┌──────────────────────────────────────│
 │       │  colony: 'spreadsheet-123'           │
 │       │  events: ['agent:*']                 │
 │       └──────────────────────────────────────│
 │◀─────────────────────────────────────────────│[6. Subscribed]
 │                       │                      │
 │◀─────────────────────────────────────────────│[7. Initial State]
 │       ┌──────────────────────────────────────│
 │       │  agents: [...]                       │
 │       │  stats: {...}                        │
 │       └──────────────────────────────────────│
 │                       │                      │
 ├──[8. Render UI]──────│                      │
 │                       │                      │
```

### 6.2 Agent Lifecycle

```
Panel              Spreadsheet            POLLN Server
 │                       │                      │
 │◀─────────────────────│[1. User types =AG...] │
 │                       │                      │
 │                       ├──[2. Parse & Send]─▶│
 │                       │      ┌───────────────│
 │                       │      │ agent: {...}  │
 │                       │      │ type: 'spawn' │
 │                       │      └───────────────│
 │◀─────────────────────────────────────────────│[3. Agent Spawned]
 │       ┌──────────────────────────────────────│
 │       │  agentId: 'agent-123'                │
 │       │  status: 'initializing'              │
 │       └──────────────────────────────────────│
 │                       │                      │
 ├──[4. Update UI]──────│                      │
 │                       │                      │
 │◀─────────────────────────────────────────────│[5. Agent: Running]
 │       ┌──────────────────────────────────────│
 │       │  agentId: 'agent-123'                │
 │       │  status: 'running'                   │
 │       │  progress: 0                         │
 │       └──────────────────────────────────────│
 │                       │                      │
 │◀─────────────────────────────────────────────│[6. Agent: Progress]
 │       ┌──────────────────────────────────────│
 │       │  agentId: 'agent-123'                │
 │       │  progress: 25                        │
 │       └──────────────────────────────────────│
 │                       │                      │
 │◀─────────────────────────────────────────────│[7. Agent: Progress]
 │       ┌──────────────────────────────────────│
 │       │  agentId: 'agent-123'                │
 │       │  progress: 50                        │
 │       └──────────────────────────────────────│
 │                       │                      │
 │◀─────────────────────────────────────────────│[8. Agent: Progress]
 │       ┌──────────────────────────────────────│
 │       │  agentId: 'agent-123'                │
 │       │  progress: 75                        │
 │       └──────────────────────────────────────│
 │                       │                      │
 │◀─────────────────────────────────────────────│[9. Agent: Complete]
 │       ┌──────────────────────────────────────│
 │       │  agentId: 'agent-123'                │
 │       │  status: 'completed'                 │
 │       │  result: {...}                       │
 │       └──────────────────────────────────────│
 │                       │                      │
 ├──[10. Final Update]──│                      │
 │                       │                      │
```

---

## 7. Performance Optimization Diagrams

### 7.1 Update Batching

```
Without Batching (Bad):
───────────────────────
Event 1 ──▶ Update 1 ──▶ Re-render 1
Event 2 ──▶ Update 2 ──▶ Re-render 2
Event 3 ──▶ Update 3 ──▶ Re-render 3
Event 4 ──▶ Update 4 ──▶ Re-render 4
Event 5 ──▶ Update 5 ──▶ Re-render 5

Total: 5 re-renders (inefficient)

With Batching (Good):
─────────────────────
Event 1 ──┐
Event 2 ──┤
Event 3 ──┼─▶ Batched Update ──▶ Single Re-render
Event 4 ──┤
Event 5 ──┘

Total: 1 re-render (efficient)
```

### 7.2 Virtual Scrolling

```
All Items Rendered (Bad):
──────────────────────────
┌─────────────────┐
│ Item 1          │  ← Rendered (visible)
│ Item 2          │  ← Rendered (visible)
│ Item 3          │  ← Rendered (visible)
│ Item 4          │  ← Rendered (visible)
│ Item 5          │  ← Rendered (visible)
│ ...             │
│ Item 996        │  ← Rendered (not visible!)
│ Item 997        │  ← Rendered (not visible!)
│ Item 998        │  ← Rendered (not visible!)
│ Item 999        │  ← Rendered (not visible!)
│ Item 1000       │  ← Rendered (not visible!)
└─────────────────┘

Virtual Scrolling (Good):
────────────────────────
┌─────────────────┐
│ Item 1          │  ← Rendered (visible)
│ Item 2          │  ← Rendered (visible)
│ Item 3          │  ← Rendered (visible)
│ Item 4          │  ← Rendered (visible)
│ Item 5          │  ← Rendered (visible)
│ ...             │  ← Not rendered (virtual)
│ Item 996        │  ← Not rendered (virtual)
│ Item 997        │  ← Not rendered (virtual)
│ Item 998        │  ← Not rendered (virtual)
│ Item 999        │  ← Not rendered (virtual)
│ Item 1000       │  ← Not rendered (virtual)
└─────────────────┘
```

---

## 8. Error Handling Flow

```
┌──────────────────────────────────────────────────────────────┐
│                        Error Source                          │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │Network   │  │API       │  │WebSocket │  │Component │    │
│  │Error     │  │Error     │  │Error     │  │Error     │    │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘    │
└────────┼─────────────┼─────────────┼─────────────┼─────────┘
         │             │             │             │
         └─────────────┴─────────────┴─────────────┘
                            │
                            ▼
         ┌────────────────────────────────────────┐
         │         Error Handler Service         │
         │                                        │
         │  1. Categorize error                  │
         │     • Network (recoverable)           │
         │     • API (recoverable)               │
         │     • Critical (not recoverable)       │
         │                                        │
         │  2. Log error                        │
         │     • Console                         │
         │     • Error tracking service          │
         │                                        │
         │  3. Show notification                 │
         │     • Error message                   │
         │     • Retry button (if recoverable)   │
         │                                        │
         │  4. Update state                     │
         │     • connectionError                 │
         │     • agent.status = 'error'          │
         │                                        │
         └───────────────┬────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                  │
        ▼                                  ▼
┌───────────────┐                  ┌──────────────┐
│   User UI     │                  │    Store     │
│               │                  │              │
│ ┌───────────┐ │                  │ Set error    │
│ │ Notification│ │                  │ state        │
│ │ ⚠️ Error  │ │                  │ Trigger      │
│ │ [Retry]   │ │                  │ re-render    │
│ └───────────┘ │                  └──────────────┘
└───────────────┘
```

---

## 9. Deployment Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Production Environment                   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │                   CDN Layer                          │     │
│  │                                                       │     │
│  │  CloudFront / Cloudflare                              │     │
│  │  • Panel JavaScript bundle                             │     │
│  │  • Panel CSS                                           │     │
│  │  • Panel HTML templates                                │     │
│  │  • Static assets (icons, fonts)                        │     │
│  └───────────────────────┬────────────────────────────────┘     │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Application Servers                     │     │
│  │                                                       │     │
│  │  POLLN Runtime Server                                │     │
│  │  • WebSocket server                                  │     │
│  │  • REST API                                          │     │
│  │  • Agent lifecycle management                        │     │
│  │  • State persistence                                 │     │
│  └───────────────────────┬────────────────────────────────┘     │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Data Layer                             │     │
│  │                                                       │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │     │
│  │  │ PostgreSQL   │  │   Redis      │  │ S3/Cloud  │  │     │
│  │  │              │  │              │  │  Storage   │  │     │
│  │  │ • Agent state│  │ • Cache      │  │           │  │     │
│  │  │ • History    │  │ • Sessions   │  │ • Bundles  │  │     │
│  │  │ • Config     │  │ • Pub/Sub   │  │ • Logs     │  │     │
│  │  └──────────────┘  └──────────────┘  └───────────┘  │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
└──────────────────────────────────────────────────────────────┘

                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                    Platform Distribution                       │
│                                                              │
│  Excel:                                                      │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Office AppStore                                     │     │
│  │  • manifest.xml                                      │     │
│  │  • Points to CDN for panel assets                    │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  Google Sheets:                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Chrome Web Store / Marketplace                      │     │
│  │  • Apps Script project                              │     │
│  │  • Points to CDN for panel assets                    │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 10. Security Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
│                                                              │
│  Layer 1: Platform Security                                  │
│  ┌────────────────────────────────────────────────────┐     │
│  │  • Office.js sandbox                                │     │
│  │  • Apps Script V8 runtime                           │     │
│  │  • Content Security Policy                         │     │
│  │  • CORS restrictions                                │     │
│  └────────────────────────────────────────────────────┘     │
│                          │                                   │
│                          ▼                                   │
│  Layer 2: Authentication                                    │
│  ┌────────────────────────────────────────────────────┐     │
│  │  • JWT tokens                                        │     │
│  │  • Token rotation                                    │     │
│  │  • Secure storage (encrypted)                       │     │
│  │  • Token expiration                                  │     │
│  └────────────────────────────────────────────────────┘     │
│                          │                                   │
│                          ▼                                   │
│  Layer 3: Authorization                                     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  • Permission checks                                 │     │
│  │  • Resource isolation                                │     │
│  │  • Rate limiting                                     │     │
│  │  • API scopes                                        │     │
│  └────────────────────────────────────────────────────┘     │
│                          │                                   │
│                          ▼                                   │
│  Layer 4: Data Security                                     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  • Encryption at rest                                │     │
│  │  • Encryption in transit (TLS/WSS)                  │     │
│  │  • Data isolation per spreadsheet                   │     │
│  │  • Audit logging                                    │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

**Document Status:** Complete
**Last Updated:** 2026-03-08
**Purpose:** Visual documentation for SIDE_PANEL_SPECS.md
