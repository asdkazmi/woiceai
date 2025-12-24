import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, LoginCredentials } from '../services/authService';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import Spinner from './ui/Spinner';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please provide a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await authService.login(formData);
      
      if (response.message === 'Login successful') {
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.response?.status === 422) {
        const validationErrors: { [key: string]: string } = {};
        if (error.response.data.errors) {
          error.response.data.errors.forEach((err: any) => {
            validationErrors[err.param || err.field] = err.msg || err.message;
          });
        }
        setErrors(validationErrors);
      } else if (error.response?.status === 401) {
        setGeneralError(error.response.data.message || 'Invalid email or password');
      } else {
        setGeneralError(error.response?.data?.message || 'An error occurred during login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-900">Woice AI</h1>
          <h2 className="mt-6 text-center text-2xl font-semibold text-gray-800">Welcome Back</h2>
          <p className="mt-2 text-center text-base text-gray-600">Sign in to continue to your account</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {generalError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {generalError}
            </div>
          )}

          <div className="space-y-4">
            <Input
              type="email"
              name="email"
              label="Email Address"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              icon={Mail}
              disabled={loading}
            />

            <div>
              <Input
                type={showPassword ? 'text' : 'password'}
                name="password"
                label="Password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                icon={Lock}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-10 text-gray-400 hover:text-gray-600"
                style={{ marginTop: '-32px' }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input type="checkbox" className="rounded-sm border-gray-300 text-primary focus:ring-primary" />
              <span className="ml-2 text-sm text-gray-600">Remember me</span>
            </label>
            <a href="#" className="text-sm text-primary hover:text-primary/80">
              Forgot Password?
            </a>
          </div>

          <div>
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" color="white" className="mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                window.location.href = `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}/api/auth/google`;
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M18.3333 10.2273C18.3333 9.51818 18.2727 8.83636 18.1636 8.18182H10V12.05H14.8455C14.6364 13.3 13.9273 14.3591 12.8182 15.0682V17.5773H15.9545C17.4545 16.1864 18.3333 14.2636 18.3333 10.2273Z" fill="#4285F4"/>
                <path d="M10 18.75C12.075 18.75 13.8409 18.0227 15.0455 16.7955L12.0091 14.2864C11.2273 14.8409 10.1818 15.2273 10 15.2273C8.00455 15.2273 6.29091 13.8409 5.64091 11.9773H2.35455V14.5682C3.54545 16.9091 6.09091 18.75 10 18.75Z" fill="#34A853"/>
                <path d="M5.64091 11.9773C5.40909 11.3409 5.27273 10.6591 5.27273 9.99999C5.27273 9.3409 5.40909 8.65909 5.64091 8.02273V5.43182H2.35455C1.65909 6.81818 1.25 8.36364 1.25 9.99999C1.25 11.6364 1.65909 13.1818 2.35455 14.5682L5.64091 11.9773Z" fill="#FBBC05"/>
                <path d="M10 4.77273C11.2045 4.77273 12.2727 5.15909 13.1364 5.90909L15.1091 3.93636C13.8409 2.75 12.075 2.25 10 2.25C6.09091 2.25 3.54545 4.09091 2.35455 6.43182L5.64091 8.02273C6.29091 6.15909 8.00455 4.77273 10 4.77273Z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-sm text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 1.66667C5.4 1.66667 1.66667 5.4 1.66667 10C1.66667 13.7333 4.13333 16.8333 7.5 17.9167V12.5H5.83333V10H7.5V8.33333C7.5 6.5 8.5 5.41667 10.1667 5.41667C10.9167 5.41667 11.6667 5.58333 11.6667 5.58333V7.5H10.75C9.83333 7.5 9.58333 8.08333 9.58333 8.66667V10H11.5833L11.25 12.5H9.58333V17.9167C12.95 16.8333 15.4167 13.7333 15.4167 10C15.4167 5.4 11.6 1.66667 10 1.66667Z" fill="#1877F2"/>
              </svg>
              Facebook
            </button>
          </div>

          <div className="text-center text-sm text-gray-600">
            Don't have an account? <a href="#" className="text-primary hover:text-primary/80">Sign up</a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
