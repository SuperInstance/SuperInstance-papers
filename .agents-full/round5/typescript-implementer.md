# Round 5 Agent: TypeScript Implementer (Build Team)

**Subagent Type:** frontend-developer (TypeScript focus)
**Round:** 5
**Team:** Build Team

---

## Mission

Implement missing SuperInstance types in TypeScript based on white paper specifications and research. Complete the SuperInstance type system by adding API, Storage, Terminal, Tensor, Observer, and other missing instance types.

---

## Critical Protocol: Onboarding Document

**YOU MUST CREATE AN ONBOARDING DOCUMENT for your successor:**
- Location: `agent-messages/onboarding/build_typescript_implementer_round5.md`
- Content:
  1. What you discovered/accomplished
  2. Types implemented and their locations
  3. Blockers encountered
  4. Recommendations for successor
  5. Unfinished tasks
  6. Links to relevant code

---

## Implementation Targets

### Priority 1: Missing Core Instance Types (from inventory)
1. **APIInstance** - External API integration
2. **StorageInstance** - Persistent storage management
3. **TerminalInstance** - Command-line interface
4. **TensorInstance** - Geometric tensor operations
5. **ObserverInstance** - Monitoring and observation

### Priority 2: Enhance Existing Types
6. **DataBlockInstance** - Enhance with confidence cascade integration
7. **ProcessInstance** - Add rate-based change mechanics
8. **LearningAgentInstance** - Integrate SMPbot architecture

### Priority 3: Integration Types
9. **CrossProjectInstance** - POLLN ↔ LOG-Tensor integration
10. **WhitePaperInstance** - White paper content as executable cells

---

## Tasks

### 1. Review Specifications
- Read relevant white papers (SuperInstance Type System, Confidence Cascade, etc.)
- Read research in `docs/research/superinstance/`
- Examine existing implementations in `src/superinstance/`

### 2. Architecture Design
- Design type interfaces for each missing instance
- Ensure consistency with existing SuperInstance patterns
- Define methods, properties, and events for each type

### 3. Implementation
- Create TypeScript files in `src/superinstance/instances/`
- Implement core functionality
- Add comprehensive type definitions
- Follow project coding standards

### 4. Integration
- Ensure new types work with SuperInstanceValidator
- Integrate with CellMigrationAdapter
- Connect to existing spreadsheet system

### 5. Testing
- Write unit tests for each new type
- Run existing test suite to ensure no regressions
- Test integration with confidence cascade and tile algebra

---

## Deliverables

### Primary Deliverables:
1. **New Instance Types**: 5+ new instance types in `src/superinstance/instances/`
   - `APIInstance.ts`
   - `StorageInstance.ts`
   - `TerminalInstance.ts`
   - `TensorInstance.ts`
   - `ObserverInstance.ts`

2. **Enhanced Existing Types**: Updates to existing instances with new capabilities

3. **Type Definitions**: Updated `src/superinstance/types/` with new interfaces

### Supporting Deliverables:
- **Implementation Report**: `agent-messages/round5_build_typescript_implementer.md`
- **Onboarding Document**: `agent-messages/onboarding/build_typescript_implementer_round5.md`
- **API Documentation**: `docs/api/superinstance/` for new types

---

## Success Criteria

- 5+ new SuperInstance types implemented
- All new types integrate with existing system
- Unit tests pass
- No regressions in existing functionality
- Onboarding document created

---

## Tools Available

- TypeScript/JavaScript expertise
- Frontend development skills
- Access to existing codebase
- Testing frameworks

---

**Remember:** You're building the core abstraction layer for the entire project. Your implementations must be robust, well-typed, and properly integrated. Follow existing patterns and maintain high code quality.