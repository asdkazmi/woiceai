import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import DashboardPage from './components/DashboardPage';
import KnowledgeBaseList from './components/KnowledgeBaseList';
import ConnectorsList from './components/ConnectorsList';
import ChatAIPage from './components/ChatAIPage';
import AgentsList from './components/AgentsList';
import AgentBuilder from './components/AgentBuilder';
import AgentChat from './components/AgentChat';
import AuthCallback from './components/AuthCallback';
import ErrorBoundary from './components/ErrorBoundary';
import { authService } from './services/authService';
import './App.css';
import { IStaticMethods } from 'preline/preline';

declare global {
  interface Window {
    HSStaticMethods: IStaticMethods;
  }
}

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Public Route Component (redirects to dashboard if already logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

function App() {
  // Initialize Preline UI
  useEffect(() => {
    const loadPreline = async () => {
      await import('preline/preline');
      if (window.HSStaticMethods) {
        window.HSStaticMethods.autoInit();
      }
    };
    loadPreline();
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/knowledge-bases/:kbId"
            element={
              <ProtectedRoute>
                <Layout>
                  <KnowledgeBaseList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/knowledge-bases"
            element={
              <ProtectedRoute>
                <Layout>
                  <KnowledgeBaseList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/knowledge-bases/:kbId/chat-ai/:chatAIId"
            element={
              <ProtectedRoute>
                <Layout>
                  <ChatAIPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/connectors"
            element={
              <ProtectedRoute>
                <Layout>
                  <ConnectorsList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents"
            element={
              <ProtectedRoute>
                <Layout>
                  <AgentsList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ErrorBoundary>
                    <AgentBuilder />
                  </ErrorBoundary>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents/:id/chat"
            element={
              <ProtectedRoute>
                <Layout>
                  <ErrorBoundary>
                    <AgentChat />
                  </ErrorBoundary>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/auth/callback"
            element={<AuthCallback />}
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
