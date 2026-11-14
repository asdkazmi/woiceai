import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { agentService, ExecuteAgentResponse } from '../services/agentService';
import { Send, MessageSquare, FileText, Link as LinkIcon, Music, Video, Image } from 'lucide-react';
import Spinner from './ui/Spinner';
import ReferenceModal from './ReferenceModal';

interface AgentBuilderChatProps {
  agentId?: number;
  agentData?: {
    nodes: any[];
    edges: any[];
  };
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  references?: any[];
  executionTime?: string;
  delayTime?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

const AgentBuilderChat: React.FC<AgentBuilderChatProps> = ({ agentId, agentData }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [executionId, setExecutionId] = useState<number | undefined>();
  const [selectedReference, setSelectedReference] = useState<any | null>(null);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const [expandedReferences, setExpandedReferences] = useState<Set<number>>(new Set());

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !agentId || loading) return;

    const userMessage = input.trim();
    setInput('');
    // Add user message to UI immediately for better UX
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      let response: ExecuteAgentResponse;

      if (executionId) {
        // Resume from waiting input
        response = await agentService.resume(agentId, userMessage, executionId);
      } else {
        // Start new execution with the initial user message
        response = await agentService.execute(agentId, {
          input: userMessage,
        });
      }

      // Add messages from response (filter out duplicate user messages)
      if (response.messages && response.messages.length > 0) {
        // Filter out user messages that match the one we just sent to avoid duplicates
        const newMessages = response.messages.filter((msg) => {
          // Keep all assistant/system messages
          if (msg.role !== 'user') return true;
          // For user messages, only keep if content doesn't match the one we just sent
          return msg.content !== userMessage;
        });
        
        if (newMessages.length > 0) {
          setMessages((prev) => [...prev, ...newMessages]);
        }
      }

      if (response.executionId) {
        setExecutionId(response.executionId);
      } else if (response.status === 'completed') {
        // Clear executionId if workflow completed and no executionId returned
        setExecutionId(undefined);
      }

      if (response.status === 'restarting') {
        setExecutionId(undefined);
      }
    } catch (err: any) {
      console.error('Error executing agent:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.response?.data?.message || 'Failed to execute agent'}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleReferences = (messageIndex: number) => {
    setExpandedReferences((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageIndex)) {
        newSet.delete(messageIndex);
      } else {
        newSet.add(messageIndex);
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
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <MessageSquare size={20} />
            Test Chat
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-500">
            <MessageSquare size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-sm">Save the agent first to test the workflow</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <MessageSquare size={20} />
          Test Chat
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <MessageSquare size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-sm">Start testing your agent workflow</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx}>
              <div className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`rounded-md p-3 ${msg.role === 'user' ? 'bg-primary text-white' : msg.role === 'system' ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-800'}`}>
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
                  {!expandedReferences.has(idx) ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {msg.references.slice(0, 4).map((ref: any, refIndex: number) => {
                        const refType = ref.type?.toLowerCase() || '';
                        return (
                          <button
                            key={refIndex}
                            onClick={() => toggleReferences(idx)}
                            className="inline-flex items-center justify-center p-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                            aria-label={`Reference ${refIndex + 1}: ${refType}`}
                          >
                            {getReferenceIcon(refType, 16)}
                          </button>
                        );
                      })}
                      {msg.references.length > 4 && (
                        <button
                          onClick={() => toggleReferences(idx)}
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
                        onClick={() => toggleReferences(idx)}
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
          ))
        )}
        {loading && (
          <div className="flex items-center gap-2 text-gray-600">
            <Spinner size="sm" />
            <span className="text-sm">Agent is processing...</span>
          </div>
        )}
      </div>

      <form className="p-4 border-t border-gray-200" onSubmit={handleSend}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading || !agentId}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-sm text-base focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !agentId}
            className="p-2 bg-primary text-white hover:bg-primary/90 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </form>

      <ReferenceModal
        isOpen={isReferenceModalOpen}
        onClose={() => {
          setIsReferenceModalOpen(false);
          setSelectedReference(null);
        }}
        reference={selectedReference}
      />
    </div>
  );
};

export default AgentBuilderChat;