import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Maximize2,
  RotateCcw,
  Search,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
  X,
  Zap
} from 'lucide-react';
import {
  ElectricalAlertThresholds,
  ElectricalInspection,
  ElectricalInspectionReview,
  ElectricalJobCardPrefill,
  ElectricalMeasurement,
  Equipment,
  EquipmentModificationLog,
  EquipmentStatus,
  FeederPanelId,
  InspectionAssetCategory,
  InspectionReviewStatus,
  InspectionTemplate,
  JobCard,
  PowerConnection,
  PowerDistributionNode,
  PowerEdgeRole,
  PowerVoltageTier,
  UserProfile
} from '../../types';
import {
  FEEDER_PANELS,
  computeNodeLoadMetrics,
  evaluatePowerDistributionHazards,
  getUpstreamChain,
  resolveEquipmentFeederWithConfidence
} from '../../core/master-data/powerDistributionData';
import {
  CreateElectricalMeasurementInput,
  DEFAULT_ELECTRICAL_THRESHOLDS
} from '../../core/electrical/loadCalculations';
import {
  DEFAULT_INSPECTION_TEMPLATES,
  SubmitInspectionInput,
  indexLatestInspectionsByAsset
} from '../../core/electrical/inspections';
import { canManageInspectionTemplates } from '../../core/electrical/permissions';
import {
  getDirectChildNodeIds,
  solvePlantElectricalState
} from '../../core/electrical/topologySolver';
import { buildSldDiagramElements } from '../../core/electrical/sldLayout';
import { sldNodeTypes } from './sld/SldNodes';
import { sldEdgeTypes } from './sld/SldEdges';
import { SldInspectorDrawer } from './sld/SldInspectorDrawer';
import { HierarchicalBranchPanel } from './sld/HierarchicalBranchPanel';
import { PowerBranchDetailView } from './PowerBranchDetailView';
import {
  ElectricalInspectionModal,
  InspectionTargetAsset,
  buildInspectionTargetFromEquipment,
  buildInspectionTargetFromNode
} from './sld/ElectricalInspectionModal';
import { InspectionDetailModal } from './sld/InspectionDetailModal';
import { InspectionTemplatesModal } from './sld/InspectionTemplatesModal';

interface PowerDistributionSLDViewProps {
  powerNodes: PowerDistributionNode[];
  powerConnections?: PowerConnection[];
  electricalMeasurements?: ElectricalMeasurement[];
  equipmentList: Equipment[];
  jobCards: JobCard[];
  currentUserName: string;
  userRole?: UserProfile['role'] | null;
  userEmail?: string | null;
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
  onCreateEquipment?: (data: any) => Promise<void>;
  onSelectEquipment?: (equipment: Equipment) => void;
  onNewJobCardForEquipment?: (equipment: Equipment) => void;
  electricalInspections?: ElectricalInspection[];
  electricalInspectionReviews?: ElectricalInspectionReview[];
  inspectionTemplates?: Record<InspectionAssetCategory, InspectionTemplate>;
  onSubmitElectricalInspection?: (
    payload: Omit<SubmitInspectionInput, 'technicianId' | 'technicianName' | 'technicianRole'>
  ) => Promise<void>;
  onSubmitInspectionReview?: (params: {
    inspectionId: string;
    assetId: string;
    decision: Exclude<InspectionReviewStatus, 'PENDING_REVIEW'>;
    reviewNotes: string;
  }) => Promise<void>;
  onSaveInspectionTemplate?: (template: InspectionTemplate) => Promise<void>;
  onRaiseJobCardFromInspection?: (prefill: ElectricalJobCardPrefill) => void;
  onSelectJobCard?: (card: JobCard) => void;
  initialSelectedPanel?: FeederPanelId | null;
  initialFocusNodeId?: string | null;
}

const DEFAULT_EXPANDED_BRANCHES = ['BUS_TX1', 'BUS_TX2', 'BUS_TX3', 'C12'];
const THRESHOLDS_STORAGE_KEY = 'usa_distillers_elec_thresholds_v1';

