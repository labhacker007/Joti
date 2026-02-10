import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, Search, Download, Filter, LogIn, LogOut, Settings, User, Database } from 'lucide-react';
import { auditAPI } from '../api/client.ts';
import type { PaginatedAuditLogs, AuditLog } from '../types/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Spinner } from '../components/ui/spinner';
import { Alert, AlertDescription } from '../components/ui/alert';

// ============================================
// CONSTANTS
// ============================================

const ACTION_CATEGORIES = [
  { value: 'all', label: 'All Actions' },
  { value: 'auth', label: 'Authentication' },
  { value: 'settings', label: 'Settings Changes' },
  { value: 'user', label: 'User Management' },
  { value: 'data', label: 'Data Changes' },
];

// ============================================
// HELPERS
// ============================================

function getActionIcon(action: string) {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes('login')) return <LogIn className="h-4 w-4 text-green-600" />;
  if (lowerAction.includes('logout')) return <LogOut className="h-4 w-4 text-muted-foreground" />;
  if (lowerAction.includes('setting') || lowerAction.includes('config')) return <Settings className="h-4 w-4 text-blue-600" />;
  if (lowerAction.includes('user')) return <User className="h-4 w-4 text-purple-600" />;
  if (lowerAction.includes('create') || lowerAction.includes('update') || lowerAction.includes('delete')) return <Database className="h-4 w-4 text-amber-600" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

function getActionBadge(action: string) {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes('login')) return <Badge variant="default">Login</Badge>;
  if (lowerAction.includes('logout')) return <Badge variant="outline">Logout</Badge>;
  if (lowerAction.includes('setting') || lowerAction.includes('config')) return <Badge variant="secondary">Settings</Badge>;
  if (lowerAction.includes('create')) return <Badge className="bg-green-600">Create</Badge>;
  if (lowerAction.includes('update')) return <Badge className="bg-blue-600">Update</Badge>;
  if (lowerAction.includes('delete')) return <Badge variant="destructive">Delete</Badge>;
  return <Badge variant="outline">{action}</Badge>;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, actionFilter]);

  // ============================================
  // DATA LOADING
  // ============================================

  async function fetchLogs() {
    setLoading(true);
    setError('');
    try {
      const params: any = {
        page: pagination.page,
        page_size: pagination.pageSize,
      };

      if (searchQuery) params.search = searchQuery;
      if (actionFilter !== 'all') params.action_type = actionFilter;

      const response = await auditAPI.getLogs(params);
      const data = response.data as PaginatedAuditLogs;

      setLogs(data.items || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
      }));
    } catch (err: any) {
      console.error('Failed to fetch logs:', err);
      setError('Failed to load audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchLogs();
  }

  function handlePageChange(newPage: number) {
    setPagination(prev => ({ ...prev, page: newPage }));
  }

  function exportLogs() {
    // TODO: Implement export functionality
    alert('Export functionality coming soon');
  }

  // ============================================
  // RENDER
  // ============================================

  const totalPages = Math.ceil(pagination.total / pagination.pageSize);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground">System activity, settings changes, and login history</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search logs..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} size="sm">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Action Filter */}
            <div>
              <Label htmlFor="action-filter">Action Type</Label>
              <select
                id="action-filter"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full mt-2 px-3 py-2 border rounded-md bg-background"
              >
                {ACTION_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Stats */}
            <div>
              <Label>Total Logs</Label>
              <div className="text-2xl font-bold mt-2">{pagination.total.toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            Showing {logs.length} of {pagination.total} logs (Page {pagination.page} of {totalPages || 1})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No logs found matching your criteria
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map(log => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 border rounded-md hover:bg-muted/50 transition-colors"
                >
                  {/* Icon */}
                  <div className="mt-1">
                    {getActionIcon(log.action)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {getActionBadge(log.action)}
                      <span className="font-medium">{log.username || 'System'}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-sm text-muted-foreground mt-1 break-words">
                        {log.details}
                      </p>
                    )}
                    {log.ip_address && (
                      <p className="text-xs text-muted-foreground mt-1">
                        IP: {log.ip_address}
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  {log.status && (
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                      {log.status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || loading}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Login Events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter(l => l.action.toLowerCase().includes('login')).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Settings Changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter(l => l.action.toLowerCase().includes('setting') || l.action.toLowerCase().includes('config')).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>User Actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter(l => l.action.toLowerCase().includes('user')).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Data Changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter(l => l.action.toLowerCase().includes('create') || l.action.toLowerCase().includes('update') || l.action.toLowerCase().includes('delete')).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
