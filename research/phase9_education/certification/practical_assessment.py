"""
Practical Assessment System for SuperInstance Certification

Automated assessment of coding challenges, projects, and practical exams.

Author: SuperInstance Education Team
Version: 1.0.0
"""

from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import subprocess
import tempfile
import os
import json
from pathlib import Path


class AssessmentType(Enum):
    """Types of practical assessments."""
    CODING_CHALLENGE = "coding_challenge"
    PROJECT_REVIEW = "project_review"
    SYSTEM_DESIGN = "system_design"
    DEBUG_CHALLENGE = "debug_challenge"
    PERFORMANCE_TEST = "performance_test"


class TestResult(Enum):
    """Test execution result."""
    PASSED = "passed"
    FAILED = "failed"
    ERROR = "error"
    TIMEOUT = "timeout"


@dataclass
class TestCase:
    """Single test case for coding challenges."""
    name: str
    input_data: Any
    expected_output: Any
    description: str = ""
    timeout_seconds: int = 5
    points: int = 1
    hidden: bool = False  # Hidden tests not shown to students


@dataclass
class AssessmentCriteria:
    """Criteria for grading practical assessments."""
    name: str
    description: str
    max_points: int
    weight: float = 1.0  # Weight in final score


@dataclass
class CodeQualityMetrics:
    """Code quality metrics."""
    complexity_score: float  # 0-100, lower is better
    style_score: float  # 0-100
    documentation_score: float  # 0-100
    test_coverage: float  # 0-100
    security_issues: List[str] = field(default_factory=list)
    performance_issues: List[str] = field(default_factory=list)


@dataclass
class AssessmentResult:
    """Result of practical assessment."""
    passed: bool
    score: float
    max_score: float
    percentage: float
    test_results: List[Dict[str, Any]] = field(default_factory=list)
    quality_metrics: Optional[CodeQualityMetrics] = None
    feedback: str = ""
    suggestions: List[str] = field(default_factory=list)
    time_taken_seconds: float = 0.0


class CodeExecutor:
    """Execute and test student code."""

    def __init__(self, timeout_seconds: int = 10):
        self.timeout_seconds = timeout_seconds

    def execute_function(
        self,
        code: str,
        function_name: str,
        test_cases: List[TestCase]
    ) -> List[Dict[str, Any]]:
        """
        Execute student code against test cases.

        Args:
            code: Student's Python code
            function_name: Name of function to test
            test_cases: List of test cases

        Returns:
            List of test results
        """
        results = []

        for test_case in test_cases:
            result = self._run_test_case(code, function_name, test_case)
            results.append(result)

        return results

    def _run_test_case(
        self,
        code: str,
        function_name: str,
        test_case: TestCase
    ) -> Dict[str, Any]:
        """Run a single test case."""
        try:
            # Create temporary file with student code
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(code)
                f.write(f"\n\n# Test runner\n")
                f.write(f"import json\n")
                f.write(f"result = {function_name}(**{json.dumps(test_case.input_data)})\n")
                f.write(f"print(json.dumps({{'result': result}}))\n")
                temp_file = f.name

            # Execute with timeout
            try:
                result = subprocess.run(
                    ['python', temp_file],
                    capture_output=True,
                    text=True,
                    timeout=test_case.timeout_seconds,
                    check=False
                )

                if result.returncode != 0:
                    return {
                        "name": test_case.name,
                        "status": TestResult.ERROR,
                        "error": result.stderr,
                        "points": 0
                    }

                # Parse output
                output = json.loads(result.stdout.strip())
                actual_output = output.get('result')

                # Compare with expected
                if self._compare_outputs(actual_output, test_case.expected_output):
                    return {
                        "name": test_case.name,
                        "status": TestResult.PASSED,
                        "actual": actual_output,
                        "expected": test_case.expected_output,
                        "points": test_case.points
                    }
                else:
                    return {
                        "name": test_case.name,
                        "status": TestResult.FAILED,
                        "actual": actual_output,
                        "expected": test_case.expected_output,
                        "points": 0
                    }

            except subprocess.TimeoutExpired:
                return {
                    "name": test_case.name,
                    "status": TestResult.TIMEOUT,
                    "error": f"Test exceeded timeout of {test_case.timeout_seconds}s",
                    "points": 0
                }

        except Exception as e:
            return {
                "name": test_case.name,
                "status": TestResult.ERROR,
                "error": str(e),
                "points": 0
            }
        finally:
            # Clean up temp file
            try:
                os.unlink(temp_file)
            except:
                pass

    def _compare_outputs(self, actual: Any, expected: Any) -> bool:
        """Compare actual and expected outputs."""
        if isinstance(actual, float) and isinstance(expected, float):
            # Float comparison with tolerance
            return abs(actual - expected) < 1e-6
        return actual == expected


