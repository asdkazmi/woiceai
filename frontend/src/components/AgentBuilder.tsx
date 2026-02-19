import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  BackgroundVariant,
} from '@xyflow/react';
import { ConnectionLineType } from '@xyflow/system';
import '@xyflow/react/dist/style.css';
import { agentService, Agent } from '../services/agentService';
import AgentBuilderChat from './AgentBuilderChat';
import { ArrowLeft, Save, Settings, MessageSquare, X } from 'lucide-react';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import IconButton from './ui/IconButton';
import StartNode from './agent-nodes/StartNode';
import ChatAINode from './agent-nodes/ChatAINode';
import IfElseNode from './agent-nodes/IfElseNode';
import IntentRecognitionNode from './agent-nodes/IntentRecognitionNode';
import SendMessageNode from './agent-nodes/SendMessageNode';
import WaitForReplyNode from './agent-nodes/WaitForReplyNode';
import EndNode from './agent-nodes/EndNode';
import PlaceholderNode from './agent-nodes/PlaceholderNode';
import LoopBackNode from './agent-nodes/LoopBackNode';
import NodeConfigPanel from './agent-nodes/NodeConfigPanel';
import AddNodeEdge from './edges/AddNodeEdge';
import LoopBackEdge from './edges/LoopBackEdge';

// Define nodeTypes outside component to prevent recreation on every render
const nodeTypes: NodeTypes = {
  start: StartNode,
  chatAI: ChatAINode,
  waitForReply: WaitForReplyNode,
  ifElse: IfElseNode,
  intentRecognition: IntentRecognitionNode,
  sendMessage: SendMessageNode,
  end: EndNode,
  placeholder: PlaceholderNode,
  loopBack: LoopBackNode,
};

const edgeTypes = {
  addNode: AddNodeEdge,
  loopBack: LoopBackEdge,
};

const initialNodeId = 1;
const VERTICAL_SPACING = 200; // Consistent vertical distance regardless of node height
const NODE_WIDTH = 200; // Base horizontal unit
const BRANCH_GAP = 80; // Gap between true and false branches of if/else nodes
const HORIZONTAL_CENTER = 400;
const NODE_X_POSITION = HORIZONTAL_CENTER - NODE_WIDTH / 2;

// Width (in slots) for each subtree; leaves are width 1.
const computeSubtreeWidth = (
  nodeId: string,
  nodeMap: Map<string, Node>,
  outgoingMap: Map<string, Edge[]>,
  memo: Map<string, number>,
  visiting: Set<string>
): number => {
  if (memo.has(nodeId)) return memo.get(nodeId)!;
  if (visiting.has(nodeId)) {
    // Cycle guard: treat as leaf to avoid infinite recursion
    memo.set(nodeId, 1);
    return 1;
  }
  visiting.add(nodeId);
  const node = nodeMap.get(nodeId);
  const children = outgoingMap.get(nodeId) || [];

  if (!node) {
    memo.set(nodeId, 1);
    visiting.delete(nodeId);
    return 1;
  }

  // If/Else nodes reserve one slot for each branch (true/false).
  // This ensures the branch spacing grows as nested branches expand.
  if (node.type === 'ifElse') {
    const trueEdge = children.find((edge) => edge.sourceHandle === 'true');
    const falseEdge = children.find((edge) => edge.sourceHandle === 'false');
    const otherEdges = children.filter(
      (edge) => edge.sourceHandle !== 'true' && edge.sourceHandle !== 'false'
    );

    const trueWidth = trueEdge
      ? computeSubtreeWidth(trueEdge.target, nodeMap, outgoingMap, memo, visiting)
      : 1;
    const falseWidth = falseEdge
      ? computeSubtreeWidth(falseEdge.target, nodeMap, outgoingMap, memo, visiting)
      : 1;
    const otherWidth = otherEdges.reduce(
      (sum, edge) =>
        sum + computeSubtreeWidth(edge.target, nodeMap, outgoingMap, memo, visiting),
      0
    );

    const total = trueWidth + falseWidth + otherWidth;
    const width = Math.max(total, 2); // ensure at least two slots
    memo.set(nodeId, width);
    visiting.delete(nodeId);
    return width;
  }

  if (children.length === 0) {
    memo.set(nodeId, 1);
    visiting.delete(nodeId);
    return 1;
  }

  // For linear nodes: keep widest child to maintain alignment
  const width = Math.max(
    1,
    ...children.map((edge) =>
      computeSubtreeWidth(edge.target, nodeMap, outgoingMap, memo, visiting)
    )
  );
  memo.set(nodeId, width);
  visiting.delete(nodeId);
  return width;
};

// Convert width (slots) to pixel span.
// width=1 => NODE_WIDTH
// width=2 => 2*NODE_WIDTH + BRANCH_GAP (matches 2X+5 when X=NODE_WIDTH)
const widthToSpan = (width: number): number => {
  if (width <= 1) return NODE_WIDTH;
  return width * NODE_WIDTH + (width - 1) * BRANCH_GAP;
};

