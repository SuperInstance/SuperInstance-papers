import React, { useState, useEffect } from 'react';
import { Star, MessageCircle, Award, Users, Zap, GitBranch } from 'lucide-react';

interface Activity {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
  createdAt: string;
  user?: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

interface RecentActivityProps {
  apiBase: string;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ apiBase }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '8');

      const response = await fetch(`${apiBase}/community/activities?${params}`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (actionType: string) => {
    const iconMap = {
      'formula_created': Star,
      'formula_reviewed': Star,
      'discussion_created': MessageCircle,
      'discussion_replied': MessageCircle,
      'badge_earned': Award,
      'workspace_created': Users,
      'workspace_joined': Users,
      'default': Zap
    };
    return iconMap[actionType] || iconMap.default;
  };

  const getActivityColor = (actionType: string) => {
    const colorMap = {
      'formula_created': 'bg-blue-100 text-blue-600',
      'formula_reviewed': 'bg-yellow-100 text-yellow-600',
      'discussion_created': 'bg-green-100 text-green-600',
      'discussion_replied': 'bg-green-100 text-green-600',
      'badge_earned': 'bg-purple-100 text-purple-600',
      'workspace_created': 'bg-indigo-100 text-indigo-600',
      'workspace_joined': 'bg-indigo-100 text-indigo-600',
      'default': 'bg-gray-100 text-gray-600'
    };
    return colorMap[actionType] || colorMap.default;
  };

  const getActivityText = (activity: Activity) => {
    const { actionType, entityType, metadata, user } = activity;
    const displayName = user?.displayName || user?.username || 'Someone';

    switch (actionType) {
      case 'formula_created':
        return `🔨 ${displayName} shared formula "${metadata?.title || 'Untitled'}"`;
      case 'formula_reviewed':
        return `⭐ ${displayName} reviewed a formula`;
      case 'discussion_created':
        return 💬 `${metadata?.title ? `Discussion: "${metadata?.title}"` : 'Started a discussion'}`;
      case 'discussion_replied':
        return `🖐️ ${displayName} replied to a discussion`;
      case 'badge_earned':
        return 🏆 `${displayName} earned a badge`;
      case 'workspace_created':
        return `💰 ${displayName} created workspace "${metadata?.name || 'New Workspace'}"`;
      case 'workspace_joined':
        return `📞 ${displayName} joined a workspace`;
      default:
        return `${displayName} performed an action`;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 60 * 24) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / (60 * 24))}d ago`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No recent activity.</p>
            </div>
          ) : (
            activities.map((activity) => {
              const Icon = getActivityIcon(activity.actionType);
              const colorClass = getActivityColor(activity.actionType);

              return (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`flex-shrink-0 p-2 rounded-full ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {getActivityText(activity)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTimeAgo(activity.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <div className="text-center pt-4">
        <a href="/community/activity" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
          View All Activity →
        </a>
      </div>
    </div>
  );
};