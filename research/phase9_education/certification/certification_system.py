"""
SuperInstance Certification System

Provides comprehensive certification infrastructure for Associate,
Professional, and Expert levels of SuperInstance expertise.

Author: SuperInstance Education Team
Version: 1.0.0
License: MIT
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass, field
from enum import Enum
import json
import hashlib
import uuid


class CertificationLevel(Enum):
    """Certification levels."""
    ASSOCIATE = "associate"
    PROFESSIONAL = "professional"
    EXPERT = "expert"


class ExamStatus(Enum):
    """Exam submission status."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    PASSED = "passed"
    FAILED = "failed"
    EXPIRED = "expired"


class ProjectStatus(Enum):
    """Project submission status."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


@dataclass
class ExamQuestion:
    """Single exam question."""
    id: str
    type: str  # "multiple_choice", "short_answer", "coding", "design"
    question: str
    options: Optional[List[str]] = None  # For multiple choice
    correct_answer: Optional[Any] = None
    points: int = 1
    difficulty: str = "medium"  # "easy", "medium", "hard"
    topic: str = ""
    paper_reference: str = ""  # Which paper this relates to


@dataclass
class Exam:
    """Certification exam."""
    id: str
    level: CertificationLevel
    title: str
    description: str
    duration_minutes: int
    passing_score: float  # Percentage (0-100)
    questions: List[ExamQuestion] = field(default_factory=list)
    total_points: int = 0
    created_at: datetime = field(default_factory=datetime.now)

    def __post_init__(self):
        """Calculate total points."""
        self.total_points = sum(q.points for q in self.questions)


@dataclass
class ExamAttempt:
    """Single attempt at an exam."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    exam_id: str = ""
    user_id: str = ""
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    status: ExamStatus = ExamStatus.NOT_STARTED
    answers: Dict[str, Any] = field(default_factory=dict)
    score: float = 0.0
    feedback: str = ""

    def calculate_score(self, exam: Exam) -> float:
        """Calculate score based on answers."""
        correct = 0
        for question in exam.questions:
            user_answer = self.answers.get(question.id)
            if user_answer == question.correct_answer:
                correct += question.points

        self.score = (correct / exam.total_points) * 100 if exam.total_points > 0 else 0
        return self.score


@dataclass
class PracticalProject:
    """Practical project requirements."""
    id: str
    level: CertificationLevel
    title: str
    description: str
    requirements: List[str]
    deliverables: List[str]
    rubric: Dict[str, int]  # Criteria -> max points
    duration_weeks: int
    github_template: Optional[str] = None


@dataclass
class ProjectSubmission:
    """Project submission for review."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str = ""
    user_id: str = ""
    submitted_at: datetime = field(default_factory=datetime.now)
    status: ProjectStatus = ProjectStatus.IN_PROGRESS
    github_url: str = ""
    documentation_url: str = ""
    demo_url: str = ""
    scores: Dict[str, int] = field(default_factory=dict)
    total_score: int = 0
    feedback: str = ""
    reviewers: List[str] = field(default_factory=list)


@dataclass
class Certification:
    """Earned certification."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    level: CertificationLevel = CertificationLevel.ASSOCIATE
    issued_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    certificate_number: str = ""
    verification_code: str = ""
    badge_url: str = ""
    is_revoked: bool = False

    def __post_init__(self):
        """Generate certificate and verification codes."""
        if not self.certificate_number:
            self.certificate_number = self._generate_certificate_number()
        if not self.verification_code:
            self.verification_code = self._generate_verification_code()
        if not self.expires_at and self.level != CertificationLevel.EXPERT:
            # Associate and Professional certifications expire after 2 years
            self.expires_at = self.issued_at + timedelta(days=730)

    def _generate_certificate_number(self) -> str:
        """Generate unique certificate number."""
        timestamp = self.issued_at.strftime("%Y%m%d")
        unique = uuid.uuid4().hex[:8].upper()
        level_code = {
            CertificationLevel.ASSOCIATE: "ASOC",
            CertificationLevel.PROFESSIONAL: "PROF",
            CertificationLevel.EXPERT: "EXPT"
        }[self.level]
        return f"{level_code}-{timestamp}-{unique}"

    def _generate_verification_code(self) -> str:
        """Generate verification code for credential verification."""
        data = f"{self.user_id}:{self.level.value}:{self.issued_at.isoformat()}"
        return hashlib.sha256(data.encode()).hexdigest()[:16].upper()

    def is_valid(self) -> bool:
        """Check if certification is valid (not expired or revoked)."""
        if self.is_revoked:
            return False
        if self.expires_at and datetime.now() > self.expires_at:
            return False
        return True

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "certificate_number": self.certificate_number,
            "level": self.level.value,
            "issued_at": self.issued_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "verification_code": self.verification_code,
            "is_valid": self.is_valid()
        }