const repositionNodesVertically = (nodes: Node[], edges: Edge[]): Node[] => {
  const nodeMap = new Map(nodes.map((n) => [n.id, { ...n }]));
  const startNode = nodes.find((n) => n.id === 'node-start' || n.type === 'start');
  if (!startNode) return nodes;

  // Exclude loop-back edges from layout (they go backward and should not affect positioning)
  const layoutEdges = edges.filter((e) => !(e.data as any)?.isLoopBack);

  // Build outgoing map from non-loop-back edges only
  const outgoingMap = new Map<string, Edge[]>();
  layoutEdges.forEach((e) => {
    if (!outgoingMap.has(e.source)) outgoingMap.set(e.source, []);
    outgoingMap.get(e.source)!.push(e);
  });

  // Pre-compute subtree widths
  const widthMemo = new Map<string, number>();
  const visiting = new Set<string>();
  nodeMap.forEach((_n, id) =>
    computeSubtreeWidth(id, nodeMap, outgoingMap, widthMemo, visiting)
  );

  const positioned = new Set<string>();
  const result: Node[] = [];

  const layout = (nodeId: string, left: number, y: number) => {
    if (positioned.has(nodeId)) return;
    positioned.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (!node) return;

    const subtreeWidth = widthMemo.get(nodeId) ?? 1;
    const subtreeSpan = widthToSpan(subtreeWidth);
    const x = left + subtreeSpan / 2;
    node.position = { x, y };
    node.draggable = false;
    result.push(node);

    const children = outgoingMap.get(nodeId) || [];
    if (children.length === 0) return;

    if (node.type === 'ifElse') {
      // Place true/false branches based on their subtree widths
      const trueEdge = children.find((edge) => edge.sourceHandle === 'true');
      const falseEdge = children.find((edge) => edge.sourceHandle === 'false');
      const otherEdges = children.filter(
        (edge) => edge.sourceHandle !== 'true' && edge.sourceHandle !== 'false'
      );

      const trueWidth = trueEdge ? widthMemo.get(trueEdge.target) ?? 1 : 1;
      const falseWidth = falseEdge ? widthMemo.get(falseEdge.target) ?? 1 : 1;
      const trueSpan = widthToSpan(trueWidth);
      const falseSpan = widthToSpan(falseWidth);

      const trueLeft = left;
      const falseLeft = left + trueSpan + BRANCH_GAP;

      if (trueEdge) {
        layout(trueEdge.target, trueLeft, y + VERTICAL_SPACING);
      }
      if (falseEdge) {
        layout(falseEdge.target, falseLeft, y + VERTICAL_SPACING);
      }
      // Any non-branching edges fall back to parent alignment.
      if (otherEdges.length > 0) {
        const spread = NODE_WIDTH;
        const count = otherEdges.length;
        otherEdges.forEach((edge, idx) => {
          const childX =
            count > 1 ? x - ((count - 1) * spread) / 2 + idx * spread : x;
          layout(edge.target, childX - (widthToSpan(widthMemo.get(edge.target) ?? 1) / 2), y + VERTICAL_SPACING);
        });
      }
    } else {
      // Non-branching: keep children aligned with parent (or lightly spread if multiple)
      const spread = NODE_WIDTH;
      const count = children.length;
      children.forEach((edge, idx) => {
        const childX =
          count > 1 ? x - ((count - 1) * spread) / 2 + idx * spread : x;
        const childWidth = widthMemo.get(edge.target) ?? 1;
        layout(edge.target, childX - widthToSpan(childWidth) / 2, y + VERTICAL_SPACING);
      });
    }
  };

  const startWidth = widthMemo.get(startNode.id) ?? 1;
  const startLeft = NODE_X_POSITION - widthToSpan(startWidth) / 2;
  layout(startNode.id, startLeft, 50);

  // Any unvisited nodes (safety)
  nodeMap.forEach((node, id) => {
    if (!positioned.has(id)) {
      result.push({ ...node, position: { x: NODE_X_POSITION, y: 50 + result.length * VERTICAL_SPACING }, draggable: false });
    }
  });

  return result;
};

