import React from 'react';
import { LucideIcon } from 'lucide-react';

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  tooltip?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  onClick,
  tooltip,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  const variantClasses = {
    primary: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    secondary: 'bg-gray-50 text-gray-600 hover:bg-gray-100',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-50',
  };

  const buttonClasses = `
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    rounded-md
    transition-colors
    disabled:opacity-50
    disabled:cursor-not-allowed
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={buttonClasses}
      aria-label={tooltip}
    >
      <Icon size={20} />
    </button>
  );

  if (tooltip) {
    return (
      <div
        className="hs-tooltip inline-block"
        data-hs-tooltip={tooltip}
      >
        {button}
      </div>
    );
  }

  return button;
};

export default IconButton;

