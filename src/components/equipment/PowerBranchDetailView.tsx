import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Zap,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Wrench,
  Plus,
  History,
  ChevronRight,
  Lock,
  Unlock,
  Info,
  X,
  Check,
  ArrowRightLeft,
  Gauge,
  Activity
} from 'lucide-react';
import {
  PowerDistributionNode,
  Equipment,
  JobCard,
  BreakerType,
  BreakerOperatingState,
  FeederPanelId,
  StarterType,
  EquipmentStatus,
  EquipmentModificationLog
} from '../../types';
import {
  FEEDER_PANELS,
  computeNodeLoadMetrics,
  getUpstreamChain,
  ElectricalHazardAlert
} from '../../core/master-data/powerDistributionData';

interface PowerBranchDetailViewProps {
  node: PowerDistributionNode;
  allNodes: PowerDistributionNode[];
  equipmentList: Equipment[];
  jobCards: JobCard[];
  hazards: ElectricalHazardAlert[];
  currentUserName: string;
  onBackToOverview: () => void;
  onNavigateToNode: (nodeId: string) => void;
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
  onNewJobCardForEquipment?: (equipment: Equipment) => void;
  onInspectEquipment?: (equipment: Equipment) => void;
}

export const PowerBranchDetailView: React.FC<PowerBranchDetailViewProps> = ({
  node,
  allNodes,
  equipmentList,
  jobCards,
  hazards,
  currentUserName,
  onBackToOverview,
  onNavigateToNode,
  onUpdatePowerNode,
  onModifyEquipment,
  onCreateEquipment,
  onNewJobCardForEquipment,
  onInspectEquipment
}) => {
  const [activeTab, setActiveTab] = useState<'downstream' | 'history'>('downstream');
  const [isEditingNode, setIsEditingNode] = useState(false);
  const [savingNode, setSavingNode] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Node Edit Form State
  const [editName, setEditName] = useState(node.name);
  const [editBrand, setEditBrand] = useState(node.brand);
  const [editModel, setEditModel] = useState(node.model);
  const [editBreakerType, setEditBreakerType] = useState<BreakerType>(node.breakerType);
  const [editFrameSize, setEditFrameSize] = useState(node.frameSize || '');
  const [editRatedAmps, setEditRatedAmps] = useState(node.ratedAmps !== null ? String(node.ratedAmps) : '');
  const [editTripAmps, setEditTripAmps] = useState(node.tripSettingAmps != null ? String(node.tripSettingAmps) : '');
  const [editMeasuredAmps, setEditMeasuredAmps] = useState(node.measuredLoadAmps != null ? String(node.measuredLoadAmps) : '');
  const [editState, setEditState] = useState<BreakerOperatingState>(node.operatingState);
  const [editVoltage, setEditVoltage] = useState(node.voltage);
  const [editLocation, setEditLocation] = useState(node.location);
  const [editLoto, setEditLoto] = useState(node.lotoIsolationProcedure);
  const [editNotes, setEditNotes] = useState(node.notes || '');
  const [editKva, setEditKva] = useState(node.kva != null ? String(node.kva) : '');
  const [editPowerMw, setEditPowerMw] = useState(node.powerMw != null ? String(node.powerMw) : '');
  const [editPrimaryAmps, setEditPrimaryAmps] = useState(node.primaryAmps != null ? String(node.primaryAmps) : '');
  const [editSecondaryAmps, setEditSecondaryAmps] = useState(node.secondaryAmps != null ? String(node.secondaryAmps) : '');
  const [editInterlockStatus, setEditInterlockStatus] = useState(node.interlockStatus);
  const [editInterlockNote, setEditInterlockNote] = useState(node.interlockHazardNote || '');
  const [editReason, setEditReason] = useState('');
  const [editModifiedBy, setEditModifiedBy] = useState(currentUserName);

  // Interlock Danger Guard Modal (triggered if attempting to close C4 & C7 simultaneously)
  const [pendingDangerStateConfirm, setPendingDangerStateConfirm] = useState<{
    targetState: BreakerOperatingState;
    partnerNode: PowerDistributionNode;
  } | null>(null);

  // Motor Quick Edit / Reassign / Add Modal inside Branch Page
  const [motorToEdit, setMotorToEdit] = useState<Equipment | null>(null);
  const [motorEditName, setMotorEditName] = useState('');
  const [motorEditPowerKw, setMotorEditPowerKw] = useState('');
  const [motorEditRatedAmps, setMotorEditRatedAmps] = useState('');
  const [motorEditLoadAmps, setMotorEditLoadAmps] = useState('');
  const [motorEditOverloadAmps, setMotorEditOverloadAmps] = useState('');
  const [motorEditStarter, setMotorEditStarter] = useState<StarterType>('DOL');
  const [motorEditStatus, setMotorEditStatus] = useState<EquipmentStatus>('Operational');
  const [motorEditFeederPanel, setMotorEditFeederPanel] = useState<FeederPanelId>(
    node.feederPanelId || 'New Water Treatment Plant'
  );
  const [motorEditReason, setMotorEditReason] = useState('');
  const [savingMotor, setSavingMotor] = useState(false);

  // Add new motor directly to this branch
  const [isAddMotorOpen, setIsAddMotorOpen] = useState(false);
  const [newMotorCode, setNewMotorCode] = useState('');
  const [newMotorName, setNewMotorName] = useState('');
  const [newMotorKw, setNewMotorKw] = useState('');
  const [newMotorRatedAmps, setNewMotorRatedAmps] = useState('');
  const [newMotorLoadAmps, setNewMotorLoadAmps] = useState('');
  const [newMotorOverloadAmps, setNewMotorOverloadAmps] = useState('');
  const [newMotorStarter, setNewMotorStarter] = useState<StarterType>('DOL');
  const [newMotorRpm, setNewMotorRpm] = useState('1475');
  const [savingNewMotor, setSavingNewMotor] = useState(false);

  // Re-sync edit state when node changes
  const openNodeEdit = () => {
    setEditName(node.name);
    setEditBrand(node.brand);
    setEditModel(node.model);
    setEditBreakerType(node.breakerType);
    setEditFrameSize(node.frameSize || '');
    setEditRatedAmps(node.ratedAmps !== null ? String(node.ratedAmps) : '');
    setEditTripAmps(node.tripSettingAmps != null ? String(node.tripSettingAmps) : '');
    setEditMeasuredAmps(node.measuredLoadAmps != null ? String(node.measuredLoadAmps) : '');
    setEditState(node.operatingState);
    setEditVoltage(node.voltage);
    setEditLocation(node.location);
    setEditLoto(node.lotoIsolationProcedure);
    setEditNotes(node.notes || '');
    setEditKva(node.kva != null ? String(node.kva) : '');
    setEditPowerMw(node.powerMw != null ? String(node.powerMw) : '');
    setEditPrimaryAmps(node.primaryAmps != null ? String(node.primaryAmps) : '');
    setEditSecondaryAmps(node.secondaryAmps != null ? String(node.secondaryAmps) : '');
    setEditInterlockStatus(node.interlockStatus);
    setEditInterlockNote(node.interlockHazardNote || '');
    setEditReason('');
    setEditError(null);
    setIsEditingNode(true);
  };

  const upstreamChain = useMemo(() => getUpstreamChain(node.id, allNodes), [node.id, allNodes]);
  const loadMetrics = useMemo(
    () => computeNodeLoadMetrics(node, allNodes, equipmentList),
    [node, allNodes, equipmentList]
  );

  // Direct child SLD nodes (e.g., for C12 -> C18/C19/C20; for BUS_TX1 -> C7/C8/C9/C10; for C4 -> BUS_TX1)
  const childNodes = useMemo(() => {
    if (node.id === 'C4') return allNodes.filter(n => ['C7', 'C8', 'C9', 'C10'].includes(n.id));
    if (node.id === 'C5') return allNodes.filter(n => ['C11', 'C12', 'C13'].includes(n.id));
    if (node.id === 'C6') return allNodes.filter(n => ['C14', 'C15', 'C16', 'C17'].includes(n.id));
    return allNodes.filter(n => n.parentNodeId === node.id);
  }, [node.id, allNodes]);

  const nodeHazards = useMemo(
    () => hazards.filter(h => h.affectedNodeIds.includes(node.id)),
    [hazards, node.id]
  );

  const commitNodeSave = async (overrideState?: BreakerOperatingState) => {
    const finalState = overrideState || editState;
    setSavingNode(true);
    setEditError(null);

    try {
      const updates: Partial<PowerDistributionNode> = {
        name: editName.trim() || node.name,
        brand: editBrand.trim() || 'Unrecorded',
        model: editModel.trim() || 'Nameplate Unrecorded',
        breakerType: editBreakerType,
        frameSize: editFrameSize.trim() || undefined,
        ratedAmps: editRatedAmps.trim() ? parseFloat(editRatedAmps) : null,
        tripSettingAmps: editTripAmps.trim() ? parseFloat(editTripAmps) : null,
        measuredLoadAmps: editMeasuredAmps.trim() ? parseFloat(editMeasuredAmps) : null,
        measuredLoadUpdatedAt: editMeasuredAmps.trim() ? new Date().toISOString() : node.measuredLoadUpdatedAt,
        operatingState: finalState,
        voltage: editVoltage.trim() || node.voltage,
        location: editLocation.trim() || node.location,
        lotoIsolationProcedure: editLoto.trim() || node.lotoIsolationProcedure,
        notes: editNotes.trim(),
        kva: editKva.trim() ? parseFloat(editKva) : undefined,
        powerMw: editPowerMw.trim() ? parseFloat(editPowerMw) : undefined,
        primaryAmps: editPrimaryAmps.trim() ? parseFloat(editPrimaryAmps) : undefined,
        secondaryAmps: editSecondaryAmps.trim() ? parseFloat(editSecondaryAmps) : undefined,
        interlockStatus: editInterlockStatus,
        interlockHazardNote: editInterlockNote.trim() || undefined
      };

      const diffs: string[] = [];
      const prev: Record<string, any> = {};
      const next: Record<string, any> = {};

      if (node.brand !== updates.brand) {
        diffs.push(`Brand: ${node.brand} ➔ ${updates.brand}`);
        prev.brand = node.brand;
        next.brand = updates.brand;
      }
      if (node.model !== updates.model) {
        diffs.push(`Model: ${node.model} ➔ ${updates.model}`);
        prev.model = node.model;
        next.model = updates.model;
      }
      if (node.breakerType !== updates.breakerType) {
        diffs.push(`Type: ${node.breakerType} ➔ ${updates.breakerType}`);
        prev.breakerType = node.breakerType;
        next.breakerType = updates.breakerType;
      }
      if (node.ratedAmps !== updates.ratedAmps) {
        diffs.push(`Rated: ${node.ratedAmps ?? 'Unrecorded'}A ➔ ${updates.ratedAmps ?? 'Unrecorded'}A`);
        prev.ratedAmps = node.ratedAmps;
        next.ratedAmps = updates.ratedAmps;
      }
      if (node.measuredLoadAmps !== updates.measuredLoadAmps) {
        diffs.push(`Measured Load: ${node.measuredLoadAmps ?? 'Auto'}A ➔ ${updates.measuredLoadAmps ?? 'Auto'}A`);
        prev.measuredLoadAmps = node.measuredLoadAmps;
        next.measuredLoadAmps = updates.measuredLoadAmps;
      }
      if (node.operatingState !== updates.operatingState) {
        diffs.push(`State: ${node.operatingState} ➔ ${updates.operatingState}`);
        prev.operatingState = node.operatingState;
        next.operatingState = updates.operatingState;
      }

      const summary = diffs.length > 0 ? diffs.join(' | ') : 'Switchgear specification verified/updated';

      await onUpdatePowerNode(node, updates, {
        modifiedBy: editModifiedBy.trim() || currentUserName,
        summary,
        reason: editReason.trim() || 'Field switchboard verification update',
        previousValues: prev,
        newValues: next
      });

      setIsEditingNode(false);
      setPendingDangerStateConfirm(null);
    } catch (err: any) {
      setEditError(err.message || 'Failed to save changes.');
    } finally {
      setSavingNode(false);
    }
  };

  const handleNodeEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReason.trim()) {
      setEditError('Please provide an engineering reason for this modification.');
      return;
    }

    // Check C4 <-> C7 non-interlocked simultaneous close hazard!
    if ((node.id === 'C4' || node.id === 'C7') && editState === 'CLOSED') {
      const partnerId = node.id === 'C4' ? 'C7' : 'C4';
      const partner = allNodes.find(n => n.id === partnerId);
      if (partner && partner.operatingState === 'CLOSED' && editInterlockStatus === 'NONE_HAZARD') {
        setPendingDangerStateConfirm({ targetState: 'CLOSED', partnerNode: partner });
        return;
      }
    }

    await commitNodeSave();
  };

  const handleQuickToggleBreakerState = async () => {
    if (node.operatingState === 'DECOMMISSIONED') return;
    const nextState: BreakerOperatingState = node.operatingState === 'CLOSED' ? 'OPEN' : 'CLOSED';

    // Check C4 <-> C7 un-interlocked simultaneous close hazard
    if ((node.id === 'C4' || node.id === 'C7') && nextState === 'CLOSED') {
      const partnerId = node.id === 'C4' ? 'C7' : 'C4';
      const partner = allNodes.find(n => n.id === partnerId);
      if (partner && partner.operatingState === 'CLOSED' && node.interlockStatus === 'NONE_HAZARD') {
        setPendingDangerStateConfirm({ targetState: 'CLOSED', partnerNode: partner });
        return;
      }
    }

    await onUpdatePowerNode(
      node,
      { operatingState: nextState },
      {
        modifiedBy: currentUserName,
        summary: `Breaker State: ${node.operatingState} ➔ ${nextState}`,
        reason: `Switching operation logged on ${node.code}`,
        previousValues: { operatingState: node.operatingState },
        newValues: { operatingState: nextState }
      }
    );
  };

  const openMotorEdit = (eq: Equipment) => {
    setMotorToEdit(eq);
    setMotorEditName(eq.name);
    setMotorEditPowerKw(eq.powerKw != null ? String(eq.powerKw) : '');
    setMotorEditRatedAmps(eq.ratedCurrentAmps != null ? String(eq.ratedCurrentAmps) : '');
    setMotorEditLoadAmps(eq.loadCurrentAmps != null ? String(eq.loadCurrentAmps) : '');
    setMotorEditOverloadAmps(eq.overloadAmps != null ? String(eq.overloadAmps) : '');
    setMotorEditStarter(eq.starterType || 'DOL');
    setMotorEditStatus(eq.status);
    setMotorEditFeederPanel((eq.feederPanel as FeederPanelId) || node.feederPanelId || 'MCC 1');
    setMotorEditReason('');
  };

  const handleSaveMotorEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motorToEdit || !onModifyEquipment) return;
    setSavingMotor(true);
    try {
      const targetPanelMeta = FEEDER_PANELS.find(p => p.id === motorEditFeederPanel);
      const updates: Partial<Equipment> = {
        name: motorEditName.trim(),
        powerKw: motorEditPowerKw ? parseFloat(motorEditPowerKw) : undefined,
        ratedCurrentAmps: motorEditRatedAmps ? parseFloat(motorEditRatedAmps) : undefined,
        loadCurrentAmps: motorEditLoadAmps ? parseFloat(motorEditLoadAmps) : undefined,
        overloadAmps: motorEditOverloadAmps ? parseFloat(motorEditOverloadAmps) : undefined,
        starterType: motorEditStarter,
        status: motorEditStatus,
        feederPanel: motorEditFeederPanel,
        transformerSource: targetPanelMeta?.transformerSource || motorToEdit.transformerSource,
        feederBreaker: targetPanelMeta?.breakerCode || motorToEdit.feederBreaker
      };

      await onModifyEquipment(motorToEdit, updates, {
        modifiedBy: currentUserName,
        changeType: motorToEdit.feederPanel !== motorEditFeederPanel ? 'RELOCATION' : 'SPECS_UPDATE',
        summary: `Updated from SLD Branch ${node.code}: ${updates.powerKw ?? '—'}kW, Load ${updates.loadCurrentAmps ?? '—'}A, Panel ➔ ${motorEditFeederPanel}`,
        reason: motorEditReason.trim() || `Updated electrical specs via ${node.code} Branch Inspector`,
        previousValues: {
          powerKw: motorToEdit.powerKw,
          ratedCurrentAmps: motorToEdit.ratedCurrentAmps,
          loadCurrentAmps: motorToEdit.loadCurrentAmps,
          feederPanel: motorToEdit.feederPanel
        },
        newValues: updates
      });
      setMotorToEdit(null);
    } finally {
      setSavingMotor(false);
    }
  };

  const handleAddMotorToBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateEquipment || !node.feederPanelId) return;
    setSavingNewMotor(true);
    try {
      const panelMeta = FEEDER_PANELS.find(p => p.id === node.feederPanelId);
      const isNewWtp = node.feederPanelId === 'New Water Treatment Plant';
      await onCreateEquipment({
        code: newMotorCode.trim().toUpperCase(),
        name: newMotorName.trim(),
        department: isNewWtp ? 'Utilities - Water Treatment' : 'Engineering - Electrical & Instrumentation',
        location: node.location,
        status: 'Operational',
        criticality: 'High',
        plantArea: isNewWtp ? 'Water Treatment' : 'Boiler 1',
        powerKw: newMotorKw ? parseFloat(newMotorKw) : undefined,
        ratedCurrentAmps: newMotorRatedAmps ? parseFloat(newMotorRatedAmps) : undefined,
        loadCurrentAmps: newMotorLoadAmps ? parseFloat(newMotorLoadAmps) : undefined,
        overloadAmps: newMotorOverloadAmps ? parseFloat(newMotorOverloadAmps) : undefined,
        starterType: newMotorStarter,
        speedRpm: newMotorRpm ? parseFloat(newMotorRpm) : undefined,
        feederPanel: node.feederPanelId,
        transformerSource: panelMeta?.transformerSource || 'Tx3',
        feederBreaker: panelMeta?.breakerCode || node.code,
        notes: `Added directly to ${node.name} (${node.code}) via Power Distribution SLD.`
      });
      setIsAddMotorOpen(false);
      setNewMotorCode('');
      setNewMotorName('');
      setNewMotorKw('');
      setNewMotorRatedAmps('');
      setNewMotorLoadAmps('');
      setNewMotorOverloadAmps('');
    } finally {
      setSavingNewMotor(false);
    }
  };

  const stateBadgeClass = (state: BreakerOperatingState) => {
    switch (state) {
      case 'CLOSED':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'OPEN':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'TRIPPED':
        return 'bg-red-100 text-red-900 border-red-300 animate-pulse';
      case 'DECOMMISSIONED':
        return 'bg-slate-200 text-slate-600 border-slate-300';
    }
  };

  return (
    <div className="bg-slate-50 min-h-[750px] flex flex-col text-slate-900">
      {/* Top Breadcrumb & Action Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center flex-wrap gap-1.5 text-xs">
              <button
                onClick={onBackToOverview}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition cursor-pointer border border-slate-300"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to 1-Page Power Diagram</span>
              </button>

              {upstreamChain.length > 0 && (
                <div className="flex items-center flex-wrap gap-1 text-slate-500 font-mono text-[11px] ml-1">
                  {upstreamChain.map((ancestor, idx) => (
                    <React.Fragment key={ancestor.id}>
                      {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                      <button
                        onClick={() => onNavigateToNode(ancestor.id)}
                        className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                          ancestor.id === node.id
                            ? 'bg-amber-100 text-amber-950 font-bold border border-amber-300'
                            : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        {ancestor.code}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center flex-wrap gap-2.5 pt-1">
              <span className="font-mono text-sm font-black px-2.5 py-0.5 rounded bg-slate-900 text-white">
                {node.code}
              </span>
              <h2 className="text-xl font-bold text-slate-900">{node.name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${stateBadgeClass(node.operatingState)}`}>
                {node.operatingState}
              </span>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {node.voltage} • {node.location}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {node.operatingState !== 'DECOMMISSIONED' && (
              <button
                onClick={handleQuickToggleBreakerState}
                className={`px-3 py-1.5 rounded-md text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                  node.operatingState === 'CLOSED'
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}
              >
                {node.operatingState === 'CLOSED' ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Open / Isolate {node.code}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Close / Energize {node.code}</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={openNodeEdit}
              className="px-3.5 py-1.5 rounded-md bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Breaker / Specs</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5 flex-1">
        {/* Safety & Interlock Watchdog Alerts */}
        {nodeHazards.map((hz) => (
          <div
            key={hz.id}
            className={`p-4 rounded-xl border-2 flex items-start gap-3 shadow-xs ${
              hz.severity === 'CRITICAL'
                ? 'bg-red-50 border-red-500 text-red-950'
                : hz.severity === 'HIGH'
                ? 'bg-amber-50 border-amber-500 text-amber-950'
                : 'bg-slate-100 border-slate-300 text-slate-800'
            }`}
          >
            <ShieldAlert
              className={`w-6 h-6 shrink-0 mt-0.5 ${
                hz.severity === 'CRITICAL'
                  ? 'text-red-600 animate-pulse'
                  : hz.severity === 'HIGH'
                  ? 'text-amber-600'
                  : 'text-slate-600'
              }`}
            />
            <div className="flex-1 text-xs space-y-1">
              <div className="font-extrabold text-sm">{hz.title}</div>
              <p className="leading-relaxed">{hz.message}</p>
              <div className="font-mono text-[11px] font-bold pt-1">
                REQUIRED ACTION: {hz.actionRequired}
              </div>
            </div>
          </div>
        ))}

        {/* 4-Column Engineering Telemetry & Breaker Nameplate Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Switchgear Brand, Type & Size */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Switchgear Nameplate
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {node.breakerType}
              </span>
            </div>
            <div>
              <div className={`text-base font-bold ${node.brand === 'Unrecorded' ? 'text-amber-700' : 'text-slate-900'}`}>
                {node.brand}
              </div>
              <div className="text-xs font-mono text-slate-600">{node.model}</div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">Rated Size:</span>
              <span className={`font-bold ${node.ratedAmps ? 'text-slate-900' : 'text-amber-600'}`}>
                {node.ratedAmps ? `${node.ratedAmps} A` : 'Unrecorded (Edit)'}
              </span>
            </div>
            {node.frameSize && (
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Frame / Trip:</span>
                <span>{node.frameSize}{node.tripSettingAmps ? ` / ${node.tripSettingAmps}A` : ''}</span>
              </div>
            )}
          </div>

          {/* Card 2: Electrical Load (Amps & Utilization) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Electrical Load (Amps)
              </span>
              <Gauge className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-amber-700">
                {loadMetrics.effectiveDisplayAmps} A
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {loadMetrics.isMeasuredOverride ? '(Measured Clamp)' : '(Auto Sum Running)'}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-600 flex items-center justify-between">
              <span>Connected FLC Sum:</span>
              <span className="font-semibold">{loadMetrics.connectedRatedAmps} A</span>
            </div>
            {loadMetrics.utilizationPct !== null && (
              <div className="pt-1">
                <div className="flex justify-between text-[10px] font-mono mb-1">
                  <span className="text-slate-500">Breaker Utilization</span>
                  <span className={`font-bold ${loadMetrics.utilizationPct >= 85 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {loadMetrics.utilizationPct}% of {node.ratedAmps}A
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      loadMetrics.utilizationPct >= 85 ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, loadMetrics.utilizationPct)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Branch Power & Connected Asset Health */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Downstream Assets & Power
              </span>
              <Activity className="w-4 h-4 text-[#714B67]" />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-black font-mono text-slate-900">
                {loadMetrics.equipmentCount}
              </span>
              <span className="text-xs text-slate-600 font-medium">Motors / Pumps</span>
            </div>
            <div className="text-xs font-mono text-purple-900 font-bold">
              {loadMetrics.totalKw} kW Total Connected
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-emerald-700 font-semibold">{loadMetrics.operationalCount} Operational</span>
              {loadMetrics.maintenanceCount > 0 ? (
                <span className="text-red-600 font-bold">{loadMetrics.maintenanceCount} Under Maint.</span>
              ) : (
                <span className="text-slate-400">0 Breakdowns</span>
              )}
            </div>
          </div>

          {/* Card 4: LOTO Safety & Source Ratings */}
          <div className="bg-red-50/70 rounded-xl border border-red-200 p-4 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-800">
                LOTO Isolation Protocol
              </span>
              <ShieldAlert className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-[11px] font-mono text-red-950 leading-relaxed">
              {node.lotoIsolationProcedure}
            </p>
            {(node.kva || node.powerMw) && (
              <div className="pt-1.5 border-t border-red-200/70 text-[11px] font-mono text-red-900 font-bold">
                Rating: {node.kva ? `${node.kva} kVA` : ''}{node.powerMw ? ` • ${node.powerMw} MW` : ''}
                {node.primaryAmps ? ` • ${node.primaryAmps}${node.secondaryAmps ? `/${node.secondaryAmps}` : ''} A` : ''}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs: Connected Equipment/Branches vs Node Revision History */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('downstream')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'downstream'
                    ? 'bg-[#714B67] text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {childNodes.length > 0
                  ? `Downstream Breakers (${childNodes.length}) & Motors (${loadMetrics.equipmentCount})`
                  : `Connected Branch Motors & Pumps (${loadMetrics.equipmentCount})`}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-[#714B67] text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Component Audit History ({node.modificationHistory?.length || 0})</span>
              </button>
            </div>

            {node.feederPanelId && onCreateEquipment && (
              <button
                onClick={() => setIsAddMotorOpen(true)}
                className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Motor / Pump to {node.code}</span>
              </button>
            )}
          </div>

          {activeTab === 'downstream' && (
            <div className="p-5 space-y-5">
              {/* Downstream Sub-Breakers Grid (if parent node like C4, C5, C6, C12, BUS_11KV) */}
              {childNodes.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Direct Downstream Breakers / Switchgear
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {childNodes.map((child) => {
                      const childMetrics = computeNodeLoadMetrics(child, allNodes, equipmentList);
                      return (
                        <button
                          key={child.id}
                          onClick={() => onNavigateToNode(child.id)}
                          className="text-left p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-[#714B67] hover:shadow-xs transition cursor-pointer space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white">
                              {child.code}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${stateBadgeClass(child.operatingState)}`}>
                              {child.operatingState}
                            </span>
                          </div>
                          <div className="font-bold text-xs text-slate-900 truncate">{child.name}</div>
                          <div className="text-[11px] font-mono text-slate-500 truncate">
                            {child.brand} {child.model !== 'Nameplate Unrecorded' ? `• ${child.model}` : ''}
                          </div>
                          <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono">
                            <span className="font-bold text-amber-700">{childMetrics.effectiveDisplayAmps} A</span>
                            <span className="text-slate-600">{childMetrics.equipmentCount} Motors</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Connected Plant Motors Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Connected Equipment Roster ({loadMetrics.equipmentCount})
                </h4>

                {loadMetrics.connectedEquipment.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 space-y-2">
                    <Zap className="w-7 h-7 text-amber-500 mx-auto" />
                    <div className="text-sm font-bold text-slate-700">
                      No motors currently assigned to {node.name} ({node.code})
                    </div>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {node.id === 'C17'
                        ? 'New Water Treatment Plant (C17 on Tx3) is ready for your incoming electrical plant checklist motors. Use "Add Motor / Pump to C17" above or reassign pumps from other panels.'
                        : 'Click "Add Motor / Pump" above to register equipment on this feeder breaker.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Asset Tag</th>
                          <th className="py-2.5 px-3">Machine / Motor</th>
                          <th className="py-2.5 px-3 text-right">Power</th>
                          <th className="py-2.5 px-3">Starter</th>
                          <th className="py-2.5 px-3 text-right">Rated (A)</th>
                          <th className="py-2.5 px-3 text-right">Load (A)</th>
                          <th className="py-2.5 px-3 text-right">O/L (A)</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {loadMetrics.connectedEquipment.map((eq) => {
                          const openJCs = jobCards.filter(
                            c =>
                              (c.equipmentId === eq.id || c.equipmentName?.toLowerCase() === eq.name?.toLowerCase()) &&
                              c.status !== 'Completed' &&
                              c.status !== 'Cancelled'
                          ).length;

                          return (
                            <tr key={eq.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                {eq.code}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900">{eq.name}</div>
                                <div className="text-[11px] text-slate-500">{eq.location}</div>
                                {openJCs > 0 && (
                                  <span className="text-[10px] font-bold text-red-600">
                                    ⚠️ {openJCs} Open Job Card{openJCs > 1 ? 's' : ''}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-900">
                                {eq.powerKw ? `${eq.powerKw} kW` : '—'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-mono text-[10px] font-bold">
                                  {eq.starterType || 'DOL'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                {eq.ratedCurrentAmps ? `${eq.ratedCurrentAmps} A` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                                {eq.loadCurrentAmps ? `${eq.loadCurrentAmps} A` : (eq.ratedCurrentAmps ? `${eq.ratedCurrentAmps} A` : '—')}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                {eq.overloadAmps ? `${eq.overloadAmps} A` : '—'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    eq.status === 'Under Maintenance'
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : eq.status === 'Operational'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {eq.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {onInspectEquipment && (
                                    <button
                                      onClick={() => onInspectEquipment(eq)}
                                      className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                                      title="Full Asset Details & Work Orders"
                                    >
                                      <Info className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {onModifyEquipment && (
                                    <button
                                      onClick={() => openMotorEdit(eq)}
                                      className="px-2 py-1 rounded border border-slate-200 text-slate-700 hover:text-[#714B67] hover:border-[#714B67] hover:bg-purple-50 text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                                      title="Edit Motor Specs or Move to Another Breaker"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>Edit / Move</span>
                                    </button>
                                  )}
                                  {onNewJobCardForEquipment && (
                                    <button
                                      onClick={() => onNewJobCardForEquipment(eq)}
                                      className="px-2 py-1 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                                    >
                                      <Wrench className="w-3 h-3" />
                                      <span>JC</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-5 space-y-2.5">
              {(!node.modificationHistory || node.modificationHistory.length === 0) ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                  No field modifications logged yet on {node.code}. Every switchgear edit (brand, frame size, load reading, or state change) is permanently audited here.
                </div>
              ) : (
                node.modificationHistory.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{log.summary}</span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-slate-700">Reason: {log.reason}</div>
                    <div className="text-[11px] font-mono text-slate-500">Modified by: {log.modifiedBy}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* EDIT NODE / CIRCUIT BREAKER MODAL */}
      {isEditingNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden my-auto">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm">Edit Electrical Component: {node.code} — {node.name}</span>
              </div>
              <button onClick={() => setIsEditingNode(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleNodeEditSubmit} className="p-5 space-y-3.5 text-xs bg-slate-50 max-h-[82vh] overflow-y-auto">
              {editError && (
                <div className="p-2.5 rounded bg-red-50 border border-red-300 text-red-800 font-semibold">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Component / Panel Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Operating State *</label>
                  <select
                    value={editState}
                    onChange={(e) => setEditState(e.target.value as BreakerOperatingState)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                  >
                    <option value="CLOSED">CLOSED (Energized / On)</option>
                    <option value="OPEN">OPEN (Isolated / Standby)</option>
                    <option value="TRIPPED">TRIPPED (Fault Trip)</option>
                    <option value="DECOMMISSIONED">DECOMMISSIONED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Breaker Brand / Make</label>
                  <input
                    type="text"
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    placeholder="e.g. Chint, ABB, Schneider"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Model / Series</label>
                  <input
                    type="text"
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                    placeholder="e.g. NA1-3200, NSX400"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Breaker Type</label>
                  <select
                    value={editBreakerType}
                    onChange={(e) => setEditBreakerType(e.target.value as BreakerType)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="ACB">ACB (Air Circuit Breaker)</option>
                    <option value="VCB">VCB (Vacuum Circuit Breaker)</option>
                    <option value="MCCB">MCCB (Moulded Case)</option>
                    <option value="MCB">MCB (Miniature)</option>
                    <option value="Fused Switch-Disconnector">Fused Switch-Disconnector</option>
                    <option value="Unrecorded">Unrecorded</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rated Size (Amps)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editRatedAmps}
                    onChange={(e) => setEditRatedAmps(e.target.value)}
                    placeholder="e.g. 630"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Frame Size</label>
                  <input
                    type="text"
                    value={editFrameSize}
                    onChange={(e) => setEditFrameSize(e.target.value)}
                    placeholder="e.g. 800A Frame"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trip Setting (A)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editTripAmps}
                    onChange={(e) => setEditTripAmps(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-amber-800 mb-1">Measured Amps Override</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editMeasuredAmps}
                    onChange={(e) => setEditMeasuredAmps(e.target.value)}
                    placeholder="Blank = Auto Sum"
                    className="w-full px-2.5 py-1.5 border border-amber-300 rounded bg-amber-50/40 font-mono"
                  />
                </div>
              </div>

              {(node.category === 'SOURCE' || node.category === 'TRANSFORMER' || node.category === 'STEP_UP_TX') && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Capacity (kVA)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editKva}
                      onChange={(e) => setEditKva(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Power (MW)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editPowerMw}
                      onChange={(e) => setEditPowerMw(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Primary (A)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editPrimaryAmps}
                      onChange={(e) => setEditPrimaryAmps(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Secondary (A)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editSecondaryAmps}
                      onChange={(e) => setEditSecondaryAmps(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Voltage Rating</label>
                  <input
                    type="text"
                    value={editVoltage}
                    onChange={(e) => setEditVoltage(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Physical Panel Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>

              {(node.id === 'C4' || node.id === 'C7' || node.interlockStatus !== 'NOT_APPLICABLE') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <div>
                    <label className="block font-bold text-amber-900 mb-1">Changeover Interlock Status</label>
                    <select
                      value={editInterlockStatus}
                      onChange={(e) => setEditInterlockStatus(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 border border-amber-300 rounded bg-white font-semibold"
                    >
                      <option value="NONE_HAZARD">NO INTERLOCK (Flagged Safety Hazard)</option>
                      <option value="INTERLOCKED">INTERLOCKED (Hardware Verified)</option>
                      <option value="NOT_APPLICABLE">Not Applicable</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-amber-900 mb-1">Interlock Hazard Warning Note</label>
                    <input
                      type="text"
                      value={editInterlockNote}
                      onChange={(e) => setEditInterlockNote(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-amber-300 rounded bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-red-800 mb-1">Mandatory LOTO Isolation Procedure</label>
                <textarea
                  rows={2}
                  value={editLoto}
                  onChange={(e) => setEditLoto(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-red-200 rounded bg-white font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Modified By *</label>
                  <input
                    type="text"
                    required
                    value={editModifiedBy}
                    onChange={(e) => setEditModifiedBy(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Engineering Reason *</label>
                  <input
                    type="text"
                    required
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="e.g. Recorded MCCB nameplate from panel door"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingNode(false)}
                  className="px-3.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNode}
                  className="px-4 py-1.5 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savingNode ? 'Saving...' : 'Save to SLD Registry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CRITICAL INTERLOCK DANGER CONFIRMATION MODAL (C4 <-> C7) */}
      {pendingDangerStateConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-red-950/75 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border-4 border-red-600 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-10 h-10 text-red-600 shrink-0 animate-bounce" />
              <div>
                <h3 className="text-base font-black text-red-900">
                  DANGER: UN-INTERLOCKED SIMULTANEOUS BREAKER CLOSURE!
                </h3>
                <p className="text-xs text-red-800 mt-1 leading-relaxed">
                  <strong>{pendingDangerStateConfirm.partnerNode.code} ({pendingDangerStateConfirm.partnerNode.name})</strong> is currently <strong>CLOSED</strong> on the same Tx1 400V Main Control Centre Busbar, and there is <strong>NO mechanical/electrical interlock</strong> between C4 and C7.
                </p>
                <p className="text-xs font-bold text-red-900 mt-2 bg-red-50 p-2.5 rounded border border-red-200">
                  Closing {node.code} while {pendingDangerStateConfirm.partnerNode.code} is closed will parallel Tx1 (1600 kVA) with the 680 kVA Gen Set out-of-phase, risking catastrophic equipment damage and arc-flash injury.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPendingDangerStateConfirm(null)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                Abort — Keep {node.code} OPEN (Safe)
              </button>
              <button
                onClick={() => {
                  if (isEditingNode) {
                    commitNodeSave('CLOSED');
                  } else {
                    onUpdatePowerNode(
                      node,
                      { operatingState: 'CLOSED' },
                      {
                        modifiedBy: currentUserName,
                        summary: `HAZARD OVERRIDE: Forced ${node.code} CLOSED while ${pendingDangerStateConfirm.partnerNode.code} CLOSED`,
                        reason: 'Manual override confirmed past non-interlocked busbar warning'
                      }
                    ).then(() => setPendingDangerStateConfirm(null));
                  }
                }}
                className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
              >
                Log Danger State Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOTOR QUICK EDIT & BREAKER REASSIGNMENT MODAL */}
      {motorToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden">
            <div className="bg-[#714B67] text-white px-5 py-3 flex items-center justify-between">
              <span className="font-bold text-sm">Edit Motor / Reassign Feeder Breaker ({motorToEdit.code})</span>
              <button onClick={() => setMotorToEdit(null)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMotorEdit} className="p-5 space-y-3 text-xs bg-slate-50">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motor / Equipment Name *</label>
                <input
                  type="text"
                  required
                  value={motorEditName}
                  onChange={(e) => setMotorEditName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <label className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Assigned Power Distribution Branch / Breaker</span>
                </label>
                <select
                  value={motorEditFeederPanel}
                  onChange={(e) => setMotorEditFeederPanel(e.target.value as FeederPanelId)}
                  className="w-full px-2.5 py-1.5 border border-amber-300 rounded bg-white font-semibold"
                >
                  {FEEDER_PANELS.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.breakerCode} — {p.name} ({p.transformerSource})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Power (kW)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={motorEditPowerKw}
                    onChange={(e) => setMotorEditPowerKw(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rated (A)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={motorEditRatedAmps}
                    onChange={(e) => setMotorEditRatedAmps(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-amber-800 mb-1">Load (A)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={motorEditLoadAmps}
                    onChange={(e) => setMotorEditLoadAmps(e.target.value)}
                    className="w-full px-2 py-1.5 border border-amber-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">O/L (A)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={motorEditOverloadAmps}
                    onChange={(e) => setMotorEditOverloadAmps(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Starter Type</label>
                  <select
                    value={motorEditStarter}
                    onChange={(e) => setMotorEditStarter(e.target.value as StarterType)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="DOL">DOL</option>
                    <option value="Y/D">Y/D (Star-Delta)</option>
                    <option value="VSD">VSD</option>
                    <option value="SOFT STARTER">SOFT STARTER</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={motorEditStatus}
                    onChange={(e) => setMotorEditStatus(e.target.value as EquipmentStatus)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="Operational">Operational</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Standby">Standby</option>
                    <option value="Decommissioned">Decommissioned</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Change</label>
                <input
                  type="text"
                  value={motorEditReason}
                  onChange={(e) => setMotorEditReason(e.target.value)}
                  placeholder="e.g. Updated clamp load reading or moved to C17 New WTP"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMotorToEdit(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 bg-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMotor}
                  className="px-4 py-1.5 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white font-bold cursor-pointer"
                >
                  {savingMotor ? 'Saving...' : 'Save Motor Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW MOTOR TO BRANCH MODAL */}
      {isAddMotorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden">
            <div className="bg-emerald-700 text-white px-5 py-3 flex items-center justify-between">
              <span className="font-bold text-sm">Add Motor / Pump to {node.code} ({node.name})</span>
              <button onClick={() => setIsAddMotorOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMotorToBranch} className="p-5 space-y-3 text-xs bg-slate-50">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Asset Code *</label>
                  <input
                    type="text"
                    required
                    value={newMotorCode}
                    onChange={(e) => setNewMotorCode(e.target.value)}
                    placeholder="e.g. EQ-NWTP-RO-P1"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Starter Type</label>
                  <select
                    value={newMotorStarter}
                    onChange={(e) => setNewMotorStarter(e.target.value as StarterType)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="DOL">DOL</option>
                    <option value="Y/D">Y/D (Star-Delta)</option>
                    <option value="VSD">VSD</option>
                    <option value="SOFT STARTER">SOFT STARTER</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motor / Pump Description *</label>
                <input
                  type="text"
                  required
                  value={newMotorName}
                  onChange={(e) => setNewMotorName(e.target.value)}
                  placeholder="e.g. New WTP High Pressure Feed Pump 1"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">kW</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMotorKw}
                    onChange={(e) => setNewMotorKw(e.target.value)}
                    placeholder="15"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rated (A)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMotorRatedAmps}
                    onChange={(e) => setNewMotorRatedAmps(e.target.value)}
                    placeholder="28.8"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Load (A)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMotorLoadAmps}
                    onChange={(e) => setNewMotorLoadAmps(e.target.value)}
                    placeholder="26"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">O/L (A)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMotorOverloadAmps}
                    onChange={(e) => setNewMotorOverloadAmps(e.target.value)}
                    placeholder="27"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMotorOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 bg-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewMotor}
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  {savingNewMotor ? 'Adding...' : 'Register on Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
