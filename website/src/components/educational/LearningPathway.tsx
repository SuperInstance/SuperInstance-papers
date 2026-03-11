import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';

interface PathwayStep {
  title: string;
  description: string;
  duration: string;
  icon: React.ReactNode;
  resources: string[];
}

interface LearningPathwayProps {
  title: string;
  description: string;
  audience: 'K-12' | 'University' | 'Professional' | 'Researcher';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  steps: PathwayStep[];
  estimatedTime: string;
  prerequisites?: string[];
}

export const LearningPathway: React.FC<LearningPathwayProps> = ({
  title,
  description,
  audience,
  difficulty,
  steps,
  estimatedTime,
  prerequisites = [],
}) => {
  const getAudienceColor = (audience: string) => {
    switch (audience) {
      case 'K-12': return 'bg-blue-100 text-blue-800';
      case 'University': return 'bg-green-100 text-green-800';
      case 'Professional': return 'bg-purple-100 text-purple-800';
      case 'Researcher': return 'bg-orange-100 text-orange-800';
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

  return (
    <Card hover padding="lg" className="mb-8">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
          <div>
            <CardTitle className="text-2xl mb-2">{title}</CardTitle>
            <CardDescription className="text-lg">{description}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getAudienceColor(audience)}`}>
              {audience}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(difficulty)}`}>
              {difficulty}
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              ⏱️ {estimatedTime}
            </span>
          </div>
        </div>

        {prerequisites.length > 0 && (
          <div className="mb-6">
            <h4 className="font-semibold text-gray-700 mb-2">Prerequisites:</h4>
            <div className="flex flex-wrap gap-2">
              {prerequisites.map((prereq, index) => (
                <span key={index} className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                  {prereq}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start space-x-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-600 font-bold text-lg">{index + 1}</span>
                </div>
              </div>
              <div className="flex-grow">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                  <h4 className="text-xl font-semibold text-gray-900">{step.title}</h4>
                  <span className="text-gray-500 text-sm mt-1 md:mt-0">⏱️ {step.duration}</span>
                </div>
                <p className="text-gray-600 mb-3">{step.description}</p>
                {step.resources.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">Resources:</h5>
                    <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                      {step.resources.map((resource, resIndex) => (
                        <li key={resIndex}>{resource}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                {step.icon}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="mb-4 sm:mb-0">
              <h4 className="font-semibold text-gray-900">Ready to start learning?</h4>
              <p className="text-gray-600 text-sm">Begin with Step 1 and progress at your own pace</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline">Save for Later</Button>
              <Button variant="primary">Start Learning Path</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};