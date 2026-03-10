# Next Session Quick-Start Guide

**Purpose:** Resume work immediately after machine restart
**Estimated Time:** 90 minutes to completion

---

## Step 1: Verify Current State (2 min)

```bash
cd /c/Users/casey/polln
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

**Expected:** ~82 errors (down from 200+)

---

## Step 2: Fix TypeScript Errors (75 min)

### Priority Order (Highest Impact First)

#### Batch 1: UI Components (~45 min)
Files with most errors:
1. `src/spreadsheet/ui/admin/FeatureFlagPanel.tsx` (436 errors)
2. `src/spreadsheet/features/cell-theater/CellInspectorWithTheater.tsx` (301 errors)
3. `src/spreadsheet/mobile/TouchCellInspector.tsx` (253 errors)
4. `src/spreadsheet/ui/admin/ExperimentReport.tsx` (242 errors)
5. `src/spreadsheet/ui/components/CellInspector.tsx` (237 errors)

**Fix Pattern:**
- Add missing type imports
- Fix React component prop types
- Add `.js` extensions to imports if needed
- Add explicit type annotations for implicit `any`

#### Batch 2: Backup/API/CLI (~20 min)
1. `src/backup/strategies/*.ts` - Buffer type fixes
2. `src/api/index.ts` - Duplicate export fixes
3. `src/cli/commands/colonies.ts` - Config type fixes

#### Batch 3: Benchmarking (~10 min)
1. `src/benchmarking/examples/benchmarkValidation.ts` - Add explicit types

---

## Step 3: Run Tests (10 min)

```bash
npx vitest run src/spreadsheet/tiles/tests/
```

**Expected Tests:**
- Zone classification (GREEN/YELLOW/RED)
- Confidence flow (sequential multiplication, parallel averaging)
- Tile composition validation

---

## Step 4: Commit & Push (3 min)

```bash
git add -A
git commit -m "fix: All TypeScript errors resolved, tests passing"
git push origin main
```

---

## Key Files Reference

| File | Purpose | Status |
|------|--------|--------|
| `ONBOARD_ROADMAP.md` | Project overview | Ready |
| `PROJECT_AUDIT.md` | Comprehensive audit | Ready |
| `TYPESCRIPT_FIX_PLAN.md` | Error fix patterns | Ready |
| `CLAUDE.md` | Main context file | Update after fixes |
| `docs/research/smp-paper/` | Research docs | 31 documents |

---

## Common Fix Patterns

### Pattern 1: Missing Type Import
```typescript
// Before
import { Something } from './types';

// After
import type { Something, SomethingElse } from './types.js';
```

### Pattern 2: Implicit Any
```typescript
// Before
.map(item => item.value)

// After
.map((item: ItemType) => item.value)
```

### Pattern 3: Missing Override
```typescript
// Before
public method() { }

// After
public override method() { }
```

### Pattern 4: Buffer Type Mismatch
```typescript
// Before
const buf: Buffer = Buffer.from('data');

// After
const buf: Buffer<ArrayBufferLike> = Buffer.from('data');
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        POLLN System                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐   ┌──────────┐   ┌──────────┐               │
│  │  Tile   │──▶│ TileChain │──▶│ Registry │               │
│  └─────────┘   └──────────┘   └──────────┘               │
│       │            │                                      │
│       ▼            ▼                                      │
│  ┌─────────────────────────────────────────┐              │
│  │         Confidence Flow                 │              │
│  │  Sequential: MULTIPLY | Parallel: AVERAGE │              │
│  └─────────────────────────────────────────┘              │
│       │                                                   │
│       ▼                                                   │
│  ┌─────────────────────────────────────────┐              │
│  │         Zone Classification            │              │
│  │  GREEN ≥0.90 | YELLOW 0.75-0.89 | RED <0.75 │              │
│  └─────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

---

## Success Criteria

- [ ] TypeScript errors = 0
- [ ] All tests pass
- [ ] Git is clean (no uncommitted changes)
- [ ] Changes pushed to origin/main

---

*Ready for immediate continuation after restart*
