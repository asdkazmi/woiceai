import React from 'react';

interface PieChartProps {
  completed: number;
  pending: number;
  failed: number;
  size?: number;
  className?: string;
}

const PieChart: React.FC<PieChartProps> = ({
  completed,
  pending,
  failed,
  size = 32,
  className = '',
}) => {
  const total = completed + pending + failed;
  if (total === 0) {
    return (
      <div
        className={`rounded-full bg-gray-200 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const center = size / 2;
  const radius = size / 2 - 2;
  
  const completedPercent = (completed / total) * 100;
  const pendingPercent = (pending / total) * 100;
  const failedPercent = (failed / total) * 100;

  // Calculate angles in radians
  const completedAngle = (completedPercent / 100) * 2 * Math.PI;
  const pendingAngle = (pendingPercent / 100) * 2 * Math.PI;
  const failedAngle = (failedPercent / 100) * 2 * Math.PI;

  // Helper function to create arc path
  const createArc = (startAngle: number, endAngle: number, color: string) => {
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
    
    return (
      <path
        d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
        fill={color}
        className="transition-all duration-300"
      />
    );
  };

  let currentAngle = -Math.PI / 2; // Start from top

  const arcs: React.ReactElement[] = [];
  if (completed > 0) {
    arcs.push(createArc(currentAngle, currentAngle + completedAngle, '#10B981'));
    currentAngle += completedAngle;
  }
  if (pending > 0) {
    arcs.push(createArc(currentAngle, currentAngle + pendingAngle, '#F59E0B'));
    currentAngle += pendingAngle;
  }
  if (failed > 0) {
    arcs.push(createArc(currentAngle, currentAngle + failedAngle, '#EF4444'));
  }

  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block' }}
    >
      {arcs.map((arc, index) => React.cloneElement(arc, { key: index }))}
    </svg>
  );
};

export default PieChart;

