import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Edit3,
  ExternalLink,
  Gauge,
  Layers,
  Lock,
  ShieldAlert,
  Unlock,
  Wrench,
  X
} from 'lucide-react';
import {
  BreakerOperatingState,
  ElectricalMeasurement,
  Equipment,
  JobCard,
  LoadDataSource,
  PowerConnection,
  PowerDistributionNode,
  UserProfile
} from '../../../types';
import { SolvedNodeState } from '../../../core/electrical/topologySolver';
import {
  ElectricalHazardAlert,
  NodeLoadMetrics
} from '../../../core/master-data/powerDistributionData';
import {
  CreateElectricalMeasurementInput,
  resolveNominalNodeVoltageV
} from '../../../core/electrical/loadCalculations';
import { isAuthorizedElectricalEngineer } from '../../../core/electrical/permissions';
import {
  AssetConditionSummary,
  evaluateAssetInspectionDue,
  matchJobCardsForPowerNode,
  resolveInspectionCategoryForNode
} from '../../../core/electrical/inspections';
import { ConditionBadge } from './ConditionBadge';
import { LogMeasurementModal } from './LogMeasurementModal';

interface SldInspectorDrawerProps {
  node: PowerDistributionNode;
  allNodes: PowerDistributionNode[];
  powerConnections?: PowerConnection[];
  electricalMeasurements?: ElectricalMeasurement[];
  jobCards?: JobCard[];
  solvedState?: SolvedNodeState;
  loadMetrics: NodeLoadMetrics;
  upstreamChain: PowerDistributionNode[];
  childNodes: PowerDistributionNode[];
  nodeHazards: ElectricalHazardAlert[];
  currentUserName: string;
  userRole?: UserProfile['role'] | null;
  userEmail?: string | null;
  isHierarchyExpanded?: boolean;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
  onExpandHierarchyNode?: (nodeId: string) => void;
  onOpenBranchWorkspace: (nodeId: string) => void;
  onUpdatePowerNode: (
    node: PowerDistributionNode,
    updates: Partial<PowerDistributionNode>,
    audit: {
      modifiedBy: string;
      summary: string;
      reason: string;
      previousValues?: Record<string, any>;
      newValues?: Record<string, any>;
    }
  ) => Promise<void>;
  onRecordElectricalMeasurement?: (
    input: Omit<CreateElectricalMeasurementInput, 'recordedByUid'> & {
      targetNode?: PowerDistributionNode;
    }
  ) => Promise<void>;
  onInspectEquipment?: (eq: Equipment) => void;
  onNewJobCardForEquipment?: (eq: Equipment) => void;
  onSelectJobCard?: (card: JobCard) => void;
  conditionSummaries?: Map<string, AssetConditionSummary>;
  onOpenNodeCondition?: (nodeId: string) => void;
  onOpenEquipmentCondition?: (eq: Equipment) => void;
}

function sourceBadgeClass(source?: LoadDataSource | null): string {
  switch (source) {
    case 'METERED':
      return 'bg-sky-50 text-sky-900 border-sky-300';
    case 'MEASURED':
      return 'bg-emerald-50 text-emerald-900 border-emerald-300';
    case 'NAMEPLATE':
      return 'bg-slate-100 text-slate-700 border-slate-300';
    default:
      return 'bg-amber-50 text-amber-900 border-amber-300';
  }
}

