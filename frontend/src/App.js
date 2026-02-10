import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// Theme & Timezone providers
import { ThemeProvider } from './contexts/ThemeContext';
import { TimezoneProvider } from './contexts/TimezoneContext';
import './index.css';
import './styles/kimi-theme.css';

// Auth
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

// Pages - Jyoti core
import Dashboard from './pages/Dashboard';
import NewsFeeds from './pages/NewsFeeds';
import Admin from './pages/Admin';
import AuditLogs from './pages/AuditLogs';
import UserProfile from './pages/UserProfile';
import Unauthorized from './pages/Unauthorized';
import UserManagement from './pages/UserManagement';
import SystemSettings from './pages/SystemSettings';
import RBACManager from './pages/RBACManager';
import GuardrailsManager from './pages/GuardrailsManager';
import ConnectorManagement from './pages/ConnectorManagement';
import GenAIManagement from './pages/GenAIManagement';
import SystemMonitoring from './pages/SystemMonitoring';

// Layout
import NavBar from './components/NavBar';

/**
 * AppLayout - Wraps authenticated pages with NavBar
 */
function AppLayout() {
  return (
    <>
      <NavBar />
      <div style={{ marginTop: 48 }}>
        <Outlet />
      </div>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <TimezoneProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Authenticated routes with layout */}
          <Route element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route path="/" element={<Navigate to="/news" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/news" element={<NewsFeeds />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/settings" element={<SystemSettings />} />
            <Route path="/admin/rbac" element={<RBACManager />} />
            <Route path="/admin/guardrails" element={<GuardrailsManager />} />
            <Route path="/admin/connectors" element={<ConnectorManagement />} />
            <Route path="/admin/genai" element={<GenAIManagement />} />
            <Route path="/admin/monitoring" element={<SystemMonitoring />} />
            <Route path="/admin/audit" element={<AuditLogs />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/news" replace />} />
        </Routes>
      </Router>
      </TimezoneProvider>
    </ThemeProvider>
  );
}

export default App;
