# Contributing to SuperInstance

**How to contribute to the SuperInstance MVP**

---

## Welcome!

Thank you for your interest in contributing to SuperInstance! This document will guide you through the contribution process.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Testing Guidelines](#testing-guidelines)
6. [Documentation Standards](#documentation-standards)
7. [Pull Request Process](#pull-request-process)
8. [Getting Help](#getting-help)

---

## Code of Conduct

### Our Pledge

We are committed to making participation in our project a harassment-free experience for everyone, regardless of level of experience, gender, gender identity and expression, sexual orientation, disability, personal appearance, body size, race, ethnicity, age, religion, or nationality.

### Our Standards

**Positive behavior includes**:
- Being respectful and inclusive
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes**:
- Harassment, trolling, or derogatory comments
- Personal or political attacks
- Public or private harassment
- Publishing others' private information
- Any other conduct which could reasonably be considered inappropriate

### Reporting Issues

If you experience or witness unacceptable behavior, please contact the project maintainers privately.

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Git** for version control
- A text editor or IDE (VS Code recommended)
- Familiarity with JavaScript/TypeScript
- Basic understanding of REST APIs

### Initial Setup

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub
   # Clone your fork
   git clone https://github.com/YOUR_USERNAME/minimal-claw-server.git
   cd minimal-claw-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Verify it works**
   ```bash
   curl http://localhost:8080/health
   ```

### Development Setup

1. **Install development dependencies**
   ```bash
   npm install --save-dev
   ```

2. **Set up your environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Run tests**
   ```bash
   npm test
   ```

---

## Development Workflow

### 1. Choose What to Work On

**Good first issues**:
- Look for issues labeled `good first issue`
- Small bugs or documentation fixes
- Simple feature additions

**Feature requests**:
- Look for issues labeled `enhancement`
- Discuss your approach in the issue first

**Documentation**:
- Always welcome!
- See [Documentation Standards](#documentation-standards)

### 2. Create a Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name

# Or a bugfix branch
git checkout -b fix/your-bugfix-name

# Or a documentation branch
git checkout -b docs/your-doc-update
```

**Branch naming conventions**:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or changes
- `chore/` - Maintenance tasks

### 3. Make Your Changes

**Code changes**:
- Follow the [Coding Standards](#coding-standards)
- Write tests for new functionality
- Update documentation as needed

**Commit often**:
```bash
git add .
git commit -m "feat: add agent pagination support"
```

**Commit message format**:
```
type(scope): subject

body

footer
```

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Test changes
- `chore` - Maintenance tasks

**Examples**:
```
feat(agents): add pagination to list agents endpoint

Add limit and offset query parameters to GET /api/v1/agents
to support pagination of large agent lists.

Closes #123
```

```
fix(websocket): handle invalid JSON messages

Prevent server crash when clients send malformed JSON.
```

### 4. Test Your Changes

```bash
# Run all tests
npm test

# Run linting
npm run lint

# Run formatting
npm run format

# Build the project
npm run build
```

### 5. Push Your Changes

```bash
git push origin feature/your-feature-name
```

### 6. Create a Pull Request

1. Go to the GitHub repository
2. Click "Pull Requests" → "New Pull Request"
3. Select your branch
4. Fill in the PR template
5. Click "Create Pull Request"

---

## Coding Standards

### JavaScript/TypeScript

**Style Guide**:
- Use **ESLint** for linting
- Use **Prettier** for formatting
- Follow **Airbnb JavaScript Style Guide** (with modifications)

**Code organization**:
```javascript
// 1. Imports
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

// 2. Constants
const PORT = process.env.PORT || 8080;
const AgentState = {
  IDLE: 'IDLE',
  THINKING: 'THINKING',
  // ...
};

// 3. Functions
function createAgent(config) {
  // ...
}

// 4. Exports
export { createAgent };
```

**Naming conventions**:
- **Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Classes**: `PascalCase`
- **Functions**: `camelCase`
- **Files**: `kebab-case.js` or `kebab-case.ts`

**Best practices**:
```javascript
// ✅ Good
const agentCount = agents.size;

// ❌ Bad
const agentcount = agents.size;

// ✅ Good
async function createAgent(config) {
  const agent = {
    id: uuidv4(),
    ...config,
  };

  agents.set(agent.id, agent);

  return agent;
}

// ❌ Bad
async function createAgent(c) {
  const a = { id: uuidv4(), ...c };
  agents.set(a.id, a);
  return a;
}
```

### Error Handling

**Always handle errors**:
```javascript
// ✅ Good
async function getAgent(agentId) {
  try {
    const agent = agents.get(agentId);

    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    return agent;
  } catch (error) {
    console.error('Error getting agent:', error);
    throw error;
  }
}

// ❌ Bad
async function getAgent(agentId) {
  return agents.get(agentId);
}
```

**Use appropriate HTTP status codes**:
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid request
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

### Comments

**When to comment**:
- Explain **why**, not **what**
- Document complex algorithms
- Add JSDoc for public APIs

**JSDoc format**:
```javascript
/**
 * Create a new agent
 * @param {Object} config - Agent configuration
 * @param {string} config.model - AI model to use
 * @param {string} config.seed - Natural language description
 * @param {string[]} config.equipment - Equipment to equip
 * @param {Object} config.trigger - Trigger configuration
 * @returns {Promise<ClawAgent>} The created agent
 */
async function createAgent(config) {
  // ...
}
```

---

## Testing Guidelines

### Test Structure

**Arrange, Act, Assert**:
```javascript
describe('createAgent', () => {
  it('should create an agent with valid config', async () => {
    // Arrange
    const config = {
      model: 'deepseek-chat',
      seed: 'Test agent',
      equipment: ['MEMORY'],
      trigger: { type: 'manual' },
    };

    // Act
    const agent = await createAgent(config);

    // Assert
    expect(agent).toHaveProperty('id');
    expect(agent.model).toBe(config.model);
    expect(agent.state).toBe('IDLE');
  });
});
```

### Test Coverage

**Aim for**:
- ✅ 80%+ code coverage
- ✅ All public APIs tested
- ✅ Edge cases covered
- ✅ Error paths tested

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- createAgent.test.js

# Run tests in watch mode
npm run test:watch
```

### Writing Good Tests

**Test one thing**:
```javascript
// ✅ Good
it('should set agent state to THINKING when triggered', async () => {
  const agent = await createAgent(testConfig);
  const result = await triggerAgent(agent.id);
  expect(result.state).toBe('THINKING');
});

// ❌ Bad
it('should work', async () => {
  // Too vague!
});
```

**Use descriptive names**:
```javascript
// ✅ Good
it('should throw error when agent ID is invalid', async () => {
  await expect(getAgent('invalid')).rejects.toThrow();
});

// ❌ Bad
it('should fail', async () => {
  // Not descriptive!
});
```

---

## Documentation Standards

### Code Documentation

**Every public function needs JSDoc**:
```javascript
/**
 * Get an agent by ID
 * @param {string} agentId - The agent UUID
 * @returns {Promise<ClawAgent>} The agent
 * @throws {Error} If agent not found
 */
async function getAgent(agentId) {
  // ...
}
```

### README Documentation

**Keep READMEs up to date**:
- Installation instructions
- Usage examples
- API changes
- New features

### API Documentation

**Document all endpoints**:
- Method and path
- Request parameters
- Request body
- Response format
- Error codes
- Examples

See [API_REFERENCE.md](./API_REFERENCE.md) for examples.

### Changelog

**Update CHANGELOG.md** for:
- New features
- Bug fixes
- Breaking changes
- Deprecations

**Format**:
```markdown
## [1.1.0] - 2026-03-18

### Added
- Agent pagination support
- WebSocket reconnection

### Fixed
- Memory leak in WebSocket handler
- Agent state not persisting

### Changed
- Improved error messages
- Updated dependencies
```

---

## Pull Request Process

### Before Submitting

1. **Review your changes**:
   ```bash
   git diff main
   ```

2. **Run tests**:
   ```bash
   npm test
   npm run lint
   ```

3. **Update documentation**:
   - README files
   - API documentation
   - JSDoc comments

4. **Squash commits** (optional):
   ```bash
   git rebase -i HEAD~n  # n = number of commits to squash
   ```

### PR Title Format

```
type(scope): subject
```

**Examples**:
- `feat(agents): add pagination support`
- `fix(websocket): handle connection errors`
- `docs(api): update endpoint documentation`

### PR Description Template

```markdown
## Summary
Brief description of changes

## Changes
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Documentation
- [ ] README updated
- [ ] API docs updated
- [ ] JSDoc comments added

## Screenshots (if applicable)
[Add screenshots here]

## Related Issues
Closes #123
Related to #456
```

### Review Process

1. **Automated checks**:
   - CI/CD pipeline runs tests
   - Code coverage checked
   - Linting verified

2. **Code review**:
   - Maintainer reviews your code
   - Requests changes if needed
   - Approves when ready

3. **Merge**:
   - Squash and merge to main
   - Delete branch (optional)

### Addressing Feedback

**Make requested changes**:
```bash
# Make changes
git add .
git commit -m "fix: address review feedback"
git push
```

**Ask questions if unclear**:
- Comment on the PR
- Tag the reviewer
- Be specific about what's unclear

---

## Getting Help

### Resources

- **Documentation**:
  - [Getting Started Guide](./GETTING_STARTED.md)
  - [API Reference](./API_REFERENCE.md)
  - [Tutorial](./TUTORIAL.md)
  - [Architecture](./MVP_ARCHITECTURE.md)
  - [FAQ](./FAQ.md)

- **Code**:
  - [GitHub Repository](https://github.com/SuperInstance/minimal-claw-server)
  - [Issues](https://github.com/SuperInstance/minimal-claw-server/issues)
  - [Discussions](https://github.com/SuperInstance/minimal-claw-server/discussions)

### Asking Questions

1. **Check existing issues** first
2. **Search discussions** for similar topics
3. **Create a new issue** with:
   - Clear title
   - Detailed description
   - Steps to reproduce (if bug)
   - Expected vs actual behavior
   - Environment details

### Issue Templates

**Bug Report**:
```markdown
## Description
Clear description of the bug

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g. Windows 11]
- Node.js: [e.g. 18.0.0]
- Browser: [e.g. Chrome 120]
```

**Feature Request**:
```markdown
## Summary
Brief description of the feature

## Motivation
Why is this feature needed?

## Proposed Solution
How should it work?

## Alternatives
What other approaches did you consider?

## Additional Context
Any other relevant information
```

---

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in relevant documentation

Thank you for contributing to SuperInstance! 🎉

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Need help? Open an issue or start a discussion!**
