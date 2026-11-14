import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Bot } from 'lucide-react';

interface ChatAINodeProps extends NodeProps {
}

const ChatAINode: React.FC<ChatAINodeProps> = ({ data, selected }) => {
  const chatAIId = data?.chatAIId;
  const nodeId = typeof data?.nodeId === 'number' ? data.nodeId : undefined;
  const isSelected = selected || false;
  
  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-white border-2 w-[200px] relative transition-colors ${
      isSelected ? 'border-purple-600 bg-purple-50' : 'border-purple-500'
    }`}>
      <div className="flex items-center gap-2">
        <Bot size={16} className="text-purple-500" />
        <div className="font-semibold text-gray-800">Chat AI</div>
      </div>
      {nodeId !== undefined ? (
        <div className="text-xs text-gray-500 mt-1">ID: {nodeId}</div>
      ) : null}
      {chatAIId ? (
        <div className="text-xs text-gray-600 mt-1 truncate">Chat AI: {String(chatAIId)}</div>
      ) : null}
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" id="source" />
    </div>
  );
};

export default ChatAINode;

