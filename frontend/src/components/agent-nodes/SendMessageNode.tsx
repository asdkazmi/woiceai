import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';

interface SendMessageNodeProps extends NodeProps {
}

const SendMessageNode: React.FC<SendMessageNodeProps> = ({ data, selected }) => {
  const nodeId = typeof data?.nodeId === 'number' ? data.nodeId : undefined;
  const isSelected = selected || false;
  const messageVariants = (data?.messageVariants as string[] | undefined) || [];
  
  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-white border-2 w-[200px] relative transition-colors ${
      isSelected ? 'border-orange-600 bg-orange-50' : 'border-orange-500'
    }`}>
      <div className="flex items-center gap-2">
        <MessageSquare size={16} className="text-orange-500" />
        <div className="font-semibold text-gray-800">Send Message</div>
      </div>
      {nodeId !== undefined ? (
        <div className="text-xs text-gray-500 mt-1">ID: {nodeId}</div>
      ) : null}
      {messageVariants.length > 0 ? (
        <div className="text-xs text-gray-600 mt-1">{messageVariants.length} variant{messageVariants.length !== 1 ? 's' : ''}</div>
      ) : null}
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" id="source" />
    </div>
  );
};

export default SendMessageNode;

