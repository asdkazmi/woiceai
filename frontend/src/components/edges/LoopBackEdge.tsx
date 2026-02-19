import React from 'react';
import { BaseEdge, EdgeProps } from '@xyflow/react';

const NODE_HALF_WIDTH = 102; // Half of node width so path turns at this distance
const LOOP_BACK_ORANGE = '#fdba74'; // light orange (tailwind orange-300)

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

  // Path: from source, go horizontal by half node width (left for true, right for false), then to target
  const path = `M ${sourceX} ${sourceY + 10} H ${turnX} V ${targetY - 10} H ${targetX}`;

  return (
    <BaseEdge
      path={path}
      style={{ stroke: LOOP_BACK_ORANGE, strokeWidth: 2 }}
    />
  );
};

export default LoopBackEdge;
