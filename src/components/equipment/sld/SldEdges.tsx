import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
  getStraightPath
} from '@xyflow/react';
import { ShieldAlert } from 'lucide-react';
import { ElectricalConductorEdgeData } from '../../../core/electrical/sldLayout';

function getConductorColor(data: ElectricalConductorEdgeData): string {
  if (data.energization === 'FAULT_BACKFEED') return '#dc2626';
  if (data.energization === 'DECOMMISSIONED') return '#cbd5e1';
  if (data.energization === 'DE_ENERGIZED') {
    return data.edgeRole === 'INTERLOCK_TIE' ? '#b45309' : '#94a3b8';
  }
  switch (data.voltageTier) {
    case '11kV':
      return '#b91c1c';
    case '6.3kV':
      return '#9f1239';
    case '415V':
    case '420V':
    case '400V':
    default:
      return data.edgeRole === 'STANDBY_FEED' ? '#0284c7' : '#0f766e';
  }
}

export const ElectricalConductorEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data
}) => {
  const edgeData = (data || {
    voltageTier: '400V',
    edgeRole: 'PRIMARY_FEED',
    energization: 'DE_ENERGIZED',
    isHighlightedPath: false,
    isDimmed: false
  }) as ElectricalConductorEdgeData;

  const isInterlockTie = edgeData.edgeRole === 'INTERLOCK_TIE';

  const [edgePath, labelX, labelY] = isInterlockTie
    ? getStraightPath({ sourceX, sourceY, targetX, targetY })
    : getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 0
      });

  const stroke = getConductorColor(edgeData);
  const isFault = edgeData.energization === 'FAULT_BACKFEED';
  const isDecomm = edgeData.energization === 'DECOMMISSIONED';
  const isDeEnergized = edgeData.energization === 'DE_ENERGIZED';

  const strokeWidth = isFault
    ? 3.5
    : edgeData.isHighlightedPath
    ? 3
    : isInterlockTie
    ? 2
    : edgeData.voltageTier === '11kV'
    ? 2.4
    : 2;

  const strokeDasharray = isInterlockTie
    ? '4 3'
    : isDecomm
    ? '2 3'
    : isDeEnergized
    ? '5 4'
    : undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke,
          strokeWidth,
          strokeDasharray,
          opacity: edgeData.isDimmed ? 0.2 : 1,
          transition: 'opacity 150ms ease, stroke-width 150ms ease'
        }}
      />

      {isInterlockTie && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 20}px)`,
              pointerEvents: 'all'
            }}
            className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold flex items-center gap-1 shadow-2xs ${
              isFault
                ? 'bg-red-600 text-white border-red-800'
                : 'bg-amber-50 text-amber-900 border-amber-400'
            }`}
            title="No mechanical/electrical changeover interlock between C4 and C7"
          >
            <ShieldAlert className="w-2.5 h-2.5 shrink-0" />
            <span>{isFault ? 'PARALLEL FAULT' : 'NO INTERLOCK'}</span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export const sldEdgeTypes = {
  electricalConductorEdge: ElectricalConductorEdge
};
