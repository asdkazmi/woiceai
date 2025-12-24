import api from './api';

export interface KnowledgeBaseContent {
  id: number;
  knowledgeBaseId: number;
  content: string;
  textContent?: string | null;
  type: 'file' | 'url' | 'text' | 'audio' | 'video' | 'image';
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  depth?: number | null;
  filename?: string | null;
  transcription?: string | null;
  explanation?: string | null;
  sceneExplanation?: string | null;
  childPages?: any[] | null;
  documentUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface KnowledgeBaseContentStats {
  total: number;
  completed: number;
  pending: number;
  queued: number;
  processing: number;
  failed: number;
}

export interface KnowledgeBase {
  id: number;
  userId: number;
  name: string;
  knowledgeBaseApiId?: string | null;
  status: 'pending' | 'queued' | 'processing' | 'indexed' | 'failed';
  createdAt?: string;
  updatedAt?: string;
  knowledgeBaseContents?: KnowledgeBaseContent[];
  contentStats?: KnowledgeBaseContentStats;
}

export interface CreateKnowledgeBaseData {
  name: string;
  files?: File[];
  urls?: Array<string | { url: string; depth?: number }>;
  texts?: string[];
  audios?: File[];
  videos?: File[];
  images?: File[];
  depth?: number;
}

export interface UpdateKnowledgeBaseData {
  name?: string;
  files?: File[];
  urls?: Array<string | { url: string; depth?: number }>;
  texts?: string[];
  audios?: File[];
  videos?: File[];
  images?: File[];
  deleteIds?: number[];
}

export interface PaginationMeta {
  currentPage: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface KnowledgeBaseListResponse {
  message: string;
  data: {
    knowledgeBases: KnowledgeBase[];
    pagination?: PaginationMeta;
  };
}

export interface KnowledgeBaseResponse {
  message: string;
  data: {
    knowledgeBase: KnowledgeBase;
  };
}

export const knowledgeBaseService = {
  async getAll(params?: { page?: number; perPage?: number; search?: string }): Promise<{ knowledgeBases: KnowledgeBase[]; pagination?: PaginationMeta }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.perPage) queryParams.append('perPage', params.perPage.toString());
    if (params?.search) queryParams.append('search', params.search);
    
    const url = `/knowledge-base${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get<KnowledgeBaseListResponse>(url);
    return {
      knowledgeBases: response.data.data.knowledgeBases,
      pagination: response.data.data.pagination,
    };
  },

  async getById(id: number, params?: { page?: number; perPage?: number; search?: string; type?: string; status?: string }): Promise<{ knowledgeBase: KnowledgeBase; pagination?: PaginationMeta }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.perPage) queryParams.append('perPage', params.perPage.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);
    
    const url = `/knowledge-base/${id}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get<KnowledgeBaseResponse & { data: { pagination?: PaginationMeta } }>(url);
    return {
      knowledgeBase: response.data.data.knowledgeBase,
      pagination: response.data.data.pagination,
    };
  },

  async create(data: CreateKnowledgeBaseData): Promise<KnowledgeBase> {
    const formData = new FormData();
    formData.append('name', data.name);

    // Append files
    if (data.files && data.files.length > 0) {
      data.files.forEach((file) => {
        formData.append('files', file);
      });
    }

    // Append URLs
    if (data.urls && data.urls.length > 0) {
      formData.append('urls', JSON.stringify(data.urls));
    }

    // Append texts
    if (data.texts && data.texts.length > 0) {
      formData.append('texts', JSON.stringify(data.texts));
    }

    // Append audios
    if (data.audios && data.audios.length > 0) {
      data.audios.forEach((file) => {
        formData.append('audios', file);
      });
    }

    // Append videos
    if (data.videos && data.videos.length > 0) {
      data.videos.forEach((file) => {
        formData.append('videos', file);
      });
    }

    // Append images
    if (data.images && data.images.length > 0) {
      data.images.forEach((file) => {
        formData.append('images', file);
      });
    }

    // Append depth if provided
    if (data.depth) {
      formData.append('depth', data.depth.toString());
    }

    const response = await api.post<KnowledgeBaseResponse>('/knowledge-base', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data.knowledgeBase;
  },

  async update(id: number, data: UpdateKnowledgeBaseData): Promise<KnowledgeBase> {
    const formData = new FormData();

    if (data.name) {
      formData.append('name', data.name);
    }

    // Append files
    if (data.files && data.files.length > 0) {
      data.files.forEach((file) => {
        formData.append('files', file);
      });
    }

    // Append URLs
    if (data.urls && data.urls.length > 0) {
      formData.append('urls', JSON.stringify(data.urls));
    }

    // Append texts
    if (data.texts && data.texts.length > 0) {
      formData.append('texts', JSON.stringify(data.texts));
    }

    // Append audios
    if (data.audios && data.audios.length > 0) {
      data.audios.forEach((file) => {
        formData.append('audios', file);
      });
    }

    // Append videos
    if (data.videos && data.videos.length > 0) {
      data.videos.forEach((file) => {
        formData.append('videos', file);
      });
    }

    // Append images
    if (data.images && data.images.length > 0) {
      data.images.forEach((file) => {
        formData.append('images', file);
      });
    }

    // Append delete IDs
    if (data.deleteIds && data.deleteIds.length > 0) {
      formData.append('deleteIds', JSON.stringify(data.deleteIds));
    }

    const response = await api.patch<KnowledgeBaseResponse>(`/knowledge-base/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data.knowledgeBase;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/knowledge-base/${id}`);
  },

  async getContentById(contentId: number): Promise<{ id: number; textContent: string; title: string }> {
    const response = await api.get<{
      message: string;
      data: {
        content: {
          id: number;
          textContent: string;
          title: string;
        };
      };
    }>(`/knowledge-base/content/${contentId}`);
    return response.data.data.content;
  },
};

