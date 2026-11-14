import React, { useState } from 'react';
import { knowledgeBaseService, CreateKnowledgeBaseData } from '../services/knowledgeBaseService';
import { X } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import Spinner from './ui/Spinner';

interface CreateKnowledgeBaseModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateKnowledgeBaseModal: React.FC<CreateKnowledgeBaseModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Knowledge base name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await knowledgeBaseService.create({ name });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create knowledge base');
      console.error('Error creating knowledge base:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] overflow-x-hidden overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white border border-gray-200 rounded-md shadow-lg w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Create Knowledge Base</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
                {error}
              </div>
            )}

            <div className="mb-4">
              <Input
                type="text"
                label="Knowledge Base Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter knowledge base name"
                required
                autoFocus
                disabled={loading}
                error={error && !name.trim() ? 'Knowledge base name is required' : undefined}
              />
              <p className="mt-1 text-sm text-gray-500">
                You can add content after creating the knowledge base.
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
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" color="white" className="mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Knowledge Base'
                )}
              </Button>
            </div>
          </form>
        </div>
    </div>
  );
};

export default CreateKnowledgeBaseModal;
