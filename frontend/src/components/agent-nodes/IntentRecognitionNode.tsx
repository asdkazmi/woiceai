import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Brain } from 'lucide-react';

interface IntentRecognitionNodeProps extends NodeProps {
}

const IntentRecognitionNode: React.FC<IntentRecognitionNodeProps> = ({ data, selected }) => {
  const intentCategories = (data?.intentCategories as any[] | undefined) || [];
  const intentCount = Array.isArray(intentCategories) ? intentCategories.length : 0;
  const nodeId = typeof data?.nodeId === 'number' ? data.nodeId : undefined;
  const isSelected = selected || false;
  
  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-white border-2 w-[200px] relative transition-colors ${
      isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-indigo-500'
    }`}>
      <div className="flex items-center gap-2">
        <Brain size={16} className="text-indigo-500" />
        <div className="font-semibold text-gray-800">Intent</div>
      </div>
      {nodeId !== undefined ? (
        <div className="text-xs text-gray-500 mt-1">ID: {nodeId}</div>
      ) : null}
      {intentCount > 0 ? (
        <div className="text-xs text-gray-600 mt-1">{intentCount} intent(s)</div>
      ) : null}
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" id="source" />
    </div>
  );
};

export default IntentRecognitionNode;

