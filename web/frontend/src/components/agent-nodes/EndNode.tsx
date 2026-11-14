import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Square } from 'lucide-react';

interface EndNodeProps extends NodeProps {
}

const EndNode: React.FC<EndNodeProps> = ({ data, selected }) => {
  const isSelected = selected || false;
  
  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-white border-2 w-[200px] transition-colors ${
      isSelected ? 'border-red-600 bg-red-50' : 'border-red-500'
    }`}>
      <div className="flex items-center gap-2">
        <Square size={16} className="text-red-500" />
        <div className="font-semibold text-gray-800">End</div>
      </div>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
    </div>
  );
};

export default EndNode;

