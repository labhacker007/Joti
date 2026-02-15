'use client';

import React, { useEffect, useState } from 'react';
import {
  User,
  Mail,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  Lock,
  Eye,
  EyeOff,
  Save,
  Plus,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { usersAPI, sourcesAPI, watchlistAPI } from '@/api/client';
import { formatDate, cn } from '@/lib/utils';
import { getErrorMessage } from '@/api/client';

interface UserProfileData {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  created_at: string;
  last_login: string;
  two_factor_enabled: boolean;
}

interface SourceItem {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface WatchlistItem {
  id: string;
  keyword: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

type TabType = 'profile' | 'sources' | 'watchlist' | 'security' | 'preferences';

const TABS: { id: TabType; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'sources', label: 'Custom Sources' },
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'security', label: 'Security' },
  { id: 'preferences', label: 'Preferences' },
];

export default function UserProfile() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', email: '' });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [sources, setSources] = useState<SourceItem[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [sourceFormData, setSourceFormData] = useState({ name: '', url: '' });

  const [topKeywords, setTopKeywords] = useState<WatchlistItem[]>([]);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'sources') {
      fetchSources();
    } else if (activeTab === 'watchlist') {
      fetchWatchlist();
    }
  }, [activeTab]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const response = (await usersAPI.getProfile()) as any;
      setProfile(response.data);
      setFormData({
        full_name: response.data.full_name || '',
        email: response.data.email || '',
      });
    } catch (err: any) {
      setError(getErrorMessage(err));
      console.error('Profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setError('');
      setSuccess('');
      await usersAPI.updateProfile({
        full_name: formData.full_name,
        email: formData.email,
      });
      setSuccess('Profile updated successfully');
      setIsEditing(false);
      await fetchProfile();
    } catch (err: any) {
      setError(getErrorMessage(err));
      console.error('Update error:', err);
    }
  };

  const handleChangePassword = async () => {
    try {
      setError('');
      setSuccess('');

      if (passwordData.new_password !== passwordData.confirm_password) {
        setError('New passwords do not match');
        return;
      }

      if (passwordData.new_password.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }

      await usersAPI.changePassword(
        passwordData.current_password,
        passwordData.new_password
      );

      setSuccess('Password changed successfully');
      setShowPasswordChange(false);
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err: any) {
      setError(getErrorMessage(err));
      console.error('Password change error:', err);
    }
  };

  const fetchSources = async () => {
    try {
      setSourcesLoading(true);
      setError('');
      const response = (await sourcesAPI.getSources(1, 100)) as any;
      setSources(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(getErrorMessage(err));
      console.error('Sources error:', err);
    } finally {
      setSourcesLoading(false);
    }
  };

  const handleAddOrUpdateSource = async () => {
    try {
      setError('');
      setSuccess('');

      if (!sourceFormData.name || !sourceFormData.url) {
        setError('Please fill in all fields');
        return;
      }

      if (editingSourceId) {
        await sourcesAPI.updateSource(editingSourceId, sourceFormData);
        setSuccess('Source updated successfully');
      } else {
        await sourcesAPI.createSource(sourceFormData);
        setSuccess('Source added successfully');
      }

      setShowSourceModal(false);
      setEditingSourceId(null);
      setSourceFormData({ name: '', url: '' });
      await fetchSources();
    } catch (err: any) {
      setError(getErrorMessage(err));
      console.error('Source save error:', err);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this source?')) return;

    try {
      setError('');
      setSuccess('');
      await sourcesAPI.deleteSource(id);
      setSuccess('Source deleted successfully');
      await fetchSources();
    } catch (err: any) {
      setError(getErrorMessage(err));
      console.error('Source delete error:', err);
    }
  };

  const fetchWatchlist = async () => {
    try {
      setWatchlistLoading(true);
      setError('');
      const response = (await watchlistAPI.getKeywords()) as any;
      const items = Array.isArray(response.data) ? response.data : [];
      setWatchlistItems(items);
      setTopKeywords(items.slice(0, 5));
    } catch (err: any) {
      setError(getErrorMessage(err));
      console.error('Watchlist error:', err);
    } finally {
      setWatchlistLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-muted-foreground">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Profile</h1>
        <p className="text-muted-foreground mt-2">Manage your account settings and preferences</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-600">Error</p>
            <p className="text-sm text-red-600/80">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-600">Success</p>
            <p className="text-sm text-green-600/80">{success}</p>
          </div>
        </div>
      )}

      <div className="border-b border-border">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeTab === 'profile' && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-bold text-foreground">Profile Information</h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleUpdateProfile}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        full_name: profile.full_name,
                        email: profile.email,
                      });
                    }}
                    className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-medium">Username</p>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{profile.username}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-medium">Email</p>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{profile.email}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-medium">Full Name</p>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{profile.full_name}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-medium">Role</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/10 text-blue-600">
                      {profile.role}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-medium">Status</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-sm font-medium',
                        profile.status === 'ACTIVE'
                          ? 'bg-green-500/10 text-green-600'
                          : profile.status === 'INACTIVE'
                            ? 'bg-gray-500/10 text-gray-600'
                            : 'bg-red-500/10 text-red-600'
                      )}
                    >
                      {profile.status}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-medium">Account Created</p>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {formatDate(profile.created_at)}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-medium">Last Login</p>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {profile.last_login ? formatDate(profile.last_login) : 'Never'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Custom News Sources</h2>
              <button
                onClick={() => {
                  setShowSourceModal(true);
                  setEditingSourceId(null);
                  setSourceFormData({ name: '', url: '' });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Source
              </button>
            </div>

            {sourcesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading sources...</div>
            ) : sources.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No custom sources yet. Add one to get started!
              </div>
            ) : (
              <div className="space-y-3">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-start justify-between p-4 bg-muted rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{source.name}</h3>
                      <p className="text-sm text-muted-foreground break-all">{source.url}</p>
                      <div className="flex gap-2 mt-2">
                        <span
                          className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            source.is_active
                              ? 'bg-green-500/10 text-green-600'
                              : 'bg-gray-500/10 text-gray-600'
                          )}
                        >
                          {source.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          setEditingSourceId(source.id);
                          setSourceFormData({
                            name: source.name,
                            url: source.url,
                          });
                          setShowSourceModal(true);
                        }}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSource(source.id)}
                        className="p-2 text-muted-foreground hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showSourceModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-foreground">
                      {editingSourceId ? 'Edit Source' : 'Add New Source'}
                    </h3>
                    <button
                      onClick={() => {
                        setShowSourceModal(false);
                        setEditingSourceId(null);
                        setSourceFormData({ name: '', url: '' });
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Source Name
                      </label>
                      <input
                        type="text"
                        value={sourceFormData.name}
                        onChange={(e) =>
                          setSourceFormData({ ...sourceFormData, name: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="e.g., SecurityAffairs"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Source URL
                      </label>
                      <input
                        type="url"
                        value={sourceFormData.url}
                        onChange={(e) =>
                          setSourceFormData({ ...sourceFormData, url: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="https://example.com/rss"
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={handleAddOrUpdateSource}
                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                      >
                        {editingSourceId ? 'Update' : 'Add'} Source
                      </button>
                      <button
                        onClick={() => {
                          setShowSourceModal(false);
                          setEditingSourceId(null);
                          setSourceFormData({ name: '', url: '' });
                        }}
                        className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Monitored Keywords</h2>
              <a
                href="/watchlist"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                Manage All
              </a>
            </div>

            {watchlistLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading keywords...</div>
            ) : topKeywords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No monitored keywords yet.{' '}
                <a href="/watchlist" className="text-primary hover:underline">
                  Add some now
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {topKeywords.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{item.keyword}</p>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-1 rounded text-xs font-medium',
                        item.is_active
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-gray-500/10 text-gray-600'
                      )}
                    >
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {topKeywords.length > 0 && (
              <div className="pt-2 text-sm text-muted-foreground">
                Showing top {topKeywords.length} of {watchlistItems.length} keywords.{' '}
                <a href="/watchlist" className="text-primary hover:underline">
                  View all
                </a>
              </div>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-bold text-foreground">Security Settings</h2>

            <div className="flex items-start justify-between p-4 bg-muted rounded-lg">
              <div>
                <h3 className="font-semibold text-foreground">Two-Factor Authentication</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {profile.two_factor_enabled
                    ? 'Two-factor authentication is enabled'
                    : 'Enhance your account security with two-factor authentication'}
                </p>
              </div>
              <div
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium',
                  profile.two_factor_enabled
                    ? 'bg-green-500/10 text-green-600'
                    : 'bg-gray-500/10 text-gray-600'
                )}
              >
                {profile.two_factor_enabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>

            <div>
              {!showPasswordChange ? (
                <button
                  onClick={() => setShowPasswordChange(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  Change Password
                </button>
              ) : (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.current_password}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            current_password: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 pr-10 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.new_password}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            new_password: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 pr-10 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <button
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirm_password: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleChangePassword}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Lock className="w-4 h-4" />
                      Change Password
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordChange(false);
                        setPasswordData({
                          current_password: '',
                          new_password: '',
                          confirm_password: '',
                        });
                      }}
                      className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-bold text-foreground">Preferences</h2>
            <div className="text-center py-12 text-muted-foreground">
              <p>Notification and display preferences coming soon.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
