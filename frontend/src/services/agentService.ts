import api from './api';

export interface AgentData {
  nodes: any[];
  edges: any[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface Agent {
  id: number;
  userId: number;
  name: string;
  description?: string | null;
  agentData: AgentData;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentData {
  name: string;
  description?: string;
  agentData: AgentData;
}

export interface UpdateAgentData {
  name?: string;
  description?: string;
  agentData?: AgentData;
}

export interface AgentListResponse {
  message: string;
  data: {
    agents: Agent[];
  };
}

export interface AgentResponse {
  message: string;
  data: {
    agent: Agent;
  };
}

export interface ExecuteAgentRequest {
  input?: string;
  isRestart?: boolean;
  executionId?: number;
}

export interface ExecuteAgentResponse {
  status: 'completed' | 'waiting_input' | 'restarting';
  message?: string;
  messages?: Array<{ 
    role: 'user' | 'assistant' | 'system'; 
    content: string;
    references?: any[];
    executionTime?: string;
    delayTime?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  }>;
  executionId?: number;
  waitingForNodeId?: string;
}

export interface AgentExecutionResponse {
  message: string;
  data: {
    response: ExecuteAgentResponse;
  };
}

export interface AgentChatMessage {
  id: number;
  agentId: number;
  userId: number;
  executionId?: number | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  references?: any[];
  executionTime?: string;
  delayTime?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  createdAt: string;
}

export interface AgentMessagesResponse {
  message: string;
  data: {
    messages: AgentChatMessage[];
  };
}

export const agentService = {
  async getAll(): Promise<Agent[]> {
    const response = await api.get<AgentListResponse>('/agents');
    return response.data.data.agents;
  },

  async getById(id: number): Promise<Agent> {
    const response = await api.get<AgentResponse>(`/agents/${id}`);
    return response.data.data.agent;
  },

  async create(data: CreateAgentData): Promise<Agent> {
    const response = await api.post<AgentResponse>('/agents', data);
    return response.data.data.agent;
  },

  async update(id: number, data: UpdateAgentData): Promise<Agent> {
    const response = await api.patch<AgentResponse>(`/agents/${id}`, data);
    return response.data.data.agent;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/agents/${id}`);
  },

  async togglePublish(id: number): Promise<Agent> {
    const response = await api.patch<AgentResponse>(`/agents/${id}/toggle-publish`);
    return response.data.data.agent;
  },

  async execute(id: number, request: ExecuteAgentRequest): Promise<ExecuteAgentResponse> {
    const response = await api.post<AgentExecutionResponse>(`/agents/${id}/execute`, request);
    return response.data.data.response;
  },

  async resume(id: number, input: string, executionId: number): Promise<ExecuteAgentResponse> {
    const response = await api.post<AgentExecutionResponse>(`/agents/${id}/resume`, {
      input,
      executionId,
    });
    return response.data.data.response;
  },

  async getMessages(id: number, limit?: number): Promise<AgentChatMessage[]> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await api.get<AgentMessagesResponse>(`/agents/${id}/messages${params}`);
    return response.data.data.messages;
  },

  async clearMessages(id: number): Promise<void> {
    await api.delete(`/agents/${id}/messages`);
  },
};

