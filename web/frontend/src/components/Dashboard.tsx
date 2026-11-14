import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { authService, User } from '../services/authService';
import KnowledgeBaseList from './KnowledgeBaseList';
import ConnectorsList from './ConnectorsList';

type MenuOption = 'knowledge-bases' | 'connectors';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Determine active menu from URL
  const getActiveMenuFromPath = (): MenuOption => {
    const path = location.pathname;
    if (path.includes('/connectors')) return 'connectors';
    return 'knowledge-bases';
  };
  
  const [activeMenu, setActiveMenu] = useState<MenuOption>(getActiveMenuFromPath());
  
  // Update active menu when route changes
  useEffect(() => {
    setActiveMenu(getActiveMenuFromPath());
  }, [location.pathname]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = authService.getStoredUser();
        if (storedUser) {
          setUser(storedUser);
          // Optionally fetch fresh user data
          try {
            const freshUser = await authService.getCurrentUser();
            setUser(freshUser);
          } catch (error) {
            console.error('Failed to fetch user:', error);
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const menuOptions: { id: MenuOption; label: string; path: string }[] = [
    { id: 'knowledge-bases', label: 'Knowledge Bases', path: '/dashboard/knowledge-bases' },
    { id: 'connectors', label: 'Connectors', path: '/dashboard/connectors' },
  ];

  const handleMenuClick = (option: MenuOption, path: string) => {
    setActiveMenu(option);
    navigate(path);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Woice AI</h1>
        <div className="header-right">
          {user && (
            <span className="user-name">
              {user.firstName} {user.lastName}
            </span>
          )}
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-layout">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            {menuOptions.map((option) => (
              <button
                key={option.id}
                className={`sidebar-menu-item ${
                  activeMenu === option.id ? 'active' : ''
                }`}
                onClick={() => handleMenuClick(option.id, option.path)}
              >
                {option.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="dashboard-main">
          <Routes>
            <Route path="/knowledge-bases" element={<KnowledgeBaseList />} />
            <Route path="/connectors" element={<ConnectorsList />} />
            <Route path="/" element={<Navigate to="/dashboard/knowledge-bases" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;

