import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Cable,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Edit3,
  ExternalLink,
  Gauge,
  GitBranch,
  Layers,
  Lock,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Wrench,
  X
} from 'lucide-react';
import {
  ElectricalMeasurement,
  Equipment,
  EquipmentModificationLog,
  EquipmentStatus,
  FeederPanelId,
  JobCard,
  LoadDataSource,
  PlantArea,
  PowerConnection,
  PowerDistributionNode,
  PowerEdgeRole,
  PowerVoltageTier,
  StarterType,
  UserProfile
} from '../../../types';
import {
  ElectricalHazardAlert,
  FEEDER_PANELS,
  computeNodeLoadMetrics,
  getLogicalMccGroupForNode,
  getUpstreamChain
} from '../../../core/master-data/powerDistributionData';
import {
  SolvedTopologyResult,
  getDirectChildNodeIds,
  getDirectParentNodeIds
} from '../../../core/electrical/topologySolver';
import {
  CreateElectricalMeasurementInput,
  resolveNominalNodeVoltageV
} from '../../../core/electrical/loadCalculations';
import {
  canEditEquipmentInspectionOnly,
  isAuthorizedElectricalEngineer,
  validateSafeEquipmentDelete
} from '../../../core/electrical/permissions';
import {
  BusbarSymbol,
  CircuitBreakerSymbol,
  ElectricalLoadSymbol,
  StarterSymbol
} from './ElectricalSymbols';
import { AssetConditionSummary } from '../../../core/electrical/inspections';
import { ConditionBadge } from './ConditionBadge';
import { LogMeasurementModal } from './LogMeasurementModal';

interface HierarchicalBranchPanelProps {
  node: PowerDistributionNode;
  allNodes: PowerDistributionNode[];
  powerConnections: PowerConnection[];
  electricalMeasurements?: ElectricalMeasurement[];
  solved: SolvedTopologyResult;
  equipmentList: Equipment[];
  jobCards: JobCard[];
  hazards: ElectricalHazardAlert[];
  currentUserName: string;
  userRole?: UserProfile['role'] | null;
  userEmail?: string | null;
  onSelectHierarchyNode: (nodeId: string) => void;
  onSelectInspectorNode: (nodeId: string) => void;
  onCloseHierarchy: () => void;
  onOpenFullBranchWorkspace: (nodeId: string) => void;
  onCreateEquipment?: (data: any) => Promise<void>;
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
  onInspectUpdateEquipment?: (
    equipment: Equipment,
    inspection: {
      loadCurrentAmps?: number;
      status?: EquipmentStatus;
      notes?: string;
    },
    audit: {
      inspectedBy: string;
      reason: string;
    }
  ) => Promise<void>;
  onDeleteEquipment?: (equipment: Equipment) => Promise<void>;
  onCreatePowerConnection?: (candidate: {
    sourceNodeId: string;
    targetNodeId: string;
    voltageTier: PowerVoltageTier;
    edgeRole: PowerEdgeRole;
    label?: string;
    reason: string;
    createdBy: string;
  }) => Promise<void>;
  onDeletePowerConnection?: (connectionId: string) => Promise<void>;
  onRecordElectricalMeasurement?: (
    input: Omit<CreateElectricalMeasurementInput, 'recordedByUid'> & {
      targetNode?: PowerDistributionNode;
    }
  ) => Promise<void>;
  onNewJobCardForEquipment?: (equipment: Equipment) => void;
  conditionSummaries?: Map<string, AssetConditionSummary>;
  onOpenNodeCondition?: (nodeId: string) => void;
  onOpenEquipmentCondition?: (equipment: Equipment) => void;
}

