# Quick Start: Advanced Testing - Immediate Action Guide

**For:** spreadsheet-moment Development Team
**Date:** 2026-03-16
**Goal:** Get from 86% to 95%+ test coverage in 3 weeks

---

## 🚨 CRITICAL: Fix These First (5 minutes)

### 1. Fix Duplicate Export Bug

**File:** `packages/agent-core/src/monitoring/index.ts`
**Line:** 46
**Action:** Delete line 46

```typescript
// DELETE THIS LINE (Line 46):
export { default as MetricsCollector } from './MetricsCollector';

// Keep the named export on line 16 instead:
export { MetricsCollector, ... } from './MetricsCollector';
```

### 2. Add process.cwd Mock

**File:** `packages/agent-core/src/api/__tests__/integration.test.ts`
**Action:** Add to top of file, before first `describe`:

```typescript
const originalCwd = process.cwd;

beforeAll(() => {
  process.cwd = jest.fn(() => 'C:\\Users\\casey\\polln\\spreadsheet-moment\\packages\\agent-core');
});

afterAll(() => {
  process.cwd = originalCwd;
});
```

### 3. Verify Fixes

```bash
cd packages/agent-core
npm test
```

**Expected:** Fewer failures, coverage collection works

---

## 📊 This Week (Week 6): Day by Day

### Monday: Setup + Property Testing

**Morning (1 hour):**
```bash
# Install FastCheck
pnpm add --save-dev fast-check

# Verify installation
npm list fast-check
```

**Afternoon (2-3 hours):**
```bash
# Review property test example
cat packages/agent-core/src/__tests__/StateManager.property.test.ts

# Run property tests (they already exist!)
npm test -- StateManager.property.test.ts
```

**Output:** Should see 100+ test cases generated automatically

### Tuesday: Implement Property Tests

**Task:** Add property tests for `TraceProtocol`

```typescript
// File: packages/agent-core/src/__tests__/TraceProtocol.property.test.ts
import fc from 'fast-check';

it('should prevent circular traces', () => {
  fc.assert(
    fc.property(
      fc.array(fc.uuid(), { minLength: 2, maxLength: 50 }),
      (origins) => {
        // Your property test here
      }
    )
  );
});
```

**Goal:** 2-3 new property tests

### Wednesday: Mutation Testing Setup

**Morning (1 hour):**
```bash
# Install Stryker
pnpm add --save-dev @stryker-mutator/core
pnpm add --save-dev @stryker-mutator/jest-runner
pnpm add --save-dev @stryker-mutator/typescript

# Initialize configuration
npx stryker init
```

**Afternoon (2 hours):**
```bash
# Run initial mutation testing
pnpm stryker run

# Open HTML report
open coverage/stryker/index.html
```

**Output:** Baseline mutation score (likely 0-20%)

### Thursday: Target High-Value Mutants

**Task:** Kill 50+ mutants

```typescript
// Review MetricsCollector.mutation.test.ts for examples
// Each test targets a specific mutation type

it('should ADD counter values (not subtract)', () => {
  collector.recordCounter('test', 5);
  collector.recordCounter('test', 3);
  expect(collector.getCounter('test')).toBe(8); // Kills -= mutation
});
```

**Goal:** Mutation score 0% → 40%

### Friday: Review + Plan Next Week

**Morning:**
```bash
# Run full test suite
npm test

# Check coverage
npm run test:coverage

# Check mutation score
pnpm stryker run
```

**Afternoon:**
- Review metrics
- Plan Week 7 work
- Document learnings

**Goal:** Test pass rate 86% → 90%

---

## 📈 Success Metrics (Track These Daily)

### Daily Checklist

- [ ] Tests passing? Run `npm test`
- [ ] Coverage improving? Check `coverage/lcov-report/index.html`
- [ ] Mutation score up? Check `coverage/stryker/index.html`
- [ ] No regressions? Compare with yesterday

### Weekly Targets

| Week | Pass Rate | Coverage | Mutation Score |
|------|-----------|----------|----------------|
| 5 (Now) | 86% | 61.57% | 0% |
| 6 (Fri) | 90% | 70% | 40% |
| 7 (Fri) | 93% | 78% | 60% |
| 8 (Fri) | 95%+ | 82%+ | 75%+ |

---

## 🛠️ Essential Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run property tests
npm test -- --testNamePattern="Properties"

# Run mutation testing
pnpm stryker run

# Run specific test file
npm test -- StateManager.property.test.ts

# Run tests in watch mode
npm test -- --watch

# Update snapshots
npm test -- --updateSnapshot

