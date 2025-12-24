import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gray',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  const variantClasses = {
    primary: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    danger: 'bg-red-50 text-red-700',
    gray: 'bg-gray-100 text-gray-700',
  };

  const badgeClasses = `
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    rounded-sm
    font-medium
    inline-flex
    items-center
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return <span className={badgeClasses}>{children}</span>;
};

export default Badge;

