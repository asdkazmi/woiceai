import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

// Initialize Lambda client - supports both access keys and SSO profile (like Laravel)
const getLambdaClient = (): LambdaClient => {
  const region = process.env.AWS_REGION || 'us-east-1';
  
  // If SSO profile is configured, use it (like Laravel)
  if (process.env.AWS_SSO_PROFILE) {
    // Note: SSO profile requires AWS CLI SSO configuration
    // For now, we'll use default credentials chain which includes SSO
    return new LambdaClient({
      region,
    });
  }
  
  // Otherwise use access keys
  return new LambdaClient({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });
};

const lambdaClient = getLambdaClient();

// Use the same Lambda function as Laravel backend
const ARN_QUERY_KNOWLEDGEBASE = 'arn:aws:lambda:us-east-1:471112754613:function:devWoiceChat';

export interface LambdaChatPayload {
  kbId: number;
  user_query: string;
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
  };
}

export class LambdaService {
  /**
   * Query knowledge base using Lambda function
   */
  static async queryKnowledgeBase(payload: LambdaChatPayload): Promise<any> {
    try {
      // Clean payload: remove api_key_id if it's null/undefined (especially for qwen)
      // Also remove it if llm_name is qwen (Lambda doesn't need it for qwen)
      const cleanPayload: any = { ...payload };
      
      // Remove api_key_id if it's null, undefined, or if using qwen
      if (
        cleanPayload.api_key_id === null || 
        cleanPayload.api_key_id === undefined ||
        cleanPayload.llm_name === 'qwen'
      ) {
        delete cleanPayload.api_key_id;
      }

      // Log the payload for debugging
      console.log('Sending Lambda payload:', JSON.stringify(cleanPayload, null, 2));
      console.log('Payload has api_key_id?', 'api_key_id' in cleanPayload);

      const command = new InvokeCommand({
        FunctionName: ARN_QUERY_KNOWLEDGEBASE,
        Payload: JSON.stringify(cleanPayload),
      });

      const response = await lambdaClient.send(command);
      
      if (response.Payload) {
        const decoder = new TextDecoder();
        const responseText = decoder.decode(response.Payload);
        const result = JSON.parse(responseText);
        
        console.log('Lambda response:', result);
        return result;
      }

      throw new Error('No response payload from Lambda');
    } catch (error: any) {
      console.error('Lambda invocation error:', error);
      return {
        'KNOWLEDGEBASE.STATUS': 'Failed',
        body: JSON.stringify({ error: error.message }),
      };
    }
  }
}

