# POLLN Spreadsheet Integration - Developer Onboarding Guide

**"From Zero to Hero: Your First 12 Weeks Building the Future of Inspectable AI"**

---

## Welcome to POLLN!

You're joining a team building **the first open-source spreadsheet AI where every decision is inspectable**. We're not replacing spreadsheet users with AI—we're growing a colony of tiny assistants that learned their workflow by watching them work.

### Your Mission

Transform 1,500+ pages of research into a production-ready spreadsheet plugin. Reverse engineer monolithic LLMs into thousands of inspectable "Fractured AI Boxes". Build the future of **understandable AI**.

---

## Table of Contents

1. [Quick Start (First Hour)](#quick-start-first-hour)
2. [Week 1: Foundation](#week-1-foundation)
3. [Week 2-4: Reverse Engineering](#week-2-4-reverse-engineering)
4. [Week 5-8: Gap Detection & Agency](#week-5-8-gap-detection--agency)
5. [Week 9-12: Spreadsheet Integration](#week-9-12-spreadsheet-integration)
6. [Development Workflow](#development-workflow)
7. [Testing & Quality](#testing--quality)
8. [Resources & References](#resources--references)
9. [Getting Help](#getting-help)

---

## Quick Start (First Hour)

### Step 1: Environment Setup (15 minutes)

```bash
# Clone repository
git clone https://github.com/SuperInstance/polln.git
cd polln

# Install dependencies
npm install

# Run tests
npm test

# Build project
npm run build
```

**Expected Output**:
- All tests pass (821+ passing)
- Build succeeds without errors
- `dist/` directory created

### Step 2: Explore Codebase (20 minutes)

```bash
# Core POLLN architecture
src/
├── core/
│   ├── agents/          # Agent system
│   ├── colony/          # Colony coordination
│   ├── decision/        # Decision engine (Plinko)
│   ├── learning/        # Learning systems
│   └── kv-cache/        # KV-cache optimization

# Spreadsheet integration (new!)
src/spreadsheet/
├── reverse-engineering/ # Phase 1
├── gap-detection/       # Phase 2
├── agency/              # Phase 3
├── excel/               # Phase 4
└── ui/                  # Phase 4

# Research documents
docs/research/spreadsheet/
├── ROADMAP.md           # Read this first!
├── IMPLEMENTATION_PLAN.md
├── BREAKDOWN_R2_*.md    # Fractured AI Boxes
└── *.md                 # 100+ research documents
```

### Step 3: First Build (10 minutes)

```bash
# Run CLI tool
npm run cli

# List colonies
npm run colony:list

# Check system status
npm run scale:status
```

**Expected Output**:
- CLI tool runs successfully
- System status shows healthy state
- No errors or warnings

### Step 4: Read Key Documents (15 minutes)

**Priority Order**:
1. `ROADMAP.md` - 52-week implementation plan
2. `MVP_PLAN.md` - Strategic vision (50+ pages)
3. `CLAUDE.md` - Project instructions
4. `ARCHITECTURE.md` - System architecture

### Step 5: Join Community (5 minutes)

```bash
# Discord: https://discord.gg/polln
# GitHub: https://github.com/SuperInstance/polln
# Twitter: @polln_ai
```

---

## Week 1: Foundation

### Day 1: Project Orientation

**Goals**:
- [ ] Understand the vision (inspectable AI)
- [ ] Read MVP_PLAN.md (executive summary)
- [ ] Review ROADMAP.md (52-week plan)
- [ ] Set up development environment

**Deliverables**:
- Development environment working
- All tests passing
- GitHub notifications enabled

### Day 2: Architecture Deep Dive

**Goals**:
- [ ] Read ARCHITECTURE.md
- [ ] Study core POLLN modules
- [ ] Understand AgentCell concept
- [ ] Review 4-level abstraction (L0-L3)

**Key Concepts**:
```
L0: Pure Logic (<1ms, $0)
L1: Cached Patterns (~10ms, ~$0)
L2: Distilled Agents (~100ms, ~$0.001)
L3: Full LLM (~1s, ~$0.01)
```

**Deliverables**:
- Architecture diagram created
- Core concepts documented

### Day 3: Research Overview

**Goals**:
- [ ] Review 00_INDEX.md (research summary)
- [ ] Scan Breakdown R2 documents (fractured boxes)
- [ ] Understand model cascade concept
- [ ] Review transformer layer mapping

**Key Documents**:
- `BREAKDOWN_R2_MODEL_CASCADE.md`
- `BREAKDOWN_R2_TRANSFORMER_LAYERS.md`
- `BREAKDOWN_R2_ORCHESTRATOR_PROTOCOL.md`

**Deliverables**:
- Research summary notes
- Questions prepared for team

### Day 4: Development Workflow

**Goals**:
- [ ] Learn git workflow (branching, PRs)
- [ ] Set up IDE (VS Code extensions)
- [ ] Configure ESLint, Prettier
- [ ] Run first build locally

**Commands**:
```bash
# Create feature branch
git checkout -b feature/my-first-feature

# Run linting
npm run lint

# Format code
npm run format

# Run tests in watch mode
npm run test:watch
```

**Deliverables**:
- Development workflow mastered
- First PR created (even if trivial)

### Day 5: First Task Assignment

**Goals**:
- [ ] Discuss role with tech lead
- [ ] Receive first task assignment
- [ ] Set up task tracking
- [ ] Plan Week 2-4 work

**Possible Tasks**:
- Implement simple box type
- Add unit test for existing feature
- Document a module
- Create example template

**Deliverables**:
- Task list created
- Week 2-4 plan finalized

---

## Week 2-4: Reverse Engineering

### Week 2: Model Cascade

**Learning Objectives**:
- Understand 5-level cascade hierarchy
- Learn distillation trigger algorithms
- Study verification protocols
- Explore fallback mechanisms

**Reading List**:
1. `BREAKDOWN_R2_MODEL_CASCADE.md` (complete)
2. Research on model distillation
3. Cost optimization strategies

**Hands-On Tasks**:
```typescript
// Task 1: Implement simple cascade
class ModelCascade {
  async route(task: Task): Promise<ModelLevel> {
    // Determine appropriate level (Oracle→Expert→Specialist→Worker→Logic)
  }

  async execute(task: Task, level: ModelLevel): Promise<Result> {
    // Execute at appropriate level
  }
}

// Task 2: Add distillation trigger
class DistillationTrigger {
  shouldDistill(agent: Agent): boolean {
    // Check if agent used 100+ times with >90% success
  }

  async distill(agent: Agent): Promise<DistilledAgent> {
    // Create smaller model from large agent
  }
}
```

**Week 2 Goals**:
- [ ] Implement basic cascade router
- [ ] Add simple distillation trigger
- [ ] Write unit tests
- [ ] Document approach

### Week 3: Transformer Layer Mapping

**Learning Objectives**:
- Understand attention mechanisms
- Learn attention head types (8 types)
- Study FFN to logic mapping
- Explore residual stream tracking

**Reading List**:
1. `BREAKDOWN_R2_TRANSFORMER_LAYERS.md` (complete)
2. "Attention Is All You Need" paper
3. Transformer architecture guides

**Hands-On Tasks**:
```typescript
// Task 1: Map attention heads to cells
class AttentionMapper {
  mapHead(head: AttentionHead): BoxType {
    // Classify head type (positional, syntactic, semantic, etc.)
    // Create corresponding box
  }

  parseLayer(layer: TransformerLayer): MappedLayer {
    // Decompose layer into boxes
  }
}

// Task 2: Track residual stream
class ResidualTracker {
  trackFlow(layers: Layer[]): FlowMap {
    // Trace information through layers
    // Identify convergence points
  }
}
```

**Week 3 Goals**:
- [ ] Implement attention head classifier
- [ ] Create layer decomposer
- [ ] Add residual stream visualization
- [ ] Test on GPT-2 small

### Week 4: Orchestrator Protocol

**Learning Objectives**:
- Understand box coordination
- Learn tokenization protocol
- Study ambiguity resolution
- Explore quick reference system

**Reading List**:
1. `BREAKDOWN_R2_ORCHESTRATOR_PROTOCOL.md` (complete)
2. `BREAKDOWN_R2_TOKENIZATION_PROTOCOL.md` (complete)
3. `BREAKDOWN_R2_AMBIGUITY_RESOLUTION.md` (complete)

**Hands-On Tasks**:
```typescript
// Task 1: Coordinate multiple boxes
class BoxCoordinator {
  async coordinate(boxes: Box[]): Promise<CoordinationResult> {
    // Orchestrate parallel/sequential execution
    // Handle dependencies
  }

  resolveConflict(conflict: Conflict): Resolution {
    // Apply conflict resolution strategies
  }
}

// Task 2: Resolve ambiguity
class AmbiguityResolver {
  detectAmbiguity(input: string): AmbiguityType[] {
    // Identify ambiguous tokens/phrases
  }

  resolve(ambiguous: AmbiguousInput): ResolvedInput {
    // Apply resolution strategies
  }
}
```

**Week 4 Goals**:
- [ ] Implement basic coordinator
- [ ] Add ambiguity detection
- [ ] Create resolution strategies
- [ ] End-to-end integration test

**End of Month 1 Milestone**:
- [ ] Reverse engineering pipeline working
- [ ] GPT-2 decomposed into boxes
- [ ] Orchestrator coordinating boxes
- [ ] Documentation complete

---

## Week 5-8: Gap Detection & Agency

### Week 5: Gap Detection System

**Learning Objectives**:
- Understand gap taxonomy (6 categories)
- Learn static analysis techniques
- Study dynamic analysis
- Explore severity classification

**Reading List**:
1. `GAP_DETECTION_FILLING.md` (complete)
2. Static analysis tools (ESLint, TypeScript)
3. Dynamic analysis techniques

**Hands-On Tasks**:
```typescript
// Task 1: Detect code gaps
class StaticAnalyzer {
  analyzeCode(code: string): Gap[] {
    // Find missing functions
    // Identify incomplete implementations
    // Detect dead code
  }
}

// Task 2: Detect runtime gaps
class DynamicAnalyzer {
  analyzeExecution(execution: ExecutionTrace): Gap[] {
    // Find unhandled exceptions
    // Identify missing validations
    // Detect race conditions
  }
}
```

**Week 5 Goals**:
- [ ] Implement static analyzer
- [ ] Add dynamic analyzer
- [ ] Create gap classifier
- [ ] Test on sample codebases

### Week 6: Gap Classification

**Learning Objectives**:
- Understand multi-dimensional classification
- Learn business value scoring
- Study technical debt ranking
- Explore priority calculation

**Hands-On Tasks**:
```typescript
// Task 1: Classify gaps
class GapClassifier {
  classify(gap: Gap): GapClassification {
    // Type: code, logic, data, error, doc, test
    // Complexity: simple, moderate, complex
    // Domain: UI, logic, data, integration
  }
}

// Task 2: Calculate priority
class PriorityCalculator {
  calculate(gap: Gap, classification: GapClassification): Priority {
    // Business value × technical debt × severity
  }
}
```

**Week 6 Goals**:
- [ ] Implement gap classifier
- [ ] Add business value scorer
- [ ] Create priority calculator
- [ ] Validate on real gaps

### Week 7: Gap Filling

**Learning Objectives**:
- Understand agent-assisted code generation
- Learn template-based filling
- Study LLM-based synthesis
- Explore hybrid approaches

**Hands-On Tasks**:
```typescript
// Task 1: Template-based filling
class TemplateFiller {
  fill(gap: Gap): FilledCode {
    // Match gap to template
    // Instantiate template with context
  }
}

// Task 2: LLM-based synthesis
class LLMSynthesizer {
  synthesize(gap: Gap): FilledCode {
    // Use GPT-4 to generate code
    // Validate generated code
  }
}
```

**Week 7 Goals**:
- [ ] Implement template filler
- [ ] Add LLM synthesizer
- [ ] Create hybrid approach
- [ ] Validate generated code

### Week 8: Agency Determination

**Learning Objectives**:
- Understand 5-level automation spectrum
- Learn decision point analysis
- Study cost-benefit calculation
- Explore migration patterns

**Reading List**:
1. `AGENCY_DETERMINATION.md` (complete)
2. `AGENT_BREAKDOWN.md` (complete)
3. Cost optimization research

**Hands-On Tasks**:
```typescript
// Task 1: Determine agency level
class AgencyDeterminator {
  determineLevel(task: Task): AutomationLevel {
    // Assess if task needs LLM or can be automated
    // Return Level 0-4
  }
}

// Task 2: Optimize agent
class AgentOptimizer {
  optimize(agent: Agent): OptimizedAgent {
    // Try Level 4→3→2→1→0 conversion
    // Return simplest form that works
  }
}
```

**Week 8 Goals**:
- [ ] Implement agency determinator
- [ ] Add cost-benefit calculator
- [ ] Create agent optimizer
- [ ] Demonstrate cost savings

**End of Month 2 Milestone**:
- [ ] Gap detection working
- [ ] Gap filling operational
- [ ] Agency determination functional
- [ ] Cost optimization demonstrated

---

## Week 9-12: Spreadsheet Integration

### Week 9: Excel Add-in Foundation

**Learning Objectives**:
- Understand Office.js API
- Learn custom functions
- Study ribbon UI
- Explore task pane development

**Reading List**:
1. Office.js documentation
2. Excel add-in tutorials
3. `SIDE_PANEL_SPECS.md` (complete)

**Hands-On Tasks**:
```typescript
// Task 1: Create custom function
Excel.ScriptCustomFunctions.load("AGENT", (category: string, range: Excel.Range) => {
  // Return agent result
});

// Task 2: Add ribbon button
Office.actions.associate("AGENT_BUTTON", () => {
  // Open agent creation wizard
});
```

**Week 9 Goals**:
- [ ] Set up Office.js project
- [ ] Create =AGENT() function
- [ ] Add ribbon UI
- [ ] Test in Excel Online

### Week 10: AgentCell Integration

**Learning Objectives**:
- Understand 4-level abstraction
- Learn pattern induction
- Study weight system
- Explore confidence scoring

**Reading List**:
1. `CELL_TYPE_SPECS.md` (complete)
2. `PATTERN_INDUCTION_SPECS.md` (complete)
3. `WEIGHT_SYSTEM_SPECS.md` (complete)

**Hands-On Tasks**:
```typescript
// Task 1: Create AgentCell
class AgentCell {
  constructor(
    public id: string,
    public position: {row: number, col: number},
    public function: string,
    public logicLevel: 0 | 1 | 2 | 3
  ) {}

  async execute(): Promise<Result> {
    // Execute at appropriate logic level
  }
}

// Task 2: Add pattern induction
class PatternInducer {
  induce(examples: InputOutputPair[]): Pattern {
    // Extract pattern from examples
    // Return induced pattern (not code!)
  }
}
```

**Week 10 Goals**:
- [ ] Implement AgentCell class
- [ ] Add pattern induction
- [ ] Create weight visualization
- [ ] Test confidence scoring

### Week 11: Side Panel UI

**Learning Objectives**:
- Understand React + Zustand architecture
- Learn component design
- Study WebSocket communication
- Explore performance optimization

**Reading List**:
1. `SIDE_PANEL_IMPLEMENTATION_GUIDE.md` (complete)
2. React + TypeScript guides
3. Zustand state management

**Hands-On Tasks**:
```typescript
// Task 1: Create inspector panel
function InspectorPanel() {
  const agent = useAgentStore(state => state.agent);
  const reasoning = useReasoningStore(state => state.reasoning);

  return (
    <div>
      <AgentInfo agent={agent} />
      <ReasoningTrace trace={reasoning} />
      <CostDashboard />
      <SimulationMode />
    </div>
  );
}

// Task 2: Add WebSocket connection
const ws = new WebSocket('ws://localhost:3000');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  updateAgentStore(update);
};
```

**Week 11 Goals**:
- [ ] Build inspector panel
- [ ] Add reasoning trace viewer
- [ ] Create cost dashboard
- [ ] Implement simulation mode

### Week 12: Template Library

**Learning Objectives**:
- Understand template format
- Learn marketplace design
- Study community sharing
- Explore template wizard

**Hands-On Tasks**:
```typescript
// Task 1: Create template
const salesAnalysisTemplate: Template = {
  name: "Sales Trend Analysis",
  description: "Analyze sales trends over time",
  cells: [
    { position: "A1", agent: "DataFetcher", config: {...} },
    { position: "A2", agent: "TrendAnalyzer", config: {...} },
    { position: "A3", agent: "ChartGenerator", config: {...} },
  ],
};

// Task 2: Build template library
class TemplateLibrary {
  async list(): Promise<Template[]> {
    // Return available templates
  }

  async apply(template: Template): Promise<void> {
    // Apply template to current sheet
  }
}
```

**Week 12 Goals**:
- [ ] Create 5 starter templates
- [ ] Build template library UI
- [ ] Add template wizard
- [ ] Enable community sharing

**End of Month 3 Milestone**:
- [ ] Excel add-in working
- [ ] AgentCell integration complete
- [ ] Side panel UI functional
- [ ] Template library ready

---

## Development Workflow

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes
git add .
git commit -m "feat: add my feature"

# 3. Push to remote
git push origin feature/my-feature

# 4. Create pull request
# Go to GitHub and create PR

# 5. Wait for review
# Address feedback

# 6. Merge when approved
# Delete branch
```

### Code Review Checklist

- [ ] Code follows style guide (ESLint, Prettier)
- [ ] Tests added/updated (85%+ coverage)
- [ ] Documentation updated
- [ ] No console.log or debugging code
- [ ] Tests pass locally
- [ ] No merge conflicts

### Commit Message Format

```
type(scope): subject

body

footer
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

**Example**:
```
feat(cascade): add model cascade router

Implement 5-level cascade routing system (Oracle→Expert→Specialist→Worker→Logic)
with automatic distillation triggers and fallback mechanisms.

Closes #123
```

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions

---

## Testing & Quality

### Test Structure

```
src/
├── core/
│   └── __tests__/
│       ├── unit/           # Unit tests
│       ├── integration/    # Integration tests
│       └── e2e/           # End-to-end tests
```

### Writing Tests

```typescript
describe('ModelCascade', () => {
  describe('routing', () => {
    it('should route simple tasks to Logic level', async () => {
      const cascade = new ModelCascade();
      const task = simpleTask();

      const level = await cascade.route(task);

      expect(level).toBe(ModelLevel.Logic);
    });

    it('should route complex tasks to Oracle level', async () => {
      const cascade = new ModelCascade();
      const task = complexTask();

      const level = await cascade.route(task);

      expect(level).toBe(ModelLevel.Oracle);
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run coverage
npm run test:coverage

# Run specific test file
npm test -- ModelCascade.test.ts

# Run integration tests
npm run test:integration
```

### Quality Standards

- **Coverage**: 85%+ minimum, 90%+ target
- **Complexity**: Cyclomatic complexity <10 per function
- **File Size**: <500 lines per file
- **Function Size**: <50 lines per function
- **Documentation**: JSDoc for all public APIs

---

## Resources & References

### Essential Reading

**Start Here** (Week 1):
1. `ROADMAP.md` - 52-week plan
2. `MVP_PLAN.md` - Strategic vision
3. `CLAUDE.md` - Project instructions
4. `ARCHITECTURE.md` - System architecture

**Phase 1** (Week 2-4):
1. `BREAKDOWN_R2_MODEL_CASCADE.md`
2. `BREAKDOWN_R2_TRANSFORMER_LAYERS.md`
3. `BREAKDOWN_R2_ORCHESTRATOR_PROTOCOL.md`

**Phase 2** (Week 5-8):
1. `GAP_DETECTION_FILLING.md`
2. `AGENCY_DETERMINATION.md`
3. `AGENT_BREAKDOWN.md`

**Phase 3** (Week 9-12):
1. `CELL_TYPE_SPECS.md`
2. `SIDE_PANEL_SPECS.md`
3. `SOFTWARE_VISUALIZATION.md`

### External Resources

**Technical**:
- Office.js API: https://docs.microsoft.com/en-us/javascript/api/office
- React + TypeScript: https://react-typescript-cheatsheet.netlify.app/
- Transformer Architecture: https://jalammar.github.io/illustrated-transformer/

**Research**:
- "Attention Is All You Need" (Vaswani et al.)
- "Language Models are Few-Shot Learners" (GPT-3)
- "Constitutional AI" (Anthropic)

**Community**:
- Discord: https://discord.gg/polln
- GitHub: https://github.com/SuperInstance/polln
- Twitter: @polln_ai

### Development Tools

**Required**:
- Node.js 18+
- npm or yarn
- Git
- VS Code (recommended)

**Recommended VS Code Extensions**:
- ESLint
- Prettier
- TypeScript Importer
- GitLens
- REST Client

---

## Getting Help

### When You're Stuck

1. **Search existing docs** - 100+ documents in `docs/research/spreadsheet/`
2. **Check GitHub Issues** - Someone may have asked before
3. **Ask in Discord** - `#help` channel is active
4. **DM tech lead** - For blockers

### Daily Standup Format

```
Yesterday:
- Completed X
- Made progress on Y

Today:
- Plan to work on Z
- Need help with A

Blockers:
- None / [describe blocker]
```

### Weekly Progress Report

```
Week X: [Week Name]

Goals:
✅ Completed goal 1
✅ Completed goal 2
⏳ In progress: goal 3
❌ Not started: goal 4

Learned:
- [Key learning 1]
- [Key learning 2]

Next Week:
- [Planned work]
```

---

## Success Criteria

### Week 1
- [ ] Environment setup
- [ ] All tests passing
- [ ] Architecture understood

### Month 1 (Week 4)
- [ ] Model cascade implemented
- [ ] Transformer layer mapping working
- [ ] Orchestrator protocol functional

### Month 2 (Week 8)
- [ ] Gap detection operational
- [ ] Gap filling working
- [ ] Agency determination functional

### Month 3 (Week 12)
- [ ] Excel add-in working
- [ ] AgentCell integration complete
- [ ] Side panel UI functional
- [ ] Template library ready

---

## Welcome Aboard!

You're joining at an exciting time. We have:
- **1,500+ pages** of research
- **100+ documents** of specifications
- **200+ TypeScript interfaces** defined
- **52-week roadmap** to production

**Your contribution matters**. Every line of code, every test, every document brings us closer to "The Spreadsheet Moment for AI Distillation."

**Let's build the future of understandable AI. Together.** 🐝

---

**Document Version**: 1.0
**Last Updated**: 2026-03-08
**Status**: ✅ Complete - Ready for new developers
**Next Review**: Monthly updates based on progress

---

*Questions? Ask in Discord #help or DM tech lead.*
