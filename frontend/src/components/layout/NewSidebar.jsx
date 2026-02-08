/**
 * NewSidebar Component
 * Collapsible sidebar with navigation
 */

import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../styles/themes/ThemeContext';
import {
  LayoutDashboard,
  FileText,
  Target,
  Shield,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
  BarChart3,
  Zap,
  Database
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'News Feeds', path: '/news', icon: FileText },
  { name: 'Sources', path: '/sources', icon: Database, adminOnly: true },
  { name: 'Watchlist', path: '/watchlist', icon: Target },
  { name: 'Audit Logs', path: '/audit', icon: Shield, adminOnly: true },
  { name: 'Admin', path: '/admin', icon: Settings, adminOnly: true },
  { name: 'Profile', path: '/profile', icon: Users },
];

export function NewSidebar({ 
  collapsed = false, 
  onToggle,
  userRole = 'admin'
}) {
  const { currentTheme } = useTheme();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState({});

  // Filter navigation based on role
  const filteredNav = navigation.filter(item => {
    if (item.adminOnly && userRole !== 'admin' && userRole !== 'ADMIN') return false;
    return true;
  });

  return (
    <aside className={`new-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Toggle Button */}
      <button className="sidebar-toggle" onClick={onToggle}>
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.name : ''}
                >
                  <Icon className="nav-icon w-5 h-5" />
                  {!collapsed && (
                    <>
                      <span className="nav-text">{item.name}</span>
                      {isActive && <div className="nav-indicator" />}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* System Status (bottom) */}
      {!collapsed && (
        <div className="sidebar-footer">
          <div className="system-status">
            <div className="status-header">
              <Database className="w-4 h-4" />
              <span>System Status</span>
            </div>
            <div className="status-items">
              <div className="status-item">
                <span className="status-dot online" />
                <span>Ingestion: Active</span>
              </div>
              <div className="status-item">
                <span className="status-dot online" />
                <span>AI Engine: Ready</span>
              </div>
              <div className="status-item">
                <span className="status-dot warning" />
                <span>Connector: Syncing</span>
              </div>
            </div>
          </div>
          
          <div className="version-info">
            <span>Parshu v2.4.1</span>
            <span className="theme-badge">{currentTheme}</span>
          </div>
        </div>
      )}
    </aside>
  );
}

export default NewSidebar;
