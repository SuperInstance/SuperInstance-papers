# Planning Team Onboarding

**Model**: glm-5 (Senior Architects)
**Target**: glm-4.7 (Implementation Builders)
**Mission**: Design schemas and blueprints for next-generation POLLN features

---

## Planning Agents

### 1. Architect-Main (System Schemas)
**Focus**: Core system architecture, component interfaces
**Output**: `docs/planning/SYSTEM_SCHEMA.md`, `docs/planning/SYSTEM_BLUEPRINT.md`

**Responsibilities**:
- Design component interfaces and type definitions
- Define system boundaries and contracts
- Create dependency graphs and module relationships
- Specify initialization and lifecycle patterns

**Key Patterns**:
- Interface segregation (small, focused interfaces)
- Dependency inversion (depend on abstractions)
- Single responsibility (one purpose per module)

---

### 2. Architect-Data (Data Schemas)
**Focus**: Data models, storage schemas, data flow
**Output**: `docs/planning/DATA_SCHEMA.md`, `docs/planning/DATA_BLUEPRINT.md`

**Responsibilities**:
- Design data models and relationships
- Define storage schemas (in-memory, persistent)
- Create data flow diagrams
- Specify serialization formats

**Key Patterns**:
- Immutable data structures where possible
- Event sourcing for auditability
- CQRS for read/write separation

---

### 3. Architect-API (API Schemas)
**Focus**: API contracts, protocol specifications
**Output**: `docs/planning/API_SCHEMA.md`, `docs/planning/API_BLUEPRINT.md`

**Responsibilities**:
- Design API contracts (REST, WebSocket, RPC)
- Define message schemas and protocols
- Create OpenAPI specifications
- Specify versioning and compatibility

**Key Patterns**:
- Backward-compatible changes only
- Explicit error handling
- Rate limiting and quotas

---

### 4. Architect-Security (Security Schemas)
**Focus**: Security models, threat mitigation, auth flows
**Output**: `docs/planning/SECURITY_SCHEMA.md`, `docs/planning/SECURITY_BLUEPRINT.md`

**Responsibilities**:
- Design authentication and authorization schemas
- Define threat models and mitigation strategies
- Create security audit specifications
- Specify encryption and key management

**Key Patterns**:
- Zero-trust architecture
- Defense in depth
- Principle of least privilege

---

### 5. Architect-Perf (Performance Schemas)
**Focus**: Optimization patterns, benchmarks, metrics
**Output**: `docs/planning/PERF_SCHEMA.md`, `docs/planning/PERF_BLUEPRINT.md`

**Responsibilities**:
- Design performance optimization schemas
- Define benchmark specifications
- Create metric collection patterns
- Specify caching and eviction strategies

**Key Patterns**:
- Lazy evaluation
- Memoization
- Batching and parallelization

---

## Output Format

Each agent produces:

### SCHEMA.md
```markdown
# [Component] Schema

## Type Definitions
[TypeScript interfaces, types]

## Constants & Enums
[Configuration values, enums]

## Relationships
[How this component relates to others]

## Invariants
[Business rules that must always hold]
```

### BLUEPRINT.md
```markdown
# [Component] Implementation Blueprint

## Overview
[High-level description]

## Implementation Steps
1. [Step 1 with code example]
2. [Step 2 with code example]

## Edge Cases
[Unusual scenarios to handle]

## Test Cases
[Key test scenarios]

## Performance Considerations
[Optimization notes]
```

---

## Planning Process

```
1. EXPLORE: Read existing codebase, understand patterns
2. ANALYZE: Identify gaps, improvement opportunities
3. DESIGN: Create schemas and blueprints
4. VALIDATE: Cross-check with existing patterns
5. DOCUMENT: Write clear specs for glm-4.7 builders
```

---

## Success Criteria

- Schemas are complete and consistent
- Blueprints have working code examples
- Test cases cover edge cases
- Performance considerations documented
- Security implications addressed

---

*Planning Team | Model: glm-5 | Target: glm-4.7*
