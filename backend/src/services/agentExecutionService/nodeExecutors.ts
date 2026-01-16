import { ChatAI } from '../../models/ChatAI';
import { ChatAIService } from '../chatAIService';

export interface NodeExecutionContext {
  nodeId: string;
  nodeType: string;
  nodeData: any;
  input: any;
  context: Record<string, any>;
  userInputs: Array<{ nodeId: string; value: any }>;
  allNodes?: any[]; // All nodes in the workflow for variable resolution
}

export interface NodeExecutionResult {
  output?: any;
  nextNodeId?: string | null;
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
  waitingForInput?: boolean;
  shouldRestart?: boolean;
}

/**
 * Execute a Start node
 * Start node: No message, no pause, no variables stored, just passes through
 */
export async function executeStartNode(
  context: NodeExecutionContext
): Promise<NodeExecutionResult> {
  // Start node just passes through to the next node
  const nextNodeId = context.nodeData.outgoingNodeId || null;
  return {
    output: context.input || '',
    nextNodeId,
    messages: [], // No messages from Start node
  };
}

/**
 * Resolve variables in templates like {{user.input.latest}}, {{user.input.first}}, {{node[ID].user.message}}
 */
function resolveVariables(
  template: string,
  userInputs: Array<{ nodeId: string; value: any }>,
  context: Record<string, any>,
  allNodes?: any[]
): string {
  let result = template;

  // Resolve {{user.input.latest}} - latest user input
  const latestInput = userInputs.length > 0 ? userInputs[userInputs.length - 1].value : '';
  result = result.replace(/\{\{user\.input\.latest\}\}/g, String(latestInput));

  // Resolve {{user.input.first}} - first user input
  const firstInput = userInputs.length > 0 ? userInputs[0].value : '';
  result = result.replace(/\{\{user\.input\.first\}\}/g, String(firstInput));

  // Resolve {{node[ID].user.message}} - input from specific node by numeric nodeId
  // Changed from user_input[ID] to node[ID]
  const nodeIdPattern = /\{\{node\[(\d+)\]\.user\.message\}\}/g;
  result = result.replace(nodeIdPattern, (match, numericNodeId) => {
    const targetNodeId = parseInt(numericNodeId, 10);
    
    if (allNodes) {
      // Find node with matching numeric nodeId in data
      const targetNode = allNodes.find((node: any) => {
        const nodeId = node.data?.nodeId ?? node.nodeId;
        return nodeId === targetNodeId;
      });
      if (targetNode) {
        // Find user input for this node's string ID
        const input = userInputs.find((ui) => ui.nodeId === targetNode.id);
        if (input) {
          return String(input.value);
        }
      }
    }
    
    // Fallback: try matching by string ID directly
    const input = userInputs.find((ui) => ui.nodeId === String(numericNodeId));
    return input ? String(input.value) : '';
  });

  return result;
}

/**
 * Execute a Chat AI node
 * This node: Calls Chat AI, sends response, pauses for user input, stores response as node[ID].user.message
 */
export async function executeChatAINode(
  context: NodeExecutionContext
): Promise<NodeExecutionResult> {
  const { nodeData, context: execContext, userInputs, allNodes } = context;

  // Check if we already have input for this node (user has responded after Chat AI reply)
  const existingInput = userInputs.find((ui) => ui.nodeId === context.nodeId);

  // If we have input, we've already sent the Chat AI response and received user input
  // So now we continue to the next node
  if (existingInput) {
    const nextNodeId = context.nodeData.outgoingNodeId || null;
    return {
      output: existingInput.value,
      nextNodeId,
      messages: [
        {
          role: 'user',
          content: String(existingInput.value),
        },
      ],
    };
  }

  // We haven't received user input yet, so we need to call Chat AI and then pause
  const chatAIId = nodeData.chatAIId || (nodeData.data && typeof nodeData.data === 'object' && nodeData.data.chatAIId);
  const inputMessage = nodeData.inputMessage || (nodeData.data && typeof nodeData.data === 'object' && nodeData.data.inputMessage) || '';

  if (!chatAIId) {
    throw new Error('Chat AI node is missing required configuration (chatAIId)');
  }

  const chatAI = await ChatAI.findById(chatAIId);
  if (!chatAI || !chatAI.isPublished) {
    throw new Error('Selected Chat AI is not published or does not exist');
  }

  const knowledgeBaseId = chatAI.knowledgeBaseId;

  let query: string;
  if (inputMessage && inputMessage.trim()) {
    query = resolveVariables(inputMessage, userInputs || [], execContext || {}, allNodes);
  } else {
    query = typeof context.input === 'string' ? context.input : JSON.stringify(context.input);
  }

  const history = execContext.history || [];

  try {
    const response = await ChatAIService.chat(chatAIId, chatAI.userId, {
      query,
      history,
    });

    // After Chat AI replies, we PAUSE and wait for user input
    return {
      waitingForInput: true, // Pause workflow, wait for user input
      output: response.content,
      nextNodeId: context.nodeData.outgoingNodeId || null, // Still need nextNodeId for potential resume
      messages: [
        {
          role: 'assistant',
          content: response.content,
          references: response.references,
          executionTime: response.executionTime,
          delayTime: response.delayTime,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          totalTokens: response.totalTokens,
        },
      ],
    };
  } catch (error: any) {
    throw new Error(`Chat AI execution failed: ${error.message}`);
  }
}

