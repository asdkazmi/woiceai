import React from 'react';
import { KnowledgeBaseContent } from '../services/knowledgeBaseService';
import { X } from 'lucide-react';
import IconButton from './ui/IconButton';

interface ImageContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: KnowledgeBaseContent | null;
}

const ImageContentModal: React.FC<ImageContentModalProps> = ({ isOpen, onClose, content }) => {
  if (!isOpen || !content) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-md shadow-lg border border-gray-200 w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {content.filename || content.content || 'Image Content'}
          </h2>
          <IconButton
            icon={X}
            onClick={onClose}
            variant="ghost"
            tooltip="Close"
          />
        </div>
        
        <div className="p-6 space-y-6">
          {/* Image Section */}
          {content.documentUrl && (
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-gray-800">Image</h3>
              <div className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded-md p-4">
                <img
                  src={content.documentUrl}
                  alt={content.filename || content.content || 'Image'}
                  className="max-w-full max-h-96 object-contain rounded-md"
                />
              </div>
            </div>
          )}

          {/* Explanation Section */}
          {content.explanation && (
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-gray-800">Explanation</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {content.explanation}
                </p>
              </div>
            </div>
          )}

          {/* Show message if no content available */}
          {!content.documentUrl && !content.explanation && (
            <div className="text-center py-8 text-gray-500">
              <p>No content available for this image.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageContentModal;

