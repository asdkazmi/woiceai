import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { RotateCcw } from 'lucide-react';

const LoopBackNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeId = typeof data?.nodeId === 'number' ? data.nodeId : undefined;
  const isSelected = selected || false;

  return (
    <div
      className={`px-4 py-3 shadow-md rounded-md bg-white border-2 w-[200px] transition-colors ${
        isSelected ? 'border-sky-600 bg-sky-50' : 'border-sky-500'
      }`}
    >
      <div className="flex items-center gap-2">
        <RotateCcw size={16} className="text-sky-500" />
        <div className="font-semibold text-gray-800">Loop Back</div>
      </div>
      {nodeId !== undefined ? (
        <div className="text-xs text-gray-500 mt-1">ID: {nodeId}</div>
      ) : null}
      <div className="text-xs text-sky-600 mt-1">Click to select target node</div>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} id="source" className="w-3 h-3" />
    </div>
  );
};

export default LoopBackNode;
