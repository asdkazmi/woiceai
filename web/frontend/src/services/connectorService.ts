import api from './api';

export interface ConnectorModel {
  id: number;
  connectorId: number;
  model: string;
  settings?: any | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Connector {
  id: number;
  llmName: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  models?: Array<ConnectorModel & { is_active?: number }>;
  users?: Array<{
    id: number;
    pivot: {
      id: number;
      user_id: number;
      integration_id: number;
      api_key: string | null;
      is_active: number;
      dialogue_mode?: string | null;
    };
  }>;
}

export interface ConnectorUser {
  id: number;
  userId: number;
  connectorId: number;
  apiKey?: string | null;
  isActive: boolean;
  dialogueMode?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserConnectorModel {
  id: number;
  userId: number;
  connectorId: number;
  modelId: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  model?: ConnectorModel;
  connector?: Connector;
}

export interface ConnectorsResponse {
  message: string;
  data: Connector[]; // Changed to match Laravel format (array directly)
}

export interface ConnectionsResponse {
  message: string;
  data: {
    connections: Array<ConnectorUser & { connector?: Connector; activeModel?: ConnectorModel }>;
  };
}

export interface ActiveModelResponse {
  message: string;
  data: {
    model: UserConnectorModel;
  };
}

export interface ConnectConnectorData {
  connectorId: number;
  apiKey?: string;
}

export interface SwitchModelData {
  llmName: string;
  modelName: string;
  isActive: boolean;
}

export interface UpdateConnectionData {
  apiKey?: string;
  isActive?: boolean;
  dialogueMode?: string;
}

export const connectorService = {
  async getAll(): Promise<Connector[]> {
    const response = await api.get<ConnectorsResponse>('/connectors');
    return response.data.data; // Changed to match Laravel format
  },

  async getMyConnections(): Promise<Array<ConnectorUser & { connector?: Connector; activeModel?: ConnectorModel }>> {
    const response = await api.get<ConnectionsResponse>('/connectors/my-connections');
    return response.data.data.connections;
  },

  async getActiveModel(): Promise<UserConnectorModel | null> {
    try {
      const response = await api.get<ActiveModelResponse>('/connectors/active-model');
      return response.data.data.model;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async connect(data: ConnectConnectorData): Promise<ConnectorUser & { connector?: Connector }> {
    const response = await api.post('/connectors/connect', data);
    return response.data.data.connection;
  },

  async switchModel(data: SwitchModelData): Promise<ConnectorModel> {
    const response = await api.post('/connectors/switch-model', data);
    return response.data.data.model;
  },

  async updateConnection(
    connectorId: number,
    data: UpdateConnectionData
  ): Promise<ConnectorUser & { connector?: Connector }> {
    const response = await api.put(`/connectors/${connectorId}/update`, data);
    return response.data.data.connection;
  },

  async disconnect(connectorId: number): Promise<void> {
    await api.delete(`/connectors/${connectorId}/disconnect`);
  },
};