function loadStoredThresholds(): ElectricalAlertThresholds {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(THRESHOLDS_STORAGE_KEY) : null;
    if (!raw) return DEFAULT_ELECTRICAL_THRESHOLDS;
    const parsed = JSON.parse(raw);
    return {
      transformerHighLoadPct: Number(parsed.transformerHighLoadPct) || DEFAULT_ELECTRICAL_THRESHOLDS.transformerHighLoadPct,
      transformerCriticalLoadPct: Number(parsed.transformerCriticalLoadPct) || DEFAULT_ELECTRICAL_THRESHOLDS.transformerCriticalLoadPct,
      breakerWarningPct: Number(parsed.breakerWarningPct) || DEFAULT_ELECTRICAL_THRESHOLDS.breakerWarningPct,
      breakerCriticalPct: Number(parsed.breakerCriticalPct) || DEFAULT_ELECTRICAL_THRESHOLDS.breakerCriticalPct,
      phaseImbalanceWarnPct: Number(parsed.phaseImbalanceWarnPct) || DEFAULT_ELECTRICAL_THRESHOLDS.phaseImbalanceWarnPct,
      voltageDeviationWarnPct: Number(parsed.voltageDeviationWarnPct) || DEFAULT_ELECTRICAL_THRESHOLDS.voltageDeviationWarnPct,
      voltageDeviationCriticalPct: Number(parsed.voltageDeviationCriticalPct) || DEFAULT_ELECTRICAL_THRESHOLDS.voltageDeviationCriticalPct,
      minPowerFactorWarn: Number(parsed.minPowerFactorWarn) || DEFAULT_ELECTRICAL_THRESHOLDS.minPowerFactorWarn
    };
  } catch {
    return DEFAULT_ELECTRICAL_THRESHOLDS;
  }
}

