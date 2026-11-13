import React, { useState, useMemo, useEffect } from 'react';
import {
  Zap,
  AlertTriangle,
  ShieldAlert,
  Search,
  X,
  CheckCircle2,
  Edit3,
  Power,
  Activity
} from 'lucide-react';
import {
  Equipment,
  JobCard,
  FeederPanelId,
  PowerDistributionNode,
  EquipmentModificationLog
} from '../../types';
import {
  FEEDER_PANELS,
  computeNodeLoadMetrics,
  evaluatePowerDistributionHazards
} from '../../core/master-data/powerDistributionData';
import { PowerBranchDetailView } from './PowerBranchDetailView';

interface PowerDistributionSLDViewProps {
  powerNodes: PowerDistributionNode[];
  equipmentList: Equipment[];
  jobCards: JobCard[];
  currentUserName: string;
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
  onModifyEquipment?: (
    equipment: Equipment,
    updates: Partial<Equipment>,
    audit: {
      modifiedBy: string;
      changeType: EquipmentModificationLog['changeType'];
      summary: string;
      reason: string;
      previousValues?: Record<string, any>;
      newValues?: Record<string, any>;
    }
  ) => Promise<void>;
  onCreateEquipment?: (data: any) => Promise<void>;
  onSelectEquipment?: (equipment: Equipment) => void;
  onNewJobCardForEquipment?: (equipment: Equipment) => void;
  initialSelectedPanel?: FeederPanelId | null;
}

