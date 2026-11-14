import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const getLambdaClient = (): LambdaClient => {
  const region = process.env.AWS_REGION || 'us-east-1';
  
  if (process.env.AWS_SSO_PROFILE) {
    return new LambdaClient({
      region,
    });
  }
  
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
const ARN_VALIDATE_API_KEY = 'arn:aws:lambda:us-east-1:471112754613:function:devWoiceChat';

export interface LambdaValidationPayload {
  kbId: number;
  llm_name: string;
  llm_config: {
    api_key?: string | null;
  };
  mongodb_srv_id?: string | null;
  api_key_id: number;
  validate_key?: boolean;
}

export class LambdaValidationService {
  /**
   * Validate API key using Lambda function
   */
  static async validateApiKey(
    kbId: number,
    llmName: string,
    apiKeyId: number,
    validateKey: boolean = true
  ): Promise<any> {
    try {
      const payload: LambdaValidationPayload = {
        kbId,
        llm_name: llmName,
        llm_config: {
          api_key: null,
        },
        mongodb_srv_id: null,
        api_key_id: apiKeyId,
        validate_key: validateKey,
      };

      console.log('Sending validation payload to Lambda:', JSON.stringify(payload));

      const command = new InvokeCommand({
        FunctionName: ARN_VALIDATE_API_KEY,
        Payload: JSON.stringify(payload),
      });

      const response = await lambdaClient.send(command);
      
      if (response.Payload) {
        const decoder = new TextDecoder();
        const responseText = decoder.decode(response.Payload);
        const result = typeof responseText === 'string' ? JSON.parse(responseText) : responseText;
        
        console.log('Lambda validation response:', result);
        return result;
      }

      throw new Error('No response payload from Lambda');
    } catch (error: any) {
      console.error('Lambda validation error:', error);
      return {
        error: error.message,
      };
    }
  }
}

