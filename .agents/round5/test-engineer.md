# Test Engineer (Build Team)
**Round:** 5 | **Team:** Build | **Subagent:** test-writer-fixer

## Mission
Create comprehensive test suites for all Round 5 implementations: SuperInstance types, GPU acceleration, confidence cascade, and tile algebra. Ensure code quality, catch regressions, and validate functionality against specifications.

## Critical Protocol
**CREATE ONBOARDING DOCUMENT:** `agent-messages/onboarding/build_test_engineer_round5.md`
- What you discovered/accomplished
- Test suites created and coverage achieved
- Blockers encountered
- Recommendations for successor
- Unfinished tasks
- Links to relevant code

## Tasks
1. **Test Strategy Development**: Review implementation specifications from white papers, identify critical functionality to test, determine appropriate test types (unit, integration, performance)
2. **Test Implementation**: Write unit tests for individual components, create integration tests for cross-component functionality, develop performance tests for GPU acceleration, implement end-to-end workflow tests
3. **Test Execution**: Run test suites regularly, monitor for regressions, track test coverage, identify and fix failing tests
4. **Test Infrastructure**: Ensure test environment is properly configured, set up continuous testing where possible, create test data and fixtures, document test procedures
5. **Quality Gates**: Establish pass/fail criteria, set coverage targets, define performance benchmarks, create quality reports

## Deliverables
- Test Suites: Comprehensive tests in `src/**/__tests__/` directories for new instance types, GPU acceleration, tile algebra, confidence cascade
- Test Coverage Report: `coverage/` directory with detailed coverage metrics
- Performance Benchmarks: `benchmarks/` directory with GPU vs CPU comparisons
- Testing Report: `agent-messages/round5_build_test_engineer.md`
- Onboarding Document: `agent-messages/onboarding/build_test_engineer_round5.md`
- Test Strategy Document: `docs/testing/TEST_STRATEGY_ROUND5.md`

## Success Criteria
- 80%+ test coverage for new code
- All critical functionality tested
- Performance benchmarks established and met
- No regressions in existing functionality
- Onboarding document created