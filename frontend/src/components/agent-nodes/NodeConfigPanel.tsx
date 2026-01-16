import React, { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { chatAIService, ChatAI } from '../../services/chatAIService';

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (data: any) => void;
  onDelete: () => void;
  isStartNode?: boolean;
  availableVariables?: string[];
}

interface VariableTextareaProps {
  value: string;
  onChange: (value: string) => void;
  variables: string[];
  rows?: number;
  placeholder?: string;
  className?: string;
}

const VariableTextarea: React.FC<VariableTextareaProps> = ({
  value,
  onChange,
  variables,
  rows = 3,
  placeholder,
  className,
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const updateSuggestions = (nextValue: string, cursorPos: number) => {
    const startIndex = nextValue.lastIndexOf('{{', cursorPos - 1);
    if (startIndex === -1) {
      setIsOpen(false);
      setOpenIndex(null);
      return;
    }

    const closeIndex = nextValue.indexOf('}}', startIndex + 2);
    if (closeIndex !== -1 && closeIndex < cursorPos) {
      setIsOpen(false);
      setOpenIndex(null);
      return;
    }

    const query = nextValue.slice(startIndex + 2, cursorPos).trim();
    const matches = variables.filter((variable) => {
      if (!query) return true;
      return variable.toLowerCase().includes(query.toLowerCase());
    });
    setFiltered(matches);
    setIsOpen(matches.length > 0);
    setOpenIndex(startIndex);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = e.target.value;
    onChange(nextValue);
    updateSuggestions(nextValue, e.target.selectionStart ?? nextValue.length);
  };

  const handleSelect = (variable: string) => {
    if (openIndex === null) {
      onChange(value + variable);
      setIsOpen(false);
      return;
    }
    const cursorPos = textareaRef.current?.selectionStart ?? value.length;
    const nextValue = value.slice(0, openIndex) + variable + value.slice(cursorPos);
    onChange(nextValue);
    setIsOpen(false);
    requestAnimationFrame(() => {
      const newCursor = openIndex + variable.length;
      textareaRef.current?.setSelectionRange(newCursor, newCursor);
      textareaRef.current?.focus();
    });
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onFocus={(e) => updateSuggestions(e.target.value, e.target.selectionStart ?? e.target.value.length)}
        className={className}
        rows={rows}
        placeholder={placeholder}
      />
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-sm border border-gray-200 bg-white shadow-sm">
          {filtered.map((variable) => (
            <button
              key={variable}
              type="button"
              onClick={() => handleSelect(variable)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
            >
              {variable}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  node,
  onUpdate,
  onDelete,
  isStartNode = false,
  availableVariables = [],
}) => {
  const [publishedChatAIs, setPublishedChatAIs] = useState<ChatAI[]>([]);
  const [loadingChatAIs, setLoadingChatAIs] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const nodeId = node.data?.nodeId !== undefined ? node.data.nodeId : undefined;

  useEffect(() => {
    if (node.type === 'chatAI') {
      loadPublishedChatAIs();
    }
  }, [node.type]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (dropdownOpen && !target.closest('.hs-dropdown')) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const loadPublishedChatAIs = async () => {
    try {
      setLoadingChatAIs(true);
      const chatAIs = await chatAIService.getPublished();
      console.log('Loaded published Chat AIs:', chatAIs);
      setPublishedChatAIs(chatAIs);
    } catch (err) {
      console.error('Error loading published Chat AIs:', err);
      setPublishedChatAIs([]);
    } finally {
      setLoadingChatAIs(false);
    }
  };

  const selectedChatAI = publishedChatAIs.find(cai => cai.id === node.data?.chatAIId);
  
  const handleChatAISelect = (chatAIId: number) => {
    const chatAI = publishedChatAIs.find(cai => cai.id === chatAIId);
    if (chatAI) {
      onUpdate({ 
        chatAIId: chatAI.id,
        knowledgeBaseId: chatAI.knowledgeBaseId 
      });
    }
    setDropdownOpen(false);
  };

  const renderConfig = () => {
    switch (node.type) {
      case 'start':
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>The Start node marks the beginning of the workflow. The workflow will begin execution when a user sends the first message in the chat.</p>
            </div>
          </div>
        );

      case 'waitForReply':
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>This node pauses the workflow and waits for user input. The user's reply will be stored and can be accessed using <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{`{{node[${nodeId !== undefined ? String(nodeId) : 'ID'}].user.message}}`}</code>.</p>
            </div>
          </div>
        );

      case 'chatAI': {
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Published Chat AI
              </label>
              {loadingChatAIs ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : (
                <div className="hs-dropdown relative inline-flex w-full">
                  <button
                    id="hs-dropdown-chat-ai"
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="hs-dropdown-toggle py-2 px-3 w-full inline-flex items-center justify-between gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                    aria-haspopup="menu"
                    aria-expanded={dropdownOpen}
                  >
                    {selectedChatAI ? (
                      <div className="flex flex-col items-start">
                        <span>{selectedChatAI.name}</span>
                        {selectedChatAI.knowledgeBaseName && (
                          <span className="text-xs text-gray-500 dark:text-neutral-400">
                            {selectedChatAI.knowledgeBaseName}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">Select Chat AI</span>
                    )}
                    <svg
                      className={`hs-dropdown-open:rotate-180 size-4 flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`}
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  <div
                    className={`hs-dropdown-menu transition-[opacity,margin] duration-300 ${
                      dropdownOpen ? 'opacity-100' : 'opacity-0 hidden'
                    } min-w-60 bg-white shadow-md rounded-lg mt-2 dark:bg-neutral-800 dark:border dark:border-neutral-700 dark:divide-neutral-700 absolute z-50 w-full`}
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="hs-dropdown-chat-ai"
                  >
                    <div className="p-1 space-y-0.5 max-h-60 overflow-y-auto">
                      {publishedChatAIs.length === 0 ? (
                        <div className="py-2 px-3 text-sm text-gray-500 dark:text-neutral-400">
                          No published Chat AIs found
                        </div>
                      ) : (
                        publishedChatAIs.map((chatAI) => (
                          <button
                            key={chatAI.id}
                            type="button"
                            onClick={() => handleChatAISelect(chatAI.id!)}
                            className={`w-full text-left flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-300 dark:focus:bg-neutral-700 ${
                              selectedChatAI?.id === chatAI.id ? 'bg-gray-100 dark:bg-neutral-700' : ''
                            }`}
                            role="menuitem"
                          >
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{chatAI.name}</span>
                              {chatAI.knowledgeBaseName && (
                                <span className="text-xs text-gray-500 dark:text-neutral-500">
                                  {chatAI.knowledgeBaseName}
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Input Message
              </label>
              <VariableTextarea
                value={(node.data?.inputMessage as string | undefined) || ''}
                onChange={(value) => onUpdate({ inputMessage: value })}
                variables={availableVariables}
                className="w-full px-3 py-2 border border-gray-200 rounded-sm text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                rows={3}
                placeholder="e.g., {{user.input.latest}} or Custom message with variables"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can use variables like <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{'{{user.input.latest}}'}</code>, <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{'{{user.input.first}}'}</code>, <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{'{{node[ID].user.message}}'}</code>, or <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{'{{node[ID].output.text}}'}</code>
              </p>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={node.data?.sendOutput !== false}
                  onChange={(e) => onUpdate({ sendOutput: e.target.checked })}
                  className="rounded-sm border-gray-300 text-primary focus:ring-primary"
                />
                <span>Send Output</span>
              </label>
              <p className="text-xs text-gray-500">
                If enabled, the Chat AI response is sent as an output message.
              </p>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(node.data?.waitForReply)}
                  onChange={(e) => onUpdate({ waitForReply: e.target.checked })}
                  className="rounded-sm border-gray-300 text-primary focus:ring-primary"
                />
                <span>Wait For Reply After Execution</span>
              </label>
              <p className="text-xs text-gray-500">
                If enabled, the workflow pauses for a user reply before moving on.
              </p>
            </div>
          </div>
        );
      }

      case 'ifElse':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condition Expression
              </label>
              <Input
                type="text"
                value={(node.data?.condition as string | undefined) || ''}
                onChange={(e) => onUpdate({ condition: e.target.value })}
                placeholder="e.g., message.length > 10"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use JavaScript-like expressions. Variables: input, message
              </p>
            </div>
          </div>
        );

      case 'intentRecognition':
        const intentCategories = (node.data?.intentCategories as any[] | undefined) || [];
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Intent Categories
              </label>
              <div className="space-y-2">
                {Array.isArray(intentCategories) && intentCategories.map((category: any, index: number) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Input
                        type="text"
                        value={category?.name || ''}
                        onChange={(e) => {
                          const currentCategories = (node.data?.intentCategories as any[] | undefined) || [];
                          const newCategories = [...currentCategories];
                          newCategories[index] = { ...category, name: e.target.value };
                          onUpdate({ intentCategories: newCategories });
                        }}
                        placeholder="Intent name"
                      />
                      <Input
                        type="text"
                        value={Array.isArray(category?.keywords) ? category.keywords.join(', ') : ''}
                        onChange={(e) => {
                          const currentCategories = (node.data?.intentCategories as any[] | undefined) || [];
                          const newCategories = [...currentCategories];
                          newCategories[index] = {
                            ...category,
                            keywords: e.target.value.split(',').map((k: string) => k.trim()).filter(Boolean),
                          };
                          onUpdate({ intentCategories: newCategories });
                        }}
                        placeholder="Keywords (comma separated)"
                        className="mt-1"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const currentCategories = (node.data?.intentCategories as any[] | undefined) || [];
                        const newCategories = [...currentCategories];
                        newCategories.splice(index, 1);
                        onUpdate({ intentCategories: newCategories });
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <Button
                  onClick={() => {
                    const currentCategories = (node.data?.intentCategories as any[] | undefined) || [];
                    const newCategories = [...currentCategories, { name: '', keywords: [] }];
                    onUpdate({ intentCategories: newCategories });
                  }}
                  variant="secondary"
                  size="sm"
                >
                  Add Intent
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Intent
              </label>
              <Input
                type="text"
                value={(node.data?.defaultIntent as string | undefined) || 'default'}
                onChange={(e) => onUpdate({ defaultIntent: e.target.value })}
                placeholder="default"
              />
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(node.data?.waitForReply)}
                  onChange={(e) => onUpdate({ waitForReply: e.target.checked })}
                  className="rounded-sm border-gray-300 text-primary focus:ring-primary"
                />
                <span>Wait For Reply After Execution</span>
              </label>
              <p className="text-xs text-gray-500">
                If enabled, the workflow pauses for a user reply before moving on.
              </p>
            </div>
          </div>
        );

      case 'sendMessage': {
        const messageVariants = (node.data?.messageVariants as string[] | undefined) || [];
        
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Variants
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Add multiple message variants. One will be randomly selected when this node runs.
              </p>
              <div className="space-y-2">
                {messageVariants.map((variant, index) => (
                  <div key={index} className="flex gap-2">
                    <VariableTextarea
                      value={variant}
                      onChange={(value) => {
                        const newVariants = [...messageVariants];
                        newVariants[index] = value;
                        onUpdate({ messageVariants: newVariants });
                      }}
                      variables={availableVariables}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-sm text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                      rows={2}
                      placeholder="Message variant"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newVariants = messageVariants.filter((_, i) => i !== index);
                        onUpdate({ messageVariants: newVariants });
                      }}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-sm text-sm transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    onUpdate({ messageVariants: [...messageVariants, ''] });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 border-dashed rounded-sm text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  + Add Variant
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(node.data?.waitForReply)}
                  onChange={(e) => onUpdate({ waitForReply: e.target.checked })}
                  className="rounded-sm border-gray-300 text-primary focus:ring-primary"
                />
                <span>Wait For Reply After Execution</span>
              </label>
              <p className="text-xs text-gray-500">
                If enabled, the workflow pauses for a user reply before moving on.
              </p>
            </div>
          </div>
        );
      }

      case 'end':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Final Message (Optional)
              </label>
              <VariableTextarea
                value={(node.data?.finalMessage as string | undefined) || ''}
                onChange={(value) => onUpdate({ finalMessage: value })}
                variables={availableVariables}
                className="w-full px-3 py-2 border border-gray-200 rounded-sm text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                rows={3}
                placeholder="Message to show before restarting workflow"
              />
            </div>
          </div>
        );

      default:
        return <p className="text-sm text-gray-500">No configuration available</p>;
    }
  };

  const getNodeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      start: 'Start',
      chatAI: 'Chat AI',
      waitForReply: 'Wait for Reply',
      sendMessage: 'Send Message',
      ifElse: 'If/Else',
      intentRecognition: 'Intent Recognition',
      end: 'End',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {getNodeTypeLabel(node.type || '')} Node
          </h3>
          {nodeId !== undefined && node.type !== 'start' && node.type !== 'end' && (
            <div className="text-xs text-gray-500 mt-1">ID: {String(nodeId)}</div>
          )}
        </div>
        {!isStartNode && node.type !== 'start' && (
          <Button
            onClick={onDelete}
            variant="secondary"
            size="sm"
            icon={Trash2}
            iconPosition="left"
          >
            Delete
          </Button>
        )}
      </div>
      
      {renderConfig()}
      
    </div>
  );
};

export default NodeConfigPanel;

