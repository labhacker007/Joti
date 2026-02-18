'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  AlertCircle,
  CheckCircle,
  Calendar,
  User,
  Activity,
} from 'lucide-react';
import { auditAPI } from '@/api/client';
import { formatRelativeTime, formatDate, cn } from '@/lib/utils';
import { Table, Column } from '@/components/Table';
import { Pagination } from '@/components/Pagination';

interface AuditLog {
  id: string;
  username: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  status: 'SUCCESS' | 'FAILURE';
  timestamp: string;
  ip_address?: string;
  details?: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const pageSize = 20;

  useEffect(() => {
    fetchLogs();
  }, [currentPage, searchQuery, selectedAction, selectedStatus]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');

      const filters: any = {};
      if (selectedAction !== 'ALL') filters.action = selectedAction;
      if (selectedStatus !== 'ALL') filters.status = selectedStatus;
      if (searchQuery) filters.search = searchQuery;

      const response = await auditAPI.getLogs(
        currentPage,
        pageSize,
        Object.keys(filters).length > 0 ? filters : undefined
      ) as any;

      setLogs(response.data?.items || []);
      setTotalPages(Math.ceil((response.data?.total || 0) / pageSize));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit logs');
      console.error('Audit logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'SUCCESS' ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <AlertCircle className="w-4 h-4 text-red-600" />
    );
  };

  const getStatusColor = (status: string) => {
    return status === 'SUCCESS'
      ? 'bg-green-500/10 text-green-600 border-green-500/30'
      : 'bg-red-500/10 text-red-600 border-red-500/30';
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'username',
      label: 'User',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>{value}</span>
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <span>{value}</span>
        </div>
      ),
    },
    {
      key: 'resource_type',
      label: 'Resource',
      sortable: true,
      render: (value, item) =>
        `${value}${item.resource_id ? ': ' + item.resource_id : ''}`,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <div className={cn('flex items-center gap-2 px-2 py-1 rounded text-xs font-medium border', getStatusColor(value))}>
          {getStatusIcon(value)}
          <span>{value}</span>
        </div>
      ),
    },
    {
      key: 'timestamp',
      label: 'Time',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span>{formatRelativeTime(value)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-muted-foreground mt-2">System activity and security audit trail</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-600">Error Loading Logs</p>
            <p className="text-sm text-red-600/80">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search logs by username, action, or resource..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-3">
          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedStatus('ALL');
                setCurrentPage(1);
              }}
              className={cn(
                'px-3 py-1 rounded-full text-sm transition-colors',
                selectedStatus === 'ALL'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-accent'
              )}
            >
              All Status
            </button>
            <button
              onClick={() => {
                setSelectedStatus('SUCCESS');
                setCurrentPage(1);
              }}
              className={cn(
                'px-3 py-1 rounded-full text-sm transition-colors',
                selectedStatus === 'SUCCESS'
                  ? 'bg-green-500/20 text-green-600 border border-green-500/30'
                  : 'bg-muted text-foreground hover:bg-accent'
              )}
            >
              Success
            </button>
            <button
              onClick={() => {
                setSelectedStatus('FAILURE');
                setCurrentPage(1);
              }}
              className={cn(
                'px-3 py-1 rounded-full text-sm transition-colors',
                selectedStatus === 'FAILURE'
                  ? 'bg-red-500/20 text-red-600 border border-red-500/30'
                  : 'bg-muted text-foreground hover:bg-accent'
              )}
            >
              Failure
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table<AuditLog>
          data={logs}
          columns={columns}
          loading={loading}
          empty="No audit logs found"
        />
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        loading={loading}
      />

      {/* Log Count Info */}
      <div className="text-sm text-muted-foreground text-center">
        Showing {logs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
        {Math.min(currentPage * pageSize, Math.max(logs.length, (currentPage - 1) * pageSize))} of logs
      </div>
    </div>
  );
}
