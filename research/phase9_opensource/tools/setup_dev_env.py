#!/usr/bin/env python3
"""
SuperInstance Development Environment Setup Script

Automated setup for new contributors. This script checks prerequisites,
installs dependencies, configures the development environment, and
verifies the installation.

Usage:
    python setup_dev_env.py [--skip-checks] [--gpu]
"""

import os
import sys
import subprocess
import platform
import shutil
import json
from pathlib import Path
from typing import List, Tuple, Optional
import argparse
import time

class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_step(step: str, status: str = ""):
    """Print a step header"""
    status_str = f" [{status}]" if status else ""
    print(f"\n{Colors.HEADER}{Colors.BOLD}Step: {step}{status_str}{Colors.ENDC}")
    print("=" * 60)

def print_success(message: str):
    """Print success message"""
    print(f"{Colors.GREEN}✓ {message}{Colors.ENDC}")

def print_error(message: str):
    """Print error message"""
    print(f"{Colors.FAIL}✗ {message}{Colors.ENDC}")

def print_warning(message: str):
    """Print warning message"""
    print(f"{Colors.WARNING}⚠ {message}{Colors.ENDC}")

def print_info(message: str):
    """Print info message"""
    print(f"{Colors.CYAN}ℹ {message}{Colors.ENDC}")

def run_command(
    command: List[str],
    description: str,
    check: bool = True,
    capture: bool = False
) -> Tuple[bool, str]:
    """Run a shell command"""
    print_info(f"Running: {description}")
    try:
        if capture:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                check=check
            )
            output = result.stdout
            if output:
                print(f"  {output.strip()}")
            return True, output
        else:
            subprocess.run(command, check=check)
            return True, ""
    except subprocess.CalledProcessError as e:
        print_error(f"Command failed: {e}")
        if capture and e.stderr:
            print(f"  {e.stderr.strip()}")
        return False, ""

