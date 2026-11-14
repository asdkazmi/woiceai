import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  icon: Icon,
  iconPosition = 'left',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-2.5 text-lg',
  };

  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary/90',
    secondary: 'bg-white text-primary border border-primary hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent text-primary hover:bg-gray-50',
  };

  const buttonClasses = `
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    rounded-sm
    font-medium
    transition-colors
    disabled:opacity-50
    disabled:cursor-not-allowed
    flex items-center justify-center gap-2
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={buttonClasses}
    >
      {Icon && iconPosition === 'left' && <Icon size={20} />}
      {children}
      {Icon && iconPosition === 'right' && <Icon size={20} />}
    </button>
  );
};

export default Button;

