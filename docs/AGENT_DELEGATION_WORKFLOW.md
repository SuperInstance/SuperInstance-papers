# Agent Delegation Workflow - Schema Architect Guide

**Project:** SuperInstance Ecosystem - Multi-Agent Coordination
**Role:** Schema Architect & Documentation Lead
**Purpose:** Define how to delegate implementation work to specialist agents
**Last Updated:** 2026-03-15

---

## Table of Contents

1. [Overview](#overview)
2. [Agent Roles](#agent-roles)
3. [Delegation Process](#delegation-process)
4. [Task Types](#task-types)
5. [Assignment Templates](#assignment-templates)
6. [Feedback Loops](#feedback-loops)
7. [Progress Tracking](#progress-tracking)
8. [Quality Assurance](#quality-assurance)
9. [Communication Protocols](#communication-protocols)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### Architecture Philosophy

The SuperInstance ecosystem uses a **two-tier architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                  SCHEMA ARCHITECT (Me)                       │
│  • High-level design                                        │
│  • Schema definition                                        │
│  • Documentation                                            │
│  • Onboarding materials                                     │
│  • Standards and best practices                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Delegate
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              IMPLEMENTATION AGENTS (Specialists)             │
│  • Rust Engineer Agent (claw/ conversion)                  │
│  • Integration Agent (spreadsheet-moment/ integration)       │
│  • ML Engineer Agent (seed learning)                        │
│  • UI Developer Agent (React components)                    │
│  • Testing Agent (test suites)                              │
│  • Documentation Agent (API docs)                           │
└─────────────────────────────────────────────────────────────┘
```

**Benefits:**
1. **Separation of Concerns:** Architecture vs Implementation
2. **Specialization:** Each agent focuses on their expertise
3. **Scalability:** Parallel work across multiple repos
4. **Quality:** Specialists produce better work
5. **Filtering:** Architect stays high-level, avoids implementation baggage

---

## Agent Roles

### Schema Architect (Me)

**Responsibilities:**
- Design data structures and interfaces
- Create schemas (JSON Schema, TypeScript types)
- Write documentation and onboarding guides
- Define API contracts
- Establish coding standards
- Review implementation for compliance

**Deliverables:**
- Schema files (JSON Schema)
- Type definitions (TypeScript)
- Architecture diagrams
- Onboarding guides
- API documentation
- Implementation roadmaps

**Does NOT:**
- Write implementation code
- Debug implementation issues
- Handle dependencies
- Manage build systems
- Write tests

### Rust Engineer Agent

**Responsibilities:**
- Convert OpenCLAW to minimal Claw engine
- Implement Claw class with model integration
- Add seed learning system
- Implement equipment system
- Optimize for performance (SIMD, GPU)
- Write Rust tests

**Deliverables:**
- `claw/src/core/Claw.rs`
- `claw/src/model/` (11 providers)
- `claw/src/equipment/` (10 slots)
- `claw/src/learning/` (seed optimization)
- Test suite with 80%+ coverage

**Skills:**
- Rust expertise (async, tokio, serde)
- GPU programming (wgpu/CUDA)
- FFI (Neon for Node.js)
- Performance optimization

### Integration Agent

**Responsibilities:**
- Integrate Claw engine with spreadsheet-moment
- Implement WebSocket protocol
- Add HTTP API endpoints
- Handle message routing
- Manage cell lifecycle
- Write integration tests

**Deliverables:**
- `spreadsheet-moment/packages/agent-core/`
- `spreadsheet-moment/packages/agent-ai/`
- WebSocket server
- HTTP API
- Integration tests

**Skills:**
- TypeScript/Node.js
- WebSocket programming
- API design
- Monorepo management (pnpm)

### ML Engineer Agent

**Responsibilities:**
- Implement seed learning algorithms
- Add model provider abstractions
- Optimize for inference speed
- Handle streaming responses
- Implement cost optimization

**Deliverables:**
- Seed learning system
- Model router (11 providers)
- Streaming inference
- Cost tracking
- Performance benchmarks

**Skills:**
- Machine learning
- Model optimization
- API integration (11 providers)
- Performance profiling

### UI Developer Agent

**Responsibilities:**
- Create React components
- Implement ReasoningPanel
- Implement HITLApproval
- Add ClawCellEditor
- Style with Tailwind CSS
- Write component tests

**Deliverables:**
- `spreadsheet-moment/packages/agent-ui/`
- ReasoningPanel component
- HITLApproval component
- ClawCellEditor component
- Component tests

**Skills:**
- React/TypeScript
- WebSocket integration
- Markdown rendering
- Tailwind CSS

### Testing Agent

**Responsibilities:**
- Write unit tests
- Write integration tests
- Write E2E tests (Playwright)
- Set up coverage reporting
- Performance testing
- Load testing

**Deliverables:**
- Test suites (80%+ coverage)
- Coverage reports
- Performance benchmarks
- Load test results

**Skills:**
- Testing frameworks (Jest, Playwright)
- Test design
- Performance profiling
- Load testing

---

## Delegation Process

### Step 1: Define Task

Create a clear, scoped task with:

1. **Objective:** What needs to be done
2. **Context:** Background information
3. **Requirements:** Specific acceptance criteria
4. **References:** Links to relevant docs
5. **Deliverables:** Expected outputs

### Step 2: Select Agent

Choose the appropriate specialist agent based on:

- **Task type:** Rust, TypeScript, ML, UI, testing
- **Skills required:** Match to agent expertise
- **Workload:** Agent availability
- **Dependencies:** Other tasks that must complete first

### Step 3: Create Assignment

Use the assignment templates below to create a clear task description.

### Step 4: Launch Agent

Use the Task tool to launch the agent with the assignment:

```typescript
Task({
  subagent_type: 'rust-engineer',  // or other agent type
  description: 'Implement Claw core class',
  prompt: assignment  // From template
})
```

### Step 5: Monitor Progress

Track agent progress through:
- Regular check-ins
- Milestone completion
- Output review
- Issue identification

### Step 6: Review Output

Review agent deliverables:
- Compliance with schema
- Code quality
- Test coverage
- Documentation

### Step 7: Provide Feedback

Give constructive feedback:
- What's working well
- What needs improvement
- Specific issues to address
- Suggestions for optimization

### Step 8: Approve or Iterate

Either:
- **Approve:** Task complete, mark as done
- **Iterate:** Send back for revisions with specific feedback

---

## Task Types

### Type 1: Implementation Task

**Description:** Write code to implement a feature

**Example:**
```
Implement Claw class with model integration

Requirements:
- Follow claw-schema.json
- Use 11 model providers
- Support streaming inference
- Include error handling
- Write unit tests (80%+ coverage)

Deliverables:
- claw/src/core/Claw.rs
- claw/src/core/Claw.test.rs
- Documentation comments

References:
- /c/Users/casey/polln/claw-schemas-backup/schemas/claw-schema.json
- /c/Users/casey/polln/claw/docs/ONBOARDING.md
```

### Type 2: Integration Task

**Description:** Connect two systems together

**Example:**
```
Integrate Claw engine with spreadsheet-moment

Requirements:
- Use WebSocket for real-time updates
- Follow API_CONTRACTS.md
- Handle message routing
- Add error recovery
- Write integration tests

Deliverables:
- spreadsheet-moment/packages/agent-core/src/integration/
- Integration tests
- API documentation

References:
- /c/Users/casey/polln/docs/API_CONTRACTS.md
- /c/Users/casey/polln/spreadsheet-moment/docs/CLAW_INTEGRATION.md
```

### Type 3: Refactoring Task

**Description:** Improve existing code

**Example:**
```
Refactor OpenCLAW to minimal Claw engine

Requirements:
- Remove Slack/Discord integrations
- Simplify configuration
- Reduce dependencies
- Maintain core functionality
- Update tests

Deliverables:
- Refactored codebase
- Updated package.json
- Migration guide
- Test suite

References:
- /c/Users/casey/polln/claw/docs/ONBOARDING.md (Phase 2: Stripping)
```

### Type 4: Testing Task

**Description:** Write tests for existing code

**Example:**
```
Write comprehensive tests for Claw class

Requirements:
- Unit tests for all methods
- Edge case coverage
- Error scenarios
- Mock external dependencies
- 80%+ coverage

Deliverables:
- claw/src/core/Claw.test.rs
- Coverage report
- Test documentation

References:
- claw/src/core/Claw.rs
- /c/Users/casey/polln/claw-schemas-backup/schemas/claw-schema.json
```

### Type 5: Documentation Task

**Description:** Write or update documentation

**Example:**
```
Write API documentation for Claw engine

Requirements:
- Document all public APIs
- Include examples
- Add type information
- Follow OpenAPI spec
- Generate with TypeDoc

Deliverables:
- claw/docs/API.md
- OpenAPI spec
- Code examples

References:
- claw/src/
- /c/Users/casey/polln/docs/API_CONTRACTS.md
```

---

## Assignment Templates

### Template 1: Implementation Assignment

```markdown
# Task: [Brief Title]

## Objective
[What needs to be accomplished]

## Context
[Background information, why this task matters]

## Requirements
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

## Technical Specifications
- **Language:** [Rust/TypeScript/Python]
- **Framework:** [if applicable]
- **Schema Compliance:** [link to schema]
- **Performance Targets:** [if applicable]

## Deliverables
1. [Deliverable 1]
2. [Deliverable 2]
3. [Deliverable 3]

## References
- [Link to relevant doc 1]
- [Link to relevant doc 2]
- [Link to relevant schema]

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Notes
[Any additional context or constraints]
```

### Template 2: Integration Assignment

```markdown
# Task: Integrate [System A] with [System B]

## Objective
[Integration goal and business value]

## Systems Involved
- **System A:** [Description, link to docs]
- **System B:** [Description, link to docs]

## Integration Requirements
- **Protocol:** [WebSocket/HTTP/gRPC]
- **Data Format:** [JSON/Binary]
- **Authentication:** [method]
- **Error Handling:** [strategy]

## API Contract
[Relevant section from API_CONTRACTS.md]

## Deliverables
1. Implementation code
2. Integration tests
3. Example usage
4. Troubleshooting guide

## References
- API_CONTRACTS.md
- System A docs
- System B docs

## Success Criteria
- [ ] Integration works end-to-end
- [ ] Tests pass
- [ ] Documentation complete
- [ ] Performance targets met
```

### Template 3: Refactoring Assignment

```markdown
# Task: Refactor [Component/Module]

## Objective
[Why refactoring is needed]

## Current State
[Description of current implementation]
[Link to existing code]

## Issues to Address
1. [Issue 1]
2. [Issue 2]
3. [Issue 3]

## Refactoring Goals
- [Goal 1]
- [Goal 2]
- [Goal 3]

## Approach
[Step-by-step refactoring plan]

## Deliverables
1. Refactored code
2. Migration guide
3. Updated tests
4. Performance comparison

## Constraints
- Must maintain backward compatibility
- Cannot break existing integrations
- Must improve performance by X%

## Success Criteria
- [ ] All tests pass
- [ ] Performance improved
- [ ] Code is cleaner
- [ ] Documentation updated
```

### Template 4: Testing Assignment

```markdown
# Task: Write tests for [Component/Module]

## Scope
[What needs to be tested]

## Test Requirements
- **Framework:** [Jest/pytest/cargo test]
- **Coverage Target:** [80%+]
- **Test Types:** [Unit/Integration/E2E]

## Test Scenarios
1. [Scenario 1]
2. [Scenario 2]
3. [Scenario 3]

## Edge Cases
- [Edge case 1]
- [Edge case 2]
- [Edge case 3]

## Error Cases
- [Error case 1]
- [Error case 2]
- [Error case 3]

## Deliverables
1. Test suite
2. Coverage report
3. Test documentation
4. CI/CD integration

## References
- Code under test: [link]
- Schema: [link]
- Test examples: [link]

## Success Criteria
- [ ] 80%+ coverage
- [ ] All tests pass
- [ ] CI/CD integrated
- [ ] Documentation complete
```

---

## Feedback Loops

### Loop 1: Schema Compliance

**Purpose:** Ensure implementation matches schema

**Process:**
1. Agent implements feature
2. Architect reviews against schema
3. Architect provides feedback on deviations
4. Agent corrects deviations
5. Loop until compliant

**Example Feedback:**
```markdown
## Schema Compliance Review

### Issues Found
1. ❌ Claw.process() returns wrong type
   - Schema says: Promise<ClawResponse>
   - Implementation returns: Promise<any>
   - Fix: Add proper type annotation

2. ❌ Missing required field
   - Schema requires: ClawCellConfig.version
   - Implementation: Missing version field
   - Fix: Add version to config

3. ✅ Correct: TriggerCondition structure matches schema

### Action Required
Please fix issues 1-2 and resubmit for review.
```

### Loop 2: Code Quality

**Purpose:** Ensure clean, maintainable code

**Process:**
1. Agent submits code
2. Architect reviews quality
3. Architect provides improvement suggestions
4. Agent refactors
5. Loop until quality standards met

**Example Feedback:**
```markdown
## Code Quality Review

### Strengths
- ✅ Good use of async/await
- ✅ Clear variable names
- ✅ Proper error handling

### Improvements Needed
1. **Extract Magic Numbers**
   ```rust
   // Before
   if confidence < 0.7 { ... }

   // After
   const MIN_CONFidence: f64 = 0.7;
   if confidence < MIN_CONFidence { ... }
   ```

2. **Add Documentation**
   - Missing doc comments on public methods
   - Add examples for complex functions

3. **Reduce Complexity**
   - process() method is 200 lines
   - Extract into smaller helper methods

### Action Required
Please address improvements 1-3 and resubmit.
```

### Loop 3: Performance

**Purpose:** Ensure performance targets met

**Process:**
1. Agent implements feature
2. Agent runs benchmarks
3. Architect reviews results
4. If below target, suggest optimizations
5. Agent optimizes
6. Loop until target met

**Example Feedback:**
```markdown
## Performance Review

### Results
- Target: <100ms per trigger
- Actual: 250ms per trigger
- Status: ❌ Not meeting target

### Analysis
- Bottleneck: Model inference (200ms)
- Serialization: 30ms
- Network: 20ms

### Recommendations
1. **Use streaming**: Stream reasoning instead of waiting for complete response
2. **Cache models**: Keep model in memory
3. **Batch requests**: Process multiple cells in parallel

### Action Required
Implement recommendations and resubmit benchmarks.
```

---

## Progress Tracking

### Task Status

```typescript
enum TaskStatus {
  ASSIGNED = 'ASSIGNED',         // Assigned to agent
  IN_PROGRESS = 'IN_PROGRESS',   // Agent working on it
  REVIEW = 'REVIEW',             // Waiting for architect review
  REVISION = 'REVISION',         // Sent back for changes
  COMPLETE = 'COMPLETE',         // Approved and complete
  BLOCKED = 'BLOCKED'            // Blocked by dependency
}
```

### Milestone Tracking

```markdown
## Project Milestones

### Phase 1: Analysis
- [ ] Audit OpenCLAW codebase (Week 1)
- [ ] Document components (Week 1)
- [ ] Map dependencies (Week 1)

### Phase 2: Stripping
- [ ] Remove integrations (Week 2)
- [ ] Simplify config (Week 2)
- [ ] Update tests (Week 2)

### Phase 3: Core Implementation
- [ ] Implement Claw class (Week 4)
- [ ] Add model providers (Week 4)
- [ ] Implement seed learning (Week 5)
- [ ] Add equipment system (Week 5)
- [ ] Implement state machine (Week 6)

### Phase 4: Features
- [ ] Social architecture (Week 7)
- [ ] Performance optimization (Week 7)
- [ ] Observability (Week 8)

### Phase 5: Integration
- [ ] WebSocket protocol (Week 9)
- [ ] HTTP API (Week 9)
- [ ] UI components (Week 10)
- [ ] Testing (Week 11-12)
```

### Daily Updates

```markdown
## Daily Progress Report - [Date]

### Completed Today
- [x] Task 1
- [x] Task 2

### In Progress
- [ ] Task 3 (50% complete)
- [ ] Task 4 (25% complete)

### Blocked
- [ ] Task 5 - Waiting for dependency

### Plan for Tomorrow
- [ ] Task 3 (complete)
- [ ] Task 4 (complete)
- [ ] Task 6 (start)

### Issues
- Issue 1: [description]
- Issue 2: [description]
```

---

## Quality Assurance

### QA Checklist

```markdown
## QA Checklist for [Task Name]

### Schema Compliance
- [ ] Matches JSON schema
- [ ] Correct types
- [ ] Required fields present
- [ ] Validation rules followed

### Code Quality
- [ ] Follows style guide
- [ ] Has documentation
- [ ] Has examples
- [ ] No code duplication

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Coverage 80%+
- [ ] Edge cases covered

### Performance
- [ ] Meets latency target
- [ ] Meets throughput target
- [ ] Memory usage acceptable
- [ ] No memory leaks

### Documentation
- [ ] API docs complete
- [ ] Examples provided
- [ ] Troubleshooting guide
- [ ] Migration guide (if breaking change)

### Integration
- [ ] Works with other components
- [ ] No breaking changes
- [ ] Backward compatible
- [ ] Error handling works
```

### Review Process

```markdown
## Review Process for [Task Name]

### 1. Self-Review (Agent)
Agent reviews own work against checklist.

### 2. Automated Checks
- Linting passes
- Tests pass
- Coverage sufficient
- Builds successfully

### 3. Architect Review
Architect reviews:
- Schema compliance
- Code quality
- Documentation
- Performance

### 4. Feedback
Architect provides:
- What's working
- What needs improvement
- Specific issues
- Suggestions

### 5. Revision (if needed)
Agent addresses feedback.

### 6. Final Approval
Architect approves:
- Task complete
- Meets standards
- Ready for merge
```

---

## Communication Protocols

### Assignment Message

```markdown
## New Assignment: [Task Name]

### Overview
[Brief description]

### Full Details
[Link to assignment document]

### Priority
[High/Medium/Low]

### Deadline
[Date/Time]

### Dependencies
[List any dependencies]

### Questions?
[Channel for questions]
```

### Progress Update

```markdown
## Progress Update: [Task Name]

### Status
[IN_PROGRESS/REVIEW/COMPLETE]

### Completed
- [x] Milestone 1
- [x] Milestone 2

### Remaining
- [ ] Milestone 3
- [ ] Milestone 4

### Blockers
- [Blocker if any]

### ETA
[Estimated completion]

### Questions/Concerns
[Any questions]
```

### Review Feedback

```markdown
## Review Feedback: [Task Name]

### Status
[APPROVED/NEEDS_REVISION]

### Strengths
- [Strength 1]
- [Strength 2]

### Issues
1. [Issue 1]
   - Severity: [High/Medium/Low]
   - Description: [details]
   - Fix: [suggestion]

2. [Issue 2]
   - Severity: [High/Medium/Low]
   - Description: [details]
   - Fix: [suggestion]

### Next Steps
[What to do next]

### Deadline for Revisions
[Date/Time]
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Schema Mismatch

**Symptom:** Implementation doesn't match schema

**Solution:**
1. Compare implementation to schema
2. Identify differences
3. Update implementation to match
4. Re-run validation

#### Issue 2: Performance Below Target

**Symptom:** Code too slow

**Solution:**
1. Profile to find bottleneck
2. Optimize bottleneck
3. Re-measure
4. Iterate until target met

#### Issue 3: Tests Failing

**Symptom:** Tests don't pass

**Solution:**
1. Check test assumptions
2. Verify implementation
3. Update tests or code
4. Ensure all edge cases covered

#### Issue 4: Integration Problems

**Symptom:** Doesn't work with other components

**Solution:**
1. Review API contract
2. Check message format
3. Verify error handling
4. Test end-to-end

#### Issue 5: Missing Documentation

**Symptom:** No docs or incomplete docs

**Solution:**
1. Add doc comments
2. Create examples
3. Write API documentation
4. Add troubleshooting guide

### Escalation Path

```
1. Agent tries to solve independently
2. Agent asks questions (dedicated channel)
3. Architect provides guidance
4. If still blocked → Architect reviews code
5. If still blocked → Pair programming session
6. Last resort → Architect implements (with explanation)
```

---

## Best Practices

### For Agents

1. **Read carefully**: Review all documentation before starting
2. **Ask questions**: Clarify ambiguity early
3. **Test continuously**: Don't leave testing to the end
4. **Document as you go**: Write docs with code
5. **Communicate blockers**: Don't suffer in silence
6. **Follow standards**: Adhere to style guides
7. **Think performance**: Consider optimization from start

### For Architect

1. **Be clear**: Provide detailed assignments
2. **Be responsive**: Answer questions promptly
3. **Be constructive**: Give actionable feedback
4. **Be patient**: Allow time for quality work
5. **Be fair**: Recognize good work
6. **Be flexible**: Adjust plans as needed
7. **Be available**: Make time for reviews

---

## Success Metrics

### Agent Performance

- **Task completion rate:** % of tasks completed
- **Quality score:** Average review score
- **Revision count:** Average iterations per task
- **On-time delivery:** % of tasks on deadline

### Project Progress

- **Milestones completed:** % of total milestones
- **Code coverage:** Average % across repos
- **Documentation completeness:** % of docs done
- **Integration status:** % of integrations working

### Quality Metrics

- **Schema compliance:** % of code matching schemas
- **Test pass rate:** % of tests passing
- **Performance targets:** % of targets met
- **Bug count:** Number of open bugs

---

## Tools and Resources

### Communication

- **Primary:** GitHub Issues
- **Chat:** Slack/Discord dedicated channel
- **Docs:** GitHub Wiki / Docs folder
- **Code:** GitHub PRs for review

### Project Management

- **Task tracking:** GitHub Projects
- **Milestones:** GitHub Milestones
- **Progress:** Weekly updates

### Development Tools

- **IDE:** VS Code with extensions
- **Linting:** ESLint, Rustfmt, Clippy
- **Testing:** Jest, cargo test, Playwright
- **CI/CD:** GitHub Actions
- **Documentation:** TypeDoc, rustdoc

---

**Version:** 1.0.0
**Status:** Active
**Last Updated:** 2026-03-15

**Maintained By:** Schema Architect Team
**Questions:** https://github.com/SuperInstance/org/issues