class CodeQualityAnalyzer:
    """Analyze code quality metrics."""

    def analyze(self, code: str) -> CodeQualityMetrics:
        """
        Analyze code quality.

        Args:
            code: Python code to analyze

        Returns:
            CodeQualityMetrics with scores and issues
        """
        complexity = self._analyze_complexity(code)
        style = self._analyze_style(code)
        documentation = self._analyze_documentation(code)
        coverage = self._estimate_test_coverage(code)
        security = self._check_security_issues(code)
        performance = self._check_performance_issues(code)

        return CodeQualityMetrics(
            complexity_score=complexity,
            style_score=style,
            documentation_score=documentation,
            test_coverage=coverage,
            security_issues=security,
            performance_issues=performance
        )

    def _analyze_complexity(self, code: str) -> float:
        """Analyze cyclomatic complexity."""
        # Simplified complexity analysis
        lines = code.split('\n')
        complexity_keywords = ['if ', 'elif ', 'for ', 'while ', 'except ', 'and ', 'or ']
        complexity = 1  # Base complexity

        for line in lines:
            line = line.strip()
            for keyword in complexity_keywords:
                if line.startswith(keyword):
                    complexity += 1

        # Map to 0-100 scale (lower complexity = higher score)
        max_complexity = max(complexity, 1)
        score = max(0, 100 - (max_complexity - 1) * 5)
        return min(100, score)

    def _analyze_style(self, code: str) -> float:
        """Analyze code style (PEP 8 compliance)."""
        # Simplified style checks
        issues = 0
        lines = code.split('\n')

        for i, line in enumerate(lines, 1):
            # Check line length
            if len(line) > 79:
                issues += 1

            # Check indentation (should be multiples of 4)
            if line.startswith(' ') and not line.startswith('    '):
                if not line.startswith('  '):  # Allow 2-space for some cases
                    issues += 1

        # Check for proper spacing
        if '=' in code and ' == ' not in code:
            # Has assignment but check for proper spacing
            pass

        # Map to 0-100 scale
        score = max(0, 100 - issues * 5)
        return min(100, score)

    def _analyze_documentation(self, code: str) -> float:
        """Analyze documentation quality."""
        has_docstring = '"""' in code or "'''" in code
        has_comments = '#' in code

        # Count docstrings and comments
        docstring_count = code.count('"""') + code.count("'''")
        comment_lines = sum(1 for line in code.split('\n') if line.strip().startswith('#'))

        # Functions/classes should have docstrings
        function_count = code.count('def ')
        class_count = code.count('class ')

        # Calculate score
        score = 50  # Base score
        if has_docstring:
            score += 20
        if comment_lines > 0:
            score += min(20, comment_lines * 2)

        # Bonus for docstring coverage
        if function_count > 0 or class_count > 0:
            docstring_coverage = docstring_count / (2 * (function_count + class_count))
            score += docstring_coverage * 10

        return min(100, score)

    def _estimate_test_coverage(self, code: str) -> float:
        """Estimate test coverage."""
        # This is a rough estimate
        # In production, would use actual coverage tools
        function_count = code.count('def ')
        test_functions = sum(1 for line in code.split('\n') if 'test_' in line)

        if function_count == 0:
            return 0.0

        coverage = min(100, (test_functions / function_count) * 100)
        return coverage

    def _check_security_issues(self, code: str) -> List[str]:
        """Check for common security issues."""
        issues = []

        dangerous_functions = [
            'eval',
            'exec',
            '__import__',
            'pickle.loads',
            'subprocess.call',
            'os.system'
        ]

        for func in dangerous_functions:
            if func in code:
                issues.append(f"Use of dangerous function: {func}")

        # Check for hardcoded secrets
        if 'password' in code.lower() or 'api_key' in code.lower():
            if '=' in code:  # Might be hardcoded
                issues.append("Possible hardcoded credential detected")

        # Check for SQL injection risk
        if 'execute' in code and '%' in code or '.format(' in code:
            issues.append("Possible SQL injection vulnerability")

        return issues

    def _check_performance_issues(self, code: str) -> List[str]:
        """Check for performance issues."""
        issues = []

        # Check for inefficient patterns
        if 'for i in range(len(' in code:
            issues.append("Consider using enumerate() instead of range(len())")

        if code.count('.append(') > 0 and 'for' in code:
            # Check if using list comprehension would be better
            pass  # Simplified check

        # Check for nested loops
        lines = code.split('\n')
        for i, line in enumerate(lines):
            if 'for ' in line and i > 0:
                # Check previous lines for loops
                for j in range(max(0, i - 3), i):
                    if 'for ' in lines[j]:
                        issues.append(f"Nested loops detected (lines {j+1}, {i+1})")
                        break

        return issues


