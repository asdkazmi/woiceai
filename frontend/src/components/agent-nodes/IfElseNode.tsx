import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

interface IfElseNodeProps extends NodeProps {
}

const IfElseNode: React.FC<IfElseNodeProps> = ({ data, selected }) => {
  const condition = data?.condition as string | undefined;
  const nodeId = typeof data?.nodeId === 'number' ? data.nodeId : undefined;
  const isSelected = selected || false;
  
  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-white border-2 w-[200px] relative transition-colors ${
      isSelected ? 'border-orange-600 bg-orange-50' : 'border-orange-500'
    }`}>
      <div className="flex items-center gap-2">
        <GitBranch size={16} className="text-orange-500" />
        <div className="font-semibold text-gray-800">If/Else</div>
      </div>
      {nodeId !== undefined ? (
        <div className="text-xs text-gray-500 mt-1">ID: {nodeId}</div>
      ) : null}
      {condition ? (
        <div className="text-xs text-gray-600 mt-1 truncate">{condition}</div>
      ) : null}
      
      {/* Branch labels */}
      <div className="flex justify-between mt-2 text-xs font-semibold">
        <span className="text-green-600" style={{ marginLeft: '15%' }}>True</span>
        <span className="text-red-600" style={{ marginRight: '15%' }}>False</span>
      </div>
      
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="w-3 h-3 !bg-green-500 !border-2 !border-white"
        style={{ left: '35%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="w-3 h-3 !bg-red-500 !border-2 !border-white"
        style={{ left: '65%' }}
      />
    </div>
  );
};

export default IfElseNode;

