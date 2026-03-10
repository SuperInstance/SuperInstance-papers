# DEVELOPER_EXPERIENCE.md

**Developer Experience & Productivity Guide for POLLN Spreadsheet Integration**

---

## Table of Contents

1. [Developer Personas](#developer-personas)
2. [Developer Journey Map](#developer-journey-map)
3. [Local Development Setup](#local-development-setup)
4. [IDE Configuration](#ide-configuration)
5. [Code Quality & Standards](#code-quality--standards)
6. [Testing Strategy](#testing-strategy)
7. [CI/CD Optimization](#cicd-optimization)
8. [Developer Tools](#developer-tools)
9. [Productivity Enhancements](#productivity-enhancements)
10. [Documentation Standards](#documentation-standards)
11. [Metrics for Developer Experience](#metrics-for-developer-experience)
12. [Troubleshooting Guide](#troubleshooting-guide)

---

## Developer Personas

### Persona 1: The Core Contributor
**Profile**: Senior TypeScript developer, open-source maintainer
**Goals**:
- Contribute to core POLLN architecture
- Build and maintain spreadsheet integration
- Ensure code quality and performance
- Mentor other contributors

**Pain Points**:
- Complex distributed system debugging
- Balancing features with technical debt
- Onboarding new developers efficiently
- Maintaining 90%+ test coverage

**Tools Needed**:
- Advanced debugging capabilities
- Performance profiling
- Architecture visualization
- Test coverage analytics

### Persona 2: The Spreadsheet Integrator
**Profile**: Full-stack developer, Excel/Sheets API experience
**Goals**:
- Build platform adapters (Excel, Google Sheets)
- Create UI components for side panels
- Implement custom functions
- Test integrations thoroughly

**Pain Points**:
- Platform API limitations and quirks
- Cross-platform compatibility
- UI state management
- Async/complex workflows

**Tools Needed**:
- Platform-specific debugging
- UI component testing
- API mocking and stubbing
- Cross-platform testing automation

### Persona 3: The Cell Logic Developer
**Profile**: Domain specialist, algorithm developer
**Goals**:
- Implement cell types and logic levels
- Build reasoning and learning engines
- Create analysis and prediction cells
- Optimize performance

**Pain Points**:
- Complex algorithm implementation
- Performance optimization
- LLM integration and cost management
- Debugging distributed logic

**Tools Needed**:
- Algorithm visualization
- Performance benchmarking
- LLM cost tracking
- Logic flow debugging

### Persona 4: The New Contributor
**Profile**: Junior to mid-level developer, new to POLLN
**Goals**:
- Understand the architecture quickly
- Make first contribution successfully
- Learn best practices
- Grow into more complex tasks

**Pain Points**:
- Steep learning curve
- Complex distributed concepts
- Fear of breaking things
- Finding appropriate first tasks

**Tools Needed**:
- Comprehensive onboarding
- Clear documentation
- Good first issues
- Mentorship programs

---

## Developer Journey Map

### Phase 1: Onboarding (Days 1-3)

**Goal**: Set up environment and understand basics

#### Day 1: Environment Setup
```bash
# Clone and setup
git clone https://github.com/SuperInstance/polln.git
cd polln
npm install

# Verify setup
npm test -- --listTests
npm run build

# Run first test
npm test -- src/core/__tests__/agent.test.ts
```

**Success Criteria**:
- All dependencies installed
- Tests pass locally
- Build completes successfully
- Can run CLI tool

#### Day 2: Architecture Understanding
```bash
# Explore the codebase
npm run docs:api          # Generate API docs
npm run docs:api:serve    # View API docs at localhost:8080

# Run examples
npm run demo:multi-colony # See colony coordination
npm run bench:agent       # Benchmark agent performance
```

**Learning Path**:
1. Read `README.md` - Project overview
2. Read `CLAUDE.md` - Current paradigm and status
3. Read `docs/research/spreadsheet/CELL_ONTOLOGY.md` - Cell anatomy
4. Read `docs/research/spreadsheet/MASTER_PLAN.md` - Implementation plan

#### Day 3: First Contribution
```bash
# Find good first issues
gh issue list --label "good first issue"

# Make a small change
git checkout -b my-first-feature
# Make your changes
npm run lint:fix
npm test
git commit -m "feat: my first feature"
git push origin my-first-feature
gh pr create --title "My First Feature" --body "Description"
```

**Recommended First Tasks**:
- Add a new sensation type
- Create a simple transform function
- Write additional test cases
- Improve documentation
- Fix a small bug

### Phase 2: Productive Development (Days 4-30)

**Week 1-2: Foundation Work**
- Implement Wave 1 components (LogCell, CellHead, etc.)
- Write comprehensive tests
- Understand cell anatomy deeply

**Week 3-4: Cell Types**
- Build specific cell types
- Implement logic levels (L0-L3)
- Integrate with existing POLLN core

**Week 5-6: Integration**
- Platform adapters
- UI components
- End-to-end testing

### Phase 3: Mastery (Days 31+)

**Advanced Contributions**:
- Architecture improvements
- Performance optimization
- Complex feature development
- Mentorship of others

---

## Local Development Setup

### Prerequisites

```bash
# Check versions
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 9.0.0
git --version   # Should be >= 2.0.0
```

### Initial Setup

```bash
# Clone repository
git clone https://github.com/SuperInstance/polln.git
cd polln

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Verify installation
npm run build
npm test
```

### Environment Variables

```bash
# .env file (never commit this!)
DEEPSEEK_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
ANTHROPIC_API_KEY=your-key-here

# Optional development settings
DEBUG=polln:*
LOG_LEVEL=debug
PORT=3000
```

### Development Scripts

```bash
# Watch mode for development
npm run dev              # TypeScript watch mode

# Testing
npm test                # All tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
npm run test:integration # Integration tests only

# Linting and formatting
npm run lint            # Check linting
npm run lint:fix        # Fix linting issues
npm run format          # Format code
npm run format:check    # Check formatting

# Building
npm run build           # Production build
npm run cli             # Run CLI tool

# CLI commands
npm run colony:list
npm run lora:list
npm run scale:status

# Monitoring
npm run monitor:metrics
npm run monitor:traces
npm run monitor:logs

# Documentation
npm run docs:api        # Generate API docs
npm run docs:api:serve  # Serve API docs
```

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and test
npm run dev              # Terminal 1: Watch mode
npm run test:watch      # Terminal 2: Test watch

# 3. Quality checks
npm run lint
npm run format:check
npm run test:coverage   # Ensure coverage doesn't drop

# 4. Build verification
npm run build

# 5. Commit and push
git add .
git commit -m "feat: description"
git push origin feature/my-feature

# 6. Create PR
gh pr create --title "Feature: My Feature" --body "Description"
```

---

## IDE Configuration

### Visual Studio Code

#### Recommended Extensions

```json
{
  "recommendations": [
    // Core TypeScript
    "vscode.typescript-language-features",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",

    // Testing
    "firsttris.vscode-jest-runner",
    "GitHub.copilot",

    // Git
    "eamodio.gitlens",
    "github.vscode-pull-request-github",

    // Docker
    "ms-azuretools.vscode-docker",

    // REST Client
    "humao.rest-client",

    // Excel/Sheets development
    "OfficeDev.azure-functions-tools",
    "GoogleCloudCode.cloudcode",

    // Productivity
    "usernamehw.errorlens",
    "streetsidesoftware.code-spell-checker",
    "visualstudioexptteam.vscodeintellicode"
  ]
}
```

#### Workspace Settings

Create `.vscode/settings.json`:

```json
{
  // TypeScript
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.preferences.importModuleSpecifier": "relative",

  // Editor
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.rulers": [80, 120],

  // Files
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true
  },
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/coverage/**": true
  },

  // ESLint
  "eslint.validate": ["typescript", "typescriptreact"],
  "eslint.options": {
    "cache": true
  },

  // Jest
  "jest.jestCommandLine": "npm test --",
  "jest.autoRun": "watch",

  // Debugging
  "debug.node.autoAttach": "on",

  // Testing
  "testing.automaticallyOpenPeekView": "failureInVisibleDocument"
}
```

#### Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Run CLI",
      "program": "${workspaceFolder}/dist/cli/index.js",
      "preLaunchTask": "npm: build",
      "args": ["colonies", "list"],
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Jest: Current File",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["${fileBasenameNoExtension}", "--config", "jest.config.js"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Jest Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Run Benchmark",
      "program": "${workspaceFolder}/node_modules/.bin/tsx",
      "args": ["src/benchmarks/cli.ts", "run", "-s", "agent"],
      "console": "integratedTerminal"
    }
  ]
}
```

#### Tasks Configuration

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "npm: build",
      "type": "npm",
      "script": "build",
      "group": "build",
      "problemMatcher": ["$tsc"]
    },
    {
      "label": "npm: test",
      "type": "npm",
      "script": "test",
      "group": "test",
      "problemMatcher": []
    },
    {
      "label": "npm: lint",
      "type": "npm",
      "script": "lint",
      "problemMatcher": ["$eslint-stylish"]
    },
    {
      "label": "npm: dev",
      "type": "npm",
      "script": "dev",
      "isBackground": true,
      "problemMatcher": ["$tsc-watch"]
    }
  ]
}
```

### WebStorm / IntelliJ IDEA

#### Configuration

1. **TypeScript Compiler**
   - Settings → Languages & Frameworks → TypeScript
   - Enable TypeScript Compiler Service
   - Use: `node_modules/typescript/lib`

2. **Jest**
   - Settings → Languages & Frameworks → JavaScript → Jest
   - Jest package: `node_modules/jest`
   - Jest configuration file: `jest.config.js`

3. **ESLint**
   - Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
   - Automatic ESLint configuration: ON
   - Run eslint --fix on save: ON

4. **Prettier**
   - Settings → Languages & Frameworks → JavaScript → Prettier
   - Run on save for files: ON
   - Prettier package: `node_modules/prettier`

5. **Run Configurations**
   - Create "Run CLI" configuration
   - Create "Jest Test" configuration
   - Create "Build Project" configuration

### Vim / Neovim

#### Configuration

```lua
-- init.lua or ~/.vimrc

-- TypeScript
vim.g.typescript_compiler_binary = 'tsc'
vim.g.typescript_compiler_options = '--noEmit'

-- LSP
require('lspconfig').tsserver.setup{
  on_attach = function(client, bufnr)
    client.resolved_capabilities.document_formatting = false
  end
}

-- Completion
require('compe').setup {
  source = {
    nvim_lsp = true,
    treesitter = true,
  }
}

-- Treesitter
require('nvim-treesitter.configs').setup {
  highlight = { enable = true },
  indent = { enable = true }
}

-- Testing
vim.api.nvim_set_keymap('n', '<leader>t', ':Jest<CR>', {})
vim.api.nvim_set_keymap('n', '<leader>tf', ':JestFile<CR>', {})
```

---

## Code Quality & Standards

### ESLint Configuration

Create `.eslintrc.js`:

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: [
    '@typescript-eslint',
    'import',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/typescript',
    'prettier',
  ],
  rules: {
    // TypeScript specific
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    '@typescript-eslint/strict-boolean-expressions': 'warn',

    // Import organization
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index',
      ],
      'newlines-between': 'always',
      alphabetize: { order: 'asc', caseInsensitive: true },
    }],
    'import/no-unresolved': 'error',
    'import/no-cycle': 'warn',

    // Best practices
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
  ],
};
```

### Prettier Configuration

Create `.prettierrc.js`:

```javascript
module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'always',
  endOfLine: 'lf',
};
```

Create `.prettierignore`:

```
# Dependencies
node_modules/

# Build outputs
dist/
build/
coverage/

# Generated files
*.generated.ts
*.generated.js

# Docs
docs/api/
```

### Pre-commit Hooks (Husky + lint-staged)

Install dependencies:

```bash
npm install --save-dev husky lint-staged
npx husky install
```

Configure `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
npm run test -- --passWithNoTests --onlyChanged
```

Configure `.lintstagedrc.js`:

```javascript
module.exports = {
  '*.{ts,tsx}': [
    'eslint --fix',
    'prettier --write',
    'git add',
  ],
  '*.{json,md,yml,yaml}': [
    'prettier --write',
    'git add',
  ],
};
```

### Code Review Standards

#### Pull Request Checklist

```markdown
## PR Checklist

### Code Quality
- [ ] Code follows project style guidelines
- [ ] ESLint passes without warnings
- [ ] Prettier formatting applied
- [ ] No console.log or debug statements left in

### Testing
- [ ] Unit tests added for new functionality
- [ ] All tests pass (npm test)
- [ ] Test coverage maintained or improved
- [ ] Integration tests updated if needed

### Documentation
- [ ] JSDoc comments added/updated
- [ ] README updated if user-facing
- [ ] CLAUDE.md updated if paradigm change
- [ ] API documentation regenerated (npm run docs:api)

### Performance
- [ ] No performance regressions
- [ ] Benchmarks pass (npm run bench:ci)
- [ ] Memory usage acceptable

### Security
- [ ] No secrets or API keys committed
- [ ] Dependencies audited (npm audit)
- [ ] Input validation added where needed

### Breaking Changes
- [ ] Migration guide provided if breaking
- [ ] Version number updated appropriately
- [ ] Deprecation warnings added if needed
```

#### Reviewer Guidelines

**What to Review**:

1. **Correctness**: Does the code do what it claims?
2. **Safety**: Are there edge cases or error conditions?
3. **Performance**: Is it efficient? Any bottlenecks?
4. **Maintainability**: Is it clear and easy to understand?
5. **Testing**: Are tests comprehensive?
6. **Documentation**: Is it well-documented?

**Review Process**:

```bash
# 1. Fetch and checkout PR
gh pr checkout 123

# 2. Run tests
npm install
npm test
npm run lint

# 3. Run build
npm run build

# 4. Test manually if applicable
npm run cli -- colonies list

# 5. Leave review comments
gh pr review 123 --comment --body "Detailed feedback..."

# 6. Approve or request changes
gh pr review 123 --approve
# or
gh pr review 123 --request-changes
```

### Pair Programming Guidelines

#### When to Pair Program

- Complex architecture decisions
- Debugging tricky issues
- Onboarding new contributors
- Knowledge sharing sessions
- Critical security or performance changes

#### Pair Programming Protocols

**Driver/Navigator Rotation**:
- Switch roles every 30 minutes
- Driver: Writes code, focuses on syntax and implementation
- Navigator: Reviews, thinks about architecture and edge cases

**Virtual Pairing**:
```bash
# Use VS Code Live Share
code --install-extension ms-vscode-liveshare.vscode-liveshare

# Start session
# Tell partner to join
# Share terminal for running tests
```

### Documentation Standards

#### JSDoc Comments

```typescript
/**
 * Process a cell's input through its logic layers.
 *
 * @example
 * ```typescript
 * const cell = new InputCell({ id: 'A1', position: { row: 0, col: 0 } });
 * const result = await cell.process({ value: 42 });
 * ```
 *
 * @param input - The input data to process
 * @param context - The cell execution context
 * @returns Promise resolving to CellOutput
 * @throws {ProcessingError} When input is invalid
 * @throws {TimeoutError} When processing exceeds timeout
 *
 * @public
 * @async
 */
async process(input: any, context?: CellContext): Promise<CellOutput> {
  // Implementation
}
```

#### README Structure

```markdown
# Module Name

Brief description of what this module does.

## Features

- Feature 1
- Feature 2

## Installation

```bash
npm install @polln/module-name
```

## Usage

```typescript
import { Something } from '@polln/module-name';

// Example code
```

## API

### Class: Something

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| doThing | thing: string | Promise<void> | Does the thing |

## Examples

See `/examples` folder for complete examples.

## Contributing

See main CONTRIBUTING.md

## License

MIT
```

---

## Testing Strategy

### Unit Testing

#### Testing Framework: Jest

```typescript
// Example unit test
describe('LogCell', () => {
  let cell: LogCell;

  beforeEach(() => {
    cell = new TestLogCell({
      id: 'A1',
      type: CellType.INPUT,
      position: { row: 0, col: 0 },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('activate', () => {
    it('should transition from DORMANT to SENSING', async () => {
      await cell.activate();
      expect(cell.state).toBe(CellState.SENSING);
    });

    it('should throw if already activated', async () => {
      await cell.activate();
      await expect(cell.activate()).rejects.toThrow(AlreadyActiveError);
    });
  });

  describe('process', () => {
    it('should process input and return output', async () => {
      const input = { value: 42 };
      const result = await cell.process(input);

      expect(result.value).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should generate reasoning trace', async () => {
      const input = { value: 42 };
      await cell.process(input);

      const trace = cell.getTrace();
      expect(trace.steps).toHaveLength(1);
      expect(trace.steps[0].type).toBe(ReasoningStepType.OBSERVATION);
    });
  });

  describe('edge cases', () => {
    it('should handle null input gracefully', async () => {
      const result = await cell.process(null);
      expect(result.value).toBeNull();
    });

    it('should handle timeout', async () => {
      const slowCell = new SlowLogCell({ timeout: 1 });
      await expect(slowCell.process({ value: 42 }))
        .rejects.toThrow(TimeoutError);
    });
  });
});
```

#### Test Organization

```
src/
├── spreadsheet/
│   ├── core/
│   │   ├── LogCell.ts
│   │   └── __tests__/
│   │       ├── LogCell.test.ts
│   │       ├── LogCell.integration.test.ts
│   │       └── fixtures/
│   │           └── test-cells.ts
```

#### Test Utilities

```typescript
// test-utils.ts
export function createMockCell(overrides?: Partial<LogCellConfig>): LogCell {
  return new TestLogCell({
    id: 'TEST',
    type: CellType.INPUT,
    position: { row: 0, col: 0 },
    ...overrides,
  });
}

export function waitForCondition(
  condition: () => boolean,
  timeout = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        reject(new Error('Condition not met within timeout'));
      }
    }, 100);
  });
}

export function mockLLMAdapter(responses: Record<string, any>): LLMAdapter {
  return {
    complete: jest.fn(async (prompt: string) => {
      const key = Object.keys(responses).find(k => prompt.includes(k));
      return responses[key || 'default'];
    }),
  } as any;
}
```

### Integration Testing

```typescript
// integration.test.ts
describe('Cell Coordination Integration', () => {
  let colony: Colony;
  let cellA: LogCell;
  let cellB: LogCell;

  beforeEach(async () => {
    colony = new Colony();
    cellA = new InputCell({
      id: 'A1',
      position: { row: 0, col: 0 },
    });
    cellB = new TransformCell({
      id: 'A2',
      position: { row: 0, col: 1 },
      transform: (x: number) => x * 2,
    });

    await colony.addCell(cellA);
    await colony.addCell(cellB);
  });

  it('should coordinate between cells', async () => {
    await cellA.process({ value: 21 });
    await colony.coordinate();

    expect(cellB.getOutput('value')).toBe(42);
  });

  it('should handle coordination failures', async () => {
    cellA.deactivate();
    await expect(colony.coordinate()).rejects.toThrow(CoordinationError);
  });
});
```

### End-to-End Testing with Playwright

```typescript
// e2e/spreadsheet.test.ts
import { test, expect } from '@playwright/test';

test.describe('Excel Integration', () => {
  test.beforeAll(async () => {
    // Start local server
    await startTestServer();
  });

  test.afterAll(async () => {
    await stopTestServer();
  });

  test('should install add-in and display cells', async ({ page }) => {
    await page.goto('https://localhost:3000/excel');
    await page.waitForSelector('#task-pane');

    // Click to add a cell
    await page.click('[data-testid="add-cell-button"]');
    await page.fill('[data-testid="cell-id-input"]', 'A1');
    await page.click('[data-testid="submit-button"]');

    // Verify cell appears
    await expect(page.locator('[data-testid="cell-A1"]')).toBeVisible();
  });

  test('should inspect cell reasoning', async ({ page }) => {
    await page.goto('https://localhost:3000/excel');
    await page.click('[data-testid="cell-A1"]');
    await page.click('[data-testid="inspect-button"]');

    // Verify trace viewer opens
    await expect(page.locator('[data-testid="trace-viewer"]')).toBeVisible();
    await expect(page.locator('.reasoning-step')).toHaveCount(3);
  });
});
```

### Visual Regression Testing

```typescript
// visual/keyboard-shortcuts.test.ts
import { test, expect } from '@playwright/test';

test('sidebar visual regression', async ({ page }) => {
  await page.goto('https://localhost:3000/excel');
  await page.click('[data-testid="toggle-sidebar"]');

  // Take screenshot
  await expect(page).toHaveScreenshot('sidebar-open.png', {
    maxDiffPixels: 100,
  });
});
```

### Performance Testing

```typescript
// performance/cell-processing.test.ts
describe('Cell Processing Performance', () => {
  it('should process 1000 cells in under 1 second', async () => {
    const cells = Array.from({ length: 1000 }, (_, i) =>
      createMockCell({ id: `cell-${i}` })
    );

    const startTime = Date.now();
    await Promise.all(cells.map(cell => cell.process({ value: i })));
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(1000);
  });

  it('should handle large datasets efficiently', async () => {
    const largeCell = new AggregateCell({
      id: 'SUM',
      position: { row: 0, col: 0 },
      aggregation: 'sum',
    });

    const largeDataset = Array.from({ length: 100000 }, (_, i) => i);
    const startTime = Date.now();
    await largeCell.process(largeDataset);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(500); // 500ms for 100k items
  });
});
```

### Test Coverage

```bash
# Generate coverage report
npm run test:coverage

# View coverage in detail
open coverage/lcov-report/index.html

# Coverage thresholds in package.json
{
  "jest": {
    "collectCoverageFrom": [
      "src/**/*.ts",
      "!src/**/*.test.ts",
      "!src/**/*.spec.ts",
      "!src/benchmarks/**"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 90,
        "statements": 90
      }
    }
  }
}
```

### Testing Best Practices

1. **Test Structure**: AAA (Arrange, Act, Assert)
2. **Test Isolation**: Each test should be independent
3. **Descriptive Names**: `should [do something] when [condition]`
4. **Edge Cases**: Test null, undefined, empty arrays, etc.
5. **Async Tests**: Use async/await, handle timeouts
6. **Mocking**: Mock external dependencies (LLM APIs, databases)
7. **Fixtures**: Reusable test data
8. **Coverage**: Aim for 90%+ coverage

---

## CI/CD Optimization

### GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # Job 1: Lint and Format
  lint:
    name: Lint & Format Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Check formatting
        run: npm run format:check

  # Job 2: Type Check
  type-check:
    name: TypeScript Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

  # Job 3: Unit Tests (Parallel)
  test-unit:
    name: Unit Tests
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests (sharded)
        run: npm test -- --shard=${{ matrix.shard }}/4

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-${{ matrix.shard }}

  # Job 4: Integration Tests
  test-integration:
    name: Integration Tests
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration
        env:
          REDIS_URL: redis://localhost:6379

  # Job 5: E2E Tests
  test-e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  # Job 6: Build
  build:
    name: Production Build
    runs-on: ubuntu-latest
    needs: [lint, type-check, test-unit, test-integration]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  # Job 7: Benchmarks
  benchmark:
    name: Performance Benchmarks
    runs-on: ubuntu-latest
    needs: [build]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run benchmarks
        run: npm run bench:ci

      - name: Store benchmark result
        uses: benchmark-action/github-action-benchmark@v1
        with:
          tool: 'benchmarkjs'
          output-file-path: benchmarks/results.json
          github-token: ${{ secrets.GITHUB_TOKEN }}
          auto-push: false
```

### Smart Build Caching

```yaml
# Advanced caching strategy
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: |
      node_modules
      ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

- name: Cache TypeScript build
  uses: actions/cache@v3
  with:
    path: |
      dist
      .tsbuildinfo
    key: ${{ runner.os }}-tsc-${{ hashFiles('**/*.ts') }}
    restore-keys: |
      ${{ runner.os }}-tsc-
```

### Parallel Test Execution

```javascript
// jest.config.js
module.exports = {
  // Sharding for parallel execution
  shard: '/4/*', // Split into 4 shards

  // Max workers (use all CPU cores)
  maxWorkers: '100%',

  // Test timeout
  testTimeout: 10000,

  // Slow test threshold
  slowTestThreshold: 3,
};
```

### PR Validation Automation

```yaml
# .github/workflows/pr-validation.yml
name: PR Validation

on:
  pull_request_target:
    types: [opened, synchronize, reopened]

jobs:
  validate:
    name: Validate PR
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}

      - name: Validate PR title
        run: |
          TITLE="${{ github.event.pull_request.title }}"
          if [[ ! "$TITLE" =~ ^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?\:\s.+ ]]; then
            echo "PR title must follow conventional commits format"
            exit 1
          fi

      - name: Check PR description
        run: |
          BODY="${{ github.event.pull_request.body }}"
          if [ -z "$BODY" ]; then
            echo "PR must have a description"
            exit 1
          fi

      - name: Check for breaking changes label
        if: contains(github.event.pull_request.labels.*.name, 'breaking')
        run: |
          echo "Breaking changes require migration guide in PR description"
          # Add additional validation logic

      - name: Check all required CI passed
        run: |
          # Query GitHub API to check CI status
          # Fail if any CI jobs failed
```

### Deployment Automation

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy-npm:
    name: Deploy to npm
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  deploy-github:
    name: Deploy GitHub Release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false
```

### Rollback Automation

```yaml
# .github/workflows/rollback.yml
name: Rollback

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to rollback to (e.g., v1.2.3)'
        required: true

jobs:
  rollback:
    name: Rollback to ${{ github.event.inputs.version }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout tag
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.version }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install and build
        run: |
          npm ci
          npm run build

      - name: Republish to npm
        run: |
          # Extract version without 'v' prefix
          VERSION=${{ github.event.inputs.version }}
          VERSION=${VERSION#v}

          # Unpublish current version
          npm unpublish polln@$(node -p "require('./package.json').version")

          # Publish rollback version
          npm publish --tag rollback-$VERSION
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Developer Tools

### CLI Tools (@polln/cli)

The POLLN CLI provides comprehensive colony management:

```bash
# Colony Management
polln colonies list              # List all colonies
polln colonies create            # Create new colony
polln colonies status <id>       # Check colony status
polln colonies scale <id>        # Scale colony
polln colonies migrate <id>      # Migrate colony

# LoRa Training
polln lora list                  # List available LoRAs
polln lora train <model>         # Train new LoRA
polln lora benchmark <model>     # Benchmark LoRA
polln lora distill <model>       # Distill model

# Scaling
polln scale status               # Check scaling status
polln scale policy               # View scaling policy
polln scale manual <count>       # Manual scaling
polln scale predict              # Predict scaling needs

# Monitoring
polln monitor metrics            # View metrics
polln monitor traces             # View traces
polln monitor logs               # View logs
polln monitor health             # Health check
```

### Code Generators

```bash
# Generate new cell type
npm run generate:cell -- --name MyCell --type custom

# Generate new reasoning engine
npm run generate:reasoning --name MyEngine

# Generate new platform adapter
npm run generate:adapter --name MyPlatform
```

Create `scripts/generate-cell.ts`:

```typescript
#!/usr/bin/env tsx
import { promises as fs } from 'fs';
import path from 'path';

interface GenerateCellOptions {
  name: string;
  type?: string;
  outputPath?: string;
}

async function generateCell(options: GenerateCellOptions) {
  const { name, type = 'custom', outputPath = 'src/spreadsheet/cells' } = options;

  const className = `${name}Cell`;
  const fileName = `${className}.ts`;
  const testFileName = `${className}.test.ts`;

  const cellTemplate = `/**
 * ${className} - ${type} cell implementation
 *
 * Generated by: npm run generate:cell
 * Date: ${new Date().toISOString()}
 */

import { LogCell } from '../core/LogCell';
import { CellType, CellState, LogicLevel } from '../types';

export interface ${className}Config {
  id: string;
  position: { row: number; col: number };
  // Add custom config options here
}

export class ${className} extends LogCell {
  constructor(config: ${className}Config) {
    super({
      id: config.id,
      type: CellType.${type.toUpperCase()},
      position: config.position,
      logicLevel: LogicLevel.L0_LOGIC,
    });
  }

  async activate(): Promise<void> {
    this.state = CellState.SENSING;
  }

  async process(input: any): Promise<any> {
    // Implement processing logic here
    return {
      value: input,
      confidence: 1.0,
      explanation: 'Processed by ${className}',
      trace: this.body.getTrace(),
      effects: [],
    };
  }

  async learn(feedback: any): Promise<void> {
    // Implement learning logic here
  }

  async deactivate(): Promise<void> {
    this.state = CellState.DORMANT;
  }
}
`;

  const testTemplate = `/**
 * Tests for ${className}
 */

import { ${className} } from './${className}';

describe('${className}', () => {
  let cell: ${className};

  beforeEach(() => {
    cell = new ${className}({
      id: 'TEST',
      position: { row: 0, col: 0 },
    });
  });

  describe('activate', () => {
    it('should activate successfully', async () => {
      await cell.activate();
      expect(cell.state).toBeDefined();
    });
  });

  describe('process', () => {
    it('should process input', async () => {
      const result = await cell.process({ value: 42 });
      expect(result.value).toBeDefined();
    });
  });
});
`;

  const filePath = path.join(outputPath, fileName);
  const testFilePath = path.join(outputPath, '__tests__', testFileName);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.mkdir(path.dirname(testFilePath), { recursive: true });

  await fs.writeFile(filePath, cellTemplate);
  await fs.writeFile(testFilePath, testTemplate);

  console.log(`✅ Generated ${className}`);
  console.log(`   → ${filePath}`);
  console.log(`   → ${testFilePath}`);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options: GenerateCellOptions = {
  name: args[0],
  type: args.find(a => a.startsWith('--type='))?.split('=')[1],
  outputPath: args.find(a => a.startsWith('--output='))?.split('=')[1],
};

if (!options.name) {
  console.error('Usage: generate-cell <name> [--type=<type>] [--output=<path>]');
  process.exit(1);
}

generateCell(options).catch(console.error);
```

### Database Migrations

```bash
# Create migration
npm run migration:create -- --name add_sensation_table

# Run migrations
npm run migration:up

# Rollback migration
npm run migration:down

# List migrations
npm run migration:status
```

### Seed Data Management

```typescript
// scripts/seed.ts
import { Colony } from '../src/core/colony';
import { InputCell, TransformCell } from '../src/spreadsheet/cells';

export async function seedTestData() {
  const colony = new Colony();

  // Create test cells
  const inputCell = new InputCell({
    id: 'A1',
    position: { row: 0, col: 0 },
  });

  const transformCell = new TransformCell({
    id: 'A2',
    position: { row: 0, col: 1 },
    transform: (x: number) => x * 2,
  });

  // Add to colony
  await colony.addCell(inputCell);
  await colony.addCell(transformCell);

  // Process test data
  await inputCell.process({ value: 21 });
  await colony.coordinate();

  console.log('✅ Test data seeded');
  console.log(`   A2 value: ${transformCell.getOutput('value')}`);
}

if (require.main === module) {
  seedTestData().catch(console.error);
}
```

### Local Kubernetes (kind/minikube)

```yaml
# k8s/dev-deployment.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: polln-dev

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: polln-api
  namespace: polln-dev
spec:
  replicas: 3
  selector:
    matchLabels:
      app: polln-api
  template:
    metadata:
      labels:
        app: polln-api
    spec:
      containers:
      - name: polln-api
        image: polln:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "development"
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: polln-config
              key: redis-url

---
apiVersion: v1
kind: Service
metadata:
  name: polln-api
  namespace: polln-dev
spec:
  selector:
    app: polln-api
  ports:
  - port: 3000
    targetPort: 3000
  type: LoadBalancer

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: polln-config
  namespace: polln-dev
data:
  redis-url: "redis://redis:6379"
```

```bash
# Deploy to local kind
kind create cluster --name polln-dev
kubectl apply -f k8s/dev-deployment.yaml

# Port forward
kubectl port-forward svc/polln-api 3000:3000 -n polln-dev

# Cleanup
kind delete cluster --name polln-dev
```

---

## Productivity Enhancements

### Hot Module Replacement

```typescript
// vite.config.ts for UI development
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    hmr: {
      port: 3000,
    },
    watch: {
      usePolling: true,
    },
  },
  build: {
    outDir: 'dist/ui',
    sourcemap: true,
  },
});
```

### Fast Refresh Strategies

```typescript
// React Fast Refresh setup
import { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

// Enable Fast Refresh
if (module.hot && process.env.NODE_ENV !== 'production') {
  module.hot.accept();
}

// Wrap application with Fast Refresh boundary
export function withRefresh<T>(component: ReactElement<T>) {
  return component;
}
```

### Docker Optimization

```dockerfile
# Dockerfile (multi-stage build)
FROM node:18-alpine AS builder

WORKDIR /app

# Cache dependencies
COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci

# Copy source
COPY src/ ./src/

# Build
RUN npm run build

# Production image
FROM node:18-alpine AS production

WORKDIR /app

# Only copy production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/dist ./dist

# Non-root user
USER node

CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml for development
version: '3.8'

services:
  polln:
    build:
      context: .
      target: builder
    volumes:
      - ./src:/app/src:ro
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
    command: npm run dev

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

### Dependency Caching

```yaml
# GitHub Actions dependency caching
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: |
      node_modules
      ~/.npm
    key: ${{ runner.os }}-deps-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-deps-
```

### Monorepo Tooling

If using Nx or Turborepo:

```json
// nx.json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test", "lint"]
      }
    }
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "inputs": ["default", "^default"]
    }
  }
}
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "cache": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": [],
      "cache": true
    },
    "lint": {
      "outputs": [],
      "cache": true
    }
  }
}
```

---

## Documentation Standards

### API Documentation (OpenAPI)

```typescript
// Generate OpenAPI specs
import { createOpenAPI } from '@api/openapi';

export const openapiSpec = createOpenAPI({
  info: {
    title: 'POLLN API',
    version: '1.0.0',
    description: 'Pattern-Organized Large Language Network API',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  paths: {
    '/api/v1/colonies': {
      get: {
        summary: 'List all colonies',
        tags: ['Colonies'],
        responses: {
          '200': {
            description: 'List of colonies',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Colony' },
                },
              },
            },
          },
        },
      },
    },
  },
});
```

### Component Storybook

```typescript
// stories/LogCell.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { LogCell } from '../src/spreadsheet/core/LogCell';

const meta: Meta<typeof LogCell> = {
  title: 'Spreadsheet/LogCell',
  component: LogCell,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof LogCell>;

export const Input: Story = {
  args: {
    id: 'A1',
    type: CellType.INPUT,
    position: { row: 0, col: 0 },
  },
};

export const Transform: Story = {
  args: {
    id: 'A2',
    type: CellType.TRANSFORM,
    position: { row: 0, col: 1 },
    transform: (x: number) => x * 2,
  },
};
```

### Architecture Decision Records (ADR)

Create `docs/adr/001-cell-anatomy.md`:

```markdown
# ADR 001: Cell Anatomy Design

## Status
Accepted

## Context
We need to define the structure of LOG cells for the spreadsheet integration.

## Decision
Cells will have a head-tail anatomy:
- **Head**: Input reception and sensation
- **Body**: Processing and reasoning
- **Tail**: Output and effects
- **Origin**: Self-reference point

## Consequences
**Positive**:
- Clear separation of concerns
- Easy to understand and debug
- Aligns with LOG philosophy

**Negative**:
- More complex than simple functions
- Requires more code

## Alternatives Considered
1. **Simple function cells**: Rejected - too limiting
2. **Agent-based cells**: Rejected - too complex for MVP

## Implementation
See `docs/research/spreadsheet/CELL_ONTOLOGY.md` for full specification.
```

### Runbooks

Create `docs/runbooks/debugging-cells.md`:

```markdown
# Debugging Cell Issues

## Problem: Cell Not Activating

### Symptoms
- Cell remains in DORMANT state
- No processing occurs
- No errors thrown

### Diagnosis Steps
1. Check cell configuration
2. Verify dependencies are met
3. Check for activation errors
4. Review logs: `npm run monitor:logs`

### Solutions
1. Ensure proper cell type
2. Check required permissions
3. Verify input connections
4. Review error logs

## Problem: Cell Performance Degraded

### Symptoms
- Processing takes >200ms
- Memory usage high
- CPU spikes

### Diagnosis Steps
1. Profile with `npm run bench:agent`
2. Check for memory leaks
3. Review trace logs
4. Monitor with `npm run monitor:metrics`

### Solutions
1. Optimize logic
2. Add caching
3. Reduce memory footprint
4. Implement batching
```

### Troubleshooting Guides

Create `docs/troubleshooting/common-errors.md`:

```markdown
# Common Errors and Solutions

## TS2307: Cannot find module

### Error
```
TS2307: Cannot find module '@polln/core'
```

### Solution
```bash
npm install
npm run build
```

## TypeError: Cannot read property 'process' of undefined

### Error
Cell body is not initialized

### Solution
```typescript
// Ensure body is initialized in constructor
this.body = this.createBody(config.body);
```

## ENOENT: no such file or directory

### Error
Cannot find configuration file

### Solution
```bash
# Create .env file
cp .env.example .env
# Edit with your values
```
```

---

## Metrics for Developer Experience

### Key Performance Indicators

#### 1. Time to First Commit

**Target**: < 30 minutes from clone to first commit

**Measurement**:
```bash
# Track in onboarding survey
git log --author="$USER" --since="1 hour ago"
```

**Improvement Strategies**:
- Improve setup documentation
- Automate more setup steps
- Provide better templates
- Video onboarding tutorials

#### 2. PR Cycle Time

**Target**: < 24 hours from open to merge

**Measurement**:
```bash
# GitHub CLI
gh pr list --json number,title,createdAt,mergedAt --jq '.[] | (.mergedAt - .createdAt)'
```

**Improvement Strategies**:
- Automated PR validation
- Clear PR templates
- Faster review process
- Reduce CI/CD time

#### 3. Build Time

**Target**: < 2 minutes for full build

**Measurement**:
```bash
# Track build times
time npm run build
```

**Improvement Strategies**:
- Better caching
- Incremental builds
- Parallel compilation
- Reduce dependencies

#### 4. Test Execution Time

**Target**: < 30 seconds for unit tests

**Measurement**:
```bash
# Track test times
npm test -- --verbose --json | jq '.stats.duration'
```

**Improvement Strategies**:
- Parallel test execution
- Test sharding
- Mock slow dependencies
- Optimize test setup

#### 5. Developer Satisfaction

**Target**: > 4/5 stars

**Measurement**:
```json
// Quarterly developer survey
{
  "overall_satisfaction": 4.2,
  "tooling_quality": 4.0,
  "documentation_quality": 3.8,
  "code_review_quality": 4.5,
  "ci_cd_quality": 4.1
}
```

**Improvement Strategies**:
- Regular feedback surveys
- Act on feedback quickly
- Celebrate improvements
- Share best practices

### Tracking Metrics

```typescript
// scripts/track-dx-metrics.ts
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

interface DXMetrics {
  timestamp: string;
  buildTime: number;
  testTime: number;
  coverage: number;
  lintErrors: number;
  prCount: number;
}

function getDXMetrics(): DXMetrics {
  const buildStart = Date.now();
  execSync('npm run build', { stdio: 'ignore' });
  const buildTime = Date.now() - buildStart;

  const testStart = Date.now();
  execSync('npm test', { stdio: 'ignore' });
  const testTime = Date.now() - testStart;

  // Extract coverage from output
  const coverageOutput = execSync('npm run test:coverage -- --json', {
    encoding: 'utf-8',
  });
  const coverage = JSON.parse(coverageOutput).total.lines.pct;

  // Count lint errors
  const lintOutput = execSync('npm run lint -- --format json', {
    encoding: 'utf-8',
  });
  const lintErrors = JSON.parse(lintOutput).length;

  // Count open PRs
  const prOutput = execSync('gh pr list --json id --jq length', {
    encoding: 'utf-8',
  });
  const prCount = parseInt(prOutput, 10);

  return {
    timestamp: new Date().toISOString(),
    buildTime,
    testTime,
    coverage,
    lintErrors,
    prCount,
  };
}

function main() {
  const metrics = getDXMetrics();
  writeFileSync(
    'metrics/dx-metrics.jsonl',
    JSON.stringify(metrics) + '\n',
    { flag: 'a' }
  );
  console.log('DX Metrics recorded:', metrics);
}

main();
```

### Metrics Dashboard

```typescript
// Create a simple dashboard
import express from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

const app = express();
const METRICS_FILE = join(__dirname, '../../metrics/dx-metrics.jsonl');

app.get('/api/metrics/dx', (req, res) => {
  const content = readFileSync(METRICS_FILE, 'utf-8');
  const lines = content.trim().split('\n');
  const metrics = lines.map(line => JSON.parse(line));

  // Calculate averages
  const avgBuildTime =
    metrics.reduce((sum, m) => sum + m.buildTime, 0) / metrics.length;
  const avgTestTime =
    metrics.reduce((sum, m) => sum + m.testTime, 0) / metrics.length;
  const avgCoverage =
    metrics.reduce((sum, m) => sum + m.coverage, 0) / metrics.length;

  res.json({
    average: {
      buildTime: avgBuildTime,
      testTime: avgTestTime,
      coverage: avgCoverage,
    },
    history: metrics.slice(-30), // Last 30 measurements
  });
});

app.listen(3001, () => {
  console.log('DX Metrics dashboard at http://localhost:3001');
});
```

---

## Troubleshooting Guide

### Development Environment Issues

#### Problem: Dependencies Won't Install

**Symptoms**:
- `npm install` fails
- peer dependency errors
- network timeouts

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and lock file
rm -rf node_modules package-lock.json

# Try again
npm install

# If still failing, use legacy peer deps
npm install --legacy-peer-deps
```

#### Problem: TypeScript Compilation Errors

**Symptoms**:
- Type errors despite code being correct
- Cannot find module errors
- Declaration file missing

**Solutions**:
```bash
# Rebuild type definitions
npm run build

# Clear TypeScript cache
rm -rf .tsbuildinfo

# Verify tsconfig.json
npx tsc --showConfig

# Check for circular dependencies
npx madge --circular --extensions ts src/
```

#### Problem: Tests Fail Locally but Pass in CI

**Symptoms**:
- Tests fail on your machine
- Same tests pass in GitHub Actions
- Inconsistent behavior

**Solutions**:
```bash
# Clear Jest cache
npm test -- --clearCache

# Run with same Node version as CI
nvm use 18  # or whatever CI uses

# Check for timezone differences
export TZ=UTC
npm test

# Update snapshots if needed
npm test -- -u
```

### Performance Issues

#### Problem: Slow Build Times

**Symptoms**:
- Build takes > 2 minutes
- Incremental builds slow
- CPU spikes during build

**Solutions**:
```bash
# Profile build
npm run build -- --profile

# Use incremental compilation
# Add to tsconfig.json:
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}

# Reduce dependencies
npm uninstall <unused-package>
```

#### Problem: Slow Test Execution

**Symptoms**:
- Tests take > 30 seconds
- Jest hangs
- Memory exhaustion

**Solutions**:
```bash
# Run tests in parallel
npm test -- --maxWorkers=4

# Run only changed files
npm test -- --onlyChanged

# Profile slow tests
npm test -- --detectLeaks --logHeapUsage

# Use test shards
npm test -- --shard=1/4
```

### Integration Issues

#### Problem: Excel Add-in Won't Load

**Symptoms**:
- Add-in shows error
- Sidebar doesn't appear
- Functions not available

**Solutions**:
```bash
# Verify manifest.xml
npm run validate:manifest

# Check Office.js version
npm list office-js

# Test in different Excel version
# Some features require Excel 365

# Clear Office cache
# Windows: %LOCALAPPDATA%\Microsoft\Office\16.0\Wef\
# Mac: ~/Library/Containers/com.microsoft.Excel/Data/
```

#### Problem: LLM API Errors

**Symptoms**:
- API rate limit errors
- Authentication failures
- Timeout errors

**Solutions**:
```typescript
// Add retry logic
async function callWithRetry(
  fn: () => Promise<any>,
  maxRetries = 3
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
}

// Add caching
const cache = new Map();
async function cachedLLMCall(prompt: string) {
  if (cache.has(prompt)) {
    return cache.get(prompt);
  }
  const result = await llmAdapter.complete(prompt);
  cache.set(prompt, result);
  return result;
}
```

### Debugging Tips

#### Enable Debug Logging

```bash
# Set debug environment variable
export DEBUG=polln:*

# Or for specific module
export DEBUG=polln:cell,polln:colony

# Run with debug output
DEBUG=polln:* npm test
```

#### Use TypeScript Debugger

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Current File",
  "program": "${workspaceFolder}/node_modules/.bin/ts-node",
  "args": ["${file}"],
  "skipFiles": ["<node_internals>/**"]
}
```

#### Memory Profiling

```bash
# Run with memory profiling
node --inspect --max-old-space-size=8192 dist/cli/index.js colonies list

# Then open Chrome DevTools
# chrome://inspect
# Click "inspect" on the Node process
# Take heap snapshots
```

---

## Quick Reference

### Essential Commands

```bash
# Development
npm run dev              # Watch mode
npm run build            # Build
npm test                 # Test
npm run lint             # Lint

# CLI
npm run cli              # Run CLI
npm run colony:list      # List colonies
npm run lora:list        # List LoRAs

# Monitoring
npm run monitor:metrics  # View metrics
npm run monitor:logs     # View logs
npm run monitor:health   # Health check

# Documentation
npm run docs:api         # Generate API docs
npm run docs:api:serve   # Serve API docs
```

### File Locations

```
polln/
├── src/
│   ├── spreadsheet/         # Spreadsheet integration
│   ├── core/               # Core POLLN
│   ├── api/                # API handlers
│   ├── cli/                # CLI tool
│   └── benchmarks/         # Benchmarks
├── docs/
│   ├── research/spreadsheet/  # Research docs
│   └── adr/                    # Architecture decisions
├── scripts/                 # Utility scripts
├── .github/
│   └── workflows/          # CI/CD workflows
├── jest.config.js          # Jest configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

### Getting Help

1. **Documentation**: Start with `README.md` and `CLAUDE.md`
2. **Research docs**: Check `docs/research/spreadsheet/`
3. **Issues**: Search GitHub issues
4. **Discussions**: Use GitHub Discussions for questions
5. **Community**: Join Discord/Slack if available

---

**Document Version**: 1.0
**Last Updated**: 2026-03-09
**Status**: ✅ Complete
**Maintainer**: POLLN Core Team

---

*This document is part of the POLLN Developer Experience initiative.
For updates and contributions, see: https://github.com/SuperInstance/polln*
