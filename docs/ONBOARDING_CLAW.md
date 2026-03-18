# Team 2: claw/ Engineer Onboarding

**Role:** Backend Architect
**Repository:** https://github.com/SuperInstance/claw
**Local Path:** `/c/Users/casey/polln/claw`
**Current Branch:** `phase-3-simplification`
**Status:** Phase 3 Day 1 Complete - All critical findings addressed

---

## Your Mission

Strip OpenCLAW to create a minimal ~500-line cellular agent engine for spreadsheet integration. You are building the core engine that powers intelligent agents in spreadsheet cells.

---

## Phase 3 Day 1 Summary (What You Just Completed)

### ✅ Critical Findings Addressed

**1. Dependency Cleanup**
- Removed 80+ channel SDK dependencies (90% reduction)
- Package.json: 477 → 83 lines (83% reduction)
- Exports: 200+ → 1 (99% reduction)
- Scripts: 100+ → 10 (90% reduction)

**2. Configuration Cleanup**
- Removed orphaned plugin SDK paths from tsconfig.json
- Simplified TypeScript configuration
- Fixed all broken imports

**3. Security**
- `pnpm audit` shows zero vulnerabilities
- All dependencies clean and secure

### 📊 Current Statistics

| Metric | Before Phase 3 | After Day 1 | Reduction |
|--------|----------------|--------------|-----------|
| Dependencies | 100+ | 10 | **90%** |
| Package.json Lines | 477 | 83 | **83%** |
| Exports | 200+ | 1 | **99%** |
| Scripts | 100+ | 10 | **90%** |

