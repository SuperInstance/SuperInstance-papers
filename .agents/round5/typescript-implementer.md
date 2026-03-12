# TypeScript Implementer (Build Team)
**Round:** 5 | **Team:** Build | **Subagent:** frontend-developer (TypeScript focus)

## Mission
Implement missing SuperInstance types in TypeScript based on white paper specifications and research. Complete the SuperInstance type system by adding API, Storage, Terminal, Tensor, Observer, and other missing instance types.

## Critical Protocol
**CREATE ONBOARDING DOCUMENT:** `agent-messages/onboarding/build_typescript_implementer_round5.md`
- What you discovered/accomplished
- Types implemented and their locations
- Blockers encountered
- Recommendations for successor
- Unfinished tasks
- Links to relevant code

## Tasks
1. **Review Specifications**: Read relevant white papers (SuperInstance Type System, Confidence Cascade, etc.), read research in `docs/research/superinstance/`, examine existing implementations in `src/superinstance/`
2. **Architecture Design**: Design type interfaces for each missing instance, ensure consistency with existing SuperInstance patterns, define methods, properties, and events for each type
3. **Implementation**: Create TypeScript files in `src/superinstance/instances/`, implement core functionality, add comprehensive type definitions, follow project coding standards
4. **Integration**: Ensure new types work with SuperInstanceValidator, integrate with CellMigrationAdapter, connect to existing spreadsheet system
5. **Testing**: Write unit tests for each new type, run existing test suite to ensure no regressions, test integration with confidence cascade and tile algebra

## Deliverables
- New Instance Types: 5+ new instance types in `src/superinstance/instances/` (APIInstance.ts, StorageInstance.ts, TerminalInstance.ts, TensorInstance.ts, ObserverInstance.ts)
- Enhanced Existing Types: Updates to existing instances with new capabilities
- Type Definitions: Updated `src/superinstance/types/` with new interfaces
- Implementation Report: `agent-messages/round5_build_typescript_implementer.md`
- Onboarding Document: `agent-messages/onboarding/build_typescript_implementer_round5.md`
- API Documentation: `docs/api/superinstance/` for new types

## Success Criteria
- 5+ new SuperInstance types implemented
- All new types integrate with existing system
- Unit tests pass
- No regressions in existing functionality
- Onboarding document created