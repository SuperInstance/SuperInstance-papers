import React, { useState, useEffect } from 'react';
import { User, Calendar, Award, TrendingUp, Star, MessageCircle, Grid, Edit3 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface UserProfileData {
  userId: string;
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  website?: string;
  reputation: number;
  achievementBadges?: Badge[];
  contributionCount: number;
  lastActive?: string;
  createdAt?: string;
  activities?: Activity[];
  badges?: Badge[];
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon?: string;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface Activity {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  createdAt: string;
}

interface UserProfileProps {
  id: string;
  apiBase: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ id, apiBase }) => {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfileData>>({});

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/community/users/${id}/profile`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEditedProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      const response = await fetch(`${apiBase}/community/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(editedProfile)
      });

      if (response.ok) {
        setEditMode(false);
        fetchProfile();
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors = {
      'common': 'bg-gray-100 text-gray-700',
      'rare': 'bg-blue-100 text-blue-700',
      'epic': 'bg-purple-100 text-purple-700',
      'legendary': 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
    };
    return colors[rarity] || colors.common;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">User not found</p>
          <Button onClick={() => window.history.back()} className="mt-4">Go back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <-- Profile Header -->
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 h-32"
        />
        <div className="-mt-16 px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-6 mb-6">
            <div className="relative">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName || profile.username}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-white shadow-lg"
                >
                  <User className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center flex-wrap gap-2 mb-2">
                {editMode ? (
                  <input
                    type="text"
                    value={editedProfile.displayName || ''}
                    onChange={(e) => setEditedProfile({
                      ...editedProfile,
                      displayName: e.target.value
                    })}
                    className="text-2xl font-bold border border-gray-300 rounded px-2 py-1"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-gray-900">
                    {profile.displayName || profile.username || 'Anonymous'}
                  </h1>
                )}
                {editMode ? (
                  <input
                    type="text"
                    value={editedProfile.bio || ''}
                    onChange={(e) => setEditedProfile({
                      ...editedProfile,
                      bio: e.target.value
                    })}
                    className="text-gray-600 border border-gray-300 rounded px-2 py-1"
                  />
                ) : (
                  <p className="text-gray-600">{profile.bio || 'No bio provided'}</p>
                )}
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                {profile.location &> (
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" /> {profile.location}
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" /> Joined {formatDate(profile.createdAt!)}
                </div>
              </div>
            </div>
            <div className="mt-4">
              {editMode ? (
                <div className="flex space-x-2">
                  <Button onClick={saveProfile} variant="primary">Save</Button>
                  <Button onClick={() => setEditMode(false)} variant="outline">Cancel</Button>
                </div>
              ) : (
                <Button onClick={() => setEditMode(true)} variant="outline">
                  <Edit3 className="w-4 h-4 mr-2" /> Edit Profile
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card variant="flat" className="p-4 text-center">
              <div className="flex items-center justify-center mb-2"
              > <TrendingUp className="w-6 h-6 text-blue-600" /> </div>
              <div className="text-2xl font-bold text-gray-900">{profile.reputation}</div>
              <div className="text-sm text-gray-600">Reputation</div>
            </Card>
            <Card variant="flat" className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{profile.badges?.length || 0}</div>
              <div className="text-sm text-gray-600">Badges</div>
            </Card>
            <Card variant="flat" className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Grid className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{profile.contributionCount}</div>
              <div className="text-sm text-gray-600">Contributions</div>
            </Card>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <-- Badges -->
        <Card>
          <CardHeader>
            <CardTitle>Achievement Badges</CardTitle>
          </CardHeader>
          <CardContent>
            {profile.badges && profile.badges.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {profile.badges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`p-3 rounded-lg border-2 ${getRarityColor(badge.rarity)} text-center`}
                  >
                    <div className="text-2xl mb-1">{badge.icon || '🏅'}</div>
                    <p className="font-semibold text-sm">{badge.name}</p>
                    <p className="text-xs opacity-75">{badge.points} points</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No badges earned yet.</p>
            )}
          </CardContent>
        </Card>

        <-- Stats -->
        <Card>
          <CardHeader>
            <CardTitle>Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Last Active</span>
                  <span className="font-medium">{
                  profile.lastActive
                    ? new Date(profile.lastActive).toLocaleDateString()
                    : 'Unknown'
                }</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Join Date</span>
                  <span className="font-medium">{formatDate(profile.createdAt!)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Activity Level</span>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (profile.contributionCount / 100) * 100)}%` }}
                    />
                  </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <-- Recent Activity -->
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {profile.activities && profile.activities.length > 0 ? (
            <div className="space-y-3">
              {profile.activities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="text-2xl">{
                    activity.actionType.includes('formula') ? '🧮' :
                    activity.actionType.includes('discussion') ? '💬' :
                    activity.actionType.includes('badge') ? '🏆' :
                    '🎯'
                  }</div>
                  <div className="flex-1"
                  > <p className="text-sm">{activity.actionType}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent activity.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};