class PracticalAssessment:
    """Main practical assessment system."""

    def __init__(self):
        self.executor = CodeExecutor()
        self.analyzer = CodeQualityAnalyzer()

    def assess_coding_challenge(
        self,
        code: str,
        function_name: str,
        test_cases: List[TestCase],
        criteria: Optional[List[AssessmentCriteria]] = None
    ) -> AssessmentResult:
        """
        Assess a coding challenge submission.

        Args:
            code: Student's code
            function_name: Function to test
            test_cases: Test cases to run
            criteria: Additional grading criteria

        Returns:
            AssessmentResult with scores and feedback
        """
        import time
        start_time = time.time()

        # Run tests
        test_results = self.executor.execute_function(code, function_name, test_cases)

        # Calculate test score
        test_score = sum(r.get('points', 0) for r in test_results)
        max_test_score = sum(tc.points for tc in test_cases)

        # Analyze code quality
        quality_metrics = self.analyzer.analyze(code)

        # Calculate final score
        if criteria:
            # Apply custom criteria
            criteria_scores = {}
            for criterion in criteria:
                if criterion.name == "tests":
                    criteria_scores[criterion.name] = (
                        test_score / max_test_score * criterion.max_points
                    )
                elif criterion.name == "complexity":
                    criteria_scores[criterion.name] = (
                        quality_metrics.complexity_score / 100 * criterion.max_points
                    )
                elif criterion.name == "documentation":
                    criteria_scores[criterion.name] = (
                        quality_metrics.documentation_score / 100 * criterion.max_points
                    )

            # Weighted sum
            total_score = sum(
                criteria_scores[c.name] * c.weight
                for c in criteria
            )
            max_score = sum(c.max_points * c.weight for c in criteria)
        else:
            # Default scoring: 70% tests, 30% quality
            test_weight = 0.7
            quality_weight = 0.3
            quality_score = (
                quality_metrics.complexity_score * 0.3 +
                quality_metrics.style_score * 0.3 +
                quality_metrics.documentation_score * 0.4
            )

            total_score = (
                (test_score / max_test_score * 100 * test_weight) +
                (quality_score * quality_weight)
            )
            max_score = 100

        percentage = (total_score / max_score) * 100
        passed = percentage >= 70.0

        time_taken = time.time() - start_time

        # Generate feedback
        feedback = self._generate_feedback(
            test_results,
            quality_metrics,
            percentage
        )

        return AssessmentResult(
            passed=passed,
            score=total_score,
            max_score=max_score,
            percentage=percentage,
            test_results=test_results,
            quality_metrics=quality_metrics,
            feedback=feedback,
            time_taken_seconds=time_taken
        )

    def assess_project(
        self,
        github_url: str,
        criteria: List[AssessmentCriteria],
        documentation_url: str = "",
        demo_url: str = ""
    ) -> AssessmentResult:
        """
        Assess a project submission.

        Args:
            github_url: URL to GitHub repository
            criteria: Grading criteria
            documentation_url: URL to documentation
            demo_url: URL to demo

        Returns:
            AssessmentResult
        """
        # In production, this would:
        # 1. Clone the repository
        # 2. Run the project
        # 3. Analyze codebase
        # 4. Test functionality
        # 5. Review documentation

        # Placeholder implementation
        return AssessmentResult(
            passed=True,
            score=85.0,
            max_score=100.0,
            percentage=85.0,
            test_results=[],
            quality_metrics=None,
            feedback="Project assessment complete",
            suggestions=[]
        )

    def _generate_feedback(
        self,
        test_results: List[Dict[str, Any]],
        quality_metrics: CodeQualityMetrics,
        percentage: float
    ) -> str:
        """Generate feedback for the student."""
        feedback_parts = []

        # Overall performance
        if percentage >= 90:
            feedback_parts.append("Excellent work!")
        elif percentage >= 70:
            feedback_parts.append("Good job meeting the requirements.")
        else:
            feedback_parts.append("Keep working on it!")

        # Test feedback
        passed_tests = sum(1 for r in test_results if r.get('status') == TestResult.PASSED)
        total_tests = len(test_results)
        feedback_parts.append(f"\nTests: {passed_tests}/{total_tests} passed")

        if passed_tests < total_tests:
            failed_tests = [r for r in test_results if r.get('status') != TestResult.PASSED]
            feedback_parts.append("\nFailed tests:")
            for test in failed_tests:
                feedback_parts.append(f"  - {test['name']}: {test.get('status', 'unknown')}")

        # Quality feedback
        feedback_parts.append(f"\nCode quality:")
        feedback_parts.append(f"  - Complexity: {quality_metrics.complexity_score:.1f}/100")
        feedback_parts.append(f"  - Style: {quality_metrics.style_score:.1f}/100")
        feedback_parts.append(f"  - Documentation: {quality_metrics.documentation_score:.1f}/100")

        # Issues
        if quality_metrics.security_issues:
            feedback_parts.append(f"\nSecurity issues:")
            for issue in quality_metrics.security_issues:
                feedback_parts.append(f"  - {issue}")

        if quality_metrics.performance_issues:
            feedback_parts.append(f"\nPerformance suggestions:")
            for issue in quality_metrics.performance_issues:
                feedback_parts.append(f"  - {issue}")

        return "\n".join(feedback_parts)


