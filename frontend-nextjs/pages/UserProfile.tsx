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
  Bell,
  Palette,
  ToggleRight,
  ToggleLeft,
  Globe,
  Volume2,
  LogOut,
  MapPin,
  Smartphone,
  LogIn,
  Tag,
  Folder,
  Download,
  Upload,
  Copy,
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
  category?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

interface SourceCategory {
  id: string;
  name: string;
  icon: string;
}

interface WatchlistItem {
  id: string;
  keyword: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface NotificationPreference {
  id: string;
  type: 'email' | 'push' | 'sms';
  category: 'security' | 'updates' | 'digest' | 'promotional';
  enabled: boolean;
  frequency: 'instant' | 'daily' | 'weekly' | 'monthly';
}

interface DisplayPreference {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  timeFormat: '12h' | '24h';
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  itemsPerPage: number;
}

interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends';
  dataCollection: boolean;
  marketingConsent: boolean;
  activityTracking: boolean;
  twoFactorRequired: boolean;
}

interface LoginHistory {
  id: string;
  ip_address: string;
  device: string;
  location: string;
  status: 'success' | 'failed';
  timestamp: string;
}

interface ActiveSession {
  id: string;
  device_name: string;
  browser: string;
  ip_address: string;
  location: string;
  last_active: string;
  is_current: boolean;
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
  const [sourceFormData, setSourceFormData] = useState({ name: '', url: '', category: '', tags: '' });
  const [sourceCategories, setSourceCategories] = useState<SourceCategory[]>([
    { id: '1', name: 'Security', icon: 'Shield' },
    { id: '2', name: 'Technology', icon: 'Code' },
    { id: '3', name: 'News', icon: 'Newspaper' },
    { id: '4', name: 'Research', icon: 'BookOpen' },
  ]);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [sourceSearchTerm, setSourceSearchTerm] = useState('');
  const [sourceFilterCategory, setSourceFilterCategory] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const [topKeywords, setTopKeywords] = useState<WatchlistItem[]>([]);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // Preferences state
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreference[]>([]);
  const [displayPrefs, setDisplayPrefs] = useState<DisplayPreference>({
    theme: 'auto',
    language: 'en',
    timezone: 'UTC',
    timeFormat: '24h',
    dateFormat: 'YYYY-MM-DD',
    itemsPerPage: 10,
  });
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profileVisibility: 'private',
    dataCollection: true,
    marketingConsent: false,
    activityTracking: true,
    twoFactorRequired: false,
  });
  const [prefsLoading, setPrefsLoading] = useState(false);

  // Security state
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([
    {
      id: '1',
      ip_address: '192.168.1.100',
      device: 'Chrome on Windows',
      location: 'New York, USA',
      status: 'success',
      timestamp: new Date(Date.now() - 60000).toISOString(),
    },
    {
      id: '2',
      ip_address: '192.168.1.101',
      device: 'Safari on macOS',
      location: 'San Francisco, USA',
      status: 'success',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '3',
      ip_address: '192.168.1.102',
      device: 'Firefox on Linux',
      location: 'London, UK',
      status: 'failed',
      timestamp: new Date(Date.now() - 172800000).toISOString(),
    },
  ]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([
    {
      id: '1',
      device_name: 'My Windows PC',
      browser: 'Chrome 120',
      ip_address: '192.168.1.100',
      location: 'New York, USA',
      last_active: new Date(Date.now() - 300000).toISOString(),
      is_current: true,
    },
    {
      id: '2',
      device_name: 'MacBook Pro',
      browser: 'Safari 17',
      ip_address: '192.168.1.101',
      location: 'San Francisco, USA',
      last_active: new Date(Date.now() - 3600000).toISOString(),
      is_current: false,
    },
  ]);
  const [securityLoading, setSecurityLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'sources') {
      fetchSources();
    } else if (activeTab === 'watchlist') {
      fetchWatchlist();
    } else if (activeTab === 'preferences') {
      loadPreferences();
    } else if (activeTab === 'security') {
      loadSecurityData();
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

      const sourceData = {
        name: sourceFormData.name,
        url: sourceFormData.url,
        category: sourceFormData.category || undefined,
        tags: sourceFormData.tags
          ? sourceFormData.tags.split(',').map((t) => t.trim()).filter((t) => t)
          : undefined,
      };

      if (editingSourceId) {
        await sourcesAPI.updateSource(editingSourceId, sourceData);
        setSuccess('Source updated successfully');
      } else {
        await sourcesAPI.createSource(sourceData);
        setSuccess('Source added successfully');
      }

      setShowSourceModal(false);
      setEditingSourceId(null);
      setSourceFormData({ name: '', url: '', category: '', tags: '' });
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

  // Day 3: Source Management enhancements
  const handleToggleSourceActive = async (id: string) => {
    try {
      setError('');
      const source = sources.find((s) => s.id === id);
      if (!source) return;

      const updatedSource = { ...source, is_active: !source.is_active };
      await sourcesAPI.updateSource(id, updatedSource);
      setSources(sources.map((s) => (s.id === id ? updatedSource : s)));
      setSuccess(`Source ${updatedSource.is_active ? 'activated' : 'deactivated'}`);
    } catch (err: any) {
      setError(getErrorMessage(err));
      console.error('Toggle source error:', err);
    }
  };

  const handleSelectSource = (id: string) => {
    const newSelected = new Set(selectedSources);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSources(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAllSources = () => {
    if (selectedSources.size === filteredSources.length) {
      setSelectedSources(new Set());
      setShowBulkActions(false);
    } else {
      const allIds = new Set(filteredSources.map((s) => s.id));
      setSelectedSources(allIds);
      setShowBulkActions(true);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedSources.size} sources?`)) return;

    try {
      setError('');
      for (const id of selectedSources) {
        await sourcesAPI.deleteSource(id);
      }
      setSuccess(`${selectedSources.size} sources deleted`);
      setSelectedSources(new Set());
      setShowBulkActions(false);
      await fetchSources();
    } catch (err: any) {
      setError(getErrorMessage(err));
      console.error('Bulk delete error:', err);
    }
  };

  const handleBulkToggleActive = async (activate: boolean) => {
    try {
      setError('');
      for (const id of selectedSources) {
        const source = sources.find((s) => s.id === id);
        if (source) {
          await sourcesAPI.updateSource(id, { ...source, is_active: activate });
        }
      }
      setSources(
        sources.map((s) => (selectedSources.has(s.id) ? { ...s, is_active: activate } : s))
      );
      setSuccess(`${selectedSources.size} sources ${activate ? 'activated' : 'deactivated'}`);
      setSelectedSources(new Set());
      setShowBulkActions(false);
    } catch (err: any) {
      setError(getErrorMessage(err));
      console.error('Bulk toggle error:', err);
    }
  };

  const handleExportSources = () => {
    const dataToExport = sources;
    const csvContent = [
      ['Name', 'URL', 'Category', 'Tags', 'Status'],
      ...dataToExport.map((s) => [
        s.name,
        s.url,
        s.category || 'Uncategorized',
        s.tags?.join(';') || '',
        s.is_active ? 'Active' : 'Inactive',
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sources-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setShowExportDialog(false);
    setSuccess('Sources exported successfully');
  };

  const filteredSources = sources.filter((source) => {
    const matchesSearch =
      source.name.toLowerCase().includes(sourceSearchTerm.toLowerCase()) ||
      source.url.toLowerCase().includes(sourceSearchTerm.toLowerCase());
    const matchesCategory = !sourceFilterCategory || source.category === sourceFilterCategory;
    return matchesSearch && matchesCategory;
  });

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

  // Preferences methods
  const loadPreferences = async () => {
    try {
      setPrefsLoading(true);
      setError('');
      // Simulating preference loading - in real app would fetch from API
      // For now, using default values already set in state
      setPrefsLoading(false);
    } catch (err: any) {
      setError(getErrorMessage(err));
      console.error('Preferences error:', err);
      setPrefsLoading(false);
    }
  };

  const handleSaveDisplayPrefs = async () => {
    try {
      setError('');
      setSuccess('');
      // In real app: await preferencesAPI.updateDisplayPreferences(displayPrefs);
      setSuccess('Display preferences saved successfully');
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleSavePrivacySettings = async () => {
    try {
      setError('');
      setSuccess('');
      // In real app: await preferencesAPI.updatePrivacySettings(privacySettings);
      setSuccess('Privacy settings saved successfully');
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleToggleNotification = async (prefId: string, enabled: boolean) => {
    try {
      setError('');
      // In real app: await preferencesAPI.updateNotification(prefId, { enabled });
      setNotificationPrefs(
        notificationPrefs.map((pref) =>
          pref.id === prefId ? { ...pref, enabled } : pref
        )
      );
      setSuccess('Notification preference updated');
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  // Security methods
  const loadSecurityData = async () => {
    try {
      setSecurityLoading(true);
      setError('');
      // In real app: would fetch login history and sessions from API
      // Using mock data for now
      setSecurityLoading(false);
    } catch (err: any) {
      setError(getErrorMessage(err));
      console.error('Security data error:', err);
      setSecurityLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to terminate this session?')) return;

    try {
      setError('');
      // In real app: await securityAPI.terminateSession(sessionId);
      setActiveSessions(activeSessions.filter((s) => s.id !== sessionId));
      setSuccess('Session terminated successfully');
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleTerminateAllOtherSessions = async () => {
    if (!window.confirm('Terminate all other sessions? You will be logged out everywhere except here.')) return;

    try {
      setError('');
      // In real app: await securityAPI.terminateAllOtherSessions();
      setActiveSessions(activeSessions.filter((s) => s.is_current));
      setSuccess('All other sessions terminated successfully');
    } catch (err: any) {
      setError(getErrorMessage(err));
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
              <div className="flex gap-2">
                <button
                  onClick={() => setShowExportDialog(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button
                  onClick={() => {
                    setShowSourceModal(true);
                    setEditingSourceId(null);
                    setSourceFormData({ name: '', url: '', category: '', tags: '' });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Source
                </button>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search sources by name or URL..."
                  value={sourceSearchTerm}
                  onChange={(e) => setSourceSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <select
                value={sourceFilterCategory || ''}
                onChange={(e) => setSourceFilterCategory(e.target.value || null)}
                className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">All Categories</option>
                {sourceCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Bulk Actions Bar */}
            {showBulkActions && selectedSources.size > 0 && (
              <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <span className="text-sm font-medium text-foreground">{selectedSources.size} selected</span>
                <div className="flex-1" />
                <button
                  onClick={() => handleBulkToggleActive(true)}
                  className="text-xs px-2 py-1 bg-green-500/20 text-green-600 rounded hover:bg-green-500/30 transition-colors"
                >
                  Activate
                </button>
                <button
                  onClick={() => handleBulkToggleActive(false)}
                  className="text-xs px-2 py-1 bg-gray-500/20 text-gray-600 rounded hover:bg-gray-500/30 transition-colors"
                >
                  Deactivate
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="text-xs px-2 py-1 bg-red-500/20 text-red-600 rounded hover:bg-red-500/30 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setSelectedSources(new Set());
                    setShowBulkActions(false);
                  }}
                  className="text-xs px-2 py-1 bg-muted text-foreground rounded hover:bg-accent transition-colors"
                >
                  Clear
                </button>
              </div>
            )}

            {sourcesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading sources...</div>
            ) : filteredSources.length === 0 && sources.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No custom sources yet. Add one to get started!
              </div>
            ) : filteredSources.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sources match your search or filters.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Select All Checkbox */}
                {filteredSources.length > 1 && (
                  <div className="flex items-center gap-2 p-2 border-b border-border">
                    <input
                      type="checkbox"
                      checked={selectedSources.size === filteredSources.length && filteredSources.length > 0}
                      onChange={handleSelectAllSources}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs text-muted-foreground">Select all on page</span>
                  </div>
                )}
                {filteredSources.map((source) => (
                  <div
                    key={source.id}
                    className={cn(
                      'flex items-start gap-3 p-4 bg-muted rounded-lg hover:bg-accent/50 transition-colors',
                      selectedSources.has(source.id) && 'bg-blue-500/10 border border-blue-500/30'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSources.has(source.id)}
                      onChange={() => handleSelectSource(source.id)}
                      className="w-4 h-4 mt-1 cursor-pointer"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{source.name}</h3>
                      <p className="text-sm text-muted-foreground break-all">{source.url}</p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleToggleSourceActive(source.id)}
                          className={cn(
                            'px-2 py-1 rounded text-xs font-medium transition-colors',
                            source.is_active
                              ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                              : 'bg-gray-500/10 text-gray-600 hover:bg-gray-500/20'
                          )}
                        >
                          {source.is_active ? '✓ Active' : '○ Inactive'}
                        </button>
                        {source.category && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-600">
                            {source.category}
                          </span>
                        )}
                        {source.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 rounded text-xs font-medium bg-purple-500/10 text-purple-600"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          setEditingSourceId(source.id);
                          setSourceFormData({
                            name: source.name,
                            url: source.url,
                            category: source.category || '',
                            tags: source.tags?.join(',') || '',
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

            {filteredSources.length > 0 && (
              <div className="text-xs text-muted-foreground pt-2">
                Showing {filteredSources.length} of {sources.length} sources
              </div>
            )}

            {showSourceModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-foreground">
                      {editingSourceId ? 'Edit Source' : 'Add New Source'}
                    </h3>
                    <button
                      onClick={() => {
                        setShowSourceModal(false);
                        setEditingSourceId(null);
                        setSourceFormData({ name: '', url: '', category: '', tags: '' });
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

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Category
                      </label>
                      <select
                        value={sourceFormData.category}
                        onChange={(e) =>
                          setSourceFormData({ ...sourceFormData, category: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="">Select a category</option>
                        {sourceCategories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Tags (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={sourceFormData.tags}
                        onChange={(e) =>
                          setSourceFormData({ ...sourceFormData, tags: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="e.g., security, threat-intelligence, news"
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
                          setSourceFormData({ name: '', url: '', category: '', tags: '' });
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

            {/* Export Dialog */}
            {showExportDialog && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-card border border-border rounded-lg p-6 max-w-sm w-full mx-4">
                  <h3 className="text-lg font-bold text-foreground mb-4">Export Sources</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export {sources.length} sources as CSV file?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportSources}
                      className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => setShowExportDialog(false)}
                      className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
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
          <div className="space-y-6">
            {/* Security Settings Card */}
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

            {/* Active Sessions Card */}
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">Active Sessions</h2>
                </div>
                <button
                  onClick={handleTerminateAllOtherSessions}
                  className="text-sm px-3 py-1 bg-red-500/10 text-red-600 rounded hover:bg-red-500/20 transition-colors"
                >
                  <LogOut className="w-4 h-4 inline mr-1" />
                  Sign Out All Other
                </button>
              </div>

              <div className="space-y-3">
                {activeSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 bg-muted rounded-lg flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{session.device_name}</h3>
                        {session.is_current && (
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-600 text-xs rounded font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{session.browser}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {session.location}
                        </span>
                        <span>{session.ip_address}</span>
                        <span>Last active: {formatDate(session.last_active)}</span>
                      </div>
                    </div>
                    {!session.is_current && (
                      <button
                        onClick={() => handleTerminateSession(session.id)}
                        className="ml-4 px-3 py-1 bg-red-500/10 text-red-600 rounded hover:bg-red-500/20 transition-colors text-sm"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Login History Card */}
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div className="flex items-center gap-3">
                <LogIn className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Login History</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Date & Time</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Device</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Location</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">IP Address</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginHistory.map((entry) => (
                      <tr key={entry.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 text-foreground">{formatDate(entry.timestamp)}</td>
                        <td className="py-3 px-4 text-foreground">{entry.device}</td>
                        <td className="py-3 px-4 text-foreground">{entry.location}</td>
                        <td className="py-3 px-4 text-foreground font-mono text-xs">{entry.ip_address}</td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              'px-2 py-1 rounded text-xs font-medium',
                              entry.status === 'success'
                                ? 'bg-green-500/10 text-green-600'
                                : 'bg-red-500/10 text-red-600'
                            )}
                          >
                            {entry.status === 'success' ? 'Success' : 'Failed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-6">
            {/* Notification Preferences */}
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Notification Preferences</h2>
              </div>

              <div className="space-y-4">
                {/* Email Notifications */}
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">Email Notifications</h3>
                      <p className="text-sm text-muted-foreground">Receive updates via email</p>
                    </div>
                    <button
                      onClick={() =>
                        setNotificationPrefs([
                          {
                            id: '1',
                            type: 'email',
                            category: 'security',
                            enabled: !notificationPrefs.some((p) => p.type === 'email' && p.enabled),
                            frequency: 'instant',
                          },
                        ])
                      }
                      className="text-primary hover:text-primary/80"
                    >
                      {notificationPrefs.some((p) => p.type === 'email' && p.enabled) ? (
                        <ToggleRight className="w-6 h-6" />
                      ) : (
                        <ToggleLeft className="w-6 h-6" />
                      )}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {['security', 'updates', 'digest', 'promotional'].map((cat) => (
                      <label key={cat} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          defaultChecked={cat !== 'promotional'}
                          className="rounded border border-border"
                        />
                        <span className="text-sm text-foreground capitalize">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Frequency Selection */}
                <div className="p-4 bg-muted rounded-lg">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Notification Frequency
                  </label>
                  <select
                    value={displayPrefs.itemsPerPage}
                    onChange={(e) => setDisplayPrefs({ ...displayPrefs, itemsPerPage: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value={1}>Instant</option>
                    <option value={7}>Daily</option>
                    <option value={30}>Weekly</option>
                    <option value={365}>Monthly</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Display Preferences */}
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Palette className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Display Preferences</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Theme</label>
                  <select
                    value={displayPrefs.theme}
                    onChange={(e) =>
                      setDisplayPrefs({
                        ...displayPrefs,
                        theme: e.target.value as 'light' | 'dark' | 'auto',
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Language</label>
                  <select
                    value={displayPrefs.language}
                    onChange={(e) => setDisplayPrefs({ ...displayPrefs, language: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="zh">中文</option>
                  </select>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Timezone</label>
                  <select
                    value={displayPrefs.timezone}
                    onChange={(e) => setDisplayPrefs({ ...displayPrefs, timezone: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="UTC">UTC</option>
                    <option value="EST">EST (UTC-5)</option>
                    <option value="CST">CST (UTC-6)</option>
                    <option value="MST">MST (UTC-7)</option>
                    <option value="PST">PST (UTC-8)</option>
                    <option value="CET">CET (UTC+1)</option>
                    <option value="IST">IST (UTC+5:30)</option>
                    <option value="JST">JST (UTC+9)</option>
                  </select>
                </div>

                {/* Time Format */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Time Format</label>
                  <select
                    value={displayPrefs.timeFormat}
                    onChange={(e) =>
                      setDisplayPrefs({
                        ...displayPrefs,
                        timeFormat: e.target.value as '12h' | '24h',
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="12h">12-hour (AM/PM)</option>
                    <option value="24h">24-hour</option>
                  </select>
                </div>

                {/* Date Format */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Date Format</label>
                  <select
                    value={displayPrefs.dateFormat}
                    onChange={(e) =>
                      setDisplayPrefs({
                        ...displayPrefs,
                        dateFormat: e.target.value as 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD',
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                {/* Items Per Page */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Items Per Page</label>
                  <select
                    value={displayPrefs.itemsPerPage}
                    onChange={(e) =>
                      setDisplayPrefs({ ...displayPrefs, itemsPerPage: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value={10}>10 items</option>
                    <option value={25}>25 items</option>
                    <option value={50}>50 items</option>
                    <option value={100}>100 items</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleSaveDisplayPrefs}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Display Settings
              </button>
            </div>

            {/* Privacy Controls */}
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Globe className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Privacy & Security</h2>
              </div>

              <div className="space-y-4">
                {/* Profile Visibility */}
                <div className="p-4 bg-muted rounded-lg">
                  <label className="block text-sm font-medium text-foreground mb-2">Profile Visibility</label>
                  <select
                    value={privacySettings.profileVisibility}
                    onChange={(e) =>
                      setPrivacySettings({
                        ...privacySettings,
                        profileVisibility: e.target.value as 'public' | 'private' | 'friends',
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="public">Public</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Private</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Control who can see your profile and activity
                  </p>
                </div>

                {/* Toggle Settings */}
                <div className="space-y-3">
                  {[
                    {
                      label: 'Data Collection',
                      description: 'Allow us to collect usage analytics to improve the app',
                      key: 'dataCollection',
                    },
                    {
                      label: 'Marketing Communications',
                      description: 'Receive emails about new features and updates',
                      key: 'marketingConsent',
                    },
                    {
                      label: 'Activity Tracking',
                      description: 'Track your activity for security and personalization',
                      key: 'activityTracking',
                    },
                    {
                      label: 'Require Two-Factor Authentication',
                      description: 'Enforce 2FA for all account access',
                      key: 'twoFactorRequired',
                    },
                  ].map((setting) => (
                    <div key={setting.key} className="p-4 bg-muted rounded-lg flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{setting.label}</h3>
                        <p className="text-sm text-muted-foreground">{setting.description}</p>
                      </div>
                      <button
                        onClick={() =>
                          setPrivacySettings({
                            ...privacySettings,
                            [setting.key]: !privacySettings[setting.key as keyof PrivacySettings],
                          })
                        }
                        className="text-primary hover:text-primary/80"
                      >
                        {privacySettings[setting.key as keyof PrivacySettings] ? (
                          <ToggleRight className="w-6 h-6" />
                        ) : (
                          <ToggleLeft className="w-6 h-6" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSavePrivacySettings}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Privacy Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
