import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';

interface Lesson {
  id: string;
  title: string;
  content: string;
  interactive?: () => React.ReactNode;
  exercises?: Exercise[];
}

interface Exercise {
  id: string;
  question: string;
  answer: string;
  hint?: string;
  type: 'multiple-choice' | 'fill-blank' | 'code';
  options?: string[];
}

const SuperInstanceTutorial: React.FC = () => {
  const [currentLesson, setCurrentLesson] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [showExercise, setShowExercise] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const lessons: Lesson[] = [
    {
      id: 'what-is-superinstance',
      title: 'What is SuperInstance?',
      content: `SuperInstance is a revolutionary approach to spreadsheet AI where every cell can be any instance type. Unlike traditional spreadsheets that are limited to numbers and text, SuperInstance cells can contain formulas, AI models, confidence scores, and even other spreadsheets.` ,
      exercises: [
        {
          id: 'q1',
          question: 'What makes SuperInstance different from traditional spreadsheets?',
          answer: 'Every cell can be any instance type',
          type: 'fill-blank',
          hint: 'Think about the fundamental limitation of Excel cells'
        }
      ]
    },
    {
      id: 'confidence-scores',
      title: 'Understanding Confidence Scores',
      content: `Every SuperInstance operation includes a confidence score from 0.0 to 1.0. This tells you how certain the AI is about its calculation. Confidence scores help you make informed decisions about trusting automated results.` ,
      exercises: [
        {
          id: 'q2',
          question: 'A confidence score of 0.95 means the AI is:',
          answer: '95% confident in the result',
          type: 'multiple-choice',
          options: ['50% confident', '95% confident', '100% confident', 'Unsure'],
          hint: 'The score is a percentage value'
        }
      ]
    },
    {
      id: 'cell-types',
      title: 'Types of SuperInstance Cells',
      content: `SuperInstance supports multiple cell types with visual color coding. Text cells are blue, numbers are gray, formulas are green, and SuperInstance cells themselves are purple.` ,
      exercises: [
        {
          id: 'q3',
          question: 'What color represents a SuperInstance cell?',
          answer: 'Purple',
          type: 'multiple-choice',
          options: ['Blue', 'Red', 'Green', 'Purple'],
          hint: 'The most magical cell type gets the most magical color'
        }
      ]
    },
    {
      id: 'ai-formulas',
      title: 'AI-Powered Formulas',
      content: `SuperInstance formulas can call AI functions. For example, =AI(A1,A2,\"Generate a poem\") would take data from cells A1 and A2 and generate a poem based on them. This opens up creative possibilities beyond simple arithmetic.` ,
      exercises: [
        {
          id: 'q4',
          question: '=AI(B1,B2,"Predict trend") is an example of what?',
          answer: 'AI-powered formula',
          type: 'fill-blank',
          hint: 'What kind of formula uses AI functions?'
        }
      ]
    }
  ];

  // Get current lesson
  const lesson = lessons[currentLesson];

  // Handle lesson completion
  const handleCompleteLesson = () => {
    setCompletedLessons(new Set([...completedLessons, currentLesson]));

    if (lesson.exercises?.length > 0) {
      setShowExercise(true);
    } else {
      if (currentLesson < lessons.length - 1) {
        setCurrentLesson(currentLesson + 1);
      }
    }
  };

  // Handle exercise submission
  const handleExerciseSubmit = () => {
    const exercise = lesson.exercises?.[0]; // Get first exercise
    if (!exercise) return;

    const correct = exercise.answer.toLowerCase() === userAnswer.toLowerCase();
    setIsCorrect(correct);

    if (correct) {
      setTimeout(() => {
        setShowExercise(false);
        setUserAnswer('');
        setIsCorrect(null);
        setShowHint(false);
      }, 2000);
    }
  };

  // Reset for next lesson
  const nextLesson = () => {
    if (currentLesson < lessons.length - 1) {
      setCurrentLesson(currentLesson + 1);
      setShowExercise(false);
      setUserAnswer('');
      setIsCorrect(null);
      setShowHint(false);
    }
  };

  // Progress tracking
  const progress = ((currentLesson + 1) / lessons.length) * 100;
  const exercise = lesson.exercises?.[0];

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <div>
            <CardTitle>SuperInstance Tutorial</CardTitle>
            <CardDescription>Master the fundamentals of AI-powered spreadsheets</CardDescription>
          </div>
          <div className="text-sm text-gray-600">
            Lesson {currentLesson + 1} of {lessons.length}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </CardHeader>

      <CardContent>
        {!showExercise ? (
          <!-- Lesson Content -->
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-3">{lesson.title}</h2>
              <p className="text-gray-700 leading-relaxed">{lesson.content}</p
            </div>

            <div className="flex justify-end space-x-3">
              {currentLesson > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentLesson(currentLesson - 1)}
                >
                  Previous
                </Button>
              )}
              <Button
                variant="primary"
                onClick={handleCompleteLesson}
                disabled={currentLesson > 0 && !completedLessons.has(currentLesson)}
              >
                {lesson.exercises?.length > 0 ? 'Start Exercise' : 'Next Lesson'}
              </Button>
            </div>

            {/* Navigation */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">"Learning Progress:"</h3>
              <div className="space-y-2">
                {lessons.map((l, index) => (
                  <div
                    key={l.id}
                    className={`
                      p-2 rounded cursor-pointer transition-colors
                      ${index === currentLesson ? 'bg-blue-100 border border-blue-300' : ''}
                      ${completedLessons.has(index) ? 'line-through text-gray-500' : ''}
                    `}
                    onClick={() => {
                      if (index <= currentLesson || completedLessons.has(index - 1)) {
                        setCurrentLesson(index);
                      }
                    }}
                  >
                    <span className="text-sm">{index + 1}. {l.title}</span>
                    {completedLessons.has(index) && <span className="ml-2 text-green-600">✓</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <!-- Exercise -->
          <div className="space-y-6">
            <div className="bg-yellow-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Quick Check: {lesson.title}</h3>
              <p className="mb-4">{exercise?.question}</p>

              {exercise?.type === 'multiple-choice' ? (
                <div className="space-y-2">
                  {exercise.options?.map((option) => (
                    <Button
                      key={option}
                      variant={userAnswer === option ? 'primary' : 'outline'}
                      className="w-full text-left"
                      onClick={() => setUserAnswer(option)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Your answer here..."

                />
              )}

              {showHint && exercise?.hint && (
                <div className="mt-3 p-3 bg-blue-100 rounded text-sm">
                  Hint: {exercise.hint}
                </div>
              )}

              {isCorrect === true && (
                <div className="mt-3 p-3 bg-green-100 rounded text-green-800">
                  ✓ Correct! Well done.
                </div>
              )}

              {isCorrect === false && (
                <div className="mt-3 p-3 bg-red-100 rounded text-red-800">
                  ✗ Not quite right. Try again!
                </div>
              )}

              <div className="flex justify-between mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowHint(true)}
                  disabled={showHint}
                >
                  Show Hint
                </Button>
                <Button
                  variant="primary"
                  onClick={handleExerciseSubmit}
                  disabled={!userAnswer}
                >
                  Submit Answer
                </Button>
              </div>

              {isCorrect && (
                <div className="flex justify-end mt-4">
                  <Button variant="accent" onClick={nextLesson}>
                    {currentLesson >= lessons.length - 1 ? 'Complete' : 'Next Lesson'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mt-6 text-center text-sm text-gray-600">
          Completed: {completedLessons.size} / {lessons.length} lessons
        </div>
      </CardContent>
    </Card>
  );
};

export default SuperInstanceTutorial;