const AgentBuilderInner: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodeIdCounter, setNodeIdCounter] = useState(initialNodeId);
  const [activeTab, setActiveTab] = useState<'config' | 'chat' | 'variables'>('config');
  const [showNodeTypeModal, setShowNodeTypeModal] = useState(false);
  const [sourceNodeForConnection, setSourceNodeForConnection] = useState<Node | null>(null);
  const [targetNodeForInsertion, setTargetNodeForInsertion] = useState<string | null>(null);
  const [edgeIdForInsertion, setEdgeIdForInsertion] = useState<string | null>(null);
  const [showDeleteBranchModal, setShowDeleteBranchModal] = useState(false);
  const [deleteBranchNodeId, setDeleteBranchNodeId] = useState<string | null>(null);
  const [deleteBranchChoice, setDeleteBranchChoice] = useState<'true' | 'false' | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Disable node dragging - nodes should have fixed positions
  const handleNodesChange = useCallback(
    (changes: any[]) => {
      // Filter out position changes to prevent dragging
      // Also filter out changes to placeholder nodes (they're managed separately)
      const filteredChanges = changes.filter(
        (change) => change.type !== 'position' && !change.id?.startsWith('placeholder-')
      );
      onNodesChange(filteredChanges);
    },
    [onNodesChange]
  );

  // Handle edge changes, but protect placeholder edges
  const handleEdgesChange = useCallback(
    (changes: any[]) => {
      // Filter out changes to placeholder edges (they're managed separately)
      const filteredChanges = changes.filter(
        (change) => !change.id?.startsWith('edge-placeholder-')
      );
      onEdgesChange(filteredChanges);
    },
    [onEdgesChange]
  );

  useEffect(() => {
    loadAgent();
  }, [id]);

  // Ensure all nodes have nodeIds assigned (run once after load)
  useEffect(() => {
    if (nodes.length === 0 || loading) return;
    
    const nodesWithoutIds = nodes.filter((node) => {
      const nodeId = node.data?.nodeId;
      return nodeId === undefined || typeof nodeId !== 'number';
    });
    
    if (nodesWithoutIds.length > 0) {
      // Find max nodeId
      const maxNodeId = nodes.reduce((max, node) => {
        const nodeId = node.data?.nodeId;
        return typeof nodeId === 'number' && nodeId > max ? nodeId : max;
      }, -1);
      
      // Create a map of nodes with their IDs
      const nodeMap = new Map(nodes.map((n) => [n.id, { ...n }]));
      const visited = new Set<string>();
      let nextNodeId = maxNodeId + 1;
      
      const assignNodeIds = (nodeId: string) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        
        const node = nodeMap.get(nodeId);
        if (!node) return;
        
        if (node.id === 'node-start' || node.type === 'start') {
          node.data = { ...node.data, nodeId: 0 };
        } else if (node.data?.nodeId === undefined || typeof node.data.nodeId !== 'number') {
          node.data = { ...node.data, nodeId: nextNodeId++ };
        }
        
        // Find all outgoing edges and assign IDs to target nodes
        const outgoingEdges = edges.filter((e) => e.source === nodeId);
        outgoingEdges.forEach((edge) => {
          assignNodeIds(edge.target);
        });
      };
      
      // Start from Start node
      const startNodeId = nodes.find((n) => n.id === 'node-start' || n.type === 'start')?.id;
      if (startNodeId) {
        const startNode = nodeMap.get(startNodeId);
        if (startNode) {
          startNode.data = { ...startNode.data, nodeId: 0 };
          nextNodeId = 1;
          assignNodeIds(startNodeId);
        }
      }
      
      // Assign IDs to any remaining unvisited nodes
      nodeMap.forEach((node, nodeId) => {
        if (!visited.has(nodeId) && (node.data?.nodeId === undefined || typeof node.data.nodeId !== 'number')) {
          node.data = { ...node.data, nodeId: nextNodeId++ };
        }
      });
      
      // Update nodes state with new node objects
      const updatedNodes = Array.from(nodeMap.values());
      setNodes(updatedNodes);
    }
  }, [nodes.length, edges.length, loading]); // Only run when structure changes

  const loadAgent = async () => {
    if (id === 'new') {
      setAgent(null);
      // Always create a Start node for new agents
      const startNode: Node = {
        id: 'node-start',
        type: 'start',
        position: { x: NODE_X_POSITION, y: 50 },
        data: {
          nodeId: 0, // Start node always has ID 0
        },
        draggable: false,
      };
      setNodes([startNode]);
      setEdges([]);
      setNodeIdCounter(initialNodeId);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await agentService.getById(parseInt(id!));
      setAgent(data);
      
      // Load nodes and edges from agent data
      if (data.agentData?.nodes && data.agentData?.edges) {
        const loadedNodes = data.agentData.nodes.map((n: any) => ({
          ...n,
          id: n.id || `node-${Date.now()}`,
          type: n.type || 'default',
          position: n.position || { x: 0, y: 0 },
          data: {
            ...n.data,
            // Ensure nodeId is set, assign if missing
            nodeId: n.data?.nodeId !== undefined ? n.data.nodeId : (n.id === 'node-start' ? 0 : undefined),
          },
        }));
        
        // Assign node IDs based on workflow order (traverse from Start node)
        const nodeMap = new Map(loadedNodes.map((n: any) => [n.id, n]));
        const visited = new Set<string>();
        let currentNodeId = 0;
        
        const assignNodeIds = (nodeId: string) => {
          if (visited.has(nodeId)) return;
          visited.add(nodeId);
          
          const node = nodeMap.get(nodeId);
          if (!node) return;
          
          // Assign nodeId if not already set
          if (node.data.nodeId === undefined) {
            node.data.nodeId = currentNodeId++;
          }
          
          // Find all outgoing edges and assign IDs to target nodes
          const outgoingEdges = data.agentData.edges.filter((e: any) => e.source === nodeId);
          outgoingEdges.forEach((edge: any) => {
            assignNodeIds(edge.target);
          });
        };
        
        // Start from Start node
        const startNode = loadedNodes.find((n: any) => n.id === 'node-start' || n.type === 'start');
        if (startNode) {
          startNode.data.nodeId = 0;
          currentNodeId = 1;
          assignNodeIds(startNode.id);
        }
        
        // Assign IDs to any remaining unvisited nodes
        loadedNodes.forEach((node: any) => {
          if (!visited.has(node.id) && node.data.nodeId === undefined) {
            node.data.nodeId = currentNodeId++;
          }
        });
        
        // Ensure Start node exists
        const hasStartNode = loadedNodes.some((n: any) => n.id === 'node-start' || n.type === 'start');
        if (!hasStartNode) {
          const startNode: Node = {
            id: 'node-start',
            type: 'start',
            position: { x: NODE_X_POSITION, y: 50 },
            data: {
              nodeId: 0, // Start node always has ID 0
            },
            draggable: false,
          };
          loadedNodes.unshift(startNode);
        }
        
        const loadedEdges = data.agentData.edges.map((e: any) => ({
          ...e,
          id: e.id || `edge-${e.source}-${e.target}`,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle || 'source',
          targetHandle: e.targetHandle || null,
          type: e.data?.isLoopBack ? 'loopBack' : 'addNode',
          data: e.data || {},
          style: e.data?.isLoopBack ? { stroke: '#fdba74', strokeWidth: 2 } : e.style,
        }));
        
        // Reposition all nodes to ensure vertical alignment with fixed spacing
        const repositionedNodes = repositionNodesVertically(loadedNodes, loadedEdges);
        
        setNodes(repositionedNodes);
        setEdges(loadedEdges);
        
        // Calculate max nodeIdCounter based on node IDs
        const maxNodeId = Math.max(
          ...repositionedNodes.map((n: any) => (typeof n.data?.nodeId === 'number' ? n.data.nodeId : -1)),
          -1
        );
        setNodeIdCounter(Math.max(maxNodeId + 1, initialNodeId));
      } else {
        // Create Start node if no data
        const startNode: Node = {
          id: 'node-start',
          type: 'start',
          position: { x: NODE_X_POSITION, y: 50 },
          data: {
            nodeId: 0, // Start node always has ID 0
          },
          draggable: false,
        };
        setNodes([startNode]);
        setEdges([]);
        setNodeIdCounter(initialNodeId);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load agent');
      console.error('Error loading agent:', err);
    } finally {
      setLoading(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, type: 'addNode' }, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    // Switch to configuration tab when clicking on a node
    setActiveTab('config');
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleAddNodeAfter = (sourceNodeId: string, type: string, targetNodeId?: string, sourceHandle?: string | null) => {
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;
    
    // Use the sourceHandle if provided, otherwise default to 'source'
    const effectiveSourceHandle = sourceHandle || 'source';
    
    // Temporary position - will be recalculated by repositionNodesVertically
    let newY: number;
    let newX: number = NODE_X_POSITION; // Temporary X position
    
    if (targetNodeId) {
      // Inserting between nodes - position at midpoint
      const targetNode = nodes.find((n) => n.id === targetNodeId);
      if (targetNode) {
        newY = (sourceNode.position.y + targetNode.position.y) / 2;
      } else {
        newY = sourceNode.position.y + VERTICAL_SPACING;
      }
    } else {
      // Normal case: add after source node
      newY = sourceNode.position.y + VERTICAL_SPACING;
    }
    
    // Calculate next node ID (find max nodeId and add 1, start node is always 0)
    const maxNodeId = nodes.reduce((max, node) => {
      const nodeId = node.data?.nodeId;
      return nodeId !== undefined && typeof nodeId === 'number' && nodeId > max ? nodeId : max;
    }, -1);
    const nextNodeId = maxNodeId + 1;
    
    const existingIds = new Set(nodes.map((node) => node.id));
    let nextNodeIndex = nodeIdCounter;
    let newNodeId = `node-${nextNodeIndex}`;
    while (existingIds.has(newNodeId)) {
      nextNodeIndex += 1;
      newNodeId = `node-${nextNodeIndex}`;
    }

    const newNode: Node = {
      id: newNodeId,
      type,
      position: { x: newX, y: newY },
      data: {
        ...getDefaultNodeData(type),
        nodeId: nextNodeId,
      },
      draggable: false, // Disable dragging
    };
 
    const matchesSourceHandle = (edgeHandle?: string | null) => {
      if (!effectiveSourceHandle || effectiveSourceHandle === 'source') {
        return !edgeHandle || edgeHandle === 'source';
      }
      return edgeHandle === effectiveSourceHandle;
    };

    const filteredEdges = targetNodeId
      ? edges.filter((e) => {
          if (edgeIdForInsertion) {
            return e.id !== edgeIdForInsertion;
          }
          return !(
            e.source === sourceNodeId &&
            e.target === targetNodeId &&
            matchesSourceHandle(e.sourceHandle)
          );
        })
      : edges;

    const nextEdgeSourceHandle = type === 'ifElse' ? 'true' : 'source';
    const updatedEdges: Edge[] = targetNodeId
      ? [
          ...filteredEdges,
          {
            id: `edge-${sourceNodeId}-${newNode.id}`,
            source: sourceNodeId,
            target: newNode.id,
            sourceHandle: effectiveSourceHandle,
            targetHandle: null,
            type: 'addNode',
          },
          {
            id: `edge-${newNode.id}-${targetNodeId}`,
            source: newNode.id,
            target: targetNodeId,
            sourceHandle: nextEdgeSourceHandle,
            targetHandle: null,
            type: 'addNode',
          },
        ]
      : [
          ...filteredEdges,
          {
            id: `edge-${sourceNodeId}-${newNode.id}`,
            source: sourceNodeId,
            target: newNode.id,
            sourceHandle: effectiveSourceHandle,
            targetHandle: null,
            type: 'addNode',
          },
        ];

    const updatedNodes = repositionNodesVertically([...nodes, newNode], updatedEdges);
    setNodes(updatedNodes);
    setEdges(updatedEdges);

    setNodeIdCounter(nextNodeIndex + 1);
    setShowNodeTypeModal(false);
    setSourceNodeForConnection(null);
    setSourceHandleForConnection(null);
    setTargetNodeForInsertion(null);
    setEdgeIdForInsertion(null);
  };

  const handleInsertNodeBetween = (edge: Edge) => {
    // When user wants to insert a node between two connected nodes
    setSourceNodeForConnection({ id: edge.source } as Node);
    setSourceHandleForConnection(edge.sourceHandle || null);
    setTargetNodeForInsertion(edge.target);
    setEdgeIdForInsertion(edge.id);
    setShowNodeTypeModal(true);
  };

  const handleUpdateNode = (nodeId: string, data: any) => {
    // Prevent updating Start node data (except messages)
    if (nodeId === 'node-start') {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...data } }
            : node
        )
      );
    } else {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...data } }
            : node
        )
      );
    }
    
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev) =>
        prev ? { ...prev, data: { ...prev.data, ...data } } : null
      );
    }
  };

  const handleDeleteNode = (nodeId: string) => {
    // Prevent deleting Start node
    if (nodeId === 'node-start') {
      setError('Start node cannot be deleted');
      return;
    }

    const nodeToDelete = nodes.find((node) => node.id === nodeId);
    if (nodeToDelete?.type === 'ifElse') {
      const trueEdge = edges.find(
        (edge) => edge.source === nodeId && edge.sourceHandle === 'true'
      );
      const falseEdge = edges.find(
        (edge) => edge.source === nodeId && edge.sourceHandle === 'false'
      );

      if (trueEdge && falseEdge) {
        setDeleteBranchNodeId(nodeId);
        setDeleteBranchChoice(null);
        setShowDeleteBranchModal(true);
        return;
      }
    }
    
    // Find edges connected to this node
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    const outgoingEdges = edges.filter((e) => e.source === nodeId);
    // Only reconnect using non-loop-back outgoing edges (so deleting Loop Back doesn't connect parent to loop-back target)
    const outgoingEdgesForReconnect = outgoingEdges.filter((e) => !(e.data as any)?.isLoopBack);

    const newEdges: Edge[] = [];

    edges.forEach((edge) => {
      if (edge.source !== nodeId && edge.target !== nodeId) {
        newEdges.push(edge);
      }
    });

    // Reconnect incoming to outgoing (only forward edges; skip loop-back)
    incomingEdges.forEach((incomingEdge) => {
      outgoingEdgesForReconnect.forEach((outgoingEdge) => {
        if (incomingEdge.source !== outgoingEdge.target) {
          const edgeExists = newEdges.some(
            (e) => e.source === incomingEdge.source && e.target === outgoingEdge.target
          );
          if (!edgeExists) {
            newEdges.push({
              id: `edge-${incomingEdge.source}-${outgoingEdge.target}`,
              source: incomingEdge.source,
              target: outgoingEdge.target,
              sourceHandle: incomingEdge.sourceHandle,
              targetHandle: outgoingEdge.targetHandle,
              type: 'addNode',
            });
          }
        }
      });
    });
    
    // If there are incoming edges but no outgoing edges, just remove the node
    // If there are outgoing edges but no incoming edges, just remove the node
    // The reconnection above handles the A->B->C case
    
    setNodes((nds) => {
      const filtered = nds.filter((node) => node.id !== nodeId);
      // Reposition remaining nodes after deletion to maintain fixed spacing
      return repositionNodesVertically(filtered, newEdges);
    });
    setEdges(newEdges);
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  const handleLoopBackTargetSelect = useCallback(
    (targetNodeId: string) => {
      if (!selectedNode || selectedNode.type !== 'loopBack') return;
      const loopBackSourceNodeId = selectedNode.id;
      setEdges((eds) => {
        const withoutExistingLoopBack = eds.filter(
          (e) =>
            !(
              e.source === loopBackSourceNodeId &&
              (e.data as any)?.isLoopBack === true
            )
        );
        const incomingEdge = eds.find((e) => e.target === loopBackSourceNodeId);
        const branch =
          incomingEdge?.sourceHandle === 'false' ? 'false' : 'true';
        const newEdge: Edge = {
          id: `edge-loopback-${loopBackSourceNodeId}-${targetNodeId}`,
          source: loopBackSourceNodeId,
          target: targetNodeId,
          sourceHandle: 'source',
          targetHandle: null,
          type: 'loopBack',
          data: { isLoopBack: true, branch },
        };
        return [...withoutExistingLoopBack, newEdge];
      });
    },
    [selectedNode, setEdges]
  );

  const handleDeleteBranchConfirm = () => {
    if (!deleteBranchNodeId || !deleteBranchChoice) return;

    const nodeId = deleteBranchNodeId;
    const trueEdge = edges.find(
      (edge) => edge.source === nodeId && edge.sourceHandle === 'true'
    );
    const falseEdge = edges.find(
      (edge) => edge.source === nodeId && edge.sourceHandle === 'false'
    );
    if (!trueEdge || !falseEdge) {
      setShowDeleteBranchModal(false);
      setDeleteBranchNodeId(null);
      setDeleteBranchChoice(null);
      return;
    }

    const keepEdge = deleteBranchChoice === 'true' ? trueEdge : falseEdge;
    const removeEdge = deleteBranchChoice === 'true' ? falseEdge : trueEdge;

    const getReachable = (startId: string) => {
      const visited = new Set<string>();
      const queue: string[] = [startId];
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        edges
          .filter((edge) => edge.source === current)
          .forEach((edge) => {
            if (!visited.has(edge.target)) queue.push(edge.target);
          });
      }
      return visited;
    };

    const removeReachable = getReachable(removeEdge.target);
    const keepReachable = getReachable(keepEdge.target);
    const nodesToRemove = new Set(
      Array.from(removeReachable).filter((id) => !keepReachable.has(id))
    );

    const incomingEdges = edges.filter((edge) => edge.target === nodeId);

    const newEdges: Edge[] = [];
    edges.forEach((edge) => {
      if (edge.source === nodeId || edge.target === nodeId) return;
      if (nodesToRemove.has(edge.source) || nodesToRemove.has(edge.target)) return;
      newEdges.push(edge);
    });

    incomingEdges.forEach((incomingEdge) => {
      if (incomingEdge.source === keepEdge.target) return;
      const edgeExists = newEdges.some(
        (edge) =>
          edge.source === incomingEdge.source &&
          edge.target === keepEdge.target &&
          edge.sourceHandle === incomingEdge.sourceHandle
      );
      if (!edgeExists) {
        newEdges.push({
          id: `edge-${incomingEdge.source}-${keepEdge.target}`,
          source: incomingEdge.source,
          target: keepEdge.target,
          sourceHandle: incomingEdge.sourceHandle,
          targetHandle: null,
          type: 'addNode',
        });
      }
    });

    setNodes((nds) => {
      const filtered = nds.filter(
        (node) => node.id !== nodeId && !nodesToRemove.has(node.id)
      );
      return repositionNodesVertically(filtered, newEdges);
    });
    setEdges(newEdges);
    if (selectedNode?.id === nodeId || nodesToRemove.has(selectedNode?.id || '')) {
      setSelectedNode(null);
    }

    setShowDeleteBranchModal(false);
    setDeleteBranchNodeId(null);
    setDeleteBranchChoice(null);
  };

  const handleSave = async () => {
    if (!nodes.length) {
      setError('Agent must have at least one node');
      return;
    }

    const hasStartNode = nodes.some((n) => n.id === 'node-start' || n.type === 'start');
    if (!hasStartNode) {
      setError('Agent must have a Start node');
      return;
    }

    // Ensure every reachable leaf ends with an End node
    const outgoingMap = new Map<string, Edge[]>();
    edges.forEach((edge) => {
      if (!outgoingMap.has(edge.source)) outgoingMap.set(edge.source, []);
      outgoingMap.get(edge.source)!.push(edge);
    });
    const startNode = nodes.find((n) => n.id === 'node-start' || n.type === 'start');
    if (startNode) {
      const reachable = new Set<string>();
      const queue: string[] = [startNode.id];
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (reachable.has(current)) continue;
        reachable.add(current);
        const outgoing = outgoingMap.get(current) || [];
        outgoing.forEach((edge) => {
          if (!reachable.has(edge.target)) queue.push(edge.target);
        });
      }

      const reachableNodes = nodes.filter((node) => reachable.has(node.id));
      const hasMissingEnd = reachableNodes.some((node) => {
        const outgoing = outgoingMap.get(node.id) || [];

        if (node.type === 'ifElse') {
          const hasTrue = outgoing.some((edge) => edge.sourceHandle === 'true');
          const hasFalse = outgoing.some((edge) => edge.sourceHandle === 'false');
          return !hasTrue || !hasFalse;
        }

        return outgoing.length === 0 && node.type !== 'end';
      });

      if (hasMissingEnd) {
        setError('Every branch must end with an End node');
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);

      const agentData = {
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data || {},
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle || null,
          targetHandle: edge.targetHandle || null,
          data: edge.data || null,
          style: edge.style || null,
        })),
      };

      if (agent) {
        await agentService.update(agent.id, { agentData });
      } else {
        const name = prompt('Enter agent name:');
        if (!name) {
          setSaving(false);
          return;
        }

        const newAgent = await agentService.create({
          name,
          agentData,
        });
        navigate(`/agents/${newAgent.id}`);
      }

      await loadAgent();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save agent');
      console.error('Error saving agent:', err);
    } finally {
      setSaving(false);
    }
  };

  const getDefaultNodeData = (type: string): any => {
    switch (type) {
      case 'start':
        return {
          welcomeMessage: 'Welcome!',
          restartMessage: 'Welcome back!',
          storeChatHistory: false,
        };
      case 'chatAI':
        return {
          knowledgeBaseId: null,
          chatAIId: null,
          passContext: true,
          sendOutput: true,
          waitForReply: false,
          useChatHistory: false,
        };
      case 'waitForReply':
        return {};
      case 'ifElse':
        return {
          condition: 'message.length > 0',
        };
      case 'intentRecognition':
        return {
          intentCategories: [
            { name: 'greeting', patterns: [], keywords: ['hello', 'hi'] },
          ],
          defaultIntent: 'default',
          waitForReply: false,
        };
      case 'sendMessage':
        return {
          messageVariants: ['Hello!', 'Hi there!', 'Greetings!'],
          waitForReply: false,
        };
      case 'end':
        return {
          finalMessage: 'Workflow completed.',
        };
      case 'loopBack':
        return {};
      default:
        return {};
    }
  };


  // Store source handle for connection
  const [sourceHandleForConnection, setSourceHandleForConnection] = useState<string | null>(null);

  // Listen for placeholder click events
  React.useEffect(() => {
    const handlePlaceholderClick = (e: Event) => {
      const customEvent = e as CustomEvent;
      const lastNodeId = customEvent.detail?.lastNodeId;
      const sourceHandle = customEvent.detail?.sourceHandle;
      if (lastNodeId) {
        const lastNode = nodes.find(n => n.id === lastNodeId);
        if (lastNode) {
          setSourceNodeForConnection(lastNode);
          setSourceHandleForConnection(sourceHandle || null);
          setShowNodeTypeModal(true);
        }
      }
    };
    
    window.addEventListener('placeholder-click', handlePlaceholderClick);
    return () => window.removeEventListener('placeholder-click', handlePlaceholderClick);
  }, [nodes]);

  // Store the placeholder states for multiple branches (e.g., if/else nodes)
  const [placeholderStates, setPlaceholderStates] = React.useState<Array<{
    id: string;
    lastNodeId: string;
    sourceHandle: string | null;
    yPosition: number;
    xOffset: number; // Horizontal offset for branching nodes
  }>>([]);
  
  // Helper function to get source handles for a node type
  const getSourceHandles = (nodeType: string): Array<{ id: string; label: string }> => {
    if (nodeType === 'ifElse') {
      return [
        { id: 'true', label: 'True' },
        { id: 'false', label: 'False' }
      ];
    }
    return [{ id: 'source', label: '' }];
  };
  
  // Update placeholder states only when structure changes (not on every render)
  React.useEffect(() => {
    if (nodes.length === 0) {
      setPlaceholderStates([]);
      return;
    }
    
    const nodeMap = new Map(nodes.map((n) => [n.id, { ...n }]));
    const outgoingMap = new Map<string, Edge[]>();
    edges.forEach((e) => {
      if (!outgoingMap.has(e.source)) outgoingMap.set(e.source, []);
      outgoingMap.get(e.source)!.push(e);
    });
    const widthMemo = new Map<string, number>();
    const visiting = new Set<string>();
    nodeMap.forEach((_n, nodeId) =>
      computeSubtreeWidth(nodeId, nodeMap, outgoingMap, widthMemo, visiting)
    );

    const newPlaceholderStates: Array<{
      id: string;
      lastNodeId: string;
      sourceHandle: string | null;
      yPosition: number;
      xOffset: number;
    }> = [];
    
    // Find all nodes that need placeholders
    nodes.forEach((node) => {
// Skip end nodes, placeholder nodes, loopBack (no node after it), and nodes without type
      if (!node.type || node.type === 'end' || node.type === 'placeholder' || node.type === 'loopBack') return;

      const sourceHandles = getSourceHandles(node.type);
      const nodeWidth = widthMemo.get(node.id) ?? 1;
      const nodeLeft = node.position.x - widthToSpan(nodeWidth) / 2;
      const trueEdge = outgoingMap.get(node.id)?.find((edge) => edge.sourceHandle === 'true');
      const falseEdge = outgoingMap.get(node.id)?.find((edge) => edge.sourceHandle === 'false');
      const trueWidth = trueEdge ? widthMemo.get(trueEdge.target) ?? 1 : 1;
      const falseWidth = falseEdge ? widthMemo.get(falseEdge.target) ?? 1 : 1;
      const trueSpan = widthToSpan(trueWidth);
      const falseSpan = widthToSpan(falseWidth);
      const trueCenter = nodeLeft + trueSpan / 2;
      const falseCenter = nodeLeft + trueSpan + BRANCH_GAP + falseSpan / 2;
      
      // For each source handle, check if it has an outgoing edge (exclude loop-back edges)
      sourceHandles.forEach((handle) => {
        const hasConnection = edges.some(
          (e) =>
            e.source === node.id &&
            (e.sourceHandle === handle.id || (handle.id === 'source' && !e.sourceHandle)) &&
            !(e.data as any)?.isLoopBack
        );
        
        if (!hasConnection) {
          let placeholderX: number;

          // For if/else nodes, position placeholders based on branch widths.
          if (node.type === 'ifElse') {
            placeholderX = handle.id === 'false' ? falseCenter : trueCenter;
          } else {
            // For regular nodes, placeholder stays at same X as the node itself
            // This maintains alignment within a branch
            placeholderX = node.position.x;
          }
          
          const placeholderY = node.position.y + VERTICAL_SPACING;
          
          // This handle needs a placeholder
          newPlaceholderStates.push({
            id: `placeholder-${node.id}-${handle.id}`,
            lastNodeId: node.id,
            sourceHandle: handle.id,
            yPosition: placeholderY,
            xOffset: placeholderX - NODE_X_POSITION, // Store offset relative to center
          });
        }
      });
    });
    
    // Only update if actually changed
    if (JSON.stringify(placeholderStates) !== JSON.stringify(newPlaceholderStates)) {
      setPlaceholderStates(newPlaceholderStates);
    }
    // Depend on full positions (x,y) so placeholder stays aligned after repositioning
  }, [
    nodes.length,
    edges.length,
    JSON.stringify(
      nodes.map((n) => ({
        id: n.id,
        type: n.type,
        x: n.position.x,
        y: n.position.y,
      }))
    ),
    JSON.stringify(
      edges.map((e) => ({
        s: e.source,
        t: e.target,
        sh: e.sourceHandle,
      }))
    ),
  ]);
  
  // Memoize placeholder nodes with stable state
  const placeholderNodes = useMemo((): Node[] => {
    return placeholderStates.map((state) => ({
      id: state.id,
      type: 'placeholder',
      position: {
        x: NODE_X_POSITION + state.xOffset,
        y: state.yPosition,
      },
      data: {
        lastNodeId: state.lastNodeId,
        sourceHandle: state.sourceHandle,
      },
      draggable: false,
    }));
  }, [placeholderStates]);

  // Memoize placeholder edges - connection lines from nodes to placeholders
  const placeholderEdges = useMemo((): Edge[] => {
    return placeholderStates.map((state) => ({
      id: `edge-${state.id}`,
      source: state.lastNodeId,
      target: state.id,
      sourceHandle: state.sourceHandle,
      targetHandle: 'target',
      type: 'smoothstep', // Use turning/curved lines instead of straight
      style: {
        stroke: '#d1d5db', // Gray-300 - matches placeholder border color
        strokeWidth: 2, // Match typical border width
        strokeDasharray: '5,5', // Dashed line to match placeholder border style
      },
      animated: false,
      selectable: false,
      deletable: false,
      interactionWidth: 0, // Prevent interaction with this edge
    }));
  }, [placeholderStates]);

  const renderEdges = useMemo(
    () =>
      edges.map((edge) => {
        const isLoopBack = (edge.data as any)?.isLoopBack === true;
        return {
          ...edge,
          type: isLoopBack ? 'loopBack' : (edge.type || 'addNode'),
          data: {
            ...(edge.data || {}),
            onInsert: isLoopBack ? undefined : handleInsertNodeBetween,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            showAddButton: isLoopBack ? false : undefined,
          },
        };
      }),
    [edges, handleInsertNodeBetween]
  );

  const availableVariables = useMemo(() => {
    const vars: Array<{ key: string; description: string }> = [
      { key: '{{user.input.latest}}', description: 'The latest input received from the user' },
      { key: '{{user.input.first}}', description: 'The first input received at the start of the workflow' },
    ];

    const startNode = nodes.find((n) => n.id === 'node-start' || n.type === 'start');
    if (startNode?.data?.storeChatHistory) {
      vars.push({
        key: '{{chat.messages}}',
        description: 'Full session chat history (role + content pairs)',
      });
    }

    const waitNodes = new Set<string>();
    nodes.forEach((node) => {
      if (node.type === 'waitForReply') {
        waitNodes.add(node.id);
      }
      if (node.type === 'ifElse') {
        waitNodes.add(node.id);
      }
      if (node.type === 'chatAI' && node.data?.waitForReply) {
        waitNodes.add(node.id);
      }
      if (node.type === 'sendMessage' && node.data?.waitForReply) {
        waitNodes.add(node.id);
      }
      if (node.type === 'intentRecognition' && node.data?.waitForReply) {
        waitNodes.add(node.id);
      }
    });

    nodes.forEach((node) => {
      const numericId = node.data?.nodeId;
      if (numericId === undefined || typeof numericId !== 'number') return;

      if (node.type === 'chatAI') {
        vars.push({
          key: `{{node[${numericId}].output.text}}`,
          description: 'Chat AI output text',
        });
      }

      if (node.type === 'intentRecognition') {
        vars.push({
          key: `{{node[${numericId}].output.text}}`,
          description: 'Intent recognition output',
        });
      }

      if (waitNodes.has(node.id)) {
        vars.push({
          key: `{{node[${numericId}].user.message}}`,
          description: 'User message captured at this node',
        });
      }
    });

    return vars;
  }, [nodes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const agentDataForChat = {
    nodes: nodes,
    edges: edges,
  };

  const getNodeTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      start: 'Start',
      chatAI: 'Chat AI',
      waitForReply: 'Wait for Reply',
      sendMessage: 'Send Message',
      ifElse: 'If/Else',
      intentRecognition: 'Intent Recognition',
      end: 'End',
      loopBack: 'Loop Back',
    };
    return labels[type] || type;
  };

  const nodeTypeOptions = [
    { type: 'chatAI', label: 'Chat AI' },
    { type: 'waitForReply', label: 'Wait for Reply' },
    { type: 'sendMessage', label: 'Send Message' },
    { type: 'ifElse', label: 'If/Else' },
    { type: 'intentRecognition', label: 'Intent Recognition' },
    { type: 'end', label: 'End' },
    // Loop Back only available when adding after if/else true/false branch
    ...(sourceHandleForConnection === 'true' || sourceHandleForConnection === 'false'
      ? [{ type: 'loopBack' as const, label: 'Loop Back' }]
      : []),
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <IconButton
            icon={ArrowLeft}
            onClick={() => navigate('/agents')}
            tooltip="Back to Agents"
            variant="secondary"
          />
          <h2 className="text-2xl font-semibold text-gray-800">
            {agent?.name || 'New Agent'}
          </h2>
        </div>
        <Button
          onClick={handleSave}
          icon={Save}
          iconPosition="left"
          variant="primary"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Main Content - Split View */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Side - React Flow Canvas */}
        <div className="flex-1 bg-white border border-gray-200 rounded-md overflow-hidden flex flex-col">
          {/* React Flow Canvas */}
          <div className="flex-1">
            <ReactFlow
              nodes={[
                ...nodes,
                ...placeholderNodes
              ]}
              edges={[
                ...renderEdges,
                ...placeholderEdges
              ]}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              onNodeClick={(event, node) => {
                // Don't trigger node selection for placeholder nodes
                if (node.type !== 'placeholder') {
                  onNodeClick(event, node);
                }
              }}
              onPaneClick={onPaneClick}
              onEdgeDoubleClick={(event, edge) => {
                event.stopPropagation();
                // Insert node between two connected nodes (but not placeholder edges)
                if (!edge.id.startsWith('edge-placeholder-')) {
                  handleInsertNodeBetween(edge);
                }
              }}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={{ type: 'addNode' }}
              connectionLineType={ConnectionLineType.SmoothStep}
            >
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
              <Controls />
              <MiniMap style={{ display: 'none' }} />
            </ReactFlow>
          </div>
        </div>

        {/* Right Side - Tabs with Configuration Panel and Chat */}
        <div className="w-96 flex flex-col gap-4">
          {/* Tabs */}
          <div className="bg-white border border-gray-200 rounded-md">
            <div className="flex border-b border-gray-200 overflow-x-auto whitespace-nowrap">
              <button
                onClick={() => setActiveTab('config')}
                className={`flex-none px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'config'
                    ? 'text-primary border-b-2 border-primary bg-gray-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Settings size={16} />
                  <span>Configuration</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-none px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'chat'
                    ? 'text-primary border-b-2 border-primary bg-gray-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <MessageSquare size={16} />
                  <span>Test Chat</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('variables')}
                className={`flex-none px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'variables'
                    ? 'text-primary border-b-2 border-primary bg-gray-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-base">{"{}"}</span>
                  <span>Available Variables</span>
                </div>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 bg-white border border-gray-200 rounded-md overflow-hidden flex flex-col">
            {activeTab === 'config' ? (
              <div className="flex-1 overflow-y-auto p-4">
                {selectedNode ? (
                  <NodeConfigPanel
                    node={selectedNode}
                    onUpdate={(data) => handleUpdateNode(selectedNode.id, data)}
                    onDelete={() => handleDeleteNode(selectedNode.id)}
                    isStartNode={selectedNode.id === 'node-start'}
                    availableVariables={availableVariables.map((variable) => variable.key)}
                    allNodes={nodes}
                    allEdges={edges}
                    onLoopBackTargetSelect={(targetNodeId) => handleLoopBackTargetSelect(targetNodeId)}
                  />
                ) : (
                  <div className="text-center text-gray-500 py-12">
                    <Settings size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-sm">Select a node to configure it</p>
                  </div>
                )}
              </div>
            ) : activeTab === 'chat' ? (
              <div className="flex-1 min-h-0">
                <AgentBuilderChat agentId={agent?.id} agentData={agentDataForChat} />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4">
                {availableVariables.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <p className="text-sm">No variables available yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-xs text-gray-500">
                      Replace <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">[ID]</code> with the node ID shown in the builder.
                    </div>
                    <div className="space-y-3 text-sm text-gray-700">
                      {availableVariables.map((variable, index) => (
                        <div key={`${variable.key}-${index}`} className="border border-gray-200 rounded-sm p-3">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">{variable.key}</code>
                          <p className="mt-2 text-xs text-gray-600">{variable.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Node Type Selection Modal */}
      {showNodeTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Add Node</h3>
              <button
                onClick={() => {
                  setShowNodeTypeModal(false);
                  setSourceNodeForConnection(null);
                  setSourceHandleForConnection(null);
                  setTargetNodeForInsertion(null);
                  setEdgeIdForInsertion(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {targetNodeForInsertion 
                ? `Insert node between "${sourceNodeForConnection?.type}" and target node`
                : sourceHandleForConnection && sourceNodeForConnection?.type === 'ifElse'
                ? `Add node for ${sourceHandleForConnection === 'true' ? 'True' : 'False'} branch`
                : `Select the type of node to add after "${sourceNodeForConnection?.type}"`}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {nodeTypeOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => {
                    if (sourceNodeForConnection) {
                      handleAddNodeAfter(
                        sourceNodeForConnection.id, 
                        option.type,
                        targetNodeForInsertion || undefined,
                        sourceHandleForConnection
                      );
                    }
                  }}
                  className="px-4 py-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 hover:border-primary transition-colors"
                >
                  <span className="font-medium text-gray-800">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Branch Selection Modal */}
      {showDeleteBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Delete If/Else Node</h3>
              <button
                onClick={() => {
                  setShowDeleteBranchModal(false);
                  setDeleteBranchNodeId(null);
                  setDeleteBranchChoice(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Select which branch to keep. The other branch will be deleted.
            </p>
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 border border-gray-200 rounded-md px-4 py-3 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="delete-branch"
                  checked={deleteBranchChoice === 'true'}
                  onChange={() => setDeleteBranchChoice('true')}
                />
                <span className="text-sm text-gray-700">Keep True branch</span>
              </label>
              <label className="flex items-center gap-3 border border-gray-200 rounded-md px-4 py-3 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="delete-branch"
                  checked={deleteBranchChoice === 'false'}
                  onChange={() => setDeleteBranchChoice('false')}
                />
                <span className="text-sm text-gray-700">Keep False branch</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteBranchModal(false);
                  setDeleteBranchNodeId(null);
                  setDeleteBranchChoice(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteBranchConfirm}
                disabled={!deleteBranchChoice}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AgentBuilder: React.FC = () => {
  return (
    <ReactFlowProvider>
      <AgentBuilderInner />
    </ReactFlowProvider>
  );
};

export default AgentBuilder;
