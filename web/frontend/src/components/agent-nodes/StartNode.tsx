import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';

interface StartNodeProps extends NodeProps {
}

const StartNode: React.FC<StartNodeProps> = ({ data, selected }) => {
  const isSelected = selected || false;
  
  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-white border-2 w-[200px] relative transition-colors ${
      isSelected ? 'border-green-600 bg-green-50' : 'border-green-500'
    }`}>
      <div className="flex items-center gap-2">
        <Play size={16} className="text-green-500" />
        <div className="font-semibold text-gray-800">Start</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" id="source" />
    </div>
  );
};

export default StartNode;