# Predefined challenges for each level
class ChallengeLibrary:
    """Library of predefined coding challenges."""

    ASSOCIATE_CHALLENGES = {
        "origin_tracker": {
            "name": "Origin Tracker",
            "description": "Implement an origin tracking decorator",
            "function_name": "track_origin",
            "starter_code": '''
def track_origin(func):
    """Decorator that adds origin tracking to function results."""
    # Your code here
    pass
''',
            "test_cases": [
                TestCase(
                    "basic_tracking",
                    {"func": lambda x: x * 2},
                    5,
                    10,
                    "Test basic origin tracking",
                    points=2
                )
            ]
        },
        "confidence_update": {
            "name": "Confidence Update",
            "description": "Implement confidence update rule",
            "function_name": "update_confidence",
            "starter_code": '''
def update_confidence(my_confidence, their_confidence, agreement):
    """Update confidence based on interaction."""
    # Your code here
    pass
''',
            "test_cases": [
                TestCase(
                    "agreement_boost",
                    {"my_confidence": 0.5, "their_confidence": 0.9, "agreement": True},
                    0.59,  # 0.5 + 0.1 * 0.9
                    "Test confidence boost on agreement",
                    points=2
                ),
                TestCase(
                    "disagreement_penalty",
                    {"my_confidence": 0.7, "their_confidence": 0.8, "agreement": False},
                    0.54,  # 0.7 - 0.2 * 0.8
                    "Test confidence penalty on disagreement",
                    points=2
                )
            ]
        }
    }

    PROFESSIONAL_CHALLENGES = {
        "distributed_consensus": {
            "name": "Distributed Consensus",
            "description": "Implement Raft consensus algorithm",
            "function_name": "raft_consensus",
            "starter_code": '''
def raft_consensus(nodes, proposal):
    """Implement Raft-style consensus."""
    # Your code here
    pass
''',
            "test_cases": []
        }
    }

    EXPERT_CHALLENGES = {
        "research_implementation": {
            "name": "Research Implementation",
            "description": "Implement algorithm from research paper",
            "function_name": "",
            "starter_code": '',
            "test_cases": []
        }
    }


# Example usage
if __name__ == "__main__":
    assessor = PracticalAssessment()

    # Test code
    student_code = '''
def update_confidence(my_confidence, their_confidence, agreement):
    """Update confidence based on interaction."""
    if agreement:
        return min(1.0, my_confidence + 0.1 * their_confidence)
    else:
        return max(0.0, my_confidence - 0.2 * their_confidence)
'''

    # Test cases
    test_cases = [
        TestCase("test1", {"my_confidence": 0.5, "their_confidence": 0.9, "agreement": True},
                 0.59, "Agreement test", points=2),
        TestCase("test2", {"my_confidence": 0.7, "their_confidence": 0.8, "agreement": False},
                 0.54, "Disagreement test", points=2)
    ]

    # Assess
    result = assessor.assess_coding_challenge(
        student_code,
        "update_confidence",
        test_cases
    )

    print(f"Passed: {result.passed}")
    print(f"Score: {result.score:.1f}/{result.max_score}")
    print(f"\nFeedback:\n{result.feedback}")