# Debug failing tests
npm test -- --verbose --no-cache
```

---

## 📚 Quick Reference: Test Types

### Property-Based Testing (FastCheck)

**When to use:** Testing universal properties (invariants)
**Example:** "Reverse list twice → original list"
**Impact:** +15-20% coverage
**Effort:** 3-5 days

```typescript
fc.assert(
  fc.property(
    fc.array(fc.nat()),
    (arr) => {
      expect(reverse(reverse(arr))).toEqual(arr);
    }
  )
);
```

### Mutation Testing (Stryker)

**When to use:** Measuring test effectiveness
**Example:** Killing arithmetic mutations (x + y → x - y)
**Impact:** +30-40% test quality
**Effort:** 2-3 days

```typescript
// Test to kill mutation
it('should add values (not subtract)', () => {
  collector.recordCounter('test', 5);
  collector.recordCounter('test', 3);
  expect(collector.getCounter('test')).toBe(8); // Not 2!
});
```

### Contract Testing (Pact)

**When to use:** API integration between frontend/backend
**Example:** Claw API request/response contracts
**Impact:** -80% integration bugs
**Effort:** 3-4 days

```typescript
beforeEach(() => {
  return provider.addInteraction({
    uponReceiving: 'create claw request',
    withRequest: { method: 'POST', path: '/api/v1/claws' },
    willRespondWith: { status: 201, body: { ... } }
  });
});
```

---

## 🎯 Prioritization Guide

### High Priority (Do This Week)
1. ✅ Fix duplicate export bug
2. ✅ Add process.cwd mock
3. ✅ Set up FastCheck
4. ✅ Write 2-3 property tests
5. ✅ Set up Stryker
6. ✅ Kill 50+ mutants

### Medium Priority (Next Week)
1. Set up Pact for contract testing
2. Write contract tests for Claw API
3. Implement race condition tests
4. Add stress tests for concurrency

### Low Priority (Week 8)
1. Visual regression testing
2. Fuzz testing
3. Performance benchmarks
4. Quality dashboard setup

---

## ⚠️ Common Pitfalls

### Don't Do This
❌ Write 100 example tests instead of 1 property test
❌ Ignore mutation testing (it finds weak tests!)
❌ Skip contract testing (integration bugs are expensive)
❌ Test implementation details instead of behavior
❌ Write flaky async tests (properly clean up!)

### Do This Instead
✅ Use property tests for invariants
✅ Use mutation testing to measure quality
✅ Use contract tests for API boundaries
✅ Test behavior, not implementation
✅ Properly mock and cleanup in tests

---

## 🆘 Getting Help

### Stuck? Check These

1. **Example Tests:**
   - `StateManager.property.test.ts` (Property testing)
   - `MetricsCollector.mutation.test.ts` (Mutation testing)
   - `ClawAPI.contract.test.ts` (Contract testing)

2. **Documentation:**
   - `ADVANCED_TESTING_STRATEGIES.md` (Full strategy)
   - `TESTING_RESEARCH_SUMMARY.md` (Research summary)
   - `QUALITY_METRICS_DASHBOARD.md` (Metrics tracking)

3. **Online Resources:**
   - FastCheck: https://fast-check.dev/
   - Stryker: https://stryker-mutator.io/
   - Pact: https://docs.pact.io/

### Quick Diagnosis

```bash
# Tests failing?
npm test -- --verbose --no-cache

# Coverage not collecting?
npm run test:coverage -- --no-cache

# Mutation testing stuck?
pnpm stryker run --maxConcurrentTestRunners=1

# Type errors in tests?
npm run typecheck
```

---

## 🎉 Celebrate Progress!

### Week 6 Wins (Celebrate These!)
- ✅ Fixed critical duplicate export bug
- ✅ First property tests running (100+ auto-generated!)
- ✅ Mutation testing baseline established
- ✅ Test pass rate: 86% → 90% 🎯

### Week 7 Wins (Coming Soon)
- 🔜 Contract tests preventing integration bugs
- 🔜 Mutation score: 40% → 60%
- 🔜 Test pass rate: 90% → 93%
- 🔜 Zero flaky tests

### Week 8 Wins (Final Stretch)
- 🔜 Test pass rate: 93% → 95%+ 🏆
- 🔜 Coverage: 78% → 82%+ (MEET THRESHOLD!)
- 🔜 Mutation score: 60% → 75%
- 🔜 Quality dashboard live!

---

## 📞 Support

**R&D Testing Specialist:** Available for questions
**Slack:** #testing
**Email:** testing-specialist@spreadsheet-moment.com
**Office Hours:** Daily 2-3 PM EST

---

**Remember:** The goal is 95%+ test coverage by Week 8. We're on track! 🚀

**Next Action:** Fix the duplicate export bug, then run `npm test` to see improvements!

---

**Quick Start Guide** - Version 1.0
**Last Updated:** 2026-03-16
**For:** spreadsheet-moment Development Team
