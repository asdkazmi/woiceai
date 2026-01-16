import { IAgent, Agent, IAgentData } from '../models/Agent';

export interface CreateAgentData {
  name: string;
  description?: string;
  agentData: IAgentData;
}

export interface UpdateAgentData {
  name?: string;
  description?: string;
  agentData?: IAgentData;
}

export class AgentService {
  /**
   * Get all agents for a user
   */
  static async getAll(userId: number): Promise<IAgent[]> {
    return Agent.findByUserId(userId);
  }

  /**
   * Get a single agent by ID
   */
  static async get(id: number, userId: number): Promise<IAgent | null> {
    const agent = await Agent.findById(id);
    if (!agent || agent.userId !== userId) {
      return null;
    }
    return agent;
  }

  /**
   * Create a new agent
   */
  static async create(userId: number, data: CreateAgentData): Promise<IAgent> {
    // Check for duplicate name
    const existingAgent = await Agent.findByNameAndUser(data.name.trim(), userId);
    if (existingAgent) {
      throw new Error('An agent with this name already exists');
    }

    // Validate agent data
    this.validateAgentData(data.agentData);

    const agent = await Agent.create({
      userId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      agentData: data.agentData,
      isPublished: false,
    });

    return agent;
  }

  /**
   * Update an agent
   */
  static async update(id: number, userId: number, data: UpdateAgentData): Promise<IAgent | null> {
    const agent = await Agent.findById(id);
    if (!agent || agent.userId !== userId) {
      throw new Error('Agent not found');
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name.trim() !== agent.name) {
      const existingAgent = await Agent.findByNameAndUser(data.name.trim(), userId);
      if (existingAgent) {
        throw new Error('An agent with this name already exists');
      }
    }

    // Validate agent data if it's being updated
    if (data.agentData) {
      this.validateAgentData(data.agentData);
    }

    const updates: Partial<IAgent> = {};
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.description !== undefined) updates.description = data.description?.trim() || null;
    if (data.agentData !== undefined) updates.agentData = data.agentData;

    const success = await Agent.update(id, updates);
    if (!success) {
      throw new Error('Failed to update agent');
    }

    return await Agent.findById(id);
  }

  /**
   * Delete an agent
   */
  static async delete(id: number, userId: number): Promise<boolean> {
    const agent = await Agent.findById(id);
    if (!agent || agent.userId !== userId) {
      return false;
    }

    return await Agent.delete(id);
  }

  /**
   * Toggle publish status
   */
  static async togglePublish(id: number, userId: number): Promise<IAgent> {
    const agent = await Agent.findById(id);
    if (!agent || agent.userId !== userId) {
      throw new Error('Agent not found');
    }

    // Validate agent before publishing
    if (!agent.isPublished) {
      this.validateAgentData(agent.agentData);
    }

    const success = await Agent.update(id, {
      isPublished: !agent.isPublished,
    });

    if (!success) {
      throw new Error('Failed to update agent');
    }

    const updatedAgent = await Agent.findById(id);
    if (!updatedAgent) {
      throw new Error('Failed to retrieve updated agent');
    }

    return updatedAgent;
  }

  /**
   * Validate agent data structure
   */
  private static validateAgentData(agentData: IAgentData): void {
    if (!agentData || typeof agentData !== 'object') {
      throw new Error('Invalid agent data: must be an object');
    }

    if (!Array.isArray(agentData.nodes)) {
      throw new Error('Invalid agent data: nodes must be an array');
    }

    if (!Array.isArray(agentData.edges)) {
      throw new Error('Invalid agent data: edges must be an array');
    }

    // Check for exactly one Start node
    const startNodes = agentData.nodes.filter((node: any) => node.type === 'start');
    if (startNodes.length === 0) {
      throw new Error('Agent must have exactly one Start node');
    }
    if (startNodes.length > 1) {
      throw new Error('Agent can only have one Start node');
    }

    // Check for at least one End node
    const endNodes = agentData.nodes.filter((node: any) => node.type === 'end');
    if (endNodes.length === 0) {
      throw new Error('Agent must have at least one End node');
    }

    // Validate node connections (check for cycles - basic check)
    this.validateNoCycles(agentData.nodes, agentData.edges);

    // Ensure all nodes are reachable from Start node
    this.validateReachability(agentData.nodes, agentData.edges);
  }

  /**
   * Basic cycle detection (DFS)
   */
  private static validateNoCycles(nodes: any[], edges: any[]): void {
    const startNode = nodes.find((n: any) => n.type === 'start');
    if (!startNode) return;

    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true; // Cycle detected
      }
      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      // Get all outgoing edges from this node
      const outgoingEdges = edges.filter((e: any) => e.source === nodeId);
      for (const edge of outgoingEdges) {
        if (hasCycle(edge.target)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    if (hasCycle(startNode.id)) {
      throw new Error('Agent workflow contains cycles. Workflows must be acyclic (DAG).');
    }
  }

  /**
   * Ensure all nodes are reachable from Start node
   */
  private static validateReachability(nodes: any[], edges: any[]): void {
    const startNode = nodes.find((n: any) => n.type === 'start');
    if (!startNode) return;

    const reachable = new Set<string>();
    const queue: string[] = [startNode.id];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (reachable.has(nodeId)) continue;

      reachable.add(nodeId);

      // Get all outgoing edges
      const outgoingEdges = edges.filter((e: any) => e.source === nodeId);
      for (const edge of outgoingEdges) {
        if (!reachable.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    const allNodeIds = new Set(nodes.map((n: any) => n.id));
    const unreachable = Array.from(allNodeIds).filter((id) => !reachable.has(id));

    if (unreachable.length > 0) {
      throw new Error(`Agent has unreachable nodes: ${unreachable.join(', ')}`);
    }
  }
}

