# Team 1: spreadsheet-moment/ Engineer Onboarding

**Role:** API Integration Specialist
**Repository:** https://github.com/SuperInstance/spreadsheet-moment
**Local Path:** `/c/Users/ccasey/polln/spreadsheet-moment`
**Current Branch:** `phase-3-integration`
**Status:** Phase 3 Complete - Ready for Week 3

---

## Your Mission

Transform spreadsheet cells into intelligent agents using the Univer spreadsheet engine. You are building the integration layer that connects spreadsheet cells to the Claw engine and eventually to Constraint Theory geometric logic.

---

## Phase 3 Summary (What You Just Completed)

### ✅ Critical Security Fixes
1. **WebSocket Authentication** - Added Bearer token authentication
2. **Message Validation** - Zod schema validation for all WebSocket messages
3. **Singleton Disposal** - ClawClientManager with proper cleanup
4. **Exponential Backoff** - Improved reconnection with jitter
5. **Formula Tests** - 400+ lines of comprehensive tests
6. **API Key Validation** - Minimum 20 characters requirement
7. **Sanitized Logs** - Protected sensitive data

### 📁 Files Created/Modified
- `packages/agent-formulas/src/utils/ClawClientManager.ts` (120 lines)
- `packages/agent-formulas/src/__tests__/formulas.test.ts` (400+ lines)
- `packages/agent-core/src/api/ClawClient.ts` (enhanced with security)
- All formula functions updated with ClawClientManager

---

## Next Phase: Week 3-4 Integration Testing

### Week 3 Objectives

**1. End-to-End Integration Tests**
- Test ClawClient with mock Claw API
- Test WebSocket connection lifecycle
- Test formula functions end-to-end
- Test error recovery scenarios
- **Location:** `packages/agent-core/src/api/__tests__/integration.test.ts`

**2. Performance Testing**
- Test WebSocket reconnection under load
- Test concurrent claw creation
- Measure latency metrics
- Validate retry logic performance
- **Target:** <100ms cell update latency

**3. UI Enhancement**
- Add real-time claw status display
- Add reasoning step streaming display
- Add claw control buttons (cancel, retry)
- Add claw state visualization
- **Location:** `packages/agent-ui/src/components/ClawStatus.tsx`

### Week 4 Objectives

**1. Monitoring & Observability**
- Add metrics collection (claw creation, success rate, latency)
- Add performance monitoring
- Add error tracking
- Add health check endpoints
- **Tools:** Prometheus, Grafana, or custom

**2. Documentation**
- Write integration guide
- Write API usage examples
- Write troubleshooting guide
- Update README with Phase 3 features
- **Location:** `docs/PHASE_3_INTEGRATION_GUIDE.md`

**3. Deployment Prep**
- Create deployment configuration
- Add environment variable documentation
- Create production setup guide
- Add runbook for common issues
- **Location:** `deployment/production/README.md`

---

## Quick Start for Week 3

### 1. Check Current Status
```bash
cd /c/Users/casey/polln/spreadsheet-moment
git status
git log --oneline -5
npm test
```

### 2. Create Integration Test Branch
```bash
git checkout -b week-3-integration-testing
```

### 3. Start with Integration Tests
**File:** `packages/agent-core/src/api/__tests__/integration.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ClawClient } from '../ClawClient';
import { EventEmitter } from 'events';

describe('ClawClient Integration Tests', () => {
  let client: ClawClient;
  let mockServer: EventEmitter;

  beforeEach(() => {
    client = new ClawClient({
      apiKey: 'test-api-key-min-length-20',
      baseUrl: 'http://localhost:3000',
      timeout: 5000
    });
  });

  afterEach(async () => {
    await client.dispose();
  });

  it('should connect to WebSocket', async () => {
    const connected = await client.connect();
    expect(connected).toBe(true);
  });

  it('should handle message validation', async () => {
    // Test Zod schema validation
  });

  it('should retry on failure', async () => {
    // Test retry logic
  });
});
```

### 4. Run Tests
```bash
npm test
```

---

## Integration with Constraint Theory (Future)

Once constrainttheory/ is implemented, you will integrate geometric logic:

**1. Formula Functions**
```excel
=GEOMETRIC_SNAP(vector)  # Snap to nearest Pythagorean triple
=RIGIDITY_CHECK(cellA, cellB)  # Check Laman's theorem
=HOLONOMY_TRANSPORT(path)  # Parallel transport along manifold
```

**2. UI Components**
- Display geometric reasoning visualization
- Show rigidity matroid
- Visualize holonomy transport
- Real-time "snapping" display

**3. Performance Optimization**
- Use geometric algorithms for faster computation
- Leverage deterministic logic for consistency
- Implement parallel transport for efficiency

---

## Success Criteria

### Week 3
- [ ] Integration tests created and passing
- [ ] Performance tests complete
- [ ] UI enhancements implemented
- [ ] Real-time streaming working
- [ ] Documentation started

### Week 4
- [ ] Monitoring in place
- [ ] Documentation complete
- [ ] Deployment configuration ready
- [ ] Production runbook written
- [ ] Ready for staging deployment

---

## Communication

### Daily Updates
Provide updates in:
- GitHub PRs for code reviews
- Slack/Discord for quick questions
- Email for blockers requiring my attention

### Escalation
If you encounter blockers:
1. Document the issue clearly
2. Provide context and impact assessment
3. Suggest potential solutions
4. Tag me for immediate attention

---

## Resources

### Documentation
- `docs/CLAW_INTEGRATION.md` - Integration architecture
- `docs/API_CONTRACTS.md` - API contracts between repos
- `docs/AGENT_DELEGATION_WORKFLOW.md` - Agent workflow patterns

### Research Papers
- https://github.com/SuperInstance/SuperInstance-papers - All papers
- P01-P10: Core algorithms
- P11-P20: SE(3)-equivariant consensus
- P51-P60: Hardware integration

### Key Commands
```bash
npm install              # Install dependencies
npm run dev              # Start dev server
npm test                 # Run tests
npm run build            # Build for production
npm run lint             # Lint code
```

---

## Notes

- Focus on integration testing and production readiness
- Keep code clean and well-documented
- Test everything thoroughly before deploying
- Communicate early about blockers or issues
- Have fun building the future of spreadsheets! 🚀

---

**Last Updated:** 2026-03-15
**Orchestrator:** Schema Architect (Primary Instance)
**Status:** Ready for Week 3 - Integration Testing and UI Enhancements
