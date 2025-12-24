import api from './api';

export interface ChatAISettings {
  instruction?: string | null;
  externalKnowledge?: boolean;
  enableReference?: boolean;
  temperature?: number;
  topK?: number;
  topP?: number;
  maxTokens?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  retrievalLimit?: number;
  retrievalScore?: number;
}

export interface ChatAI {
  id: number;
  knowledgeBaseId: number;
  userId: number;
  name: string;
  llmName: string;
  modelName: string;
  settings: ChatAISettings;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateChatAIData {
  name: string;
  llmName: string;
  modelName: string;
  settings: ChatAISettings;
}

export interface UpdateChatAIData {
  name?: string;
  llmName?: string;
  modelName?: string;
  settings?: ChatAISettings;
}

export interface ChatRequest {
  query: string;
  history?: Array<{ role: string; content: string }>;
}

export interface ChatResponse {
  content: string;
  references?: any[];
  executionTime?: string;
  delayTime?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface ChatAIListResponse {
  message: string;
  data: {
    chatAIs: ChatAI[];
  };
}

export interface ChatAIResponse {
  message: string;
  data: {
    chatAI: ChatAI;
  };
}

export interface ChatQueryResponse {
  message: string;
  data: {
    response: ChatResponse;
  };
}

export const chatAIService = {
  async getAllByKnowledgeBase(knowledgeBaseId: number): Promise<ChatAI[]> {
    const response = await api.get<ChatAIListResponse>(`/chat-ai/knowledge-base/${knowledgeBaseId}`);
    return response.data.data.chatAIs;
  },

  async getById(id: number): Promise<ChatAI> {
    const response = await api.get<ChatAIResponse>(`/chat-ai/${id}`);
    return response.data.data.chatAI;
  },

  async create(knowledgeBaseId: number, data: CreateChatAIData): Promise<ChatAI> {
    const response = await api.post<ChatAIResponse>('/chat-ai', {
      knowledgeBaseId,
      ...data,
    });
    return response.data.data.chatAI;
  },

  async update(id: number, data: UpdateChatAIData): Promise<ChatAI> {
    const response = await api.patch<ChatAIResponse>(`/chat-ai/${id}`, data);
    return response.data.data.chatAI;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/chat-ai/${id}`);
  },

  async chat(id: number, request: ChatRequest): Promise<ChatResponse> {
    const response = await api.post<ChatQueryResponse>(`/chat-ai/${id}/chat`, request);
    return response.data.data.response;
  },

  async getMessages(id: number): Promise<ChatAIMessage[]> {
    const response = await api.get<ChatAIMessagesResponse>(`/chat-ai/${id}/messages`);
    return response.data.data.messages;
  },

  async saveMessage(id: number, message: CreateChatAIMessageData): Promise<ChatAIMessage> {
    const response = await api.post<ChatAIMessageResponse>(`/chat-ai/${id}/messages`, message);
    return response.data.data.message;
  },

  async clearMessages(id: number): Promise<void> {
    await api.delete(`/chat-ai/${id}/messages`);
  },

  async deleteMessage(chatAIId: number, messageId: number): Promise<void> {
    await api.delete(`/chat-ai/${chatAIId}/messages/${messageId}`);
  },

  async togglePublish(id: number): Promise<ChatAI> {
    const response = await api.patch<ChatAIResponse>(`/chat-ai/${id}/toggle-publish`);
    return response.data.data.chatAI;
  },
};

export interface ChatAIMessage {
  id: number;
  chatAIId: number;
  role: 'user' | 'assistant';
  content: string;
  references?: any[] | null;
  executionTime?: string | null;
  delayTime?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  createdAt?: string;
}

export interface CreateChatAIMessageData {
  role: 'user' | 'assistant';
  content: string;
  references?: any[];
  executionTime?: string;
  delayTime?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface ChatAIMessagesResponse {
  message: string;
  data: {
    messages: ChatAIMessage[];
  };
}

export interface ChatAIMessageResponse {
  message: string;
  data: {
    message: ChatAIMessage;
  };
}

