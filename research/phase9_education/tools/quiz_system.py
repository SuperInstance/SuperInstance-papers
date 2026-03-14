"""
Interactive Quiz System for SuperInstance Education

Provides interactive quizzes with instant feedback, progress tracking,
and adaptive difficulty.

Author: SuperInstance Education Team
Version: 1.0.0
"""

from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import json
import random
from datetime import datetime


class QuestionType(Enum):
    """Types of quiz questions."""
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"
    FILL_BLANK = "fill_blank"
    CODING = "coding"
    MATCHING = "matching"
    ORDERING = "ordering"


class Difficulty(Enum):
    """Difficulty levels."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


@dataclass
class QuizQuestion:
    """Single quiz question."""
    id: str
    type: QuestionType
    question: str
    options: Optional[List[str]] = None  # For multiple choice
    correct_answer: Any = None
    explanation: str = ""
    difficulty: Difficulty = Difficulty.INTERMEDIATE
    topic: str = ""
    paper_reference: str = ""
    points: int = 1
    hints: List[str] = field(default_factory=list)
    time_limit_seconds: Optional[int] = None


@dataclass
class QuizAttempt:
    """Student's attempt at a quiz question."""
    question_id: str
    answer: Any
    is_correct: bool
    time_taken_seconds: float
    hints_used: int = 0
    attempts: int = 1


@dataclass
class QuizResult:
    """Results of a quiz session."""
    total_questions: int
    correct_answers: int
    total_points: int
    max_points: int
    percentage: float
    attempts: List[QuizAttempt] = field(default_factory=list)
    time_taken_seconds: float = 0.0
    completed_at: datetime = field(default_factory=datetime.now)

    @property
    def passed(self) -> bool:
        """Check if quiz was passed (70% threshold)."""
        return self.percentage >= 70.0


class QuizGenerator:
    """Generate quiz questions from paper content."""

    def __init__(self):
        self.question_templates = {
            QuestionType.MULTIPLE_CHOICE: [
                {
                    "template": "What is the primary purpose of {concept}?",
                    "correct": "{correct_answer}",
                    "distractors": ["{distractor1}", "{distractor2}", "{distractor3}"]
                },
                {
                    "template": "Which of the following best describes {concept}?",
                    "correct": "{correct_description}",
                    "distractors": ["{partial_description}", "{incorrect_description}", "{unrelated_concept}"]
                }
            ],
            QuestionType.TRUE_FALSE: [
                {
                    "template": "True or False: {concept} implies {statement}.",
                    "correct": "{true_or_false}",
                    "explanation": "{explanation}"
                }
            ],
            QuestionType.SHORT_ANSWER: [
                {
                    "template": "Explain the relationship between {concept_a} and {concept_b}.",
                    "keywords": ["{keyword1}", "{keyword2}", "{keyword3}"],
                    "explanation": "{explanation}"
                }
            ],
            QuestionType.FILL_BLANK: [
                {
                    "template": "In SuperInstance systems, {blank} is responsible for {purpose}.",
                    "answer": "{answer}",
                    "hints": ["{hint1}", "{hint2}"]
                }
            ]
        }

    def generate_paper_quiz(
        self,
        paper_id: str,
        question_count: int = 10,
        difficulty: Difficulty = Difficulty.INTERMEDIATE
    ) -> List[QuizQuestion]:
        """
        Generate quiz questions for a specific paper.

        Args:
            paper_id: Paper identifier (e.g., "P1")
            question_count: Number of questions to generate
            difficulty: Target difficulty level

        Returns:
            List of QuizQuestion objects
        """
        # This would integrate with paper content
        # For now, return template questions

        questions = []

        # Sample questions for Paper 1
        if paper_id == "P1":
            questions = [
                QuizQuestion(
                    id="P1-Q1",
                    type=QuestionType.MULTIPLE_CHOICE,
                    question="What is the main advantage of origin-centric data systems?",
                    options=[
                        "They track data provenance automatically",
                        "They are faster than traditional systems",
                        "They use less memory",
                        "They are easier to program"
                    ],
                    correct_answer=0,
                    explanation="Origin-centric systems track where data came from, enabling better debugging and accountability.",
                    difficulty=difficulty,
                    topic="origin-centricity",
                    paper_reference="P1",
                    points=1
                ),
                QuizQuestion(
                    id="P1-Q2",
                    type=QuestionType.TRUE_FALSE,
                    question="True or False: Origin tracking adds significant computational overhead.",
                    correct_answer=False,
                    explanation="Origin tracking is designed to be lightweight, adding minimal overhead.",
                    difficulty=difficulty,
                    topic="performance",
                    paper_reference="P1",
                    points=1
                ),
                QuizQuestion(
                    id="P1-Q3",
                    type=QuestionType.SHORT_ANSWER,
                    question="Describe a scenario where origin tracking would be valuable.",
                    correct_answer="Any scenario describing debugging, accountability, or provenance needs",
                    explanation="Origin tracking is valuable whenever you need to understand where data came from or how it was transformed.",
                    difficulty=difficulty,
                    topic="applications",
                    paper_reference="P1",
                    points=2
                )
            ]

        # Add more questions up to requested count
        while len(questions) < question_count:
            questions.append(QuizQuestion(
                id=f"{paper_id}-Q{len(questions)+1}",
                type=QuestionType.MULTIPLE_CHOICE,
                question=f"Sample question {len(questions)+1} for {paper_id}",
                options=["A", "B", "C", "D"],
                correct_answer=0,
                difficulty=difficulty,
                topic="general",
                paper_reference=paper_id
            ))

        return questions[:question_count]

    def generate_topic_quiz(
        self,
        topic: str,
        question_count: int = 5,
        difficulty: Difficulty = Difficulty.INTERMEDIATE
    ) -> List[QuizQuestion]:
        """Generate quiz questions for a specific topic."""
        # Similar to paper quiz but topic-focused
        return self.generate_paper_quiz(topic, question_count, difficulty)