/**
 * Execute an If/Else node
 * This node: Evaluates condition and routes to true/false branch
 */
export async function executeIfElseNode(
  context: NodeExecutionContext
): Promise<NodeExecutionResult> {
  const { nodeData, input, userInputs } = context;

  // Check if we already have input for this node (user has responded)
  const existingInput = userInputs.find((ui) => ui.nodeId === context.nodeId);
  
  if (existingInput) {
    // We have the result, continue to next node based on the result
    const result = Boolean(existingInput.value);
    const nextNodeId = result 
      ? (context.nodeData.trueNodeId || null)
      : (context.nodeData.falseNodeId || null);

    return {
      output: result,
      nextNodeId,
      messages: [], // If/Else doesn't send messages
    };
  }

  // Evaluate condition
  const condition = nodeData.condition || nodeData.data?.condition || '';
  let result = false;

  try {
    // Simple condition evaluation - can be enhanced later
    // For now, just check if input is truthy
    result = Boolean(input && String(input).trim() !== '');
  } catch (error) {
    result = false;
  }

  // Store result in userInputs for variable resolution (as true/false)
  // But we still need to pause for user input to confirm or continue
  // Actually, If/Else shouldn't pause - it should just route based on condition
  const nextNodeId = result 
    ? (context.nodeData.trueNodeId || null)
    : (context.nodeData.falseNodeId || null);

  return {
    output: result,
    nextNodeId,
    messages: [], // If/Else doesn't send messages
  };
}

/**
 * Execute an Intent Recognition node
 * This node: Recognizes intent and routes to appropriate branch
 */
export async function executeIntentRecognitionNode(
  context: NodeExecutionContext
): Promise<NodeExecutionResult> {
  // TODO: Implement intent recognition logic
  // For now, just pass through to first intent node
  const intentNodeIds = context.nodeData.intentNodeIds || {};
  const firstIntent = Object.keys(intentNodeIds)[0];
  const nextNodeId = firstIntent ? intentNodeIds[firstIntent] : null;

  return {
    output: context.input || '',
    nextNodeId,
    messages: [], // Intent recognition doesn't send messages yet
  };
}

/**
 * Execute a Send Message node
 * This node: Randomly selects one message from multiple variants, resolves variables, and sends it
 */
export async function executeSendMessageNode(
  context: NodeExecutionContext
): Promise<NodeExecutionResult> {
  const { nodeData, context: execContext, userInputs, allNodes } = context;

  // Get message variants from node data
  const messageVariants = nodeData.messageVariants || nodeData.data?.messageVariants || [];
  
  if (!Array.isArray(messageVariants) || messageVariants.length === 0) {
    throw new Error('Send Message node must have at least one message variant');
  }

  // Filter out empty variants
  const validVariants = messageVariants.filter((v: any) => v && String(v).trim() !== '');
  
  if (validVariants.length === 0) {
    throw new Error('Send Message node must have at least one non-empty message variant');
  }

  // Randomly select one variant
  const randomIndex = Math.floor(Math.random() * validVariants.length);
  const selectedVariant = String(validVariants[randomIndex]).trim();

  // Resolve variables in the selected message variant
  const selectedMessage = resolveVariables(selectedVariant, userInputs || [], execContext || {}, allNodes);

  // Get the next node
  const nextNodeId = context.nodeData.outgoingNodeId || null;

  return {
    output: selectedMessage,
    nextNodeId,
    messages: [
      {
        role: 'assistant',
        content: selectedMessage,
      },
    ],
  };
}

/**
 * Execute a Wait for Reply node
 * This node: Pauses workflow silently, waits for user input, stores response as node[ID].user.message
 */
export async function executeWaitForReplyNode(
  context: NodeExecutionContext
): Promise<NodeExecutionResult> {
  const { nodeData, userInputs } = context;

  // Check if we already have input for this node
  const existingInput = userInputs.find((ui) => ui.nodeId === context.nodeId);
  
  if (!existingInput) {
    // We're waiting for user input - no message sent, just pause
    return {
      waitingForInput: true,
      output: '',
      messages: [], // No messages - just wait silently
    };
  }

  // We have the input, continue to next node
  const nextNodeId = context.nodeData.outgoingNodeId || null;

  return {
    output: existingInput.value,
    nextNodeId,
    messages: [
      {
        role: 'user',
        content: String(existingInput.value),
      },
    ],
  };
}

/**
 * Execute an End node
 * End node: No message, no pause, no variables stored, just signals restart
 */
export async function executeEndNode(
  context: NodeExecutionContext
): Promise<NodeExecutionResult> {
  // End node doesn't send any message, just signals to restart the workflow
  return {
    output: '',
    nextNodeId: null,
    messages: [], // No messages from End node
    shouldRestart: true, // Signal to restart workflow
  };
}

/**
 * Execute a node based on its type
 */
export async function executeNode(
  context: NodeExecutionContext
): Promise<NodeExecutionResult> {
  const { nodeType } = context;

  switch (nodeType) {
    case 'start':
      return executeStartNode(context);
    case 'chatAI':
      return executeChatAINode(context);
    case 'waitForReply':
      return executeWaitForReplyNode(context);
    case 'sendMessage':
      return executeSendMessageNode(context);
    case 'ifElse':
      return executeIfElseNode(context);
    case 'intentRecognition':
      return executeIntentRecognitionNode(context);
    case 'end':
      return executeEndNode(context);
    default:
      throw new Error(`Unknown node type: ${nodeType}`);
  }
}