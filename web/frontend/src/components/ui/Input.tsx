import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  helperText?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  icon: Icon,
  helperText,
  className = '',
  ...props
}) => {
  const inputClasses = `
    py-2 px-3
    block
    w-full
    border
    ${error ? 'border-red-300' : 'border-gray-200'}
    rounded-sm
    text-base
    focus:border-primary
    focus:ring-1
    focus:ring-primary
    disabled:opacity-50
    disabled:pointer-events-none
    ${Icon ? 'pl-10' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none pl-3">
            <Icon size={20} className="text-gray-400" />
          </div>
        )}
        <input
          className={inputClasses}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export default Input;