class AdaptiveQuizEngine:
    """Adaptive quiz engine that adjusts difficulty based on performance."""

    def __init__(self):
        self.generator = QuizGenerator()
        self.performance_history: Dict[str, List[float]] = {}  # topic -> scores

    def get_difficulty_for_topic(self, topic: str) -> Difficulty:
        """
        Determine appropriate difficulty for a topic based on past performance.

        Returns:
            Difficulty level
        """
        if topic not in self.performance_history or len(self.performance_history[topic]) == 0:
            return Difficulty.INTERMEDIATE

        avg_score = sum(self.performance_history[topic]) / len(self.performance_history[topic])

        if avg_score >= 90:
            return Difficulty.EXPERT
        elif avg_score >= 75:
            return Difficulty.ADVANCED
        elif avg_score >= 60:
            return Difficulty.INTERMEDIATE
        else:
            return Difficulty.BEGINNER

    def adjust_difficulty(
        self,
        current_difficulty: Difficulty,
        recent_scores: List[float]
    ) -> Difficulty:
        """
        Adjust difficulty based on recent quiz performance.

        Args:
            current_difficulty: Current difficulty level
            recent_scores: Recent quiz scores (0-100)

        Returns:
            New difficulty level
        """
        if not recent_scores:
            return current_difficulty

        avg_score = sum(recent_scores) / len(recent_scores)

        difficulties = [
            Difficulty.BEGINNER,
            Difficulty.INTERMEDIATE,
            Difficulty.ADVANCED,
            Difficulty.EXPERT
        ]

        current_index = difficulties.index(current_difficulty)

        if avg_score >= 85 and current_index < len(difficulties) - 1:
            # Increase difficulty
            return difficulties[current_index + 1]
        elif avg_score < 60 and current_index > 0:
            # Decrease difficulty
            return difficulties[current_index - 1]

        return current_difficulty


