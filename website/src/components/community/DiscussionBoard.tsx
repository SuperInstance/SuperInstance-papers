import React, { useState, useEffect } from 'react';
import { MessageCircle, Clock, User, Tag, TrendingUp, HelpCircle, Lightbulb } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface Discussion {
  id: string;
  title: string;
  content: string;
  category: 'general' | 'help' | 'showcase' | 'tutorial-feedback';
  tags?: string[];
  replyCount?: number;
  viewCount?: number;
  lastReplyAt?: string;
  createdAt: string;
  author_display_name?: string;
  author_avatar_url?: string;
  author_username?: string;
  pinned?: boolean;
  locked?: boolean;
}

interface DiscussionBoardProps {
  apiBase: string;
}

export const DiscussionBoard: React.FC<DiscussionBoardProps> = ({ apiBase }) => {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'replies' | 'views'>('recent');

  const categories = [
    { value: 'all', label: 'All Discussions', icon: MessageCircle, count: 0 },
    { value: 'general', label: 'General', icon: MessageCircle, count: 0 },
    { value: 'help', label: 'Help & Support', icon: HelpCircle, count: 0 },
    { value: 'showcase', label: 'Showcase', icon: Lightbulb, count: 0 },
    { value: 'tutorial-feedback', label: 'Tutorial Feedback', icon: TrendingUp, count: 0 }
  ];

  useEffect(() => {
    fetchDiscussions();
  }, [selectedCategory, sortBy]);

  const fetchDiscussions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      params.set('sort', sortBy);
      params.set('limit', '10');

      const response = await fetch(`${apiBase}/community/discussions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setDiscussions(data);

        // Update category counts
        categories.forEach(cat => {
          if (cat.value !== 'all') {
            cat.count = data.filter((d: Discussion) => d.category === cat.value).length;
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch discussions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 24 * 7) return `${Math.floor(diffHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const getCategoryStyle = (category: string) => {
    const styles = {
      'help': 'bg-red-100 text-red-800 border-red-200',
      'showcase': 'bg-green-100 text-green-800 border-green-200',
      'tutorial-feedback': 'bg-blue-100 text-blue-800 border-blue-200',
      'general': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return styles[category] || styles.general;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Community Discussions</h2>
        <Button
          variant="primary"
          onClick={() => window.location.href = '/community/new-discussion'}
        >
          Start Discussion
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`
                flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium
                transition-colors border
                ${
                  selectedCategory === category.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{category.label}</span>
              {category.count > 0 &> <Badge variant="secondary">{category.count}</Badge>}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing {discussions.filter(d => d.pinned).length + (selectedCategory === 'all' ? discussions.filter(d => !d.pinned).length : 0)} discussions
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="text-sm px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="recent">Most Recent</option>
          <option value="replies">Most Replies</option>
          <option value="views">Most Viewed</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {discussions.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No discussions yet. Be the first to start a conversation!</p>
            </div>
          ) : (
            discussions.map((discussion) => (
              <div
                key={discussion.id}
                className={`
                  border rounded-lg p-4 hover:border-blue-300 transition-colors
                  ${discussion.pinned ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}
                `}
                onClick={() => window.location.href = `/community/discussions/${discussion.id}`}
                style={{ cursor: 'pointer' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {discussion.pinned && <Badge variant="primary">Pinned</Badge>}
                      {discussion.locked && <Badge variant="secondary">🔒 Locked</Badge>}
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getCategoryStyle(discussion.category)}`}>
                        {discussion.category.replace('-', ' ')}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 hover:text-blue-600">
                      {discussion.title}
                    </h3>
                  </div>
                  <time className="text-sm text-gray-500 whitespace-nowrap">
                    {formatDate(discussion.createdAt)}
                  </time>
                </div>

                {discussion.tags && discussion.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {discussion.tags.map((tag, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                        <Tag className="w-3 h-3 mr-1" /> {tag}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {discussion.content}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {discussion.author_display_name || discussion.author_username || 'Anonymous'}
                    </div>
                    {discussion.replyCount > 0 &> (
                      <div className="flex items-center">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        {discussion.replyCount} replies
                      </div>
                    )}
                    {discussion.viewCount > 0 &> (
                      <div className="flex items-center">
                        <Tag className="w-4 h-4 mr-1" />
                        {discussion.viewCount} views
                      </div>
                    )}
                  </div>
                  {discussion.lastReplyAt &> (
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Last reply {formatDate(discussion.lastReplyAt)}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};