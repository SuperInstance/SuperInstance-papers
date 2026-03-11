import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';

interface AgeGroupContent {
  ageGroup: 'K-5' | '6-8' | '9-12' | 'University' | 'Professional' | 'Researcher';
  title: string;
  description: string;
  learningStyle: string;
  recommendedResources: string[];
  activities: string[];
  keyConcepts: string[];
  timeCommitment: string;
  prerequisites: string[];
}

interface AgeBasedInterfaceProps {
  title: string;
  description: string;
  topic: string;
  ageGroups: AgeGroupContent[];
}

export const AgeBasedInterface: React.FC<AgeBasedInterfaceProps> = ({
  title,
  description,
  topic,
  ageGroups,
}) => {
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroupContent>(ageGroups[0]);
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'activities' | 'concepts'>('overview');

  const getAgeGroupColor = (ageGroup: string) => {
    switch (ageGroup) {
      case 'K-5': return 'bg-blue-100 text-blue-800';
      case '6-8': return 'bg-green-100 text-green-800';
      case '9-12': return 'bg-purple-100 text-purple-800';
      case 'University': return 'bg-orange-100 text-orange-800';
      case 'Professional': return 'bg-indigo-100 text-indigo-800';
      case 'Researcher': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAgeGroupIcon = (ageGroup: string) => {
    switch (ageGroup) {
      case 'K-5': return '👶';
      case '6-8': return '🧒';
      case '9-12': return '👦';
      case 'University': return '🎓';
      case 'Professional': return '💼';
      case 'Researcher': return '🔬';
      default: return '👤';
    }
  };

  return (
    <Card hover padding="lg" className="mb-8">
      <CardHeader>
        <div className="text-center mb-8">
          <CardTitle className="text-3xl mb-4">{title}</CardTitle>
          <CardDescription className="text-xl max-w-3xl mx-auto">{description}</CardDescription>
        </div>

        <div className="mb-8">
          <h4 className="font-semibold text-gray-700 mb-4 text-center">Topic: {topic}</h4>

          {/* Age group selector */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {ageGroups.map((group) => (
              <button
                key={group.ageGroup}
                className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center ${
                  selectedAgeGroup.ageGroup === group.ageGroup
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedAgeGroup(group)}
              >
                <span className="text-2xl mb-2">{getAgeGroupIcon(group.ageGroup)}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getAgeGroupColor(group.ageGroup)}`}>
                  {group.ageGroup}
                </span>
              </button>
            ))}
          </div>

          {/* Selected age group info */}
          <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">{selectedAgeGroup.title}</h3>
                <p className="text-gray-700">{selectedAgeGroup.description}</p>
              </div>
              <div className="mt-4 md:mt-0">
                <div className="flex items-center text-gray-600">
                  <span className="mr-2">⏱️</span>
                  <span className="font-medium">{selectedAgeGroup.timeCommitment}</span>
                </div>
                <div className="flex items-center text-gray-600 mt-1">
                  <span className="mr-2">🎯</span>
                  <span>{selectedAgeGroup.learningStyle}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Tab navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'resources'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('resources')}
              >
                Recommended Resources
              </button>
              <button
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'activities'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('activities')}
              >
                Learning Activities
              </button>
              <button
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'concepts'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('concepts')}
              >
                Key Concepts
              </button>
            </nav>
          </div>
        </div>

        {/* Tab content */}
        <div className="min-h-[400px]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Learning Approach</h4>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                  This content is tailored for {selectedAgeGroup.ageGroup} learners using a {
                    selectedAgeGroup.learningStyle.toLowerCase()
                  } approach. The material is designed to be engaging and appropriate for this age group's cognitive development level.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Prerequisites</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedAgeGroup.prerequisites.length > 0 ? (
                    selectedAgeGroup.prerequisites.map((prereq, index) => (
                      <span key={index} className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                        {prereq}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-600 italic">No specific prerequisites required for this age group.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Time Commitment</h4>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">⏱️</span>
                    <div>
                      <p className="font-medium text-blue-800">{selectedAgeGroup.timeCommitment}</p>
                      <p className="text-blue-700 text-sm">
                        Recommended study schedule for optimal learning retention
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-4">Recommended Learning Resources</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedAgeGroup.recommendedResources.map((resource, index) => (
                    <Card key={index} hover padding="md" className="bg-gray-50">
                      <CardContent>
                        <div className="flex items-start">
                          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center mr-4 flex-shrink-0">
                            <span className="text-primary-600 font-bold">
                              {resource.includes('Video') ? '🎥' :
                               resource.includes('Book') ? '📚' :
                               resource.includes('Game') ? '🎮' :
                               resource.includes('Activity') ? '🔧' : '📝'}
                            </span>
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-1">{resource}</h5>
                            <p className="text-gray-600 text-sm">
                              {resource.includes('Video') ? 'Visual learning resource' :
                               resource.includes('Book') ? 'Reading material' :
                               resource.includes('Game') ? 'Interactive learning game' :
                               resource.includes('Activity') ? 'Hands-on activity' : 'Learning material'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h5 className="font-semibold text-green-800 mb-2">💡 Resource Selection Tips</h5>
                <ul className="text-green-700 space-y-1 text-sm">
                  <li>• Start with the first resource and progress sequentially</li>
                  <li>• Mix different types of resources for better engagement</li>
                  <li>• Take breaks between different learning activities</li>
                  <li>• Discuss what you learn with peers or mentors</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-4">Learning Activities</h4>
                <div className="space-y-4">
                  {selectedAgeGroup.activities.map((activity, index) => (
                    <div key={index} className="flex items-start p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-12 h-12 rounded-lg bg-accent-100 flex items-center justify-center mr-4 flex-shrink-0">
                        <span className="text-accent-600 font-bold text-xl">{index + 1}</span>
                      </div>
                      <div className="flex-grow">
                        <h5 className="font-semibold text-gray-900 mb-2">{activity}</h5>
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-4">⏱️ 15-30 minutes</span>
                          <span>🎯 Hands-on learning</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Start Activity
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h5 className="font-semibold text-yellow-800 mb-2">📝 Activity Instructions</h5>
                <ul className="text-yellow-700 space-y-1 text-sm">
                  <li>• Complete activities in order for progressive learning</li>
                  <li>• Take notes during each activity</li>
                  <li>• Review what you learned after each activity</li>
                  <li>• Don't rush - focus on understanding, not speed</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'concepts' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-4">Key Concepts to Master</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedAgeGroup.keyConcepts.map((concept, index) => (
                    <Card key={index} hover padding="md">
                      <CardContent>
                        <div className="flex items-center mb-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-bold">{index + 1}</span>
                          </div>
                          <h5 className="font-semibold text-gray-900">{concept}</h5>
                        </div>
                        <p className="text-gray-600 text-sm">
                          {concept.includes('Basic') ? 'Foundation concept for beginners' :
                           concept.includes('Advanced') ? 'Complex concept for deeper understanding' :
                           concept.includes('Application') ? 'Practical use of the concept' :
                           'Core concept essential for mastery'}
                        </p>
                        <div className="mt-4">
                          <Button variant="outline" size="sm" className="w-full">
                            Learn This Concept
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h5 className="font-semibold text-purple-800 mb-2">🎯 Learning Goals</h5>
                <p className="text-purple-700 text-sm">
                  By mastering these {selectedAgeGroup.keyConcepts.length} key concepts, {selectedAgeGroup.ageGroup} learners will
                  develop a solid understanding of {topic.toLowerCase()} that can be applied to real-world situations
                  and serve as a foundation for more advanced learning.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="mb-4 sm:mb-0">
              <h4 className="font-semibold text-gray-900">Ready to learn?</h4>
              <p className="text-gray-600 text-sm">
                Selected for {selectedAgeGroup.ageGroup} learners • {selectedAgeGroup.timeCommitment}
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline">Save Learning Plan</Button>
              <Button variant="primary">Start Learning Now</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};