class QuizSession:
    """Interactive quiz session with a student."""

    def __init__(self, questions: List[QuizQuestion]):
        self.questions = questions
        self.current_question_index = 0
        self.attempts: List[QuizAttempt] = []
        self.start_time: Optional[datetime] = None
        self.hints_used: int = 0

    def start(self):
        """Start the quiz session."""
        self.start_time = datetime.now()

    def get_current_question(self) -> Optional[QuizQuestion]:
        """Get the current question."""
        if self.current_question_index < len(self.questions):
            return self.questions[self.current_question_index]
        return None

    def submit_answer(self, answer: Any) -> Tuple[bool, str]:
        """
        Submit answer for current question.

        Returns:
            (is_correct, feedback)
        """
        question = self.get_current_question()
        if not question:
            return False, "No current question"

        is_correct = self.check_answer(question, answer)

        # Record attempt
        time_taken = (datetime.now() - self.start_time).total_seconds() if self.start_time else 0

        attempt = QuizAttempt(
            question_id=question.id,
            answer=answer,
            is_correct=is_correct,
            time_taken_seconds=time_taken,
            hints_used=self.hints_used
        )

        self.attempts.append(attempt)

        # Generate feedback
        feedback = self.generate_feedback(question, is_correct)

        # Move to next question
        self.current_question_index += 1
        self.hints_used = 0  # Reset hints for next question

        return is_correct, feedback

    def check_answer(self, question: QuizQuestion, answer: Any) -> bool:
        """Check if answer is correct."""
        if question.type == QuestionType.MULTIPLE_CHOICE:
            return answer == question.correct_answer
        elif question.type == QuestionType.TRUE_FALSE:
            return answer == question.correct_answer
        elif question.type == QuestionType.SHORT_ANSWER:
            # Keyword matching for short answer
            if isinstance(question.correct_answer, str):
                return answer.lower().strip() == question.correct_answer.lower().strip()
            return False
        elif question.type == QuestionType.FILL_BLANK:
            return str(answer).lower().strip() == str(question.correct_answer).lower().strip()

        return False

    def generate_feedback(self, question: QuizQuestion, is_correct: bool) -> str:
        """Generate feedback for the answer."""
        if is_correct:
            feedback = f"✓ Correct! Well done."
            if question.explanation:
                feedback += f"\n\n{question.explanation}"
        else:
            feedback = f"✗ Incorrect."
            if question.type == QuestionType.MULTIPLE_CHOICE:
                correct_option = question.options[question.correct_answer]
                feedback += f" The correct answer is: {correct_option}"
            if question.explanation:
                feedback += f"\n\n{question.explanation}"

        return feedback

    def get_hint(self) -> Optional[str]:
        """Get hint for current question."""
        question = self.get_current_question()
        if question and self.hints_used < len(question.hints):
            hint = question.hints[self.hints_used]
            self.hints_used += 1
            return hint
        return None

    def get_result(self) -> QuizResult:
        """Get quiz results."""
        correct = sum(1 for a in self.attempts if a.is_correct)
        total_points = sum(
            q.points for i, q in enumerate(self.questions)
            if i < len(self.attempts) and self.attempts[i].is_correct
        )
        max_points = sum(q.points for q in self.questions)

        total_time = sum(a.time_taken_seconds for a in self.attempts)

        return QuizResult(
            total_questions=len(self.questions),
            correct_answers=correct,
            total_points=total_points,
            max_points=max_points,
            percentage=(correct / len(self.questions)) * 100 if self.questions else 0,
            attempts=self.attempts,
            time_taken_seconds=total_time
        )

    def is_complete(self) -> bool:
        """Check if quiz is complete."""
        return self.current_question_index >= len(self.questions)


