import { SNSClient, PublishCommand, MessageAttributeValue } from '@aws-sdk/client-sns';

// Initialize SNS client - supports both access keys and SSO profile (like Laravel)
const getSNSClient = (): SNSClient => {
  const region = process.env.AWS_REGION || 'us-east-1';
  
  // If SSO profile is configured, use it (like Laravel)
  if (process.env.AWS_SSO_PROFILE) {
    // Note: SSO profile requires AWS CLI SSO configuration
    // For now, we'll use default credentials chain which includes SSO
    return new SNSClient({
      region,
    });
  }
  
  // Otherwise use access keys
  return new SNSClient({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });
};

const snsClient = getSNSClient();

// Use the same SNS topic as Laravel backend
const TOPIC_ARN_KNOWLEDGEBASE = 'arn:aws:sns:us-east-1:471112754613:woice-ai-knowledgebase';

export const ACTION_ADD_FILE = 'ADD_FILE';
export const ACTION_DELETE_FILE = 'DELETE_FILE';
export const ACTION_DELETE_KNOWLEDGEBASE = 'DELETE_KNOWLEDGEBASE';

export interface SNSMessageAttributes {
  'KNOWLEDGEBASE.ID': { DataType: string; StringValue: string };
  'KNOWLEDGEBASE.CONTENT'?: { DataType: string; StringValue: string };
  'KNOWLEDGEBASE.CONTENT_TYPE'?: { DataType: string; StringValue: string };
  'KNOWLEDGEBASE.ACTION': { DataType: string; StringValue: string };
  'KNOWLEDGEBASE.TEXT'?: { DataType: string; StringValue: string };
  'KNOWLEDGEBASE.URL_DEPTH'?: { DataType: string; StringValue: string };
  'KNOWLEDGEBASE.TITLE'?: { DataType: string; StringValue: string };
  'KNOWLEDGEBASE.UNIQUE_ID'?: { DataType: string; StringValue: string };
}

export interface SNSDeleteAttributes {
  'KNOWLEDGEBASE.ID': { DataType: string; StringValue: string };
  'KNOWLEDGEBASE.ACTION': { DataType: string; StringValue: string };
}

export class SNSService {
  /**
   * Prepare SNS attributes for knowledge base content
   */
  static prepareKnowledgeBaseAttributes(
    knowledgeBaseId: string,
    content: string,
    type: string = 'file',
    action: string = ACTION_ADD_FILE,
    urlDepth?: number | null,
    filename?: string | null,
    text?: string | null,
    uniqueId?: string | null
  ): SNSMessageAttributes {
    const attributes: SNSMessageAttributes = {
      'KNOWLEDGEBASE.ID': {
        DataType: 'String',
        StringValue: knowledgeBaseId,
      },
      'KNOWLEDGEBASE.CONTENT': {
        DataType: 'String',
        StringValue: content,
      },
      'KNOWLEDGEBASE.CONTENT_TYPE': {
        DataType: 'String',
        StringValue: type,
      },
      'KNOWLEDGEBASE.ACTION': {
        DataType: 'String',
        StringValue: action,
      },
    };

    if (text) {
      attributes['KNOWLEDGEBASE.TEXT'] = {
        DataType: 'String',
        StringValue: text,
      };
    }

    if (urlDepth !== undefined && urlDepth !== null) {
      attributes['KNOWLEDGEBASE.URL_DEPTH'] = {
        DataType: 'String',
        StringValue: urlDepth.toString(),
      };
    }

    if (filename) {
      attributes['KNOWLEDGEBASE.TITLE'] = {
        DataType: 'String',
        StringValue: filename,
      };
    }

    if (uniqueId) {
      attributes['KNOWLEDGEBASE.UNIQUE_ID'] = {
        DataType: 'String',
        StringValue: uniqueId,
      };
    }

    return attributes;
  }

  /**
   * Publish a message to SNS
   * Matches Laravel SNSService::publishMessage format
   * Parameters: message, attributes, subject, deliverTo
   */
  static async publishMessage(
    message: string,
    attributes: SNSMessageAttributes | SNSDeleteAttributes,
    subject: string = '',
    deliverTo: string = 'knowledgebase'
  ): Promise<any> {
    let topicArn: string;
    
    switch (deliverTo) {
      case 'knowledgebase':
        topicArn = TOPIC_ARN_KNOWLEDGEBASE;
        break;
      default:
        console.warn(`Unknown deliverTo: ${deliverTo}. Skipping SNS publish.`);
        return null;
    }

    try {
      const command = new PublishCommand({
        TopicArn: topicArn,
        Subject: subject || message,
        Message: message,
        MessageAttributes: attributes as unknown as Record<string, MessageAttributeValue>,
      });

      const response = await snsClient.send(command);
      console.log('SNS message published:', response.MessageId);
      return response;
    } catch (error) {
      console.error('Error publishing SNS message:', error);
      throw error;
    }
  }

  /**
   * Publish knowledge base content added event
   * Matches Laravel SendSNSEventToIndexContent format
   */
  static async publishContentAdded(
    knowledgeBaseId: number,
    content: string,
    type: string,
    urlDepth?: number | null,
    filename?: string | null,
    textContent?: string | null,
    uniqueId?: string | null
  ): Promise<any> {
    const attributes = this.prepareKnowledgeBaseAttributes(
      knowledgeBaseId.toString(),
      content,
      type,
      ACTION_ADD_FILE,
      urlDepth,
      filename,
      textContent || undefined,
      uniqueId || undefined
    );

    // Match Laravel format: message, attributes, subject, deliverTo
    return this.publishMessage(
      'Knowledgebase content added',
      attributes,
      'Knowledgebase content added',
      'knowledgebase'
    );
  }

  /**
   * Publish knowledge base content deleted event
   * Matches Laravel SendSNSEventToDeleteContent format
   * Publishes a message for each deleted content item to delete it from vector storage
   */
  static async publishContentDeleted(
    knowledgeBaseId: number,
    content: string,
    type: string,
    uniqueId?: string | null
  ): Promise<any> {
    const attributes = this.prepareKnowledgeBaseAttributes(
      knowledgeBaseId.toString(),
      content,
      type,
      ACTION_DELETE_FILE,
      undefined,
      undefined,
      undefined,
      uniqueId || undefined
    );

    // Match Laravel format: message, attributes, subject, deliverTo
    return this.publishMessage(
      'Knowledgebase content deleted',
      attributes,
      'Knowledgebase content deleted',
      'knowledgebase'
    );
  }

  /**
   * Publish knowledge base deleted event
   * Matches Laravel NotifyAIToDeleteKnowledgebase format
   * Only includes ID and ACTION, matching Laravel SNSHelper::deleteKnowledgebaseAttributes exactly
   */
  static async publishKnowledgeBaseDeleted(knowledgeBaseId: number): Promise<any> {
    // Match Laravel SNSHelper::deleteKnowledgebaseAttributes format exactly
    // Only includes ID and ACTION, no CONTENT or CONTENT_TYPE
    const attributes: SNSDeleteAttributes = {
      'KNOWLEDGEBASE.ID': {
        DataType: 'String',
        StringValue: knowledgeBaseId.toString(),
      },
      'KNOWLEDGEBASE.ACTION': {
        DataType: 'String',
        StringValue: ACTION_DELETE_KNOWLEDGEBASE,
      },
    };

    // Match Laravel format: message, attributes, subject, deliverTo
    return this.publishMessage(
      `Knowledgebase #${knowledgeBaseId} successfully been deleted`,
      attributes,
      `Knowledgebase #${knowledgeBaseId} successfully been deleted`,
      'knowledgebase'
    );
  }
}