export const PowerDistributionSLDView: React.FC<PowerDistributionSLDViewProps> = ({
  powerNodes,
  equipmentList,
  jobCards,
  currentUserName,
  onUpdatePowerNode,
  onModifyEquipment,
  onCreateEquipment,
  onSelectEquipment,
  onNewJobCardForEquipment,
  initialSelectedPanel = null
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(() => {
    if (!initialSelectedPanel) return null;
    const panelMeta = FEEDER_PANELS.find(p => p.id === initialSelectedPanel);
    return panelMeta ? panelMeta.breakerId : null;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showHazardModal, setShowHazardModal] = useState(false);

  // Sync if initialSelectedPanel changes from parent Grid/Table jump
  useEffect(() => {
    if (initialSelectedPanel) {
      const panelMeta = FEEDER_PANELS.find(p => p.id === initialSelectedPanel);
      if (panelMeta) setSelectedNodeId(panelMeta.breakerId);
    }
  }, [initialSelectedPanel]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, PowerDistributionNode>();
    powerNodes.forEach(n => map.set(n.id, n));
    return map;
  }, [powerNodes]);

  const metricsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeNodeLoadMetrics>>();
    powerNodes.forEach(n => {
      map.set(n.id, computeNodeLoadMetrics(n, powerNodes, equipmentList));
    });
    return map;
  }, [powerNodes, equipmentList]);

  const hazards = useMemo(
    () => evaluatePowerDistributionHazards(powerNodes, equipmentList),
    [powerNodes, equipmentList]
  );

  const criticalAndHighHazards = useMemo(
    () => hazards.filter(h => h.severity === 'CRITICAL' || h.severity === 'HIGH'),
    [hazards]
  );

  const hvMetrics = metricsMap.get('BUS_11KV');

  const matchesSearch = (nodeId: string): boolean => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const node = nodeMap.get(nodeId);
    const metrics = metricsMap.get(nodeId);
    if (!node) return false;

    const hitNode =
      node.code.toLowerCase().includes(q) ||
      node.name.toLowerCase().includes(q) ||
      node.brand.toLowerCase().includes(q) ||
      node.model.toLowerCase().includes(q);
    const hitMotor = metrics?.connectedEquipment.some(
      eq => eq.name.toLowerCase().includes(q) || eq.code.toLowerCase().includes(q)
    );
    return Boolean(hitNode || hitMotor);
  };

  // If user clicked any node, render the dedicated full-width Branch Page
  const activeNode = selectedNodeId ? nodeMap.get(selectedNodeId) || null : null;
  if (activeNode) {
    return (
      <PowerBranchDetailView
        node={activeNode}
        allNodes={powerNodes}
        equipmentList={equipmentList}
        jobCards={jobCards}
        hazards={hazards}
        currentUserName={currentUserName}
        onBackToOverview={() => setSelectedNodeId(null)}
        onNavigateToNode={(id) => setSelectedNodeId(id)}
        onUpdatePowerNode={onUpdatePowerNode}
        onModifyEquipment={onModifyEquipment}
        onCreateEquipment={onCreateEquipment}
        onNewJobCardForEquipment={onNewJobCardForEquipment}
        onInspectEquipment={onSelectEquipment}
      />
    );
  }

  // Helper to render compact circuit breaker card matching the Block Diagram style
  const renderBreakerChip = (
    nodeId: string,
    opts?: {
      subLabel?: string;
      compact?: boolean;
      highlightDanger?: boolean;
    }
  ) => {
    const node = nodeMap.get(nodeId);
    const metrics = metricsMap.get(nodeId);
    if (!node) return null;

    const isDimmed = searchQuery.trim() !== '' && !matchesSearch(nodeId);
    const isDecomm = node.operatingState === 'DECOMMISSIONED';
    const isOpen = node.operatingState === 'OPEN';
    const isTripped = node.operatingState === 'TRIPPED';
    const hasMaint = (metrics?.maintenanceCount || 0) > 0;
    const isUnrecorded = node.brand === 'Unrecorded' || node.ratedAmps === null;
    const isHazard = opts?.highlightDanger || node.interlockStatus === 'NONE_HAZARD';

    const stateDot = isDecomm
      ? 'bg-slate-400'
      : isTripped
      ? 'bg-red-600 animate-ping'
      : isOpen
      ? 'bg-amber-400'
      : 'bg-emerald-500';

    const breakerSpecLine =
      node.brand === 'Unrecorded'
        ? 'Nameplate Unrecorded'
        : `${node.brand}${node.model && node.model !== 'Nameplate Unrecorded' ? ` ${node.model}` : ''}`;

    const typeSizeLine = [
      node.breakerType !== 'Unrecorded' ? node.breakerType : null,
      node.ratedAmps ? `${node.ratedAmps}A` : 'Size ?'
    ]
      .filter(Boolean)
      .join(' • ');

    return (
      <button
        key={node.id}
        onClick={() => setSelectedNodeId(node.id)}
        title={`Click to open ${node.name} branch page & edit specs`}
        className={`group text-left rounded-lg border transition-all cursor-pointer relative ${
          opts?.compact ? 'p-1.5' : 'p-2'
        } ${
          isDimmed ? 'opacity-25' : 'opacity-100'
        } ${
          isDecomm
            ? 'bg-rose-50/50 border-rose-200 hover:border-rose-400'
            : isHazard
            ? 'bg-amber-50/90 border-amber-400 hover:border-red-500 shadow-2xs'
            : 'bg-white border-slate-300 hover:border-[#714B67] hover:shadow-sm'
        }`}
      >
        {/* Top Row: Circuit ID + State + Maintenance Alert */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${stateDot}`} />
            <span className="font-mono text-[11px] font-black text-slate-900 truncate">
              {node.code}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isHazard && (
              <ShieldAlert className="w-3 h-3 text-red-600" aria-label="No Interlock Hazard" />
            )}
            {hasMaint && (
              <span className="px-1 py-0.2 rounded bg-red-600 text-white text-[9px] font-bold font-mono">
                {metrics!.maintenanceCount}⚠
              </span>
            )}
            <Edit3 className="w-2.5 h-2.5 text-slate-300 group-hover:text-[#714B67] transition-colors" />
          </div>
        </div>

        {/* Sub-label / Branch Name */}
        {(opts?.subLabel || node.feederPanelId) && (
          <div className="text-[11px] font-bold text-slate-800 leading-tight mt-0.5 truncate">
            {opts?.subLabel || node.feederPanelId}
          </div>
        )}

        {/* Brand + Type + Size */}
        <div
          className={`text-[9.5px] font-mono leading-tight mt-0.5 truncate ${
            isUnrecorded ? 'text-amber-700 italic' : 'text-slate-600'
          }`}
        >
          {breakerSpecLine}
        </div>
        <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-slate-100 text-[10px] font-mono">
          <span className="text-slate-500 font-semibold truncate">{typeSizeLine}</span>
          <span
            className={`font-bold shrink-0 ${
              isDecomm
                ? 'text-slate-400'
                : isOpen
                ? 'text-amber-600'
                : 'text-sky-700'
            }`}
          >
            {isDecomm ? 'OFF' : `${metrics?.effectiveDisplayAmps ?? 0}A`}
          </span>
        </div>
      </button>
    );
  };

  // Source or Transformer summary block
  const renderEquipmentBlock = (nodeId: string, tone: 'rose' | 'sky' | 'emerald' | 'amber') => {
    const node = nodeMap.get(nodeId);
    if (!node) return null;
    const isDimmed = searchQuery.trim() !== '' && !matchesSearch(nodeId);

    const toneClasses = {
      rose: 'bg-white border-rose-300 hover:border-rose-500 text-rose-950',
      sky: 'bg-white border-sky-300 hover:border-sky-500 text-sky-950',
      emerald: 'bg-white border-emerald-300 hover:border-emerald-500 text-emerald-950',
      amber: 'bg-amber-50/60 border-amber-300 hover:border-amber-500 text-amber-950'
    }[tone];

    return (
      <button
        onClick={() => setSelectedNodeId(node.id)}
        className={`text-center rounded-lg border px-2.5 py-1.5 transition cursor-pointer shadow-2xs group ${toneClasses} ${
          isDimmed ? 'opacity-25' : ''
        }`}
      >
        <div className="text-[10.5px] font-bold leading-tight group-hover:underline">
          {node.name}
        </div>
        <div className="text-[9.5px] font-mono text-slate-600 mt-0.5 leading-tight">
          {node.kva ? `${node.kva} kVA` : ''}
          {node.powerMw ? ` • ${node.powerMw} MW` : ''}
          {node.voltage ? ` • ${node.voltage}` : ''}
        </div>
        {(node.primaryAmps || node.secondaryAmps) && (
          <div className="text-[9px] font-mono text-slate-500 leading-tight">
            I: {node.primaryAmps}{node.secondaryAmps ? `/${node.secondaryAmps}` : ''} A • {node.frequencyHz || 50}Hz
          </div>
        )}
      </button>
    );
  };

  const c4 = nodeMap.get('C4');
  const c7 = nodeMap.get('C7');
  const bothC4C7Closed = c4?.operatingState === 'CLOSED' && c7?.operatingState === 'CLOSED';

  return (
    <div className="bg-[#f4f6f8] text-slate-900 rounded-xl border border-slate-300 shadow-sm overflow-hidden flex flex-col">
      {/* Compact Engineering Header Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-mono font-bold">
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
              SLD v2.0 BLOCK TWIN
            </span>
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
              USA DISTILLERS | POWER DISTRIBUTION OVERVIEW
            </h2>
            <span className="hidden xl:inline text-[10px] font-mono text-slate-500">
              Author: Bongani Dlamini & Sicelo Simelane • Click any block to open Branch Page & Edit
            </span>
          </div>
        </div>

        {/* Metrics & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Critical Hazard Indicator Pill */}
          {criticalAndHighHazards.length > 0 && (
            <button
              onClick={() => setShowHazardModal(true)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 border cursor-pointer transition ${
                bothC4C7Closed
                  ? 'bg-red-600 text-white border-red-700 animate-pulse shadow-sm'
                  : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
              }`}
              title="Click to inspect flagged electrical design hazards"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>
                {bothC4C7Closed
                  ? 'CRITICAL FAULT: C4 & C7 BOTH CLOSED!'
                  : `${criticalAndHighHazards.length} Safety Flag (C4 ↔ C7)`}
              </span>
            </button>
          )}

          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
            <span className="text-slate-500">Plant Load:</span>
            <span className="font-bold text-amber-700">{hvMetrics?.totalKw ?? 0} kW</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Motors:</span>
            <span className="font-bold text-slate-900">{hvMetrics?.equipmentCount ?? 0}</span>
            <span className="text-slate-300">|</span>
            <span className={hvMetrics?.maintenanceCount ? 'font-bold text-red-600' : 'text-emerald-700 font-semibold'}>
              {hvMetrics?.maintenanceCount ?? 0} Maint.
            </span>
          </div>

          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find C8, MCC 1, Boiler, pump..."
              className="w-full pl-8 pr-7 py-1 bg-slate-50 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-[#714B67]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SINGLE-PAGE 4-TIER BLOCK DIAGRAM WORKSPACE */}
      <div className="p-3 lg:p-4 space-y-2.5">
        {/* TIER 1: 3 PRIMARY POWER INCOMERS (OLD TURBINE | EEC SUPPLY | NEW TURBINE) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
          {/* OLD TURBINE ALTERNATOR (4 cols) */}
          <div className="lg:col-span-4 rounded-xl border-2 border-rose-300/80 bg-rose-50/40 p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[9.5px] font-bold tracking-wider uppercase text-rose-800 mb-1.5 px-1">
              <span>OLD TURBINE ALTERNATOR - STEP UP PATH</span>
              <span className="px-1.5 py-0.2 rounded bg-rose-200/80 text-rose-900 font-mono">DECOMMISSIONED</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 items-stretch">
              {renderEquipmentBlock('OLD_TURBINE', 'rose')}
              {renderEquipmentBlock('OLD_STEP_UP_TX', 'rose')}
              {renderBreakerChip('C1', { subLabel: 'Old Turbine VCB', compact: true })}
            </div>
          </div>

          {/* EEC INCOMING SUPPLY (4 cols) */}
          <div className="lg:col-span-4 rounded-xl border-2 border-sky-300/90 bg-sky-50/40 p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[9.5px] font-bold tracking-wider uppercase text-sky-900 mb-1.5 px-1">
              <span>EEC INCOMING SUPPLY</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-mono">GRID LIVE</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 items-stretch">
              {renderEquipmentBlock('EEC_SUPPLY', 'sky')}
              {renderEquipmentBlock('METERING_TX', 'sky')}
              {renderBreakerChip('C2', { subLabel: '11 kV Incomer', compact: true })}
            </div>
          </div>

          {/* NEW TURBINE ALTERNATOR (4 cols) */}
          <div className="lg:col-span-4 rounded-xl border-2 border-teal-400/80 bg-teal-50/40 p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[9.5px] font-bold tracking-wider uppercase text-teal-900 mb-1.5 px-1">
              <span>NEW TURBINE ALTERNATOR</span>
              <span className="px-1.5 py-0.2 rounded bg-teal-200/80 text-teal-950 font-mono">CO-GEN 3.8 MW</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 items-stretch">
              {renderEquipmentBlock('NEW_TURBINE', 'emerald')}
              {renderBreakerChip('C3', { subLabel: 'New Turbine VCB', compact: true })}
            </div>
          </div>
        </div>

        {/* VERTICAL CONNECTORS TO 11 KV BUSBAR */}
        <div className="hidden lg:grid grid-cols-12 h-2">
          <div className="col-span-4 flex justify-center"><div className="w-0.5 h-full bg-rose-300 border-l border-dashed border-rose-400" /></div>
          <div className="col-span-4 flex justify-center"><div className="w-0.5 h-full bg-sky-500" /></div>
          <div className="col-span-4 flex justify-center"><div className="w-0.5 h-full bg-teal-500" /></div>
        </div>

        {/* TIER 2: 11 KV MAIN BUSBAR */}
        <button
          onClick={() => setSelectedNodeId('BUS_11KV')}
          className="w-full py-1.5 px-4 rounded-lg bg-[#1e293b] hover:bg-slate-800 text-white font-mono text-xs font-black tracking-widest flex items-center justify-between shadow-xs cursor-pointer transition border border-slate-700"
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>11 KV BUSBAR</span>
          </span>
          <span className="text-[10px] font-normal text-slate-300">
            Click to inspect HV Busbar • Total HV Est: {hvMetrics?.effectiveDisplayAmps ?? 0} A @ 11kV ({hvMetrics?.totalKw ?? 0} kW)
          </span>
          <span className="text-[10px] text-amber-300 font-bold">50 Hz • 3Ø</span>
        </button>

        {/* TIER 3 & TIER 4: 3 STEP-DOWN TRANSFORMERS -> MAIN CONTROL CENTRES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
          {/* =============================================================== */}
          {/* COLUMN 1: TX1 (1600 kVA) -> C4 -> Tx1 MCC (C7 GEN SET, C8, C9, C10) */}
          {/* =============================================================== */}
          <div className="flex flex-col space-y-1.5">
            {/* HV Fuse -> Step Down Tx1 -> C4 */}
            <div className="grid grid-cols-3 gap-1.5 items-stretch">
              {renderBreakerChip('TX1_FUSE', { subLabel: 'HV Fused Switch', compact: true })}
              {renderEquipmentBlock('TX1', 'amber')}
              {renderBreakerChip('C4', { subLabel: 'Tx1 Main LV', compact: true, highlightDanger: true })}
            </div>

            {/* Tx1 Main Control Centre Container */}
            <div className="flex-1 rounded-xl border-2 border-indigo-300 bg-indigo-50/30 p-2.5 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedNodeId('BUS_TX1')}
                  className="text-left hover:underline cursor-pointer"
                >
                  <div className="text-xs font-extrabold text-indigo-950">Tx1 Main Control Centre</div>
                  <div className="text-[10px] font-mono text-indigo-700 font-semibold">Busbar | 400 V • 1600 kVA Feed</div>
                </button>

                {/* Non-Interlock Warning Flag right on Tx1 MCC */}
                <button
                  onClick={() => setShowHazardModal(true)}
                  className={`px-2 py-0.5 rounded text-[9.5px] font-bold flex items-center gap-1 cursor-pointer border ${
                    bothC4C7Closed
                      ? 'bg-red-600 text-white border-red-700 animate-pulse'
                      : 'bg-red-100 text-red-900 border-red-300 hover:bg-red-200'
                  }`}
                  title="C4 and C7 have NO changeover interlock!"
                >
                  <ShieldAlert className="w-3 h-3" />
                  <span>C4 ↔ C7 NO INTERLOCK</span>
                </button>
              </div>

              {/* Busbar Spine Line */}
              <div className="h-1 w-full bg-indigo-500 rounded-full" />

              {/* Tx1 Branches Grid: C7 (Gen Set) + C8 (MCC 1) + C9 (Boiler 2) + C10 (MCC 4) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 items-start">
                <div className="space-y-1.5 flex flex-col">
                  {renderBreakerChip('C7', { subLabel: 'Gen Set Incomer', compact: true, highlightDanger: true })}
                  {renderEquipmentBlock('GEN_SET', 'sky')}
                </div>
                {renderBreakerChip('C8', { subLabel: 'MCC 1 (Dist.)' })}
                {renderBreakerChip('C9', { subLabel: 'Boiler 2' })}
                {renderBreakerChip('C10', { subLabel: 'MCC 4 (Ferm.)' })}
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/* COLUMN 2: TX2 (800 kVA) -> C5 -> Tx2 MCC (C11, C12 -> C18/19/20, C13) */}
          {/* =============================================================== */}
          <div className="flex flex-col space-y-1.5">
            {/* HV Fuse -> Step Down Tx2 -> C5 */}
            <div className="grid grid-cols-3 gap-1.5 items-stretch">
              {renderBreakerChip('TX2_FUSE', { subLabel: 'HV Fused Switch', compact: true })}
              {renderEquipmentBlock('TX2', 'amber')}
              {renderBreakerChip('C5', { subLabel: 'Tx2 Main LV', compact: true })}
            </div>

            {/* Tx2 Main Control Centre Container */}
            <div className="flex-1 rounded-xl border-2 border-emerald-400/80 bg-emerald-50/30 p-2.5 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedNodeId('BUS_TX2')}
                  className="text-left hover:underline cursor-pointer"
                >
                  <div className="text-xs font-extrabold text-emerald-950">Tx2 Main Control Centre</div>
                  <div className="text-[10px] font-mono text-emerald-800 font-semibold">Busbar | 400 V • 800 kVA Feed</div>
                </button>
                <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                  {metricsMap.get('C5')?.effectiveDisplayAmps ?? 0} A Total
                </span>
              </div>

              <div className="h-1 w-full bg-emerald-500 rounded-full" />

              {/* Row 1 of Tx2 MCC: C11 (MCC 2), C12 (Sub-feeder), C13 (Boiler 1) */}
              <div className="grid grid-cols-3 gap-1.5">
                {renderBreakerChip('C11', { subLabel: 'MCC 2' })}
                {renderBreakerChip('C12', { subLabel: 'WTP/Batch/Dam1' })}
                {renderBreakerChip('C13', { subLabel: 'Boiler 1' })}
              </div>

              {/* Sub-branches under C12: C18 Old WTP, C19 Batch Plant, C20 Dam 1 */}
              <div className="pt-1 border-t border-dashed border-emerald-300">
                <div className="text-[9px] font-mono font-bold text-emerald-800 uppercase mb-1 flex items-center justify-between">
                  <span>↳ Fed via C12 Sub-Distribution</span>
                  <span>{metricsMap.get('C12')?.effectiveDisplayAmps ?? 0} A Sum</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {renderBreakerChip('C18', { subLabel: 'OLD WTP', compact: true })}
                  {renderBreakerChip('C19', { subLabel: 'BATCH PLANT', compact: true })}
                  {renderBreakerChip('C20', { subLabel: 'DAM 1 (slops)', compact: true })}
                </div>
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/* COLUMN 3: TX3 (800 kVA) -> C6 -> Tx3 MCC (C14, C15, C16, C17)   */}
          {/* =============================================================== */}
          <div className="flex flex-col space-y-1.5">
            {/* HV Fuse -> Step Down Tx3 -> C6 */}
            <div className="grid grid-cols-3 gap-1.5 items-stretch">
              {renderBreakerChip('TX3_FUSE', { subLabel: 'HV Fused Switch', compact: true })}
              {renderEquipmentBlock('TX3', 'amber')}
              {renderBreakerChip('C6', { subLabel: 'Tx3 Main LV', compact: true })}
            </div>

            {/* Tx3 Main Control Centre Container */}
            <div className="flex-1 rounded-xl border-2 border-purple-300 bg-purple-50/30 p-2.5 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedNodeId('BUS_TX3')}
                  className="text-left hover:underline cursor-pointer"
                >
                  <div className="text-xs font-extrabold text-purple-950">Tx3 Main Control Centre</div>
                  <div className="text-[10px] font-mono text-purple-800 font-semibold">Busbar | 400 V • 800 kVA Feed</div>
                </button>
                <span className="text-[10px] font-mono font-bold text-purple-900 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">
                  {metricsMap.get('C6')?.effectiveDisplayAmps ?? 0} A Total
                </span>
              </div>

              <div className="h-1 w-full bg-purple-500 rounded-full" />

              {/* Row of 4 branches under Tx3: C14 MCC 3, C15 Sub DB1 Compressors, C16 Boiler 3, C17 New WTP */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 items-start">
                {renderBreakerChip('C14', { subLabel: 'MCC 3 (CT/Rect)' })}
                {renderBreakerChip('C15', { subLabel: 'Sub DB1 Comp.' })}
                {renderBreakerChip('C16', { subLabel: 'Boiler 3' })}
                {renderBreakerChip('C17', { subLabel: 'NEW WTP' })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Legend & Revision Note */}
        <div className="bg-white rounded-lg border border-slate-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-600">
          <div className="flex flex-wrap items-center gap-3 font-mono">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> CLOSED (Live)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> OPEN (Standby/Isolated)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> DECOMMISSIONED</span>
            <span className="flex items-center gap-1 text-red-700 font-bold"><ShieldAlert className="w-3 h-3" /> Hazard Flag (Click to inspect)</span>
          </div>
          <span className="text-[10px] italic text-slate-500">
            Click any component or circuit breaker (C1–C20) to view branch motors, breaker brand/size/type, Amps load & edit specifications.
          </span>
        </div>
      </div>

      {/* ELECTRICAL DESIGN HAZARD & WATCHDOG MODAL */}
      {showHazardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-2xl w-full overflow-hidden">
            <div className="bg-red-700 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                <span className="font-bold text-sm">Plant Electrical Safety & Interlock Watchdog</span>
              </div>
              <button onClick={() => setShowHazardModal(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto bg-slate-50">
              {hazards.map((hz) => (
                <div
                  key={hz.id}
                  className={`p-3.5 rounded-lg border-l-4 bg-white shadow-2xs space-y-1.5 text-xs ${
                    hz.severity === 'CRITICAL'
                      ? 'border-l-red-600 border border-red-300'
                      : hz.severity === 'HIGH'
                      ? 'border-l-amber-500 border border-amber-300'
                      : 'border-l-slate-400 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-900">{hz.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        hz.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-800'
                          : hz.severity === 'HIGH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {hz.severity}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{hz.message}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                    <span className="font-mono text-[11px] font-semibold text-slate-800">
                      Action: {hz.actionRequired}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {hz.affectedNodeIds.slice(0, 3).map(id => (
                        <button
                          key={id}
                          onClick={() => {
                            setShowHazardModal(false);
                            setSelectedNodeId(id);
                          }}
                          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-[#714B67] text-white font-mono text-[10px] font-bold cursor-pointer"
                        >
                          Open {id}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