class QuizManager:
    """Manage quiz creation and administration."""

    def __init__(self):
        self.generator = QuizGenerator()
        self.adaptive_engine = AdaptiveQuizEngine()
        self.active_sessions: Dict[str, QuizSession] = {}

    def create_module_quiz(
        self,
        paper_id: str,
        question_count: int = 10,
        adaptive: bool = True
    ) -> List[QuizQuestion]:
        """Create quiz for a paper module."""
        if adaptive:
            # Get appropriate difficulty
            difficulty = self.adaptive_engine.get_difficulty_for_topic(paper_id)
            return self.generator.generate_paper_quiz(paper_id, question_count, difficulty)
        else:
            return self.generator.generate_paper_quiz(paper_id, question_count)

    def create_comprehensive_quiz(
        self,
        paper_ids: List[str],
        questions_per_paper: int = 3
    ) -> List[QuizQuestion]:
        """Create comprehensive quiz covering multiple papers."""
        all_questions = []
        for paper_id in paper_ids:
            questions = self.generator.generate_paper_quiz(paper_id, questions_per_paper)
            all_questions.extend(questions)

        # Shuffle questions
        random.shuffle(all_questions)
        return all_questions

    def start_session(
        self,
        session_id: str,
        questions: List[QuizQuestion]
    ) -> QuizSession:
        """Start a new quiz session."""
        session = QuizSession(questions)
        session.start()
        self.active_sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[QuizSession]:
        """Get active quiz session."""
        return self.active_sessions.get(session_id)

    def end_session(self, session_id: str) -> Optional[QuizResult]:
        """End quiz session and return results."""
        session = self.active_sessions.get(session_id)
        if session:
            result = session.get_result()
            # Update performance history for adaptive difficulty
            self._update_performance_history(session.questions, result)
            del self.active_sessions[session_id]
            return result
        return None

    def _update_performance_history(
        self,
        questions: List[QuizQuestion],
        result: QuizResult
    ):
        """Update performance history for adaptive difficulty."""
        # Group by topic
        topic_scores: Dict[str, List[float]] = {}

        for i, question in enumerate(questions):
            if i < len(result.attempts):
                topic = question.topic or "general"
                if topic not in topic_scores:
                    topic_scores[topic] = []
                topic_scores[topic].append(
                    100 if result.attempts[i].is_correct else 0
                )

        # Update adaptive engine
        for topic, scores in topic_scores.items():
            if topic not in self.adaptive_engine.performance_history:
                self.adaptive_engine.performance_history[topic] = []
            self.adaptive_engine.performance_history[topic].extend(scores)


# Example CLI interface
class QuizCLI:
    """Command-line interface for taking quizzes."""

    def __init__(self):
        self.manager = QuizManager()
        self.current_session: Optional[QuizSession] = None

    def take_quiz(self, paper_id: str, question_count: int = 5):
        """Take a quiz interactively."""
        # Create quiz
        questions = self.manager.create_module_quiz(paper_id, question_count)

        # Start session
        session_id = f"quiz_{datetime.now().timestamp()}"
        self.current_session = self.manager.start_session(session_id, questions)

        print(f"\n{'='*60}")
        print(f"Quiz: {paper_id}")
        print(f"Questions: {len(questions)}")
        print(f"{'='*60}\n")

        # Take quiz
        while not self.current_session.is_complete():
            question = self.current_session.get_current_question()

            print(f"\nQuestion {self.current_session.current_question_index + 1}/{len(questions)}")
            print(f"{question.question}")

            if question.type == QuestionType.MULTIPLE_CHOICE:
                for i, option in enumerate(question.options):
                    print(f"  {i+1}. {option}")

                while True:
                    try:
                        answer = int(input("\nYour answer (1-4): ")) - 1
                        if 0 <= answer < len(question.options):
                            break
                        print("Invalid choice, try again")
                    except ValueError:
                        print("Please enter a number")

            elif question.type == QuestionType.TRUE_FALSE:
                while True:
                    answer = input("\nYour answer (true/false): ").lower().strip()
                    if answer in ["true", "false"]:
                        answer = (answer == "true")
                        break
                    print("Please enter 'true' or 'false'")

            else:
                answer = input("\nYour answer: ")

            # Submit answer
            is_correct, feedback = self.current_session.submit_answer(answer)

            print(f"\n{feedback}")

        # Show results
        result = self.current_session.get_result()

        print(f"\n{'='*60}")
        print(f"Quiz Complete!")
        print(f"{'='*60}")
        print(f"Score: {result.correct_answers}/{result.total_questions} ({result.percentage:.1f}%)")
        print(f"Points: {result.total_points}/{result.max_points}")
        print(f"Time: {result.time_taken_seconds:.1f} seconds")

        if result.passed:
            print("\n🎉 Congratulations! You passed the quiz!")
        else:
            print("\nKeep studying and try again!")

        return result


# Example usage
if __name__ == "__main__":
    import sys

    # Create CLI interface
    cli = QuizCLI()

    # Take quiz
    if len(sys.argv) > 1:
        paper_id = sys.argv[1]
    else:
        paper_id = "P1"

    result = cli.take_quiz(paper_id, question_count=5)
