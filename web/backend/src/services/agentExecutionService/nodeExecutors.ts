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
  runtime?: {
    consumedUserInputIndexes: Set<number>;
    allowLoopBackInputReplay?: boolean;
    hasUsedLoopBackInputReplay?: boolean;
  };
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

function getLatestInputForNode(
  userInputs: Array<{ nodeId: string; value: any }>,
  nodeId: string
): { nodeId: string; value: any } | undefined {
  for (let i = userInputs.length - 1; i >= 0; i -= 1) {
    if (userInputs[i].nodeId === nodeId) {
      return userInputs[i];
    }
  }
  return undefined;
}

function getLatestUnconsumedInputForNode(
  userInputs: Array<{ nodeId: string; value: any }>,
  nodeId: string,
  consumedUserInputIndexes: Set<number>
): { input: { nodeId: string; value: any }; index: number } | undefined {
  if (userInputs.length === 0) return undefined;
  const latestIndex = userInputs.length - 1;
  if (consumedUserInputIndexes.has(latestIndex)) return undefined;
  if (userInputs[latestIndex].nodeId === nodeId) {
    return { input: userInputs[latestIndex], index: latestIndex };
  }
  return undefined;
}

function getLatestInputWithIndex(
  userInputs: Array<{ nodeId: string; value: any }>
): { input: { nodeId: string; value: any }; index: number } | undefined {
  if (userInputs.length === 0) return undefined;
  const latestIndex = userInputs.length - 1;
  return { input: userInputs[latestIndex], index: latestIndex };
}

function getNodeInputForExecution(
  userInputs: Array<{ nodeId: string; value: any }>,
  nodeId: string,
  runtime?: {
    consumedUserInputIndexes: Set<number>;
    allowLoopBackInputReplay?: boolean;
    hasUsedLoopBackInputReplay?: boolean;
  }
): { input: { nodeId: string; value: any }; index: number; replayedFromLoopBack: boolean } | undefined {
  const consumedUserInputIndexes = runtime?.consumedUserInputIndexes || new Set<number>();
  const unconsumed = getLatestUnconsumedInputForNode(
    userInputs,
    nodeId,
    consumedUserInputIndexes
  );
  if (unconsumed) {
    return { ...unconsumed, replayedFromLoopBack: false };
  }

  // After a Loop Back / Jump Anywhere jump, allow one replay so upstream wait nodes can
  // continue once with the current message instead of pausing immediately.
  if (runtime?.allowLoopBackInputReplay && !runtime?.hasUsedLoopBackInputReplay) {
    // Replay always uses the latest user turn input, regardless of target node id.
    const latest = getLatestInputWithIndex(userInputs);
    if (latest) {
      return { ...latest, replayedFromLoopBack: true };
    }
  }

  return undefined;
}

