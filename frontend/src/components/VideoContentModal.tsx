import React from 'react';
import { KnowledgeBaseContent } from '../services/knowledgeBaseService';
import { X } from 'lucide-react';
import IconButton from './ui/IconButton';

interface VideoContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: KnowledgeBaseContent | null;
}

const VideoContentModal: React.FC<VideoContentModalProps> = ({ isOpen, onClose, content }) => {
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
            {content.filename || content.content || 'Video Content'}
          </h2>
          <IconButton
            icon={X}
            onClick={onClose}
            variant="ghost"
            tooltip="Close"
          />
        </div>
        
        <div className="p-6 space-y-6">
          {/* Transcription Section */}
          {content.transcription && (
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-gray-800">Transcription</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {content.transcription}
                </p>
              </div>
            </div>
          )}

          {/* Scene Explanation Section */}
          {content.sceneExplanation && (
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-gray-800">Scene Explanation</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {content.sceneExplanation}
                </p>
              </div>
            </div>
          )}

          {/* Video Player */}
          {content.documentUrl && (
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-gray-800">Video</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <video
                  controls
                  className="w-full rounded-md"
                  style={{ maxHeight: '500px' }}
                >
                  <source src={content.documentUrl} type="video/mp4" />
                  <source src={content.documentUrl} type="video/webm" />
                  <source src={content.documentUrl} type="video/ogg" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          )}

          {/* Show message if no content available */}
          {!content.transcription && !content.sceneExplanation && !content.documentUrl && (
            <div className="text-center py-8 text-gray-500">
              <p>No content available for this video.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoContentModal;

