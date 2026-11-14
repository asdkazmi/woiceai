import React, { useState, useRef, useEffect } from 'react';
import { chatAIService, ChatAI } from '../services/chatAIService';

interface ChatAIInterfaceProps {
  chatAI: ChatAI;
  onClose?: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  references?: any[];
  executionTime?: string;
  delayTime?: string;
}

const ChatAIInterface: React.FC<ChatAIInterfaceProps> = ({ chatAI, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    // Add user message to history
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    try {
      setLoading(true);

      // Prepare history for API
      const history = newMessages
        .slice(0, -1) // Exclude the current user message
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      const response = await chatAIService.chat(chatAI.id, {
        query: userMessage,
        history,
      });

      // Add assistant response
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: response.content,
          references: response.references,
          executionTime: response.executionTime,
          delayTime: response.delayTime,
        },
      ]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send message');
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="chat-ai-interface">
      <div className="chat-header">
        <div>
          <h3>{chatAI.name}</h3>
          <p className="chat-meta">
            {chatAI.llmName} · {chatAI.modelName}
          </p>
        </div>
        <div className="chat-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleClear}>
            Clear
          </button>
          {onClose && (
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>

      <div className="chat-content">
        <div className="chat-messages" ref={messagesEndRef}>
          {messages.length === 0 ? (
            <div className="chat-empty">
              <p>No messages yet. Start a conversation by sending a message below.</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`chat-message chat-message-${msg.role}`}>
                <div className="chat-message-header">
                  <span className="chat-message-role">
                    {msg.role === 'user' ? 'You' : 'AI'}
                  </span>
                  {msg.executionTime && (
                    <span className="chat-message-time">{msg.executionTime}</span>
                  )}
                </div>
                <div className="chat-message-content">
                  <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                </div>
                {msg.references && msg.references.length > 0 && (
                  <div className="chat-references">
                    <strong>References:</strong>
                    <ul>
                      {msg.references.map((ref: any, refIndex: number) => (
                        <li key={refIndex}>
                          {ref.url || ref.source || `Reference ${refIndex + 1}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {error && (
          <div className="chat-error">
            {error}
          </div>
        )}

        <form className="chat-input-area" onSubmit={handleSend}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSend(e);
              }
            }}
            placeholder="Type your message... (Cmd/Ctrl + Enter to send)"
            rows={3}
            disabled={loading}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !input.trim()}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatAIInterface;

