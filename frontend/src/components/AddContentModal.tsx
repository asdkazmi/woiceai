import React, { useState } from 'react';
import { UpdateKnowledgeBaseData } from '../services/knowledgeBaseService';
import { X, Plus, Trash2, FileText, Link as LinkIcon, Music, Video, Image, UploadCloud, Type, ArrowLeft, Database } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import IconButton from './ui/IconButton';
import ProgressBar from './ui/ProgressBar';
import Spinner from './ui/Spinner';

interface AddContentModalProps {
  onClose: () => void;
  onAdd: (data: UpdateKnowledgeBaseData) => Promise<void>;
}

interface FileWithProgress {
  file: File;
  progress: number;
}

const AddContentModal: React.FC<AddContentModalProps> = ({ onClose, onAdd }) => {
  const [selectedType, setSelectedType] = useState<'files' | 'website' | 'text' | 'restricted' | null>(null);
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [urlDepth, setUrlDepth] = useState(1);
  const [urls, setUrls] = useState<Array<{ url: string; depth: number }>>([]);
  const [textInput, setTextInput] = useState('');
  const [texts, setTexts] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [audios, setAudios] = useState<FileWithProgress[]>([]);
  const [videos, setVideos] = useState<FileWithProgress[]>([]);
  const [images, setImages] = useState<FileWithProgress[]>([]);
  const [restrictedQueryInput, setRestrictedQueryInput] = useState('');
  const [restrictedQueries, setRestrictedQueries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);


  const removeFile = (
    index: number,
    list: FileWithProgress[],
    setter: React.Dispatch<React.SetStateAction<FileWithProgress[]>>
  ) => {
    setter(list.filter((_, i) => i !== index));
  };

  const handleAddUrl = () => {
    if (urlInput.trim()) {
      setUrls([...urls, { url: urlInput.trim(), depth: urlDepth }]);
      setUrlInput('');
    }
  };

  const handleRemoveUrl = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const handleAddText = () => {
    if (textInput.trim()) {
      setTexts([...texts, textInput.trim()]);
      setTextInput('');
    }
  };

  const startEditText = (index: number, value: string) => {
    setEditingIndex(index);
    setEditingValue(value);
  };

  const saveEditText = () => {
    if (editingIndex === null) return;
    const updated = [...texts];
    updated[editingIndex] = editingValue.trim();
    setTexts(updated);
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleRemoveText = (index: number) => {
    setTexts(texts.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingValue('');
    }
  };

  const handleAddRestrictedQuery = () => {
    if (restrictedQueryInput.trim()) {
      setRestrictedQueries([...restrictedQueries, restrictedQueryInput.trim()]);
      setRestrictedQueryInput('');
    }
  };

  const handleRemoveRestrictedQuery = (index: number) => {
    setRestrictedQueries(restrictedQueries.filter((_, i) => i !== index));
  };

  // Get total count of all added items
  const totalAddedItems = files.length + urls.length + texts.length + audios.length + videos.length + images.length + restrictedQueries.length;

  // Helper to get type icon (matching KnowledgeBaseDetail)
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <FileText size={20} className="text-blue-600" />;
      case 'url':
        return <LinkIcon size={20} className="text-green-600" />;
      case 'text':
        return <FileText size={20} className="text-purple-600" />;
      case 'audio':
        return <Music size={20} className="text-yellow-600" />;
      case 'video':
        return <Video size={20} className="text-red-600" />;
      case 'image':
        return <Image size={20} className="text-pink-600" />;
      case 'restricted_query':
        return <FileText size={20} className="text-orange-600" />;
      default:
        return <FileText size={20} className="text-gray-600" />;
    }
  };

  // Helper to get type color (matching KnowledgeBaseDetail)
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'file': return 'bg-blue-50';
      case 'url': return 'bg-green-50';
      case 'text': return 'bg-purple-50';
      case 'audio': return 'bg-yellow-50';
      case 'video': return 'bg-red-50';
      case 'image': return 'bg-pink-50';
      case 'restricted_query': return 'bg-orange-50';
      default: return 'bg-gray-50';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updateData: UpdateKnowledgeBaseData = {};

    // Include all content types, not just the selected one
    if (files.length > 0) updateData.files = files.map(f => f.file);
    if (audios.length > 0) updateData.audios = audios.map(f => f.file);
    if (videos.length > 0) updateData.videos = videos.map(f => f.file);
    if (images.length > 0) updateData.images = images.map(f => f.file);
    if (urls.length > 0) updateData.urls = urls;
    if (texts.length > 0) updateData.texts = texts;
    if (restrictedQueries.length > 0) updateData.restrictedQueries = restrictedQueries;

    if (Object.keys(updateData).length === 0) {
      setError('Please add at least one item');
      return;
    }

    try {
      setLoading(true);
      setUploading(true);
      setError(null);

      const allFiles = [...files, ...audios, ...videos, ...images];
      const updateProgress = () => {
        allFiles.forEach((fileWithProgress, index) => {
          const interval = setInterval(() => {
            if (fileWithProgress.progress < 90) {
              fileWithProgress.progress += 10;
              if (index < files.length) {
                setFiles(prev => [...prev]);
              } else if (index < files.length + audios.length) {
                setAudios(prev => [...prev]);
              } else if (index < files.length + audios.length + videos.length) {
                setVideos(prev => [...prev]);
              } else {
                setImages(prev => [...prev]);
              }
            } else {
              clearInterval(interval);
            }
          }, 200);
        });
      };
      updateProgress();

      await onAdd(updateData);

      allFiles.forEach(f => (f.progress = 100));

      setFiles([]);
      setUrls([]);
      setTexts([]);
      setAudios([]);
      setVideos([]);
      setImages([]);
      setRestrictedQueries([]);
      setUrlInput('');
      setTextInput('');
      setRestrictedQueryInput('');
      setEditingIndex(null);
      setEditingValue('');
      setSelectedType(null);

      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add content');
      console.error('Error adding content:', err);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-black/60 flex items-start sm:items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full sm:max-w-4xl">
        <div className="bg-white border border-gray-200 rounded-md shadow-lg max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h3 className="text-lg font-semibold text-gray-800">Add Content</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <X size={20} />
            </button>
        </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
                </div>
              )}

            {!selectedType && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  type="button"
                  className="border border-gray-200 rounded-md p-4 hover:border-primary hover:shadow-sm flex flex-col items-center gap-3"
                  onClick={() => setSelectedType('files')}
                  disabled={loading}
                >
                  <UploadCloud className="text-primary" size={28} />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-800">Files & Media</p>
                    <p className="text-xs text-gray-500">Documents, images, videos, audio</p>
                  </div>
                </button>
                <button
                  type="button"
                  className="border border-gray-200 rounded-md p-4 hover:border-primary hover:shadow-sm flex flex-col items-center gap-3"
                  onClick={() => setSelectedType('website')}
                  disabled={loading}
                >
                  <LinkIcon className="text-primary" size={28} />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-800">Website</p>
                    <p className="text-xs text-gray-500">Add URLs for crawling</p>
            </div>
                </button>
                <button
                  type="button"
                  className="border border-gray-200 rounded-md p-4 hover:border-primary hover:shadow-sm flex flex-col items-center gap-3"
                  onClick={() => setSelectedType('text')}
                  disabled={loading}
                >
                  <Type className="text-primary" size={28} />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-800">Enter Text Manually</p>
                    <p className="text-xs text-gray-500">Paste or type text entries</p>
                  </div>
                </button>
                <button
                  type="button"
                  className="border border-gray-200 rounded-md p-4 hover:border-primary hover:shadow-sm flex flex-col items-center gap-3"
                  onClick={() => setSelectedType('restricted')}
                  disabled={loading}
                >
                  <FileText className="text-primary" size={28} />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-800">Restricted Queries</p>
                    <p className="text-xs text-gray-500">Non-indexing restricted queries</p>
                  </div>
                </button>
                </div>
              )}

            {selectedType && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedType(null)}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft size={20} className="text-primary" />
                  <span className="text-sm font-medium text-gray-700">Back</span>
                </button>
              </div>
            )}

            {selectedType === 'files' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <FileText size={18} className="text-primary" /> Files & Media
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Documents (PDF, DOC, DOCX, XLSX, CSV, TXT)</label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                      onChange={(e) => {
                        const selectedFiles = Array.from(e.target.files || []);
                        const newFiles = selectedFiles.map(file => ({ file, progress: 0 }));
                        setFiles(prev => [...prev, ...newFiles]);
                        // Reset input to allow selecting the same file again
                        e.target.value = '';
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Images</label>
              <input
                type="file"
                multiple
                      accept="image/*"
                      onChange={(e) => {
                        const selectedFiles = Array.from(e.target.files || []);
                        const newFiles = selectedFiles.map(file => ({ file, progress: 0 }));
                        setImages(prev => [...prev, ...newFiles]);
                        e.target.value = '';
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Videos</label>
              <input
                type="file"
                multiple
                accept="video/*"
                      onChange={(e) => {
                        const selectedFiles = Array.from(e.target.files || []);
                        const newFiles = selectedFiles.map(file => ({ file, progress: 0 }));
                        setVideos(prev => [...prev, ...newFiles]);
                        e.target.value = '';
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90"
                      disabled={loading}
              />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Audios</label>
              <input
                type="file"
                multiple
                      accept="audio/*"
                      onChange={(e) => {
                        const selectedFiles = Array.from(e.target.files || []);
                        const newFiles = selectedFiles.map(file => ({ file, progress: 0 }));
                        setAudios(prev => [...prev, ...newFiles]);
                        e.target.value = '';
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90"
                      disabled={loading}
                    />
                  </div>
          </div>
              </div>
            )}

            {selectedType === 'website' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <LinkIcon size={18} className="text-primary" /> Website / URL
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                    <Input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com/page"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Depth</label>
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      value={urlDepth.toString()}
                      onChange={(e) => setUrlDepth(parseInt(e.target.value) || 0)}
                      disabled={loading}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Button variant="secondary" onClick={handleAddUrl} icon={Plus} iconPosition="left" disabled={loading}>
                      Add URL
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {selectedType === 'text' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <FileText size={18} className="text-primary" /> Enter Text Manually
                </h3>
                <div className="space-y-3">
                  <textarea
                    value={editingIndex !== null ? editingValue : textInput}
                    onChange={(e) =>
                      editingIndex !== null ? setEditingValue(e.target.value) : setTextInput(e.target.value)
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-sm text-base focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Enter your text here..."
                    disabled={loading}
                  />
                  <div className="flex items-center gap-2">
                    {editingIndex !== null ? (
                      <>
                        <Button variant="primary" onClick={saveEditText} icon={Plus} iconPosition="left" disabled={loading}>
                          Save Text
                        </Button>
                        <Button variant="secondary" onClick={() => { setEditingIndex(null); setEditingValue(''); }} disabled={loading}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button variant="secondary" onClick={handleAddText} icon={Plus} iconPosition="left" disabled={loading}>
                        Add Text
                      </Button>
                    )}
                    <p className="text-xs text-gray-500">Add multiple text entries, edit any entry inline.</p>
                  </div>
                </div>
              </div>
            )}

            {selectedType === 'restricted' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <FileText size={18} className="text-primary" /> Restricted Queries
                </h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Restricted queries are non-indexing. They will appear in the content table with "Non-indexing" status and will not be processed for vector search.
                  </p>
                </div>
                <div className="space-y-3">
                  <Input
                    type="text"
                    value={restrictedQueryInput}
                    onChange={(e) => setRestrictedQueryInput(e.target.value)}
                    placeholder="Enter a restricted query..."
                    disabled={loading}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRestrictedQuery();
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={handleAddRestrictedQuery} icon={Plus} iconPosition="left" disabled={loading}>
                      Add Restricted Query
                    </Button>
                    <p className="text-xs text-gray-500">Add multiple restricted queries.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Unified Added Content Section - Always visible when there's content */}
            {totalAddedItems > 0 && (
              <div className="space-y-4 border-t border-gray-200 pt-4">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Database size={18} className="text-primary" /> Added Content ({totalAddedItems})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {/* Files */}
                  {files.map((fileWithProgress, idx) => (
                    <div key={`file-${idx}`} className="bg-gray-50 rounded-md overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`p-1.5 rounded-md ${getTypeColor('file')} flex-shrink-0`}>
                            {getTypeIcon('file')}
                          </div>
                          <span className="truncate text-gray-700 text-sm">{fileWithProgress.file.name}</span>
                          {uploading && (
                            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{fileWithProgress.progress}%</span>
                          )}
                        </div>
                        <IconButton
                          icon={Trash2}
                          variant="ghost"
                          onClick={() => removeFile(idx, files, setFiles)}
                          tooltip="Remove"
                          size="sm"
                          disabled={loading}
                        />
                      </div>
                      {uploading && (
                        <div className="px-3 pb-2">
                          <ProgressBar
                            progress={fileWithProgress.progress}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* URLs */}
                  {urls.map((u, idx) => (
                    <div key={`url-${idx}`} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`p-1.5 rounded-md ${getTypeColor('url')} flex-shrink-0`}>
                          {getTypeIcon('url')}
                        </div>
                        <span className="truncate text-gray-700">{u.url}</span>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">Depth: {u.depth}</span>
                      </div>
                      <IconButton
                        icon={Trash2}
                        variant="ghost"
                        onClick={() => handleRemoveUrl(idx)}
                        tooltip="Remove"
                        size="sm"
                      />
                    </div>
                  ))}

                  {/* Texts */}
                  {texts.map((t, idx) => (
                    <div key={`text-${idx}`} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`p-1.5 rounded-md ${getTypeColor('text')} flex-shrink-0`}>
                          {getTypeIcon('text')}
                        </div>
                        {editingIndex === idx ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  saveEditText();
                                } else if (e.key === 'Escape') {
                                  setEditingIndex(null);
                                  setEditingValue('');
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={saveEditText}
                              disabled={loading}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingIndex(null);
                                setEditingValue('');
                              }}
                              disabled={loading}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <span className="truncate text-gray-700">{t}</span>
                        )}
                      </div>
                      {editingIndex !== idx && (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditText(idx, t)}
                            disabled={loading}
                          >
                            Edit
                          </Button>
                          <IconButton
                            icon={Trash2}
                            variant="ghost"
                            onClick={() => handleRemoveText(idx)}
                            tooltip="Remove"
                            size="sm"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Audios */}
                  {audios.map((audioWithProgress, idx) => (
                    <div key={`audio-${idx}`} className="bg-gray-50 rounded-md overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`p-1.5 rounded-md ${getTypeColor('audio')} flex-shrink-0`}>
                            {getTypeIcon('audio')}
                          </div>
                          <span className="truncate text-gray-700 text-sm">{audioWithProgress.file.name}</span>
                          {uploading && (
                            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{audioWithProgress.progress}%</span>
                          )}
                        </div>
                        <IconButton
                          icon={Trash2}
                          variant="ghost"
                          onClick={() => removeFile(idx, audios, setAudios)}
                          tooltip="Remove"
                          size="sm"
                          disabled={loading}
                        />
                      </div>
                      {uploading && (
                        <div className="px-3 pb-2">
                          <ProgressBar
                            progress={audioWithProgress.progress}
                            fileName={audioWithProgress.file.name}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Videos */}
                  {videos.map((videoWithProgress, idx) => (
                    <div key={`video-${idx}`} className="bg-gray-50 rounded-md overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`p-1.5 rounded-md ${getTypeColor('video')} flex-shrink-0`}>
                            {getTypeIcon('video')}
                          </div>
                          <span className="truncate text-gray-700 text-sm">{videoWithProgress.file.name}</span>
                          {uploading && (
                            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{videoWithProgress.progress}%</span>
                          )}
                        </div>
                        <IconButton
                          icon={Trash2}
                          variant="ghost"
                          onClick={() => removeFile(idx, videos, setVideos)}
                          tooltip="Remove"
                          size="sm"
                          disabled={loading}
                        />
                      </div>
                      {uploading && (
                        <div className="px-3 pb-2">
                          <ProgressBar
                            progress={videoWithProgress.progress}
                            fileName={videoWithProgress.file.name}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Images */}
                  {images.map((imageWithProgress, idx) => (
                    <div key={`image-${idx}`} className="bg-gray-50 rounded-md overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`p-1.5 rounded-md ${getTypeColor('image')} flex-shrink-0`}>
                            {getTypeIcon('image')}
                          </div>
                          <span className="truncate text-gray-700 text-sm">{imageWithProgress.file.name}</span>
                          {uploading && (
                            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{imageWithProgress.progress}%</span>
                          )}
                        </div>
                        <IconButton
                          icon={Trash2}
                          variant="ghost"
                          onClick={() => removeFile(idx, images, setImages)}
                          tooltip="Remove"
                          size="sm"
                          disabled={loading}
                        />
                      </div>
                      {uploading && (
                        <div className="px-3 pb-2">
                          <ProgressBar
                            progress={imageWithProgress.progress}
                            fileName={imageWithProgress.file.name}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Restricted Queries */}
                  {restrictedQueries.map((query, idx) => (
                    <div key={`restricted-${idx}`} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`p-1.5 rounded-md ${getTypeColor('restricted_query')} flex-shrink-0`}>
                          {getTypeIcon('restricted_query')}
                        </div>
                        <span className="truncate text-gray-700">{query}</span>
                      </div>
                      <IconButton
                        icon={Trash2}
                        variant="ghost"
                        onClick={() => handleRemoveRestrictedQuery(idx)}
                        tooltip="Remove"
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
              </Button>
              <Button type="submit" variant="primary" icon={UploadCloud} iconPosition="left" disabled={loading || totalAddedItems === 0}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" color="white" />
                    Uploading...
                  </div>
                ) : (
                  'Add Content'
                )}
              </Button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default AddContentModal;
