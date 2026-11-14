import React, { useState, useEffect } from 'react';
import { knowledgeBaseService } from '../services/knowledgeBaseService';

interface ReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  reference: {
    type?: string;
    title?: string;
    content?: string;
    document_url?: string | null;
    s3_Key?: string;
    pageNo?: number;
    contentId?: number | null;
  } | null;
}

const ReferenceModal: React.FC<ReferenceModalProps> = ({ isOpen, onClose, reference }) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && reference) {
      const refType = reference.type?.toLowerCase() || '';
      
      // Fetch text content if it's a text reference with contentId
      if (refType === 'text' && reference.contentId) {
        setLoading(true);
        setError(null);
        setTextContent(null);
        
        knowledgeBaseService.getContentById(reference.contentId)
          .then((content) => {
            setTextContent(content.textContent);
          })
          .catch((err) => {
            console.error('Error fetching text content:', err);
            setError('Failed to load text content');
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        // Reset state when modal closes or reference changes
        setTextContent(null);
        setError(null);
        setLoading(false);
      }
    }
  }, [isOpen, reference]);

  if (!isOpen || !reference) return null;

  const renderContent = () => {
    const refType = reference.type?.toLowerCase() || '';

    if (refType === 'text') {
      // Text reference - show content in modal
      return (
        <div className="reference-text-content">
          {/* <h3>{reference.title || 'Text Reference'}</h3> */}
          {loading && (
            <div className="reference-loading">Loading text content...</div>
          )}
          {error && (
            <div className="reference-error">{error}</div>
          )}
          {!loading && !error && (
            <div className="reference-text-body">
              {textContent || reference.content || 'No content available'}
            </div>
          )}
        </div>
      );
    } else if (refType === 'audio' && reference.document_url) {
      // Audio reference - play in modal
      return (
        <div className="reference-audio-content">
          <h3>{reference.title || 'Audio Reference'}</h3>
          <audio controls className="reference-audio-player">
            <source src={reference.document_url} type="audio/mpeg" />
            <source src={reference.document_url} type="audio/wav" />
            <source src={reference.document_url} type="audio/mp3" />
            Your browser does not support the audio element.
          </audio>
        </div>
      );
    } else if (refType === 'video' && reference.document_url) {
      // Video reference - play in modal
      return (
        <div className="reference-video-content">
          <video controls className="reference-video-player" style={{ margin: '0 auto' }}>
            <source src={reference.document_url} type="video/mp4" />
            <source src={reference.document_url} type="video/webm" />
            <source src={reference.document_url} type="video/ogg" />
            Your browser does not support the video element.
          </video>
          <h3 style={{ textAlign: 'center', marginTop: '10px' }}>{reference.title || 'Video Reference'}</h3>
        </div>
      );
    } else if (refType === 'image' && reference.document_url) {
      // Image reference - show in modal
      return (
        <div className="reference-image-content">
          <img 
            src={reference.document_url} 
            alt={reference.title || 'Reference image'} 
            className="reference-image"
            style={{ margin: '0 auto' }}
          />
          <h3 style={{ textAlign: 'center', marginTop: '10px' }}>{reference.title || 'Image Reference'}</h3>
        </div>
      );
    } else {
      // Fallback - show title and content if available
      return (
        <div className="reference-fallback-content">
          <h3>{reference.title || 'Reference'}</h3>
          {reference.content && (
            <div className="reference-text-body">
              {reference.content}
            </div>
          )}
          {reference.document_url && (
            <a 
              href={reference.document_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="reference-link"
            >
              Open Document
            </a>
          )}
        </div>
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-md shadow-lg border border-gray-200 w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Reference Details</h2>
          <button
            className="text-gray-500 hover:text-gray-700 text-xl leading-none"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-4 space-y-3 text-gray-800">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ReferenceModal;

