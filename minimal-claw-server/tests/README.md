# Minimal Claw Server - Test Suite

## Overview

This test suite provides comprehensive coverage for the Minimal Claw Server MVP, testing all critical API endpoints, agent lifecycle operations, and edge cases.

## Test Coverage

### Test Files

1. **agent-lifecycle.test.js** - Critical path tests for agent operations
   - Agent creation
   - Agent retrieval
   - Agent updates
   - Agent deletion
   - Agent triggering
   - State management

2. **equipment-and-cells.test.js** - Equipment and cell integration tests
   - Equipment management
   - Cell-to-agent mapping
   - Multi-sheet support
   - Equipment workflow

3. **health-and-errors.test.js** - Health checks and error handling
   - Health endpoint
   - Error handling
   - Edge cases
   - Concurrent operations

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

## Test Results

**Current Status**: All 48 tests passing

```
Test Suites: 3 passed, 3 total
Tests:       48 passed, 48 total
Coverage:    70%+ for critical code
```

## Coverage Areas

### Critical Path (MUST HAVE)
- ✅ Agent creation with validation
- ✅ Agent retrieval by ID
- ✅ Agent listing
- ✅ Agent updates
- ✅ Agent deletion
- ✅ Agent triggering
- ✅ State synchronization

### Integration (IMPORTANT)
- ✅ Equipment equip/unequip
- ✅ Cell-to-agent mapping
- ✅ Multi-sheet scenarios
- ✅ Error handling
- ✅ Edge cases

### Unit Tests (NICE TO HAVE)
- ✅ Individual endpoint testing
- ✅ Data transformation
- ✅ Configuration validation
- ✅ Concurrent operations

## Test Structure

Each test file follows this structure:

```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  describe('Specific Functionality', () => {
    it('should do something specific', async () => {
      // Test implementation
    });
  });
});
```

## Key Testing Patterns

### 1. Agent Creation
```javascript
const response = await request(app)
  .post('/api/v1/agents')
  .send({
    model: 'deepseek-chat',
    seed: 'Test agent',
    equipment: ['MEMORY'],
  })
  .expect(201);

expect(response.body.success).toBe(true);
expect(response.body.data).toHaveProperty('id');
```

### 2. Agent Retrieval
```javascript
const response = await request(app)
  .get('/api/v1/agents/agent-id')
  .expect(200);

expect(response.body.data.id).toBe('agent-id');
```

### 3. Error Handling
```javascript
const response = await request(app)
  .post('/api/v1/agents')
  .send({})
  .expect(400);

expect(response.body.success).toBe(false);
expect(response.body.error).toContain('Missing required fields');
```

## Known Issues

1. **ID Immutability**: The current API allows updating agent IDs via PATCH. This should be restricted in production.

2. **UUID Validation**: The API doesn't validate UUID format - it only checks for existence.

## Best Practices

1. **Clean State**: Each test clears the agent store to ensure isolation
2. **Explicit Assertions**: Use specific assertions rather than generic ones
3. **Error Cases**: Test both success and failure scenarios
4. **Edge Cases**: Test boundary conditions and unusual inputs
5. **Documentation**: Add comments for complex test scenarios

## Adding New Tests

When adding new tests:

1. Place them in the appropriate test file
2. Follow the existing structure and patterns
3. Use descriptive test names
4. Include setup and teardown as needed
5. Test both success and failure cases

## CI/CD Integration

Tests are configured to run automatically on push/PR. The CI pipeline will:

1. Install dependencies
2. Run all tests
3. Generate coverage reports
4. Fail the build if any tests fail

## Troubleshooting

### Tests Fail to Run
- Ensure Node.js version is 18+
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### Intermittent Failures
- Check for timing issues with async operations
- Ensure proper cleanup in beforeEach/afterEach

### Coverage Issues
- Run `npm run test:coverage` to see detailed coverage
- Focus on testing critical paths first

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [API Documentation](../README.md)
