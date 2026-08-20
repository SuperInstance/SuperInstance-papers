# Quilt for Education: A Reference Model for Multi-Instance Learning

**Author:** Mavis  
**Version:** 1.0  
**Date:** 2025

---

## Abstract

We describe how the Quilt cell model — originally developed for software systems, multi-agent AI, and the Time-Travel DAW — extends naturally to the classroom. In Quilt-classroom, the teacher and each student are cells. Each device is an opener onto the same cell graph. Each question is a cell pushed to the students. Each response is a cell from the students back. Each side-ask to a scoped chatbot is a cell. The teacher's view is a spreadsheet, a DAW, or a custom UI over the same data. The student's view is a focused tablet UI. The cell graph is the canonical form of the classroom — people, questions, answers, notes, chatbots all as cells.

---

## 1. Introduction: From agent graphs to classroom graphs

The Quilt project began as a way to model software systems as graphs of cells. A cell is a typed node with inputs, outputs, and a body. Cells can represent functions, agents, UI components, documents, or any unit of computation. The cell graph is the canonical form; the UI is an *opener* onto that graph. Multiple openers can view the same graph simultaneously — a spreadsheet opener, a DAW opener, a code opener, a custom opener.

In parallel work, the Time-Travel DAW (paper 19) demonstrated that a digital audio workstation is also a cell graph. Tracks, clips, automation lanes, plugins — all cells. The timeline is an opener. The mixer is an opener. The transport is an opener. Time-travel is the ability to scrub the cell graph's history.

The leap we make in this paper is simple but consequential: **a classroom is a cell graph.**

The teacher is a cell. Each student is a cell. Each question is a cell. Each answer is a cell. Each note is a cell. Each scoped chatbot is a cell. The classroom — as a social, pedagogical, computational entity — *is* the cell graph. Everything else is an opener.

This is not a metaphor stretched thin. It is a literal data model. The teacher's spreadsheet view, the student's tablet view, the chatbot's context window — all are projections of the same graph. When a student answers a question, a cell is created and linked. When the teacher pushes a new sub-lesson, cells are pushed. When a student asks a side-question to a chatbot, a cell is created with the chatbot as target.

The advantage of this abstraction is that inter-instance interactions — teacher to student, student to question, student to chatbot, chatbot to teacher — all follow the same protocol. There is one way to send, one way to receive, one way to observe. The classroom becomes a distributed system with a unified primitive.

```
┌─────────────────────────────────────────────────────┐
│                  CELL GRAPH (canonical)              │
│                                                      │
│   [teacher]──push──>[question]──push──>[student_1]   │
│       │                    │                  │       │
│       │                    │                  │      │
│      observe             observe            respond   │
│       │                    │                  │      │
│       ▼                    ▼                  ▼      │
│   [indicator]         [answer_1] <──[answer_1]      │
│                                                      │
│   [student_2]──side-ask──>[chatbot_cell]             │
│                                  │                   │
│                                  ▼                   │
│                             [chat_response]          │
└─────────────────────────────────────────────────────┘
```

We present the model, the views, the pedagogy, and a reference implementation.

---

## 2. The cell model applied to people

### 2.1 What is a cell?

A cell in Quilt has the following structure:

```typescript
interface Cell {
  id: string;           // unique identifier
  type: CellType;       // 'person' | 'question' | 'answer' | 'note' | 'chatbot' | ...
  label: string;        // human-readable name
  body: any;            // type-specific payload
  inputs: string[];    // cell IDs this cell receives from
  outputs: string[];   // cell IDs this cell sends to
  meta: Record<string, any>; // arbitrary metadata
  createdAt: number;
  updatedAt: number;
}
```

A person-cell is a cell where `type === 'person'` and the body contains identity and role information:

```typescript
interface PersonBody {
  name: string;
  role: 'teacher' | 'student';
  avatar?: string;
  deviceIds: string[];  // devices this person has opened
  preferences: {
    uiMode: 'spreadsheet' | 'daw' | 'tablet' | 'custom';
    theme?: string;
  };
}
```

### 2.2 Teacher as cell

The teacher is a person-cell with role `teacher`. The teacher-cell has outputs to every student-cell (the roster) and to every question-cell (the teacher creates questions). The teacher-cell has inputs from every answer-cell and every indicator-cell.

The teacher does not "own" the graph. The teacher is *in* the graph. The teacher's authority is expressed through the graph topology: the teacher-cell is the source of question-cells, the observer of answer-cells, the creator of chatbot-cells. Authority is a pattern of edges, not a special privilege in the API.

### 2.3 Students as cells

Each student is a person-cell with role `student`. Student-cells have inputs from question-cells (they receive questions) and outputs to answer-cells (they respond). Student-cells also have outputs to chatbot-cells (side-asks).

A student is not a row in a gradebook. A student is a cell with a history of inputs and outputs. The gradebook is an opener that aggregates the student-cell's outgoing answer-cells and computes scores. The cell itself is richer — it contains the full interaction log, the side-asks, the time-stamped responses, the device history.

### 2.4 The roster as a subgraph

The roster is not a list. It is a subgraph: the teacher-cell plus all student-cells plus the edges between them. When a student joins, a cell is created and an edge is drawn from teacher to student. When a student leaves, the cell is marked inactive (never deleted — time-travel requires immutability).

| Classroom concept | Quilt cell representation |
|---|---|
| Teacher | person-cell, role=teacher |
| Student | person-cell, role=student |
| Roster | subgraph of person-cells |
| Question | question-cell, pushed by teacher |
| Answer | answer-cell, pushed by student |
| Note | note-cell, authored by any person-cell |
| Chatbot | chatbot-cell, with model + scope |
| Grade | derived from answer-cells via opener |
| Attendance | derived from person-cell device activity |

---

