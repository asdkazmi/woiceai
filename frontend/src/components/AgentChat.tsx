import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { agentService, AgentChatMessage, ExecuteAgentResponse } from '../services/agentService';
import { Send, MessageSquare, Trash2, FileText, Link as LinkIcon, Music, Video, Image } from 'lucide-react';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import ConfirmModal from './ui/ConfirmModal';
import ReferenceModal from './ReferenceModal';

const AgentChat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const agentId = id ? parseInt(id) : null;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [executionId, setExecutionId] = useState<number | undefined>();
  const [showClearModal, setShowClearModal] = useState(false);
  const [selectedReference, setSelectedReference] = useState<any | null>(null);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const [expandedReferences, setExpandedReferences] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (agentId) {
      loadMessages();
      // Start workflow automatically on mount
      startWorkflow();
    }
  }, [agentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!agentId) return;
    try {
      const data = await agentService.getMessages(agentId);
      setMessages(data);
    } catch (err: any) {
      console.error('Error loading messages:', err);
    }
  };

  const startWorkflow = async () => {
    if (!agentId) return;
    try {
      setLoading(true);
      const response = await agentService.execute(agentId, {
        isRestart: false,
      });

      if (response.messages) {
        await loadMessages();
      }

      if (response.executionId) {
        setExecutionId(response.executionId);
      }
    } catch (err: any) {
      console.error('Error starting workflow:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !agentId || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    try {
      let response: ExecuteAgentResponse;

      if (executionId) {
        // Resume from waiting input
        response = await agentService.resume(agentId, userMessage, executionId);
      } else {
        // Start new execution
        response = await agentService.execute(agentId, {
          input: userMessage,
        });
      }

      await loadMessages();

      if (response.executionId) {
        setExecutionId(response.executionId);
      } else if (response.status === 'completed') {
        // Clear executionId if workflow completed and no executionId returned
        setExecutionId(undefined);
      }

      // Handle restart
      if (response.status === 'restarting') {
        setExecutionId(undefined);
        // Workflow will automatically restart
        setTimeout(() => {
          startWorkflow();
        }, 500);
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!agentId) return;
    setShowClearModal(false);
    try {
      await agentService.clearMessages(agentId);
      setMessages([]);
      setExecutionId(undefined);
      startWorkflow();
    } catch (err: any) {
      console.error('Error clearing chat:', err);
    }
  };

  const toggleReferences = (messageId: number) => {
    setExpandedReferences((prev) => {
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

  if (!agentId) {
    return <div>Invalid agent ID</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden">
      <div className="flex justify-end items-center gap-2 mb-4">
        <Button
          onClick={() => setShowClearModal(true)}
          variant="secondary"
          size="sm"
          icon={Trash2}
          iconPosition="left"
          disabled={loading}
        >
          Clear Chat
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-md flex flex-col flex-1 min-h-0">
        <div className="p-6 flex-1 overflow-y-auto min-h-0">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-base text-gray-600">No messages yet. Workflow starting...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id}>
                  <div className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        <div className={`rounded-md p-4 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-800'}`}>
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
                          {msg.references.slice(0, 4).map((ref: any, refIndex: number) => {
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
                          {msg.references.length > 4 && (
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
                            {msg.references.map((ref: any, refIndex: number) => {
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
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-gray-600">
              <Spinner size="sm" />
              <span className="text-sm">Agent is processing...</span>
            </div>
          )}
        </div>

        <form className="p-3 flex gap-2 items-center border-t border-gray-200" onSubmit={handleSend}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-sm text-base focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2 bg-primary text-white hover:bg-primary/90 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={loading ? 'Sending...' : 'Send'}
          >
            <Send size={20} />
          </button>
        </form>
      </div>

      <ReferenceModal
        isOpen={isReferenceModalOpen}
        onClose={() => {
          setIsReferenceModalOpen(false);
          setSelectedReference(null);
        }}
        reference={selectedReference}
      />

      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleClearChat}
        title="Clear Chat History"
        message="Are you sure you want to clear all chat history? This action cannot be undone."
        confirmText="Clear"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
};

export default AgentChat;