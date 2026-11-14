import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { knowledgeBaseService, KnowledgeBase, KnowledgeBaseContent, UpdateKnowledgeBaseData, PaginationMeta } from '../services/knowledgeBaseService';
import { chatAIService, ChatAI, CreateChatAIData } from '../services/chatAIService';
import { connectorService, Connector } from '../services/connectorService';
import AddContentModal from './AddContentModal';
import ChatAIInterface from './ChatAIInterface';
import ReferenceModal from './ReferenceModal';
import UrlTreeModal from './UrlTreeModal';
import VideoContentModal from './VideoContentModal';
import ImageContentModal from './ImageContentModal';
import AudioContentModal from './AudioContentModal';
import CreateChatAINameModal from './CreateChatAINameModal';
import ConfirmModal from './ui/ConfirmModal';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Input from './ui/Input';
import IconButton from './ui/IconButton';
import Pagination from './ui/Pagination';
import Spinner from './ui/Spinner';
import { 
  ArrowLeft, Plus, Search, Trash2, Edit, Eye, FileText, Link as LinkIcon, 
  Music, Video, Image, Database, Bot, Settings, X, RefreshCw
} from 'lucide-react';

interface KnowledgeBaseDetailProps {
  knowledgeBase: KnowledgeBase;
  onBack?: () => void;
  onUpdate: () => void;
  onDelete: (id: number) => void;
}

