import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';

interface TutorialCardProps {
  title: string;
  description: string;
  category: 'Getting Started' | 'Core Concepts' | 'Advanced Topics' | 'Projects' | 'Case Studies';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  format: 'Interactive' | 'Video' | 'Article' | 'Workshop' | 'Exercise';
  topics: string[];
  completionBadge?: boolean;
  interactiveDemo?: boolean;
  estimatedTime: string;
  onStart?: () => void;
  onPreview?: () => void;
}

export const TutorialCard: React.FC<TutorialCardProps> = ({
  title,
  description,
  category,
  difficulty,
  duration,
  format,
  topics,
  completionBadge = false,
  interactiveDemo = false,
  estimatedTime,
  onStart,
  onPreview,
}) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Getting Started': return 'bg-blue-100 text-blue-800';
      case 'Core Concepts': return 'bg-green-100 text-green-800';
      case 'Advanced Topics': return 'bg-purple-100 text-purple-800';
      case 'Projects': return 'bg-orange-100 text-orange-800';
      case 'Case Studies': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'Interactive': return '🖱️';
      case 'Video': return '🎥';
      case 'Article': return '📄';
      case 'Workshop': return '👨‍🏫';
      case 'Exercise': return '💪';
      default: return '📚';
    }
  };

  return (
    <Card hover padding="lg" className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start mb-3">
          <div>
            <CardTitle className="text-xl mb-2">{title}</CardTitle>
            <CardDescription className="line-clamp-2">{description}</CardDescription>
          </div>
          {completionBadge && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✅ Completed
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(category)}`}>
            {category}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(difficulty)}`}>
            {difficulty}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {getFormatIcon(format)} {format}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            ⏱️ {duration}
          </span>
        </div>

        {interactiveDemo && (
          <div className="mb-3">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              🎮 Interactive Demo Included
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-grow">
        <div className="mb-4">
          <h4 className="font-semibold text-gray-700 mb-2">Topics Covered:</h4>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic, index) => (
              <span key={index} className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <span className="mr-1">📊</span>
              <span>Estimated time: {estimatedTime}</span>
            </div>
            <div className="flex items-center">
              <span className="mr-1">👥</span>
              <span>Self-paced learning</span>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="mt-auto pt-6 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row w-full gap-3">
          {onPreview && (
            <Button variant="outline" className="flex-grow" onClick={onPreview}>
              Preview Tutorial
            </Button>
          )}
          <Button variant="primary" className="flex-grow" onClick={onStart}>
            Start Tutorial
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};