// Runpod API configuration
const RUNPOD_API_ENDPOINT = process.env.RUNPOD_API_ENDPOINT || 'https://api.runpod.ai/v2/t7pk7qccoaohob';
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || '';

export interface RunpodChatPayload {
  user_query: string;
  kbId: number;
  history?: any[];
  external_knowledge_access?: boolean;
  enable_reference?: boolean;
  user_system_prompt?: string | null;
  llm_name?: string;
  llm_config?: {
    model?: string;
  };
  mongodb_srv_id?: string | null;
  api_key_id?: number | null;
  chat_arg?: {
    temperature?: number;
    top_k?: number;
    top_p?: number;
    max_tokens?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string[];
  };
  kb_arg?: {
    retrieval_limit?: number;
    retrieval_score?: number;
    max_past_history?: number;
    max_retrieval_history?: number;
  };
}

export interface RunpodResponse {
  output?: {
    'KNOWLEDGEBASE.CONTENT'?: {
      llama_response?: string;
      content?: string;
      references?: any[];
      cost?: number;
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
    };
  };
  delayTime?: number;
  executionTime?: number;
  status?: string;
  error?: string;
}

export class RunpodService {
  /**
   * Query knowledge base using Runpod API (for Qwen LLM)
   */
  static async queryKnowledgeBase(payload: RunpodChatPayload, sync: boolean = true): Promise<RunpodResponse> {
    try {
      if (!RUNPOD_API_KEY) {
        throw new Error('RUNPOD_API_KEY is not configured');
      }

      const url = `${RUNPOD_API_ENDPOINT}${sync ? '/runsync' : '/run'}`;
      
      const requestData = {
        input: payload,
      };

      // Log the payload for debugging
      console.log('Sending Runpod payload:', JSON.stringify(requestData, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Runpod API error response:', errorText);
        throw new Error(`Runpod API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseData = await response.json() as RunpodResponse;
      console.log('Runpod response:', JSON.stringify(responseData, null, 2));

      return responseData;
    } catch (error: any) {
      console.error('Runpod API error:', error);
      
      if (error.message) {
        throw error;
      } else {
        throw new Error(`Runpod API error: ${error.message || 'Unknown error'}`);
      }
    }
  }
}