## 3. The teacher's view: spreadsheet, DAW, custom UI

### 3.1 The opener principle

In Quilt, the cell graph is canonical. The UI is an *opener* — a projection that reads the graph and renders it in a specific form. Multiple openers can exist simultaneously, each on a different device, each showing a different view of the same graph.

The teacher can open the classroom graph as:

1. **A spreadsheet** — rows are students, columns are questions, cells are answers.
2. **A DAW** — tracks are students, clips are responses over time, the timeline is the lesson.
3. **A custom UI** — purpose-built dashboard with indicators, grouping controls, and chatbot monitors.

All three read from the same cell graph. All three write to the same cell graph. A change in one is reflected in all.

### 3.2 The spreadsheet opener

The spreadsheet is the most familiar teacher UI. It maps naturally:

```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│ Student  │ Q1       │ Q2       │ Q3       │ Score    │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ Alice    │ "42"     │ "Paris"  │ █░░░░    │ 2/3      │
│ Bob      │ "42"     │ "London" │ ███░░    │ 1/3      │
│ Carol    │ (empty)  │ "Paris"  │ █████    │ 1/2      │
│ ...      │          │          │          │          │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

Each cell in the spreadsheet is a projection of an answer-cell. The "Score" column is a derived field — it is not stored; it is computed by the opener from the answer-cells' correctness metadata.

The spreadsheet opener is implemented as a query over the graph:

```typescript
function renderSpreadsheet(graph: CellGraph): SpreadsheetData {
  const students = graph.cellsByType('person')
    .filter(c => c.body.role === 'student');
  
  const questions = graph.cellsByType('question')
    .sort((a, b) => a.createdAt - b.createdAt);
  
  const rows = students.map(student => {
    const answers = graph.cellsByType('answer')
      .filter(a => a.inputs.includes(student.id));
    
    const cells = questions.map(q => {
      const ans = answers.find(a => a.inputs.includes(q.id));
      return ans ? ans.body.text : '';
    });
    
    const score = cells.filter(c => c !== '').length;
    return { student: student.body.name, cells, score };
  });
  
  return { columns: questions.map(q => q.label), rows };
}
```

### 3.3 The DAW opener

The DAW opener, inspired by paper 19 (Time-Travel DAW), treats the classroom as a timeline. Each student is a track. Each response is a clip on that track, positioned at the time it was submitted. The teacher can scrub the timeline, seeing the classroom unfold in time.

```
TIME →→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→

Alice  │──[Q1: "42"]──────[Q2: "Paris"]────────[Q3]──│
Bob    │─────[Q1: "42"]──────────[Q2: "London"]──────│
Carol  │──────────────────[Q2: "Paris"]───────────────│
       │                                                  │
CHAT   │──[Alice→bot: "what is photosynthesis?"]───────│
       │──────[bot→Alice: "photosynthesis is..."]──────│
       │                                                  │