const KnowledgeBaseDetail: React.FC<KnowledgeBaseDetailProps> = ({
  knowledgeBase: initialKB,
  onBack,
  onUpdate,
  onDelete,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>(initialKB);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<(number | string)[]>([]);
  const [chatAIs, setChatAIs] = useState<ChatAI[]>([]);
  const [selectedChatAI, setSelectedChatAI] = useState<ChatAI | null>(null);
  const [selectedReference, setSelectedReference] = useState<any | null>(null);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null);
  const [isUrlTreeModalOpen, setIsUrlTreeModalOpen] = useState(false);
  const [selectedVideoContent, setSelectedVideoContent] = useState<KnowledgeBaseContent | null>(null);
  const [selectedImageContent, setSelectedImageContent] = useState<KnowledgeBaseContent | null>(null);
  const [selectedAudioContent, setSelectedAudioContent] = useState<KnowledgeBaseContent | null>(null);
  
  // Filters and pagination
  const tabFromUrl = searchParams.get('tab') as 'content' | 'chat-ais' | 'settings' | null;
  const [activeTab, setActiveTab] = useState<'content' | 'chat-ais' | 'settings'>(
    tabFromUrl && ['content', 'chat-ais', 'settings'].includes(tabFromUrl) ? tabFromUrl : 'content'
  );
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [contentPage, setContentPage] = useState(1);
  const [contentPagination, setContentPagination] = useState<PaginationMeta | undefined>();
  const [showDeleteKBModal, setShowDeleteKBModal] = useState(false);
  const [showDeleteContentModal, setShowDeleteContentModal] = useState(false);
  const [showDeleteChatAIModal, setShowDeleteChatAIModal] = useState(false);
  const [chatAIToDelete, setChatAIToDelete] = useState<ChatAI | null>(null);
  const [showCreateChatAINameModal, setShowCreateChatAINameModal] = useState(false);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [wavePhase, setWavePhase] = useState(0);
  const perPage = 20;

  useEffect(() => {
    loadKnowledgeBase();
    loadChatAIs();
    loadConnectors();
  }, [initialKB.id, contentPage, contentTypeFilter, statusFilter, searchQuery]);

  // Update active tab from URL parameter
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as 'content' | 'chat-ais' | 'settings' | null;
    if (tabFromUrl && ['content', 'chat-ais', 'settings'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    // Poll more frequently if knowledge base is deleting
    const pollInterval = knowledgeBase.status === 'deleting' ? 3000 : 10000;
    const interval = setInterval(() => {
      if (activeTab === 'content' || knowledgeBase.status === 'deleting') {
        loadKnowledgeBase();
      }
    }, pollInterval);
    return () => clearInterval(interval);
  }, [initialKB.id, activeTab, knowledgeBase.status]);

  const loadKnowledgeBase = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await knowledgeBaseService.getById(initialKB.id, {
        page: contentPage,
        perPage,
        search: searchQuery || undefined,
        type: contentTypeFilter !== 'all' ? contentTypeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setKnowledgeBase(result.knowledgeBase);
      setContentPagination(result.pagination);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load knowledge base');
      console.error('Error loading knowledge base:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadChatAIs = async () => {
    try {
      const chatAIsData = await chatAIService.getAllByKnowledgeBase(initialKB.id);
      setChatAIs(chatAIsData);
    } catch (err: any) {
      console.error('Error loading chat AIs:', err);
    }
  };

  const loadConnectors = async () => {
    try {
      const connectorsData = await connectorService.getAll();
      setConnectors(connectorsData);
    } catch (err: any) {
      console.error('Error loading connectors:', err);
    }
  };

  const handleCreateChatAI = async (name: string) => {
    try {
      // Get default model from connectors
      let defaultLlmName = 'qwen';
      let defaultModelName = 'Qwen-14b-Instruct';
      
      if (connectors.length > 0) {
        const qwenConnector = connectors.find(c => c.llmName === 'qwen');
        if (qwenConnector && qwenConnector.models && qwenConnector.models.length > 0) {
          const activeModel = qwenConnector.models.find(m => m.is_active === 1) || qwenConnector.models[0];
          if (activeModel) {
            defaultModelName = activeModel.model;
          }
        }
      }

      // Default settings matching ChatAIPage defaults
      const defaultSettings = {
        instruction: null,
        externalKnowledge: true,
        enableReference: false,
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxTokens: 700,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        stop: [],
        retrievalLimit: 6,
        retrievalScore: 0.6,
      };

      const newChatAI = await chatAIService.create(initialKB.id, {
        name,
        llmName: defaultLlmName,
        modelName: defaultModelName,
        settings: defaultSettings,
      });

      // Navigate to the Chat AI page
      navigate(`/knowledge-bases/${initialKB.id}/chat-ai/${newChatAI.id}`);
    } catch (err: any) {
      throw err; // Re-throw to let the modal handle the error
    }
  };

  const handleDeleteChatAI = async () => {
    if (!chatAIToDelete) return;

    try {
      setLoading(true);
      await chatAIService.delete(chatAIToDelete.id!);
      setShowDeleteChatAIModal(false);
      setChatAIToDelete(null);
      await loadChatAIs();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete Chat AI');
      console.error('Error deleting Chat AI:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContent = async (updateData: UpdateKnowledgeBaseData) => {
    await knowledgeBaseService.update(knowledgeBase.id, updateData);
    await loadKnowledgeBase();
    setShowAddContentModal(false);
  };

  const handleDeleteContent = async () => {
    if (selectedItems.length === 0) return;

    try {
      setLoading(true);
      await knowledgeBaseService.update(knowledgeBase.id, {
        deleteIds: selectedItems,
      });
      setSelectedItems([]);
      setShowDeleteContentModal(false);
      await loadKnowledgeBase();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete content');
      console.error('Error deleting content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryContent = async (contentId: number) => {
    try {
      setLoading(true);
      setError(null);
      await knowledgeBaseService.retryContent(contentId);
      await loadKnowledgeBase();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to retry content');
      console.error('Error retrying content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKB = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Deleting knowledge base:', knowledgeBase.id);
      await knowledgeBaseService.delete(knowledgeBase.id);
      console.log('Knowledge base delete API call successful');
      // Close modal after successful API call
      setShowDeleteKBModal(false);
      // Call onDelete callback to update parent and navigate
      onDelete(knowledgeBase.id);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete knowledge base';
      setError(errorMessage);
      console.error('Error deleting knowledge base:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      // Keep modal open on error so user can see the error message
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectItem = (item: KnowledgeBaseContent) => {
    // For restricted queries without IDs, use content text; otherwise use ID
    const identifier = item.type === 'restricted_query' && !item.id 
      ? item.content 
      : item.id!;
    
    setSelectedItems(prev =>
      prev.includes(identifier) ? prev.filter(i => i !== identifier) : [...prev, identifier]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    const allContent = knowledgeBase.knowledgeBaseContents || [];
    if (checked) {
      setSelectedItems(allContent.map(c => 
        c.type === 'restricted_query' && !c.id ? c.content : c.id!
      ));
    } else {
      setSelectedItems([]);
    }
  };

  const getStatusBadge = (status: string, scrappingStatus?: string | null) => {
    switch (status) {
      case 'completed':
      case 'indexed':
        return <Badge variant="success">Indexed</Badge>;
      case 'processing':
        // Show scrapping status if available (e.g., "4/4")
        if (scrappingStatus) {
          return <Badge variant="warning">({scrappingStatus}) Indexed</Badge>;
        }
        return <Badge variant="warning">Processing</Badge>;
      case 'queued':
        return <Badge variant="warning">Queued</Badge>;
      case 'failed':
        return <Badge variant="danger">Failed</Badge>;
      case 'non-indexing':
        return <Badge variant="gray">Non-indexing</Badge>;
      default:
        return <Badge variant="gray">Pending</Badge>;
    }
  };

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

  // Calculate items in progress (excluding non-indexing and failed/completed)
  const getInProgressItems = () => {
    const allContent = knowledgeBase.knowledgeBaseContents || [];
    const inProgressStatuses = ['pending', 'queued', 'processing'];
    
    return allContent.filter(item => 
      item.status !== 'non-indexing' && 
      inProgressStatuses.includes(item.status)
    );
  };

  // Group in-progress items by type with counts
  const getInProgressByType = () => {
    const inProgressItems = getInProgressItems();
    const grouped: { [key: string]: number } = {};
    
    inProgressItems.forEach(item => {
      const type = item.type;
      grouped[type] = (grouped[type] || 0) + 1;
    });
    
    return grouped;
  };

  // Get display items: at least one from each category, then up to 6 maximum
  const getDisplayItems = () => {
    const inProgressItems = getInProgressItems();
    const inProgressByType = getInProgressByType();
    const allTypes = Object.keys(inProgressByType);
    const totalItems = inProgressItems.length;
    
    if (allTypes.length === 0) {
      return { displayed: [], remainingCount: 0 };
    }
    
    // Show at least one from each category, but limit to 6 maximum categories
    const displayed: { type: string; count: number }[] = [];
    
    // Add one from each category first (ensuring at least one from each)
    allTypes.forEach(type => {
      displayed.push({ type, count: inProgressByType[type] });
    });
    
    // If we have more than 6 categories, show first 6 and calculate remaining items
    if (displayed.length > 6) {
      const shown = displayed.slice(0, 6);
      const shownItemsCount = shown.reduce((sum, item) => sum + item.count, 0);
      const remainingCount = totalItems - shownItemsCount;
      return { displayed: shown, remainingCount };
    }
    
    // If we have 6 or fewer categories, show all (each category is shown once)
    return { displayed, remainingCount: 0 };
  };

  const inProgressItems = getInProgressItems();
  const inProgressByType = getInProgressByType();
  const hasInProgress = inProgressItems.length > 0;
  const { displayed, remainingCount } = getDisplayItems();

  // Wave animation effect for progress bar
  useEffect(() => {
    if (displayed.length <= 1) {
      setWavePhase(0);
      return;
    }

    const waveInterval = setInterval(() => {
      setWavePhase(prev => {
        // For N items, we have N+2 phases (0 to N+1), then reset
        // Phase 0: first item at 2x
        // Phase 1 to N-1: wave travels
        // Phase N: last item at 1.5x
        // Phase N+1: all back to 1x (reset point)
        const maxPhase = displayed.length + 1;
        return (prev + 1) % (maxPhase + 1);
      });
    }, 150); // Change phase every 500ms for smooth wave

    return () => clearInterval(waveInterval);
  }, [displayed.length]);

  // Calculate scale for each item based on wave phase and position
  const getItemScale = (index: number, totalItems: number) => {
    if (totalItems <= 1) return 1;
    
    // Reset phase: all items at 1x
    if (wavePhase === totalItems + 1) {
      return 1;
    }
    
    // Wave pattern:
    // - When wavePhase equals index: that item is at peak (2x)
    // - When wavePhase equals index + 1: that item is decaying (1.5x)
    // - Otherwise: item is at rest (1x)
    if (wavePhase === index) {
      return 1.25; // Peak of wave at this position
    } else if (wavePhase === index + 1) {
      return 1.125; // Decaying from peak
    } else {
      return 1; // Rest
    }
  };

  const allContent = knowledgeBase.knowledgeBaseContents || [];
  const allSelected = allContent.length > 0 && allContent.every(item => {
    const identifier = item.type === 'restricted_query' && !item.id ? item.content : item.id!;
    return selectedItems.includes(identifier);
  });
  const someSelected = allContent.some(item => {
    const identifier = item.type === 'restricted_query' && !item.id ? item.content : item.id!;
    return selectedItems.includes(identifier);
  });

  const filteredContent = allContent.filter(item => {
    if (contentTypeFilter !== 'all' && item.type !== contentTypeFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = item.filename?.toLowerCase().includes(query);
      const matchesContent = item.content?.toLowerCase().includes(query);
      const matchesText = item.textContent?.toLowerCase().includes(query);
      return matchesName || matchesContent || matchesText;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <IconButton
          icon={ArrowLeft}
          onClick={() => {
            if (onBack) {
              onBack();
            } else {
              navigate('/knowledge-bases');
            }
          }} 
          tooltip="Back to list"
          variant="secondary"
        />
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">{knowledgeBase.name}</h2>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => {
              setActiveTab('content');
              setSearchParams({});
            }}
            className={`
              flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'content'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <div className={`p-1.5 rounded-md ${activeTab === 'content' ? 'bg-blue-50' : 'bg-gray-100'}`}>
              <Database size={20} className={activeTab === 'content' ? 'text-primary' : 'text-gray-600'} />
            </div>
            Content
          </button>
          <button
            onClick={() => {
              setActiveTab('chat-ais');
              setSearchParams({ tab: 'chat-ais' });
            }}
            className={`
              flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'chat-ais'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <div className={`p-1.5 rounded-md ${activeTab === 'chat-ais' ? 'bg-blue-50' : 'bg-gray-100'}`}>
              <Bot size={20} className={activeTab === 'chat-ais' ? 'text-primary' : 'text-gray-600'} />
            </div>
            Chat AIs
          </button>
          <button
            onClick={() => {
              setActiveTab('settings');
              setSearchParams({ tab: 'settings' });
            }}
            className={`
              flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'settings'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <div className={`p-1.5 rounded-md ${activeTab === 'settings' ? 'bg-blue-50' : 'bg-gray-100'}`}>
              <Settings size={20} className={activeTab === 'settings' ? 'text-primary' : 'text-gray-600'} />
            </div>
            Settings
          </button>
        </nav>
        </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          {/* Progress Bar */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              hasInProgress 
                ? 'max-h-20 opacity-100 mb-0' 
                : 'max-h-0 opacity-0 mb-0'
            }`}
          >
            <div className="bg-yellow-50 border border-yellow-200 rounded-md px-4 py-2">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm font-medium text-yellow-800 whitespace-nowrap">
                  Indexing in progress:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {displayed.map((item, index) => {
                    // Get icon component with smaller size for display
                    const IconComponent = () => {
                      switch (item.type) {
                        case 'file': return <FileText size={16} className="text-blue-600" />;
                        case 'url': return <LinkIcon size={16} className="text-green-600" />;
                        case 'text': return <FileText size={16} className="text-purple-600" />;
                        case 'audio': return <Music size={16} className="text-yellow-600" />;
                        case 'video': return <Video size={16} className="text-red-600" />;
                        case 'image': return <Image size={16} className="text-pink-600" />;
                        case 'restricted_query': return <FileText size={16} className="text-orange-600" />;
                        default: return <FileText size={16} className="text-gray-600" />;
                      }
                    };
                    const scale = displayed.length > 1 ? getItemScale(index, displayed.length) : 1;
                    return (
                      <div 
                        key={`${item.type}-${index}`} 
                        className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-md transition-transform duration-500 ease-in-out text-xs"
                        style={{ 
                          transform: `scale(${scale})`,
                          transformOrigin: 'center',
                        }}
                      >
                        <IconComponent />
                        <span className="text-xs text-gray-700 font-medium">
                          {item.count}
                        </span>
                      </div>
                    );
                  })}
                  {remainingCount > 0 && (
                    <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-md">
                      <span className="text-sm text-gray-700 font-medium">
                        +{remainingCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 flex flex-col sm:flex-row gap-4">
              <form onSubmit={(e) => { e.preventDefault(); setContentPage(1); loadKnowledgeBase(); }} className="flex-1 max-w-md">
                <Input
                  type="text"
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={Search}
                />
              </form>
              <div className="flex gap-2">
                <select
                  value={contentTypeFilter}
                  onChange={(e) => { setContentTypeFilter(e.target.value); setContentPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-sm text-base focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Types</option>
                  <option value="file">Files</option>
                  <option value="url">URLs</option>
                  <option value="text">Text</option>
                  <option value="audio">Audio</option>
                  <option value="video">Video</option>
                  <option value="image">Images</option>
                  <option value="restricted_query">Restricted Queries</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setContentPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-sm text-base focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="processing">Processing</option>
                  <option value="queued">Queued</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                  <option value="non-indexing">Non-indexing</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              {selectedItems.length > 0 && (
                <Button
                  variant="danger"
                  onClick={() => setShowDeleteContentModal(true)}
                  icon={Trash2}
                  iconPosition="left"
                >
                  Delete Selected ({selectedItems.length})
                </Button>
              )}
              <Button
                variant="primary"
                onClick={() => setShowAddContentModal(true)}
                icon={Plus}
                iconPosition="left"
              >
                Add Content
              </Button>
            </div>
          </div>

          {loading && filteredContent.length === 0 ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Spinner size="lg" />
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-md p-12 text-center">
              <div className="p-4 rounded-md bg-gray-100 inline-block mb-4">
                <Database size={48} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No content found</h3>
              <p className="text-base text-gray-600 mb-6">Add content to get started</p>
              <Button
                variant="primary"
                onClick={() => setShowAddContentModal(true)}
                icon={Plus}
                iconPosition="left"
              >
                Add Content
              </Button>
          </div>
        ) : (
          <>
              <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded-sm border-gray-300 text-primary focus:ring-primary"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name/Content</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredContent.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(
                                item.type === 'restricted_query' && !item.id ? item.content : item.id!
                              )}
                              onChange={() => toggleSelectItem(item)}
                              className="rounded-sm border-gray-300 text-primary focus:ring-primary"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className={`p-2 rounded-md ${getTypeColor(item.type)} inline-block`}>
                              {getTypeIcon(item.type)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="max-w-md">
                              {item.type === 'url' ? (
                    item.status === 'failed' ? (
                      <span className="text-gray-400 cursor-not-allowed break-all text-left">
                        {item.content}
                        <br/>
                        {item.depth !== null && item.depth !== undefined && (
                          <span className="text-gray-500 text-xs">Depth: {item.depth}</span>
                        )}
                      </span>
                    ) : (item.depth === 0 || item.depth === null || item.depth === undefined) ? (
                      <div>
                        <a
                          href={item.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-all text-left"
                        >
                          {item.content}
                        </a>
                        <br/>
                        <span className="text-gray-500 text-xs">Depth: 0</span>
                      </div>
                    ) : (
                      <div>
                        <button
                          onClick={() => {
                            setSelectedContentId(item.id!);
                            setIsUrlTreeModalOpen(true);
                          }}
                          className="text-primary hover:underline break-all text-left cursor-pointer"
                        >
                          {item.content}
                        </button>
                        <br/>
                        <span className="text-gray-500 text-xs">Depth: {item.depth}</span>
                      </div>
                    )
                              ) : item.type === 'file' && item.documentUrl ? (
                                item.status === 'failed' ? (
                                  <span className="text-gray-400 cursor-not-allowed">
                                    {item.filename || item.content || 'No Name'}
                                  </span>
                                ) : (
                                  <a
                                    href={item.documentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    {item.filename || item.content || 'No Name'}
                                  </a>
                                )
                              ) : item.type === 'text' && item.textContent ? (
                                item.status === 'failed' ? (
                                  <span className="text-gray-400 cursor-not-allowed">
                                    {(item.textContent || '').substring(0, 50)}
                                    {(item.textContent || '').length > 50 && '...'}
                                  </span>
                                ) : (
                                  <span
                                    className="text-gray-800 cursor-pointer text-primary hover:underline"
                                    onClick={() => {
                                      const textContent = item.textContent || '';
                                      const words = textContent.split(/\s+/).slice(0, 8).join(' ');
                                      setSelectedReference({
                                        type: item.type,
                                        title: words || 'Text Content',
                                        contentId: item.id,
                                        content: textContent,
                                        document_url: item.documentUrl,
                                      });
                                      setIsReferenceModalOpen(true);
                                    }}
                                  >
                                    {(item.textContent || '').substring(0, 50)}
                                    {(item.textContent || '').length > 50 && '...'}
                                  </span>
                                )
                              ) : item.type === 'video' ? (
                                item.status === 'failed' ? (
                                  <span className="text-gray-400 cursor-not-allowed">
                                    {item.filename || item.content || 'Video'}
                                  </span>
                                ) : item.status === 'completed' ? (
                                  <span
                                    className="text-gray-800 cursor-pointer text-primary hover:underline"
                                    onClick={() => {
                                      setSelectedVideoContent(item);
                                    }}
                                  >
                                    {item.filename || item.content || 'Video'}
                                  </span>
                                ) : (
                                  <span className="text-gray-800">
                                    {item.filename || item.content || 'Video'}
                                  </span>
                                )
                              ) : item.type === 'image' ? (
                                item.status === 'failed' ? (
                                  <span className="text-gray-400 cursor-not-allowed">
                                    {item.filename || item.content || 'Image'}
                                  </span>
                                ) : item.status === 'completed' ? (
                                  <span
                                    className="text-gray-800 cursor-pointer text-primary hover:underline"
                                    onClick={() => {
                                      setSelectedImageContent(item);
                                    }}
                                  >
                                    {item.filename || item.content || 'Image'}
                                  </span>
                                ) : (
                                  <span className="text-gray-800">
                                    {item.filename || item.content || 'Image'}
                                  </span>
                                )
                              ) : item.type === 'audio' ? (
                                item.status === 'failed' ? (
                                  <div>
                                    <span className="text-gray-400 cursor-not-allowed">
                                      {item.filename || item.content || 'Audio'}
                                    </span>
                                  </div>
                                ) : item.status === 'completed' ? (
                                  <div>
                                    <span
                                      className="text-gray-800 cursor-pointer text-primary hover:underline"
                                      onClick={() => {
                                        setSelectedAudioContent(item);
                                      }}
                                    >
                                      {item.filename || item.content || 'Audio'}
                                    </span>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="text-gray-800">
                                      {item.filename || item.content || 'Audio'}
                                    </span>
                                  </div>
                                )
                              ) : item.type === 'restricted_query' ? (
                                <span className="text-gray-800">
                                  {item.content || item.textContent || 'Restricted Query'}
                                </span>
                              ) : (
                                <span className={`${
                                  item.status === 'failed' ? 'text-gray-400' : 'text-gray-800'
                                }`}>
                                  {item.filename || item.content || item.textContent?.substring(0, 50) || 'No Name'}
                                  {item.textContent && item.textContent.length > 50 && '...'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">{getStatusBadge(item.status, item.scrappingStatus)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {item.status === 'failed' && (
                                <IconButton
                                  icon={RefreshCw}
                                  onClick={() => handleRetryContent(item.id!)}
                                  tooltip="Retry"
                                  variant="secondary"
                                  disabled={loading}
                                />
                              )}
                              <IconButton
                                icon={Trash2}
                                onClick={() => {
                                  const identifier = item.type === 'restricted_query' && !item.id 
                                    ? item.content 
                                    : item.id!;
                                  setSelectedItems([identifier]);
                                  setShowDeleteContentModal(true);
                                }}
                                tooltip="Delete"
                                variant="danger"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {contentPagination && contentPagination.totalPages > 1 && (
                <Pagination
                  currentPage={contentPage}
                  totalPages={contentPagination.totalPages}
                  onPageChange={(page) => {
                    setContentPage(page);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
            )}
          </>
        )}
      </div>
      )}

      {/* Chat AIs Tab */}
      {activeTab === 'chat-ais' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() => setShowCreateChatAINameModal(true)}
              icon={Plus}
              iconPosition="left"
            >
              Create Chat AI
            </Button>
        </div>

          {chatAIs.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-md p-12 text-center">
              <div className="p-4 rounded-md bg-gray-100 inline-block mb-4">
                <Bot size={48} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Chat AIs yet</h3>
              <p className="text-base text-gray-600 mb-6">Create your first Chat AI agent</p>
              <Button
                variant="primary"
                onClick={() => setShowCreateChatAINameModal(true)}
                icon={Plus}
                iconPosition="left"
              >
                Create Chat AI
              </Button>
          </div>
        ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {chatAIs.map((chatAI) => (
                <div
                  key={chatAI.id}
                  className="bg-white border border-gray-200 rounded-md p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 cursor-pointer" onClick={() => navigate(`/knowledge-bases/${initialKB.id}/chat-ai/${chatAI.id}`)}>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2 hover:text-primary">
                        {chatAI.name}
                      </h3>
                      {chatAI.updatedAt && (
                        <p className="text-xs text-gray-500">
                          Updated: {new Date(chatAI.updatedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="p-2 rounded-md bg-purple-50">
                      <Bot size={20} className="text-purple-600" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 relative">
                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={chatAI.isPublished || false}
                          onChange={async (e) => {
                            e.stopPropagation();
                            try {
                              await chatAIService.togglePublish(chatAI.id!);
                              await loadChatAIs();
                            } catch (err: any) {
                              console.error('Error toggling publish:', err);
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                      <span className="text-sm text-gray-700">
                        {chatAI.isPublished ? 'Published' : 'Unpublished'}
                      </span>
                  </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        icon={Trash2}
                        onClick={() => {
                          setChatAIToDelete(chatAI);
                          setShowDeleteChatAIModal(true);
                        }}
                        variant="danger"
                        tooltip="Delete Chat AI"
                      />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-gray-200 rounded-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Knowledge Base Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <Input
                type="text"
                value={knowledgeBase.name}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div className="mt-1">{getStatusBadge(knowledgeBase.status, null)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
              <p className="text-base text-gray-600">
                {knowledgeBase.createdAt ? new Date(knowledgeBase.createdAt).toLocaleString() : 'N/A'}
              </p>
            </div>
            {knowledgeBase.status === 'deleting' && (
              <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-md">
                <p className="text-sm font-medium">This knowledge base is being deleted. Please wait for the process to complete.</p>
              </div>
            )}
            <div className="pt-4 border-t border-gray-200">
              <Button
                variant="danger"
                onClick={() => setShowDeleteKBModal(true)}
                icon={Trash2}
                iconPosition="left"
                disabled={knowledgeBase.status === 'deleting'}
              >
                {knowledgeBase.status === 'deleting' ? 'Deleting...' : 'Delete Knowledge Base'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddContentModal && (
        <AddContentModal
          onClose={() => setShowAddContentModal(false)}
          onAdd={handleAddContent}
        />
      )}

      {selectedChatAI && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-md p-6 max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Chat with {selectedChatAI.name}</h3>
              <IconButton
                icon={X}
                onClick={() => setSelectedChatAI(null)}
                variant="ghost"
              />
            </div>
            <ChatAIInterface
              chatAI={selectedChatAI}
              onClose={() => setSelectedChatAI(null)}
            />
          </div>
        </div>
      )}

      <ReferenceModal
        isOpen={isReferenceModalOpen}
        onClose={() => {
          setIsReferenceModalOpen(false);
          setSelectedReference(null);
        }}
        reference={selectedReference}
      />

      <ConfirmModal
        isOpen={showDeleteKBModal}
        onClose={() => {
          if (!loading) {
            setShowDeleteKBModal(false);
            setError(null);
          }
        }}
        onConfirm={handleDeleteKB}
        title="Delete Knowledge Base"
        message={error ? (
          <div>
            <p className="mb-2">{`Are you sure you want to delete "${knowledgeBase.name}"? This action cannot be undone.`}</p>
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        ) : (
          `Are you sure you want to delete "${knowledgeBase.name}"? This action cannot be undone.`
        )}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={loading}
      />

      <ConfirmModal
        isOpen={showDeleteContentModal}
        onClose={() => {
          setShowDeleteContentModal(false);
          setSelectedItems([]);
        }}
        onConfirm={handleDeleteContent}
        title="Delete Content"
        message={`Are you sure you want to delete ${selectedItems.length} item(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={loading}
      />

      <ConfirmModal
        isOpen={showDeleteChatAIModal}
        onClose={() => {
          setShowDeleteChatAIModal(false);
          setChatAIToDelete(null);
        }}
        onConfirm={handleDeleteChatAI}
        title="Delete Chat AI"
        message={chatAIToDelete ? `Are you sure you want to delete "${chatAIToDelete.name}"? This action cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={loading}
      />

      {selectedContentId && (
        <UrlTreeModal
          isOpen={isUrlTreeModalOpen}
          onClose={() => {
            setIsUrlTreeModalOpen(false);
            setSelectedContentId(null);
          }}
          contentId={selectedContentId}
        />
      )}

      {selectedVideoContent && (
        <VideoContentModal
          isOpen={!!selectedVideoContent}
          onClose={() => setSelectedVideoContent(null)}
          content={selectedVideoContent}
        />
      )}

      {selectedImageContent && (
        <ImageContentModal
          isOpen={!!selectedImageContent}
          onClose={() => setSelectedImageContent(null)}
          content={selectedImageContent}
        />
      )}

      {selectedAudioContent && (
        <AudioContentModal
          isOpen={!!selectedAudioContent}
          onClose={() => setSelectedAudioContent(null)}
          content={selectedAudioContent}
        />
      )}

      <CreateChatAINameModal
        isOpen={showCreateChatAINameModal}
        onClose={() => setShowCreateChatAINameModal(false)}
        onCreate={handleCreateChatAI}
        existingNames={chatAIs.map(chatAI => chatAI.name)}
      />
    </div>
  );
};

export default KnowledgeBaseDetail;
