import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Suppress ResizeObserver loop errors - these are benign warnings from React Flow and @xyflow/react
const originalError = window.console.error;
window.console.error = (...args: any[]) => {
  if (
    args.length > 0 &&
    typeof args[0] === 'string' &&
    (args[0].includes('ResizeObserver loop') || 
     args[0].includes('ResizeObserver loop completed with undelivered notifications'))
  ) {
    return;
  }
  originalError.apply(console, args);
};

// Suppress ResizeObserver errors that come through the error event
window.addEventListener('error', (e) => {
  if (
    e.message &&
    (e.message.includes('ResizeObserver loop') ||
     e.message.includes('ResizeObserver loop completed with undelivered notifications'))
  ) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return;
  }
});

// Additional global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
  if (
    e.reason?.message &&
    (e.reason.message.includes('ResizeObserver loop') ||
     e.reason.message.includes('ResizeObserver loop completed with undelivered notifications'))
  ) {
    e.preventDefault();
  }
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <App />
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
