import React, { useEffect, useState } from 'react';
import {
  Plug, Plus, RefreshCw, Play, Settings, CheckCircle2, XCircle, AlertCircle, Loader2
} from 'lucide-react';
import { adminAPI } from '../api/client.ts';
import type { Connector, ConnectorType, ConnectorTestResult } from '../types/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Spinner } from '../components/ui/spinner';
import { Alert, AlertDescription } from '../components/ui/alert';
import AdminNav from '../components/AdminNav';

// ============================================
// CONSTANTS
// ============================================

const CONNECTOR_ICONS: Record<ConnectorType, string> = {
  xsiam: '🔐',
  defender: '🛡️',
  wiz: '☁️',
  splunk: '📊',
  slack: '💬',
  email: '📧',
};

const CONNECTOR_LABELS: Record<ConnectorType, string> = {
  xsiam: 'Palo Alto XSIAM',
  defender: 'Microsoft Defender',
  wiz: 'Wiz Cloud Security',
  splunk: 'Splunk',
  slack: 'Slack',
  email: 'Email',
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ConnectorManagement() {
  const [loading, setLoading] = useState(true);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, ConnectorTestResult>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    loadConnectors();
  }, []);

  // ============================================
  // DATA LOADING
  // ============================================

  async function loadConnectors() {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.getConnectors();
      setConnectors(response.data || []);
    } catch (err: any) {
      console.error('Failed to load connectors', err);
      setError('Unable to load connectors. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // CONNECTOR OPERATIONS
  // ============================================

  async function testConnector(type: ConnectorType) {
    setTesting(prev => ({ ...prev, [type]: true }));
    setError('');
    try {
      const response = await adminAPI.post(`/admin/configurations/test/${type}`);
      setTestResults(prev => ({ ...prev, [type]: response.data }));
    } catch (err: any) {
      setError(`Failed to test ${CONNECTOR_LABELS[type]}`);
      setTestResults(prev => ({
        ...prev,
        [type]: { success: false, message: err?.response?.data?.detail || 'Test failed' }
      }));
    } finally {
      setTesting(prev => ({ ...prev, [type]: false }));
    }
  }

  function getStatusIcon(connector: Connector) {
    switch (connector.status) {
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'testing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      default:
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
    }
  }

  function getStatusBadge(connector: Connector) {
    switch (connector.status) {
      case 'connected':
        return <Badge variant="default">Connected</Badge>;
      case 'disconnected':
        return <Badge variant="outline">Disconnected</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'testing':
        return <Badge variant="secondary">Testing...</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  }

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <AdminNav />
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <Spinner className="mx-auto mb-4" />
            <p className="text-muted-foreground">Loading connectors...</p>
          </div>
        </div>
      </div>
    );
  }

  const connectorTypes: ConnectorType[] = ['xsiam', 'defender', 'wiz', 'splunk', 'slack', 'email'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <AdminNav />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Plug className="h-8 w-8" />
            Connector Management
          </h1>
          <p className="text-muted-foreground">Manage integrations with external platforms</p>
        </div>
        <Button variant="outline" onClick={loadConnectors}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertDescription>
          Configure connectors in <strong>System Settings</strong> before testing connections.
        </AlertDescription>
      </Alert>

      {/* Connector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectorTypes.map(type => {
          const connector = connectors.find(c => c.type === type);
          const testResult = testResults[type];
          const isTesting = testing[type];

          return (
            <Card key={type}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{CONNECTOR_ICONS[type]}</span>
                    {CONNECTOR_LABELS[type]}
                  </CardTitle>
                  {connector && getStatusIcon(connector)}
                </div>
                <CardDescription>
                  {connector ? getStatusBadge(connector) : (
                    <Badge variant="outline">Not Configured</Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Connector Info */}
                {connector && (
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Enabled:</span>
                      <span>{connector.enabled ? 'Yes' : 'No'}</span>
                    </div>
                    {connector.last_sync && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Sync:</span>
                        <span>{new Date(connector.last_sync).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Test Result */}
                {testResult && (
                  <Alert variant={testResult.success ? 'default' : 'destructive'} className="py-2">
                    <AlertDescription className="flex items-center gap-2 text-sm">
                      {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      {testResult.message}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => testConnector(type)}
                    disabled={isTesting || !connector?.enabled}
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Test
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.href = '/admin/settings'}
                    title="Configure in Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold">{connectors.length}</div>
              <div className="text-sm text-muted-foreground">Total Connectors</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {connectors.filter(c => c.enabled).length}
              </div>
              <div className="text-sm text-muted-foreground">Enabled</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {connectors.filter(c => c.status === 'connected').length}
              </div>
              <div className="text-sm text-muted-foreground">Connected</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {connectors.filter(c => c.status === 'error').length}
              </div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
