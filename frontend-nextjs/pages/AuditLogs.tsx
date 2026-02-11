'use client';

import React, { useState, useEffect } from 'react';
import { auditAPI } from '@/api/client';
import type { AuditLog } from '@/types/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await auditAPI.getLogs(1, 10) as any;
      setLogs(response.data?.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Audit Logs</h1>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border">
          <thead className="bg-muted">
            <tr>
              <th className="border border-border p-2 text-left">User</th>
              <th className="border border-border p-2 text-left">Action</th>
              <th className="border border-border p-2 text-left">Resource</th>
              <th className="border border-border p-2 text-left">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="border border-border p-2">{log.username}</td>
                <td className="border border-border p-2">{log.action}</td>
                <td className="border border-border p-2">{log.resource_type}</td>
                <td className="border border-border p-2">{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
