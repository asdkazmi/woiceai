import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Button from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const variantColors = {
    danger: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
  };

  const handleConfirm = () => {
    onConfirm();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] overflow-x-hidden overflow-y-auto bg-black/60 flex items-start sm:items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white border border-gray-200 rounded-md shadow-lg w-full sm:max-w-lg">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className={`${variantColors[variant]} flex-shrink-0 mt-0.5`} size={24} />
            <div className="text-base text-gray-700">{message}</div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              variant={variant === 'danger' ? 'danger' : 'primary'}
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

