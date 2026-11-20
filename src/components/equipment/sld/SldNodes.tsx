import React from 'react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import {
  ChevronDown,
  ChevronRight,
  Layers,
  Lock,
  ShieldAlert,
  Wrench
} from 'lucide-react';
import {
  BusbarNodeData,
  ElectricalEquipmentNodeData,
  MccPanelNodeData,
  SwitchboardZoneNodeData
} from '../../../core/electrical/sldLayout';
import { PowerDistributionNode } from '../../../types';
import {
  BusbarSymbol,
  CircuitBreakerSymbol,
  DistributionBoardSymbol,
  ElectricalLoadSymbol,
  FusedSwitchDisconnectorSymbol,
  GeneratorSymbol,
  MccPanelSymbol,
  MeteringEquipmentSymbol,
  TransformerSymbol
} from './ElectricalSymbols';
import { ConditionBadge } from './ConditionBadge';

function getVoltageBadgeClasses(tier: string): string {
  switch (tier) {
    case '11kV':
      return 'bg-red-50 text-red-800 border-red-200';
    case '6.3kV':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    default:
      return 'bg-sky-50 text-sky-900 border-sky-200';
  }
}

function getStateIndicator(node: PowerDistributionNode, energization?: string): {
  label: string;
  textClass: string;
  bgClass: string;
} {
  if (energization === 'FAULT_BACKFEED') {
    return {
      label: 'BACK-FEED',
      textClass: 'text-white',
      bgClass: 'bg-red-600 border-red-700'
    };
  }
  switch (node.operatingState) {
    case 'CLOSED':
      return {
        label: 'CLOSED',
        textClass: 'text-emerald-800',
        bgClass: 'bg-emerald-50 border-emerald-300'
      };
    case 'OPEN':
      return {
        label: 'OPEN',
        textClass: 'text-amber-900',
        bgClass: 'bg-amber-50 border-amber-300'
      };
    case 'TRIPPED':
      return {
        label: 'TRIPPED',
        textClass: 'text-red-800',
        bgClass: 'bg-red-50 border-red-300'
      };
    case 'DECOMMISSIONED':
    default:
      return {
        label: 'DECOMM.',
        textClass: 'text-slate-500',
        bgClass: 'bg-slate-100 border-slate-300'
      };
  }
}

function renderNodeSymbol(
  node: PowerDistributionNode,
  energization: ElectricalEquipmentNodeData['solvedState'] extends infer T
    ? T extends { energization: infer E }
      ? E | undefined
      : undefined
    : undefined
) {
  switch (node.category) {
    case 'SOURCE':
      return <GeneratorSymbol className="w-8 h-8 shrink-0" state={node.operatingState} energization={energization} />;
    case 'TRANSFORMER':
    case 'STEP_UP_TX':
      return <TransformerSymbol className="w-8 h-8 shrink-0" state={node.operatingState} energization={energization} />;
    case 'METERING_TX':
      return <MeteringEquipmentSymbol className="w-8 h-8 shrink-0" state={node.operatingState} energization={energization} />;
    case 'HV_FUSE':
      return <FusedSwitchDisconnectorSymbol className="w-8 h-8 shrink-0" state={node.operatingState} energization={energization} />;
    case 'BREAKER':
    default:
      return <CircuitBreakerSymbol className="w-8 h-8 shrink-0" state={node.operatingState} energization={energization} />;
  }
}

