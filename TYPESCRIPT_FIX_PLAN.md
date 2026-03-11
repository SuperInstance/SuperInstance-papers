# TypeScript Fix Plan - Detailed Error Resolution

**Generated:** 2026-03-10
**Total Errors:** 82 (down from 200+)
**Strategy:** Fix by error type, not by file
**Team Coordination:** TypeScript Fixer agent - coordinate via `/agent-messages/`

---

## Error Categories & Fix Patterns

### Category 1: Module Resolution Errors (~40%)
**Pattern:** `Cannot find module 'X' or its corresponding type declarations`

**Files Affected:**
- src/backup/schedulers.ts - `node-cron`
- src/api/revocation.ts - `redis`
- Various UI files - missing `.js` extensions

**Fix Pattern:**
```typescript
// Option A: Install missing types
npm install --save-dev @types/node-cron @types/redis

// Option B: Add type declaration
declare module 'node-cron' {
  interface ScheduledTask {
    start(): void;
    stop(): void;
    destroy(): void;
  }
  export function schedule(expression: string, func: () => void): ScheduledTask;
  export function validate(expression: string): boolean;
}

// Option C: Use any for quick fix
const cron = await import('node-cron') as any;
```

### Category 2: Implicit Any Errors (~25%)
**Pattern:** `Parameter 'X' implicitly has an 'any' type`

**Files Affected:**
- src/benchmarking/examples/benchmarkValidation.ts
- src/cli/commands/backup/*.ts
- Various UI components

**Fix Pattern:**
```typescript
// Before
.map((r, i) => ...)

// After
.map((r: ResultType, i: number) => ...)
```

### Category 3: Type Mismatches (~20%)
**Pattern:** `Type 'X' is not assignable to type 'Y'`

**Files Affected:**
- src/backup/strategies/*.ts - Buffer<ArrayBufferLike> vs Buffer<ArrayBuffer>
- src/backup/backup-manager.ts - BackupType enum issues

**Fix Pattern:**
```typescript
// Buffer type fix
import { Buffer } from 'buffer';
const buffer = Buffer.from(JSON.stringify(data));

// Enum fix - use enum value, not string literal
// Before
const type = "FULL";

// After
import { BackupType } from './types.js';
const type = BackupType.FULL;
```

### Category 4: Override Modifiers (~10%)
**Pattern:** `This member must have an 'override' modifier`

**Files Affected:**
- src/api/memory-protection.ts (already fixed)
- src/api/revocation.ts

**Fix Pattern:**
```typescript
// Before
async revokeRefreshToken(token: string): Promise<boolean>

// After
override async revokeRefreshToken(token: string): Promise<boolean>
```

### Category 5: Index Signature Errors (~5%)
**Pattern:** `Index signature for type 'string' is missing in type 'X'`

**Files Affected:**
- src/backup/strategies/full-backup.ts
- src/backup/strategies/snapshot-backup.ts

**Fix Pattern:**
```typescript
// Before
const config: Record<string, unknown> = colonyConfig;

// After
const config: Record<string, unknown> = { ...colonyConfig } as Record<string, unknown>;
```

---

## Fix Execution Order

### Batch 1: Install Missing Types (5 min)
```bash
npm install --save-dev @types/node-cron @types/redis
```

### Batch 2: Fix High-Error UI Files (30 min)
Priority order:
1. FeatureFlagPanel.tsx (436 errors) - Likely a cascade failure from one root issue
2. CellInspectorWithTheater.tsx (301 errors)
3. TouchCellInspector.tsx (253 errors)

**Strategy:** These files likely share a common import issue. Fix one, fix all.

### Batch 3: Fix Backup Module (15 min)
1. Fix BackupType enum imports
2. Fix Buffer type assertions
3. Add node-cron type declaration

### Batch 4: Fix API Module (10 min)
1. Add override modifiers
2. Fix AuditEvent types
3. Add redis type declaration

### Batch 5: Fix CLI Module (10 min)
1. Add type annotations
2. Fix config type access

### Batch 6: Fix Benchmarking (5 min)
1. Add .js extension to imports
2. Add parameter types

---

## Verification After Each Batch

```bash
# Count errors
npx tsc --noEmit 2>&1 | grep -c "error TS"

# Should decrease by ~15-20 errors per batch
```

---

## Common Pitfalls

1. **Don't fix imports with `.js` in UI files** - Use `.tsx` extension
2. **Don't change Buffer types globally** - Only fix where needed
3. **Enum imports must be value imports** - Use `import { X }` not `import type { X }`
4. **React component props** - Check parent component for correct types

---

## Expected Timeline

| Batch | Files | Est. Errors Fixed | Time |
|-------|-------|-------------------|------|
| 1 | Types install | 5-10 | 5 min |
| 2 | UI Components | 40-50 | 30 min |
| 3 | Backup Module | 15-20 | 15 min |
| 4 | API Module | 8-12 | 10 min |
| 5 | CLI Module | 5-8 | 10 min |
| 6 | Benchmarking | 3-5 | 5 min |
| **Total** | **~30 files** | **~82 errors** | **~75 min** |

---

*Generated: 2026-03-10*
