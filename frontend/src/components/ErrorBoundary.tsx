import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Check if this is a ResizeObserver error - if so, don't show error UI
    if (
      error.message &&
      (error.message.includes('ResizeObserver loop') ||
       error.message.includes('ResizeObserver loop completed with undelivered notifications'))
    ) {
      // Suppress this specific error - it's benign
      return {
        hasError: false,
        error: null,
      };
    }

    // For other errors, update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Check if this is a ResizeObserver error
    if (
      error.message &&
      (error.message.includes('ResizeObserver loop') ||
       error.message.includes('ResizeObserver loop completed with undelivered notifications'))
    ) {
      // Suppress this specific error - it's benign
      console.debug('Suppressed ResizeObserver error:', error.message);
      return;
    }

    // Log other errors
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Something went wrong
              </h2>
              <p className="text-gray-600 mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;


