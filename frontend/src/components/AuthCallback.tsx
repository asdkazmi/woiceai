import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = React.useState('Processing authentication...');

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage('Authentication failed. Please try again.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      return;
    }

    if (token && email) {
      try {
        // Store token and user info
        localStorage.setItem('token', token);
        
        // Fetch user details
        authService.getCurrentUser()
          .then((user) => {
            localStorage.setItem('user', JSON.stringify(user));
            setStatus('success');
            setMessage('Login successful! Redirecting...');
            setTimeout(() => {
              navigate('/dashboard');
            }, 1500);
          })
          .catch((err) => {
            console.error('Error fetching user:', err);
            setStatus('error');
            setMessage('Failed to fetch user details. Please try again.');
            setTimeout(() => {
              navigate('/login');
            }, 3000);
          });
      } catch (error) {
        console.error('Error processing authentication:', error);
        setStatus('error');
        setMessage('An error occurred. Please try again.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } else {
      setStatus('error');
      setMessage('Invalid authentication response. Please try again.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }
  }, [searchParams, navigate]);

  return (
    <div className="auth-callback-container">
      <div className="auth-callback-card">
        {status === 'loading' && (
          <>
            <div className="spinner-large"></div>
            <h2>{message}</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="success-icon">✓</div>
            <h2>{message}</h2>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="error-icon">✕</div>
            <h2>{message}</h2>
            <button onClick={() => navigate('/login')} className="retry-button">
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;

