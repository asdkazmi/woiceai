import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { chatAIService, CreateChatAIData, ChatAI, ChatAISettings, ChatAIMessage, CreateChatAIMessageData } from '../services/chatAIService';
import { connectorService, Connector } from '../services/connectorService';
import { knowledgeBaseService, KnowledgeBase } from '../services/knowledgeBaseService';
import ReferenceModal from './ReferenceModal';
import ConfirmModal from './ui/ConfirmModal';
import Button from './ui/Button';
import Input from './ui/Input';
import IconButton from './ui/IconButton';
import Badge from './ui/Badge';
import Spinner from './ui/Spinner';
import { ArrowLeft, Settings, MessageSquare, Trash2, Send, FileText, Link as LinkIcon, Music, Video, Image, Edit2, Check, X } from 'lucide-react';

const ChatAIPage: React.FC = () => {
  const { kbId, chatAIId } = useParams<{ kbId: string; chatAIId: string }>();
  const navigate = useNavigate();
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [chatAI, setChatAI] = useState<ChatAI | null>(null);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [messages, setMessages] = useState<ChatAIMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Form state
  const [name, setName] = useState('');
  const [llmName, setLlmName] = useState('qwen');
  const [modelName, setModelName] = useState('Qwen-14b-Instruct');
  const [instruction, setInstruction] = useState('');
  const [externalKnowledge, setExternalKnowledge] = useState(true);
  const [enableReference, setEnableReference] = useState(false);
  const [temperature, setTemperature] = useState(0.2);
  const [topK, setTopK] = useState(40);
  const [topP, setTopP] = useState(0.95);
  const [maxTokens, setMaxTokens] = useState(700);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0.0);
  const [presencePenalty, setPresencePenalty] = useState(0.0);
  const [retrievalLimit, setRetrievalLimit] = useState(6);
  const [retrievalScore, setRetrievalScore] = useState(0.6);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [selectedReference, setSelectedReference] = useState<any | null>(null);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const [showClearChatModal, setShowClearChatModal] = useState(false);
  const [expandedReferences, setExpandedReferences] = useState<Set<number>>(new Set());
  const [failedMessages, setFailedMessages] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
  }, [kbId, chatAIId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load knowledge base
      if (kbId) {
        const result = await knowledgeBaseService.getById(parseInt(kbId));
        setKnowledgeBase(result.knowledgeBase);
      }

      // Load connectors
      const connectorsData = await connectorService.getAll();
      setConnectors(connectorsData);

      // Set default model
      if (connectorsData.length > 0) {
        const qwenConnector = connectorsData.find(c => c.llmName === 'qwen');
        if (qwenConnector && qwenConnector.models && qwenConnector.models.length > 0) {
          const activeModel = qwenConnector.models.find(m => m.is_active === 1) || qwenConnector.models[0];
          if (activeModel) {
            setModelName(activeModel.model);
          }
        }
      }

      // Load ChatAI if editing (not 'new')
      if (chatAIId && chatAIId !== 'new') {
        const chatAIData = await chatAIService.getById(parseInt(chatAIId));
        setChatAI(chatAIData);
        setName(chatAIData.name);
        setLlmName(chatAIData.llmName);
        setModelName(chatAIData.modelName);
        setInstruction(chatAIData.settings.instruction || '');
        setExternalKnowledge(chatAIData.settings.externalKnowledge !== false);
        setEnableReference(chatAIData.settings.enableReference || false);
        setTemperature(chatAIData.settings.temperature ?? 0.2);
        setTopK(chatAIData.settings.topK ?? 40);
        setTopP(chatAIData.settings.topP ?? 0.95);
        setMaxTokens(chatAIData.settings.maxTokens ?? 700);
        setFrequencyPenalty(chatAIData.settings.frequencyPenalty ?? 0.0);
        setPresencePenalty(chatAIData.settings.presencePenalty ?? 0.0);
        setRetrievalLimit(chatAIData.settings.retrievalLimit ?? 6);
        setRetrievalScore(chatAIData.settings.retrievalScore ?? 0.6);

        // Load messages
        const messagesData = await chatAIService.getMessages(parseInt(chatAIId));
        setMessages(messagesData);
        
        // Detect failed messages (user messages without following assistant response)
        const failedMsgIds = new Set<number>();
        for (let i = 0; i < messagesData.length; i++) {
          if (messagesData[i].role === 'user') {
            // Check if next message is assistant
            const nextMsg = messagesData[i + 1];
            if (!nextMsg || nextMsg.role !== 'assistant') {
              failedMsgIds.add(messagesData[i].id);
            }
          }
        }
        setFailedMessages(failedMsgIds);
      } else {
        // For new ChatAI, don't create it yet - wait for user to click Save Settings
        // Set default values but don't create in database
        setChatAI(null);
        setName('');
        setMessages([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActiveModels = (connector: Connector) => {
    if (!connector.models) return [];
    if (connector.llmName === 'qwen') {
      return connector.models;
    }
    const isConnectorActive = connector.users && connector.users.length > 0
      ? connector.users.some(u => u.pivot.is_active === 1)
      : false;
    if (!isConnectorActive) return [];
    return connector.models.filter(m => m.is_active === 1);
  };

  const selectedConnector = connectors.find(c => c.llmName === llmName);
  const availableModels = selectedConnector ? getActiveModels(selectedConnector) : [];

  const handleLlmChange = (newLlmName: string) => {
    setLlmName(newLlmName);
    const connector = connectors.find(c => c.llmName === newLlmName);
    if (connector && connector.models && connector.models.length > 0) {
      const activeModel = connector.models.find(m => m.is_active === 1) || connector.models[0];
      if (activeModel) {
        setModelName(activeModel.model);
      }
    }
  };

  const handleSaveSettings = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!kbId) {
      setError('Knowledge base ID is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const settings: ChatAISettings = {
        instruction: instruction.trim() || null,
        externalKnowledge,
        enableReference,
        temperature,
        topK,
        topP,
        maxTokens,
        frequencyPenalty,
        presencePenalty,
        stop: [],
        retrievalLimit,
        retrievalScore,
      };

      if (chatAI && chatAI.id) {
        // Update existing ChatAI
        await chatAIService.update(chatAI.id, {
          name: name.trim(),
          llmName,
          modelName,
          settings,
        });

        // Reload ChatAI to get updated data
        const updatedChatAI = await chatAIService.getById(chatAI.id);
        setChatAI(updatedChatAI);
      } else {
        // Create new ChatAI
        const newChatAI = await chatAIService.create(parseInt(kbId), {
          name: name.trim(),
          llmName,
          modelName,
          settings,
        });
        setChatAI(newChatAI);
        
        // Update URL with the actual ID
        navigate(`/knowledge-bases/${kbId}/chat-ai/${newChatAI.id}`, { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save settings');
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chatInput.trim() || chatLoading) return;

    // If ChatAI doesn't exist yet, save settings first to create it
    let currentChatAI = chatAI;
    if (!currentChatAI || !currentChatAI.id) {
      if (!name.trim()) {
        setError('Please provide a name and save settings before sending messages');
        return;
      }
      
      // Save settings will create the ChatAI
      try {
        setSaving(true);
        setError(null);

        const settings: ChatAISettings = {
          instruction: instruction.trim() || null,
          externalKnowledge,
          enableReference,
          temperature,
          topK,
          topP,
          maxTokens,
          frequencyPenalty,
          presencePenalty,
          stop: [],
          retrievalLimit,
          retrievalScore,
        };

        const newChatAI = await chatAIService.create(parseInt(kbId!), {
          name: name.trim(),
          llmName,
          modelName,
          settings,
        });
        
        setChatAI(newChatAI);
        currentChatAI = newChatAI;
        
        // Update URL with the actual ID
        navigate(`/knowledge-bases/${kbId}/chat-ai/${newChatAI.id}`, { replace: true });
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to create Chat AI');
        console.error('Error creating Chat AI:', err);
        setSaving(false);
        return;
      } finally {
        setSaving(false);
      }
    }

    if (!currentChatAI || !currentChatAI.id) {
      setError('Chat AI not found. Please save settings first.');
      return;
    }

    const userMessage = chatInput.trim();
    setChatInput('');
    setError(null);

    let userMsg: ChatAIMessage | null = null;

    // Save user message
    try {
      userMsg = await chatAIService.saveMessage(currentChatAI.id, {
        role: 'user',
        content: userMessage,
      });
      setMessages((prev) => [...prev, userMsg!]);

      // Update settings before chatting (in case they changed)
      // Only update if ChatAI already exists (not creating new)
      if (currentChatAI.id) {
        await handleSaveSettings();
      }

      // Get updated ChatAI
      const updatedChatAI = await chatAIService.getById(currentChatAI.id);

      setChatLoading(true);

      // Prepare history - filter out failed messages
      const history = messages
        .filter(msg => !failedMessages.has(msg.id))
        .map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call chat API
      const response = await chatAIService.chat(updatedChatAI.id, {
        query: userMessage,
        history,
      });

      // Save assistant message
      const assistantMsg = await chatAIService.saveMessage(updatedChatAI.id, {
        role: 'assistant',
        content: response.content,
        references: response.references,
        executionTime: response.executionTime,
        delayTime: response.delayTime,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        totalTokens: response.totalTokens,
      });

      setMessages((prev) => [...prev, assistantMsg]);
      // Remove from failed messages if it was there
      if (userMsg) {
        const userMsgId = userMsg.id;
        setFailedMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(userMsgId);
          return newSet;
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send message');
      console.error('Error sending message:', err);
      // Mark the user message as failed
      if (userMsg) {
        setFailedMessages(prev => new Set(prev).add(userMsg!.id));
      }
    } finally {
      setChatLoading(false);
    }
  };

  const handleBack = () => {
    if (kbId) {
      navigate(`/knowledge-bases/${kbId}?tab=chat-ais`);
    } else {
      navigate('/knowledge-bases');
    }
  };

  const handleClearChat = async () => {
    if (!chatAI) return;
    
    setShowClearChatModal(false);

    try {
      setChatLoading(true);
      await chatAIService.clearMessages(chatAI.id);
      setMessages([]);
      setFailedMessages(new Set());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to clear chat history');
      console.error('Error clearing chat:', err);
    } finally {
      setChatLoading(false);
    }
  };

  const toggleReferences = (messageId: number) => {
    setExpandedReferences(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const getReferenceIcon = (refType: string, size: number = 16) => {
    const type = refType?.toLowerCase() || '';
    switch (type) {
      case 'file': return <FileText size={size} />;
      case 'url': return <LinkIcon size={size} />;
      case 'audio': return <Music size={size} />;
      case 'video': return <Video size={size} />;
      case 'image': return <Image size={size} />;
      default: return <FileText size={size} />;
    }
  };

  const handleResendMessage = async (failedMessage: ChatAIMessage) => {
    if (!chatAI || !chatAI.id) return;

    try {
      setError(null);
      setChatLoading(true);

      // Delete the old failed message from the database
      await chatAIService.deleteMessage(chatAI.id, failedMessage.id);

      // Remove old failed message from UI and failed messages set
      const updatedMessages = messages.filter(msg => msg.id !== failedMessage.id);
      setMessages(updatedMessages);
      setFailedMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(failedMessage.id);
        return newSet;
      });

      // Get updated ChatAI
      const updatedChatAI = await chatAIService.getById(chatAI.id);

      // Prepare history - filter out failed messages and the old failed message
      const history = updatedMessages
        .filter(msg => !failedMessages.has(msg.id))
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      // Save new user message
      const newUserMsg = await chatAIService.saveMessage(updatedChatAI.id, {
        role: 'user',
        content: failedMessage.content,
      });
      setMessages((prev) => [...prev, newUserMsg]);

      // Call chat API
      const response = await chatAIService.chat(updatedChatAI.id, {
        query: failedMessage.content,
        history,
      });

      // Save assistant message
      const assistantMsg = await chatAIService.saveMessage(updatedChatAI.id, {
        role: 'assistant',
        content: response.content,
        references: response.references,
        executionTime: response.executionTime,
        delayTime: response.delayTime,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        totalTokens: response.totalTokens,
      });

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend message');
      console.error('Error resending message:', err);
      // Restore the failed message and mark as failed
      setMessages((prev) => {
        const failedMsgIndex = prev.findIndex(msg => msg.id === failedMessage.id);
        if (failedMsgIndex === -1) {
          // Message was removed, add it back
          const restoredMessages = [...prev];
          const originalIndex = messages.findIndex(msg => msg.id === failedMessage.id);
          restoredMessages.splice(originalIndex, 0, failedMessage);
          return restoredMessages;
        }
        return prev;
      });
      setFailedMessages(prev => new Set(prev).add(failedMessage.id));
    } finally {
      setChatLoading(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!chatAI || !chatAI.id) {
      setError('Please save your Chat AI settings before publishing.');
      return;
    }

    try {
      setSaving(true);
      const updatedChatAI = await chatAIService.togglePublish(chatAI.id);
      setChatAI(updatedChatAI);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle publish status');
      console.error('Error toggling publish:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleNameEdit = () => {
    if (chatAI) {
      setEditingName(chatAI.name);
      setIsEditingName(true);
    } else {
      setIsEditingName(true);
      setEditingName(name);
    }
  };

  const handleNameSave = async () => {
    if (!editingName.trim()) {
      setIsEditingName(false);
      return;
    }

    if (chatAI && chatAI.id) {
      try {
        setSaving(true);
        await chatAIService.update(chatAI.id, {
          name: editingName.trim(),
          llmName,
          modelName,
          settings: {
            instruction: instruction.trim() || null,
            externalKnowledge,
            enableReference,
            temperature,
            topK,
            topP,
            maxTokens,
            frequencyPenalty,
            presencePenalty,
            stop: [],
            retrievalLimit,
            retrievalScore,
          },
        });
        const updatedChatAI = await chatAIService.getById(chatAI.id);
        setChatAI(updatedChatAI);
        setName(editingName.trim());
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to update name');
      } finally {
        setSaving(false);
      }
    } else {
      setName(editingName.trim());
    }
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setIsEditingName(false);
    setEditingName('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !chatAI) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
        <Button variant="secondary" onClick={handleBack} icon={ArrowLeft} iconPosition="left">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-120px)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <IconButton
            icon={ArrowLeft}
            onClick={handleBack}
            tooltip="Back to Knowledge Base"
            variant="secondary"
          />
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleNameSave();
                    } else if (e.key === 'Escape') {
                      handleNameCancel();
                    }
                  }}
                  className="text-2xl font-semibold text-gray-800 border border-primary rounded-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <IconButton
                  icon={Check}
                  onClick={handleNameSave}
                  tooltip="Save"
                  variant="primary"
                  size="sm"
                />
                <IconButton
                  icon={X}
                  onClick={handleNameCancel}
                  tooltip="Cancel"
                  variant="secondary"
                  size="sm"
                />
              </div>
            ) : (
              <h2
                className="text-2xl font-semibold text-gray-800 cursor-pointer hover:text-primary flex items-center gap-2"
                onClick={handleNameEdit}
              >
                {chatAI?.name || name || 'New Chat AI'}
                <Edit2 size={16} className="text-gray-400" />
              </h2>
            )}
            {knowledgeBase && !isEditingName && (
              <p className="text-sm text-gray-600">KB: {knowledgeBase.name}</p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
            </div>
      )}

      {/* Main Content Area with Content Push */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {/* Chat Section */}
        <div className={`flex-1 flex flex-col min-h-0 h-full transition-all duration-300 ${isSettingsOpen ? 'lg:mr-96' : ''}`}>
          {!chatAI || !chatAI.id ? (
            <div className="bg-white border border-gray-200 rounded-md p-12 text-center">
              <div className="p-4 rounded-md bg-gray-100 inline-block mb-4">
                <MessageSquare size={48} className="text-gray-400" />
            </div>
              <p className="text-base text-gray-600 mb-6">Please save your Chat AI settings before starting a conversation.</p>
              <Button
                onClick={() => setIsSettingsOpen(true)}
                variant="primary"
              >
                Open Settings
              </Button>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex justify-end items-center gap-2 mb-4">
                {chatAI && chatAI.id && (
                  <div className="flex items-center gap-2 mr-auto">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chatAI.isPublished || false}
                        onChange={handleTogglePublish}
                        disabled={saving}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                    <span className="text-sm text-gray-700">
                      {chatAI.isPublished ? 'Published' : 'Unpublished'}
                    </span>
                  </div>
                )}
                {messages.length > 0 && (
                  <Button
                    onClick={() => setShowClearChatModal(true)}
                    variant="secondary"
                    size="sm"
                    icon={Trash2}
                    iconPosition="left"
                    disabled={chatLoading}
                  >
                    Clear Chat History
                  </Button>
                )}
                {!isSettingsOpen && (
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex justify-center items-center flex-none gap-x-3 size-9 text-sm text-gray-600 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:bg-gray-100"
                    aria-label="Open Settings"
                  >
                    <svg className="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2"/>
                      <path d="M15 3v18"/>
                      <path d="m10 15-3-3 3-3"/>
                    </svg>
                    <span className="sr-only">Open Settings</span>
                  </button>
                )}
              </div>
              <div className="bg-white border border-gray-200 rounded-md flex flex-col flex-1 min-h-0">
                <div className="p-6 flex-1 overflow-y-auto min-h-0" ref={messagesEndRef}>
            {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="p-4 rounded-md bg-gray-100 inline-block mb-4">
                        <MessageSquare size={48} className="text-gray-400" />
              </div>
                      <p className="text-base text-gray-600">No messages yet. Start a conversation by sending a message below.</p>
                    </div>
            ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        return (
                          <div key={msg.id}>
                          <div className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                              <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                <div className={`rounded-md p-4 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-800'} ${failedMessages.has(msg.id) ? 'opacity-50' : ''}`}>
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          a: ({ node, href, children, ...props }) => {
                            const findMatchingReference = () => {
                              if (!msg.references || !href) return null;
                                            let matchedRef = msg.references.find((ref: any) => ref.document_url === href);
                              if (!matchedRef) {
                                matchedRef = msg.references.find((ref: any) => {
                                  if (ref.url === href) return true;
                                  if (ref.s3_Key === href || ref.s3_key === href) return true;
                                  const hrefKey = href.replace(/^knowledge-bases\//, '');
                                  if (ref.s3_Key === hrefKey || ref.s3_key === hrefKey) return true;
                                  if (ref.url && (ref.url === hrefKey || ref.url.includes(hrefKey))) return true;
                                  if (ref.contentId && (href === String(ref.contentId) || href.includes(String(ref.contentId)))) return true;
                                  if (ref.type?.toLowerCase() === 'text' && ref.s3_Key && href === ref.s3_Key) return true;
                                  return false;
                                });
                              }
                              if (!matchedRef && children) {
                                const indexMatch = String(children).match(/^\[(\d+)\]$/);
                                if (indexMatch) {
                                  const index = parseInt(indexMatch[1]) - 1;
                                  if (index >= 0 && index < msg.references.length) {
                                    matchedRef = msg.references[index];
                                  }
                                }
                              }
                              return matchedRef;
                            };

                            const matchedRef = findMatchingReference();
                            if (!matchedRef) {
                              return <span {...props}>{children}</span>;
                            }

                            const refType = (matchedRef.type || '').toLowerCase();
                            const handleLinkClick = (e: React.MouseEvent) => {
                              e.preventDefault();
                              if (refType === 'file' && matchedRef.document_url) {
                                window.open(matchedRef.document_url, '_blank', 'noopener,noreferrer');
                              } else {
                                setSelectedReference(matchedRef);
                                setIsReferenceModalOpen(true);
                              }
                            };

                            return (
                              <a
                                href={href}
                                onClick={handleLinkClick}
                                              className="text-primary hover:underline cursor-pointer"
                                {...props}
                              >
                                {children}
                              </a>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          {msg.role === 'user' && failedMessages.has(msg.id) && (
                            <div className="flex gap-1 items-center text-xs text-gray-500 mt-1 justify-end" style={{ letterSpacing: '-0.01em', wordSpacing: '-0.05em' }}>
                              <span>Failed to get response from AI.</span>
                              <button
                                onClick={() => handleResendMessage(msg)}
                                disabled={chatLoading}
                                className="text-primary hover:text-primary/80 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ letterSpacing: '-0.01em', wordSpacing: '-0.05em' }}
                              >
                                Click to resend
                              </button>
                            </div>
                          )}
                          {msg.role === 'assistant' && (msg.executionTime || msg.totalTokens) && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 justify-start">
                              {msg.executionTime && <span>{msg.executionTime}</span>}
                              {msg.totalTokens && (
                                <span>
                                  {msg.totalTokens} tokens
                                  {msg.inputTokens && msg.outputTokens && (
                                    <span> ({msg.inputTokens} in / {msg.outputTokens} out)</span>
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                          {msg.role === 'assistant' && msg.references && msg.references.length > 0 && (
                                <div className="mt-2">
                                  {!expandedReferences.has(msg.id) ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {msg.references?.slice(0, 4).map((ref: any, refIndex: number) => {
                                        const refType = ref.type?.toLowerCase() || '';
                                        return (
                                          <button
                                            key={refIndex}
                                            onClick={() => toggleReferences(msg.id)}
                                            className="inline-flex items-center justify-center p-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                                            aria-label={`Reference ${refIndex + 1}: ${refType}`}
                                          >
                                            {getReferenceIcon(refType, 16)}
                                          </button>
                                        );
                                      })}
                                      {msg.references && msg.references.length > 4 && (
                                        <button
                                          onClick={() => toggleReferences(msg.id)}
                                          className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium transition-colors"
                                          aria-label={`Show ${msg.references.length - 4} more references`}
                                        >
                                          +{msg.references.length - 4}
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <button
                                        onClick={() => toggleReferences(msg.id)}
                                        className="text-xs font-medium text-gray-600 hover:text-gray-800 mb-2"
                                      >
                                        Hide References
                                      </button>
                                      <div className="flex flex-wrap gap-2">
                                        {msg.references?.map((ref: any, refIndex: number) => {
                          const refType = ref.type?.toLowerCase() || '';
                          const handleReferenceClick = () => {
                            setSelectedReference(ref);
                            setIsReferenceModalOpen(true);
                          };

                          if (refType === 'file' && ref.document_url) {
                            return (
                                <a
                                                key={refIndex}
                                  href={ref.document_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-sm text-xs text-gray-700"
                                >
                                                {getReferenceIcon(refType, 14)}
                                                {ref.title || ref.s3_Key || `File ${refIndex + 1}`}
                                  {ref.pageNo && ` (Page ${ref.pageNo})`}
                                </a>
                            );
                          }

                          if (refType === 'url' && ref.url) {
                            return (
                                <a
                                key={refIndex} 
                                  href={ref.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-sm text-xs text-gray-700"
                                >
                                                {getReferenceIcon(refType, 14)}
                                                {ref.title || ref.url}
                                </a>
                            );
                          }

                          return (
                                            <button
                                key={refIndex} 
                                onClick={handleReferenceClick}
                                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-sm text-xs text-gray-700 cursor-pointer"
                                            >
                                              {getReferenceIcon(refType, 14)}
                                              {ref.title || `Reference ${refIndex + 1}`}
                                            </button>
                          );
                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {chatLoading && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Spinner size="sm" />
                      <span className="text-sm">AI is thinking...</span>
                </div>
            )}
          </div>

                <form className="p-3 flex gap-2 items-center border-t border-gray-200" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Type your message..."
              disabled={chatLoading}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-sm text-base focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="p-2 bg-primary text-white hover:bg-primary/90 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={chatLoading ? 'Sending...' : 'Send'}
            >
              <Send size={20} />
            </button>
          </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Sidebar - Right (Preline Overlay with Content Push) */}
      <div
        id="hs-sidebar-settings"
        className={`
          absolute top-0 right-0 bottom-0 z-40 w-96
          bg-white border-l border-gray-200
          transition-transform duration-300
          ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}
          h-full
        `}
        role="dialog"
        tabIndex={-1}
        aria-label="Settings Sidebar"
      >
        <div className="relative flex flex-col h-full max-h-full" style={{ paddingTop: "65px" }}>
          {/* Header */}
          <header className="p-4 flex justify-between items-center gap-x-2 border-b border-gray-200">
            <h3 className="flex-none font-semibold text-lg text-gray-800">Settings</h3>
            <div className="lg:hidden -me-2">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="flex justify-center items-center gap-x-3 size-6 bg-white border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:bg-gray-100"
                data-hs-overlay="#hs-sidebar-settings"
              >
                <svg className="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"/>
                  <path d="m6 6 12 12"/>
                </svg>
                <span className="sr-only">Close</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="hidden lg:flex justify-center items-center flex-none gap-x-3 size-9 text-sm text-gray-600 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:bg-gray-100"
              aria-label="Close Settings"
            >
              <svg className="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="M15 3v18"/>
                <path d="m8 9 3 3-3 3"/>
              </svg>
              <span className="sr-only">Close Settings</span>
            </button>
          </header>
          {/* End Header */}

          {/* Body */}
          <nav className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300">
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LLM Provider</label>
                  <select
                    value={llmName}
                    onChange={(e) => handleLlmChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-sm text-base focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    {connectors.map((connector) => (
                      <option key={connector.id} value={connector.llmName}>
                        {connector.llmName === 'qwen' ? 'Woice AI Qwen' : connector.llmName.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  {availableModels.length > 0 ? (
                    <select
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-sm text-base focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      {availableModels.map((model) => (
                        <option key={model.id} value={model.model}>
                          {model.model}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type="text"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="Enter model name"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Instruction / Prompt</label>
                <textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="Enter system prompt to guide the AI's responses..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-sm text-base focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={externalKnowledge}
                    onChange={(e) => setExternalKnowledge(e.target.checked)}
                    className="rounded-sm border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable External Knowledge Access</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={enableReference}
                    onChange={(e) => setEnableReference(e.target.checked)}
                    className="rounded-sm border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable References in Responses</span>
                </label>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Chat Settings</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Temperature</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={temperature.toString()}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Top K</label>
                    <Input
                      type="number"
                      min="1"
                      value={topK.toString()}
                      onChange={(e) => setTopK(parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Top P</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={topP.toString()}
                      onChange={(e) => setTopP(parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Max Tokens</label>
                    <Input
                      type="number"
                      min="1"
                      value={maxTokens.toString()}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Frequency Penalty</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="-2"
                      max="2"
                      value={frequencyPenalty.toString()}
                      onChange={(e) => setFrequencyPenalty(parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Presence Penalty</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="-2"
                      max="2"
                      value={presencePenalty.toString()}
                      onChange={(e) => setPresencePenalty(parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Retrieval Settings</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Retrieval Limit</label>
                    <Input
                      type="number"
                      min="1"
                      value={retrievalLimit.toString()}
                      onChange={(e) => setRetrievalLimit(parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Retrieval Score</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={retrievalScore.toString()}
                      onChange={(e) => setRetrievalScore(parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <Button
                  onClick={handleSaveSettings}
                  variant="primary"
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? (
                    <>
                      <Spinner size="sm" color="white" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Settings'
                  )}
                </Button>
        </div>
            </div>
          </nav>
          {/* End Body */}
        </div>
      </div>
      {/* End Settings Sidebar */}


      <ReferenceModal
        isOpen={isReferenceModalOpen}
        onClose={() => {
          setIsReferenceModalOpen(false);
          setSelectedReference(null);
        }}
        reference={selectedReference}
      />

      <ConfirmModal
        isOpen={showClearChatModal}
        onClose={() => setShowClearChatModal(false)}
        onConfirm={handleClearChat}
        title="Clear Chat History"
        message="Are you sure you want to clear all chat history? This action cannot be undone."
        confirmText="Clear"
        cancelText="Cancel"
        variant="warning"
        isLoading={chatLoading}
      />
    </div>
  );
};

export default ChatAIPage;

