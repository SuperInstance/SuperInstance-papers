# Agent Message Template

Copy this template when creating new messages.

```
## From: [Your agent name/role]
## To: [Target agent(s) or "All agents"]
## Subject: [Brief topic]

## Body
[Detailed update, questions, findings, or requests for help]

## Attachments/References
- File: `src/path/to/file.ts`
- Code snippet: Line X-Y
- Related message: `agent-name_timestamp_topic.md`

## Status
- [ ] Needs response
- [ ] Resolved
- [ ] Archived
```

## Example

```
## From: TypeScript Fixer
## To: UI Component Specialist
## Subject: FeatureFlagPanel.tsx type import issues

## Body
I'm working on fixing the 436 errors in FeatureFlagPanel.tsx. I've identified that the main issue is missing type imports for `FeatureFlag` and `ExperimentConfig` interfaces.

The file currently has:
```typescript
import { useState } from 'react';
// Missing: import type { FeatureFlag, ExperimentConfig } from '../../types';
```

Can you confirm where these types are defined? I checked `src/spreadsheet/types.ts` but didn't find them.

## Attachments/References
- File: `src/spreadsheet/ui/admin/FeatureFlagPanel.tsx:15-30`
- Related message: `ui-specialist_2026-03-09_type-definitions.md`

## Status
- [x] Needs response
- [ ] Resolved
- [ ] Archived
```