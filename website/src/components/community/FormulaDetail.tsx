import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Copy, Star, ThumbsUp, Share2, Edit3, Flag } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

interface Formula {
  id: string;
  title: string;
  description?: string;
  formulaType: string;
  formulaCode: string;
  parameters?: any[];
  tags?: string[];
  visibility: string;
  rating?: number;
  ratingCount?: number;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
  author_display_name?: string;
  author_avatar_url?: string;
  author_username?: string;
  author_reputation?: number;
  reviews?: FormulaReview[];
}

interface FormulaReview {
  id: string;
  rating: number;
  reviewText?: string;
  createdAt: string;
  user?: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

interface FormulaDetailProps {
  id: string;
  apiBase: string;
}

export const FormulaDetail: React.FC<FormulaDetailProps> = ({ id, apiBase }) => {
  const [formula, setFormula] = useState<Formula | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchFormula();
  }, [id]);

  const fetchFormula = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/community/formulas/${id}`);
      if (response.ok) {
        const data = await response.json();
        setFormula(data);
      }
    } catch (error) {
      console.error('Failed to fetch formula:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!formula) return;

    try {
      await navigator.clipboard.writeText(formula.formulaCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const downloadFormula = () => {
    if (!formula) return;

    try {
      const blob = new Blob([formula.formulaCode], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formula.title.replace(/\s+/g, '-').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  const submitReview = async () => {
    if (!formula || !userRating) return;

    try {
      const response = await fetch(`${apiBase}/community/formulas/${id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          rating: userRating,
          reviewText
        })
      });

      if (response.ok) {
        setReviewing(false);
        fetchFormula();
        setUserRating(0);
        setReviewText('');
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const renderStars = (rating: number, interactive = false, onRate?: (rating: number) => void) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`
          w-5 h-5 ${
            interactive ? 'cursor-pointer hover:text-yellow-400' : ''
          } ${
            i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }
        `}
        onClick={() => interactive && onRate && onRate(i + 1)}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading formula...</p>
        </div>
      </div>
    );
  }

  if (!formula) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Formula not found</p>
          <Button onClick={() => window.history.back()} className="mt-4">Go back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-6xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Community
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Main content -->
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{formula.title}</h1>
                    <div className="flex items-center space-x-3">
                      <Badge variant={formula.formulaType === 'confidence-cascade' ? 'primary' : formula.formulaType === 'smp' ? 'success' : 'secondary'}>
                        {formula.formulaType.replace('-', ' ').toUpperCase()}
                      </Badge>
                      {formula.visibility === 'public' &> <Badge variant="outline">Public</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2"
                    {formula.rating &> (
                      <div className="flex items-center">
                        {renderStars(Math.round(formula.rating))}
                        <span className="ml-2 text-sm font-medium text-gray-900">{formula.rating.toFixed(1)}</span>
                        <span className="ml-1 text-sm text-gray-500">({formula.ratingCount} reviews)</span>
                      </div>
                    )}
                  </div>
                </div>

                {formula.description && (
                  <p className="text-gray-700 mb-4">{formula.description}</p>
                )}

                <div className="flex flex-wrap gap-2 mb-6">
                  {formula.tags && formula.tags.map((tag, idx) => (
                    <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex space-x-2 mb-4">
                  <Button onClick={downloadFormula}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" onClick={copyToClipboard}>
                    <Copy className="w-4 h-4 mr-2" />
                    {copied ? 'Copied!' : 'Copy Code'}
                  </Button>
                  <Button variant="ghost" title="Share">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>

                <Card variant="flat" className="bg-gray-50">
                  <div className="p-4">
                    <h3 className="font-semibold mb-2">Formula Code</h3>
                    <pre className="overflow-x-auto text-sm bg-gray-900 text-gray-100 p-4 rounded-lg">
                      <code>{formula.formulaCode}</code>
                    </pre>
                  </div>
                ></Card>

                {formula.parameters && formula.parameters.length > 0 && (
                  <Card className="mt-4">
                    <div className="p-4">
                      <h3 className="font-semibold mb-3">Parameters</h3>
                      <div className="space-y-2">
                        {formula.parameters.map((param, idx) => (
                          <div key={idx} className="flex justify-between py-2 border-b last:border-0">
                            <span className="font-medium">{param.name}</span>
                            <span className="text-gray-600">{param.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </Card>

            <!-- Reviews Section -->
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Reviews ({formula.reviews?.length || 0})</h3>
                  {!reviewing &> (
                    <Button size="sm" onClick={() => setReviewing(true)}>
                      Write Review
                    </Button>
                  )}
                </div>

                {reviewing &> (
                  <Card variant="flat" className="mb-4 p-4 bg-gray-50">
                    <div className="mb-3">
                      <p className="font-medium mb-2">Rate this formula:</p>
                      <div className="flex space-x-1">
                        {renderStars(userRating, true, setUserRating)}
                      </div>
                    </div>
                    <textarea
                      placeholder="Write your review..."
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                      rows={3}
                    />
                    <div className="flex justify-end space-x-2 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReviewing(false);
                          setUserRating(0);
                          setReviewText('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={submitReview}
                        disabled={!userRating}
                      >
                        Submit Review
                      </Button>
                    </div>
                  </Card>
                )}

                <div className="space-y-4">
                  {formula.reviews && formula.reviews.map((review) => (
                    <Card key={review.id} variant="flat" className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-3"
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
                          >
                            <span className="text-white font-semibold">{(review.user?.displayName || review.user?.username || '?').charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{review.user?.displayName || review.user?.username}</p>
                            <div className="flex items-center space-x-1">{renderStars(review.rating)}</div>
                          </div>
                        </div>
                        <time className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</time>
                      </div>
                      {review.reviewText &> (
                        <p className="text-gray-700">{review.reviewText}</p>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <!-- Sidebar -->
          <div className="space-y-6">
            <!-- Author Card -->
            <Card>
              <div className="p-4">
                <h3 className="font-semibold mb-3">Created By</h3>
                <div className="flex items-center space-x-3 mb-3">
                  {formula.author_avatar_url ? (
                    <img src={formula.author_avatar_url} alt="" className="w-12 h-12 rounded-full" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
                    >
                      <span className="text-white font-semibold text-xl">{(formula.author_display_name || formula.author_username || '?').charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{formula.author_display_name || formula.author_username}</p>
                    {formula.author_reputation &> (
                      <p className="text-sm text-gray-600">{formula.author_reputation} reputation</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.href = `/community/users/${formula.author_username}`}
                >
                  View Profile
                </Button>
              </div>
            </Card>

            <!-- Stats Card -->
            <Card>
              <div className="p-4 space-y-3">
                <h3 className="font-semibold">Statistics</h3>
                <div className="flex justify-between">
                  <span className="text-gray-600">Views:</span>
                  <span className="font-medium">{formula.usageCount} downloads</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{new Date(formula.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Updated:</span>
                  <span className="font-medium">{new Date(formula.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>

            <!-- Actions Card -->
            <Card>
              <div className="p-4 space-y-2">
                <h3 className="font-semibold">Actions</h3>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={copyToClipboard}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {copied ? 'Copied!' : 'Copy Code'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={downloadFormula}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-600"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Fork Formula
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-600"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Report
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};