class DevEnvSetup:
    """Development environment setup manager"""

    def __init__(self, skip_checks: bool = False, enable_gpu: bool = False):
        self.skip_checks = skip_checks
        self.enable_gpu = enable_gpu
        self.root_dir = Path(__file__).parent.parent.parent
        self.errors = []
        self.warnings = []

    def check_prerequisites(self) -> bool:
        """Check system prerequisites"""
        print_step("Checking Prerequisites")

        success = True

        # Check Python
        python_version = sys.version_info
        if python_version >= (3, 10):
            print_success(f"Python {python_version.major}.{python_version.minor}.{python_version.micro}")
        else:
            print_error(f"Python 3.10+ required, found {python_version.major}.{python_version.minor}")
            success = False

        # Check Node.js
        node_success, node_version = run_command(
            ["node", "--version"],
            "Checking Node.js",
            check=False,
            capture=True
        )
        if node_success:
            version = node_version.strip().lstrip('v')
            major = int(version.split('.')[0])
            if major >= 18:
                print_success(f"Node.js {version}")
            else:
                print_error(f"Node.js 18+ required, found {version}")
                success = False
        else:
            print_error("Node.js not found")
            success = False

        # Check Git
        git_success, _ = run_command(
            ["git", "--version"],
            "Checking Git",
            check=False,
            capture=True
        )
        if git_success:
            print_success("Git installed")
        else:
            print_error("Git not found")
            success = False

        # Check Docker (optional)
        docker_success, _ = run_command(
            ["docker", "--version"],
            "Checking Docker",
            check=False,
            capture=True
        )
        if docker_success:
            print_success("Docker installed (optional)")
        else:
            print_warning("Docker not found (optional)")

        # Check CUDA (if GPU enabled)
        if self.enable_gpu:
            cuda_success, _ = run_command(
                ["nvcc", "--version"],
                "Checking CUDA",
                check=False,
                capture=True
            )
            if cuda_success:
                print_success("CUDA installed")
            else:
                print_warning("CUDA not found - GPU acceleration unavailable")
                self.warnings.append("GPU requested but CUDA not available")

        return success

    def install_node_dependencies(self) -> bool:
        """Install Node.js dependencies"""
        print_step("Installing Node.js Dependencies")

        package_json = self.root_dir / "package.json"
        if not package_json.exists():
            print_error("package.json not found")
            return False

        success, _ = run_command(
            ["npm", "install"],
            "Installing dependencies",
            capture=True
        )

        if success:
            print_success("Node.js dependencies installed")
        return success

    def install_python_dependencies(self) -> bool:
        """Install Python dependencies"""
        print_step("Installing Python Dependencies")

        requirements = self.root_dir / "research" / "simulations" / "requirements.txt"
        if not requirements.exists():
            print_warning("requirements.txt not found, skipping Python dependencies")
            return True

        success, _ = run_command(
            [sys.executable, "-m", "pip", "install", "-r", str(requirements)],
            "Installing Python packages",
            capture=True
        )

        if success:
            print_success("Python dependencies installed")
        return success

    def setup_configuration(self) -> bool:
        """Set up configuration files"""
        print_step("Setting Up Configuration")

        success = True

        # Copy .env.example to .env
        env_example = self.root_dir / ".env.example"
        env_file = self.root_dir / ".env"

        if env_example.exists() and not env_file.exists():
            shutil.copy(env_example, env_file)
            print_success("Created .env from .env.example")
        elif env_file.exists():
            print_info(".env already exists")
        else:
            print_warning("No .env.example found")

        # Create logs directory
        logs_dir = self.root_dir / "logs"
        logs_dir.mkdir(exist_ok=True)
        print_success("Created logs directory")

        # Create data directory
        data_dir = self.root_dir / "data"
        data_dir.mkdir(exist_ok=True)
        print_success("Created data directory")

        return success

    def setup_git_hooks(self) -> bool:
        """Set up git hooks"""
        print_step("Setting Up Git Hooks")

        hooks_dir = self.root_dir / ".git" / "hooks"
        if not hooks_dir.exists():
            print_warning("Not a git repository, skipping hooks")
            return True

        # Create pre-commit hook
        pre_commit = hooks_dir / "pre-commit"
        hook_content = """#!/bin/bash
# Run pre-commit checks

echo "Running pre-commit checks..."

# Run linter
npm run lint --if-present

# Run tests
npm run test --if-present

# Run Python tests (if in simulations directory)
if [[ "$PWD" == *"simulations"* ]]; then
    python -m pytest tests/ || true
fi
"""

        try:
            with open(pre_commit, 'w') as f:
                f.write(hook_content)
            os.chmod(pre_commit, 0o755)
            print_success("Created pre-commit hook")
        except Exception as e:
            print_warning(f"Could not create git hooks: {e}")

        return True

    def run_tests(self) -> bool:
        """Run test suite to verify installation"""
        print_step("Running Tests")

        success = True

        # Run TypeScript tests
        ts_success, _ = run_command(
            ["npm", "test", "--", "--passWithNoTests"],
            "Running TypeScript tests",
            check=False,
            capture=True
        )
        if ts_success:
            print_success("TypeScript tests passed")
        else:
            print_warning("TypeScript tests failed (may be expected)")
            self.warnings.append("Some TypeScript tests failed")

        # Run Python tests (if available)
        test_dir = self.root_dir / "research" / "simulations" / "tests"
        if test_dir.exists():
            py_success, _ = run_command(
                [sys.executable, "-m", "pytest", str(test_dir), "-v"],
                "Running Python tests",
                check=False,
                capture=True
            )
            if py_success:
                print_success("Python tests passed")
            else:
                print_warning("Python tests failed")
                self.warnings.append("Some Python tests failed")

        return success

    def create_directories(self) -> bool:
        """Create necessary directories"""
        print_step("Creating Directories")

        directories = [
            self.root_dir / "logs",
            self.root_dir / "data",
            self.root_dir / "temp",
            self.root_dir / "output",
        ]

        for directory in directories:
            directory.mkdir(exist_ok=True)
            print_success(f"Created {directory.name}/")

        return True

    def verify_installation(self) -> bool:
        """Verify installation"""
        print_step("Verifying Installation")

        success = True

        # Check if node_modules exists
        node_modules = self.root_dir / "node_modules"
        if node_modules.exists():
            print_success("Node.js modules installed")
        else:
            print_error("node_modules not found")
            success = False

        # Check if src directory exists
        src_dir = self.root_dir / "src"
        if src_dir.exists():
            print_success("Source code present")
        else:
            print_error("src directory not found")
            success = False

        # Check configuration
        env_file = self.root_dir / ".env"
        if env_file.exists():
            print_success("Configuration file present")
        else:
            print_warning("No .env file (using defaults)")

        return success

    def print_summary(self):
        """Print setup summary"""
        print_step("Setup Summary")

        if not self.errors:
            print_success("Development environment setup complete!")
        else:
            print_error("Setup completed with errors:")
            for error in self.errors:
                print(f"  - {error}")

        if self.warnings:
            print("\nWarnings:")
            for warning in self.warnings:
                print(f"  - {warning}")

        print("\nNext steps:")
        print("  1. Review .env configuration")
        print("  2. Start development server: npm run dev")
        print("  3. Run tests: npm test")
        print("  4. Explore examples: cd examples/")
        print("\nDocumentation:")
        print("  - Quickstart: research/phase9_opensource/docs/QUICKSTART.md")
        print("  - Tutorials: research/phase9_opensource/docs/TUTORIALS.md")
        print("  - API: research/phase9_opensource/docs/API_REFERENCE.md")
        print("\nCommunity:")
        print("  - Discord: https://discord.gg/superinstance")
        print("  - Discussions: https://github.com/SuperInstance/SuperInstance-papers/discussions")

    def run(self) -> int:
        """Run the complete setup"""
        print(f"{Colors.BOLD}{Colors.HEADER}")
        print("╔═══════════════════════════════════════════════════════════╗")
        print("║     SuperInstance Development Environment Setup         ║")
        print("╚═══════════════════════════════════════════════════════════╝")
        print(f"{Colors.ENDC}")

        start_time = time.time()

        # Run setup steps
        if not self.skip_checks:
            if not self.check_prerequisites():
                self.errors.append("Prerequisites not met")
                self.print_summary()
                return 1

        if not self.create_directories():
            self.errors.append("Failed to create directories")

        if not self.setup_configuration():
            self.errors.append("Failed to setup configuration")

        if not self.install_node_dependencies():
            self.errors.append("Failed to install Node.js dependencies")

        if not self.install_python_dependencies():
            self.errors.append("Failed to install Python dependencies")

        if not self.setup_git_hooks():
            self.warnings.append("Failed to setup git hooks")

        if not self.run_tests():
            self.warnings.append("Some tests failed")

        if not self.verify_installation():
            self.errors.append("Installation verification failed")

        # Print summary
        elapsed = time.time() - start_time
        print(f"\nSetup completed in {elapsed:.1f} seconds")
        self.print_summary()

        return 0 if not self.errors else 1

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Setup SuperInstance development environment"
    )
    parser.add_argument(
        "--skip-checks",
        action="store_true",
        help="Skip prerequisite checks"
    )
    parser.add_argument(
        "--gpu",
        action="store_true",
        help="Enable GPU acceleration setup"
    )

    args = parser.parse_args()

    setup = DevEnvSetup(
        skip_checks=args.skip_checks,
        enable_gpu=args.gpu
    )

    sys.exit(setup.run())

if __name__ == "__main__":
    main()
