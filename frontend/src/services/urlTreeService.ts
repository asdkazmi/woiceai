import api from './api';

export interface TreeNode {
  url: string;
  parentUrl: string | null;
  scrapped?: boolean;
  children: TreeNode[];
}

export interface UrlTreeResponse {
  message: string;
  data: {
    rootUrl: string;
    tree: TreeNode;
    totalPages: number;
  };
}

class UrlTreeService {
  /**
   * Get URL tree structure from MongoDB by content ID (preferred method)
   * @param contentId The MySQL ID of the knowledge base content item
   */
  async getUrlTreeById(contentId: number): Promise<UrlTreeResponse['data']> {
    const response = await api.get<UrlTreeResponse>(`/url-tree/by-id/${contentId}`);
    return response.data.data;
  }

  /**
   * Get URL tree structure from MongoDB by URL (fallback method)
   * @param url The root URL to fetch tree for
   */
  async getUrlTree(url: string): Promise<UrlTreeResponse['data']> {
    // URL encode the URL parameter
    const encodedUrl = encodeURIComponent(url);
    const response = await api.get<UrlTreeResponse>(`/url-tree/${encodedUrl}`);
    return response.data.data;
  }
}

export default new UrlTreeService();

