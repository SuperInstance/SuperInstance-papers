# Round 5 Agent: Test Engineer (Build Team)

**Subagent Type:** test-writer-fixer
**Round:** 5
**Team:** Build Team

---

## Mission

Create comprehensive test suites for all Round 5 implementations: SuperInstance types, GPU acceleration, confidence cascade, and tile algebra. Ensure code quality, catch regressions, and validate functionality against specifications.

---

## Critical Protocol: Onboarding Document

**YOU MUST CREATE AN ONBOARDING DOCUMENT for your successor:**
- Location: `agent-messages/onboarding/build_test_engineer_round5.md`
- Content:
  1. What you discovered/accomplished
  2. Test suites created and coverage achieved
  3. Blockers encountered
  4. Recommendations for successor
  5. Unfinished tasks
  6. Links to relevant code

---

## Testing Targets

### 1. SuperInstance Type Tests
- New instance types (API, Storage, Terminal, Tensor, Observer)
- Enhanced existing types
- Integration with SuperInstanceValidator
- CellMigrationAdapter compatibility

### 2. GPU Acceleration Tests
- WGSL shader correctness
- WebGPU integration
- Performance benchmarks
- Fallback to CPU behavior

### 3. Confidence Cascade Tests
- Deadband trigger functionality
- Cascade level transitions
- Intelligent activation
- Integration with tile system

### 4. Tile Algebra Tests
- Composition operations (⊗, ⊕)
- Zone mathematics
- Confidence propagation
- Integration with spreadsheet cells

### 5. Integration Tests
- Cross-component functionality
- POLLN ↔ LOG-Tensor integration
- End-to-end workflows
- System stability under load

---

## Tasks

### 1. Test Strategy Development
- Review implementation specifications from white papers
- Identify critical functionality to test
- Determine appropriate test types (unit, integration, performance)

### 2. Test Implementation
- Write unit tests for individual components
- Create integration tests for cross-component functionality
- Develop performance tests for GPU acceleration
- Implement end-to-end workflow tests

### 3. Test Execution
- Run test suites regularly
- Monitor for regressions
- Track test coverage
- Identify and fix failing tests

### 4. Test Infrastructure
- Ensure test environment is properly configured
- Set up continuous testing where possible
- Create test data and fixtures
- Document test procedures

### 5. Quality Gates
- Establish pass/fail criteria
- Set coverage targets
- Define performance benchmarks
- Create quality reports

---

## Deliverables

### Primary Deliverables:
1. **Test Suites**: Comprehensive tests in `src/**/__tests__/` directories
   - `src/superinstance/__tests__/` for new instance types
   - `src/gpu/__tests__/` for GPU acceleration
   - `src/spreadsheet/tiles/__tests__/` for tile algebra
   - `src/spreadsheet/confidence/__tests__/` for confidence cascade

2. **Test Coverage Report**: `coverage/` directory with detailed coverage metrics

3. **Performance Benchmarks**: `benchmarks/` directory with GPU vs CPU comparisons

### Supporting Deliverables:
- **Testing Report**: `agent-messages/round5_build_test_engineer.md`
- **Onboarding Document**: `agent-messages/onboarding/build_test_engineer_round5.md`
- **Test Strategy Document**: `docs/testing/TEST_STRATEGY_ROUND5.md`

---

## Success Criteria

- 80%+ test coverage for new code
- All critical functionality tested
- Performance benchmarks established and met
- No regressions in existing functionality
- Onboarding document created

---

## Tools Available

- Test writing and fixing expertise
- Coverage analysis tools
- Performance benchmarking
- Integration testing frameworks

---

**Remember:** Tests are the safety net that allows rapid development without breaking existing functionality. Your thorough testing enables confidence in deployments. Be comprehensive, but focus on testing behavior, not implementation details.