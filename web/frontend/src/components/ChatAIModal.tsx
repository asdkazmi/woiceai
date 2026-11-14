import React, { useEffect, useState } from 'react';
import { CreateChatAIData, ChatAI, ChatAISettings } from '../services/chatAIService';
import { connectorService, Connector } from '../services/connectorService';

interface ChatAIModalProps {
  onClose: () => void;
  onSave: (data: CreateChatAIData) => Promise<void>;
  chatAI?: ChatAI | null;
  knowledgeBaseId: number;
}

const ChatAIModal: React.FC<ChatAIModalProps> = ({
  onClose,
  onSave,
  chatAI,
  knowledgeBaseId,
}) => {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState(chatAI?.name || '');
  const [llmName, setLlmName] = useState(chatAI?.llmName || 'qwen');
  const [modelName, setModelName] = useState(chatAI?.modelName || 'Qwen-14b-Instruct');
  const [instruction, setInstruction] = useState(chatAI?.settings.instruction || '');
  const [externalKnowledge, setExternalKnowledge] = useState(chatAI?.settings.externalKnowledge !== false);
  const [enableReference, setEnableReference] = useState(chatAI?.settings.enableReference || false);
  const [temperature, setTemperature] = useState(chatAI?.settings.temperature ?? 0.2);
  const [topK, setTopK] = useState(chatAI?.settings.topK ?? 40);
  const [topP, setTopP] = useState(chatAI?.settings.topP ?? 0.95);
  const [maxTokens, setMaxTokens] = useState(chatAI?.settings.maxTokens ?? 700);
  const [frequencyPenalty, setFrequencyPenalty] = useState(chatAI?.settings.frequencyPenalty ?? 0.0);
  const [presencePenalty, setPresencePenalty] = useState(chatAI?.settings.presencePenalty ?? 0.0);
  const [retrievalLimit, setRetrievalLimit] = useState(chatAI?.settings.retrievalLimit ?? 6);
  const [retrievalScore, setRetrievalScore] = useState(chatAI?.settings.retrievalScore ?? 0.6);

  useEffect(() => {
    loadConnectors();
  }, []);

  const loadConnectors = async () => {
    try {
      const connectorsData = await connectorService.getAll();
      setConnectors(connectorsData);
      
      // Set default model if not editing
      if (!chatAI && connectorsData.length > 0) {
        const qwenConnector = connectorsData.find(c => c.llmName === 'qwen');
        if (qwenConnector && qwenConnector.models && qwenConnector.models.length > 0) {
          const activeModel = qwenConnector.models.find(m => m.is_active === 1) || qwenConnector.models[0];
          if (activeModel) {
            setModelName(activeModel.model);
          }
        }
      }
    } catch (err: any) {
      console.error('Error loading connectors:', err);
    }
  };

  const getActiveModels = (connector: Connector) => {
    if (!connector.models) return [];
    if (connector.llmName === 'qwen') {
      // For qwen, show all models
      return connector.models;
    }
    // For other connectors, only show models where connector is active and model is active
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!llmName) {
      setError('LLM provider is required');
      return;
    }

    if (!modelName) {
      setError('Model is required');
      return;
    }

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

    try {
      setLoading(true);
      setError(null);
      await onSave({
        name: name.trim(),
        llmName,
        modelName,
        settings,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save chat AI');
      console.error('Error saving chat AI:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content chat-ai-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{chatAI ? 'Edit Chat AI' : 'Create Chat AI'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="chat-ai-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Customer Support Bot"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>LLM Provider *</label>
              <select
                value={llmName}
                onChange={(e) => handleLlmChange(e.target.value)}
                required
              >
                {connectors.map((connector) => (
                  <option key={connector.id} value={connector.llmName}>
                    {connector.llmName === 'qwen' ? 'Woice AI Qwen' : connector.llmName.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Model *</label>
              {availableModels.length > 0 ? (
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  required
                >
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.model}>
                      {model.model}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="Enter model name"
                  required
                />
              )}
            </div>
          </div>

          <div className="form-group">
            <label>System Instruction / Prompt</label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Enter system prompt to guide the AI's responses..."
              rows={4}
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={externalKnowledge}
                onChange={(e) => setExternalKnowledge(e.target.checked)}
              />
              Enable External Knowledge Access
            </label>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={enableReference}
                onChange={(e) => setEnableReference(e.target.checked)}
              />
              Enable References in Responses
            </label>
          </div>

          <div className="settings-section">
            <h3>Chat Settings</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Temperature</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Top K</label>
                <input
                  type="number"
                  min="1"
                  value={topK}
                  onChange={(e) => setTopK(parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Top P</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={topP}
                  onChange={(e) => setTopP(parseFloat(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Max Tokens</label>
                <input
                  type="number"
                  min="1"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Frequency Penalty</label>
                <input
                  type="number"
                  step="0.1"
                  min="-2"
                  max="2"
                  value={frequencyPenalty}
                  onChange={(e) => setFrequencyPenalty(parseFloat(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Presence Penalty</label>
                <input
                  type="number"
                  step="0.1"
                  min="-2"
                  max="2"
                  value={presencePenalty}
                  onChange={(e) => setPresencePenalty(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Retrieval Settings</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Retrieval Limit</label>
                <input
                  type="number"
                  min="1"
                  value={retrievalLimit}
                  onChange={(e) => setRetrievalLimit(parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Retrieval Score</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={retrievalScore}
                  onChange={(e) => setRetrievalScore(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (chatAI ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatAIModal;

