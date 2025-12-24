import React, { useState } from 'react';
import { UpdateKnowledgeBaseData } from '../services/knowledgeBaseService';
import { X, Plus, Trash2, FileText, Link as LinkIcon, Music, Video, Image, UploadCloud, Type, ArrowLeft } from 'lucide-react';
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
  const [selectedType, setSelectedType] = useState<'files' | 'website' | 'text' | null>(null);
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<FileWithProgress[]>>
  ) => {
    const selectedFiles = Array.from(e.target.files || []);
    setter(selectedFiles.map(file => ({ file, progress: 0 })));
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updateData: UpdateKnowledgeBaseData = {};

    if (selectedType === 'files') {
      if (files.length > 0) updateData.files = files.map(f => f.file);
      if (audios.length > 0) updateData.audios = audios.map(f => f.file);
      if (videos.length > 0) updateData.videos = videos.map(f => f.file);
      if (images.length > 0) updateData.images = images.map(f => f.file);
    }
    if (selectedType === 'website') {
      if (urls.length > 0) updateData.urls = urls;
    }
    if (selectedType === 'text') {
      if (texts.length > 0) updateData.texts = texts;
    }

    if (!selectedType || Object.keys(updateData).length === 0) {
      setError('Please select a type and add at least one item');
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
      setUrlInput('');
      setTextInput('');
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      onChange={(e) => handleFileChange(e, setFiles)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90"
                      disabled={loading}
                    />
                    {files.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {files.map((fileWithProgress, i) => (
                          <div key={i} className="bg-gray-50 rounded-md p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-700 truncate flex-1">{fileWithProgress.file.name}</span>
                              <IconButton
                                icon={Trash2}
                                onClick={() => removeFile(i, files, setFiles)}
                                variant="danger"
                                size="sm"
                              />
                            </div>
                            {uploading && (
                              <ProgressBar
                                progress={fileWithProgress.progress}
                                fileName={fileWithProgress.file.name}
                              />
                            )}
                    </div>
                  ))}
                </div>
              )}
            </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Images</label>
              <input
                type="file"
                multiple
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setImages)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90"
                      disabled={loading}
                    />
                    {images.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {images.map((fileWithProgress, i) => (
                          <div key={i} className="bg-gray-50 rounded-md p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-700 truncate flex-1">{fileWithProgress.file.name}</span>
                              <IconButton
                                icon={Trash2}
                                onClick={() => removeFile(i, images, setImages)}
                                variant="danger"
                                size="sm"
                              />
                            </div>
                            {uploading && (
                              <ProgressBar
                                progress={fileWithProgress.progress}
                                fileName={fileWithProgress.file.name}
                              />
                            )}
                          </div>
                  ))}
                </div>
              )}
            </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Videos</label>
              <input
                type="file"
                multiple
                accept="video/*"
                      onChange={(e) => handleFileChange(e, setVideos)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90"
                      disabled={loading}
              />
              {videos.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {videos.map((fileWithProgress, i) => (
                          <div key={i} className="bg-gray-50 rounded-md p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-700 truncate flex-1">{fileWithProgress.file.name}</span>
                              <IconButton
                                icon={Trash2}
                                onClick={() => removeFile(i, videos, setVideos)}
                                variant="danger"
                                size="sm"
                              />
                            </div>
                            {uploading && (
                              <ProgressBar
                                progress={fileWithProgress.progress}
                                fileName={fileWithProgress.file.name}
                              />
                            )}
                          </div>
                  ))}
                </div>
              )}
            </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Audios</label>
              <input
                type="file"
                multiple
                      accept="audio/*"
                      onChange={(e) => handleFileChange(e, setAudios)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90"
                      disabled={loading}
                    />
                    {audios.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {audios.map((fileWithProgress, i) => (
                          <div key={i} className="bg-gray-50 rounded-md p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-700 truncate flex-1">{fileWithProgress.file.name}</span>
                              <IconButton
                                icon={Trash2}
                                onClick={() => removeFile(i, audios, setAudios)}
                                variant="danger"
                                size="sm"
                              />
                            </div>
                            {uploading && (
                              <ProgressBar
                                progress={fileWithProgress.progress}
                                fileName={fileWithProgress.file.name}
                              />
                            )}
                          </div>
                  ))}
                </div>
              )}
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
                      min={1}
                      max={5}
                      value={urlDepth.toString()}
                      onChange={(e) => setUrlDepth(parseInt(e.target.value) || 1)}
                      disabled={loading}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Button variant="secondary" onClick={handleAddUrl} icon={Plus} iconPosition="left" disabled={loading}>
                      Add URL
                    </Button>
                  </div>
                </div>
                {urls.length > 0 && (
                  <div className="space-y-2">
                    {urls.map((u, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                        <div className="flex items-center gap-2">
                          <LinkIcon size={16} className="text-primary" />
                          <span className="truncate">{u.url}</span>
                          <span className="text-xs text-gray-500">Depth: {u.depth}</span>
                        </div>
                        <IconButton
                          icon={Trash2}
                          variant="ghost"
                          onClick={() => handleRemoveUrl(idx)}
                          tooltip="Remove"
                        />
                      </div>
                    ))}
                  </div>
                )}
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
                {texts.length > 0 && (
                  <div className="space-y-2">
                    {texts.map((t, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                        <span className="truncate">{t}</span>
                        <div className="flex items-center gap-2">
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
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
              </Button>
              <Button type="submit" variant="primary" icon={UploadCloud} iconPosition="left" disabled={loading || !selectedType}>
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
