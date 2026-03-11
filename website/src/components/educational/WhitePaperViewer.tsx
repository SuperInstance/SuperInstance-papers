import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';

interface WhitePaperSection {
  id: string;
  title: string;
  shortSummary: string;
  fullContent: string;
  annotatedContent: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  keyConcepts: string[];
  readingTime: string;
}

interface WhitePaperViewerProps {
  title: string;
  author: string;
  date: string;
  abstract: string;
  sections: WhitePaperSection[];
  category: 'Mathematics' | 'Computer Science' | 'Physics' | 'Engineering' | 'Education';
  tags: string[];
}

export const WhitePaperViewer: React.FC<WhitePaperViewerProps> = ({
  title,
  author,
  date,
  abstract,
  sections,
  category,
  tags,
}) => {
  const [viewMode, setViewMode] = useState<'short' | 'full' | 'annotated'>('short');
  const [currentSection, setCurrentSection] = useState(0);
  const [showAllSections, setShowAllSections] = useState(false);

  const currentSectionData = sections[currentSection];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Mathematics': return 'bg-blue-100 text-blue-800';
      case 'Computer Science': return 'bg-green-100 text-green-800';
      case 'Physics': return 'bg-purple-100 text-purple-800';
      case 'Engineering': return 'bg-orange-100 text-orange-800';
      case 'Education': return 'bg-indigo-100 text-indigo-800';
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

  const getContentForMode = () => {
    switch (viewMode) {
      case 'short':
        return currentSectionData.shortSummary;
      case 'full':
        return currentSectionData.fullContent;
      case 'annotated':
        return currentSectionData.annotatedContent;
      default:
        return currentSectionData.shortSummary;
    }
  };

  const getViewModeDescription = () => {
    switch (viewMode) {
      case 'short':
        return 'Quick overview for beginners and general understanding';
      case 'full':
        return 'Complete technical details for intermediate learners';
      case 'annotated':
        return 'Expert commentary with insights and applications';
      default:
        return '';
    }
  };

  return (
    <Card hover padding="lg" className="mb-8">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <CardTitle className="text-3xl mb-3">{title}</CardTitle>
            <div className="flex items-center space-x-4 text-gray-600 mb-4">
              <span>👨‍💻 {author}</span>
              <span>📅 {date}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(category)}`}>
              {category}
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              📄 White Paper
            </span>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="font-semibold text-gray-700 mb-2">Abstract</h4>
          <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{abstract}</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {tags.map((tag, index) => (
            <span key={index} className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
              #{tag}
            </span>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {/* View mode selector */}
        <div className="mb-8">
          <h4 className="font-semibold text-gray-700 mb-4">Select Reading Level:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card
              hover
              padding="md"
              className={`cursor-pointer transition-all ${
                viewMode === 'short' ? 'ring-2 ring-primary-500 bg-primary-50' : ''
              }`}
              onClick={() => setViewMode('short')}
            >
              <CardHeader>
                <CardTitle className="text-lg">Short Summary</CardTitle>
                <CardDescription>For beginners & quick overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="mr-2">⏱️</span>
                  <span>5-10 min read</span>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li>✓ Key concepts only</li>
                  <li>✓ No technical jargon</li>
                  <li>✓ Practical applications</li>
                </ul>
              </CardContent>
            </Card>

            <Card
              hover
              padding="md"
              className={`cursor-pointer transition-all ${
                viewMode === 'full' ? 'ring-2 ring-primary-500 bg-primary-50' : ''
              }`}
              onClick={() => setViewMode('full')}
            >
              <CardHeader>
                <CardTitle className="text-lg">Full Paper</CardTitle>
                <CardDescription>Complete technical details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="mr-2">⏱️</span>
                  <span>20-30 min read</span>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li>✓ All technical details</li>
                  <li>✓ Mathematical proofs</li>
                  <li>✓ Implementation notes</li>
                </ul>
              </CardContent>
            </Card>

            <Card
              hover
              padding="md"
              className={`cursor-pointer transition-all ${
                viewMode === 'annotated' ? 'ring-2 ring-primary-500 bg-primary-50' : ''
              }`}
              onClick={() => setViewMode('annotated')}
            >
              <CardHeader>
                <CardTitle className="text-lg">Annotated Version</CardTitle>
                <CardDescription>Expert commentary & insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="mr-2">⏱️</span>
                  <span>30-45 min read</span>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li>✓ Expert commentary</li>
                  <li>✓ Historical context</li>
                  <li>✓ Advanced applications</li>
                </ul>
              </CardContent>
            </Card>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-700 text-sm">
              <span className="font-semibold">Current mode:</span> {getViewModeDescription()}
            </p>
          </div>
        </div>

        {/* Section navigation */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-gray-700">Sections</h4>
            <Button variant="outline" size="sm" onClick={() => setShowAllSections(!showAllSections)}>
              {showAllSections ? 'Show Less' : 'Show All'}
            </Button>
          </div>

          <div className={`grid gap-2 ${showAllSections ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {sections.map((section, index) => (
              <div
                key={section.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  currentSection === index
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setCurrentSection(index)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-semibold text-gray-900">{section.title}</h5>
                  <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(section.difficulty)}`}>
                    {section.difficulty}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{section.shortSummary}</p>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>⏱️ {section.readingTime}</span>
                  <span>{section.keyConcepts.length} concepts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current section content */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900">{currentSectionData.title}</h3>
              <div className="flex items-center space-x-3 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm ${getDifficultyColor(currentSectionData.difficulty)}`}>
                  {currentSectionData.difficulty} Level
                </span>
                <span className="text-gray-600">⏱️ {currentSectionData.readingTime} read</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                Print Section
              </Button>
              <Button variant="outline" size="sm">
                Save for Later
              </Button>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-2">Key Concepts:</h4>
            <div className="flex flex-wrap gap-2">
              {currentSectionData.keyConcepts.map((concept, index) => (
                <span key={index} className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  {concept}
                </span>
              ))}
            </div>
          </div>

          <div className="prose max-w-none p-6 bg-white border border-gray-200 rounded-lg">
            <div className="whitespace-pre-line text-gray-800 leading-relaxed">
              {getContentForMode()}
            </div>
          </div>

          {viewMode === 'annotated' && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">💡 Expert Notes:</h4>
              <p className="text-yellow-700">
                This annotated version includes additional context, historical background, and practical applications
                not found in the standard paper. Look for callouts like this one throughout the text.
              </p>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <div>
            {currentSection > 0 && (
              <Button variant="outline" onClick={() => setCurrentSection(currentSection - 1)}>
                ← Previous Section
              </Button>
            )}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => alert('Download feature coming soon!')}>
              Download PDF
            </Button>
            {currentSection < sections.length - 1 ? (
              <Button variant="primary" onClick={() => setCurrentSection(currentSection + 1)}>
                Next Section →
              </Button>
            ) : (
              <Button variant="accent" onClick={() => alert('Congratulations! You finished reading this white paper!')}>
                🎉 Complete Reading
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};