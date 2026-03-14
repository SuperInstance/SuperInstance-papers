# Quick Start Guide - SuperInstance Integration Tests
# =====================================================

Get up and running with the integration test suite in 5 minutes.

---

## Prerequisites

- Python 3.10+
- pip (Python package manager)
- Git (for cloning repository)

---

## Installation (30 seconds)

```bash
# Navigate to test directory
cd research/phase8_testing

# Install dependencies
pip install pytest pytest-asyncio numpy scipy
```

**Optional:** Install all test dependencies

```bash
pip install -r requirements.txt
```

---

## Run Your First Test (10 seconds)

```bash
# Run smoke tests (fastest)
python -m pytest integration_tests.py -v -m smoke --asyncio-mode=auto
```

**Expected Output:**

```
======================== test session starts =========================
collected 3 items

integration_tests.py::SmokeTests::test_platform_initialization PASSED
integration_tests.py::SmokeTests::test_basic_simulation PASSED
integration_tests.py::SmokeTests::test_experiment_config_creation PASSED

======================== 3 passed in 2.34s ==========================
```

---

## Run Integration Tests (2 minutes)

```bash
# Run all integration tests
python -m pytest integration_tests.py -v -m integration --asyncio-mode=auto
```

This validates:
- Full research workflow
- GPU/cloud fallback
- Concurrent users
- Publication generation
- Error handling
- Data integrity

---

## Run Performance Tests (5 minutes)

```bash
# Run performance benchmarks
python -m pytest performance_tests.py -v -m performance --asyncio-mode=auto -s
```

This measures:
- Simulation throughput
- Latency percentiles
- Memory efficiency
- Scalability

---

## Using the Test Runner Script

The `run_tests.py` script provides convenient shortcuts:

```bash
# Run all fast tests
python run_tests.py

# Run smoke tests only
python run_tests.py --smoke

# Run integration tests
python run_tests.py --integration

# Run performance tests
python run_tests.py --performance

# Run with coverage
python run_tests.py --coverage

# Run all tests (including slow)
python run_tests.py --full
```

---

## Understanding Test Results

### Success Example

```
test_full_research_workflow PASSED [100%]
=================== 1 passed in 3.45s ===================
```

### Failure Example

```
test_full_research_workflow FAILED
=================== FAILURES ====================
____________________________ test_full_research_workflow ____________________________

    async def test_full_research_workflow(self, platform, sample_experiment):
>       assert validation.passed, f"Validation failed: {validation.issues}"
E       AssertionError: Validation failed: ['Low convergence rate']

integration_tests.py:180: AssertionError
=================== 1 failed in 5.67s ===================
```

---

## Common First-Time Issues

### Issue: "ModuleNotFoundError: No module named 'pytest'"

**Solution:** Install pytest
```bash
pip install pytest pytest-asyncio
```

### Issue: "ImportError: cannot import name 'LocalGPUSimulator'"

**Solution:** This is expected if GPU modules aren't installed. Tests will use CPU fallback.

### Issue: Tests fail with "asyncio" errors

**Solution:** Ensure pytest-asyncio is installed and use `--asyncio-mode=auto`
```bash
pip install pytest-asyncio
pytest --asyncio-mode=auto
```

---

## Next Steps

1. **Explore the test suite:**
   - Read `README.md` for comprehensive documentation
   - Browse `integration_tests.py` to see test implementations

2. **Run specific tests:**
   ```bash
   # Run a specific test
   pytest integration_tests.py::ComprehensiveIntegrationTests::test_full_research_workflow -v
   ```

3. **Generate coverage report:**
   ```bash
   pytest --cov=. --cov-report=html
   # Open htmlcov/index.html in browser
   ```

4. **Run in CI/CD:**
   - Tests automatically run on GitHub Actions
   - See `.github/workflows/test.yml` for configuration

---

## Quick Reference

| Command | Duration | Description |
|---------|----------|-------------|
| `python run_tests.py --smoke` | 30s | Basic functionality |
| `python run_tests.py --integration` | 2-5m | End-to-end workflows |
| `python run_tests.py --performance` | 5-30m | Benchmarks |
| `python run_tests.py --full` | 30-60m | All tests |

---

## Need Help?

- **Documentation:** See `README.md`
- **Test Details:** See inline comments in test files
- **Issues:** Report via GitHub Issues

**Happy Testing!**