class CertificationEngine:
    """Main certification engine."""

    def __init__(self):
        self.exams: Dict[str, Exam] = {}
        self.projects: Dict[str, PracticalProject] = {}
        self.exam_attempts: Dict[str, ExamAttempt] = {}
        self.project_submissions: Dict[str, ProjectSubmission] = {}
        self.certifications: Dict[str, Certification] = {}

    def register_exam(self, exam: Exam) -> str:
        """Register a new exam."""
        self.exams[exam.id] = exam
        return exam.id

    def register_project(self, project: PracticalProject) -> str:
        """Register a new practical project."""
        self.projects[project.id] = project
        return project.id

    def start_exam(self, user_id: str, exam_id: str) -> ExamAttempt:
        """Start an exam attempt."""
        if exam_id not in self.exams:
            raise ValueError(f"Exam {exam_id} not found")

        attempt = ExamAttempt(
            exam_id=exam_id,
            user_id=user_id,
            status=ExamStatus.IN_PROGRESS
        )
        self.exam_attempts[attempt.id] = attempt
        return attempt

    def submit_exam(self, attempt_id: str, answers: Dict[str, Any]) -> ExamAttempt:
        """Submit exam answers for grading."""
        if attempt_id not in self.exam_attempts:
            raise ValueError(f"Attempt {attempt_id} not found")

        attempt = self.exam_attempts[attempt_id]
        attempt.answers = answers
        attempt.completed_at = datetime.now()

        exam = self.exams[attempt.exam_id]
        score = attempt.calculate_score(exam)

        if score >= exam.passing_score:
            attempt.status = ExamStatus.PASSED
        else:
            attempt.status = ExamStatus.FAILED

        self.exam_attempts[attempt_id] = attempt
        return attempt

    def submit_project(
        self,
        user_id: str,
        project_id: str,
        github_url: str,
        documentation_url: str = "",
        demo_url: str = ""
    ) -> ProjectSubmission:
        """Submit a practical project."""
        if project_id not in self.projects:
            raise ValueError(f"Project {project_id} not found")

        submission = ProjectSubmission(
            project_id=project_id,
            user_id=user_id,
            github_url=github_url,
            documentation_url=documentation_url,
            demo_url=demo_url,
            status=ProjectStatus.SUBMITTED
        )
        self.project_submissions[submission.id] = submission
        return submission

    def review_project(
        self,
        submission_id: str,
        reviewer_id: str,
        scores: Dict[str, int],
        feedback: str
    ) -> ProjectSubmission:
        """Review and grade a project submission."""
        if submission_id not in self.project_submissions:
            raise ValueError(f"Submission {submission_id} not found")

        submission = self.project_submissions[submission_id]
        submission.scores = scores
        submission.total_score = sum(scores.values())
        submission.feedback = feedback
        submission.reviewers.append(reviewer_id)

        project = self.projects[submission.project_id]
        max_score = sum(project.rubric.values())
        passing_score = max_score * 0.7  # 70% to pass

        if submission.total_score >= passing_score:
            submission.status = ProjectStatus.APPROVED
        else:
            submission.status = ProjectStatus.REJECTED

        self.project_submissions[submission_id] = submission
        return submission

    def issue_certification(
        self,
        user_id: str,
        level: CertificationLevel,
        exam_attempt_id: str,
        project_submission_id: str
    ) -> Certification:
        """Issue certification upon completing exam and project."""
        # Verify exam passed
        exam_attempt = self.exam_attempts.get(exam_attempt_id)
        if not exam_attempt or exam_attempt.status != ExamStatus.PASSED:
            raise ValueError("Must pass exam before certification")

        # Verify project approved
        project_submission = self.project_submissions.get(project_submission_id)
        if not project_submission or project_submission.status != ProjectStatus.APPROVED:
            raise ValueError("Must complete project before certification")

        # Issue certification
        certification = Certification(
            user_id=user_id,
            level=level
        )
        self.certifications[certification.id] = certification
        return certification

    def verify_certification(self, certificate_number: str, verification_code: str) -> Optional[Certification]:
        """Verify a certification using certificate number and verification code."""
        for cert in self.certifications.values():
            if cert.certificate_number == certificate_number and cert.verification_code == verification_code:
                if cert.is_valid():
                    return cert
        return None

    def get_user_certifications(self, user_id: str) -> List[Certification]:
        """Get all certifications for a user."""
        return [
            cert for cert in self.certifications.values()
            if cert.user_id == user_id and cert.is_valid()
        ]


