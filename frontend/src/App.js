import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// Theme system
import { ThemeProvider } from './styles/themes/ThemeContext';
import './styles/themes/theme-variables.css';
import './styles/themes/theme-components.css';

// Auth
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

// Pages - Jyoti core
import Dashboard from './pages/Dashboard';
import NewsFeeds from './pages/NewsFeeds';
import Sources from './pages/Sources';
import Watchlist from './pages/Watchlist';
import Admin from './pages/Admin';
import AuditLogs from './pages/AuditLogs';
import UserProfile from './pages/UserProfile';
import Unauthorized from './pages/Unauthorized';

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
            <Route path="/sources" element={<Sources />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/audit" element={<AuditLogs />} />
            <Route path="/admin" element={<Admin />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/news" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