const PowerDistributionSLDCanvas: React.FC<PowerDistributionSLDViewProps> = ({
  powerNodes,
  powerConnections = [],
  electricalMeasurements = [],
  equipmentList,
  jobCards,
  currentUserName,
  userRole,
  userEmail,
  onUpdatePowerNode,
  onModifyEquipment,
  onInspectUpdateEquipment,
  onDeleteEquipment,
  onCreatePowerConnection,
  onDeletePowerConnection,
  onRecordElectricalMeasurement,
  onCreateEquipment,
  onSelectEquipment,
  onNewJobCardForEquipment,
  electricalInspections = [],
  electricalInspectionReviews = [],
  inspectionTemplates = DEFAULT_INSPECTION_TEMPLATES,
  onSubmitElectricalInspection,
  onSubmitInspectionReview,
  onSaveInspectionTemplate,
  onRaiseJobCardFromInspection,
  onSelectJobCard,
  initialSelectedPanel = null,
  initialFocusNodeId = null
}) => {
  const { fitView } = useReactFlow();
  const canManageTemplates = canManageInspectionTemplates(userRole, userEmail);

  const [inspectedNodeId, setInspectedNodeId] = useState<string | null>(() => {
    if (!initialSelectedPanel) return null;
    const panelMeta = FEEDER_PANELS.find(p => p.id === initialSelectedPanel);
    return panelMeta ? panelMeta.breakerId : null;
  });
  const [expandedHierarchyNodeId, setExpandedHierarchyNodeId] = useState<string | null>(null);
  const [branchWorkspaceNodeId, setBranchWorkspaceNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHazardModal, setShowHazardModal] = useState(false);
  const [showThresholdsModal, setShowThresholdsModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [inspectionDetailTarget, setInspectionDetailTarget] = useState<InspectionTargetAsset | null>(null);
  const [inspectionFormTarget, setInspectionFormTarget] = useState<InspectionTargetAsset | null>(null);
  const [correctsInspection, setCorrectsInspection] = useState<ElectricalInspection | null>(null);
  const [thresholds, setThresholds] = useState<ElectricalAlertThresholds>(loadStoredThresholds);
  const [draftThresholds, setDraftThresholds] = useState<ElectricalAlertThresholds>(thresholds);

  const [expandedBranchIds, setExpandedBranchIds] = useState<Set<string>>(
    () => new Set(DEFAULT_EXPANDED_BRANCHES)
  );
  const [expandedPanelIds, setExpandedPanelIds] = useState<Set<FeederPanelId>>(
    () => new Set()
  );

  const conditionSummaries = useMemo(
    () => indexLatestInspectionsByAsset(electricalInspections, electricalInspectionReviews),
    [electricalInspections, electricalInspectionReviews]
  );

  const conditionStats = useMemo(() => {
    let healthy = 0;
    let attention = 0;
    let fault = 0;
    powerNodes.forEach((n) => {
      const cond = conditionSummaries.get(n.id)?.condition;
      if (cond === 'HEALTHY') healthy += 1;
      else if (cond === 'ATTENTION_REQUIRED' || cond === 'UNDER_MAINTENANCE' || cond === 'ISOLATED') attention += 1;
      else if (cond === 'FAULT_DETECTED') fault += 1;
    });
    return { healthy, attention, fault };
  }, [powerNodes, conditionSummaries]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, PowerDistributionNode>();
    powerNodes.forEach(n => map.set(n.id, n));
    return map;
  }, [powerNodes]);

  const solved = useMemo(
    () =>
      solvePlantElectricalState(
        powerNodes,
        equipmentList,
        jobCards,
        (eq) => {
          const info = resolveEquipmentFeederWithConfidence(eq);
          return {
            breakerId: info.breakerId,
            confidence: info.confidence === 'UNASSIGNED' ? 'NAME_HEURISTIC' : info.confidence
          };
        },
        powerConnections,
        electricalMeasurements
      ),
    [powerNodes, equipmentList, jobCards, powerConnections, electricalMeasurements]
  );

  const hazards = useMemo(
    () =>
      evaluatePowerDistributionHazards(
        powerNodes,
        equipmentList,
        jobCards,
        powerConnections,
        electricalMeasurements,
        thresholds
      ),
    [powerNodes, equipmentList, jobCards, powerConnections, electricalMeasurements, thresholds]
  );

  const criticalAndHighHazards = useMemo(
    () => hazards.filter(h => h.severity === 'CRITICAL' || h.severity === 'HIGH'),
    [hazards]
  );

  const handleToggleBranch = useCallback((nodeId: string) => {
    setExpandedBranchIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleTogglePanelLoads = useCallback((panelId: FeederPanelId) => {
    setExpandedPanelIds(prev => {
      const next = new Set(prev);
      if (next.has(panelId)) {
        next.delete(panelId);
      } else {
        next.add(panelId);
      }
      return next;
    });
  }, []);

  const handleExpandHierarchyNode = useCallback((nodeId: string) => {
    setExpandedHierarchyNodeId(prev => {
      const next = prev === nodeId ? null : nodeId;
      if (next) {
        setInspectedNodeId(next);
        setExpandedBranchIds(branchSet => {
          const updated = new Set(branchSet);
          if (['C7', 'GEN_SET', 'C8', 'C9', 'C10'].includes(next)) updated.add('BUS_TX1');
          if (['C11', 'C12', 'C13', 'C18', 'C19', 'C20'].includes(next)) updated.add('BUS_TX2');
          if (['C18', 'C19', 'C20'].includes(next)) updated.add('C12');
          if (['C14', 'C15', 'C16', 'C17'].includes(next)) updated.add('BUS_TX3');
          return updated;
        });
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpandedBranchIds(new Set(DEFAULT_EXPANDED_BRANCHES));
    setExpandedPanelIds(new Set(FEEDER_PANELS.map(p => p.id)));
  }, []);

  const handleCollapseLoads = useCallback(() => {
    setExpandedPanelIds(new Set());
  }, []);

  const handleOpenNodeCondition = useCallback(
    (nodeId: string) => {
      const targetNode = nodeMap.get(nodeId);
      if (!targetNode) return;
      setInspectionDetailTarget(buildInspectionTargetFromNode(targetNode));
    },
    [nodeMap]
  );

  const handleOpenEquipmentCondition = useCallback((equipment: Equipment) => {
    setInspectionDetailTarget(buildInspectionTargetFromEquipment(equipment));
  }, []);

  const handleRaiseJobCard = useCallback(
    (prefill: ElectricalJobCardPrefill) => {
      setInspectionDetailTarget(null);
      if (onRaiseJobCardFromInspection) {
        onRaiseJobCardFromInspection(prefill);
      } else if (onNewJobCardForEquipment && prefill.equipmentId) {
        const eq = equipmentList.find((item) => item.id === prefill.equipmentId);
        if (eq) onNewJobCardForEquipment(eq);
      }
    },
    [onRaiseJobCardFromInspection, onNewJobCardForEquipment, equipmentList]
  );

  const { nodes: rfNodes, edges: rfEdges, matchedNodeIds } = useMemo(
    () =>
      buildSldDiagramElements({
        powerNodes,
        solved,
        equipmentList,
        jobCards,
        conditionSummaries,
        selectedNodeId: inspectedNodeId,
        expandedHierarchyNodeId,
        searchQuery,
        expandedBranchIds,
        expandedPanelIds,
        onSelectNode: (id) => setInspectedNodeId(id),
        onToggleBranch: handleToggleBranch,
        onTogglePanelLoads: handleTogglePanelLoads,
        onExpandHierarchyNode: handleExpandHierarchyNode,
        onInspectEquipment: onSelectEquipment,
        onOpenNodeCondition: handleOpenNodeCondition,
        onOpenEquipmentCondition: handleOpenEquipmentCondition,
        onNewJobCardForEquipment
      }),
    [
      powerNodes,
      solved,
      equipmentList,
      jobCards,
      conditionSummaries,
      inspectedNodeId,
      expandedHierarchyNodeId,
      searchQuery,
      expandedBranchIds,
      expandedPanelIds,
      handleToggleBranch,
      handleTogglePanelLoads,
      handleExpandHierarchyNode,
      onSelectEquipment,
      handleOpenNodeCondition,
      handleOpenEquipmentCondition,
      onNewJobCardForEquipment
    ]
  );

  // Sync when jumping into SLD from Grid/Table "Locate in SLD"
  useEffect(() => {
    if (!initialSelectedPanel) return;
    const panelMeta = FEEDER_PANELS.find(p => p.id === initialSelectedPanel);
    if (!panelMeta) return;

    setExpandedBranchIds(new Set(DEFAULT_EXPANDED_BRANCHES));
    setExpandedPanelIds(prev => {
      const next = new Set(prev);
      next.add(panelMeta.id);
      return next;
    });
    setInspectedNodeId(panelMeta.breakerId);
    setBranchWorkspaceNodeId(null);

    const timer = setTimeout(() => {
      fitView({
        nodes: [{ id: panelMeta.breakerId }, { id: `mcc-${panelMeta.id}` }],
        duration: 450,
        padding: 0.45
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [initialSelectedPanel, fitView]);

  // Sync when focusing a specific node from Workspace Summary / Alerts / Inspections
  useEffect(() => {
    if (!initialFocusNodeId) return;
    setInspectedNodeId(initialFocusNodeId);
    setBranchWorkspaceNodeId(null);
    const timer = setTimeout(() => {
      fitView({
        nodes: [{ id: initialFocusNodeId }],
        duration: 400,
        padding: 0.55
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [initialFocusNodeId, fitView]);

  // Auto-focus first search match on the diagram
  useEffect(() => {
    if (!searchQuery.trim() || matchedNodeIds.length === 0) return;
    const timer = setTimeout(() => {
      fitView({
        nodes: matchedNodeIds.slice(0, 4).map(id => ({ id })),
        duration: 400,
        padding: 0.4
      });
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery, matchedNodeIds, fitView]);

  // Re-fit diagram cleanly when returning from full branch workspace
  const handleBackFromWorkspace = useCallback(() => {
    setBranchWorkspaceNodeId(null);
    setTimeout(() => {
      fitView({ duration: 300, padding: 0.08 });
    }, 80);
  }, [fitView]);

  // Render dedicated full-page branch editor if requested
  const activeWorkspaceNode = branchWorkspaceNodeId
    ? nodeMap.get(branchWorkspaceNodeId) || null
    : null;

  const inspectedNode = inspectedNodeId ? nodeMap.get(inspectedNodeId) || null : null;
  const expandedHierarchyNode = expandedHierarchyNodeId
    ? nodeMap.get(expandedHierarchyNodeId) || null
    : null;
  const inspectedMetrics = inspectedNode
    ? computeNodeLoadMetrics(
        inspectedNode,
        powerNodes,
        equipmentList,
        jobCards,
        powerConnections,
        electricalMeasurements
      )
    : null;
  const inspectedUpstream = inspectedNode
    ? getUpstreamChain(inspectedNode.id, powerNodes, powerConnections)
    : [];
  const inspectedChildren = useMemo(() => {
    if (!inspectedNode) return [];
    const childIds = getDirectChildNodeIds(inspectedNode.id, solved.edges);
    if (childIds.length > 0) {
      return childIds
        .map(id => nodeMap.get(id))
        .filter((n): n is PowerDistributionNode => Boolean(n));
    }
    return powerNodes.filter(n => n.parentNodeId === inspectedNode.id);
  }, [inspectedNode, powerNodes, solved.edges, nodeMap]);
  const inspectedHazards = inspectedNode
    ? hazards.filter(h => h.affectedNodeIds.includes(inspectedNode.id))
    : [];

  const bus11kVState = solved.nodeStates.get('BUS_11KV');

  const inspectionModals = (
    <>
      <InspectionDetailModal
        isOpen={Boolean(inspectionDetailTarget)}
        target={inspectionDetailTarget}
        summary={
          inspectionDetailTarget
            ? conditionSummaries.get(inspectionDetailTarget.assetId) || null
            : null
        }
        allReviews={electricalInspectionReviews}
        equipmentList={equipmentList}
        jobCards={jobCards}
        currentUserName={currentUserName}
        userRole={userRole}
        userEmail={userEmail}
        onClose={() => setInspectionDetailTarget(null)}
        onStartNewInspection={(target) => {
          setCorrectsInspection(null);
          setInspectionFormTarget(target);
        }}
        onStartAmendment={(target, insp) => {
          setCorrectsInspection(insp);
          setInspectionFormTarget(target);
        }}
        onSubmitReview={async (params) => {
          if (onSubmitInspectionReview) {
            await onSubmitInspectionReview(params);
          }
        }}
        onRaiseJobCard={handleRaiseJobCard}
      />

      <ElectricalInspectionModal
        isOpen={Boolean(inspectionFormTarget)}
        target={inspectionFormTarget}
        templates={inspectionTemplates}
        currentUserName={currentUserName}
        userRole={userRole}
        userEmail={userEmail}
        correctsInspection={correctsInspection}
        onClose={() => {
          setInspectionFormTarget(null);
          setCorrectsInspection(null);
        }}
        onSubmitInspection={async (payload) => {
          if (onSubmitElectricalInspection) {
            await onSubmitElectricalInspection(payload);
          }
        }}
      />

      <InspectionTemplatesModal
        isOpen={showTemplatesModal}
        templates={inspectionTemplates}
        userRole={userRole}
        userEmail={userEmail}
        onClose={() => setShowTemplatesModal(false)}
        onSaveTemplate={async (template) => {
          if (onSaveInspectionTemplate) {
            await onSaveInspectionTemplate(template);
          }
        }}
      />
    </>
  );

  if (activeWorkspaceNode) {
    return (
      <>
        <PowerBranchDetailView
          node={activeWorkspaceNode}
          allNodes={powerNodes}
          powerConnections={powerConnections}
          electricalMeasurements={electricalMeasurements}
          equipmentList={equipmentList}
          jobCards={jobCards}
          hazards={hazards}
          currentUserName={currentUserName}
          userRole={userRole}
          userEmail={userEmail}
          onBackToOverview={handleBackFromWorkspace}
          onNavigateToNode={(id) => {
            setBranchWorkspaceNodeId(id);
            setInspectedNodeId(id);
          }}
          onUpdatePowerNode={onUpdatePowerNode}
          onModifyEquipment={onModifyEquipment}
          onInspectUpdateEquipment={onInspectUpdateEquipment}
          onDeleteEquipment={onDeleteEquipment}
          onCreatePowerConnection={onCreatePowerConnection}
          onDeletePowerConnection={onDeletePowerConnection}
          onRecordElectricalMeasurement={onRecordElectricalMeasurement}
          onCreateEquipment={onCreateEquipment}
          onNewJobCardForEquipment={onNewJobCardForEquipment}
          onInspectEquipment={onSelectEquipment}
          conditionSummaries={conditionSummaries}
          onOpenNodeCondition={handleOpenNodeCondition}
          onOpenEquipmentCondition={handleOpenEquipmentCondition}
        />
        {inspectionModals}
      </>
    );
  }

  return (
    <div className="bg-white text-slate-900 rounded-lg border border-slate-300 shadow-xs overflow-hidden flex flex-col">
      {/* Engineering Drawing Title & Control Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold shrink-0">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>SLD v2.0</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight truncate">
              USA Distillers — Plant Single-Line Power Distribution Diagram
            </h2>
            <p className="text-[10.5px] font-mono text-slate-500 truncate">
              11 kV / 6.3 kV / 400 V Distribution • Select any breaker, transformer, or MCC to inspect or switch
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Safety Hazard Flag */}
          {criticalAndHighHazards.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHazardModal(true)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 border cursor-pointer transition ${
                solved.c4C7Conflict
                  ? 'bg-red-600 text-white border-red-700 shadow-xs'
                  : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>
                {solved.c4C7Conflict
                  ? 'FAULT: C4 & C7 BOTH CLOSED'
                  : `${criticalAndHighHazards.length} Safety Flag (C4 ↔ C7)`}
              </span>
            </button>
          )}

          {/* Compact Deduplicated Telemetry Summary */}
          <div className="hidden xl:flex items-center gap-2 text-[11px] font-mono tabular-nums bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
            <span className="text-slate-500">Installed:</span>
            <strong className="text-slate-900">{solved.totalPlantKw} kW</strong>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Est Demand:</span>
            <strong className="text-amber-800">{solved.totalPlantEstimatedKva} kVA</strong>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Metered:</span>
            <strong className={solved.totalPlantMeasuredKva !== null ? 'text-emerald-800' : 'text-slate-500'}>
              {solved.totalPlantMeasuredKva !== null
                ? `${solved.totalPlantMeasuredKva} kVA (${solved.meteredTransformerCount}/3 Tx)`
                : `Unavail (${solved.meteredTransformerCount}/3 Tx)`}
            </strong>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Motors:</span>
            <strong className="text-slate-900">{bus11kVState?.connectedEquipmentCount ?? equipmentList.length}</strong>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-[10.5px] font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200">
            <ClipboardCheck className="w-3.5 h-3.5 text-indigo-700" />
            <span className="text-emerald-700 font-bold" title="Healthy assets">{conditionStats.healthy} OK</span>
            <span className="text-slate-300">/</span>
            <span className="text-amber-700 font-bold" title="Attention / Maint / Isolated">{conditionStats.attention} Attn</span>
            <span className="text-slate-300">/</span>
            <span className="text-red-700 font-bold" title="Fault Detected">{conditionStats.fault} Fault</span>
          </div>

          <button
            type="button"
            onClick={() => setShowTemplatesModal(true)}
            className="px-2 py-1 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-[11px] font-mono font-semibold flex items-center gap-1 cursor-pointer"
            title={canManageTemplates ? 'Manage electrical inspection checklists' : 'View electrical inspection checklists'}
          >
            <Settings2 className="w-3 h-3" />
            <span className="hidden md:inline">Checklists</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDraftThresholds(thresholds);
              setShowThresholdsModal(true);
            }}
            className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-mono font-semibold flex items-center gap-1 cursor-pointer"
            title="Configure electrical load, imbalance, voltage & PF alert thresholds"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span className="hidden md:inline">Thresholds</span>
          </button>

          {/* Search Input */}
          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find C4, MCC 1, pump..."
              className="w-full pl-8 pr-7 py-1 bg-slate-50 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-slate-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Expand / Fit Controls */}
          <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-white text-[11px] font-mono">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-2 py-1 hover:bg-slate-100 text-slate-700 flex items-center gap-1 cursor-pointer border-r border-slate-200"
              title="Expand all branches & panel motor loads"
            >
              <ChevronDown className="w-3 h-3" />
              <span className="hidden sm:inline">Expand Loads</span>
            </button>
            <button
              type="button"
              onClick={handleCollapseLoads}
              className="px-2 py-1 hover:bg-slate-100 text-slate-700 flex items-center gap-1 cursor-pointer border-r border-slate-200"
              title="Collapse motor lists inside MCC panels"
            >
              <ChevronRight className="w-3 h-3" />
              <span className="hidden sm:inline">Compact</span>
            </button>
            <button
              type="button"
              onClick={() => fitView({ duration: 350, padding: 0.08 })}
              className="px-2 py-1 hover:bg-slate-100 text-slate-800 font-semibold flex items-center gap-1 cursor-pointer"
              title="Fit full SLD to screen"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Fit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Workspace: Interactive SLD Canvas + Right Inspector Drawer */}
      <div className="flex flex-col lg:flex-row flex-1 bg-[#f8fafc]">
        <div
          className={`relative flex-1 min-w-0 transition-all ${
            expandedHierarchyNode ? 'h-[460px] lg:h-[520px]' : 'h-[680px] lg:h-[760px]'
          }`}
        >
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={sldNodeTypes}
            edgeTypes={sldEdgeTypes}
            fitView
            fitViewOptions={{ padding: 0.08 }}
            minZoom={0.18}
            maxZoom={2}
            nodesDraggable={false}
            nodesConnectable={false}
            edgesReconnectable={false}
            elementsSelectable
            deleteKeyCode={null}
            selectionKeyCode={null}
            multiSelectionKeyCode={null}
            panOnDrag
            zoomOnScroll
            onPaneClick={() => setInspectedNodeId(null)}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#cbd5e1"
            />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) => {
                if (n.type === 'switchboardZoneNode') return 'transparent';
                if (n.type === 'busbarNode') return '#0f172a';
                if (n.type === 'mccPanelNode') return '#0284c7';
                return '#64748b';
              }}
              nodeStrokeColor={(n) =>
                n.type === 'switchboardZoneNode' ? '#cbd5e1' : 'transparent'
              }
              maskColor="rgba(241, 245, 249, 0.7)"
              className="!border !border-slate-300 !bg-white !rounded"
            />
          </ReactFlow>
        </div>

        {inspectedNode && inspectedMetrics && (
          <SldInspectorDrawer
            node={inspectedNode}
            allNodes={powerNodes}
            powerConnections={powerConnections}
            electricalMeasurements={electricalMeasurements}
            jobCards={jobCards}
            solvedState={solved.nodeStates.get(inspectedNode.id)}
            loadMetrics={inspectedMetrics}
            upstreamChain={inspectedUpstream}
            childNodes={inspectedChildren}
            nodeHazards={inspectedHazards}
            currentUserName={currentUserName}
            userRole={userRole}
            userEmail={userEmail}
            isHierarchyExpanded={expandedHierarchyNodeId === inspectedNode.id}
            onClose={() => setInspectedNodeId(null)}
            onSelectNode={(id) => {
              setInspectedNodeId(id);
              fitView({ nodes: [{ id }], duration: 350, padding: 0.55 });
            }}
            onExpandHierarchyNode={handleExpandHierarchyNode}
            onOpenBranchWorkspace={(id) => setBranchWorkspaceNodeId(id)}
            onUpdatePowerNode={onUpdatePowerNode}
            onRecordElectricalMeasurement={onRecordElectricalMeasurement}
            onInspectEquipment={onSelectEquipment}
            onNewJobCardForEquipment={onNewJobCardForEquipment}
            onSelectJobCard={onSelectJobCard}
            conditionSummaries={conditionSummaries}
            onOpenNodeCondition={handleOpenNodeCondition}
            onOpenEquipmentCondition={handleOpenEquipmentCondition}
          />
        )}
      </div>

      {/* Inline Docked Hierarchical Branch & Internal MCC/DB Schematic Panel */}
      {expandedHierarchyNode && (
        <HierarchicalBranchPanel
          node={expandedHierarchyNode}
          allNodes={powerNodes}
          powerConnections={powerConnections}
          electricalMeasurements={electricalMeasurements}
          solved={solved}
          equipmentList={equipmentList}
          jobCards={jobCards}
          hazards={hazards}
          currentUserName={currentUserName}
          userRole={userRole}
          userEmail={userEmail}
          onSelectHierarchyNode={(id) => {
            setExpandedHierarchyNodeId(id);
            setInspectedNodeId(id);
            fitView({ nodes: [{ id }], duration: 350, padding: 0.5 });
          }}
          onSelectInspectorNode={(id) => setInspectedNodeId(id)}
          onCloseHierarchy={() => setExpandedHierarchyNodeId(null)}
          onOpenFullBranchWorkspace={(id) => setBranchWorkspaceNodeId(id)}
          onCreateEquipment={onCreateEquipment}
          onModifyEquipment={onModifyEquipment}
          onInspectUpdateEquipment={onInspectUpdateEquipment}
          onDeleteEquipment={onDeleteEquipment}
          onCreatePowerConnection={onCreatePowerConnection}
          onDeletePowerConnection={onDeletePowerConnection}
          onRecordElectricalMeasurement={onRecordElectricalMeasurement}
          onNewJobCardForEquipment={onNewJobCardForEquipment}
          conditionSummaries={conditionSummaries}
          onOpenNodeCondition={handleOpenNodeCondition}
          onOpenEquipmentCondition={handleOpenEquipmentCondition}
        />
      )}

      {/* Engineering Schematic Legend: Operating State + Maintenance Condition */}
      <div className="bg-white border-t border-slate-200 px-4 py-2.5 flex flex-col gap-2 text-[10.5px] font-mono text-slate-600">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3.5">
            <span className="font-bold uppercase tracking-wider text-[9.5px] text-slate-400">
              Operating State:
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-red-700 inline-block" />
              <span>11 kV / 6.3 kV HV Energized</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-teal-700 inline-block" />
              <span>400/415/420 V LV Energized</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-slate-400 inline-block" />
              <span>Open / De-energized</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dotted border-slate-300 inline-block" />
              <span>Decommissioned</span>
            </span>
            <button
              type="button"
              onClick={() => setShowHazardModal(true)}
              className="flex items-center gap-1 text-red-700 font-bold hover:underline cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Safety Watchdog ({hazards.length})</span>
            </button>
          </div>
          <span className="text-slate-500">
            Author: Bongani Dlamini & Sicelo Simelane • Scroll to zoom, drag canvas to pan
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1.5 border-t border-slate-100">
          <span className="font-bold uppercase tracking-wider text-[9.5px] text-slate-400">
            Maintenance Condition:
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Healthy</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            <span>Attention Required</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
            <span>Fault Detected</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
            <span>Under Maintenance</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
            <span>Isolated (LOTO)</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
            <span>Not Inspected</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
            <span>Decommissioned</span>
          </span>
        </div>
      </div>

      {/* ELECTRICAL DESIGN HAZARD & WATCHDOG MODAL */}
      {showHazardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 max-w-2xl w-full overflow-hidden">
            <div className="bg-red-700 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                <span className="font-bold text-sm">Plant Electrical Safety & Interlock Watchdog</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHazardModal(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto bg-slate-50">
              {hazards.map((hz) => (
                <div
                  key={hz.id}
                  className={`p-3.5 rounded border bg-white shadow-2xs space-y-1.5 text-xs ${
                    hz.severity === 'CRITICAL'
                      ? 'border-red-400'
                      : hz.severity === 'HIGH'
                      ? 'border-amber-400'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{hz.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {hz.dataBasis && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold border ${
                            hz.dataBasis === 'MEASURED' || hz.dataBasis === 'METERED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : hz.dataBasis === 'SAFETY_INTERLOCK'
                              ? 'bg-red-50 text-red-800 border-red-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {hz.dataBasis}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
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
                          type="button"
                          onClick={() => {
                            setShowHazardModal(false);
                            setInspectedNodeId(id);
                            fitView({ nodes: [{ id }], duration: 350, padding: 0.55 });
                          }}
                          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-700 text-white font-mono text-[10px] font-bold cursor-pointer"
                        >
                          Locate {id}
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

      {/* CONFIGURABLE ELECTRICAL ALERT THRESHOLDS MODAL */}
      {showThresholdsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 max-w-lg w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-teal-400" />
                <span className="font-bold text-sm">Electrical Monitoring Alert Thresholds</span>
              </div>
              <button
                type="button"
                onClick={() => setShowThresholdsModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs bg-slate-50">
              <p className="text-[11px] text-slate-600">
                Alerts generated from verified <strong>MEASURED / METERED</strong> readings are always flagged separately from <strong>ESTIMATED</strong> nameplate rollups.
              </p>
              <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded border border-slate-200 font-mono">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Tx High Load (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="150"
                    value={draftThresholds.transformerHighLoadPct}
                    onChange={(e) =>
                      setDraftThresholds(prev => ({ ...prev, transformerHighLoadPct: Number(e.target.value) || 80 }))
                    }
                    className="w-full px-2 py-1 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Tx Critical Load (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="150"
                    value={draftThresholds.transformerCriticalLoadPct}
                    onChange={(e) =>
                      setDraftThresholds(prev => ({ ...prev, transformerCriticalLoadPct: Number(e.target.value) || 95 }))
                    }
                    className="w-full px-2 py-1 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Breaker Warning (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="150"
                    value={draftThresholds.breakerWarningPct}
                    onChange={(e) =>
                      setDraftThresholds(prev => ({ ...prev, breakerWarningPct: Number(e.target.value) || 85 }))
                    }
                    className="w-full px-2 py-1 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Breaker Critical (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="150"
                    value={draftThresholds.breakerCriticalPct}
                    onChange={(e) =>
                      setDraftThresholds(prev => ({ ...prev, breakerCriticalPct: Number(e.target.value) || 100 }))
                    }
                    className="w-full px-2 py-1 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Phase Imbalance Warn (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={draftThresholds.phaseImbalanceWarnPct}
                    onChange={(e) =>
                      setDraftThresholds(prev => ({ ...prev, phaseImbalanceWarnPct: Number(e.target.value) || 15 }))
                    }
                    className="w-full px-2 py-1 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Min Power Factor Warn</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="1"
                    value={draftThresholds.minPowerFactorWarn}
                    onChange={(e) =>
                      setDraftThresholds(prev => ({ ...prev, minPowerFactorWarn: Number(e.target.value) || 0.85 }))
                    }
                    className="w-full px-2 py-1 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Voltage Dev Warn (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={draftThresholds.voltageDeviationWarnPct}
                    onChange={(e) =>
                      setDraftThresholds(prev => ({ ...prev, voltageDeviationWarnPct: Number(e.target.value) || 5 }))
                    }
                    className="w-full px-2 py-1 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Voltage Dev Critical (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={draftThresholds.voltageDeviationCriticalPct}
                    onChange={(e) =>
                      setDraftThresholds(prev => ({ ...prev, voltageDeviationCriticalPct: Number(e.target.value) || 10 }))
                    }
                    className="w-full px-2 py-1 border border-slate-300 rounded"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDraftThresholds(DEFAULT_ELECTRICAL_THRESHOLDS)}
                  className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Defaults</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowThresholdsModal(false)}
                    className="px-3 py-1.5 rounded border border-slate-300 bg-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setThresholds(draftThresholds);
                      try {
                        window.localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(draftThresholds));
                      } catch {
                        // Ignore storage quota errors
                      }
                      setShowThresholdsModal(false);
                    }}
                    className="px-4 py-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold cursor-pointer"
                  >
                    Apply Thresholds
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {inspectionModals}
    </div>
  );
};

export const PowerDistributionSLDView: React.FC<PowerDistributionSLDViewProps> = (props) => (
  <ReactFlowProvider>
    <PowerDistributionSLDCanvas {...props} />
  </ReactFlowProvider>
);
