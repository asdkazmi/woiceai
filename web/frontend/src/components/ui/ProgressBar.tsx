import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  fileName?: string;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  fileName,
  className = '',
}) => {
  return (
    <div className={`w-full ${className}`}>
      {fileName && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600 truncate">{fileName}</span>
          <span className="text-sm text-gray-600 ml-2">{Math.round(progress)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;

