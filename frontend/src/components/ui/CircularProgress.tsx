import React, { useState } from 'react';

interface CircularProgressProps {
  completed: number;
  pending: number;
  queued: number;
  processing: number;
  failed: number;
  total: number;
  size?: number;
  className?: string;
  isAnimating?: boolean;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  completed,
  pending,
  queued,
  processing,
  failed,
  total,
  size = 28,
  className = '',
  isAnimating = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  if (total === 0) {
    return (
      <div
        className={`relative ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 2}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="2.5"
          />
        </svg>
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap z-50 shadow-lg">
            <div className="font-semibold mb-1">Content Status</div>
            <div className="border-t border-gray-700 pt-1 mt-1 space-y-0.5">
              <div>Total: 0</div>
              <div className="text-green-400">Completed: 0</div>
              <div className="text-yellow-400">Pending: 0</div>
              <div className="text-yellow-400">Queued: 0</div>
              <div className="text-yellow-400">Processing: 0</div>
              <div className="text-red-400">Failed: 0</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const center = size / 2;
  const radius = size / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`transform -rotate-90 ${isAnimating ? 'animate-spin' : ''}`}
        style={isAnimating ? { animationDuration: '1.5s', animationTimingFunction: 'linear' } : {}}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="2.5"
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#1976D2"
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
      </div>
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap z-50 shadow-lg">
          <div className="font-semibold mb-1">Content Status</div>
          <div className="border-t border-gray-700 pt-1 mt-1 space-y-0.5">
            <div>Total: {total}</div>
            <div className="text-green-400">Completed: {completed}</div>
            {pending > 0 && <div className="text-yellow-400">Pending: {pending}</div>}
            {queued > 0 && <div className="text-yellow-400">Queued: {queued}</div>}
            {processing > 0 && <div className="text-yellow-400">Processing: {processing}</div>}
            {failed > 0 && <div className="text-red-400">Failed: {failed}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default CircularProgress;