class ExamGenerator:
    """Generate certification exams from paper content."""

    def __init__(self):
        self.question_templates = {
            "multiple_choice": [
                {
                    "template": "What is the primary benefit of {concept}?",
                    "correct": "Answer from paper",
                    "distractors": ["Common misconception", "Partial truth", "Unrelated concept"]
                },
                {
                    "template": "Which of the following best describes {concept}?",
                    "correct": "Accurate definition",
                    "distractors": ["Incomplete definition", "Incorrect definition", "Related concept"]
                }
            ],
            "short_answer": [
                {
                    "template": "Explain the key difference between {concept_a} and {concept_b}.",
                    "criteria": "Mentions {key_difference}"
                },
                {
                    "template": "Describe the role of {concept} in {context}.",
                    "criteria": "Explains {key_aspect}"
                }
            ],
            "coding": [
                {
                    "template": "Implement {function} that performs {task}.",
                    "criteria": "Correctly implements {requirements}"
                },
                {
                    "template": "Debug the following code related to {concept}.",
                    "criteria": "Identifies and fixes {bugs}"
                }
            ],
            "design": [
                {
                    "template": "Design a {system} that uses {concept}.",
                    "criteria": "Includes {key_components}, addresses {challenges}"
                },
                {
                    "template": "Evaluate the following architecture for {scenario}.",
                    "criteria": "Identifies {strengths} and {weaknesses}"
                }
            ]
        }

    def generate_associate_exam(self) -> Exam:
        """Generate Associate level exam (60 questions)."""
        questions = []

        # Paper 1-3: 15 questions each (45 total)
        questions.extend(self._generate_paper_questions("P1", 15, difficulty="easy"))
        questions.extend(self._generate_paper_questions("P2", 15, difficulty="easy"))
        questions.extend(self._generate_paper_questions("P3", 15, difficulty="easy"))

        # Capstone project: 15 questions
        questions.extend(self._generate_capstone_questions(15))

        return Exam(
            id="exam-associate-v1",
            level=CertificationLevel.ASSOCIATE,
            title="Associate SuperInstance Developer Exam",
            description="Comprehensive exam for Associate level certification",
            duration_minutes=90,
            passing_score=70.0,
            questions=questions
        )

    def generate_professional_exam(self) -> Exam:
        """Generate Professional level exam (90 questions)."""
        questions = []

        # Papers 1-21: 4 questions each (84 total)
        for i in range(1, 22):
            questions.extend(self._generate_paper_questions(f"P{i}", 4, difficulty="medium"))

        # System design: 6 questions
        questions.extend(self._generate_design_questions(6))

        return Exam(
            id="exam-professional-v1",
            level=CertificationLevel.PROFESSIONAL,
            title="Professional SuperInstance Engineer Exam",
            description="Comprehensive exam for Professional level certification",
            duration_minutes=150,
            passing_score=75.0,
            questions=questions
        )

    def generate_expert_exam(self) -> Exam:
        """Generate Expert level exam (120 questions)."""
        questions = []

        # Papers 1-40: 2 questions each (80 total)
        for i in range(1, 41):
            questions.extend(self._generate_paper_questions(f"P{i}", 2, difficulty="hard"))

        # Research design: 20 questions
        questions.extend(self._generate_research_questions(20))

        # Advanced topics: 20 questions
        questions.extend(self._generate_advanced_questions(20))

        return Exam(
            id="exam-expert-v1",
            level=CertificationLevel.EXPERT,
            title="Expert SuperInstance Researcher Exam",
            description="Comprehensive exam for Expert level certification",
            duration_minutes=180,
            passing_score=80.0,
            questions=questions
        )

    def _generate_paper_questions(
        self,
        paper_id: str,
        count: int,
        difficulty: str
    ) -> List[ExamQuestion]:
        """Generate questions for a specific paper."""
        # This would integrate with paper content
        # For now, return placeholder questions
        questions = []
        for i in range(count):
            questions.append(ExamQuestion(
                id=f"{paper_id}-Q{i+1}",
                type="multiple_choice",
                question=f"[{paper_id}] Question {i+1}",
                options=["A", "B", "C", "D"],
                correct_answer="A",
                points=1,
                difficulty=difficulty,
                topic=paper_id,
                paper_reference=paper_id
            ))
        return questions

    def _generate_capstone_questions(self, count: int) -> List[ExamQuestion]:
        """Generate capstone project questions."""
        questions = []
        for i in range(count):
            questions.append(ExamQuestion(
                id=f"capstone-Q{i+1}",
                type="short_answer",
                question=f"Capstone integration question {i+1}",
                points=2,
                difficulty="easy",
                topic="capstone"
            ))
        return questions

    def _generate_design_questions(self, count: int) -> List[ExamQuestion]:
        """Generate system design questions."""
        questions = []
        for i in range(count):
            questions.append(ExamQuestion(
                id=f"design-Q{i+1}",
                type="design",
                question=f"Design challenge {i+1}",
                points=5,
                difficulty="hard",
                topic="system_design"
            ))
        return questions

    def _generate_research_questions(self, count: int) -> List[ExamQuestion]:
        """Generate research methodology questions."""
        questions = []
        for i in range(count):
            questions.append(ExamQuestion(
                id=f"research-Q{i+1}",
                type="short_answer",
                question=f"Research methodology question {i+1}",
                points=3,
                difficulty="hard",
                topic="research_methods"
            ))
        return questions

    def _generate_advanced_questions(self, count: int) -> List[ExamQuestion]:
        """Generate advanced topic questions."""
        questions = []
        for i in range(count):
            questions.append(ExamQuestion(
                id=f"advanced-Q{i+1}",
                type="multiple_choice",
                question=f"Advanced topic question {i+1}",
                options=["A", "B", "C", "D"],
                correct_answer="A",
                points=2,
                difficulty="hard",
                topic="advanced"
            ))
        return questions


# Example usage and testing
if __name__ == "__main__":
    # Initialize certification engine
    engine = CertificationEngine()
    generator = ExamGenerator()

    # Generate exams
    associate_exam = generator.generate_associate_exam()
    professional_exam = generator.generate_professional_exam()
    expert_exam = generator.generate_expert_exam()

    # Register exams
    engine.register_exam(associate_exam)
    engine.register_exam(professional_exam)
    engine.register_exam(expert_exam)

    print(f"Generated {len(associate_exam.questions)} Associate exam questions")
    print(f"Generated {len(professional_exam.questions)} Professional exam questions")
    print(f"Generated {len(expert_exam.questions)} Expert exam questions")

    # Simulate exam attempt
    user_id = "student123"
    attempt = engine.start_exam(user_id, associate_exam.id)
    print(f"\nStarted exam attempt: {attempt.id}")

    # Submit answers (simulated)
    answers = {q.id: q.correct_answer for q in associate_exam.questions}
    completed = engine.submit_exam(attempt.id, answers)
    print(f"Exam completed with score: {completed.score:.1f}%")
    print(f"Status: {completed.status.value}")
