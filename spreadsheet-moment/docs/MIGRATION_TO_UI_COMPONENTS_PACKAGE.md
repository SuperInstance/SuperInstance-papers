# Migration Guide: Moving to @spreadsheet-moment/ui-components

This guide explains how to migrate from the internal `@spreadsheet-moment/agent-ui` package to the new standalone `@spreadsheet-moment/ui-components` package.

## Overview

The UI components have been extracted from `spreadsheet-moment` into a separate, reusable package. This provides:

- **Better separation of concerns** - UI logic separated from business logic
- **Reusability** - Components can be used in other projects
- **Independent versioning** - UI components can be updated independently
- **Smaller core repository** - Reduces spreadsheet-moment codebase size

## Changes Summary

### Package Name Change

**Before:**
```typescript
import { AgentCellRenderer } from '@spreadsheet-moment/agent-ui';
```

**After:**
```typescript
import { AgentCellRenderer } from '@spreadsheet-moment/ui-components';
```

### Import Paths

The new package supports multiple import paths for tree-shaking:

```typescript
// Import all components
import {
  AgentCellRenderer,
  ClawCellRenderer,
  ReasoningPanel
} from '@spreadsheet-moment/ui-components';

// Import from specific categories (better for tree-shaking)
import { AgentCellRenderer, ReasoningPanel } from '@spreadsheet-moment/ui-components/agents';
import { ClawCellRenderer } from '@spreadsheet-moment/ui-components/claw';

// Import hooks
import { useAgentCell } from '@spreadsheet-moment/ui-components';
```

## Step-by-Step Migration

### 1. Update Dependencies

**In `packages/agent-ui/package.json`:**

Remove the existing package reference and add a dependency on the new package:

```json
{
  "name": "@spreadsheet-moment/agent-ui",
  "version": "0.2.0",
  "description": "Re-export of @spreadsheet-moment/ui-components for backwards compatibility",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@spreadsheet-moment/ui-components": "^0.1.0",
    "@spreadsheet-moment/agent-core": "workspace:*"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  }
}
```

### 2. Update agent-ui Exports

**In `packages/agent-ui/src/index.ts`:**

Change from direct exports to re-exports from the new package:

```typescript
/**
 * @spreadsheet-moment/agent-ui
 *
 * Backwards-compatible re-export of @spreadsheet-moment/ui-components
 *
 * @deprecated Import directly from @spreadsheet-moment/ui-components instead
 */

// Re-export all components from ui-components
export * from '@spreadsheet-moment/ui-components/agents';
export * from '@spreadsheet-moment/ui-components/claw';
export * from '@spreadsheet-moment/ui-components/monitoring';
export * from '@spreadsheet-moment/ui-components/dialogs';
export * from '@spreadsheet-moment/ui-components/common';

// Re-export hooks
export * from '@spreadsheet-moment/ui-components';

// Re-export providers
export * from '@spreadsheet-moment/ui-components';
```

### 3. Update Internal Imports

**In packages that use agent-ui:**

Find and replace all imports:

```bash
# Find all files importing from agent-ui
grep -r "@spreadsheet-moment/agent-ui" packages/

# Replace with new package name
# (Use your IDE's find/replace or run sed script)
```

**Example changes:**

```typescript
// Before
import { AgentCellRenderer, ClawCellRenderer } from '@spreadsheet-moment/agent-ui';
import { useAgentCell } from '@spreadsheet-moment/agent-ui/hooks';

// After
import { AgentCellRenderer, ClawCellRenderer, useAgentCell } from '@spreadsheet-moment/ui-components';
// OR
import { AgentCellRenderer } from '@spreadsheet-moment/ui-components/agents';
import { ClawCellRenderer } from '@spreadsheet-moment/ui-components/claw';
import { useAgentCell } from '@spreadsheet-moment/ui-components';
```

### 4. Update TypeScript Config

**In `packages/agent-ui/tsconfig.json`:**

Since this is now a re-export package, update the config:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 5. Update Root Package.json

**In root `package.json`:**

Add the new package as a workspace dependency:

```json
{
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "install:ui-components": "pnpm add @spreadsheet-moment/ui-components@workspace:* --filter './packages/**'"
  }
}
```

### 6. Update Build Scripts

**In `packages/agent-ui/package.json`:**

Since this is now a re-export package, minimal build is needed:

```json
{
  "scripts": {
    "build": "tsc",
    "test": "echo 'Tests moved to @spreadsheet-moment/ui-components'",
    "lint": "echo 'Linting moved to @spreadsheet-moment/ui-components'"
  }
}
```

## Testing the Migration

### 1. Install Dependencies

```bash
cd /path/to/spreadsheet-moment
pnpm install
```

### 2. Build All Packages

```bash
pnpm build
```

### 3. Run Tests

```bash
pnpm test
```

### 4. Check Type Safety

```bash
pnpm typecheck
```

### 5. Manual Testing

Start the development server and verify UI components work:

```bash
pnpm dev
```

Check that:
- Agent cells render correctly
- Claw cells display properly
- Reasoning panels show real-time updates
- HITL buttons function correctly
- No console errors
- All components are interactive

## Breaking Changes

### 1. Type Exports

Some types may have been renamed or moved:

```typescript
// Before
import type { IAgentCellData } from '@spreadsheet-moment/agent-ui';

// After
import type { IAgentCellData } from '@spreadsheet-moment/ui-components';
```

### 2. Component Props

Some component props may have changed. Check the component catalog for updated props:

```bash
# View component catalog
cat ../spreadsheet-ui-components/COMPONENT_CATALOG.md
```

### 3. CSS Classes

CSS class names may have changed. Update any custom CSS:

```css
/* Before */
.agent-cell-renderer { ... }

/* After */
.sm-agent-cell-renderer { ... }
```

## Rollback Plan

If issues arise, you can rollback:

1. Revert `packages/agent-ui` to previous version
2. Remove `@spreadsheet-moment/ui-components` dependency
3. Restore original imports

```bash
git checkout HEAD~1 -- packages/agent-ui
pnpm install
pnpm build
```

## Benefits of Migration

After migration, you'll have:

1. **Cleaner codebase** - UI logic separated from business logic
2. **Better reusability** - Components can be used in other projects
3. **Independent versioning** - Update UI components without touching core
4. **Smaller bundles** - Better tree-shaking with specific imports
5. **Easier testing** - UI components tested in isolation

## Next Steps

After migration:

1. Remove old component files from `packages/agent-ui/src/components`
2. Update documentation to reference new package
3. Update CI/CD pipelines
4. Announce migration to team
5. Monitor for issues

## Getting Help

If you encounter issues:

- Check the [Component Catalog](../spreadsheet-ui-components/COMPONENT_CATALOG.md)
- Review [Migration Examples](./MIGRATION_EXAMPLES.md)
- Open an issue on GitHub
- Contact the team on Discord

## Checklist

- [ ] Update `packages/agent-ui/package.json`
- [ ] Update `packages/agent-ui/src/index.ts`
- [ ] Update all imports across packages
- [ ] Update TypeScript configs
- [ ] Install new dependencies
- [ ] Build all packages
- [ ] Run tests
- [ ] Manual testing
- [ ] Update documentation
- [ ] Announce to team