TEACHER│──[push Q1]──[push Q2]──[group: fast]──[push Q3]│
```

The DAW opener is powerful because it reveals *temporal patterns*. You can see who answered first, who stalled, when the chatbot was invoked, when the teacher intervened. The spreadsheet shows *what*; the DAW shows *when*.

### 3.4 The custom UI opener

The custom UI is purpose-built for the teacher's real-time workflow. It combines:

- A live roster with status indicators (active, idle, struggling).
- A question-pushing panel.
- A grouping panel (drag students into groups).
- A chatbot monitor (see all side-asks in real time).
- A sub-lesson launcher (push scoped content to a subset).

```typescript
// Custom UI opener: composite view
function renderTeacherDashboard(graph: CellGraph): HTMLElement {
  const container = document.createElement('div');
  container.className = 'teacher-dashboard';
  
  container.appendChild(renderRosterPanel(graph));
  container.appendChild(renderQuestionPanel(graph));
  container.appendChild(renderGroupingPanel(graph));
  container.appendChild(renderChatbotMonitor(graph));
  container.appendChild(renderSubLessonLauncher(graph));
  
  return container;
}
```

The teacher can switch between openers at any time. The cell graph does not change. The opener changes. This is the core Quilt principle: **the graph is the truth; the UI is a lens.**

---

## 4. The student's view: focused, mobile, with side-chatbot

### 4.1 The tablet opener

The student's view is deliberately minimal. A student sees:

1. The current question (the most recent question-cell pushed to them).
2. An input area (text, multiple choice, drawing, code).
3. A side-chatbot button (ask a question privately).
4. A progress indicator (how many questions answered, current streak).

The student does not see the spreadsheet. The student does not see other students' answers. The student does not see the teacher's dashboard. The opener is *scoped* to the student's own cell and its immediate neighborhood.

```
┌─────────────────────────────────┐
│  📱 Student: Alice     ⭐⭐⭐ 3/5 │
├─────────────────────────────────┤
│                                  │
│  Question 4:                     │
│  What is the capital of France?   │
│                                  │
│  ┌─────────────────────────────┐ │
│  │ Type your answer...         │ │
│  │                             │ │
│  └─────────────────────────────┘ │
│                                  │
│  [Submit]    [🤖 Ask side-bot]   │
│                                  │
└─────────────────────────────────┘
```

### 4.2 Why focused?

The student opener is focused because attention is the scarcest resource in a classroom. The spreadsheet view — with its rows of peers, its comparative scores, its dense grid — is a *teacher's* view. It gives the teacher situational awareness. It would give the student anxiety.

The cell model makes this scoping trivial. The student's opener queries only cells where `inputs.includes(studentId)` or `outputs.includes(studentId)`. The rest of the graph exists but is not rendered. The student lives in their neighborhood of the graph.

### 4.3 The side-chatbot

Each student has access to a side-chatbot. This is not a general-purpose LLM. It is a **scoped chatbot-cell** — a cell with a model and a scope. The scope is the set of cells the chatbot can read. Typically:

- The current question-cell.
- The lesson's reference material (note-cells).
- The student's previous answer-cells (so the bot can reference what the student has already said).

The chatbot cannot see other students' answers. It cannot see the teacher's dashboard. It cannot see the full graph. It is scoped.

When a student taps "Ask side-bot," a chatbot-cell is instantiated (or reused), and a side-ask cell is created:

```typescript
const sideAsk: Cell = {
  id: generateId(),
  type: 'side_ask',
  label: 'Alice → bot: "what is photosynthesis?"',
  body: { text: 'what is photosynthesis?', studentId: 'alice' },
  inputs: ['alice', 'current_question_cell_id'],
  outputs: ['chatbot_cell_id'],
  meta: { scope: ['current_question', 'lesson_notes'] },
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
```

The chatbot-cell processes the side-ask and produces a chat-response cell:

```typescript
const chatResponse: Cell = {
  id: generateId(),
  type: 'chat_response',
  label: 'bot → Alice: "Photosynthesis is..."',
  body: { text: 'Photosynthesis is the process by which...', model: 'gpt-4o' },
  inputs: ['chatbot_cell_id'],
  outputs: ['alice'],
  meta: { scope: ['current_question', 'lesson_notes'] },
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
```

The teacher can see that a side-ask occurred (the cell is in the graph), but the content is private to the student unless the teacher explicitly opens it. This is a policy decision encoded in the opener, not in the graph.

---

## 5. The scoped chatbot: a cell with model + scope

### 5.1 Chatbot as cell

In the Quilt model, a chatbot is not a separate system. It is a cell. Specifically:

```typescript
interface ChatbotCell {
  id: string;
  type: 'chatbot';
  body: {
    model: string;           // 'gpt-4o' | 'claude-3.5' | 'local-llama' | ...
    scope: string[];         // cell IDs the bot can read
    systemPrompt: string;    // instructions
    temperature: number;
    maxTokens: number;
  };
  inputs: string[];   // side-asks directed to this bot
  outputs: string[];  // chat-responses from this bot
}
```

The chatbot-cell is a node in the graph. It has inputs (questions directed to it) and outputs (responses it generates). It is observable. It is auditable. It is time-traversable.

### 5.2 Scope is a first-class concern

The most important field in the chatbot body is `scope`. Scope is the list of cell IDs the chatbot is permitted to read when formulating its response. This is enforced at the graph-query level, not at the prompt level.

When the chatbot receives a side-ask, it constructs its context window by querying the cells in its scope:

```typescript
async function processSideAsk(
  ask: Cell, 
  chatbot: Cell, 
  graph: CellGraph
): Promise<Cell> {
  // Query only cells in scope
  const scopedCells = chatbot.body.scope
    .map(id => graph.getCell(id))
    .filter(Boolean);
  
  // Build context from scoped cells
  const context = scopedCells.map(cell => ({
    role: 'system',
    content: `[${cell.type}: ${cell.label}]\n${JSON.stringify(cell.body)}`
  }));
  
  // Add the student's question
  context.push({
    role: 'user',
    content: ask.body.text
  });
  
  // Call the model
  const response = await callModel(
    chatbot.body.model,
    context,
    chatbot.body.systemPrompt,
    chatbot.body.temperature
  );
  
  // Return a chat-response cell
  return {
    id: generateId(),
    type: 'chat_response',
    label: `bot → ${ask.body.studentId}`,
    body: { text: response, model: chatbot.body.model },
    inputs: [chatbot.id],
    outputs: [ask.body.studentId],
    meta: { scope: chatbot.body.scope },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
```

### 5.3 Multiple chatbots, different scopes

A classroom can have multiple chatbot-cells, each with a different scope:

| Chatbot | Model | Scope | Purpose |
|---|---|---|---|
| Tutor bot | gpt-4o | current question + lesson notes | Help with current question |
| Hint bot | gpt-4o-mini | current question only | Give a hint, not the answer |
| Review bot | claude-3.5 | student's past answers | Review mistakes |
| Peer bot | local-llama | lesson notes only | Socratic dialogue, no answers |

The teacher creates these chatbot-cells and pushes them to the graph. Students see the chatbots available to them and can choose which to ask. The teacher can observe which bots are being used and adjust the available bots in real time.

### 5.4 The teacher monitors side-asks

The teacher's custom UI includes a chatbot monitor. This panel shows, in real time, every side-ask that occurs — but not necessarily the content. The teacher sees:

```
┌──────────────────────────────────────────┐
│  CHATBOT MONITOR                          │
├──────────────────────────────────────────┤
│  Alice  → Tutor bot   (2 asks)  🟢 active │
│  Bob    → Hint bot    (1 ask)   🟡 idle   │
│  Carol  → Tutor bot   (5 asks)  🔴 heavy  │
│  Dave   → (none)                  ⚪ none  │
└──────────────────────────────────────────┘
```

The teacher can see *patterns*: Carol is asking the tutor bot five times. Dave is asking nothing. These are signals. The cell graph makes them visible without violating student privacy — the teacher sees the *edges* (asks occurred) without necessarily seeing the *content* (what was said).

---

## 6. Real-time indicators: struggle, activity, side-asks

### 6.1 Indicator cells

An indicator is a cell. It is not a separate telemetry system. It is a cell in the graph, derived from other cells by observation.

```typescript
interface IndicatorCell {
  id: string;
  type: 'indicator';
  body: {
    studentId: string;
    metric: 'activity' | 'struggle' | 'side_asks' | 'idle' | 'streak';
    value: number;
    threshold: number;
    status: 'green' | 'yellow' | 'red';
    windowMs: number;  // time window for this metric
  };
  inputs: string[];  // cells this indicator observes
  outputs: string[]; // typically [teacher_cell_id]
}
```

### 6.2 Struggle detection

Struggle is inferred from multiple signals:

1. **Time since last answer** — if a student has not responded to a question in N seconds, struggle indicator rises.
2. **Side-ask frequency** — if a student is asking the chatbot repeatedly, struggle indicator rises.
3. **Answer revision** — if a student submits, deletes, and resubmits, struggle indicator rises.
4. **Incorrect answers** — if recent answers are wrong, struggle indicator rises.

```typescript
function computeStruggle(
  studentId: string, 
  graph: CellGraph
): number {
  const recentAnswers = graph.cellsByType('answer')
    .filter(a => a.inputs.includes(studentId))
    .filter(a => Date.now() - a.createdAt < 60000); // last 60s
  
  const recentSideAsks = graph.cellsByType('side_ask')
    .filter(a => a.body.studentId === studentId)
    .filter(a => Date.now() - a.createdAt < 60000);
  
  const timeSinceLastAnswer = recentAnswers.length > 0
    ? Date.now() - Math.max(...recentAnswers.map(a => a.createdAt))
    : Infinity;
  
  let struggle = 0;
  
  // Time-based: > 30s since last answer on an active question
  if (timeSinceLastAnswer > 30000) struggle += 0.3;
  
  // Side-ask frequency: > 2 in 60s
  if (recentSideAsks.length > 2) struggle += 0.4;
  
  // Answer revision: check for deleted+resubmitted
  const revisions = recentAnswers.filter(a => a.meta.revised);
  struggle += revisions.length * 0.15;
  
  // Incorrect answers
  const wrong = recentAnswers.filter(a => a.meta.correct === false);
  struggle += wrong.length * 0.15;
  
  return Math.min(struggle, 1.0);
}
```

### 6.3 The indicator grid

The teacher's custom UI renders an indicator grid:

```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│ Student  │ Activity │ Struggle │ Side-asks│ Streak   │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ Alice    │ 🟢 0.9   │ 🟢 0.1   │ 0        │ ⭐⭐⭐ 3  │
│ Bob      │ 🟡 0.5   │ 🟡 0.4   │ 1        │ ⭐ 1     │
│ Carol    │ 🟢 0.8   │ 🔴 0.7   │ 5        │ ⭐ 1     │
│ Dave     │ ⚪ 0.0   │ ⚪ 0.0   │ 0        │ —       │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

Carol is struggling. Dave is idle. The teacher can now act — walk over to Carol, push a hint to Dave, or group Alice and Bob for peer help.

### 6.4 Indicators are cells, not side-channels

This is the key architectural point. Indicators are cells in the graph. They are time-stamped, immutable, and queryable. The teacher can time-travel: "What did the struggle indicators look like at minute 15 of the lesson?" The answer is a query against the cell graph's history.

If indicators were a separate telemetry system — a side-channel of metrics flowing through WebSockets into a dashboard — they would be ephemeral, unqueryable, and disconnected from the pedagogical record. By making them cells, they become part of the classroom's canonical history.

---

## 7. Cross-device sync: BroadcastChannel + Cloudflare Worker

### 7.1 The sync problem

A classroom has many devices. The teacher has a laptop (spreadsheet view) and a tablet (custom UI). Each student has a tablet. There may be a projector showing the DAW view. All these devices are openers onto the same cell graph. They must stay in sync.

Quilt uses a two-layer sync strategy:

1. **Local sync** via `BroadcastChannel` — for devices on the same browser/origin.
2. **Cloud sync** via a Cloudflare Worker — for devices across different browsers/networks.

### 7.2 BroadcastChannel for same-origin devices

When the teacher opens the spreadsheet on one tab and the custom UI on another tab of the same browser, `BroadcastChannel` provides instant sync:

```typescript
// Cell graph with BroadcastChannel sync
class SyncedCellGraph extends CellGraph {
  private channel: BroadcastChannel;
  
  constructor() {
    super();
    this.channel = new BroadcastChannel('quilt-classroom');
    this.channel.onmessage = (e) => this.handleRemoteChange(e.data);
  }
  
  addCell(cell: Cell): void {
    super.addCell(cell);
    this.channel.postMessage({ 
      type: 'add', 
      cell 
    });
  }
  
  updateCell(id: string, patch: Partial<Cell>): void {
    super.updateCell(id, patch);
    this.channel.postMessage({ 
      type: 'update', 
      id, 
      patch 
    });
  }
  
  private handleRemoteChange(msg: SyncMessage): void {
    if (msg.type === 'add') {
      super.addCell(msg.cell); // no re-broadcast
    } else if (msg.type === 'update') {
      super.updateCell(msg.id, msg.patch);
    }
  }
}
```

`BroadcastChannel` is instant (sub-millisecond), works across tabs in the same browser, and requires no server. It is the ideal transport for same-origin multi-opener scenarios.

### 7.3 Cloudflare Worker for cross-device sync

For devices on different browsers (teacher's laptop, student tablets), Quilt uses a Cloudflare Worker as a relay and persistence layer.

```
┌──────────────┐         ┌─────────────────┐         ┌──────────────┐
│ Teacher      │  WebSocket│   Cloudflare    │ WebSocket│  Student     │
│ Laptop       │──────────│   Worker         │──────────│  Tablet      │
│ (spreadsheet)│          │                  │          │  (tablet UI) │
└──────────────┘          │  ┌────────────┐ │          └──────────────┘
                          │  │ Durable    │ │          ┌──────────────┐
┌──────────────┐          │  │ Objects    │ │          │  Student     │
│ Projector    │  WebSocket│  │ (graph     ││ WebSocket│  Tablet 2    │
│ (DAW view)   │──────────│  │  store)    │ │──────────│              │
└──────────────┘          │  └────────────┘ │          └──────────────┘
                          └─────────────────┘
```

The Worker serves three functions:

1. **Relay**: When a device pushes a cell change, the Worker broadcasts it to all connected devices.
2. **Persistence**: The Worker stores the cell graph in Durable Objects, so devices that reconnect can fetch the full graph.
3. **Authoring**: The Worker can run server-side cell processing (e.g., chatbot model calls) without exposing API keys to client devices.

```typescript
// Cloudflare Worker: classroom relay
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const upgrade = req.headers.get('Upgrade');
    if (upgrade === 'websocket') {
      return handleWebSocket(req, env);
    }
    
    const url = new URL(req.url);
    
    if (url.pathname === '/graph') {
      // Fetch full graph for reconnecting devices
      const graph = await env.CLASSROOM_DO.getGraph();
      return Response.json(graph);
    }
    
    if (url.pathname === '/cell' && req.method === 'POST') {
      // Push a new cell
      const cell = await req.json();
      await env.CLASSROOM_DO.addCell(cell);
      return Response.json({ ok: true });
    }
    
    return new Response('Not found', { status: 404 });
  }
};
```

### 7.4 Conflict resolution

The cell graph is append-mostly. New cells are added; existing cells are rarely modified. When a cell is modified (e.g., a student revises an answer), the modification is a patch, not a full overwrite. The patch includes a version number, and the Worker applies patches in order.

For true conflict resolution, Quilt uses last-writer-wins on the `updatedAt` field. This is acceptable for a classroom because:

- The teacher is the authority on question-cells.
- Each student is the authority on their own answer-cells.
- Conflicts between different students' cells do not occur (they write to different cells).
- The only conflict scenario is a student editing the same answer from two devices simultaneously, which is rare and low-stakes.

---

## 8. The pedagogy: gamification, grouping, sub-lessons

### 8.1 Gamification through cell metadata

Gamification in Quilt-classroom is not bolted on. It is metadata on cells. Each answer-cell carries correctness and timing metadata. The opener aggregates this into streaks, scores, and badges.

```typescript
// Answer cell with gamification metadata
const answer: Cell = {
  id: generateId(),
  type: 'answer',
  body: { text: '42', studentId: 'alice', questionId: 'q1' },
  inputs: ['alice', 'q1'],
  outputs: ['teacher'],
  meta: {
    correct: true,
    responseTimeMs: 3400,
    streak: 3,        // 3rd correct in a row
    points: 10,
    badge: 'quick_draw' // answered in < 5s
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
```

The student's tablet opener reads this metadata and displays it:

```
┌─────────────────────────────────┐
│  📱 Student: Alice     ⭐⭐⭐ 3/5 │
│  🔥 Streak: 3   🏆 Points: 30   │
│  🎖️ Badges: quick_draw, ...     │
├─────────────────────────────────┤
│  ✓ Q1: Correct! (3.4s)          │
│  ✓ Q2: Correct! (5.1s)          │
│  ✓ Q3: Correct! (2.8s) 🔥       │
│  ○ Q4: ...                      │
└─────────────────────────────────┘
```

### 8.2 Grouping

The teacher can group students at any time. A group is a cell:

```typescript
const group: Cell = {
  id: generateId(),
  type: 'group',
  body: {
    name: 'Fast Finishers',
    studentIds: ['alice', 'bob', 'eve'],
    color: '#4caf50'
  },
  inputs: ['teacher'],
  outputs: [],  // students in the group
  meta: { createdAt: Date.now() },
};
```

Once a group exists, the teacher can push a sub-lesson to just that group. The sub-lesson is a set of question-cells whose `outputs` are the group's student IDs rather than the full roster.

```
TEACHER pushes sub-lesson:
                    
  [sub_lesson: "Advanced Fractions"]
       │
       ├──> [group: "Fast Finishers"]
       │        ├──> Alice
       │        ├──> Bob  
       │        └──> Eve
       │
       (Carol, Dave, Frank do not receive this)
```

### 8.3 Sub-lessons

A sub-lesson is a sequence of question-cells with a common `meta.lessonId`. The teacher can create sub-lessons for:

- **Remediation**: Students who struggled on Q1-Q5 get a sub-lesson with simpler questions.
- **Enrichment**: Students who aced Q1-Q5 get a sub-lesson with harder questions.
- **Branching**: Based on answer patterns, different students see different follow-up questions.

```typescript
function pushSubLesson(
  graph: SyncedCellGraph,
  lessonId: string,
  questions: QuestionSpec[],
  studentIds: string[]
): void {
  for (const q of questions) {
    const cell: Cell = {
      id: generateId(),
      type: 'question',
      label: q.label,
      body: q.body,
      inputs: ['teacher'],
      outputs: studentIds,
      meta: { lessonId, difficulty: q.difficulty },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    graph.addCell(cell);
  }
}
```

The sub-lesson is not a separate "mode." It is just more cells in the graph, targeted at specific students. The student's tablet opener shows them naturally — they just see the next question, which happens to be from a different lesson than their neighbor sees.

This is the power of the cell model: **differentiation is a graph topology, not a separate system.**

---

## 9. Implementation: classroom.html + student.html

### 9.1 Architecture

The reference implementation consists of two HTML files and one Cloudflare Worker:

| File | Purpose | Devices |
|---|---|---|
| `classroom.html` | Teacher's opener (spreadsheet + custom UI) | Teacher's laptop, projector |
| `student.html` | Student's opener (tablet UI) | Student tablets |
| `worker.js` | Relay + persistence + chatbot proxy | Cloudflare edge |

Both HTML files are single-file applications — HTML + CSS + JS in one file. No build step. No npm. Open the file in a browser and it works.

### 9.2 classroom.html

```html
<!DOCTYPE html>
<html>
<head>
  <title>Quilt Classroom — Teacher</title>
  <style>
    body { margin: 0; font-family: system-ui; display: flex; }
    #sidebar { width: 250px; background: #1a1a2e; color: #eee; padding: 16px; }
    #main { flex: 1; padding: 16px; overflow: auto; }
    .roster-row { display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #333; }
    .indicator { width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
    .green { background: #4caf50; } .yellow { background: #ffc107; } .red { background: #f44336; }
    .none { background: #666; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .chatbot-monitor { margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 8px; }
  </style>
</head>
<body>
  <div id="sidebar">
    <h2>📊 Quilt Classroom</h2>
    <div id="roster"></div>
    <div class="chatbot-monitor">
      <h3>🤖 Side-Asks</h3>
      <div id="chatbot-log"></div>
    </div>
  </div>
  <div id="main">
    <div id="view-controls">
      <button onclick="setView('spreadsheet')">Spreadsheet</button>
      <button onclick="setView('dashboard')">Dashboard</button>
      <button onclick="setView('daw')">DAW Timeline</button>
    </div>
    <div id="content"></div>
  </div>
  
  <script>
    // --- Cell graph with sync ---
    const graph = new SyncedCellGraph();
    const ws = new WebSocket('wss://quilt-classroom.worker.dev');
    
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'cell') graph.addCell(msg.cell);
      if (msg.type === 'update') graph.updateCell(msg.id, msg.patch);
    };
    
    // --- Push a question ---
    function pushQuestion(text, studentIds) {
      const cell = {
        id: crypto.randomUUID(),
        type: 'question',
        label: text.slice(0, 40),
        body: { text },
        inputs: ['teacher'],
        outputs: studentIds,
        meta: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      graph.addCell(cell);
      ws.send(JSON.stringify({ type: 'cell', cell }));
    }
    
    // --- Render spreadsheet ---
    function renderSpreadsheet() {
      const students = graph.cellsByType('person')
        .filter(c => c.body.role === 'student');
      const questions = graph.cellsByType('question')
        .sort((a, b) => a.createdAt - b.createdAt);
      
      let html = '<table><tr><th>Student</th>';
      questions.forEach(q => html += `<th>${q.label}</th>`);
      html += '<th>Score</th></tr>';
      
      students.forEach(s => {
        html += `<tr><td>${s.body.name}</td>`;
        let correct = 0;
        questions.forEach(q => {
          const ans = graph.cellsByType('answer')
            .find(a => a.inputs.includes(s.id) && a.inputs.includes(q.id));
          if (ans) {
            html += `<td>${ans.body.text}</td>`;
            if (ans.meta.correct) correct++;
          } else {
            html += '<td>—</td>';
          }
        });
        html += `<td>${correct}/${questions.length}</td></tr>`;
      });
      html += '</table>';
      document.getElementById('content').innerHTML = html;
    }
    
    // --- Render dashboard with indicators ---
    function renderDashboard() {
      const students = graph.cellsByType('person')
        .filter(c => c.body.role === 'student');
      
      let html = '<table><tr><th>Student</th><th>Activity</th><th>Struggle</th><th>Side-Asks</th><th>Streak</th></tr>';
      
      students.forEach(s => {
        const struggle = computeStruggle(s.id, graph);
        const sideAsks = graph.cellsByType('side_ask')
          .filter(a => a.body.studentId === s.id).length;
        const streak = computeStreak(s.id, graph);
        
        const sColor = struggle < 0.3 ? 'green' : struggle < 0.6 ? 'yellow' : 'red';
        
        html += `<tr>
          <td>${s.body.name}</td>
          <td><div class="indicator ${sColor}"></div></td>
          <td>${(struggle * 100).toFixed(0)}%</td>
          <td>${sideAsks}</td>
          <td>${'⭐'.repeat(streak)}</td>
        </tr>`;
      });
      
      html += '</table>';
      document.getElementById('content').innerHTML = html;
    }
    
    // --- View switching ---
    function setView(view) {
      if (view === 'spreadsheet') renderSpreadsheet();
      if (view === 'dashboard') renderDashboard();
      if (view === 'daw') renderDAW();
    }
    
    // --- Initial render ---
    graph.onChange = () => setView(currentView);
    setView('dashboard');
  </script>
</body>
</html>
```

### 9.3 student.html

```html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Quilt Student</title>
  <style>
    body { margin: 0; font-family: system-ui; padding: 16px;
           background: #f0f4f8; }
    .header { display: flex; justify-content: space-between;
              align-items: center; margin-bottom: 16px; }
    .question-card { background: white; border-radius: 12px;
                     padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .answer-input { width: 100%; font-size: 18px; padding: 12px;
                    border: 2px solid #ddd; border-radius: 8px; margin: 12px 0; }
    .btn { padding: 12px 24px; border: none; border-radius: 8px;
           font-size: 16px; cursor: pointer; }
    .btn-primary { background: #4caf50; color: white; }
    .btn-chat { background: #2196f3; color: white; }
    .chat-panel { display: none; margin-top: 16px;
                  padding: 16px; background: #e3f2fd;
                  border-radius: 8px; }
    .chat-panel.active { display: block; }
    .streak { font-size: 24px; }
  </style>
</head>
<body>
  <div class="header">
    <span id="student-name">Student</span>
    <span id="streak" class="streak"></span>
  </div>
  
  <div class="question-card">
    <h2 id="question-text">Waiting for question...</h2>
    <input class="answer-input" id="answer-input" placeholder="Type your answer...">
    <button class="btn btn-primary" onclick="submitAnswer()">Submit</button>
    <button class="btn btn-chat" onclick="toggleChat()">🤖 Ask Side-Bot</button>
  </div>
  
  <div class="chat-panel" id="chat-panel">
    <div id="chat-history"></div>
    <input class="answer-input" id="chat-input" placeholder="Ask the bot...">
    <button class="btn btn-primary" onclick="sendSideAsk()">Ask</button>
  </div>
  
  <script>
    const graph = new SyncedCellGraph();
    const ws = new WebSocket('wss://quilt-classroom.worker.dev');
    const STUDENT_ID = 'student_' + Math.random().toString(36).slice(2, 8);
    
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'cell') {
        graph.addCell(msg.cell);
        renderCurrentQuestion();
      }
    };
    
    // Register student
    ws.send(JSON.stringify({
      type: 'register',
      studentId: STUDENT_ID,
      name: prompt('Your name?') || 'Anonymous'
    }));
    
    function renderCurrentQuestion() {
      const questions = graph.cellsByType('question')
        .filter(q => q.outputs.includes(STUDENT_ID))
        .sort((a, b) => b.createdAt - a.createdAt);
      
      if (questions.length === 0) return;
      
      const current = questions[0];
      document.getElementById('question-text').textContent = current.body.text;
    }
    
    function submitAnswer() {
      const text = document.getElementById('answer-input').value;
      const questions = graph.cellsByType('question')
        .filter(q => q.outputs.includes(STUDENT_ID))
        .sort((a, b) => b.createdAt - a.createdAt);
      
      if (questions.length === 0) return;
      
      const current = questions[0];
      const cell = {
        id: crypto.randomUUID(),
        type: 'answer',
        body: { text, studentId: STUDENT_ID },
        inputs: [STUDENT_ID, current.id],
        outputs: ['teacher'],
        meta: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      graph.addCell(cell);
      ws.send(JSON.stringify({ type: 'cell', cell }));
      document.getElementById('answer-input').value = '';
    }
    
    function toggleChat() {
      document.getElementById('chat-panel').classList.toggle('active');
    }
    
    async function sendSideAsk() {
      const text = document.getElementById('chat-input').value;
      const ask = {
        id: crypto.randomUUID(),
        type: 'side_ask',
        body: { text, studentId: STUDENT_ID },
        inputs: [STUDENT_ID],
        outputs: ['chatbot'],
        meta: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      graph.addCell(ask);
      ws.send(JSON.stringify({ type: 'cell', cell: ask }));
      
      // Response comes back via WebSocket from the Worker
      document.getElementById('chat-input').value = '';
      appendChat('You', text);
    }
    
    function appendChat(role, text) {
      const div = document.createElement('div');
      div.innerHTML = `<strong>${role}:</strong> ${text}`;
      document.getElementById('chat-history').appendChild(div);
    }
    
    renderCurrentQuestion();
  </script>
</body>
</html>
```

### 9.4 worker.js (Cloudflare Worker)

```javascript
export default {
  async fetch(req, env) {
    const upgrade = req.headers.get('Upgrade');
    if (upgrade === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      
      server.accept();
      env.SESSIONS.add(server);
      
      server.addEventListener('message', async (event) => {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'cell') {
          // Broadcast to all connected devices
          env.SESSIONS.forEach(s => {
            if (s !== server && s.readyState === 1) {
              s.send(event.data);
            }
          });
          
          // If it's a side_ask, process with chatbot
          if (msg.cell.type === 'side_ask') {
            const response = await processChatbot(msg.cell, env);
            env.SESSIONS.forEach(s => {
              if (s.readyState === 1) {
                s.send(JSON.stringify({ type: 'cell', cell: response }));
              }
            });
          }
        }
      });
      
      return new Response(null, { status: 101, 
        webSocket: client });
    }
    
    return new Response('Quilt Classroom Worker');
  }
};

async function processChatbot(askCell, env) {
  // Scoped context: current question + lesson notes
  const context = await buildScope(askCell);
  
  const completion = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful tutor. Use the lesson context to guide students. Do not give direct answers to test questions — give hints.' },
        ...context,
        { role: 'user', content: askCell.body.text }
      ],
      temperature: 0.7,
      max_tokens: 300
    })
  });
  
  const data = await completion.json();
  
  return {
    id: crypto.randomUUID(),
    type: 'chat_response',
    body: { text: data.choices[0].message.content, model: 'gpt-4o-mini' },
    inputs: ['chatbot'],
    outputs: [askCell.body.studentId],
    meta: {},
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}
```

---

## 10. The watch extended: plural, distributed, includes the students

### 10.1 The watch in Quilt

In earlier Quilt papers, the "watch" is the observer of the cell graph — the entity that monitors changes and triggers reactions. In software systems, the watch is the developer's terminal. In the DAW, the watch is the transport listener.

In Quilt-classroom, the watch is extended in three ways:

1. **Plural**: There are many watchers. The teacher watches. Each student watches (their own neighborhood). The chatbot watches (its scoped inputs). The system itself watches (for indicators).
2. **Distributed**: Watchers are on different devices, connected via WebSocket. There is no single observer.
3. **Includes the students**: Students are not just observed. They observe. The student's tablet is a watcher of the graph — it watches for new question-cells pushed to it. The student is an active participant in the watch, not a passive subject.

### 10.2 The watch topology

```
┌─────────────────────────────────────────────────────┐
│                  CELL GRAPH                          │
│                                                      │
│   ┌─── WATCH: teacher (dashboard, all cells) ───┐   │
│   │                                              │   │
│   │  [teacher]──push──>[question]──>[student_1]  │   │
│   │       │                    │           │     │   │
│   │     observe               observe     observe  │   │
│   │       │                    │           │     │   │
│   │  [indicator]          [answer_1] <────┘     │   │
│   │                                              │   │
│   └──────────────────────────────────────────────┘   │
│                                                      │
│   ┌─── WATCH: student_1 (own neighborhood) ─────┐   │
│   │  [question]──>[student_1]──>[answer_1]       │   │
│   │      │              │            │           │   │
│   │    receive        respond      submitted      │   │
│   └──────────────────────────────────────────────┘   │
│                                                      │
│   ┌─── WATCH: chatbot (scoped inputs) ───────────┐  │
│   │  [side_ask]──>[chatbot]──>[chat_response]     │  │
│   └──────────────────────────────────────────────┘   │
│                                                      │
│   ┌─── WATCH: system (indicators) ───────────────┐  │
│   │  [all cells]──>[indicator_computation]        │  │
│   └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 10.3 Implications of plural distributed watching

The plural distributed watch has a profound implication: **the classroom is a distributed system.** It is not a client-server application where the teacher's laptop is the server and the students' tablets are clients. It is a peer graph where every node observes and reacts.

This means:

- **Students can push cells to each other** (peer help, peer review). The graph topology permits it; the opener policy controls it.
- **Students can observe each other's progress** (if the teacher opens that visibility). The cell graph supports it; the opener decides what to show.
- **The chatbot observes the student's history** (within its scope). It is a watcher with limited vision.
- **The system itself is a watcher** — indicator computation runs as a background process that observes the graph and writes indicator-cells back.

The watch is no longer a single pair of eyes. It is the classroom itself, watching itself.

---

## 11. Conclusion: a new high abstraction for inter-instance interactions

### 11.1 What we have achieved

We have shown that the Quilt cell model — a single abstraction developed for software systems and digital audio — extends to the classroom without modification. The cell, the graph, the opener, the watch — all apply directly.

The classroom is a cell graph. The teacher is a cell. The student is a cell. The question is a cell. The answer is a cell. The chatbot is a cell. The indicator is a cell. The group is a cell. The sub-lesson is a set of cells.

Every interaction in the classroom — pushing a question, submitting an answer, asking a chatbot, computing a struggle score, forming a group, launching a sub-lesson — is a cell operation. There is one primitive: add a cell, link it, observe it.

### 11.2 Why this matters

The significance is not that classrooms can be modeled as graphs. Anything can be modeled as a graph. The significance is that **the same graph abstraction serves software, audio, and education**, and that the same openers (spreadsheet, DAW, custom) apply across all three domains.

This means:

1. **Tooling transfers.** The Quilt cell editor, the DAW timeline, the spreadsheet opener — all work on classroom graphs without modification. A teacher who has used a spreadsheet can use the classroom spreadsheet. A teacher who has used a DAW can use the classroom DAW.

2. **Pedagogy becomes programmable.** Because the classroom is a cell graph, pedagogical strategies are graph operations. Differentiation is a topology change. Grouping is a subgraph. Gamification is metadata. Real-time intervention is indicator-driven cell pushing.

3. **The chatbot is native, not bolted on.** The scoped chatbot is a cell with a model and a scope. It is part of the graph. It is auditable. It is time-traversable. It is not a separate API call to a separate system — it is a node in the classroom's canonical form.

4. **Privacy is a graph property.** What a student sees is determined by which cells their opener queries. What the chatbot sees is determined by its scope. What the teacher sees is determined by their opener's query. Privacy is not a policy layer on top of the system — it is the graph topology itself.

### 11.3 The broader pattern

The Quilt project has now demonstrated that the cell model applies to:

| Domain | Paper | Cell types |
|---|---|---|
| Software systems | Papers 1-10 | functions, modules, tests, docs |
| Multi-agent AI | Papers 11-15 | agents, messages, tools, contexts |
| Digital audio (DAW) | Paper 19 | tracks, clips, automation, plugins |
| Education (this paper) | Paper 20 | persons, questions, answers, chatbots, indicators |

The pattern is clear: **any system where instances interact — functions calling functions, agents messaging agents, clips overlapping clips, students answering teachers — can be modeled as a cell graph.** The cell is the universal primitive of inter-instance interaction.

The classroom is not a special case. It is an instance of the general pattern. And the general pattern is: **cells in a graph, observed through openers, synced across devices, watched by all participants.**

### 11.4 Future work

- **Time-travel for classrooms**: The Time-Travel DAW demonstrated scrubbing through audio history. The same applies to classrooms: scrub through a lesson to see what happened at each moment. Which students were struggling at minute 15? What did the chatbot say to Carol at minute 22? The cell graph's immutability makes this possible.

- **Cell templates for lesson plans**: A lesson plan is a template for a set of cells (questions, reference notes, chatbot configs). Teachers can share lesson plans as cell templates that instantiate into the graph.

- **Cross-classroom graphs**: Multiple classrooms can be linked into a higher-level graph. A school is a graph of classroom-graphs. A district is a graph of school-graphs. The cell model scales.

- **AI-generated cells**: An AI can generate question-cells, hint-cells, and sub-lesson-cells based on the current state of the graph. The teacher reviews and pushes them. This is not AI replacing the teacher — it is AI generating cells that the teacher curates.

### 11.5 Closing

The classroom was always a graph. The teacher was always a node. The students were always nodes. The questions were always edges. What Quilt provides is the **abstraction** — the vocabulary and the machinery — to make this graph explicit, programmable, observable, and shared.

One primitive. One graph. Many openers. Many watchers. The classroom, finally, as what it always was.

---

**References**

1. Quilt: A Cell Model for Software Systems. Paper 1.
2. Quilt Multi-Agent: Cells as Agents. Paper 11.
3. The Time-Travel DAW: Quilt Cells as Audio. Paper 19.
4. Quilt Openers: Spreadsheet, DAW, Code, Custom. Paper 7.
5. Quilt Sync: BroadcastChannel and Cloudflare Workers. Paper 14.

---

*Author: Mavis*  
*Word count: ~4,800*