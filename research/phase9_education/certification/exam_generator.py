"""
Exam Generator for SuperInstance Certification

Automatically generates certification exams from paper content and
learning objectives.

Author: SuperInstance Education Team
Version: 1.0.0
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import random
import json
from pathlib import Path


@dataclass
class PaperContent:
    """Content extracted from a paper."""
    paper_id: str
    title: str
    key_concepts: List[str]
    definitions: Dict[str, str]
    theorems: List[Dict[str, str]]
    algorithms: List[Dict[str, str]]
    examples: List[Dict[str, Any]]
    formulas: List[str]


class ContentExtractor:
    """Extract key content from papers for question generation."""

    def __init__(self, papers_dir: str):
        self.papers_dir = Path(papers_dir)

    def extract_paper_content(self, paper_id: str) -> PaperContent:
        """
        Extract structured content from a paper.

        This would parse the actual paper markdown/PDF files.
        For now, returns structured placeholder.
        """
        # In production, this would:
        # 1. Parse markdown/PDF
        # 2. Extract definitions using NLP
        # 3. Identify theorems and proofs
        # 4. Extract algorithm pseudocode
        # 5. Find examples and case studies

        return PaperContent(
            paper_id=paper_id,
            title=f"Paper {paper_id}",
            key_concepts=[],
            definitions={},
            theorems=[],
            algorithms=[],
            examples=[],
            formulas=[]
        )


class QuestionTemplate:
    """Template for generating questions from content."""

    def __init__(self, template_type: str, template: str, **fields):
        self.template_type = template_type
        self.template = template
        self.fields = fields

    def generate(self, **kwargs) -> Dict[str, Any]:
        """Generate a question from this template."""
        question = {
            "type": self.template_type,
            "question": self.template.format(**kwargs),
            **{k: v.format(**kwargs) if isinstance(v, str) else v
               for k, v in self.fields.items()}
        }
        return question


class QuestionBank:
    """Bank of question templates for different types."""

    def __init__(self):
        self.templates = {
            "definition": [
                QuestionTemplate(
                    "multiple_choice",
                    "What is the definition of {concept}?",
                    correct="{definition}",
                    distractors=[
                        "{distractor1}",
                        "{distractor2}",
                        "{distractor3}"
                    ]
                ),
                QuestionTemplate(
                    "short_answer",
                    "Define {concept} in the context of SuperInstance systems.",
                    criteria="Must mention {key_aspect}"
                )
            ],
            "concept": [
                QuestionTemplate(
                    "multiple_choice",
                    "Which of the following best describes {concept}?",
                    correct="{correct_description}",
                    distractors=[
                        "{partial_description}",
                        "{incorrect_description}",
                        "{unrelated_description}"
                    ]
                ),
                QuestionTemplate(
                    "true_false",
                    "True or False: {concept} implies {implication}.",
                    correct="{true_or_false}",
                    explanation="{explanation}"
                )
            ],
            "application": [
                QuestionTemplate(
                    "coding",
                    "Implement a function that {task} using {concept}.",
                    starter_code="# Your code here\n",
                    criteria="{success_criteria}"
                ),
                QuestionTemplate(
                    "design",
                    "Design a system that uses {concept} to solve {problem}.",
                    criteria="Must address: {requirements}"
                )
            ],
            "analysis": [
                QuestionTemplate(
                    "short_answer",
                    "Analyze the following scenario: {scenario}. How does {concept} apply?",
                    criteria="Should explain: {key_points}"
                ),
                QuestionTemplate(
                    "multiple_choice",
                    "In the given scenario involving {concept}, what is the most likely outcome?",
                    correct="{correct_outcome}",
                    distractors=[
                        "{incorrect_outcome_1}",
                        "{incorrect_outcome_2}",
                        "{incorrect_outcome_3}"
                    ]
                )
            ],
            "comparison": [
                QuestionTemplate(
                    "short_answer",
                    "Compare and contrast {concept_a} and {concept_b}. What are the key differences?",
                    criteria="Must mention: {key_differences}"
                ),
                QuestionTemplate(
                    "multiple_choice",
                    "What is the main difference between {concept_a} and {concept_b}?",
                    correct="{main_difference}",
                    distractors=[
                        "{minor_difference}",
                        "{similarity}",
                        "{unrelated_point}"
                    ]
                )
            ],
            "calculation": [
                QuestionTemplate(
                    "short_answer",
                    "Given {parameters}, calculate the {value} using {formula}.",
                    answer="{numerical_answer}",
                    tolerance=0.01
                ),
                QuestionTemplate(
                    "multiple_choice",
                    "Using {concept} with parameters {parameters}, what is the result?",
                    correct="{correct_result}",
                    distractors=[
                        "{incorrect_result_1}",
                        "{incorrect_result_2}",
                        "{incorrect_result_3}"
                    ]
                )
            ],
            "debugging": [
                QuestionTemplate(
                    "coding",
                    "The following code is intended to {task} but has bugs. Find and fix them:\n{code}",
                    criteria="Must fix: {bug_list}"
                )
            ],
            "theorem": [
                QuestionTemplate(
                    "short_answer",
                    "State {theorem_name} and explain its significance for SuperInstance systems.",
                    criteria="Must include: {theorem_components}"
                ),
                QuestionTemplate(
                    "multiple_choice",
                    "Which of the following is a consequence of {theorem_name}?",
                    correct="{correct_consequence}",
                    distractors=[
                        "{incorrect_consequence_1}",
                        "{incorrect_consequence_2}",
                        "{unrelated_statement}"
                    ]
                )
            ]
        }


class ExamQuestionGenerator:
    """Generate exam questions from paper content."""

    def __init__(self, papers_dir: str):
        self.extractor = ContentExtractor(papers_dir)
        self.question_bank = QuestionBank()

    def generate_questions_for_paper(
        self,
        paper_id: str,
        count: int,
        difficulty: str = "medium",
        question_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate questions for a specific paper.

        Args:
            paper_id: Paper identifier (e.g., "P1")
            count: Number of questions to generate
            difficulty: "easy", "medium", or "hard"
            question_types: List of question types to include

        Returns:
            List of question dictionaries
        """
        # Extract paper content
        content = self.extractor.extract_paper_content(paper_id)

        # Default question types
        if question_types is None:
            question_types = ["definition", "concept", "application"]

        # Generate questions
        questions = []

        # Distribution by type
        questions_per_type = max(1, count // len(question_types))

        for qtype in question_types:
            type_questions = self._generate_by_type(
                content, qtype, questions_per_type, difficulty
            )
            questions.extend(type_questions)

        # Fill remaining if needed
        while len(questions) < count:
            qtype = random.choice(question_types)
            additional = self._generate_by_type(
                content, qtype, 1, difficulty
            )
            questions.extend(additional)

        return questions[:count]

    def _generate_by_type(
        self,
        content: PaperContent,
        qtype: str,
        count: int,
        difficulty: str
    ) -> List[Dict[str, Any]]:
        """Generate questions of a specific type."""
        questions = []

        if qtype == "definition" and content.definitions:
            questions.extend(self._generate_definition_questions(
                content, count, difficulty
            ))
        elif qtype == "concept" and content.key_concepts:
            questions.extend(self._generate_concept_questions(
                content, count, difficulty
            ))
        elif qtype == "application":
            questions.extend(self._generate_application_questions(
                content, count, difficulty
            ))
        elif qtype == "analysis":
            questions.extend(self._generate_analysis_questions(
                content, count, difficulty
            ))
        elif qtype == "comparison" and len(content.key_concepts) >= 2:
            questions.extend(self._generate_comparison_questions(
                content, count, difficulty
            ))
        elif qtype == "calculation" and content.formulas:
            questions.extend(self._generate_calculation_questions(
                content, count, difficulty
            ))
        elif qtype == "theorem" and content.theorems:
            questions.extend(self._generate_theorem_questions(
                content, count, difficulty
            ))

        return questions

    def _generate_definition_questions(
        self,
        content: PaperContent,
        count: int,
        difficulty: str
    ) -> List[Dict[str, Any]]:
        """Generate definition questions."""
        questions = []
        definitions = list(content.definitions.items())

        for i in range(min(count, len(definitions))):
            concept, definition = definitions[i]

            # Generate distractors
            distractors = self._generate_distractors(
                concept, definition, content, 3
            )

            questions.append({
                "id": f"{content.paper_id}-def-{i}",
                "type": "multiple_choice",
                "question": f"What is the definition of {concept}?",
                "options": [definition] + distractors,
                "correct_answer": 0,  # First option is correct
                "points": self._points_for_difficulty(difficulty),
                "difficulty": difficulty,
                "topic": concept,
                "paper_reference": content.paper_id
            })

        return questions

    def _generate_concept_questions(
        self,
        content: PaperContent,
        count: int,
        difficulty: str
    ) -> List[Dict[str, Any]]:
        """Generate concept understanding questions."""
        questions = []
        concepts = content.key_concepts[:count]

        for i, concept in enumerate(concepts):
            questions.append({
                "id": f"{content.paper_id}-concept-{i}",
                "type": "short_answer",
                "question": f"Explain the role of {concept} in SuperInstance systems.",
                "criteria": f"Must explain key aspects of {concept}",
                "points": self._points_for_difficulty(difficulty),
                "difficulty": difficulty,
                "topic": concept,
                "paper_reference": content.paper_id
            })

        return questions

    def _generate_application_questions(
        self,
        content: PaperContent,
        count: int,
        difficulty: str
    ) -> List[Dict[str, Any]]:
        """Generate application/coding questions."""
        questions = []

        # Generate coding challenges based on algorithms
        for i in range(min(count, len(content.algorithms))):
            algorithm = content.algorithms[i]

            questions.append({
                "id": f"{content.paper_id}-app-{i}",
                "type": "coding",
                "question": f"Implement {algorithm['name']} as described in the paper.",
                "starter_code": f"# Implement {algorithm['name']}\n",
                "criteria": algorithm['requirements'],
                "points": self._points_for_difficulty(difficulty) * 2,
                "difficulty": difficulty,
                "topic": algorithm['name'],
                "paper_reference": content.paper_id
            })

        # Fill with design questions if needed
        while len(questions) < count:
            questions.append({
                "id": f"{content.paper_id}-design-{len(questions)}",
                "type": "design",
                "question": f"Design a system that uses concepts from {content.title}.",
                "criteria": "Must demonstrate understanding of key concepts",
                "points": self._points_for_difficulty(difficulty) * 2,
                "difficulty": difficulty,
                "topic": "system_design",
                "paper_reference": content.paper_id
            })

        return questions

    def _generate_analysis_questions(
        self,
        content: PaperContent,
        count: int,
        difficulty: str
    ) -> List[Dict[str, Any]]:
        """Generate analysis questions."""
        questions = []

        for i in range(min(count, len(content.examples))):
            example = content.examples[i]

            questions.append({
                "id": f"{content.paper_id}-analysis-{i}",
                "type": "short_answer",
                "question": f"Analyze the following example from the paper: {example['description']}. "
                           f"How does this demonstrate {example['concept']}?",
                "criteria": f"Must explain: {example['key_points']}",
                "points": self._points_for_difficulty(difficulty),
                "difficulty": difficulty,
                "topic": example['concept'],
                "paper_reference": content.paper_id
            })

        return questions

    def _generate_comparison_questions(
        self,
        content: PaperContent,
        count: int,
        difficulty: str
    ) -> List[Dict[str, Any]]:
        """Generate comparison questions."""
        questions = []
        concepts = content.key_concepts

        for i in range(min(count, len(concepts) - 1)):
            concept_a = concepts[i]
            concept_b = concepts[i + 1]

            questions.append({
                "id": f"{content.paper_id}-compare-{i}",
                "type": "short_answer",
                "question": f"Compare {concept_a} and {concept_b}. "
                           f"What are the key differences and when would you use each?",
                "criteria": f"Must explain differences between {concept_a} and {concept_b}",
                "points": self._points_for_difficulty(difficulty),
                "difficulty": difficulty,
                "topic": f"{concept_a}_vs_{concept_b}",
                "paper_reference": content.paper_id
            })

        return questions

    def _generate_calculation_questions(
        self,
        content: PaperContent,
        count: int,
        difficulty: str
    ) -> List[Dict[str, Any]]:
        """Generate calculation questions."""
        questions = []

        for i in range(min(count, len(content.formulas))):
            formula = content.formulas[i]

            questions.append({
                "id": f"{content.paper_id}-calc-{i}",
                "type": "short_answer",
                "question": f"Using {formula}, calculate the result for the given parameters.",
                "parameters": {},
                "answer": "",
                "tolerance": 0.01,
                "points": self._points_for_difficulty(difficulty),
                "difficulty": difficulty,
                "topic": formula,
                "paper_reference": content.paper_id
            })

        return questions

    def _generate_theorem_questions(
        self,
        content: PaperContent,
        count: int,
        difficulty: str
    ) -> List[Dict[str, Any]]:
        """Generate theorem questions."""
        questions = []

        for i in range(min(count, len(content.theorems))):
            theorem = content.theorems[i]

            questions.append({
                "id": f"{content.paper_id}-theorem-{i}",
                "type": "short_answer",
                "question": f"State {theorem['name']} and explain its significance.",
                "criteria": theorem['key_components'],
                "points": self._points_for_difficulty(difficulty),
                "difficulty": difficulty,
                "topic": theorem['name'],
                "paper_reference": content.paper_id
            })

        return questions

    def _generate_distractors(
        self,
        concept: str,
        correct_definition: str,
        content: PaperContent,
        count: int
    ) -> List[str]:
        """Generate plausible distractor answers."""
        # In production, this would use NLP to generate related but incorrect definitions
        # For now, return placeholders
        return [
            f"Incorrect definition of {concept} (distractor 1)",
            f"Partial definition of {concept} (distractor 2)",
            f"Unrelated concept (distractor 3)"
        ][:count]

    def _points_for_difficulty(self, difficulty: str) -> int:
        """Return point value for difficulty level."""
        return {
            "easy": 1,
            "medium": 2,
            "hard": 3
        }.get(difficulty, 2)


# Example usage
if __name__ == "__main__":
    generator = ExamQuestionGenerator("papers/")

    # Generate questions for Paper 1
    questions = generator.generate_questions_for_paper(
        "P1",
        count=10,
        difficulty="medium",
        question_types=["definition", "concept", "application"]
    )

    print(f"Generated {len(questions)} questions for Paper 1")
    for q in questions[:3]:
        print(f"\n{q['id']}: {q['question']}")
        print(f"Type: {q['type']}, Points: {q['points']}")
