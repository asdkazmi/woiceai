import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';

interface CreateChatAINameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  existingNames?: string[];
}

const CreateChatAINameModal: React.FC<CreateChatAINameModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  existingNames = [],
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError(null);
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setError('Name is required');
      return;
    }

    // Check for duplicate name
    if (existingNames.some(existingName => existingName.toLowerCase() === trimmedName.toLowerCase())) {
      setError('A Chat AI with this name already exists in this knowledge base');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onCreate(trimmedName);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create Chat AI');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-x-hidden overflow-y-auto bg-black/60 flex items-start sm:items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white border border-gray-200 rounded-md shadow-lg w-full sm:max-w-lg">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Create Chat AI</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chat AI Name
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="Enter Chat AI name"
                disabled={loading}
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                The name must be unique for Chat AIs in this knowledge base.
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !name.trim()}
              >
                {loading ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChatAINameModal;