export const SldInspectorDrawer: React.FC<SldInspectorDrawerProps> = ({
  node,
  allNodes,
  electricalMeasurements = [],
  jobCards = [],
  solvedState,
  loadMetrics,
  upstreamChain,
  childNodes,
  nodeHazards,
  currentUserName,
  userRole,
  userEmail,
  isHierarchyExpanded = false,
  onClose,
  onSelectNode,
  onExpandHierarchyNode,
  onOpenBranchWorkspace,
  onUpdatePowerNode,
  onRecordElectricalMeasurement,
  onInspectEquipment,
  onNewJobCardForEquipment,
  onSelectJobCard,
  conditionSummaries,
  onOpenNodeCondition,
  onOpenEquipmentCondition
}) => {
  const isEngineer = isAuthorizedElectricalEngineer(userRole, userEmail);
  const [switching, setSwitching] = useState(false);
  const [pendingDangerPartner, setPendingDangerPartner] = useState<PowerDistributionNode | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);

  useEffect(() => {
    setShowLogModal(false);
    setPendingDangerPartner(null);
  }, [node.id]);

  const nodeMeasurements = useMemo(
    () => electricalMeasurements.filter((m) => m.assetId === node.id),
    [electricalMeasurements, node.id]
  );

  const equipmentMeasurementMap = useMemo(() => {
    const map = new Map<string, ElectricalMeasurement>();
    for (const m of electricalMeasurements) {
      if (m.assetKind === 'EQUIPMENT' && !map.has(m.assetId)) {
        map.set(m.assetId, m);
      }
    }
    return map;
  }, [electricalMeasurements]);

  const nodeConditionSummary = conditionSummaries?.get(node.id) || null;
  const nodeDueInfo = useMemo(
    () =>
      evaluateAssetInspectionDue({
        assetCategory: resolveInspectionCategoryForNode(node),
        voltage: node.voltage,
        isDecommissioned: node.operatingState === 'DECOMMISSIONED',
        summary: nodeConditionSummary
      }),
    [node, nodeConditionSummary]
  );

  const nodeMatchedJobCards = useMemo(
    () => matchJobCardsForPowerNode(node, loadMetrics.connectedEquipment, jobCards),
    [node, loadMetrics.connectedEquipment, jobCards]
  );

  const outstandingJobCards = useMemo(
    () =>
      nodeMatchedJobCards.filter(
        (jc) => jc.status !== 'Completed' && jc.status !== 'Cancelled'
      ),
    [nodeMatchedJobCards]
  );

  const performStateSwitch = async (targetState: BreakerOperatingState, overrideNote?: string) => {
    setSwitching(true);
    try {
      await onUpdatePowerNode(
        node,
        { operatingState: targetState },
        {
          modifiedBy: currentUserName,
          summary: overrideNote
            ? `HAZARD OVERRIDE: ${node.code} ${node.operatingState} ➔ ${targetState}`
            : `Switching Operation: ${node.code} ${node.operatingState} ➔ ${targetState}`,
          reason: overrideNote || `Direct SLD inspector switching on ${node.code}`,
          previousValues: { operatingState: node.operatingState },
          newValues: { operatingState: targetState }
        }
      );
      setPendingDangerPartner(null);
    } finally {
      setSwitching(false);
    }
  };

  const handleToggleSwitch = async () => {
    if (!isEngineer) return;
    if (node.operatingState === 'DECOMMISSIONED' || switching) return;
    const nextState: BreakerOperatingState = node.operatingState === 'CLOSED' ? 'OPEN' : 'CLOSED';

    if ((node.id === 'C4' || node.id === 'C7') && nextState === 'CLOSED') {
      const partnerId = node.id === 'C4' ? 'C7' : 'C4';
      const partner = allNodes.find(n => n.id === partnerId);
      if (partner && partner.operatingState === 'CLOSED' && node.interlockStatus === 'NONE_HAZARD') {
        setPendingDangerPartner(partner);
        return;
      }
    }

    await performStateSwitch(nextState);
  };

  const energization = solvedState?.energization || 'DE_ENERGIZED';
  const nominalV = resolveNominalNodeVoltageV(node);

  return (
    <aside className="w-full lg:w-[390px] xl:w-[425px] shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-slate-300 flex flex-col max-h-[760px] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white">
              {node.code}
            </span>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-300 bg-white text-slate-700">
              {node.voltage}
            </span>
            <span
              className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                energization === 'FAULT_BACKFEED'
                  ? 'bg-red-600 text-white border-red-700'
                  : energization === 'ENERGIZED'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : energization === 'DECOMMISSIONED'
                  ? 'bg-slate-100 text-slate-500 border-slate-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              {energization.replace('_', ' ')}
            </span>
            <ConditionBadge
              condition={conditionSummaries?.get(node.id)?.condition || 'NOT_INSPECTED'}
              compact
              onClick={onOpenNodeCondition ? () => onOpenNodeCondition(node.id) : undefined}
            />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
            {node.name}
          </h3>
          <div className="text-[11px] font-mono text-slate-500 truncate">
            {node.category.replace('_', ' ')} • {node.location}
            {node.feederPanelId ? ` • ${node.feederPanelId}` : ''}
          </div>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap font-mono text-[9.5px]">
            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
              Op State: {node.operatingState}
            </span>
            {nodeDueInfo.status !== 'DECOMMISSIONED' && (
              <span
                className={`px-1.5 py-0.5 rounded border font-bold ${
                  nodeDueInfo.status === 'OVERDUE'
                    ? 'bg-red-50 text-red-800 border-red-300'
                    : nodeDueInfo.status === 'DUE_SOON'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : nodeDueInfo.status === 'NEVER_INSPECTED'
                    ? 'bg-slate-100 text-slate-600 border-slate-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}
              >
                {nodeDueInfo.status === 'OVERDUE'
                  ? `OVERDUE ${Math.abs(nodeDueInfo.daysUntilDue ?? 0)}d`
                  : nodeDueInfo.status === 'DUE_SOON'
                  ? `DUE IN ${nodeDueInfo.daysUntilDue ?? 0}d`
                  : nodeDueInfo.status === 'NEVER_INSPECTED'
                  ? `UNINSPECTED (${nodeDueInfo.intervalDays}d SLA)`
                  : `SLA OK (${nodeDueInfo.daysUntilDue}d left)`}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer shrink-0"
          title="Close inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Engineering Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Upstream Lineage Breadcrumb */}
        {upstreamChain.length > 0 && (
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Electrical Supply Path
            </div>
            <div className="flex flex-wrap items-center gap-1 font-mono text-[10.5px]">
              {upstreamChain.map((anc, idx) => (
                <React.Fragment key={anc.id}>
                  {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400" />}
                  <button
                    type="button"
                    onClick={() => onSelectNode(anc.id)}
                    className={`px-1.5 py-0.5 rounded border cursor-pointer transition ${
                      anc.id === node.id
                        ? 'bg-slate-900 text-white border-slate-900 font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {anc.code}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Active Safety / Hazard Alerts */}
        {nodeHazards.map((hz) => (
          <div
            key={hz.id}
            className={`p-2.5 rounded border text-[11px] space-y-1 ${
              hz.severity === 'CRITICAL'
                ? 'bg-red-50 border-red-400 text-red-950'
                : hz.severity === 'HIGH'
                ? 'bg-amber-50 border-amber-400 text-amber-950'
                : 'bg-slate-50 border-slate-300 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5 font-bold">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-red-600" />
                <span>{hz.title}</span>
              </span>
              {hz.dataBasis && (
                <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[9px]">
                  {hz.dataBasis}
                </span>
              )}
            </div>
            <p className="leading-snug">{hz.message}</p>
          </div>
        ))}

        {/* Active LOTO Permits from Job Cards */}
        {solvedState && solvedState.activeLotoTags.length > 0 && (
          <div className="p-2.5 rounded border border-amber-400 bg-amber-50 space-y-1">
            <div className="flex items-center gap-1.5 font-mono text-[10.5px] font-bold text-amber-950">
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>ACTIVE LOTO / DANGER TAGS DOWNSTREAM</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {solvedState.activeLotoTags.map(tag => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded bg-white border border-amber-300 font-mono text-[10px] font-bold text-amber-900"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Load & Nameplate Summary with Explicit Classification */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-500">
              <span>{loadMetrics.isMeasuredOverride ? 'Measured Current' : 'Est. Demand'}</span>
              <span
                className={`px-1 py-0.2 rounded border text-[9px] font-bold ${sourceBadgeClass(
                  loadMetrics.displayDataSource
                )}`}
              >
                {loadMetrics.displayDataSource}
              </span>
            </div>
            <div className="font-mono text-lg font-black tabular-nums text-slate-900 mt-0.5">
              {loadMetrics.effectiveDisplayAmps} A
            </div>
            <div className="font-mono text-[10px] text-slate-500">
              FLC Sum: {loadMetrics.connectedRatedAmps} A
              {loadMetrics.measuredPhaseCurrents && (
                <span className="block text-[9.5px] text-slate-600">
                  L1:{loadMetrics.measuredPhaseCurrents.l1 ?? '—'} L2:{loadMetrics.measuredPhaseCurrents.l2 ?? '—'} L3:{loadMetrics.measuredPhaseCurrents.l3 ?? '—'}
                </span>
              )}
            </div>
            {loadMetrics.utilizationPct !== null && (
              <div className="mt-1.5">
                <div className="flex justify-between text-[9.5px] font-mono text-slate-600 mb-0.5">
                  <span>{loadMetrics.measuredUtilizationPct !== null ? 'Meas Util' : 'Est Util'}</span>
                  <span className={loadMetrics.utilizationPct >= 85 ? 'text-red-700 font-bold' : 'font-bold'}>
                    {loadMetrics.utilizationPct}%
                    {node.ratedAmps ? ` / ${node.ratedAmps}A` : node.kva ? ` / ${node.kva}kVA` : ''}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      loadMetrics.utilizationPct >= 85 ? 'bg-red-600' : 'bg-teal-600'
                    }`}
                    style={{ width: `${Math.min(100, loadMetrics.utilizationPct)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-500">
              <span>Nameplate</span>
              <span className={`px-1 py-0.2 rounded border text-[9px] font-bold ${sourceBadgeClass('NAMEPLATE')}`}>
                NAMEPLATE
              </span>
            </div>
            <div className={`font-bold text-xs mt-0.5 ${node.brand === 'Unrecorded' ? 'text-amber-700' : 'text-slate-900'}`}>
              {node.brand}
            </div>
            <div className="font-mono text-[10px] text-slate-600 truncate" title={node.model}>
              {node.model}
            </div>
            <div className="mt-1.5 pt-1 border-t border-slate-200 font-mono text-[10px] text-slate-700">
              {node.kva ? `${node.kva} kVA` : `${node.breakerType}`}
              {node.ratedAmps ? ` • ${node.ratedAmps}A` : ''}
              {node.tripSettingAmps ? ` • Trip ${node.tripSettingAmps}A` : ''}
            </div>
            <div className="font-mono text-[10px] text-slate-500">
              Inst: {loadMetrics.totalKw} kW • {loadMetrics.equipmentCount} Motor{loadMetrics.equipmentCount === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Latest Formal Inspection & SLA Status */}
        <div className="p-2.5 rounded border border-indigo-200 bg-indigo-50/40 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-950">
              <ClipboardCheck className="w-3.5 h-3.5 text-indigo-700" />
              <span>Latest Electrical Inspection</span>
            </span>
            {onOpenNodeCondition && (
              <button
                type="button"
                onClick={() => onOpenNodeCondition(node.id)}
                className="px-2 py-0.5 rounded bg-indigo-700 hover:bg-indigo-800 text-white font-mono text-[9.5px] font-bold cursor-pointer"
              >
                {nodeConditionSummary?.latestInspection ? 'View / Log' : 'Inspect Now'}
              </button>
            )}
          </div>
          {nodeConditionSummary?.latestInspection ? (
            <div className="space-y-1 text-[10.5px]">
              <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                <span className="font-bold text-slate-900">
                  {nodeConditionSummary.latestInspection.inspectionNumber}
                </span>
                <span className="text-slate-500">
                  {new Date(nodeConditionSummary.latestInspection.inspectedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <ConditionBadge condition={nodeConditionSummary.condition} compact />
                {nodeConditionSummary.reviewStatus && (
                  <span className="px-1.5 py-0.5 rounded border border-slate-200 bg-white font-mono text-[9px] font-semibold text-slate-700">
                    {nodeConditionSummary.reviewStatus.replace('_', ' ')}
                  </span>
                )}
                <span className="font-mono text-[9.5px] text-slate-600">
                  By {nodeConditionSummary.latestInspection.technicianName}
                </span>
              </div>
              <p className="text-slate-700 text-[11px] leading-snug line-clamp-2">
                {nodeConditionSummary.latestInspection.observations}
              </p>
            </div>
          ) : (
            <div className="text-[10.5px] font-mono text-slate-600">
              No formal electrical inspection recorded yet ({nodeDueInfo.intervalDays}-day inspection schedule).
            </div>
          )}
        </div>

        {/* 3-Phase Electrical Telemetry Matrix (Strict Measured vs Unavailable) */}
        <div className="p-2.5 rounded border border-slate-200 bg-white space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600">
              <Activity className="w-3.5 h-3.5 text-teal-700" />
              <span>3-Phase Field / Meter Telemetry</span>
            </span>
            {loadMetrics.measurementSource ? (
              <span
                className={`px-1.5 py-0.5 rounded border font-mono text-[9px] font-bold ${sourceBadgeClass(
                  loadMetrics.measurementSource
                )}`}
              >
                {loadMetrics.measurementSource}
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 font-mono text-[9px] text-slate-500">
                UNMEASURED
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
            <div className="p-1.5 rounded bg-slate-50 border border-slate-100">
              <div className="text-[9px] text-slate-400">ACTIVE (kW)</div>
              <div className="font-bold text-slate-900">
                {loadMetrics.measuredActivePowerKw !== null ? `${loadMetrics.measuredActivePowerKw}` : 'Unavailable'}
              </div>
            </div>
            <div className="p-1.5 rounded bg-slate-50 border border-slate-100">
              <div className="text-[9px] text-slate-400">APPARENT (kVA)</div>
              <div className="font-bold text-slate-900">
                {loadMetrics.measuredApparentPowerKva !== null ? `${loadMetrics.measuredApparentPowerKva}` : 'Unavailable'}
              </div>
            </div>
            <div className="p-1.5 rounded bg-slate-50 border border-slate-100">
              <div className="text-[9px] text-slate-400">REACTIVE (kVAr)</div>
              <div className="font-bold text-slate-900">
                {loadMetrics.measuredReactivePowerKvar !== null ? `${loadMetrics.measuredReactivePowerKvar}` : 'Unavailable'}
              </div>
            </div>
            <div className="p-1.5 rounded bg-slate-50 border border-slate-100">
              <div className="text-[9px] text-slate-400">VOLTAGE (V)</div>
              <div className="font-bold text-slate-900">
                {loadMetrics.measuredVoltageV !== null
                  ? `${loadMetrics.measuredVoltageV}V`
                  : `Unavailable`}
              </div>
            </div>
            <div className="p-1.5 rounded bg-slate-50 border border-slate-100">
              <div className="text-[9px] text-slate-400">PF / IMBAL %</div>
              <div className="font-bold text-slate-900">
                {loadMetrics.measuredPowerFactor !== null ? loadMetrics.measuredPowerFactor : 'Unavail'}
                {loadMetrics.phaseImbalancePct !== null ? ` / ${loadMetrics.phaseImbalancePct}%` : ''}
              </div>
            </div>
            <div className="p-1.5 rounded bg-slate-50 border border-slate-100">
              <div className="text-[9px] text-slate-400">FREQ / kWh</div>
              <div className="font-bold text-slate-900 truncate">
                {loadMetrics.measuredFrequencyHz !== null ? `${loadMetrics.measuredFrequencyHz}Hz` : 'Unavail'}
                {loadMetrics.measuredEnergyKwh !== null ? ` • ${loadMetrics.measuredEnergyKwh}` : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-500 pt-1 border-t border-slate-100">
            <span>
              Est Demand: {loadMetrics.estimatedOperatingKva !== null ? `${loadMetrics.estimatedOperatingKva} kVA` : '—'} ({nominalV}V base)
            </span>
            {loadMetrics.measurementTimestamp && (
              <span className="truncate max-w-[155px]" title={loadMetrics.measurementTimestamp}>
                {new Date(loadMetrics.measurementTimestamp).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Transformer Specific Loading Block */}
        {node.category === 'TRANSFORMER' && (
          <div className="p-2.5 rounded border border-teal-300 bg-teal-50/50 space-y-1.5 font-mono text-[10.5px]">
            <div className="flex items-center justify-between font-bold text-teal-950">
              <span>TRANSFORMER CAPACITY & UTILISATION</span>
              <span>{node.kva ?? '—'} kVA</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Measured Load (kVA):</span>
              <strong>
                {loadMetrics.measuredApparentPowerKva !== null
                  ? `${loadMetrics.measuredApparentPowerKva} kVA (${loadMetrics.measuredUtilizationPct}%)`
                  : 'Unavailable (Not Metered)'}
              </strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Estimated Demand:</span>
              <span>
                {loadMetrics.estimatedOperatingKva !== null
                  ? `${loadMetrics.estimatedOperatingKva} kVA (${loadMetrics.estimatedUtilizationPct ?? '—'}%) [ESTIMATED]`
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Available Capacity:</span>
              <strong>
                {loadMetrics.availableCapacityKva !== null
                  ? `${loadMetrics.availableCapacityKva} kVA`
                  : 'Unavailable'}
              </strong>
            </div>
          </div>
        )}

        {/* Shared Bus vs Source Output Block (GEN_SET, NEW_TURBINE, EEC_SUPPLY, OLD_TURBINE) */}
        {loadMetrics.isSharedBusSource && (
          <div className="p-2.5 rounded border border-sky-300 bg-sky-50/50 space-y-1.5 font-mono text-[10.5px]">
            <div className="flex items-center justify-between font-bold text-sky-950">
              <span>SOURCE OUTPUT VS SHARED BUS DEMAND</span>
              <span className="px-1 rounded bg-white border border-sky-200 text-[9px]">SEPARATED</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Nameplate Capacity:</span>
              <strong>
                {node.kva ? `${node.kva} kVA` : ''}
                {node.powerMw ? ` (${node.powerMw} MW)` : ''}
              </strong>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Shared Bus Est Demand:</span>
              <span>
                {loadMetrics.sharedBusDemandAmps ?? 0} A / {loadMetrics.sharedBusDemandKva ?? 0} kVA [EST]
              </span>
            </div>
            <div className="flex justify-between text-sky-950">
              <span>Actual Source Output:</span>
              <strong>
                {loadMetrics.sourceActualOutputKva !== null || loadMetrics.sourceActualOutputAmps !== null
                  ? `${loadMetrics.sourceActualOutputKva ?? '—'} kVA • ${loadMetrics.sourceActualOutputKw ?? '—'} kW • ${loadMetrics.sourceActualOutputAmps ?? '—'} A`
                  : 'Unavailable (Not Metered)'}
              </strong>
            </div>
          </div>
        )}

        {/* LOTO Isolation Procedure */}
        <div className="p-2.5 rounded border border-slate-200 bg-slate-50/70 space-y-1">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
            LOTO Isolation Procedure
          </div>
          <p className="font-mono text-[10.5px] text-slate-800 leading-relaxed">
            {node.lotoIsolationProcedure}
          </p>
        </div>

        {/* Direct Downstream Nodes */}
        {childNodes.length > 0 && (
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Direct Downstream Equipment ({childNodes.length})
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {childNodes.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => onSelectNode(child.id)}
                  className="text-left p-2 rounded border border-slate-200 hover:border-slate-400 bg-white cursor-pointer transition"
                >
                  <div className="flex items-center justify-between font-mono text-[10px] font-bold gap-1">
                    <span className="text-slate-900">{child.code}</span>
                    <div className="flex items-center gap-1">
                      <ConditionBadge
                        condition={conditionSummaries?.get(child.id)?.condition || 'NOT_INSPECTED'}
                        compact
                      />
                      <span
                        className={
                          child.operatingState === 'CLOSED'
                            ? 'text-emerald-700'
                            : child.operatingState === 'OPEN'
                            ? 'text-amber-700'
                            : 'text-slate-400'
                        }
                      >
                        {child.operatingState}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10.5px] font-semibold text-slate-700 truncate mt-0.5">
                    {child.feederPanelId || child.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Connected Motors List */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Connected Loads ({loadMetrics.connectedEquipment.length})
            </span>
            {loadMetrics.activeJobCards > 0 && (
              <span className="font-mono text-[10px] font-bold text-red-700">
                {loadMetrics.activeJobCards} Open JC
              </span>
            )}
          </div>

          {loadMetrics.connectedEquipment.length === 0 ? (
            <div className="p-3 rounded border border-dashed border-slate-300 bg-slate-50 text-center font-mono text-[10.5px] text-slate-500">
              No motors directly assigned to {node.code}.
            </div>
          ) : (
            <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-[200px] overflow-y-auto">
              {loadMetrics.connectedEquipment.slice(0, 25).map((eq) => {
                const latestEqMeas = equipmentMeasurementMap.get(eq.id);
                const eqSource: LoadDataSource = latestEqMeas
                  ? latestEqMeas.source
                  : eq.loadMeasurementSource === 'MEASURED' || eq.loadMeasurementSource === 'METERED'
                  ? eq.loadMeasurementSource
                  : eq.loadCurrentAmps !== undefined && eq.loadCurrentAmps !== null
                  ? 'ESTIMATED'
                  : 'NAMEPLATE';
                const displayEqAmps =
                  latestEqMeas?.values.currentAmps ?? eq.loadCurrentAmps ?? eq.ratedCurrentAmps ?? null;

                return (
                  <div
                    key={eq.id}
                    onClick={() => onInspectEquipment?.(eq)}
                    className="px-2.5 py-1.5 flex items-center justify-between gap-2 hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-900 truncate">
                        {eq.name}
                      </div>
                      <div className="font-mono text-[9.5px] text-slate-500 flex items-center gap-1 flex-wrap">
                        <span>{eq.code} • {eq.powerKw ? `${eq.powerKw}kW` : '—'} • {eq.starterType || 'DOL'} • {displayEqAmps ?? '—'}A</span>
                        <span className={`px-1 rounded border text-[8.5px] font-bold ${sourceBadgeClass(eqSource)}`}>
                          {eqSource === 'MEASURED' ? 'MEAS' : eqSource === 'METERED' ? 'MTR' : eqSource === 'NAMEPLATE' ? 'FLC' : 'EST'}
                        </span>
                        <ConditionBadge
                          condition={conditionSummaries?.get(eq.id)?.condition || 'NOT_INSPECTED'}
                          compact
                          onClick={onOpenEquipmentCondition ? () => onOpenEquipmentCondition(eq) : undefined}
                        />
                      </div>
                    </div>
                    {onNewJobCardForEquipment && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNewJobCardForEquipment(eq);
                        }}
                        className="p-1 rounded border border-slate-200 hover:border-slate-400 text-slate-600 hover:text-slate-900 shrink-0 cursor-pointer"
                        title={`Log Job Card for ${eq.name}`}
                      >
                        <Wrench className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
              {loadMetrics.connectedEquipment.length > 25 && (
                <div className="px-2.5 py-1.5 text-center font-mono text-[10px] text-slate-500 bg-slate-50">
                  + {loadMetrics.connectedEquipment.length - 25} more — Open Full Branch View
                </div>
              )}
            </div>
          )}
        </div>

        {/* Outstanding ERP Job Cards */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              <Wrench className="w-3 h-3" />
              <span>Outstanding Job Cards ({outstandingJobCards.length})</span>
            </span>
          </div>
          {outstandingJobCards.length === 0 ? (
            <div className="p-2.5 rounded border border-dashed border-slate-200 bg-slate-50/70 font-mono text-[10px] text-slate-500">
              No open works requisitions linked to {node.code}.
            </div>
          ) : (
            <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-[160px] overflow-y-auto">
              {outstandingJobCards.slice(0, 8).map((jc) => (
                <div
                  key={jc.id}
                  onClick={() => onSelectJobCard?.(jc)}
                  className={`px-2.5 py-1.5 bg-white space-y-0.5 ${
                    onSelectJobCard ? 'hover:bg-slate-50 cursor-pointer' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 font-mono text-[10px]">
                    <span className="font-bold text-slate-900">{jc.jobCardNumber}</span>
                    <div className="flex items-center gap-1">
                      <span
                        className={`px-1 py-0.2 rounded text-[8.5px] font-bold ${
                          jc.priority === 'Emergency'
                            ? 'bg-red-100 text-red-800'
                            : jc.priority === 'High'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {jc.priority}
                      </span>
                      <span className="px-1 py-0.2 rounded bg-slate-100 text-slate-700 text-[8.5px] font-semibold">
                        {jc.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10.5px] font-semibold text-slate-800 truncate">
                    {jc.equipmentName}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">{jc.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Maintenance & Audit History */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              <Clock className="w-3 h-3" />
              <span>
                Maintenance & Revision History (
                {(nodeConditionSummary?.inspections.length ?? 0) + (node.modificationHistory?.length ?? 0)})
              </span>
            </span>
          </div>
          {(nodeConditionSummary?.inspections.length ?? 0) === 0 &&
          (node.modificationHistory?.length ?? 0) === 0 ? (
            <div className="p-2.5 rounded border border-dashed border-slate-200 bg-slate-50/70 font-mono text-[10px] text-slate-500">
              No inspection or configuration history recorded yet on {node.code}.
            </div>
          ) : (
            <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-[160px] overflow-y-auto">
              {(nodeConditionSummary?.inspections || []).slice(0, 4).map((insp) => (
                <div key={insp.id} className="px-2.5 py-1.5 bg-white text-[10px] space-y-0.5">
                  <div className="flex items-center justify-between gap-1 font-mono">
                    <span className="font-bold text-indigo-900">{insp.inspectionNumber}</span>
                    <span className="text-slate-500">
                      {new Date(insp.inspectedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ConditionBadge condition={insp.conditionAssessment} compact />
                    <span className="font-mono text-[9.5px] text-slate-600 truncate">
                      {insp.technicianName}
                    </span>
                  </div>
                </div>
              ))}
              {(node.modificationHistory || []).slice(0, 4).map((log) => (
                <div key={log.id} className="px-2.5 py-1.5 bg-slate-50/60 font-mono text-[9.5px] space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-800">{log.changeType}</span>
                    <span className="text-slate-500">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-slate-700">{log.summary}</div>
                  <div className="text-slate-500 truncate">By {log.modifiedBy}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Immutable Node Measurement Ledger Snippet */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              <Clock className="w-3 h-3" />
              <span>Immutable Measurement Log ({nodeMeasurements.length})</span>
            </span>
          </div>
          {nodeMeasurements.length === 0 ? (
            <div className="p-2.5 rounded border border-dashed border-slate-200 bg-slate-50/70 font-mono text-[10px] text-slate-500">
              No historical field/meter readings logged yet on {node.code}.
            </div>
          ) : (
            <div className="border border-slate-200 rounded divide-y divide-slate-100">
              {nodeMeasurements.slice(0, 4).map((m) => (
                <div key={m.id} className="px-2.5 py-1.5 font-mono text-[10px] space-y-0.5 bg-white">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`px-1 py-0.2 rounded border text-[9px] font-bold ${sourceBadgeClass(m.source)}`}>
                      {m.source} • {m.phase}
                    </span>
                    <span className="text-[9.5px] text-slate-500">
                      {new Date(m.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-slate-800 font-semibold">
                    {m.values.currentAmps !== undefined ? `${m.values.currentAmps}A ` : ''}
                    {m.values.voltageV !== undefined ? `• ${m.values.voltageV}V ` : ''}
                    {m.values.apparentPowerKva !== undefined ? `• ${m.values.apparentPowerKva}kVA ` : ''}
                    {m.values.activePowerKw !== undefined ? `• ${m.values.activePowerKw}kW ` : ''}
                    {m.values.powerFactor !== undefined ? `• PF ${m.values.powerFactor}` : ''}
                  </div>
                  <div className="text-[9px] text-slate-500 truncate">By {m.recordedBy}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drawer Footer Actions */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-col gap-2">
        {onOpenNodeCondition && (
          <button
            type="button"
            onClick={() => onOpenNodeCondition(node.id)}
            className="w-full py-1.5 px-3 rounded border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-indigo-700" />
            <span>
              Inspections & Condition ({conditionSummaries?.get(node.id)?.totalInspections ?? 0})
            </span>
          </button>
        )}

        {onRecordElectricalMeasurement && (
          <button
            type="button"
            onClick={() => setShowLogModal(true)}
            className="w-full py-1.5 px-3 rounded border border-teal-400 bg-teal-50 hover:bg-teal-100 text-teal-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
          >
            <Gauge className="w-3.5 h-3.5 text-teal-700" />
            <span>Log Field / Meter Measurement</span>
          </button>
        )}

        {node.operatingState !== 'DECOMMISSIONED' && (
          isEngineer ? (
            <button
              type="button"
              disabled={switching}
              onClick={handleToggleSwitch}
              className={`w-full py-1.5 px-3 rounded border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                node.operatingState === 'CLOSED'
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
            >
              {node.operatingState === 'CLOSED' ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{switching ? 'Switching...' : `Open / Isolate ${node.code}`}</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>{switching ? 'Switching...' : `Close / Energize ${node.code}`}</span>
                </>
              )}
            </button>
          ) : (
            <div className="w-full py-1.5 px-2.5 rounded border border-amber-200 bg-amber-50/70 text-amber-900 font-mono text-[10.5px] flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3 shrink-0" />
              <span>Authorized Engineer required for switching / topology edits</span>
            </div>
          )
        )}

        {onExpandHierarchyNode && (
          <button
            type="button"
            onClick={() => onExpandHierarchyNode(node.id)}
            className={`w-full py-1.5 px-3 rounded border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
              isHierarchyExpanded
                ? 'bg-teal-700 hover:bg-teal-800 text-white border-teal-800'
                : 'bg-white hover:bg-slate-100 text-slate-900 border-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>
              {isHierarchyExpanded
                ? `Hide ${node.code} Internal Hierarchy`
                : `Expand ${node.code} Hierarchical Branch Tree`}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onOpenBranchWorkspace(node.id)}
          className="w-full py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>
            {isEngineer
              ? 'Edit Specs & Open Full Branch Workspace'
              : 'Open Full Branch Workspace (Read / Inspect)'}
          </span>
          <ExternalLink className="w-3 h-3 opacity-80" />
        </button>
      </div>

      {showLogModal && onRecordElectricalMeasurement && (
        <LogMeasurementModal
          assetId={node.id}
          assetKind="POWER_NODE"
          assetCode={node.code}
          assetName={node.name}
          nominalVoltageV={nominalV}
          targetNode={node}
          currentUserName={currentUserName}
          onClose={() => setShowLogModal(false)}
          onSubmitMeasurement={onRecordElectricalMeasurement}
        />
      )}

      {/* C4 <-> C7 Interlock Danger Confirmation Overlay */}
      {pendingDangerPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/75 p-4">
          <div className="bg-white rounded-lg border-2 border-red-600 shadow-2xl max-w-md w-full p-5 space-y-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-8 h-8 text-red-600 shrink-0" />
              <div className="text-xs">
                <h4 className="font-black text-red-900 text-sm">
                  UN-INTERLOCKED SIMULTANEOUS CLOSURE DANGER
                </h4>
                <p className="text-red-800 mt-1 leading-relaxed">
                  <strong>{pendingDangerPartner.code}</strong> is currently <strong>CLOSED</strong> on Tx1 MCC Busbar and has no interlock with <strong>{node.code}</strong>. Closing both simultaneously risks an out-of-phase parallel arc-flash fault.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPendingDangerPartner(null)}
                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                Abort (Keep OPEN)
              </button>
              <button
                type="button"
                disabled={switching}
                onClick={() =>
                  performStateSwitch(
                    'CLOSED',
                    `Manual hazard override confirmed past C4-C7 interlock warning`
                  )
                }
                className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
              >
                Force CLOSED Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