function shouldEchoUserInputInMessages(
  userInputs: Array<{ nodeId: string; value: any }>,
  inputIndex: number,
  replayedFromLoopBack: boolean
): boolean {
  if (replayedFromLoopBack) return false;
  // Only echo the latest submitted user input for this request flow.
  return inputIndex === userInputs.length - 1;
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
 * Resolve variables in templates like {{user.input.latest}}, {{user.input.first}}, {{node[ID].user.message}}, {{node[ID].output.text}}
 */
function resolveVariables(
  template: string,
  userInputs: Array<{ nodeId: string; value: any }>,
  context: Record<string, any>,
  allNodes?: any[]
): string {
  let result = template;

  const storeChatHistory = Boolean(context?.storeChatHistory);
  const chatMessages = storeChatHistory && Array.isArray(context?.chatMessages)
    ? context.chatMessages
    : [];
  const chatReplacement = storeChatHistory ? JSON.stringify(chatMessages) : '';
  result = result.replace(/\{\{chat\.messages\}\}/g, chatReplacement);

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
        const input = getLatestInputForNode(userInputs, targetNode.id);
        if (input) {
          return String(input.value);
        }
      }
    }
    
    // Fallback: try matching by string ID directly
    const input = getLatestInputForNode(userInputs, String(numericNodeId));
    return input ? String(input.value) : '';
  });

  // Resolve {{node[ID].output.text}} - output from specific node by numeric nodeId
  const outputPattern = /\{\{node\[(\d+)\]\.output\.text\}\}/g;
  result = result.replace(outputPattern, (match, numericNodeId) => {
    const targetNodeId = parseInt(numericNodeId, 10);
    const outputs = context?.nodeOutputs || {};

    if (allNodes) {
      const targetNode = allNodes.find((node: any) => {
        const nodeId = node.data?.nodeId ?? node.nodeId;
        return nodeId === targetNodeId;
      });
      if (targetNode && outputs[targetNode.id]?.text !== undefined) {
        return String(outputs[targetNode.id].text);
      }
    }

    if (outputs[String(targetNodeId)]?.text !== undefined) {
      return String(outputs[String(targetNodeId)].text);
    }

    return '';
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
  const sendOutput =
    nodeData.sendOutput !== undefined
      ? Boolean(nodeData.sendOutput)
      : nodeData.data?.sendOutput !== undefined
      ? Boolean(nodeData.data.sendOutput)
      : true;
  const waitForReply =
    nodeData.waitForReply !== undefined
      ? Boolean(nodeData.waitForReply)
      : nodeData.data?.waitForReply !== undefined
      ? Boolean(nodeData.data.waitForReply)
      : false;

  // Check if we already have input for this node (user has responded after Chat AI reply)
  const consumedUserInputIndexes =
    context.runtime?.consumedUserInputIndexes || new Set<number>();
  const consumedInput = getNodeInputForExecution(
    userInputs,
    context.nodeId,
    context.runtime
  );

  // If we have input, we've already sent the Chat AI response and received user input
  // So now we continue to the next node
  if (waitForReply && consumedInput) {
    const shouldEchoUser = shouldEchoUserInputInMessages(
      userInputs,
      consumedInput.index,
      consumedInput.replayedFromLoopBack
    );
    if (consumedInput.replayedFromLoopBack) {
      if (context.runtime) {
        context.runtime.hasUsedLoopBackInputReplay = true;
        context.runtime.allowLoopBackInputReplay = false;
      }
    } else {
      consumedUserInputIndexes.add(consumedInput.index);
    }
    const nextNodeId = context.nodeData.outgoingNodeId || null;
    return {
      output: consumedInput.input.value,
      nextNodeId,
      messages: shouldEchoUser
        ? [
            {
              role: 'user',
              content: String(consumedInput.input.value),
            },
          ]
        : [],
    };
  }

  // We haven't received user input yet, so we need to call Chat AI and then pause
  const chatAIId = nodeData.chatAIId || (nodeData.data && typeof nodeData.data === 'object' && nodeData.data.chatAIId);
  const inputMessage = nodeData.inputMessage || (nodeData.data && typeof nodeData.data === 'object' && nodeData.data.inputMessage) || '';
  const useChatHistory =
    nodeData.useChatHistory !== undefined
      ? Boolean(nodeData.useChatHistory)
      : nodeData.data?.useChatHistory !== undefined
      ? Boolean(nodeData.data.useChatHistory)
      : false;

  if (!chatAIId) {
    throw new Error('Chat AI node is missing required configuration (chatAIId)');
  }

  const chatAI = await ChatAI.findById(chatAIId);
  if (!chatAI || !chatAI.isPublished) {
    throw new Error('Selected Chat AI is not published or does not exist');
  }

  const knowledgeBaseId = chatAI.knowledgeBaseId;

  const fullChatHistory = Array.isArray(execContext.context?.chatMessages)
    ? execContext.context.chatMessages
    : [];

  let query: string;
  let history = useChatHistory ? fullChatHistory : (execContext.history || []);

  if (useChatHistory && fullChatHistory.length > 0) {
    const lastUserIndex = [...fullChatHistory]
      .map((msg, idx) => ({ msg, idx }))
      .reverse()
      .find((item) => item.msg?.role === 'user')?.idx;

    if (lastUserIndex !== undefined) {
      const lastUserMessage = fullChatHistory[lastUserIndex];
      query = String(lastUserMessage?.content ?? '');
      history = fullChatHistory.slice(0, lastUserIndex);
    } else {
      query = typeof context.input === 'string' ? context.input : JSON.stringify(context.input);
    }
  } else if (!useChatHistory && inputMessage && inputMessage.trim()) {
    query = resolveVariables(inputMessage, userInputs || [], execContext || {}, allNodes);
  } else {
    query = typeof context.input === 'string' ? context.input : JSON.stringify(context.input);
  }

  try {
    console.log('[ChatAI] Request payload', {
      chatAIId,
      useChatHistory,
      query,
      historyLength: Array.isArray(history) ? history.length : 0,
      history,
    });
    const response = await ChatAIService.chat(chatAIId, chatAI.userId, {
      query,
      history,
    });

    // Store Chat AI output for variable resolution: {{node[ID].output.text}}
    if (!execContext.nodeOutputs) {
      execContext.nodeOutputs = {};
    }
    execContext.nodeOutputs[context.nodeId] = {
      text: response.content,
    };

    const messages = sendOutput
      ? [
          {
            role: 'assistant' as const,
            content: response.content,
            references: response.references,
            executionTime: response.executionTime,
            delayTime: response.delayTime,
            inputTokens: response.inputTokens,
            outputTokens: response.outputTokens,
            totalTokens: response.totalTokens,
          },
        ]
      : [];

    if (waitForReply) {
      // After Chat AI replies, we PAUSE and wait for user input
      return {
        waitingForInput: true, // Pause workflow, wait for user input
        output: response.content,
        nextNodeId: context.nodeData.outgoingNodeId || null, // Still need nextNodeId for potential resume
        messages,
      };
    }

    // Continue immediately to next node
    return {
      output: response.content,
      nextNodeId: context.nodeData.outgoingNodeId || null,
      messages,
    };
  } catch (error: any) {
    throw new Error(`Chat AI execution failed: ${error.message}`);
  }
}

/**
 * Build a readonly node map for condition evaluation: node[id].user.message, node[id].output.text
 */
function buildNodeMapForCondition(
  allNodes: any[] | undefined,
  userInputs: Array<{ nodeId: string; value: any }>,
  nodeOutputs: Record<string, { text?: string }> | undefined
): Record<number, { user: { message: string }; output: { text: string } }> {
  const node: Record<number, { user: { message: string }; output: { text: string } }> = {};
  if (!allNodes) return node;

  const outputs = nodeOutputs || {};
  for (const n of allNodes) {
    const numericId = n.data?.nodeId ?? n.nodeId;
    if (typeof numericId !== 'number') continue;

    const userInput = getLatestInputForNode(userInputs, n.id);
    const out = outputs[n.id];
    node[numericId] = {
      user: { message: userInput != null ? String(userInput.value) : '' },
      output: { text: out?.text != null ? String(out.text) : '' },
    };
  }
  return node;
}

/**
 * Execute an If/Else node
 * No pause: evaluates immediately using latest user input. Variables: message, input, node[ID].user.message, node[ID].output.text
 */
export async function executeIfElseNode(
  context: NodeExecutionContext
): Promise<NodeExecutionResult> {
  const { nodeData, userInputs, context: execContext, allNodes, input: contextInput } = context;
  const currentTurnInput = execContext?.currentTurnInput;

  const existingInput = getLatestInputForNode(userInputs, context.nodeId);
  const message = existingInput != null
    ? String(existingInput.value ?? '')
    : (
      currentTurnInput !== undefined && currentTurnInput !== null
        ? String(currentTurnInput)
        : (userInputs.length > 0 ? String(userInputs[userInputs.length - 1].value) : String(contextInput ?? ''))
    );
  const input = message;
  const user = {
    input: {
      latest:
        userInputs.length > 0
          ? String(userInputs[userInputs.length - 1].value ?? '')
          : String(contextInput ?? ''),
      first: userInputs.length > 0 ? String(userInputs[0].value ?? '') : String(contextInput ?? ''),
    },
  };

  const condition = (nodeData.condition || nodeData.data?.condition || '').trim();

  let result = false;

  if (!condition) {
    result = message.trim() !== '';
  } else {
    try {
      const node = buildNodeMapForCondition(
        allNodes,
        userInputs,
        execContext?.nodeOutputs
      );
      const fn = new Function(
        'message',
        'input',
        'node',
        'user',
        '"use strict"; return Boolean(' + condition + ');'
      );
      result = Boolean(fn(message, input, node, user));
    } catch {
      result = false;
    }
  }

  const nextNodeId = result
    ? (context.nodeData.trueNodeId || null)
    : (context.nodeData.falseNodeId || null);

  return {
    output: result,
    nextNodeId,
    // If/Else is a control node; it should not emit user chat messages.
    messages: [],
  };
}

/**
 * Execute a Loop Back node
 * No pause: immediately jumps to the selected loop-back target.
 */
export async function executeJumpAnywhereNode(
  context: NodeExecutionContext
): Promise<NodeExecutionResult> {
  const nextNodeId = context.nodeData.outgoingNodeId || null;
  const jumpInput =
    context.context?.currentTurnInput !== undefined &&
    context.context?.currentTurnInput !== null
      ? context.context.currentTurnInput
      : context.input;
  return {
    // Restart traversal from the selected node with current turn input.
    output: jumpInput,
    nextNodeId,
    messages: [],
  };
}

/**
 * Execute an Intent Recognition node
 * This node: Recognizes intent and routes to appropriate branch
 */
export async function executeIntentRecognitionNode(
  context: NodeExecutionContext
): Promise<NodeExecutionResult> {
  const { userInputs, context: execContext } = context;
  const waitForReply =
    context.nodeData.waitForReply !== undefined
      ? Boolean(context.nodeData.waitForReply)
      : context.nodeData.data?.waitForReply !== undefined
      ? Boolean(context.nodeData.data.waitForReply)
      : false;

  const consumedUserInputIndexes =
    context.runtime?.consumedUserInputIndexes || new Set<number>();
  const consumedInput = getNodeInputForExecution(
    userInputs,
    context.nodeId,
    context.runtime
  );

  if (waitForReply && !consumedInput) {
    return {
      waitingForInput: true,
      output: '',
      messages: [],
    };
  }

  // TODO: Implement intent recognition logic
  // For now, just pass through to first intent node
  const intentNodeIds = context.nodeData.intentNodeIds || {};
  const firstIntent = Object.keys(intentNodeIds)[0];
  const fallbackIntent = context.nodeData.defaultIntent || 'default';
  const selectedIntent = firstIntent || fallbackIntent;
  const nextNodeId = selectedIntent ? intentNodeIds[selectedIntent] || null : null;

  if (!execContext.nodeOutputs) {
    execContext.nodeOutputs = {};
  }
  execContext.nodeOutputs[context.nodeId] = {
    text: selectedIntent,
  };

  const shouldEchoUser =
    waitForReply && consumedInput
      ? shouldEchoUserInputInMessages(
          userInputs,
          consumedInput.index,
          consumedInput.replayedFromLoopBack
        )
      : false;

  if (waitForReply && consumedInput) {
    if (consumedInput.replayedFromLoopBack) {
      if (context.runtime) {
        context.runtime.hasUsedLoopBackInputReplay = true;
        context.runtime.allowLoopBackInputReplay = false;
      }
    } else {
      consumedUserInputIndexes.add(consumedInput.index);
    }
  }

  return {
    output: selectedIntent,
    nextNodeId,
    messages: waitForReply && consumedInput && shouldEchoUser
      ? [{ role: 'user', content: String(consumedInput.input.value) }]
      : [],
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
  const waitForReply =
    nodeData.waitForReply !== undefined
      ? Boolean(nodeData.waitForReply)
      : nodeData.data?.waitForReply !== undefined
      ? Boolean(nodeData.data.waitForReply)
      : false;

  const consumedUserInputIndexes =
    context.runtime?.consumedUserInputIndexes || new Set<number>();
  const consumedInput = getNodeInputForExecution(
    userInputs,
    context.nodeId,
    context.runtime
  );

  if (waitForReply && consumedInput) {
    const shouldEchoUser = shouldEchoUserInputInMessages(
      userInputs,
      consumedInput.index,
      consumedInput.replayedFromLoopBack
    );
    if (consumedInput.replayedFromLoopBack) {
      if (context.runtime) {
        context.runtime.hasUsedLoopBackInputReplay = true;
        context.runtime.allowLoopBackInputReplay = false;
      }
    } else {
      consumedUserInputIndexes.add(consumedInput.index);
    }
    const nextNodeId = context.nodeData.outgoingNodeId || null;
    return {
      output: consumedInput.input.value,
      nextNodeId,
      messages: shouldEchoUser
        ? [
            {
              role: 'user',
              content: String(consumedInput.input.value),
            },
          ]
        : [],
    };
  }

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

  const messages = [
    {
      role: 'assistant' as const,
      content: selectedMessage,
    },
  ];

  if (waitForReply) {
    return {
      waitingForInput: true,
      output: selectedMessage,
      nextNodeId,
      messages,
    };
  }

  return {
    output: selectedMessage,
    nextNodeId,
    messages,
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
  const consumedUserInputIndexes =
    context.runtime?.consumedUserInputIndexes || new Set<number>();

  // Check if we have an unconsumed input. After a loop-back jump, one replay is allowed.
  const consumedInput = getNodeInputForExecution(
    userInputs,
    context.nodeId,
    context.runtime
  );
  
  if (!consumedInput) {
    // We're waiting for user input - no message sent, just pause
    return {
      waitingForInput: true,
      output: '',
      messages: [], // No messages - just wait silently
    };
  }

  // We have the input, continue to next node
  const shouldEchoUser = shouldEchoUserInputInMessages(
    userInputs,
    consumedInput.index,
    consumedInput.replayedFromLoopBack
  );
  if (consumedInput.replayedFromLoopBack) {
    if (context.runtime) {
      context.runtime.hasUsedLoopBackInputReplay = true;
      context.runtime.allowLoopBackInputReplay = false;
    }
  } else {
    consumedUserInputIndexes.add(consumedInput.index);
  }
  const nextNodeId = context.nodeData.outgoingNodeId || null;

  return {
    output: consumedInput.input.value,
    nextNodeId,
    messages: shouldEchoUser
      ? [
          {
            role: 'user',
            content: String(consumedInput.input.value),
          },
        ]
      : [],
  };
}

/**
 * Execute an End node
 * End node: No message, no pause, no variables stored, signals restart after next input
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
    case 'jumpAnywhere':
      return executeJumpAnywhereNode(context);
    case 'loopBack':
      return executeJumpAnywhereNode(context);
    case 'intentRecognition':
      return executeIntentRecognitionNode(context);
    case 'end':
      return executeEndNode(context);
    default:
      throw new Error(`Unknown node type: ${nodeType}`);
  }
}