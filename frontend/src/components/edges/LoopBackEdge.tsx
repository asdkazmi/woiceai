import React from 'react';
import { BaseEdge, EdgeProps } from '@xyflow/react';

const NODE_HALF_WIDTH = 113; // Half of node width so path turns at this distance
const LOOP_BACK_ORANGE = '#5fc6f5'; // light orange (tailwind orange-300)

const LoopBackEdge: React.FC<EdgeProps> = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}) => {
  const branch = (data?.branch as 'true' | 'false' | undefined) || 'true';
  const offset = branch === 'false' ? NODE_HALF_WIDTH : -NODE_HALF_WIDTH;
  const turnX = sourceX + offset;

  // Keep a 10px offset for the main vertical segment, while still connecting to both handles.
  const sourceOffsetY = sourceY + 10;
  const targetOffsetY = targetY - 10;
  const path = `M ${sourceX} ${sourceY} V ${sourceOffsetY} H ${turnX} V ${targetOffsetY} H ${targetX} V ${targetY}`;

  return (
    <BaseEdge
      path={path}
      style={{ stroke: LOOP_BACK_ORANGE, strokeWidth: 1.5 }}
    />
  );
};

export default LoopBackEdge;
