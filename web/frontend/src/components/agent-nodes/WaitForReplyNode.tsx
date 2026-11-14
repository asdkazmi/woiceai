import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock } from 'lucide-react';

interface WaitForReplyNodeProps extends NodeProps {
}

const WaitForReplyNode: React.FC<WaitForReplyNodeProps> = ({ data, selected }) => {
  const nodeId = typeof data?.nodeId === 'number' ? data.nodeId : undefined;
  const isSelected = selected || false;
  
  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-white border-2 w-[200px] relative transition-colors ${
      isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-indigo-500'
    }`}>
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-indigo-500" />
        <div className="font-semibold text-gray-800">Wait for Reply</div>
      </div>
      {nodeId !== undefined ? (
        <div className="text-xs text-gray-500 mt-1">ID: {nodeId}</div>
      ) : null}
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" id="source" />
    </div>
  );
};

export default WaitForReplyNode;