export const ElectricalEquipmentNode: React.FC<NodeProps> = ({ data }) => {
  const d = data as ElectricalEquipmentNodeData;
  const pn = d.powerNode;
  const solved = d.solvedState;
  const energization = solved?.energization;
  const stateBadge = getStateIndicator(pn, energization);

  const isDecomm = pn.operatingState === 'DECOMMISSIONED';
  const isFault = energization === 'FAULT_BACKFEED' || pn.operatingState === 'TRIPPED';
  const hasInterlockWarning = pn.interlockStatus === 'NONE_HAZARD';
  const isUnrecorded =
    pn.category === 'BREAKER' && (pn.brand === 'Unrecorded' || pn.ratedAmps === null);
  const hasLoto = Boolean(solved && solved.activeLotoTags.length > 0);

  const topRailColor =
    isFault
      ? 'border-t-red-600'
      : isDecomm
      ? 'border-t-slate-300'
      : d.voltageTier === '11kV' || d.voltageTier === '6.3kV'
      ? 'border-t-red-700'
      : 'border-t-teal-700';

  const borderClasses = d.isSelected
    ? 'border-slate-900 ring-2 ring-slate-900/25 shadow-md'
    : isFault
    ? 'border-red-500 shadow-sm'
    : d.isSearchMatch
    ? 'border-amber-500 ring-2 ring-amber-400/40 shadow-sm'
    : d.isHighlightedPath
    ? 'border-sky-600 shadow-sm'
    : 'border-slate-300 hover:border-slate-500';

  const primarySpec =
    pn.category === 'TRANSFORMER' || pn.category === 'STEP_UP_TX'
      ? `${pn.kva ? `${pn.kva} kVA` : ''} ${pn.voltage}`.trim()
      : pn.category === 'SOURCE'
      ? `${pn.powerMw ? `${pn.powerMw} MW` : pn.kva ? `${pn.kva} kVA` : pn.voltage}`
      : pn.category === 'METERING_TX'
      ? 'Revenue CT/VT'
      : pn.category === 'HV_FUSE'
      ? `${pn.ratedAmps ? `${pn.ratedAmps} A` : ''} Switch-Fuse`.trim()
      : pn.brand === 'Unrecorded'
      ? 'Nameplate Unrecorded'
      : `${pn.brand}${pn.ratedAmps ? ` • ${pn.ratedAmps}A` : ''}`;

  const showTopHandle = d.activeTerminals ? Boolean(d.activeTerminals.top) : true;
  const showLeftHandle = d.activeTerminals ? Boolean(d.activeTerminals.left) : true;
  const showBottomHandle = d.activeTerminals ? Boolean(d.activeTerminals.bottom) : true;
  const showRightHandle = d.activeTerminals ? Boolean(d.activeTerminals.right) : true;

  const terminalClass =
    isFault
      ? '!w-2 !h-2 !rounded-full !bg-white !border-[1.5px] !border-red-600 pointer-events-none'
      : energization === 'ENERGIZED'
      ? '!w-2 !h-2 !rounded-full !bg-white !border-[1.5px] !border-emerald-700 pointer-events-none'
      : '!w-2 !h-2 !rounded-full !bg-white !border-[1.5px] !border-slate-400 pointer-events-none';

  return (
    <div
      onClick={() => d.onSelect(pn.id)}
      style={{ opacity: d.isDimmed ? 0.22 : 1 }}
      className={`w-[192px] bg-white rounded-md border border-t-2 ${topRailColor} ${borderClasses} transition-all cursor-pointer select-none shadow-2xs ${
        isDecomm ? 'bg-slate-50/80 text-slate-500' : 'text-slate-900'
      }`}
    >
      {/* Fixed engineering terminals: render only ports with active conductors */}
      {showTopHandle && (
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          isConnectable={false}
          className={terminalClass}
        />
      )}
      {showLeftHandle && (
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          isConnectable={false}
          className={terminalClass}
        />
      )}
      {showBottomHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          isConnectable={false}
          className={terminalClass}
        />
      )}
      {showRightHandle && (
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          isConnectable={false}
          className={terminalClass}
        />
      )}

      {/* Top Row: Tag Code + Voltage + State */}
      <div className="px-2 pt-1.5 pb-1 flex items-center justify-between gap-1 border-b border-slate-100">
        <div className="flex items-center gap-1 min-w-0">
          <span className="font-mono text-[11px] font-black text-slate-900 tracking-tight truncate">
            {pn.code}
          </span>
          <span
            className={`px-1 py-0 text-[8.5px] font-mono font-bold rounded border shrink-0 ${getVoltageBadgeClasses(
              d.voltageTier
            )}`}
          >
            {d.voltageTier}
          </span>
        </div>

        <span
          className={`px-1.5 py-0 rounded border font-mono text-[8.5px] font-bold shrink-0 ${stateBadge.bgClass} ${stateBadge.textClass}`}
        >
          {stateBadge.label}
        </span>
      </div>

      {/* Center Body: IEC Symbol + Engineering Label */}
      <div className="px-2 py-1.5 flex items-center gap-2">
        {renderNodeSymbol(pn, energization)}
        <div className="min-w-0 flex-1">
          <div
            className="text-[11px] font-bold leading-tight text-slate-900 truncate"
            title={pn.name}
          >
            {pn.feederPanelId || pn.name}
          </div>
          <div
            className={`text-[9.5px] font-mono leading-tight mt-0.5 truncate ${
              isUnrecorded ? 'text-amber-700' : 'text-slate-600'
            }`}
            title={primarySpec}
          >
            {primarySpec}
          </div>
          {(hasInterlockWarning || hasLoto) && (
            <div className="flex items-center gap-1 mt-0.5">
              {hasInterlockWarning && (
                <span className="inline-flex items-center gap-0.5 text-[8.5px] font-mono font-bold text-red-700">
                  <ShieldAlert className="w-2.5 h-2.5 shrink-0" />
                  NO INTERLOCK
                </span>
              )}
              {hasLoto && (
                <span className="inline-flex items-center gap-0.5 text-[8.5px] font-mono font-bold text-amber-800">
                  <Lock className="w-2.5 h-2.5 shrink-0" />
                  LOTO
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transformer / Source Quick Load Strip */}
      {(pn.category === 'TRANSFORMER' || pn.category === 'SOURCE') && !isDecomm && solved && (
        <div className="px-2 py-1 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[8.5px] font-mono tabular-nums">
          {pn.category === 'TRANSFORMER' ? (
            <>
              <span className="text-slate-600 truncate">
                {solved.measuredApparentPowerKva !== null
                  ? `${solved.measuredApparentPowerKva} kVA`
                  : 'Meas: Unavail'}
              </span>
              <span
                className={`font-bold px-1 rounded ${
                  solved.measuredUtilizationPct !== null
                    ? solved.measuredUtilizationPct >= 80
                      ? 'bg-red-100 text-red-800'
                      : 'bg-teal-100 text-teal-800'
                    : solved.estimatedUtilizationPct !== null && solved.estimatedUtilizationPct >= 80
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {solved.measuredUtilizationPct !== null
                  ? `${solved.measuredUtilizationPct}% ${solved.apparentPowerSource === 'METERED' ? 'MTR' : 'MEAS'}`
                  : solved.estimatedUtilizationPct !== null
                  ? `~${solved.estimatedUtilizationPct}% EST`
                  : '—'}
              </span>
            </>
          ) : (
            <>
              <span className="text-slate-600 truncate">
                {solved.sourceActualOutputKva !== null
                  ? `Out: ${solved.sourceActualOutputKva} kVA`
                  : 'Out: Unavail'}
              </span>
              <span className="text-slate-500 font-semibold">
                Bus: {solved.sharedBusDemandAmps ?? 0}A
              </span>
            </>
          )}
        </div>
      )}

      {/* Telemetry & Maintenance Condition Footer */}
      <div className="px-2 py-1 bg-slate-50/90 border-t border-slate-100 rounded-b-md flex items-center justify-between gap-1 text-[9.5px] font-mono tabular-nums">
        <div className="flex items-center gap-1 min-w-0">
          <ConditionBadge
            condition={d.maintenanceCondition || (isDecomm ? 'DECOMMISSIONED' : 'NOT_INSPECTED')}
            compact
            onClick={() => d.onOpenNodeCondition?.(pn.id)}
            title={`Click to view/log electrical inspection for ${pn.code} (Op State: ${pn.operatingState})`}
          />
          {solved && solved.openJobCardsCount > 0 && (
            <span
              className="inline-flex items-center gap-0.5 text-red-700 font-bold shrink-0"
              title={`${solved.openJobCardsCount} Open Job Cards`}
            >
              <Wrench className="w-2.5 h-2.5" />
              {solved.openJobCardsCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`px-1 rounded text-[8px] font-bold ${
              isDecomm
                ? 'bg-slate-200 text-slate-500'
                : solved?.measurementSource
                ? 'bg-teal-100 text-teal-900'
                : 'bg-slate-200/80 text-slate-600'
            }`}
            title={
              solved?.measurementSource
                ? `Verified ${solved.measurementSource} reading`
                : 'Estimated operating demand from downstream equipment'
            }
          >
            {isDecomm
              ? 'OFF'
              : solved?.measurementSource === 'METERED'
              ? 'MTR'
              : solved?.measurementSource === 'MEASURED'
              ? 'MEAS'
              : 'EST'}
          </span>
          <span
            className={`font-bold ${
              isDecomm
                ? 'text-slate-400'
                : pn.operatingState === 'OPEN'
                ? 'text-amber-700'
                : 'text-slate-900'
            }`}
          >
            {isDecomm ? '0 A' : `${solved?.effectiveDisplayAmps ?? 0} A`}
          </span>
        </div>
      </div>

      {/* Expand/Collapse Sub-feeders bar (used on C12) */}
      {d.hasCollapsibleChildren && d.onToggleExpand && (
        <div className="border-t border-slate-200 flex items-center bg-slate-100/80 rounded-b-md overflow-hidden">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              d.onToggleExpand?.(pn.id);
            }}
            className="flex-1 py-1 px-2 hover:bg-slate-200/80 text-[9.5px] font-mono font-bold text-slate-700 flex items-center justify-center gap-1 cursor-pointer transition"
          >
            {d.isExpanded ? (
              <>
                <ChevronDown className="w-3 h-3" />
                <span>Hide {d.childCount} Sub</span>
              </>
            ) : (
              <>
                <ChevronRight className="w-3 h-3" />
                <span>Show {d.childCount} Sub</span>
              </>
            )}
          </button>
          {d.onExpandHierarchyNode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                d.onExpandHierarchyNode?.(pn.id);
              }}
              className={`px-2 py-1 border-l border-slate-200 text-[9px] font-mono font-bold cursor-pointer transition flex items-center gap-1 ${
                d.isHierarchyExpanded
                  ? 'bg-slate-900 text-white'
                  : 'hover:bg-slate-200 text-slate-700'
              }`}
              title="Open hierarchical branch schematic below SLD"
            >
              <Layers className="w-2.5 h-2.5" />
              <span>Tree</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const BusbarNode: React.FC<NodeProps> = ({ data }) => {
  const d = data as BusbarNodeData;
  const pn = d.powerNode;
  const solved = d.solvedState;
  const energization = solved?.energization;
  const isHv = d.voltageTier === '11kV';
  const isFault = energization === 'FAULT_BACKFEED';
  const isEnergized = energization === 'ENERGIZED';

  const barBg = isFault
    ? 'bg-red-700 border-red-900 text-white'
    : !isEnergized
    ? 'bg-slate-600 border-slate-800 text-slate-100'
    : isHv
    ? 'bg-red-800 border-red-950 text-white'
    : 'bg-slate-900 border-slate-950 text-white';

  const ringClass = d.isSelected
    ? 'ring-2 ring-amber-400'
    : d.isSearchMatch
    ? 'ring-2 ring-amber-500'
    : '';

  return (
    <div
      onClick={() => d.onSelect(pn.id)}
      style={{ width: `${d.widthPx}px`, opacity: d.isDimmed ? 0.22 : 1 }}
      className={`h-[44px] rounded border px-3 flex items-center justify-between cursor-pointer select-none shadow-xs transition-all ${barBg} ${ringClass}`}
    >
      {d.handles.map((h) => (
        <Handle
          key={h.id}
          id={h.id}
          type={h.type}
          position={h.position === 'top' ? Position.Top : Position.Bottom}
          isConnectable={false}
          style={{ left: `${h.leftPx}px` }}
          className="!w-2 !h-2 !bg-amber-300 !border !border-slate-900 pointer-events-none"
        />
      ))}

      <div className="flex items-center gap-2 min-w-0">
        <BusbarSymbol
          className="w-6 h-4 shrink-0"
          strokeColor={isEnergized ? '#fde047' : '#cbd5e1'}
        />
        <span className="font-mono text-xs font-black tracking-wider uppercase truncate">
          {pn.code}
        </span>
        <span className="px-1.5 py-0.5 rounded bg-white/15 font-mono text-[9.5px] font-bold shrink-0">
          {pn.voltage} • 3Ø 50Hz
        </span>
        <span
          className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold shrink-0 ${
            isFault
              ? 'bg-red-950 text-red-100'
              : isEnergized
              ? 'bg-emerald-500/25 text-emerald-200'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          {isFault ? 'PARALLEL FAULT' : isEnergized ? 'ENERGIZED' : 'DEAD BUS'}
        </span>
        <ConditionBadge
          condition={d.maintenanceCondition || 'NOT_INSPECTED'}
          compact
          onClick={() => d.onOpenNodeCondition?.(pn.id)}
          title={`View/log inspection for ${pn.code}`}
        />
      </div>

      <div className="flex items-center gap-3 font-mono text-[10.5px] tabular-nums shrink-0">
        <span>
          <strong className="text-amber-300">{solved?.effectiveDisplayAmps ?? 0} A</strong>
          <span className="text-white/70"> • {solved?.connectedKw ?? 0} kW</span>
        </span>
        {d.onExpandHierarchyNode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              d.onExpandHierarchyNode?.(pn.id);
            }}
            className={`px-2 py-0.5 rounded text-[9.5px] font-bold flex items-center gap-1 cursor-pointer transition ${
              d.isHierarchyExpanded
                ? 'bg-amber-400 text-slate-950'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
            title={`Expand ${pn.code} branch hierarchy`}
          >
            <Layers className="w-3 h-3" />
            <span>Inspect Bus</span>
          </button>
        )}
        {d.isCollapsible && d.onToggleExpand && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              d.onToggleExpand?.(pn.id);
            }}
            className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[9.5px] font-bold flex items-center gap-1 cursor-pointer transition"
          >
            {d.isExpanded ? (
              <>
                <ChevronDown className="w-3 h-3" />
                <span>Hide Feeders</span>
              </>
            ) : (
              <>
                <ChevronRight className="w-3 h-3" />
                <span>Show Feeders</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export const MccPanelNode: React.FC<NodeProps> = ({ data }) => {
  const d = data as MccPanelNodeData;
  const isEnergized = d.energization === 'ENERGIZED';
  const isFault = d.energization === 'FAULT_BACKFEED';

  const headerTone = isFault
    ? 'border-t-red-600 border-red-400'
    : isEnergized
    ? 'border-t-slate-700 border-slate-300'
    : 'border-t-slate-300 border-slate-200';

  return (
    <div
      style={{ opacity: d.isDimmed ? 0.22 : 1 }}
      className={`w-[192px] bg-slate-50 rounded-md border border-t-2 ${headerTone} ${
        d.isSearchMatch ? 'ring-2 ring-amber-400/50 border-amber-500' : ''
      } ${d.isSelected ? 'ring-2 ring-slate-900/25 border-slate-900' : ''} shadow-2xs select-none`}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        isConnectable={false}
        className={`!w-2 !h-2 !rounded-full !bg-white !border-[1.5px] pointer-events-none ${
          isFault ? '!border-red-600' : isEnergized ? '!border-emerald-700' : '!border-slate-400'
        }`}
      />

      {/* Panel Header */}
      <button
        type="button"
        onClick={() => d.onSelectBreaker(d.breakerId)}
        className="w-full text-left px-2 py-1.5 flex items-center gap-2 hover:bg-white transition rounded-t-md cursor-pointer"
        title={`Inspect ${d.panelName} (${d.breakerCode})`}
      >
        {d.panelType === 'MCC' ? (
          <MccPanelSymbol className="w-7 h-7 shrink-0" energization={d.energization} />
        ) : (
          <DistributionBoardSymbol className="w-7 h-7 shrink-0" energization={d.energization} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono text-[9px] font-bold uppercase text-slate-500">
              {d.panelType} PANEL
            </span>
            <span
              className={`font-mono text-[8.5px] font-bold ${
                isFault
                  ? 'text-red-700'
                  : isEnergized
                  ? 'text-emerald-700'
                  : 'text-slate-400'
              }`}
            >
              {isFault ? 'FAULT' : isEnergized ? 'LIVE' : 'ISOLATED'}
            </span>
          </div>
          <div className="text-[11px] font-bold text-slate-900 truncate leading-tight">
            {d.panelCode}
          </div>
          <div className="font-mono text-[9.5px] text-slate-600 tabular-nums mt-0.5 truncate">
            Inst: {d.totalKw} kW • Est: {d.liveAmps} A
          </div>
        </div>
      </button>

      {/* Expand / Collapse Electrical Loads & Internal MCC Schematic */}
      <div className="border-t border-slate-200 bg-white flex items-center justify-between">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            d.onToggleLoads(d.panelId);
          }}
          className="flex-1 px-2 py-1 hover:bg-slate-100 text-[9.5px] font-mono font-bold text-slate-700 flex items-center justify-between cursor-pointer transition"
        >
          <span className="flex items-center gap-1">
            {d.isLoadsExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span>
              {d.connectedEquipment.length === 0
                ? '0 Motors'
                : `${d.connectedEquipment.length} Motor${
                    d.connectedEquipment.length > 1 ? 's' : ''
                  }`}
            </span>
          </span>
          {d.openJobCardsCount > 0 && (
            <span className="text-red-700 font-bold">{d.openJobCardsCount} JC</span>
          )}
        </button>
        {d.onExpandHierarchyNode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              d.onExpandHierarchyNode?.(d.breakerId);
            }}
            className={`px-2 py-1 border-l border-slate-200 text-[9px] font-mono font-bold flex items-center gap-1 cursor-pointer transition shrink-0 ${
              d.isHierarchyExpanded
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 hover:bg-slate-200 text-slate-800'
            }`}
            title={`Expand internal ${d.panelType} schematic & starters for ${d.panelName}`}
          >
            <Layers className="w-2.5 h-2.5" />
            <span>{d.isHierarchyExpanded ? 'Open' : 'Expand'}</span>
          </button>
        )}
      </div>

      {/* Expanded Electrical Load Rows */}
      {d.isLoadsExpanded && (
        <div className="border-t border-slate-200 bg-white divide-y divide-slate-100 max-h-[240px] overflow-y-auto rounded-b-md">
          {d.connectedEquipment.length === 0 ? (
            <div className="px-2 py-2 text-[9.5px] font-mono text-slate-400 text-center">
              Pending checklist motors
            </div>
          ) : (
            d.connectedEquipment.map((eq) => {
              const isMatch = d.matchedEquipmentIds.includes(eq.id);
              const isMaint = eq.status === 'Under Maintenance';
              const isDecomm = eq.status === 'Decommissioned';
              return (
                <div
                  key={eq.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    d.onInspectEquipment?.(eq);
                  }}
                  className={`px-2 py-1.5 flex items-center gap-1.5 text-[9.5px] hover:bg-slate-50 cursor-pointer ${
                    isMatch ? 'bg-amber-50' : ''
                  }`}
                >
                  <ElectricalLoadSymbol
                    className="w-4 h-4 shrink-0"
                    strokeColor={
                      isDecomm
                        ? '#94a3b8'
                        : isMaint
                        ? '#dc2626'
                        : isEnergized
                        ? '#0f766e'
                        : '#64748b'
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate leading-tight flex items-center justify-between gap-1">
                      <span className="truncate">{eq.name}</span>
                      <ConditionBadge
                        condition={
                          d.equipmentConditions?.[eq.id] ||
                          (isDecomm ? 'DECOMMISSIONED' : 'NOT_INSPECTED')
                        }
                        compact
                        onClick={() => d.onOpenEquipmentCondition?.(eq)}
                        title={`Inspect / view inspection history for ${eq.code}`}
                      />
                    </div>
                    <div className="font-mono text-[8.5px] text-slate-500 tabular-nums flex items-center justify-between gap-1 mt-0.5">
                      <span className="truncate">
                        {eq.code} • {eq.starterType || 'DOL'}
                      </span>
                      <span className="font-bold text-slate-800 shrink-0">
                        {eq.powerKw ? `${eq.powerKw}kW` : '—'}
                      </span>
                    </div>
                  </div>
                  {d.onNewJobCardForEquipment && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        d.onNewJobCardForEquipment?.(eq);
                      }}
                      title={`Log Job Card for ${eq.name}`}
                      className="p-1 rounded border border-slate-200 hover:border-slate-400 text-slate-500 hover:text-slate-900 shrink-0 cursor-pointer"
                    >
                      <Wrench className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export const SwitchboardZoneNode: React.FC<NodeProps> = ({ data }) => {
  const d = data as SwitchboardZoneNodeData;
  const isHv = d.voltageTier === '11kV' || d.voltageTier === '6.3kV';

  return (
    <div
      style={{
        width: `${d.widthPx}px`,
        height: `${d.heightPx}px`,
        opacity: d.isDimmed ? 0.3 : 1
      }}
      className={`rounded-lg border border-dashed pointer-events-none select-none transition-opacity ${
        isHv
          ? 'border-red-300/90 bg-red-50/15'
          : 'border-slate-300/95 bg-slate-100/35'
      }`}
    >
      <div className="px-3 py-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`px-1.5 py-0.5 rounded font-mono text-[9.5px] font-bold uppercase tracking-wider border ${
              isHv
                ? 'bg-red-50 text-red-900 border-red-200'
                : 'bg-white text-slate-800 border-slate-300'
            }`}
          >
            {d.title}
          </span>
          <span className="text-[10px] font-mono text-slate-500 truncate">
            {d.subtitle}
          </span>
        </div>
        <span
          className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold shrink-0 ${
            isHv ? 'bg-red-100/80 text-red-800' : 'bg-teal-50 text-teal-800 border border-teal-200'
          }`}
        >
          {d.voltageTier}
        </span>
      </div>
    </div>
  );
};

export const sldNodeTypes = {
  switchboardZoneNode: SwitchboardZoneNode,
  electricalEquipmentNode: ElectricalEquipmentNode,
  busbarNode: BusbarNode,
  mccPanelNode: MccPanelNode
};
