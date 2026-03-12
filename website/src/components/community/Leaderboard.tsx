import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, RotateCcw } from 'lucide-react';

interface UserProfile {
  userId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  reputation: number;
  contributionCount: number;
}

interface LeaderboardProps {
  apiBase: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ apiBase }) => {
  const [leaders, setLeaders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'all' | 'week' | 'month'>('all');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    fetchLeaders();
  }, [timePeriod]);

  const fetchLeaders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('time', timePeriod);
      params.set('limit', '10');

      const response = await fetch(`${apiBase}/community/users/leaders?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLeaders(data);
      }
    } catch (error) {
      console.error('Failed to fetch leaders:', error);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  const refresh = () => {
    fetchLeaders();
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-orange-600" />;
    return null;
  };

  const getRankBackground = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
    if (index === 1) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800';
    if (index === 2) return 'bg-gradient-to-r from-orange-500 to-red-500 text-white';
    return 'bg-white text-gray-700 hover:bg-gray-50';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900">Community Leaders</h3>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as any)}
            className="text-sm px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <button
            onClick={refresh}
            className="p-1 rounded hover:bg-gray-100"
            title="Refresh leaderboard"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-2">
          {leaders.map((user, index) => (
            <div
              key={user.userId}
              className={`
                p-3 rounded-lg border transition-all
                ${getRankBackground(index)}
                ${index > 2 ? 'border-gray-200' : 'border-transparent'}
                ${index > 2 ? 'shadow-sm' : 'shadow-lg'}
              `}
              onClick={() => window.location.href = `/community/users/${user.username || user.userId}`}
              style={{ cursor: 'pointer' }}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="relative">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.displayName || user.username || 'User'}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white">
                        {(user.displayName || user.username || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -top-1 -left-1">
                      {getRankIcon(index)}
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {user.displayName || user.username || 'Anonymous'}
                  </p>
                  <p className="text-sm opacity-75">{user.contributionCount} contributions</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{user.reputation.toLocaleString()}</p>
                  <p className="text-xs opacity-75">reputation</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {leaders.length === 0 && !loading &> (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No leaders found for this time period.</p>
        </div>
      )}

      <div className="text-center pt-4">
        <a href="/community/leaderboard" className="text-blue-600 hover:text-blue-700 font-medium">
          View Full Leaderboard →
        </a>
      </div>
    </div>
  );
};