### 📁 Dependencies Kept (10 core packages)
- express 5.2.1 - HTTP server
- hono 4.12.7 - Lightweight web framework
- tslog 4.10.2 - TypeScript logging
- undici 7.24.1 - HTTP client
- ws 8.19.0 - WebSocket client
- yaml 2.8.2 - YAML parser
- zod 4.3.6 - Schema validation
- @types/* - TypeScript definitions
- vitest, oxfmt, oxlint, tsx - Development tools

---

## Next Phase: Week 3-4 Core Simplification

### Week 3: Core Module Simplification

**Day 11-12: Simplify src/agents/**
- Remove bash execution remnants
- Simplify auth profiles (single API key mode only)
- Clean up PI agent integration
- **Target:** ~500 lines removed

**Day 13-14: Simplify src/acp/**
- Remove ACP protocol complexity
- Simplify to single-cell session model
- Remove multi-agent coordination
- **Target:** ~300 lines removed

**Day 15-16: Simplify src/gateway/**
- Remove plugin system
- Simplify WebSocket to cell-level only
- Remove webhook routing
- **Target:** ~400 lines removed

**Day 17: Simplify src/config/**
- Flatten 5-level hierarchy to single level
- Remove runtime config updates
- Simplify to per-cell config
- **Target:** ~200 lines removed

### Week 4: Minimal Core Loop Implementation

**Day 18-19: Implement Core Loop**
```typescript
// Minimal ~500-line core loop
TRIGGER → ROUTE → EXECUTE → RESPOND → CLEANUP

interface CoreLoop {
  trigger(cellId: string): void;
  route(cellId: string): ClawConfig;
  execute(config: ClawConfig): Promise<ClawResult>;
  respond(cellId: string, result: ClawResult): void;
  cleanup(cellId: string): void;
}
```

**Day 20-21: Implement Equipment System**
- Convert tool execution to equipment pattern
- Add equipment registry
- Implement equipment lifecycle
- Add equipment validation
- **Target:** ~300 lines

**Day 22-23: Add Cell Integration**
- Cell trigger listeners
- Cell update mechanisms
- Cell state persistence
- Cell lifecycle management
- **Target:** ~200 lines

**Day 24: Testing & Documentation**
- Integration tests
- Performance validation
- Documentation updates
- **Target:** <100ms trigger latency, <10MB memory

---

## Quick Start for Week 3

### 1. Check Current Status
```bash
cd /c/Users/casey/polln/claw
git status
git log --oneline -5
pnpm install
pnpm test
```

### 2. Create Core Simplification Branch
```bash
git checkout -b week-3-core-simplification
```

### 3. Start with src/agents/ Simplification
**File:** `src/agents/agent.ts`

**Before:**
```typescript
// Complex bash execution, PI agent, multi-profile auth
// ~2000 lines
```

**After:**
```typescript
// Simplified to single API key, no bash, no PI
// ~500 lines
export class Agent {
  constructor(private config: AgentConfig) {
    this.validateApiKey(config.apiKey);
  }

  private validateApiKey(key: string): void {
    if (key.length < 20) {
      throw new Error('API key must be at least 20 characters');
    }
  }

  async execute(prompt: string): Promise<AgentResponse> {
    // Simple execution without bash/PI
  }
}
```

### 4. Test Compilation
```bash
pnpm exec tsc --noEmit
```

---

## Integration with Constraint Theory (Future)

Once constrainttheory/ is implemented, you will integrate geometric logic:

**1. Core Loop Enhancement**
```typescript
// Use geometric snapping for deterministic execution
execute(config: ClawConfig): Promise<ClawResult> {
  // 1. Get constraint theory validation
  const validation = await constraintTheory.validate(config);

  // 2. If not rigid, adjust
  if (!validation.isRigid) {
    config = await constraintTheory.snapToRigid(config);
  }

  // 3. Execute with geometric guarantee
  return await this.executeWithGeometry(config);
}
```

**2. Equipment System**
```typescript
// Use geometric algorithms for equipment optimization
class Equipment {
  optimize(manifold: GeometricManifold): EquipmentConfig {
    // Apply constraint theory for efficiency
    return constraintTheory.optimizeEquipment(manifold);
  }
}
```

**3. Cell Trigger**
```typescript
// Use Pythagorean snapping for validation
trigger(cellId: string): void {
  const cell = this.getCell(cellId);

  // Validate geometric rigidity
  if (!constraintTheory.isRigid(cell.config)) {
    throw new Error('Cell configuration is not geometrically rigid');
  }

  // Trigger execution
  this.execute(cell.config);
}
```

---

## Success Criteria

### Week 3
- [ ] src/agents/ simplified (~500 lines removed)
- [ ] src/acp/ simplified (~300 lines removed)
- [ ] src/gateway/ simplified (~400 lines removed)
- [ ] src/config/ flattened (~200 lines removed)
- [ ] TypeScript compiles with zero errors

### Week 4
- [ ] ~500-line core loop implemented
- [ ] Equipment system working
- [ ] Cell trigger mechanism functional
- [ ] Integration tests passing
- [ ] <100ms trigger latency achieved
- [ ] <10MB memory per claw

---

## Communication

### Daily Updates
Provide updates in:
- GitHub PRs for code reviews
- COMMAND_AND_CONTROL.md for cross-team coordination
- Email for blockers requiring my attention

### Escalation
If you encounter blockers:
1. Document the issue clearly
2. Provide context and impact assessment
3. Suggest potential solutions
4. Tag me for immediate attention

---

## Resources

### Documentation
- `claw/docs/PHASE_3_PLAN.md` - 3-week roadmap
- `claw/docs/PHASE_3_STATUS.md` - Day 1 status
- `claw/docs/QUICK_REFERENCE.md` - TL;DR summary
- `claw/docs/ZEROCLAW_ANALYSIS.md` - Strategic decision rationale

### Review Reports
- `/c/Users/casey/polln/REVIEW_ARCHITECTURE.md` - Architecture review
- `/c/Users/casey/polln/REVIEW_CODE_QUALITY.md` - Code quality review
- `/c/Users/casey/polln/PHASE_2_SECURITY_AUDIT_REPORT.md` - Security audit

### Key Commands
```bash
pnpm install              # Install dependencies
pnpm build               # Build
pnpm test                 # Run tests
pnpm lint                 # Lint code
pnpm exec tsc --noEmit    # Type check
```

---

## Notes

- Be systematic: Remove one module at a time, test after each
- Watch dependencies: Some "unused" code may have hidden dependencies
- Keep tests: Update tests to work with simplified codebase
- Document changes: Update relevant documentation
- Focus on the ~500-line core loop target
- Remember: We're building for spreadsheet cells, not a standalone daemon

---

**Last Updated:** 2026-03-15
**Orchestrator:** Schema Architect (Primary Instance)
**Status:** Ready for Week 3 - Core Module Simplification
**Next:** Day 11-12 src/agents/ simplification