function sourceTagClass(source?: LoadDataSource | null): string {
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

function getPanelAreaAndDepartment(
  panelId: FeederPanelId
): { plantArea: PlantArea; department: string } {
  switch (panelId) {
    case 'MCC 1':
      return { plantArea: 'Distillation', department: 'Production - Distillation Columns' };
    case 'Boiler 2':
      return { plantArea: 'Boiler 2', department: 'Utilities - Boiler House' };
    case 'MCC 4':
      return { plantArea: 'Fermentation', department: 'Production - Fermentation Bay' };
    case 'MCC 2':
      return { plantArea: 'Universal', department: 'Engineering - Electrical & Instrumentation' };
    case 'Old Water Treatment Plant':
    case 'New Water Treatment Plant':
      return { plantArea: 'Water Treatment', department: 'Utilities - Water Treatment' };
    case 'Batch Plant':
      return { plantArea: 'CMS/Molasses Tank', department: 'Logistics - Raw Material Receiving' };
    case 'Dam 1 (slops)':
      return { plantArea: 'Molasses Dam 1', department: 'Utilities - Effluent Plant' };
    case 'Boiler 1':
      return { plantArea: 'Boiler 1', department: 'Utilities - Boiler House' };
    case 'MCC 3':
      return { plantArea: 'Cooling Towers', department: 'Engineering - General Plant Maintenance' };
    case 'Sub DB1 Compressors':
      return { plantArea: 'Universal', department: 'Engineering - Mechanical Maintenance' };
    case 'Boiler 3':
      return { plantArea: 'Boiler 3', department: 'Utilities - Boiler House' };
    default:
      return { plantArea: 'Universal', department: 'Engineering - Electrical & Instrumentation' };
  }
}

export const HierarchicalBranchPanel: React.FC<HierarchicalBranchPanelProps> = ({
  node,
  allNodes,
  powerConnections,
  electricalMeasurements = [],
  solved,
  equipmentList,
  jobCards,
  hazards,
  currentUserName,
  userRole,
  userEmail,
  onSelectHierarchyNode,
  onSelectInspectorNode,
  onCloseHierarchy,
  onOpenFullBranchWorkspace,
  onCreateEquipment,
  onModifyEquipment,
  onInspectUpdateEquipment,
  onDeleteEquipment,
  onCreatePowerConnection,
  onDeletePowerConnection,
  onRecordElectricalMeasurement,
  onNewJobCardForEquipment,
  conditionSummaries,
  onOpenNodeCondition,
  onOpenEquipmentCondition
}) => {
  const isEngineer = isAuthorizedElectricalEngineer(userRole, userEmail);
  const canInspect = canEditEquipmentInspectionOnly(userRole) || isEngineer;

  const [branchSearch, setBranchSearch] = useState('');
  const [starterFilter, setStarterFilter] = useState<string>('ALL');
  const [conditionFilter, setConditionFilter] = useState<
    'ALL' | 'OPERATIONAL' | 'MAINTENANCE' | 'STANDBY' | 'OPEN_JC'
  >('ALL');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [showMeasurementHistory, setShowMeasurementHistory] = useState(false);
  const [measurementTarget, setMeasurementTarget] = useState<{
    assetId: string;
    assetKind: 'POWER_NODE' | 'EQUIPMENT';
    assetCode: string;
    assetName: string;
    nominalVoltageV: number;
    targetNode?: PowerDistributionNode;
  } | null>(null);

  // Engineer Equipment Registration modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regCode, setRegCode] = useState('');
  const [regName, setRegName] = useState('');
  const [regKw, setRegKw] = useState('');
  const [regRatedAmps, setRegRatedAmps] = useState('');
  const [regLoadAmps, setRegLoadAmps] = useState('');
  const [regOverloadAmps, setRegOverloadAmps] = useState('');
  const [regStarter, setRegStarter] = useState<StarterType>('DOL');
  const [regSaving, setRegSaving] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Inline Selected Equipment Actions (Inspection vs Engineer Edit)
  const [activeEqAction, setActiveEqAction] = useState<'NONE' | 'INSPECT' | 'EDIT'>('NONE');
  const [inspLoadAmps, setInspLoadAmps] = useState('');
  const [inspStatus, setInspStatus] = useState<EquipmentStatus>('Operational');
  const [inspNotes, setInspNotes] = useState('');
  const [inspReason, setInspReason] = useState('');

  const [editEqCode, setEditEqCode] = useState('');
  const [editEqName, setEditEqName] = useState('');
  const [editEqKw, setEditEqKw] = useState('');
  const [editEqRatedAmps, setEditEqRatedAmps] = useState('');
  const [editEqLoadAmps, setEditEqLoadAmps] = useState('');
  const [editEqOverloadAmps, setEditEqOverloadAmps] = useState('');
  const [editEqStarter, setEditEqStarter] = useState<StarterType>('DOL');
  const [editEqStatus, setEditEqStatus] = useState<EquipmentStatus>('Operational');
  const [editEqFeederPanel, setEditEqFeederPanel] = useState<FeederPanelId>(
    node.feederPanelId || 'MCC 1'
  );
  const [editEqReason, setEditEqReason] = useState('');
  const [eqActionBusy, setEqActionBusy] = useState(false);
  const [eqActionError, setEqActionError] = useState<string | null>(null);
  const [eqActionSuccess, setEqActionSuccess] = useState<string | null>(null);

  // Multi-source & custom connection form
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [connDirection, setConnDirection] = useState<'INCOMING' | 'OUTGOING'>('INCOMING');
  const [connPartnerId, setConnPartnerId] = useState('');
  const [connRole, setConnRole] = useState<PowerEdgeRole>('STANDBY_FEED');
  const [connTier, setConnTier] = useState<PowerVoltageTier>('400V');
  const [connLabel, setConnLabel] = useState('');
  const [connReason, setConnReason] = useState('');
  const [connBusy, setConnBusy] = useState(false);
  const [connError, setConnError] = useState<string | null>(null);

  useEffect(() => {
    setBranchSearch('');
    setStarterFilter('ALL');
    setConditionFilter('ALL');
    setSelectedEquipmentId(null);
    setActiveEqAction('NONE');
    setEqActionError(null);
    setEqActionSuccess(null);
    setConnError(null);
    setRegError(null);
    setMeasurementTarget(null);
  }, [node.id]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, PowerDistributionNode>();
    allNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [allNodes]);

  const upstreamChain = useMemo(
    () => getUpstreamChain(node.id, allNodes, powerConnections),
    [node.id, allNodes, powerConnections]
  );

  const parentNodeIds = useMemo(
    () => getDirectParentNodeIds(node.id, solved.edges),
    [node.id, solved.edges]
  );

  const directParentNode = useMemo(() => {
    if (node.parentNodeId && nodeMap.has(node.parentNodeId) && node.id !== 'GEN_SET') {
      return nodeMap.get(node.parentNodeId) || null;
    }
    const firstParentId = parentNodeIds[0];
    return firstParentId ? nodeMap.get(firstParentId) || null : null;
  }, [node, nodeMap, parentNodeIds]);

  const directChildNodes = useMemo(() => {
    const childIds = getDirectChildNodeIds(node.id, solved.edges);
    return childIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is PowerDistributionNode => Boolean(n));
  }, [node.id, solved.edges, nodeMap]);

  const loadMetrics = useMemo(
    () =>
      computeNodeLoadMetrics(
        node,
        allNodes,
        equipmentList,
        jobCards,
        powerConnections,
        electricalMeasurements
      ),
    [node, allNodes, equipmentList, jobCards, powerConnections, electricalMeasurements]
  );

  const branchMeasurements = useMemo(() => {
    const eqIds = new Set(loadMetrics.connectedEquipment.map((e) => e.id));
    return electricalMeasurements.filter(
      (m) => m.assetId === node.id || eqIds.has(m.assetId)
    );
  }, [electricalMeasurements, node.id, loadMetrics.connectedEquipment]);

  const logicalGroup = useMemo(() => getLogicalMccGroupForNode(node.id), [node.id]);
  const nodeSolved = solved.nodeStates.get(node.id);
  const energization = nodeSolved?.energization || 'DE_ENERGIZED';

  const openJobCards = useMemo(
    () => jobCards.filter((jc) => jc.status !== 'Completed' && jc.status !== 'Cancelled'),
    [jobCards]
  );

  const getOpenJobCardsForEquipment = (eq: Equipment): JobCard[] =>
    openJobCards.filter(
      (jc) =>
        jc.equipmentId === eq.id ||
        (jc.equipmentName && eq.name && jc.equipmentName.toLowerCase() === eq.name.toLowerCase())
    );

  const filteredEquipment = useMemo(() => {
    const q = branchSearch.trim().toLowerCase();
    return loadMetrics.connectedEquipment.filter((eq) => {
      if (starterFilter !== 'ALL' && (eq.starterType || 'DOL') !== starterFilter) {
        return false;
      }
      if (conditionFilter === 'OPERATIONAL' && eq.status !== 'Operational') return false;
      if (conditionFilter === 'MAINTENANCE' && eq.status !== 'Under Maintenance') return false;
      if (conditionFilter === 'STANDBY' && eq.status !== 'Standby') return false;
      if (conditionFilter === 'OPEN_JC' && getOpenJobCardsForEquipment(eq).length === 0) {
        return false;
      }
      if (q) {
        const hit =
          eq.code.toLowerCase().includes(q) ||
          eq.name.toLowerCase().includes(q) ||
          (eq.location && eq.location.toLowerCase().includes(q)) ||
          (eq.plantArea && eq.plantArea.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [loadMetrics.connectedEquipment, branchSearch, starterFilter, conditionFilter, openJobCards]);

  const selectedEquipment = useMemo(
    () =>
      selectedEquipmentId
        ? equipmentList.find((e) => e.id === selectedEquipmentId) || null
        : null,
    [selectedEquipmentId, equipmentList]
  );

  const selectedEquipmentJobCards = useMemo(() => {
    if (!selectedEquipment) return [];
    return jobCards.filter(
      (jc) =>
        jc.equipmentId === selectedEquipment.id ||
        (jc.equipmentName &&
          selectedEquipment.name &&
          jc.equipmentName.toLowerCase() === selectedEquipment.name.toLowerCase())
    );
  }, [selectedEquipment, jobCards]);

  const nodeHazards = useMemo(
    () => hazards.filter((h) => h.affectedNodeIds.includes(node.id)),
    [hazards, node.id]
  );

  const touchingConnections = useMemo(() => {
    const incoming = solved.edges.filter((e) => e.target === node.id);
    const outgoing = solved.edges.filter((e) => e.source === node.id);
    return { incoming, outgoing };
  }, [solved.edges, node.id]);

  const startInspectEquipment = (eq: Equipment) => {
    setSelectedEquipmentId(eq.id);
    setInspLoadAmps(eq.loadCurrentAmps != null ? String(eq.loadCurrentAmps) : '');
    setInspStatus(eq.status);
    setInspNotes(eq.notes || '');
    setInspReason('');
    setEqActionError(null);
    setEqActionSuccess(null);
    setActiveEqAction('INSPECT');
  };

  const startEngineerEditEquipment = (eq: Equipment) => {
    setSelectedEquipmentId(eq.id);
    setEditEqCode(eq.code);
    setEditEqName(eq.name);
    setEditEqKw(eq.powerKw != null ? String(eq.powerKw) : '');
    setEditEqRatedAmps(eq.ratedCurrentAmps != null ? String(eq.ratedCurrentAmps) : '');
    setEditEqLoadAmps(eq.loadCurrentAmps != null ? String(eq.loadCurrentAmps) : '');
    setEditEqOverloadAmps(eq.overloadAmps != null ? String(eq.overloadAmps) : '');
    setEditEqStarter(eq.starterType || 'DOL');
    setEditEqStatus(eq.status);
    setEditEqFeederPanel((eq.feederPanel as FeederPanelId) || node.feederPanelId || 'MCC 1');
    setEditEqReason('');
    setEqActionError(null);
    setEqActionSuccess(null);
    setActiveEqAction('EDIT');
  };

  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment || !onInspectUpdateEquipment) return;
    setEqActionBusy(true);
    setEqActionError(null);
    setEqActionSuccess(null);
    try {
      await onInspectUpdateEquipment(
        selectedEquipment,
        {
          loadCurrentAmps: inspLoadAmps.trim() ? parseFloat(inspLoadAmps) : undefined,
          status: inspStatus,
          notes: inspNotes.trim()
        },
        {
          inspectedBy: currentUserName,
          reason: inspReason.trim() || `Branch inspection on ${node.code}`
        }
      );
      setActiveEqAction('NONE');
      setEqActionSuccess(`Inspection recorded on ${selectedEquipment.code}.`);
    } catch (err: any) {
      setEqActionError(err.message || 'Failed to update inspection fields.');
    } finally {
      setEqActionBusy(false);
    }
  };

  const handleSubmitEngineerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment || !onModifyEquipment) return;
    if (!isEngineer) {
      setEqActionError('Unauthorized: only Electrical Engineers / Supervisors may modify asset specs or feeder links.');
      return;
    }
    setEqActionBusy(true);
    setEqActionError(null);
    setEqActionSuccess(null);
    try {
      const targetPanelMeta = FEEDER_PANELS.find((p) => p.id === editEqFeederPanel);
      const updates: Partial<Equipment> = {
        code: editEqCode.trim().toUpperCase(),
        name: editEqName.trim(),
        powerKw: editEqKw ? parseFloat(editEqKw) : undefined,
        ratedCurrentAmps: editEqRatedAmps ? parseFloat(editEqRatedAmps) : undefined,
        loadCurrentAmps: editEqLoadAmps ? parseFloat(editEqLoadAmps) : undefined,
        overloadAmps: editEqOverloadAmps ? parseFloat(editEqOverloadAmps) : undefined,
        starterType: editEqStarter,
        status: editEqStatus,
        feederPanel: editEqFeederPanel,
        feederNodeId: targetPanelMeta?.breakerId || selectedEquipment.feederNodeId,
        transformerSource: targetPanelMeta?.transformerSource || selectedEquipment.transformerSource,
        feederBreaker: targetPanelMeta?.breakerCode || selectedEquipment.feederBreaker
      };
      await onModifyEquipment(selectedEquipment, updates, {
        modifiedBy: currentUserName,
        changeType:
          selectedEquipment.feederPanel !== editEqFeederPanel ? 'RELOCATION' : 'SPECS_UPDATE',
        summary: `Updated from Hierarchy (${node.code}): ${updates.code} • ${updates.powerKw ?? '—'}kW • ${updates.feederPanel}`,
        reason: editEqReason.trim() || `Engineering update via ${node.code} hierarchy panel`,
        previousValues: {
          code: selectedEquipment.code,
          powerKw: selectedEquipment.powerKw,
          feederPanel: selectedEquipment.feederPanel
        },
        newValues: updates
      });
      setActiveEqAction('NONE');
      setEqActionSuccess(`Saved changes to ${updates.code}.`);
    } catch (err: any) {
      setEqActionError(err.message || 'Equipment update rejected.');
    } finally {
      setEqActionBusy(false);
    }
  };

  const handleSafeDeleteEquipment = async (eq: Equipment) => {
    if (!isEngineer || !onDeleteEquipment) return;
    const precheck = validateSafeEquipmentDelete(eq, jobCards);
    if (!precheck.canDelete) {
      setEqActionError(precheck.error || 'Cannot delete equipment referenced by Job Cards.');
      return;
    }
    setEqActionBusy(true);
    setEqActionError(null);
    try {
      await onDeleteEquipment(eq);
      setSelectedEquipmentId(null);
      setActiveEqAction('NONE');
    } catch (err: any) {
      setEqActionError(err.message || 'Delete failed.');
    } finally {
      setEqActionBusy(false);
    }
  };

  const handleSubmitRegisterEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEngineer || !onCreateEquipment || !node.feederPanelId) return;
    setRegSaving(true);
    setRegError(null);
    try {
      const panelMeta = FEEDER_PANELS.find((p) => p.id === node.feederPanelId);
      const mapped = getPanelAreaAndDepartment(node.feederPanelId);
      await onCreateEquipment({
        code: regCode.trim().toUpperCase(),
        name: regName.trim(),
        department: mapped.department,
        location: node.location,
        status: 'Operational',
        criticality: 'High',
        plantArea: mapped.plantArea,
        powerKw: regKw ? parseFloat(regKw) : undefined,
        ratedCurrentAmps: regRatedAmps ? parseFloat(regRatedAmps) : undefined,
        loadCurrentAmps: regLoadAmps ? parseFloat(regLoadAmps) : undefined,
        overloadAmps: regOverloadAmps ? parseFloat(regOverloadAmps) : undefined,
        starterType: regStarter,
        feederPanel: node.feederPanelId,
        feederNodeId: panelMeta?.breakerId || node.id,
        transformerSource: panelMeta?.transformerSource || 'Tx3',
        feederBreaker: panelMeta?.breakerCode || node.code,
        notes: `Registered on ${node.code} (${node.name}) via Hierarchical SLD Branch Drawer.`
      });
      setShowRegisterModal(false);
      setRegCode('');
      setRegName('');
      setRegKw('');
      setRegRatedAmps('');
      setRegLoadAmps('');
      setRegOverloadAmps('');
    } catch (err: any) {
      setRegError(err.message || 'Could not register equipment.');
    } finally {
      setRegSaving(false);
    }
  };

  const handleSubmitAddConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEngineer || !onCreatePowerConnection || !connPartnerId) return;
    setConnBusy(true);
    setConnError(null);
    try {
      const sourceNodeId = connDirection === 'INCOMING' ? connPartnerId : node.id;
      const targetNodeId = connDirection === 'INCOMING' ? node.id : connPartnerId;
      await onCreatePowerConnection({
        sourceNodeId,
        targetNodeId,
        voltageTier: connTier,
        edgeRole: connRole,
        label: connLabel.trim() || undefined,
        reason: connReason.trim() || `Verified connection added at ${node.code}`,
        createdBy: currentUserName
      });
      setShowAddConnection(false);
      setConnPartnerId('');
      setConnLabel('');
      setConnReason('');
    } catch (err: any) {
      setConnError(err.message || 'Connection rejected.');
    } finally {
      setConnBusy(false);
    }
  };

  const standbyCount = loadMetrics.connectedEquipment.filter((e) => e.status === 'Standby').length;

  return (
    <section className="border-t-2 border-slate-900 bg-slate-50 text-slate-900">
      {/* 1. Sticky Hierarchy Navigation Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {directParentNode && (
              <button
                type="button"
                onClick={() => {
                  onSelectHierarchyNode(directParentNode.id);
                  onSelectInspectorNode(directParentNode.id);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-[11px] font-bold cursor-pointer transition"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to {directParentNode.code}</span>
              </button>
            )}

            {/* Clickable Upstream Breadcrumb Path */}
            <nav aria-label="Electrical upstream lineage" className="flex flex-wrap items-center gap-1 font-mono text-[11px]">
              <Layers className="w-3.5 h-3.5 text-slate-500 mr-0.5 shrink-0" />
              {upstreamChain.map((anc, idx) => (
                <React.Fragment key={anc.id}>
                  {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400" />}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectHierarchyNode(anc.id);
                      onSelectInspectorNode(anc.id);
                    }}
                    className={`px-1.5 py-0.5 rounded border cursor-pointer transition ${
                      anc.id === node.id
                        ? 'bg-slate-900 text-white border-slate-900 font-bold'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {anc.code}
                  </button>
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white">
              {node.code}
            </span>
            <h3 className="text-sm font-bold text-slate-900">{node.name}</h3>
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
            <span className="font-mono text-[10.5px] text-slate-500">
              {node.voltage} • {node.location}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* RBAC Security Mode Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded border font-mono text-[10px] font-bold ${
              isEngineer
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}
            title={
              isEngineer
                ? 'Authorized Engineering User: Topology, switching, connections & asset registration enabled'
                : 'Technician / Operator Mode: Topology locked; inspection clamp readings & status updates enabled'
            }
          >
            {isEngineer ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-700" />
            )}
            <span>{isEngineer ? 'Engineer Topology Access' : 'Technician Inspection Mode'}</span>
          </span>

          {onOpenNodeCondition && (
            <button
              type="button"
              onClick={() => onOpenNodeCondition(node.id)}
              className="px-2.5 py-1 rounded border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-indigo-700" />
              <span>Inspect ({conditionSummaries?.get(node.id)?.totalInspections ?? 0})</span>
            </button>
          )}

          {canInspect && onRecordElectricalMeasurement && (
            <button
              type="button"
              onClick={() =>
                setMeasurementTarget({
                  assetId: node.id,
                  assetKind: 'POWER_NODE',
                  assetCode: node.code,
                  assetName: node.name,
                  nominalVoltageV: resolveNominalNodeVoltageV(node),
                  targetNode: node
                })
              }
              className="px-2.5 py-1 rounded border border-teal-400 bg-teal-50 hover:bg-teal-100 text-teal-950 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
            >
              <Gauge className="w-3.5 h-3.5 text-teal-700" />
              <span>Log Reading</span>
            </button>
          )}

          {isEngineer && node.feederPanelId && onCreateEquipment && (
            <button
              type="button"
              onClick={() => {
                setRegError(null);
                setShowRegisterModal(true);
              }}
              className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Motor on {node.code}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenFullBranchWorkspace(node.id)}
            className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Full Editor</span>
          </button>

          <button
            type="button"
            onClick={onCloseHierarchy}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition"
          >
            <X className="w-3.5 h-3.5" />
            <span>Collapse Branch</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Hazard Alerts on Expanded Branch */}
        {nodeHazards.map((hz) => (
          <div
            key={hz.id}
            className={`p-3 rounded border flex items-start gap-2.5 text-xs ${
              hz.severity === 'CRITICAL'
                ? 'bg-red-50 border-red-400 text-red-950'
                : 'bg-amber-50 border-amber-400 text-amber-950'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 font-bold">
                <span>{hz.title}</span>
                {hz.dataBasis && (
                  <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[9.5px]">
                    {hz.dataBasis}
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-snug mt-0.5">{hz.message}</p>
            </div>
          </div>
        ))}

        {/* 2. Branch KPI Summary Strip (Strictly Classified Nameplate vs Estimated vs Measured) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="bg-white border border-slate-200 rounded p-2.5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-500">
              <span>Installed Nameplate</span>
              <span className={`px-1 rounded border text-[8.5px] font-bold ${sourceTagClass('NAMEPLATE')}`}>
                NAMEPLATE
              </span>
            </div>
            <div className="font-mono text-lg font-black text-slate-900 tabular-nums">
              {loadMetrics.totalKw} kW
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              {loadMetrics.equipmentCount} Motor{loadMetrics.equipmentCount === 1 ? '' : 's'} • FLC {loadMetrics.connectedRatedAmps}A
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-2.5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-500">
              <span>Est. Demand</span>
              <span className={`px-1 rounded border text-[8.5px] font-bold ${sourceTagClass('ESTIMATED')}`}>
                ESTIMATED
              </span>
            </div>
            <div className="font-mono text-lg font-black text-amber-800 tabular-nums">
              {loadMetrics.runningLoadAmps} A
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              {loadMetrics.estimatedOperatingKva !== null
                ? `~${loadMetrics.estimatedOperatingKva} kVA`
                : '—'}{' '}
              ({loadMetrics.nominalVoltageV}V)
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-2.5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-500">
              <span>Measured Load</span>
              <span
                className={`px-1 rounded border text-[8.5px] font-bold ${
                  loadMetrics.measurementSource
                    ? sourceTagClass(loadMetrics.measurementSource)
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {loadMetrics.measurementSource || 'UNMEASURED'}
              </span>
            </div>
            <div className="font-mono text-lg font-black text-teal-800 tabular-nums">
              {loadMetrics.measuredCurrentAmps !== null
                ? `${loadMetrics.measuredCurrentAmps} A`
                : 'Unavailable'}
            </div>
            <div className="text-[10px] font-mono text-slate-500 truncate">
              {loadMetrics.measuredApparentPowerKva !== null
                ? `${loadMetrics.measuredApparentPowerKva} kVA${
                    loadMetrics.measuredActivePowerKw !== null
                      ? ` • ${loadMetrics.measuredActivePowerKw} kW`
                      : ''
                  }`
                : 'No field/meter log yet'}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-2.5">
            <div className="text-[10px] font-mono uppercase text-slate-500">Utilisation & PF</div>
            <div className="font-mono text-lg font-black text-slate-900 tabular-nums">
              {loadMetrics.measuredUtilizationPct !== null
                ? `${loadMetrics.measuredUtilizationPct}%`
                : loadMetrics.estimatedUtilizationPct !== null
                ? `~${loadMetrics.estimatedUtilizationPct}%`
                : 'Unavailable'}
            </div>
            <div className="text-[10px] font-mono text-slate-500 truncate">
              PF: {loadMetrics.measuredPowerFactor ?? 'Unavail'} • V:{' '}
              {loadMetrics.measuredVoltageV !== null ? `${loadMetrics.measuredVoltageV}V` : 'Unavail'}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-2.5">
            <div className="text-[10px] font-mono uppercase text-slate-500">Condition & JC</div>
            <div className="flex flex-wrap items-center gap-1 mt-1 font-mono text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                {loadMetrics.operationalCount} Op
              </span>
              {loadMetrics.maintenanceCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-800 border border-red-200 font-bold">
                  {loadMetrics.maintenanceCount} Maint
                </span>
              )}
              {standbyCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-bold">
                  {standbyCount} Stby
                </span>
              )}
              <span
                className={`px-1.5 py-0.5 rounded border font-bold ${
                  loadMetrics.activeJobCards > 0
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {loadMetrics.activeJobCards} JC
              </span>
            </div>
          </div>
        </div>

        {/* 3. Downstream Sub-Distribution Schematic + Branch Load Contribution Breakdown */}
        {directChildNodes.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-md p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold text-slate-900">
                  Downstream Electrical Branches off {node.code} ({directChildNodes.length})
                </span>
              </div>
              <span className="font-mono text-[10.5px] text-slate-500">
                Select any downstream breaker or feeder to drill further while keeping plant SLD visible
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {directChildNodes.map((child) => {
                const childMetrics = computeNodeLoadMetrics(
                  child,
                  allNodes,
                  equipmentList,
                  jobCards,
                  powerConnections,
                  electricalMeasurements
                );
                const childState = solved.nodeStates.get(child.id);
                const isLive = childState?.energization === 'ENERGIZED';
                const isFault = childState?.energization === 'FAULT_BACKFEED';

                return (
                  <div
                    key={child.id}
                    className={`rounded border p-2.5 flex flex-col justify-between gap-2 transition ${
                      isFault
                        ? 'bg-red-50/70 border-red-400'
                        : isLive
                        ? 'bg-slate-50/60 border-slate-300 hover:border-slate-500'
                        : 'bg-slate-50 border-slate-200 opacity-85'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[11px] font-black px-1.5 py-0.5 rounded bg-slate-900 text-white">
                          {child.code}
                        </span>
                        <div className="flex items-center gap-1">
                          <ConditionBadge
                            condition={conditionSummaries?.get(child.id)?.condition || 'NOT_INSPECTED'}
                            compact
                            onClick={onOpenNodeCondition ? () => onOpenNodeCondition(child.id) : undefined}
                          />
                          <span
                            className={`font-mono text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${
                              isFault
                                ? 'bg-red-600 text-white border-red-700'
                                : child.operatingState === 'CLOSED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            {child.operatingState}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1.5 leading-snug">
                        {child.feederPanelId || child.name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5 truncate">
                        {child.breakerType !== 'Unrecorded' ? child.breakerType : child.category}
                        {child.ratedAmps ? ` • ${child.ratedAmps}A` : ''} • {child.voltage}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-1 text-[10.5px] font-mono">
                      <div>
                        <strong className="text-slate-900">{childMetrics.effectiveDisplayAmps} A</strong>
                        <span className="text-[9px] text-slate-500 ml-1">
                          [{childMetrics.displayDataSource === 'METERED' ? 'MTR' : childMetrics.displayDataSource === 'MEASURED' ? 'MEAS' : 'EST'}]
                        </span>
                        <span className="text-slate-500 block text-[9.5px]">
                          {childMetrics.totalKw}kW • {childMetrics.equipmentCount} Motor{childMetrics.equipmentCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectHierarchyNode(child.id);
                          onSelectInspectorNode(child.id);
                        }}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-700 text-white font-bold cursor-pointer transition"
                      >
                        Expand →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {loadMetrics.branchContributions.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[10.5px] font-mono font-bold uppercase text-slate-600 mb-2">
                  <Activity className="w-3.5 h-3.5 text-teal-700" />
                  <span>Downstream Branch Load Contribution Breakdown (No Double-Counting)</span>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded">
                  <table className="w-full text-left font-mono text-[10.5px] border-collapse">
                    <thead className="bg-slate-50 text-slate-600 text-[9.5px] uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-1.5 px-2.5">Branch</th>
                        <th className="py-1.5 px-2.5 text-right">Motors</th>
                        <th className="py-1.5 px-2.5 text-right">Installed (kW)</th>
                        <th className="py-1.5 px-2.5 text-right">Est. Demand</th>
                        <th className="py-1.5 px-2.5 text-right">Share %</th>
                        <th className="py-1.5 px-2.5 text-right">Measured Load</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {loadMetrics.branchContributions.map((bc) => (
                        <tr key={bc.nodeId} className="hover:bg-slate-50">
                          <td className="py-1.5 px-2.5 font-bold text-slate-900">
                            {bc.code} <span className="font-normal text-slate-500">({bc.name})</span>
                          </td>
                          <td className="py-1.5 px-2.5 text-right">{bc.equipmentCount}</td>
                          <td className="py-1.5 px-2.5 text-right">{bc.installedKw} kW</td>
                          <td className="py-1.5 px-2.5 text-right text-amber-800">
                            {bc.estimatedOperatingAmps} A
                            {bc.estimatedApparentPowerKva !== null ? ` (${bc.estimatedApparentPowerKva} kVA)` : ''}
                          </td>
                          <td className="py-1.5 px-2.5 text-right">
                            {bc.shareOfParentEstimatedPct !== null ? `${bc.shareOfParentEstimatedPct}%` : '—'}
                          </td>
                          <td className="py-1.5 px-2.5 text-right">
                            {bc.measuredCurrentAmps !== null || bc.measuredApparentPowerKva !== null ? (
                              <span className="font-bold text-emerald-800">
                                {bc.measuredCurrentAmps !== null ? `${bc.measuredCurrentAmps} A` : ''}
                                {bc.measuredApparentPowerKva !== null ? ` / ${bc.measuredApparentPowerKva} kVA` : ''}
                                {bc.measurementSource ? ` [${bc.measurementSource}]` : ''}
                              </span>
                            ) : (
                              <span className="text-slate-400">Unavailable</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Internal MCC / Distribution Board Schematic + Outgoing Starters & Real Motors */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          <div className={`${selectedEquipment ? 'xl:col-span-8' : 'xl:col-span-12'} bg-white border border-slate-200 rounded-md overflow-hidden`}>
            {/* Filter Bar */}
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  {logicalGroup
                    ? `${logicalGroup.groupType} Internal Busbar, Starters & Connected Loads`
                    : `Connected Loads Downstream of ${node.code}`}
                </span>
                <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                  {filteredEquipment.length} / {loadMetrics.connectedEquipment.length}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-48 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={branchSearch}
                    onChange={(e) => setBranchSearch(e.target.value)}
                    placeholder="Filter tag, motor, location..."
                    className="w-full pl-7 pr-6 py-1 bg-white border border-slate-300 rounded text-[11px] focus:outline-none focus:border-slate-600"
                  />
                  {branchSearch && (
                    <button
                      type="button"
                      onClick={() => setBranchSearch('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <select
                  value={starterFilter}
                  onChange={(e) => setStarterFilter(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-mono text-slate-700"
                >
                  <option value="ALL">All Starters</option>
                  <option value="DOL">DOL</option>
                  <option value="Y/D">Y/D (Star-Delta)</option>
                  <option value="VSD">VSD</option>
                  <option value="SOFT STARTER">SOFT STARTER</option>
                  <option value="OTHER">OTHER</option>
                </select>

                <select
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value as any)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-mono text-slate-700"
                >
                  <option value="ALL">All Conditions</option>
                  <option value="OPERATIONAL">Operational</option>
                  <option value="MAINTENANCE">Under Maint.</option>
                  <option value="STANDBY">Standby</option>
                  <option value="OPEN_JC">Has Open JC</option>
                </select>
              </div>
            </div>

            {/* Logical MCC / DB Incoming Breaker -> Internal 400V Busbar Schematic Banner */}
            {logicalGroup && (
              <div className="px-4 py-3 bg-[#f8fafc] border-b border-slate-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Incoming Feeder Breaker */}
                  <div className="flex items-center gap-2.5 bg-white border border-slate-300 rounded px-2.5 py-1.5 shadow-2xs">
                    <CircuitBreakerSymbol
                      className="w-7 h-7 shrink-0"
                      state={node.operatingState}
                      energization={energization}
                    />
                    <div className="text-[11px]">
                      <div className="font-mono font-bold text-slate-900">
                        INCOMER: {node.code}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {node.breakerType}
                        {node.ratedAmps ? ` • ${node.ratedAmps}A` : ' • Rating Unrecorded'}
                      </div>
                    </div>
                  </div>

                  {/* Conductor to Internal Busbar */}
                  <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-slate-500">
                    <span
                      className={`w-8 h-0.5 ${
                        energization === 'ENERGIZED' ? 'bg-teal-700' : 'bg-slate-400'
                      }`}
                    />
                    <span>FEEDS</span>
                    <span
                      className={`w-8 h-0.5 ${
                        energization === 'ENERGIZED' ? 'bg-teal-700' : 'bg-slate-400'
                      }`}
                    />
                  </div>

                  {/* Internal 400V Busbar */}
                  <div
                    className={`flex-1 min-w-[240px] rounded px-3 py-1.5 border flex items-center justify-between gap-2 ${
                      energization === 'ENERGIZED'
                        ? 'bg-slate-900 border-slate-950 text-white'
                        : 'bg-slate-200 border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <BusbarSymbol
                        className="w-6 h-4 shrink-0"
                        strokeColor={energization === 'ENERGIZED' ? '#fde047' : '#64748b'}
                      />
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] font-bold truncate">
                          {logicalGroup.internalBusbarLabel}
                        </div>
                        <div className="font-mono text-[9.5px] opacity-80">
                          {logicalGroup.nominalVoltage}
                          {logicalGroup.busbarRatedAmps
                            ? ` • ${logicalGroup.busbarRatedAmps}A Busbar`
                            : ''}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-bold shrink-0">
                      {loadMetrics.connectedEquipment.length} Outgoing Cubicles
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Real Connected Equipment Cubicles Grid */}
            <div className="p-3.5">
              {filteredEquipment.length === 0 ? (
                <div className="p-6 text-center rounded border border-dashed border-slate-300 bg-slate-50 space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    {loadMetrics.connectedEquipment.length === 0
                      ? `No verified motor loads registered on ${node.code}`
                      : 'No equipment matches the current branch search or filters'}
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    {loadMetrics.connectedEquipment.length === 0
                      ? 'Fictional motor inventories are strictly disabled. Register verified plant checklist motors directly to this feeder panel when commissioned.'
                      : 'Clear the search text or reset Starter / Condition filters above.'}
                  </p>
                  {loadMetrics.connectedEquipment.length === 0 &&
                    node.feederPanelId &&
                    onCreateEquipment &&
                    (isEngineer ? (
                      <button
                        type="button"
                        onClick={() => {
                          setRegError(null);
                          setShowRegisterModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Register Equipment on {node.code}</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 border border-amber-200 font-mono text-[10px] text-amber-900">
                        <Lock className="w-3 h-3" />
                        Authorized Engineer required to register new equipment
                      </span>
                    ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {filteredEquipment.map((eq) => {
                    const eqOpenJCs = getOpenJobCardsForEquipment(eq);
                    const isSelectedEq = selectedEquipmentId === eq.id;
                    const isMaint = eq.status === 'Under Maintenance';
                    const isDecomm = eq.status === 'Decommissioned';
                    const eqStroke = isDecomm
                      ? '#94a3b8'
                      : isMaint
                      ? '#dc2626'
                      : energization === 'ENERGIZED'
                      ? '#0f766e'
                      : '#64748b';

                    return (
                      <div
                        key={eq.id}
                        onClick={() => {
                          setSelectedEquipmentId(eq.id);
                          setActiveEqAction('NONE');
                          setEqActionError(null);
                          setEqActionSuccess(null);
                        }}
                        className={`rounded border p-2.5 cursor-pointer transition bg-white flex flex-col justify-between gap-2 ${
                          isSelectedEq
                            ? 'border-slate-900 ring-2 ring-slate-900/20 shadow-xs'
                            : isMaint
                            ? 'border-red-300 hover:border-red-500'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {/* Top Cubicle Meta */}
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-900">
                            {eq.code}
                          </span>
                          <div className="flex items-center gap-1">
                            <ConditionBadge
                              condition={conditionSummaries?.get(eq.id)?.condition || 'NOT_INSPECTED'}
                              compact
                              onClick={onOpenEquipmentCondition ? () => onOpenEquipmentCondition(eq) : undefined}
                            />
                            <span
                              className={`font-mono text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${
                                eq.status === 'Operational'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : eq.status === 'Under Maintenance'
                                  ? 'bg-red-50 text-red-800 border-red-200'
                                  : eq.status === 'Standby'
                                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-300'
                              }`}
                            >
                              {eq.status}
                            </span>
                          </div>
                        </div>

                        {/* Mini Electrical Chain: Breaker -> Starter -> Motor */}
                        <div className="flex items-center gap-1.5 py-1 border-y border-slate-100">
                          <CircuitBreakerSymbol
                            className="w-5 h-5 shrink-0"
                            state={
                              isDecomm
                                ? 'DECOMMISSIONED'
                                : isMaint
                                ? 'OPEN'
                                : node.operatingState
                            }
                            energization={energization}
                          />
                          <span className="text-slate-300 font-mono text-[10px]">→</span>
                          <StarterSymbol
                            className="w-8 h-5 shrink-0"
                            starterType={eq.starterType || 'DOL'}
                            strokeColor={eqStroke}
                          />
                          <span className="text-slate-300 font-mono text-[10px]">→</span>
                          <ElectricalLoadSymbol
                            className="w-5 h-5 shrink-0"
                            strokeColor={eqStroke}
                          />
                          <div className="min-w-0 flex-1 pl-1">
                            <div className="text-[11.5px] font-bold text-slate-900 truncate" title={eq.name}>
                              {eq.name}
                            </div>
                            <div className="font-mono text-[9.5px] text-slate-500 truncate">
                              {eq.location}
                            </div>
                          </div>
                        </div>

                        {/* Ratings & JC Footer */}
                        <div className="flex items-center justify-between font-mono text-[10px] tabular-nums">
                          <span className="text-slate-700">
                            <strong>{eq.powerKw ? `${eq.powerKw} kW` : '—'}</strong> •{' '}
                            {eq.loadCurrentAmps ?? eq.ratedCurrentAmps ?? '—'} A
                            {eq.overloadAmps ? ` (O/L ${eq.overloadAmps}A)` : ''}
                          </span>
                          {eqOpenJCs.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 font-bold text-red-700">
                              <AlertTriangle className="w-3 h-3" />
                              {eqOpenJCs.length} JC
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 5. Inline Equipment Detail Sub-Panel */}
          {selectedEquipment && (
            <div className="xl:col-span-4 bg-white border border-slate-300 rounded-md overflow-hidden shadow-xs">
              <div className="px-3.5 py-2.5 bg-slate-900 text-white flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] text-amber-300 font-bold">
                    {selectedEquipment.code} • {selectedEquipment.feederPanel || node.feederPanelId}
                  </div>
                  <h4 className="text-xs font-bold leading-snug truncate">
                    {selectedEquipment.name}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEquipmentId(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 space-y-3 text-xs">
                {eqActionError && (
                  <div className="p-2 rounded bg-red-50 border border-red-300 text-red-900 text-[11px] font-semibold">
                    {eqActionError}
                  </div>
                )}
                {eqActionSuccess && (
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-300 text-emerald-900 text-[11px] font-semibold">
                    {eqActionSuccess}
                  </div>
                )}

                {/* Nameplate Grid */}
                <div className="grid grid-cols-3 gap-2 font-mono text-[10.5px]">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[9px] text-slate-500 block">POWER</span>
                    <strong className="text-slate-900">
                      {selectedEquipment.powerKw ? `${selectedEquipment.powerKw} kW` : '—'}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[9px] text-slate-500 block">STARTER</span>
                    <strong className="text-slate-900">
                      {selectedEquipment.starterType || 'DOL'}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[9px] text-slate-500 block">LOAD / FLC</span>
                    <strong className="text-teal-800">
                      {selectedEquipment.loadCurrentAmps ?? '—'} / {selectedEquipment.ratedCurrentAmps ?? '—'} A
                    </strong>
                  </div>
                </div>

                {/* Action Buttons: Job Card, Inspection, Engineer Edit/Relocate, Safe Delete */}
                <div className="flex flex-wrap gap-1.5">
                  {onOpenEquipmentCondition && (
                    <button
                      type="button"
                      onClick={() => onOpenEquipmentCondition(selectedEquipment)}
                      className="px-2.5 py-1 rounded border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ClipboardCheck className="w-3 h-3 text-indigo-700" />
                      <span>Electrical Inspection</span>
                    </button>
                  )}
                  {onNewJobCardForEquipment && (
                    <button
                      type="button"
                      onClick={() => onNewJobCardForEquipment(selectedEquipment)}
                      className="px-2.5 py-1 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>Raise Job Card</span>
                    </button>
                  )}

                  {canInspect && onRecordElectricalMeasurement && (
                    <button
                      type="button"
                      onClick={() =>
                        setMeasurementTarget({
                          assetId: selectedEquipment.id,
                          assetKind: 'EQUIPMENT',
                          assetCode: selectedEquipment.code,
                          assetName: selectedEquipment.name,
                          nominalVoltageV: 400
                        })
                      }
                      className="px-2.5 py-1 rounded border border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Activity className="w-3 h-3" />
                      <span>Record 3Ø Reading</span>
                    </button>
                  )}

                  {canInspect && onInspectUpdateEquipment && (
                    <button
                      type="button"
                      onClick={() => startInspectEquipment(selectedEquipment)}
                      className="px-2.5 py-1 rounded border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-900 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Gauge className="w-3 h-3" />
                      <span>Quick Status / Clamp</span>
                    </button>
                  )}

                  {isEngineer && onModifyEquipment && (
                    <button
                      type="button"
                      onClick={() => startEngineerEditEquipment(selectedEquipment)}
                      className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit / Move</span>
                    </button>
                  )}

                  {isEngineer && onDeleteEquipment && (
                    <button
                      type="button"
                      disabled={eqActionBusy}
                      onClick={() => handleSafeDeleteEquipment(selectedEquipment)}
                      className="px-2 py-1 rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      title="Delete equipment (blocked automatically if referenced by Job Cards)"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

                {/* Technician/Engineer Inspection Form */}
                {activeEqAction === 'INSPECT' && (
                  <form
                    onSubmit={handleSubmitInspection}
                    className="p-2.5 rounded border border-teal-200 bg-teal-50/40 space-y-2 text-[11px]"
                  >
                    <div className="font-bold text-teal-950">
                      Field Inspection (Permitted Readings & Status)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5">
                          Clamp Load (A)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={inspLoadAmps}
                          onChange={(e) => setInspLoadAmps(e.target.value)}
                          className="w-full px-2 py-1 border border-slate-300 rounded bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5">
                          Condition
                        </label>
                        <select
                          value={inspStatus}
                          onChange={(e) => setInspStatus(e.target.value as EquipmentStatus)}
                          className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                        >
                          <option value="Operational">Operational</option>
                          <option value="Under Maintenance">Under Maintenance</option>
                          <option value="Standby">Standby</option>
                          <option value="Decommissioned">Decommissioned</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-0.5">Notes</label>
                      <input
                        type="text"
                        value={inspNotes}
                        onChange={(e) => setInspNotes(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-0.5">
                        Inspection Reason
                      </label>
                      <input
                        type="text"
                        value={inspReason}
                        onChange={(e) => setInspReason(e.target.value)}
                        placeholder="Routine clamp reading & thermal check"
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveEqAction('NONE')}
                        className="px-2.5 py-1 rounded border border-slate-300 bg-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={eqActionBusy}
                        className="px-3 py-1 rounded bg-teal-700 text-white font-bold cursor-pointer"
                      >
                        {eqActionBusy ? 'Saving...' : 'Save Inspection'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Engineer Edit / Relocate Form */}
                {activeEqAction === 'EDIT' && isEngineer && (
                  <form
                    onSubmit={handleSubmitEngineerEdit}
                    className="p-2.5 rounded border border-slate-300 bg-slate-50 space-y-2 text-[11px]"
                  >
                    <div className="font-bold text-slate-900">
                      Engineer Asset Edit & Feeder Assignment
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5">Asset Tag *</label>
                        <input
                          type="text"
                          required
                          value={editEqCode}
                          onChange={(e) => setEditEqCode(e.target.value)}
                          className="w-full px-2 py-1 border border-slate-300 rounded bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5">Starter</label>
                        <select
                          value={editEqStarter}
                          onChange={(e) => setEditEqStarter(e.target.value as StarterType)}
                          className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                        >
                          <option value="DOL">DOL</option>
                          <option value="Y/D">Y/D</option>
                          <option value="VSD">VSD</option>
                          <option value="SOFT STARTER">SOFT STARTER</option>
                          <option value="OTHER">OTHER</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-0.5">Motor Name *</label>
                      <input
                        type="text"
                        required
                        value={editEqName}
                        onChange={(e) => setEditEqName(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-0.5">Feeder Panel</label>
                      <select
                        value={editEqFeederPanel}
                        onChange={(e) => setEditEqFeederPanel(e.target.value as FeederPanelId)}
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white font-semibold"
                      >
                        {FEEDER_PANELS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.breakerCode} — {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5">kW</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editEqKw}
                          onChange={(e) => setEditEqKw(e.target.value)}
                          className="w-full px-1.5 py-1 border border-slate-300 rounded bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5">Rated A</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editEqRatedAmps}
                          onChange={(e) => setEditEqRatedAmps(e.target.value)}
                          className="w-full px-1.5 py-1 border border-slate-300 rounded bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5">Load A</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editEqLoadAmps}
                          onChange={(e) => setEditEqLoadAmps(e.target.value)}
                          className="w-full px-1.5 py-1 border border-slate-300 rounded bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5">O/L A</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editEqOverloadAmps}
                          onChange={(e) => setEditEqOverloadAmps(e.target.value)}
                          className="w-full px-1.5 py-1 border border-slate-300 rounded bg-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5">Status</label>
                        <select
                          value={editEqStatus}
                          onChange={(e) => setEditEqStatus(e.target.value as EquipmentStatus)}
                          className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                        >
                          <option value="Operational">Operational</option>
                          <option value="Under Maintenance">Under Maintenance</option>
                          <option value="Standby">Standby</option>
                          <option value="Decommissioned">Decommissioned</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5">Reason</label>
                        <input
                          type="text"
                          value={editEqReason}
                          onChange={(e) => setEditEqReason(e.target.value)}
                          placeholder="Engineering note"
                          className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveEqAction('NONE')}
                        className="px-2.5 py-1 rounded border border-slate-300 bg-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={eqActionBusy}
                        className="px-3 py-1 rounded bg-slate-900 text-white font-bold cursor-pointer"
                      >
                        {eqActionBusy ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Linked Job Cards */}
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                    Work Orders ({selectedEquipmentJobCards.length})
                  </div>
                  {selectedEquipmentJobCards.length === 0 ? (
                    <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[10.5px] text-slate-500">
                      No historical or open work orders on this asset.
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-[140px] overflow-y-auto">
                      {selectedEquipmentJobCards.slice(0, 6).map((jc) => (
                        <div
                          key={jc.id}
                          className="p-1.5 rounded border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-[10.5px]"
                        >
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-slate-900">
                              {jc.jobCardNumber}
                            </span>
                            <div className="text-slate-600 truncate">{jc.description}</div>
                          </div>
                          <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[9.5px] shrink-0">
                            {jc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 6. Multi-Source & Busbar Electrical Connections Inspector */}
        <div className="bg-white border border-slate-200 rounded-md p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Cable className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-bold text-slate-900">
                Verified Electrical Connections on {node.code} ({touchingConnections.incoming.length} In / {touchingConnections.outgoing.length} Out)
              </span>
            </div>
            {isEngineer && onCreatePowerConnection && (
              <button
                type="button"
                onClick={() => {
                  setConnError(null);
                  setShowAddConnection((v) => !v);
                }}
                className="px-2.5 py-1 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Verified Connection</span>
              </button>
            )}
          </div>

          {connError && (
            <div className="p-2 rounded bg-red-50 border border-red-300 text-red-800 text-[11px] font-semibold">
              {connError}
            </div>
          )}

          {showAddConnection && isEngineer && (
            <form
              onSubmit={handleSubmitAddConnection}
              className="p-3 rounded border border-slate-300 bg-slate-50 grid grid-cols-1 sm:grid-cols-6 gap-2 text-[11px] items-end"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Direction</label>
                <select
                  value={connDirection}
                  onChange={(e) => setConnDirection(e.target.value as any)}
                  className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                >
                  <option value="INCOMING">Incoming Source → {node.code}</option>
                  <option value="OUTGOING">{node.code} → Downstream Target</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Connected Node *</label>
                <select
                  required
                  value={connPartnerId}
                  onChange={(e) => setConnPartnerId(e.target.value)}
                  className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                >
                  <option value="">Select node...</option>
                  {allNodes
                    .filter((n) => n.id !== node.id)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.code} — {n.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Role</label>
                <select
                  value={connRole}
                  onChange={(e) => setConnRole(e.target.value as PowerEdgeRole)}
                  className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                >
                  <option value="PRIMARY_FEED">PRIMARY_FEED</option>
                  <option value="SUB_FEED">SUB_FEED</option>
                  <option value="STANDBY_FEED">STANDBY_FEED</option>
                  <option value="INTERLOCK_TIE">INTERLOCK_TIE</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Voltage</label>
                <select
                  value={connTier}
                  onChange={(e) => setConnTier(e.target.value as PowerVoltageTier)}
                  className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                >
                  <option value="400V">400V</option>
                  <option value="415V">415V</option>
                  <option value="420V">420V</option>
                  <option value="11kV">11kV</option>
                  <option value="6.3kV">6.3kV</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Engineering Reason *</label>
                <input
                  type="text"
                  required
                  value={connReason}
                  onChange={(e) => setConnReason(e.target.value)}
                  placeholder="Verified standby tie"
                  className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                />
              </div>
              <div className="flex gap-1.5">
                <button
                  type="submit"
                  disabled={connBusy}
                  className="flex-1 px-2.5 py-1 rounded bg-slate-900 text-white font-bold cursor-pointer"
                >
                  {connBusy ? '...' : 'Link'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddConnection(false)}
                  className="px-2 py-1 rounded border border-slate-300 bg-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px] font-mono">
            <div className="p-2 rounded bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-500">
                Incoming Supply Terminals
              </div>
              {touchingConnections.incoming.length === 0 ? (
                <div className="text-slate-400">Primary Root / No upstream edges</div>
              ) : (
                touchingConnections.incoming.map((edge) => {
                  const customDoc = powerConnections.find(
                    (c) => c.id === edge.id || (c.sourceNodeId === edge.source && c.targetNodeId === edge.target && c.edgeRole === edge.edgeRole)
                  );
                  return (
                    <div key={edge.id} className="flex items-center justify-between gap-2 bg-white px-2 py-1 rounded border border-slate-200">
                      <span>
                        <strong>{edge.source}</strong> → {edge.target} ({edge.edgeRole} • {edge.voltageTier})
                      </span>
                      {customDoc && isEngineer && onDeletePowerConnection && (
                        <button
                          type="button"
                          onClick={() => onDeletePowerConnection(customDoc.id)}
                          className="text-red-700 hover:underline cursor-pointer"
                          title="Remove custom connection"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-2 rounded bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-500">
                Outgoing Feeder Terminals
              </div>
              {touchingConnections.outgoing.length === 0 ? (
                <div className="text-slate-400">Terminal feeder / panel load endpoint</div>
              ) : (
                touchingConnections.outgoing.map((edge) => {
                  const customDoc = powerConnections.find(
                    (c) => c.id === edge.id || (c.sourceNodeId === edge.source && c.targetNodeId === edge.target && c.edgeRole === edge.edgeRole)
                  );
                  return (
                    <div key={edge.id} className="flex items-center justify-between gap-2 bg-white px-2 py-1 rounded border border-slate-200">
                      <span>
                        {edge.source} → <strong>{edge.target}</strong> ({edge.edgeRole} • {edge.voltageTier})
                      </span>
                      {customDoc && isEngineer && onDeletePowerConnection && (
                        <button
                          type="button"
                          onClick={() => onDeletePowerConnection(customDoc.id)}
                          className="text-red-700 hover:underline cursor-pointer"
                          title="Remove custom connection"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 7. Collapsible Immutable Historical Measurements Ledger */}
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <button
            type="button"
            onClick={() => setShowMeasurementHistory((v) => !v)}
            className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-900 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-700" />
              <span>Immutable Electrical Measurement History ({branchMeasurements.length})</span>
            </span>
            <span className="font-mono text-[10.5px] text-slate-600">
              {showMeasurementHistory ? 'Hide Ledger ▲' : 'Show Ledger ▼'}
            </span>
          </button>

          {showMeasurementHistory && (
            <div className="p-3.5 border-t border-slate-200">
              {branchMeasurements.length === 0 ? (
                <div className="p-4 text-center rounded border border-dashed border-slate-200 bg-slate-50 font-mono text-[11px] text-slate-500">
                  No field or panel meter measurements recorded yet on {node.code} or its downstream equipment.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded">
                  <table className="w-full text-left font-mono text-[10.5px] border-collapse">
                    <thead className="bg-slate-50 text-slate-600 text-[9.5px] uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-1.5 px-2.5">Timestamp</th>
                        <th className="py-1.5 px-2.5">Asset</th>
                        <th className="py-1.5 px-2.5">Class</th>
                        <th className="py-1.5 px-2.5">Phase</th>
                        <th className="py-1.5 px-2.5">Readings</th>
                        <th className="py-1.5 px-2.5">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {branchMeasurements.slice(0, 30).map((m) => (
                        <tr key={m.id}>
                          <td className="py-1.5 px-2.5 text-slate-600 whitespace-nowrap">
                            {new Date(m.timestamp).toLocaleString()}
                          </td>
                          <td className="py-1.5 px-2.5 font-bold text-slate-900">
                            {m.assetCode || m.assetId}
                          </td>
                          <td className="py-1.5 px-2.5">
                            <span className={`px-1 py-0.2 rounded border text-[9px] font-bold ${sourceTagClass(m.source)}`}>
                              {m.source}
                            </span>
                          </td>
                          <td className="py-1.5 px-2.5">{m.phase}</td>
                          <td className="py-1.5 px-2.5 text-slate-800">
                            {m.values.currentAmps !== undefined ? `${m.values.currentAmps}A ` : ''}
                            {m.values.voltageV !== undefined ? `• ${m.values.voltageV}V ` : ''}
                            {m.values.activePowerKw !== undefined ? `• ${m.values.activePowerKw}kW ` : ''}
                            {m.values.apparentPowerKva !== undefined ? `• ${m.values.apparentPowerKva}kVA ` : ''}
                            {m.values.reactivePowerKvar !== undefined ? `• ${m.values.reactivePowerKvar}kVAr ` : ''}
                            {m.values.powerFactor !== undefined ? `• PF ${m.values.powerFactor}` : ''}
                          </td>
                          <td className="py-1.5 px-2.5 text-slate-600">{m.recordedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Log Measurement Modal */}
      {measurementTarget && onRecordElectricalMeasurement && (
        <LogMeasurementModal
          assetId={measurementTarget.assetId}
          assetKind={measurementTarget.assetKind}
          assetCode={measurementTarget.assetCode}
          assetName={measurementTarget.assetName}
          nominalVoltageV={measurementTarget.nominalVoltageV}
          targetNode={measurementTarget.targetNode}
          currentUserName={currentUserName}
          onClose={() => setMeasurementTarget(null)}
          onSubmitMeasurement={onRecordElectricalMeasurement}
        />
      )}

      {/* Engineer-Only Register Equipment Modal */}
      {showRegisterModal && isEngineer && node.feederPanelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden">
            <div className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between">
              <span className="font-bold text-sm">
                Register Verified Equipment on {node.code} ({node.feederPanelId})
              </span>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitRegisterEquipment} className="p-4 space-y-3 text-xs bg-slate-50">
              {regError && (
                <div className="p-2 rounded bg-red-50 border border-red-300 text-red-800 font-semibold">
                  {regError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unique Asset Tag *</label>
                  <input
                    type="text"
                    required
                    value={regCode}
                    onChange={(e) => setRegCode(e.target.value)}
                    placeholder="e.g. EQ-NWTP-01"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Starter Type</label>
                  <select
                    value={regStarter}
                    onChange={(e) => setRegStarter(e.target.value as StarterType)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="DOL">DOL</option>
                    <option value="Y/D">Y/D (Star-Delta)</option>
                    <option value="VSD">VSD</option>
                    <option value="SOFT STARTER">SOFT STARTER</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motor / Load Description *</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. New WTP High Pressure Pump 1"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">kW</label>
                  <input
                    type="number"
                    step="0.01"
                    value={regKw}
                    onChange={(e) => setRegKw(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rated (A)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={regRatedAmps}
                    onChange={(e) => setRegRatedAmps(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Load (A)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={regLoadAmps}
                    onChange={(e) => setRegLoadAmps(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">O/L (A)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={regOverloadAmps}
                    onChange={(e) => setRegOverloadAmps(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 bg-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regSaving}
                  className="px-4 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{regSaving ? 'Registering...' : 'Register on Branch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
