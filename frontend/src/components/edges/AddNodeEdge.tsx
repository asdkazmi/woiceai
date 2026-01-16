import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react';
import { Plus } from 'lucide-react';

const AddNodeEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
  source,
  target,
}) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const showAddButton = !id.startsWith('edge-placeholder-') && data?.showAddButton !== false;

  return (
    <>
      <BaseEdge path={edgePath} style={style} markerEnd={markerEnd} />
      {showAddButton && (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="w-6 h-6 rounded-full border border-gray-300 bg-white shadow-sm flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary transition-colors"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (typeof data?.onInsert === 'function') {
                data.onInsert({
                  id,
                  source,
                  target,
                  sourceHandle: data?.sourceHandle,
                  targetHandle: data?.targetHandle,
                });
              }
            }}
            aria-label="Add node between"
            title="Add node between"
          >
            <Plus size={14} />
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default AddNodeEdge;

