import React from 'react';
import { Plus } from 'lucide-react';
import { NodeProps, Handle, Position } from '@xyflow/react';

interface PlaceholderNodeProps extends NodeProps {
}

const PlaceholderNode: React.FC<PlaceholderNodeProps> = ({ data, id }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Dispatch custom event that AgentBuilder will listen to
    const event = new CustomEvent('placeholder-click', { 
      detail: { 
        lastNodeId: (data as any)?.lastNodeId,
        sourceHandle: (data as any)?.sourceHandle 
      }
    });
    window.dispatchEvent(event);
  };

  const sourceHandle = (data as any)?.sourceHandle;
  const branchLabel = sourceHandle === 'true' ? 'True' : sourceHandle === 'false' ? 'False' : '';
  
  return (
    <div
      onClick={handleClick}
      className="w-[200px] px-4 py-3 border-2 border-dashed border-gray-300 rounded-md bg-gray-50 hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors group relative"
    >
      {/* Target handle at the top for incoming connection */}
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        className="w-3 h-3 opacity-0"
      />
      <div className="flex flex-col items-center justify-center gap-1">
        {branchLabel && (
          <span className="text-xs font-semibold text-gray-600 group-hover:text-primary">
            {branchLabel}
          </span>
        )}
        <div className="flex items-center gap-2">
          <Plus size={20} className="text-gray-400 group-hover:text-primary" />
          <span className="text-sm font-medium text-gray-500 group-hover:text-primary">Add Node</span>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderNode;

