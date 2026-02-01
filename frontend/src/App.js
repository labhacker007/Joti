import React, { useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme } from 'antd';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ArticleQueue from './pages/ArticleQueue';
import NewsFeeds from './pages/NewsFeeds';
import Intelligence from './pages/Intelligence';
import Hunts from './pages/Hunts';
import Reports from './pages/Reports';
import Sources from './pages/Sources';
import Watchlist from './pages/Watchlist';
import AuditLogs from './pages/AuditLogs';
import Admin from './pages/Admin';
import Unauthorized from './pages/Unauthorized';
import ProtectedRoute from './components/ProtectedRoute';
import NavBar from './components/NavBar';
import Chatbot from './components/Chatbot';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { TimezoneProvider } from './context/TimezoneContext';
import { useAuthStore } from './store';
import { authAPI } from './api/client';
import './App.css';

// Inner App component that uses theme context
function AppContent() {
  const { accessToken, refreshToken, setUser, setTokens, logout } = useAuthStore();
  const { currentTheme, isDark } = useTheme();

  useEffect(() => {
    const init = async () => {
      if (!accessToken && !refreshToken) return;
      try {
        const resp = await authAPI.me();
        setUser(resp.data);
      } catch (err) {
        if (err.response?.status === 401 && refreshToken) {
          try {
            const r = await authAPI.refresh(refreshToken);
            setTokens(r.data.access_token, refreshToken);
            const me = await authAPI.me();
            setUser(me.data);
          } catch (err2) {
            logout();
          }
        } else {
          logout();
        }
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dynamic theme configuration based on current theme
  const themeConfig = useMemo(() => ({
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: currentTheme.antd.colorPrimary,
      colorSuccess: currentTheme.antd.colorSuccess,
      colorWarning: currentTheme.antd.colorWarning,
      colorError: currentTheme.antd.colorError,
      colorInfo: currentTheme.antd.colorInfo,
      borderRadius: currentTheme.antd.borderRadius,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      ...(isDark ? {
        colorBgBase: currentTheme.colors.bgBody,
        colorTextBase: currentTheme.colors.textPrimary,
      } : {}),
    },
    components: {
      Card: {
        borderRadiusLG: 12,
        ...(isDark ? {
          colorBgContainer: currentTheme.colors.bgCard,
          colorBorderSecondary: currentTheme.colors.border,
        } : {}),
      },
      Button: {
        borderRadius: 6,
        controlHeight: 36,
      },
      Input: {
        borderRadius: 6,
        ...(isDark ? {
          colorBgContainer: currentTheme.colors.bgCard,
          colorBorder: currentTheme.colors.border,
        } : {}),
      },
      Select: {
        borderRadius: 6,
        ...(isDark ? {
          colorBgContainer: currentTheme.colors.bgCard,
          colorBorder: currentTheme.colors.border,
        } : {}),
      },
      Table: {
        borderRadius: 8,
        ...(isDark ? {
          colorBgContainer: currentTheme.colors.bgCard,
          colorBorderSecondary: currentTheme.colors.border,
        } : {}),
      },
      Menu: {
        colorBgContainer: 'transparent',
      },
    },
  }), [currentTheme, isDark]);

  return (
    <ConfigProvider theme={themeConfig}>
      <Router>
        <NavBar />
        <Chatbot />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* News & Feeds - Feedly-style reader */}
          <Route
            path="/news"
            element={
              <ProtectedRoute>
                <NewsFeeds />
              </ProtectedRoute>
            }
          />
          
          <Route 
            path="/articles" 
            element={
              <ProtectedRoute>
                <ArticleQueue />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/intelligence" 
            element={
              <ProtectedRoute>
                <Intelligence />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/hunts" 
            element={
              <ProtectedRoute>
                <Hunts />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/sources" 
            element={
              <ProtectedRoute>
                <Sources />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/watchlist" 
            element={
              <ProtectedRoute>
                <Watchlist />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/audit" 
            element={
              <ProtectedRoute>
                <AuditLogs />
              </ProtectedRoute>
            } 
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

// Main App component wrapped with ThemeProvider and TimezoneProvider
function App() {
  return (
    <ThemeProvider>
      <TimezoneProvider>
        <AppContent />
      </TimezoneProvider>
    </ThemeProvider>
  );
}

export default App;
