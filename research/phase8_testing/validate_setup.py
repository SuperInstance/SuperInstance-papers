"""
Setup Validation Script
========================

Quick validation that the test suite is properly configured.

Usage:
    python validate_setup.py
"""

import sys
from pathlib import Path

def check_module(module_name):
    """Check if a module is available."""
    try:
        __import__(module_name)
        print(f"  {module_name}: OK")
        return True
    except ImportError:
        print(f"  {module_name}: MISSING")
        return False

def main():
    print("="*60)
    print("SuperInstance Integration Test Suite - Setup Validation")
    print("="*60)

    # Check Python version
    print("\nPython Version:")
    version = sys.version_info
    print(f"  {version.major}.{version.minor}.{version.micro}")
    if version.major == 3 and version.minor >= 10:
        print("  Status: OK (3.10+ required)")
    else:
        print("  Status: WARNING (3.10+ recommended)")

    # Check required modules
    print("\nRequired Modules:")
    required = [
        "pytest",
        "asyncio",
    ]
    required_ok = all(check_module(m) for m in required)

    # Check optional modules
    print("\nOptional Modules:")
    optional = [
        "numpy",
        "scipy",
        "pytest_asyncio",
    ]
    optional_ok = sum(check_module(m) for m in optional)

    # Check test files
    print("\nTest Files:")
    test_dir = Path(__file__).parent
    test_files = [
        "integration_tests.py",
        "performance_tests.py",
        "conftest.py",
        "pytest.ini",
        "requirements.txt",
        "run_tests.py",
        "README.md",
        "QUICKSTART.md"
    ]

    files_ok = True
    for file in test_files:
        file_path = test_dir / file
        if file_path.exists():
            print(f"  {file}: OK")
        else:
            print(f"  {file}: MISSING")
            files_ok = False

    # Summary
    print("\n" + "="*60)
    print("Validation Summary:")
    print("="*60)

    if required_ok and files_ok:
        print("Status: READY")
        print("\nYou can run tests with:")
        print("  python run_tests.py --smoke")
        print("\nOr directly with pytest:")
        print("  pytest integration_tests.py -v -m smoke --asyncio-mode=auto")
        return 0
    else:
        print("Status: SETUP REQUIRED")
        if not required_ok:
            print("\nMissing required modules. Install with:")
            print("  pip install pytest pytest-asyncio")
        if not files_ok:
            print("\nMissing test files. Please ensure all files are present.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
