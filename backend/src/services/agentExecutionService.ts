import { Agent } from '../models/Agent';
import { AgentExecution, IAgentExecutionState } from '../models/AgentExecution';
import { AgentChatMessage } from '../models/AgentChatMessage';
import { executeNode, NodeExecutionContext, NodeExecutionResult } from './agentExecutionService/nodeExecutors';

export interface ExecuteAgentRequest {
  input?: string;
  isRestart?: boolean;
  executionId?: number;
}

export interface ExecuteAgentResponse {
  status: 'completed' | 'waiting_input' | 'restarting';
  message?: string;
  messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  executionId?: number;
  waitingForNodeId?: string;
}

export class AgentExecutionService {
  /**
   * Execute an agent workflow
   * 
   * Session-based architecture:
   * - executionId = sessionId (each chat gets a unique session)
   * - executionState stores: currentNodeId, userInputs (all variables), context
   * - All messages are stored with executionId (sessionId) for chat history
   * - When resuming, use executionId (sessionId) to load state and continue workflow
   */
  static async execute(
    agentId: number,
    userId: number,
    request: ExecuteAgentRequest
  ): Promise<ExecuteAgentResponse> {
    // Load agent
    const agent = await Agent.findById(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Check if agent is published (only allow execution of published agents for non-owners)
    // For now, we'll allow owners to execute unpublished agents for testing
    if (agent.userId !== userId && !agent.isPublished) {
      throw new Error('Agent is not published');
    }

    const { nodes, edges } = agent.agentData;

    // Load execution (session) - executionId = sessionId
    // Only use existing execution if executionId is explicitly provided (for resume)
    // If no executionId is provided, start fresh
    let execution = request.executionId
      ? await AgentExecution.findById(request.executionId)
      : null;
    
    // If executionId provided but execution not found, throw error
    if (request.executionId && !execution) {
      throw new Error(`Execution (session) not found: ${request.executionId}`);
    }

    let executionState: IAgentExecutionState;
    let currentInput: any = request.input || null;

    if (execution && !request.isRestart) {
      // Continue from saved session state (sessionId = executionId)
      // Clone the execution state to avoid mutating the original object
      executionState = execution.executionState 
        ? JSON.parse(JSON.stringify(execution.executionState))
        : {};

      if (executionState.context?.pendingRestart) {
        // Restart within the same session to keep chat history
        if (!executionState.context) {
          executionState.context = {};
        }
        executionState.context.pendingRestart = false;
        executionState.context.isRestart = true;
        executionState.currentNodeId = undefined;
        executionState.userInputs = [];

        if (request.input !== undefined && request.input !== null && request.input !== '') {
          executionState.userInputs.push({
            nodeId: 'initial_input',
            value: request.input,
          });
        }
      } else {
        // Ensure userInputs array exists (this stores all user inputs for variable resolution)
        if (!executionState.userInputs) {
          executionState.userInputs = [];
        }
        
        // If we have input, it means we're resuming from a waiting node
        // Store the input with the node ID it belongs to for variable resolution
        if (request.input !== undefined && request.input !== null && request.input !== '') {
          const waitingNodeId = executionState.currentNodeId;
          if (waitingNodeId) {
            // Add input to userInputs array - this allows the node to find it when it executes
            executionState.userInputs.push({
              nodeId: waitingNodeId,
              value: request.input,
            });
          }
        }
      }
    } else {
      // Start fresh or restart
      // Delete any existing waiting executions for this agent/user when starting fresh
      if (!request.executionId && !request.isRestart) {
        await AgentExecution.deleteByAgentAndUser(agentId, userId);
      }

      const initialUserInputs: Array<{ nodeId: string; value: any }> = [];
      
      // If starting fresh with an initial input, store it in userInputs
      // This allows {{user.input.latest}} and {{user.input.first}} to work
      if (request.input !== undefined && request.input !== null && request.input !== '') {
        initialUserInputs.push({
          nodeId: 'initial_input', // Special identifier for initial input from Start
          value: request.input,
        });
      }

      // Initialize fresh session state
      executionState = {
        currentNodeId: undefined, // Will be set when workflow starts
        context: {
          isRestart: request.isRestart || false,
          history: [],
        },
        userInputs: initialUserInputs, // All user inputs stored here for variable resolution
      };

      // Delete old execution if exists (for restart case)
      if (execution && request.isRestart) {
        await AgentExecution.delete(execution.id!);
      }
    }

    // Find Start node
    const startNode = nodes.find((n: any) => n.type === 'start');
    if (!startNode) {
      throw new Error('Agent workflow must have a Start node');
    }

    // Initialize chat history tracking if enabled on Start node
    if (!executionState.context) {
      executionState.context = {};
    }
    if (executionState.context.storeChatHistory === undefined) {
      executionState.context.storeChatHistory = Boolean(startNode.data?.storeChatHistory);
    }
    if (executionState.context.storeChatHistory) {
      if (!Array.isArray(executionState.context.chatMessages)) {
        executionState.context.chatMessages = [];
      }
      if (request.input !== undefined && request.input !== null && String(request.input).trim() !== '') {
        executionState.context.chatMessages.push({
          role: 'user',
          content: String(request.input),
        });
      }
    }

    // Start execution from Start node or current node
    let currentNode;
    if (request.isRestart || !executionState.currentNodeId) {
      // Start from beginning
      currentNode = startNode;
      executionState.currentNodeId = startNode.id;
      if (!executionState.context) {
        executionState.context = {};
      }
      executionState.context.isRestart = request.isRestart || false;
    } else {
      // Continue from saved state
      const currentNodeId = executionState.currentNodeId;
      currentNode = nodes.find((n: any) => n.id === currentNodeId);
      
      if (!currentNode) {
        // If current node doesn't exist, restart from Start
        currentNode = startNode;
        executionState.currentNodeId = startNode.id;
        if (!executionState.context) {
          executionState.context = {};
        }
        executionState.context.isRestart = true;
      }
    }

    if (!currentNode) {
      throw new Error('Could not find current node in workflow');
    }

    // Execute workflow
    const result = await this.executeWorkflow(
      nodes,
      edges,
      currentNode,
      currentInput,
      executionState
    );

    // Save or update execution state
    if (result.waitingForInput) {
      // Use the waiting node ID from the result (the actual node that's waiting)
      const waitingNodeId = result.waitingNodeId || currentNode.id;
      executionState.currentNodeId = waitingNodeId;
      
      // Create or update execution (session) - this is our session ID
      if (!execution) {
        execution = await AgentExecution.create({
          agentId,
          userId,
          executionState,
          status: 'waiting_input',
        });
      } else {
        await AgentExecution.update(execution.id!, {
          executionState,
          status: 'waiting_input',
        });
      }

      // Save messages to chat history (associated with this session)
      if (result.messages) {
        for (const msg of result.messages) {
          await AgentChatMessage.create({
            agentId,
            userId,
            executionId: execution.id || undefined, // Session ID
            role: msg.role,
            content: msg.content,
            references: msg.references,
            executionTime: msg.executionTime,
            delayTime: msg.delayTime,
            inputTokens: msg.inputTokens,
            outputTokens: msg.outputTokens,
            totalTokens: msg.totalTokens,
          });
        }
      }

      return {
        status: 'waiting_input',
        message: result.output || 'Waiting for input',
        messages: result.messages,
        executionId: execution.id, // Session ID
        waitingForNodeId: waitingNodeId, // The actual node that's waiting for input
      };
    }

    // Handle restart if End node was reached
    if (result.shouldRestart) {
      // End node reached: wait for a new user message before restarting.
      if (!executionState.context) {
        executionState.context = {};
      }
      executionState.context.pendingRestart = true;

      // Create or update execution (session) to wait for input
      if (!execution) {
        execution = await AgentExecution.create({
          agentId,
          userId,
          executionState,
          status: 'waiting_input',
        });
      } else {
        await AgentExecution.update(execution.id!, {
          executionState,
          status: 'waiting_input',
        });
      }

      // Save messages to chat history (associated with this session)
      if (result.messages) {
        for (const msg of result.messages) {
          await AgentChatMessage.create({
            agentId,
            userId,
            executionId: execution.id || undefined,
            role: msg.role,
            content: msg.content,
            references: msg.references,
            executionTime: msg.executionTime,
            delayTime: msg.delayTime,
            inputTokens: msg.inputTokens,
            outputTokens: msg.outputTokens,
            totalTokens: msg.totalTokens,
          });
        }
      }

      return {
        status: 'waiting_input',
        message: result.output || 'Waiting for input',
        messages: result.messages,
        executionId: execution.id,
        waitingForNodeId: executionState.currentNodeId,
      };
    }

    // Workflow completed normally (reached end of workflow without End node or waiting node)
    // Delete the execution (session) since workflow has finished
    // Next user message will start a fresh workflow
    if (execution) {
      await AgentExecution.delete(execution.id!);
    }

    // Save messages to chat history (no session ID since workflow completed)
    if (result.messages && result.messages.length > 0) {
      for (const msg of result.messages) {
        await AgentChatMessage.create({
          agentId,
          userId,
          executionId: undefined, // No session ID - workflow completed
          role: msg.role,
          content: msg.content,
          references: msg.references,
          executionTime: msg.executionTime,
          delayTime: msg.delayTime,
          inputTokens: msg.inputTokens,
          outputTokens: msg.outputTokens,
          totalTokens: msg.totalTokens,
        });
      }
    }

    return {
      status: 'completed',
      message: result.output || 'Execution completed',
      messages: result.messages,
      executionId: undefined, // No session ID - workflow completed, next message starts fresh
      // waitingForNodeId is not included - workflow has ended
    };
  }

  /**
   * Execute workflow from a given node
   */
  private static async executeWorkflow(
    nodes: any[],
    edges: any[],
    startNode: any,
    input: any,
    executionState: IAgentExecutionState
  ): Promise<NodeExecutionResult & { waitingForInput?: boolean; shouldRestart?: boolean; waitingNodeId?: string }> {
    let currentNode = startNode;
    let currentInput = input;
    let messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

    // Build edge map for quick lookup
    const edgeMap = new Map<string, string[]>();
    for (const edge of edges) {
      if (!edgeMap.has(edge.source)) {
        edgeMap.set(edge.source, []);
      }
      edgeMap.get(edge.source)!.push(edge.target);
    }

    // Build node map for quick lookup
    const nodeMap = new Map<string, any>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    // Execute nodes until we hit a stopping condition
    while (currentNode) {
      // Get outgoing edges for this node
      const outgoingEdges = edgeMap.get(currentNode.id) || [];
      
      // Separate edges by source handle for conditional nodes
      const trueEdge = outgoingEdges.find((targetId: string) => {
        const edge = edges.find((e: any) => e.source === currentNode.id && e.target === targetId);
        return edge?.sourceHandle === 'true';
      });
      const falseEdge = outgoingEdges.find((targetId: string) => {
        const edge = edges.find((e: any) => e.source === currentNode.id && e.target === targetId);
        return edge?.sourceHandle === 'false';
      });
      
      // Prepare node data with outgoing node info
      const nodeData = {
        ...currentNode.data,
        outgoingNodeId: outgoingEdges[0] || null, // For simple nodes, take first edge
        // For conditional nodes, they handle their own routing
        trueNodeId: trueEdge || outgoingEdges[0] || null,
        falseNodeId: falseEdge || outgoingEdges[1] || null,
        intentNodeIds: this.buildIntentNodeMap(currentNode, outgoingEdges, edges),
      };

      // Create execution context
      const execContext: NodeExecutionContext = {
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        nodeData,
        input: currentInput,
        context: executionState.context || {},
        userInputs: executionState.userInputs || [], // Pass userInputs array so nodes can find their inputs
        allNodes: nodes, // Pass all nodes for variable resolution
      };

      // Execute node
      const result = await executeNode(execContext);

      // Collect messages
      if (result.messages) {
        messages.push(...result.messages);
      }

      if (executionState.context?.storeChatHistory && result.messages) {
        if (!executionState.context) {
          executionState.context = {};
        }
        if (!Array.isArray(executionState.context.chatMessages)) {
          executionState.context.chatMessages = [];
        }
        result.messages.forEach((msg) => {
          if (msg.role === 'user') return;
          executionState.context!.chatMessages.push({
            role: msg.role,
            content: msg.content,
          });
        });
      }

      // Update execution context with any changes from node execution
      // Note: result.context is not returned from nodes, we update context in executionState directly
      if (!executionState.context) {
        executionState.context = {};
      }

      // Handle waiting for input
      if (result.waitingForInput) {
        // Return the node that's waiting (current node in the loop)
        // Don't update executionState.currentNodeId here - it's already set to the current node
        return {
          ...result,
          waitingForInput: true,
          waitingNodeId: currentNode.id, // Track which node is actually waiting
          messages,
        };
      }

      // Handle restart
      if (result.shouldRestart) {
        return {
          ...result,
          shouldRestart: true,
          messages,
        };
      }

      // Move to next node
      if (result.nextNodeId) {
        const nextNode = nodeMap.get(result.nextNodeId);
        if (!nextNode) {
          throw new Error(`Next node ${result.nextNodeId} not found`);
        }
        currentNode = nextNode;
        currentInput = result.output;
        // Update execution state to track current node
        executionState.currentNodeId = nextNode.id;
      } else {
        // No next node, workflow completed
        // Clear currentNodeId to indicate we've finished
        executionState.currentNodeId = undefined;
        break;
      }
    }

    return {
      output: currentInput,
      messages,
      nextNodeId: executionState.currentNodeId || null, // Return current node ID if workflow is still active
    };
  }

  /**
   * Build intent node mapping for intent recognition nodes
   */
  private static buildIntentNodeMap(node: any, outgoingEdges: string[], allEdges: any[]): Record<string, string> {
    const intentNodeIds: Record<string, string> = {};
    
    // Map edges by sourceHandle (intent name) to target node
    if (node.data?.intentCategories && Array.isArray(node.data.intentCategories)) {
      node.data.intentCategories.forEach((category: any) => {
        const matchingEdge = allEdges.find(
          (e: any) => e.source === node.id && e.sourceHandle === category.name
        );
        if (matchingEdge) {
          intentNodeIds[category.name] = matchingEdge.target;
        }
      });
    }

    return intentNodeIds;
  }

  /**
   * Get chat history for an agent
   */
  static async getChatHistory(
    agentId: number,
    userId: number,
    limit?: number
  ): Promise<AgentChatMessage[]> {
    return AgentChatMessage.findByAgentAndUser(agentId, userId, limit);
  }

  /**
   * Clear chat history for an agent
   */
  static async clearChatHistory(agentId: number, userId: number): Promise<boolean> {
    return AgentChatMessage.deleteByAgentAndUser(agentId, userId);
  }
}

