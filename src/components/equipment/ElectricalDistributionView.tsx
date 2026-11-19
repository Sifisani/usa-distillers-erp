import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ClipboardCheck,
  Clock,
  Cpu,
  Gauge,
  Search,
  Settings2,
  ShieldAlert,
  X,
  Zap
} from 'lucide-react';
import {
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
  LoadDataSource,
  MaintenanceCondition,
  PowerConnection,
  PowerDistributionNode,
  PowerEdgeRole,
  PowerVoltageTier,
  UserProfile
} from '../../types';
import {
  DEFAULT_POWER_NODES,
  evaluatePowerDistributionHazards,
  resolveEquipmentFeederWithConfidence
} from '../../core/master-data/powerDistributionData';
import {
  CreateElectricalMeasurementInput,
  DEFAULT_ELECTRICAL_THRESHOLDS,
  resolveNominalNodeVoltageV
} from '../../core/electrical/loadCalculations';
import {
  AssetInspectionDueInfo,
  DEFAULT_INSPECTION_TEMPLATES,
  InspectionDueStatus,
  SubmitInspectionInput,
  collectElectricalMaintenanceAlerts,
  evaluateAssetInspectionDue,
  indexLatestInspectionsByAsset,
  resolveInspectionCategoryForNode,
  sortInspectionsNewestFirst
} from '../../core/electrical/inspections';
import { canManageInspectionTemplates, canSubmitElectricalInspection } from '../../core/electrical/permissions';
import { solvePlantElectricalState } from '../../core/electrical/topologySolver';
import { PowerDistributionSLDView } from './PowerDistributionSLDView';
import { ConditionBadge } from './sld/ConditionBadge';
import {
  ElectricalInspectionModal,
  InspectionTargetAsset,
  buildInspectionTargetFromEquipment,
  buildInspectionTargetFromNode
} from './sld/ElectricalInspectionModal';
import { InspectionDetailModal } from './sld/InspectionDetailModal';
import { InspectionTemplatesModal } from './sld/InspectionTemplatesModal';
import { LogMeasurementModal } from './sld/LogMeasurementModal';

export type ElectricalSubModule = 'diagram' | 'inspections' | 'loads';

interface ElectricalDistributionViewProps {
  powerNodes: PowerDistributionNode[];
  powerConnections?: PowerConnection[];
  electricalMeasurements?: ElectricalMeasurement[];
  equipmentList: Equipment[];
  jobCards: JobCard[];
  currentUserName: string;
  userRole?: UserProfile['role'] | null;
  userEmail?: string | null;
  activeSubModule?: ElectricalSubModule;
  onSubModuleChange?: (sub: ElectricalSubModule) => void;
  initialSelectedPanel?: FeederPanelId | null;
  onOpenEquipmentRegistry?: () => void;
  onSelectEquipment?: (equipment: Equipment) => void;
  onNewJobCardForEquipment?: (equipment: Equipment) => void;
  onSelectJobCard?: (card: JobCard) => void;
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
  globalSearchQuery?: string;
}

function dueBadgeMeta(due: AssetInspectionDueInfo): {
  label: string;
  cls: string;
} {
  switch (due.status) {
    case 'OVERDUE':
      return {
        label: `OVERDUE (${Math.abs(due.daysUntilDue ?? 0)}d)`,
        cls: 'bg-red-50 text-red-800 border-red-300'
      };
    case 'DUE_SOON':
      return {
        label: `DUE IN ${due.daysUntilDue ?? 0}d`,
        cls: 'bg-amber-50 text-amber-900 border-amber-300'
      };
    case 'CURRENT':
      return {
        label: `CURRENT (${due.daysUntilDue ?? 0}d left)`,
        cls: 'bg-emerald-50 text-emerald-800 border-emerald-300'
      };
    case 'DECOMMISSIONED':
      return {
        label: 'DECOMMISSIONED',
        cls: 'bg-slate-100 text-slate-600 border-slate-300'
      };
    case 'NEVER_INSPECTED':
    default:
      return {
        label: `NEVER INSPECTED (${due.intervalDays}d SLA)`,
        cls: 'bg-slate-100 text-slate-600 border-slate-300'
      };
  }
}

function loadSourceBadgeClass(source?: LoadDataSource | null): string {
  switch (source) {
    case 'METERED':
      return 'bg-sky-50 text-sky-900 border-sky-300';
    case 'MEASURED':
      return 'bg-emerald-50 text-emerald-900 border-emerald-300';
    case 'NAMEPLATE':
      return 'bg-slate-100 text-slate-700 border-slate-300';
    case 'ESTIMATED':
    default:
      return 'bg-amber-50 text-amber-900 border-amber-300';
  }
}

export const ElectricalDistributionView: React.FC<ElectricalDistributionViewProps> = ({
  powerNodes: rawPowerNodes,
  powerConnections = [],
  electricalMeasurements = [],
  equipmentList,
  jobCards,
  currentUserName,
  userRole,
  userEmail,
  activeSubModule = 'diagram',
  onSubModuleChange,
  initialSelectedPanel = null,
  onOpenEquipmentRegistry,
  onSelectEquipment,
  onNewJobCardForEquipment,
  onSelectJobCard,
  onUpdatePowerNode,
  onCreateEquipment,
  onModifyEquipment,
  onInspectUpdateEquipment,
  onDeleteEquipment,
  onCreatePowerConnection,
  onDeletePowerConnection,
  onRecordElectricalMeasurement,
  electricalInspections = [],
  electricalInspectionReviews = [],
  inspectionTemplates = DEFAULT_INSPECTION_TEMPLATES,
  onSubmitElectricalInspection,
  onSubmitInspectionReview,
  onSaveInspectionTemplate,
  onRaiseJobCardFromInspection,
  globalSearchQuery = ''
}) => {
  const powerNodes = rawPowerNodes.length > 0 ? rawPowerNodes : DEFAULT_POWER_NODES;
  const [internalTab, setInternalTab] = useState<ElectricalSubModule>(activeSubModule);
  const currentTab = onSubModuleChange ? activeSubModule : internalTab;
  const setTab = (next: ElectricalSubModule) => {
    setInternalTab(next);
    onSubModuleChange?.(next);
  };

  useEffect(() => {
    setInternalTab(activeSubModule);
  }, [activeSubModule]);

  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);

  // Inspection Tab State
  const [inspScope, setInspScope] = useState<'ALL' | 'POWER_NODE' | 'EQUIPMENT'>('ALL');
  const [inspFilter, setInspFilter] = useState<
    'ALL' | 'ACTION_NEEDED' | MaintenanceCondition | InspectionDueStatus | 'PENDING_REVIEW'
  >('ALL');
  const [inspSearch, setInspSearch] = useState(globalSearchQuery);

  // Shared Inspection / Measurement Modals
  const [inspectionDetailTarget, setInspectionDetailTarget] = useState<InspectionTargetAsset | null>(null);
  const [inspectionFormTarget, setInspectionFormTarget] = useState<InspectionTargetAsset | null>(null);
  const [correctsInspection, setCorrectsInspection] = useState<ElectricalInspection | null>(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [measurementTargetNode, setMeasurementTargetNode] = useState<PowerDistributionNode | null>(null);

  const canInspect = canSubmitElectricalInspection(userRole, userEmail);
  const canManageTemplates = canManageInspectionTemplates(userRole, userEmail);

  const conditionSummaries = useMemo(
    () => indexLatestInspectionsByAsset(electricalInspections, electricalInspectionReviews),
    [electricalInspections, electricalInspectionReviews]
  );

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
        DEFAULT_ELECTRICAL_THRESHOLDS
      ),
    [powerNodes, equipmentList, jobCards, powerConnections, electricalMeasurements]
  );

  const maintenanceAlerts = useMemo(
    () =>
      collectElectricalMaintenanceAlerts({
        powerNodes,
        equipmentList,
        conditionSummaries,
        hazards
      }),
    [powerNodes, equipmentList, conditionSummaries, hazards]
  );

  // Unified Asset Inspection Roster (Nodes + Registered Motors/Equipment)
  interface AssetInspectionRow {
    assetId: string;
    assetKind: 'POWER_NODE' | 'EQUIPMENT';
    code: string;
    name: string;
    categoryLabel: string;
    feederArea: string;
    operatingState: string;
    condition: MaintenanceCondition;
    summary: ReturnType<typeof conditionSummaries.get> | null;
    dueInfo: AssetInspectionDueInfo;
    target: InspectionTargetAsset;
  }

  const assetInspectionRows = useMemo<AssetInspectionRow[]>(() => {
    const rows: AssetInspectionRow[] = [];

    for (const node of powerNodes) {
      const target = buildInspectionTargetFromNode(node);
      const summary = conditionSummaries.get(node.id) || null;
      const isDecomm = node.operatingState === 'DECOMMISSIONED';
      const condition: MaintenanceCondition = isDecomm
        ? 'DECOMMISSIONED'
        : summary?.condition || 'NOT_INSPECTED';
      const dueInfo = evaluateAssetInspectionDue({
        assetCategory: resolveInspectionCategoryForNode(node),
        voltage: node.voltage,
        isDecommissioned: isDecomm,
        summary
      });

      rows.push({
        assetId: node.id,
        assetKind: 'POWER_NODE',
        code: node.code,
        name: node.name,
        categoryLabel: node.category.replace('_', ' '),
        feederArea: target.electricalFeeder,
        operatingState: node.operatingState,
        condition,
        summary,
        dueInfo,
        target
      });
    }

    for (const eq of equipmentList) {
      const target = buildInspectionTargetFromEquipment(eq);
      const summary = conditionSummaries.get(eq.id) || null;
      const condition: MaintenanceCondition = summary?.condition || 'NOT_INSPECTED';
      const dueInfo = evaluateAssetInspectionDue({
        assetCategory: 'MOTOR',
        isDecommissioned: false,
        summary
      });

      rows.push({
        assetId: eq.id,
        assetKind: 'EQUIPMENT',
        code: eq.code,
        name: eq.name,
        categoryLabel: 'MOTOR / LOAD',
        feederArea: target.electricalFeeder,
        operatingState: eq.status,
        condition,
        summary,
        dueInfo,
        target
      });
    }

    return rows;
  }, [powerNodes, equipmentList, conditionSummaries]);

  const inspectionKpis = useMemo(() => {
    let fault = 0;
    let attention = 0;
    let healthy = 0;
    let overdue = 0;
    let dueSoon = 0;
    let neverInspectedNodes = 0;
    let pendingReview = 0;

    for (const row of assetInspectionRows) {
      if (row.condition === 'FAULT_DETECTED') fault++;
      else if (row.condition === 'ATTENTION_REQUIRED' || row.condition === 'UNDER_MAINTENANCE' || row.condition === 'ISOLATED') attention++;
      else if (row.condition === 'HEALTHY') healthy++;

      if (row.dueInfo.status === 'OVERDUE') overdue++;
      else if (row.dueInfo.status === 'DUE_SOON') dueSoon++;
      else if (row.dueInfo.status === 'NEVER_INSPECTED' && row.assetKind === 'POWER_NODE') {
        neverInspectedNodes++;
      }

      if (row.summary?.reviewStatus === 'PENDING_REVIEW') pendingReview++;
    }

    return {
      fault,
      attention,
      healthy,
      overdue,
      dueSoon,
      neverInspectedNodes,
      pendingReview
    };
  }, [assetInspectionRows]);

  const filteredInspectionRows = useMemo(() => {
    const q = (inspSearch || globalSearchQuery).trim().toLowerCase();
    return assetInspectionRows.filter((row) => {
      if (inspScope !== 'ALL' && row.assetKind !== inspScope) return false;

      if (inspFilter === 'ACTION_NEEDED') {
        const isAction =
          row.condition === 'FAULT_DETECTED' ||
          row.condition === 'ATTENTION_REQUIRED' ||
          row.dueInfo.status === 'OVERDUE' ||
          row.dueInfo.status === 'DUE_SOON' ||
          row.summary?.reviewStatus === 'PENDING_REVIEW';
        if (!isAction) return false;
      } else if (inspFilter === 'PENDING_REVIEW') {
        if (row.summary?.reviewStatus !== 'PENDING_REVIEW') return false;
      } else if (
        inspFilter === 'OVERDUE' ||
        inspFilter === 'DUE_SOON' ||
        inspFilter === 'CURRENT' ||
        inspFilter === 'NEVER_INSPECTED'
      ) {
        if (row.dueInfo.status !== inspFilter) return false;
      } else if (inspFilter !== 'ALL') {
        if (row.condition !== inspFilter) return false;
      }

      if (!q) return true;
      return (
        row.code.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.feederArea.toLowerCase().includes(q) ||
        row.categoryLabel.toLowerCase().includes(q)
      );
    });
  }, [assetInspectionRows, inspScope, inspFilter, inspSearch, globalSearchQuery]);

  const recentInspections = useMemo(
    () => sortInspectionsNewestFirst(electricalInspections).slice(0, 15),
    [electricalInspections]
  );

  // Transformer & Source Summaries
  const transformerSummaries = useMemo(() => {
    return ['TX1', 'TX2', 'TX3']
      .map((id) => {
        const node = powerNodes.find((n) => n.id === id);
        if (!node) return null;
        const st = solved.nodeStates.get(id);
        const cond = conditionSummaries.get(id)?.condition || 'NOT_INSPECTED';
        const due = evaluateAssetInspectionDue({
          assetCategory: 'TRANSFORMER',
          voltage: node.voltage,
          isDecommissioned: node.operatingState === 'DECOMMISSIONED',
          summary: conditionSummaries.get(id) || null
        });
        return { node, st, cond, due };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [powerNodes, solved.nodeStates, conditionSummaries]);

  const sourceNodes = useMemo(() => {
    return ['EEC_SUPPLY', 'NEW_TURBINE', 'GEN_SET', 'OLD_TURBINE']
      .map((id) => {
        const node = powerNodes.find((n) => n.id === id);
        if (!node) return null;
        return { node, st: solved.nodeStates.get(id) };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [powerNodes, solved.nodeStates]);

  const loadMonitoringRows = useMemo(() => {
    const order = [
      'BUS_11KV',
      'TX1',
      'BUS_TX1',
      'C8',
      'C9',
      'C10',
      'TX2',
      'BUS_TX2',
      'C11',
      'C12',
      'C18',
      'C19',
      'C20',
      'C13',
      'TX3',
      'BUS_TX3',
      'C14',
      'C15',
      'C16',
      'C17'
    ];
    const nodeMap = new Map(powerNodes.map((n) => [n.id, n]));
    return order
      .map((id) => {
        const node = nodeMap.get(id);
        if (!node) return null;
        return {
          node,
          st: solved.nodeStates.get(id),
          cond: conditionSummaries.get(id)?.condition || 'NOT_INSPECTED'
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [powerNodes, solved.nodeStates, conditionSummaries]);

  const criticalAlertsCount = maintenanceAlerts.filter((a) => a.severity === 'CRITICAL').length;

  return (
    <div className="space-y-4">
      {/* TOP MODULE HEADER: Clear ERP Distinction Across 4 Sub-Domains */}
      <div className="bg-white rounded-md border border-slate-200 shadow-2xs p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-[#1b4332] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Zap className="w-5 h-5 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-black text-slate-900 tracking-tight">
                Electrical Distribution &amp; Power Monitoring
              </h1>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                11 kV / 400 V
              </span>
              {criticalAlertsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAlertsPanel((prev) => !prev)}
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-600 text-white flex items-center gap-1 cursor-pointer hover:bg-red-700"
                >
                  <ShieldAlert className="w-3 h-3" />
                  <span>{criticalAlertsCount} Critical Alert{criticalAlertsCount === 1 ? '' : 's'}</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Great Usuthu Plant Single-Line Diagram, Structured Asset Inspections, and Authoritative Load Telemetry
            </p>
          </div>
        </div>

        {/* Sub-Module Switcher + Cross-Link to Plant Equipment Registry */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded border border-slate-300 bg-slate-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setTab('diagram')}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-semibold cursor-pointer transition ${
                currentTab === 'diagram'
                  ? 'bg-[#714B67] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Distribution Diagram</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('inspections')}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-semibold cursor-pointer transition ${
                currentTab === 'inspections'
                  ? 'bg-[#714B67] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Electrical Inspections</span>
              {(inspectionKpis.fault + inspectionKpis.overdue + inspectionKpis.pendingReview) > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    currentTab === 'inspections'
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {inspectionKpis.fault + inspectionKpis.overdue + inspectionKpis.pendingReview}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab('loads')}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-semibold cursor-pointer transition ${
                currentTab === 'loads'
                  ? 'bg-[#714B67] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>Load Monitoring</span>
            </button>
          </div>

          {onOpenEquipmentRegistry && (
            <button
              type="button"
              onClick={onOpenEquipmentRegistry}
              className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              title="Switch to Plant Machinery & Motors Equipment Registry (105+ Assets)"
            >
              <Cpu className="w-3.5 h-3.5 text-[#1b4332]" />
              <span>Equipment Registry ({equipmentList.length})</span>
              <ArrowUpRight className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* TRANSFORMER SUMMARIES & MAINTENANCE / DUE KPI STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {transformerSummaries.map(({ node, st, cond, due }) => {
          const isMetered = st?.measuredApparentPowerKva !== null && st?.measuredApparentPowerKva !== undefined;
          const displayKva = isMetered ? st?.measuredApparentPowerKva : st?.estimatedOperatingKva ?? 0;
          const utilPct = st?.utilizationPct ?? 0;

          return (
            <div
              key={node.id}
              onClick={() => {
                setTab('diagram');
                setFocusNodeId(node.id);
              }}
              className="bg-white rounded-md border border-slate-200 hover:border-[#714B67] p-3 shadow-2xs cursor-pointer transition flex flex-col justify-between gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-black px-1.5 py-0.5 rounded bg-slate-900 text-white">
                      {node.code}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-slate-500">
                      {node.kva} kVA
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-800 truncate mt-1">
                    {node.description.split(' feeding ')[0]}
                  </div>
                </div>
                <ConditionBadge condition={cond} compact />
              </div>

              <div className="space-y-1 font-mono text-[10.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">
                    {isMetered ? 'Metered Demand:' : 'Est. Demand:'}
                  </span>
                  <span className="font-bold text-slate-900">
                    {displayKva} kVA{' '}
                    <span className="text-[9px] text-slate-500">
                      ({isMetered ? st?.measurementSource : 'EST'})
                    </span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      utilPct >= 95 ? 'bg-red-600' : utilPct >= 80 ? 'bg-amber-500' : 'bg-teal-600'
                    }`}
                    style={{ width: `${Math.min(100, utilPct)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[9.5px] text-slate-500">
                  <span>{st?.connectedEquipmentCount ?? 0} Motors • {utilPct}% Util</span>
                  <span
                    className={
                      due.status === 'OVERDUE'
                        ? 'text-red-700 font-bold'
                        : due.status === 'DUE_SOON'
                        ? 'text-amber-700 font-bold'
                        : ''
                    }
                  >
                    {due.status === 'CURRENT'
                      ? `Insp OK (${due.daysUntilDue}d)`
                      : due.status === 'OVERDUE'
                      ? 'Insp Overdue'
                      : due.status === 'DUE_SOON'
                      ? `Due ${due.daysUntilDue}d`
                      : 'Uninspected'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Plant Electrical Load & Source Summary Card */}
        <div
          onClick={() => setTab('loads')}
          className="bg-white rounded-md border border-slate-200 hover:border-teal-600 p-3 shadow-2xs cursor-pointer transition flex flex-col justify-between gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
              Plant Demand Summary
            </span>
            <span className="px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200 font-mono text-[9.5px] font-bold text-teal-800">
              {solved.activeHvSourceCount} HV Src{solved.activeHvSourceCount === 1 ? '' : 's'}
            </span>
          </div>
          <div className="font-mono space-y-0.5">
            <div className="text-base font-black text-slate-900">
              {solved.totalPlantEstimatedKva} kVA{' '}
              <span className="text-[10px] font-semibold text-amber-700">[EST]</span>
            </div>
            <div className="text-[10.5px] text-slate-600">
              Metered:{' '}
              <strong>
                {solved.totalPlantMeasuredKva !== null
                  ? `${solved.totalPlantMeasuredKva} kVA`
                  : `Unavailable (${solved.meteredTransformerCount}/3 Tx)`}
              </strong>
            </div>
            <div className="text-[10px] text-slate-500">
              Installed: {solved.totalPlantKw} kW across {equipmentList.length} motors
            </div>
          </div>
        </div>

        {/* Maintenance Condition & Inspection Due Card */}
        <div
          onClick={() => setShowAlertsPanel((prev) => !prev)}
          className="bg-white rounded-md border border-slate-200 hover:border-amber-500 p-3 shadow-2xs cursor-pointer transition flex flex-col justify-between gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
              Alerts &amp; Inspections Due
            </span>
            <span
              className={`px-1.5 py-0.5 rounded font-mono text-[9.5px] font-bold border ${
                maintenanceAlerts.length > 0
                  ? 'bg-red-50 text-red-800 border-red-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}
            >
              {maintenanceAlerts.length} Alert{maintenanceAlerts.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
            <div className="px-1.5 py-1 rounded bg-red-50/70 text-red-900 font-bold">
              Faults: {inspectionKpis.fault}
            </div>
            <div className="px-1.5 py-1 rounded bg-amber-50/70 text-amber-900 font-bold">
              Attn/Maint: {inspectionKpis.attention}
            </div>
            <div className="px-1.5 py-1 rounded bg-rose-50/70 text-rose-900 font-bold">
              Overdue: {inspectionKpis.overdue}
            </div>
            <div className="px-1.5 py-1 rounded bg-slate-100 text-slate-700 font-semibold">
              Uninsp Nodes: {inspectionKpis.neverInspectedNodes}
            </div>
          </div>
        </div>
      </div>

      {/* EXPANDABLE ACTIVE MAINTENANCE ALERTS PANEL */}
      {(showAlertsPanel || criticalAlertsCount > 0) && maintenanceAlerts.length > 0 && (
        <div className="bg-white rounded-md border border-amber-300 shadow-2xs overflow-hidden">
          <div className="px-3.5 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Active Electrical Maintenance Alerts &amp; Inspection Due Queue ({maintenanceAlerts.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setInspFilter('ACTION_NEEDED');
                  setTab('inspections');
                }}
                className="px-2 py-0.5 rounded bg-white border border-amber-300 hover:bg-amber-100 text-[11px] font-semibold text-amber-950 cursor-pointer"
              >
                Open Inspection Queue
              </button>
              <button
                type="button"
                onClick={() => setShowAlertsPanel(false)}
                className="text-amber-800 hover:text-amber-950 cursor-pointer"
                title="Collapse non-critical alerts"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {(showAlertsPanel || maintenanceAlerts.some((a) => a.severity === 'CRITICAL')) && (
            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {(showAlertsPanel
                ? maintenanceAlerts
                : maintenanceAlerts.filter((a) => a.severity === 'CRITICAL')
              )
                .slice(0, 12)
                .map((alert) => (
                  <div
                    key={alert.id}
                    className="px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-1.5 py-0.2 rounded font-mono text-[9.5px] font-bold uppercase ${
                            alert.severity === 'CRITICAL'
                              ? 'bg-red-100 text-red-800'
                              : alert.severity === 'HIGH'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-sky-100 text-sky-900'
                          }`}
                        >
                          {alert.severity} • {alert.sourceType.replace('_', ' ')}
                        </span>
                        <span className="font-bold text-slate-900">{alert.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5">{alert.detail}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {alert.assetKind === 'POWER_NODE' && (
                        <button
                          type="button"
                          onClick={() => {
                            setTab('diagram');
                            setFocusNodeId(alert.assetId);
                          }}
                          className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-700 text-white font-mono text-[10px] font-bold cursor-pointer"
                        >
                          Locate {alert.assetCode}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (alert.assetKind === 'POWER_NODE') {
                            const node = powerNodes.find((n) => n.id === alert.assetId);
                            if (node) setInspectionDetailTarget(buildInspectionTargetFromNode(node));
                          } else {
                            const eq = equipmentList.find((e) => e.id === alert.assetId);
                            if (eq) setInspectionDetailTarget(buildInspectionTargetFromEquipment(eq));
                          }
                        }}
                        className="px-2 py-1 rounded border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-mono text-[10px] font-bold cursor-pointer"
                      >
                        Inspect / History
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 1: INTERACTIVE ELECTRICAL SINGLE-LINE DIAGRAM */}
      {currentTab === 'diagram' && (
        <PowerDistributionSLDView
          powerNodes={powerNodes}
          powerConnections={powerConnections}
          electricalMeasurements={electricalMeasurements}
          equipmentList={equipmentList}
          jobCards={jobCards}
          currentUserName={currentUserName}
          userRole={userRole}
          userEmail={userEmail}
          initialSelectedPanel={initialSelectedPanel}
          initialFocusNodeId={focusNodeId}
          onUpdatePowerNode={onUpdatePowerNode}
          onModifyEquipment={onModifyEquipment}
          onInspectUpdateEquipment={onInspectUpdateEquipment}
          onDeleteEquipment={onDeleteEquipment}
          onCreatePowerConnection={onCreatePowerConnection}
          onDeletePowerConnection={onDeletePowerConnection}
          onRecordElectricalMeasurement={onRecordElectricalMeasurement}
          onCreateEquipment={onCreateEquipment}
          onSelectEquipment={onSelectEquipment}
          onNewJobCardForEquipment={onNewJobCardForEquipment}
          onSelectJobCard={onSelectJobCard}
          electricalInspections={electricalInspections}
          electricalInspectionReviews={electricalInspectionReviews}
          inspectionTemplates={inspectionTemplates}
          onSubmitElectricalInspection={onSubmitElectricalInspection}
          onSubmitInspectionReview={onSubmitInspectionReview}
          onSaveInspectionTemplate={onSaveInspectionTemplate}
          onRaiseJobCardFromInspection={onRaiseJobCardFromInspection}
        />
      )}

      {/* SUB-VIEW 2: ELECTRICAL INSPECTIONS WORKSPACE */}
      {currentTab === 'inspections' && (
        <div className="space-y-4">
          {/* Controls & Filters */}
          <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded border border-slate-300 overflow-hidden text-xs bg-slate-50">
                {(
                  [
                    { id: 'ALL', label: `All Assets (${assetInspectionRows.length})` },
                    { id: 'POWER_NODE', label: `Switchgear & Tx (${powerNodes.length})` },
                    { id: 'EQUIPMENT', label: `Motors & Loads (${equipmentList.length})` }
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setInspScope(tab.id)}
                    className={`px-2.5 py-1.5 font-semibold cursor-pointer transition ${
                      inspScope === tab.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <select
                value={inspFilter}
                onChange={(e) => setInspFilter(e.target.value as typeof inspFilter)}
                className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs text-slate-700 font-medium"
              >
                <option value="ALL">All Conditions &amp; SLA</option>
                <option value="ACTION_NEEDED">Action Needed (Faults / Overdue / Reviews)</option>
                <option value="FAULT_DETECTED">Fault Detected ({inspectionKpis.fault})</option>
                <option value="ATTENTION_REQUIRED">Attention Required</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                <option value="ISOLATED">Isolated (LOTO)</option>
                <option value="OVERDUE">Overdue Inspection ({inspectionKpis.overdue})</option>
                <option value="DUE_SOON">Due Within 14 Days ({inspectionKpis.dueSoon})</option>
                <option value="PENDING_REVIEW">Pending Supervisor Review ({inspectionKpis.pendingReview})</option>
                <option value="NEVER_INSPECTED">Never Inspected</option>
                <option value="HEALTHY">Healthy ({inspectionKpis.healthy})</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inspSearch}
                  onChange={(e) => setInspSearch(e.target.value)}
                  placeholder="Search tag, feeder, panel..."
                  className="w-full pl-8 pr-7 py-1.5 border border-slate-300 rounded text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-600"
                />
                {inspSearch && (
                  <button
                    type="button"
                    onClick={() => setInspSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowTemplatesModal(true)}
                className="px-3 py-1.5 rounded border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>{canManageTemplates ? 'Manage Checklists' : 'View Checklists'}</span>
              </button>
            </div>
          </div>

          {/* Electrical Asset Inspection Register Table */}
          <div className="bg-white rounded-md border border-slate-200 shadow-2xs overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-3">Asset Tag &amp; Name</th>
                  <th className="py-2.5 px-3">Type / Feeder</th>
                  <th className="py-2.5 px-3">Op State</th>
                  <th className="py-2.5 px-3">Maintenance Condition</th>
                  <th className="py-2.5 px-3">Latest Inspection</th>
                  <th className="py-2.5 px-3">SLA / Due Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInspectionRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 font-mono">
                      No electrical assets match the active inspection filter.
                    </td>
                  </tr>
                ) : (
                  filteredInspectionRows.slice(0, 80).map((row) => {
                    const dueMeta = dueBadgeMeta(row.dueInfo);
                    const latest = row.summary?.latestInspection;
                    return (
                      <tr key={`${row.assetKind}-${row.assetId}`} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white">
                              {row.code}
                            </span>
                            <span className="font-semibold text-slate-900">{row.name}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono text-[10.5px] text-slate-600">
                          <div>{row.categoryLabel}</div>
                          <div className="text-[10px] text-slate-400">{row.feederArea}</div>
                        </td>
                        <td className="py-2 px-3 font-mono text-[10.5px] font-semibold text-slate-700">
                          {row.operatingState}
                        </td>
                        <td className="py-2 px-3">
                          <ConditionBadge
                            condition={row.condition}
                            compact
                            onClick={() => setInspectionDetailTarget(row.target)}
                          />
                        </td>
                        <td className="py-2 px-3 font-mono text-[10.5px]">
                          {latest ? (
                            <div>
                              <div className="font-bold text-slate-800">{latest.inspectionNumber}</div>
                              <div className="text-[10px] text-slate-500">
                                {new Date(latest.inspectedAt).toLocaleDateString()} • {latest.technicianName}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded border font-mono text-[9.5px] font-bold ${dueMeta.cls}`}
                          >
                            {dueMeta.label}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {canInspect && row.condition !== 'DECOMMISSIONED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCorrectsInspection(null);
                                  setInspectionFormTarget(row.target);
                                }}
                                className="px-2 py-1 rounded bg-indigo-700 hover:bg-indigo-800 text-white font-mono text-[10px] font-bold cursor-pointer"
                              >
                                Inspect
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setInspectionDetailTarget(row.target)}
                              className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold cursor-pointer"
                            >
                              History ({row.summary?.totalInspections ?? 0})
                            </button>
                            {row.assetKind === 'POWER_NODE' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFocusNodeId(row.assetId);
                                  setTab('diagram');
                                }}
                                className="px-2 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-semibold cursor-pointer"
                                title="Locate on Single-Line Diagram"
                              >
                                SLD
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {filteredInspectionRows.length > 80 && (
              <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 font-mono text-[10.5px] text-slate-500 text-center">
                Showing first 80 of {filteredInspectionRows.length} assets. Refine search or filter to narrow results.
              </div>
            )}
          </div>

          {/* Recent Inspection Ledger */}
          <div className="bg-white rounded-md border border-slate-200 shadow-2xs p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-700" />
                <span>Recent Plant Electrical Inspection Ledger ({electricalInspections.length})</span>
              </h3>
            </div>
            {recentInspections.length === 0 ? (
              <div className="py-6 text-center font-mono text-xs text-slate-400 border border-dashed border-slate-200 rounded">
                No electrical inspections logged yet. Select any switchgear node or motor above to record an inspection.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {recentInspections.map((insp) => {
                  const summary = conditionSummaries.get(insp.assetId);
                  return (
                    <div
                      key={insp.id}
                      onClick={() => {
                        if (insp.assetKind === 'POWER_NODE') {
                          const node = powerNodes.find((n) => n.id === insp.assetId);
                          if (node) setInspectionDetailTarget(buildInspectionTargetFromNode(node));
                        } else {
                          const eq = equipmentList.find((e) => e.id === insp.assetId);
                          if (eq) setInspectionDetailTarget(buildInspectionTargetFromEquipment(eq));
                        }
                      }}
                      className="p-2.5 rounded border border-slate-200 hover:border-indigo-400 bg-slate-50/50 cursor-pointer space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span className="font-bold text-slate-900">{insp.inspectionNumber}</span>
                        <span className="text-slate-500">
                          {new Date(insp.inspectedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-800 truncate">
                          {insp.assetCode} — {insp.assetName}
                        </span>
                        <ConditionBadge condition={insp.conditionAssessment} compact />
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">{insp.observations}</p>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-200/70">
                        <span>{insp.technicianName}</span>
                        <span>{summary?.latestInspection?.id === insp.id ? (summary.reviewStatus || 'PENDING_REVIEW').replace('_', ' ') : 'HISTORICAL'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: ELECTRICAL LOAD MONITORING WORKSPACE */}
      {currentTab === 'loads' && (
        <div className="space-y-4">
          {/* Source Data Classification Banner */}
          <div className="bg-white rounded-md border border-slate-200 shadow-2xs p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-700 shrink-0" />
              <span className="font-bold text-slate-900">
                Authoritative Hierarchical Load Engine (`computeNodeLoadMetrics`)
              </span>
              <span className="text-slate-500 hidden md:inline">
                — Deduplicated plant demand across disjoint Tx1/Tx2/Tx3 subtrees; nameplate estimates are never presented as metered demand.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[9.5px] font-bold">
              <span className={`px-1.5 py-0.5 rounded border ${loadSourceBadgeClass('METERED')}`}>METERED (Panel Meter)</span>
              <span className={`px-1.5 py-0.5 rounded border ${loadSourceBadgeClass('MEASURED')}`}>MEASURED (Field Clamp)</span>
              <span className={`px-1.5 py-0.5 rounded border ${loadSourceBadgeClass('ESTIMATED')}`}>ESTIMATED (Calculated)</span>
              <span className={`px-1.5 py-0.5 rounded border ${loadSourceBadgeClass('NAMEPLATE')}`}>NAMEPLATE (Rated)</span>
            </div>
          </div>

          {/* Power Sources Separation: Shared Bus Demand vs Source Actual Output */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {sourceNodes.map(({ node, st }) => (
              <div
                key={node.id}
                className="bg-white rounded-md border border-slate-200 shadow-2xs p-3 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-black px-1.5 py-0.5 rounded bg-slate-900 text-white">
                    {node.code}
                  </span>
                  <span
                    className={`font-mono text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${
                      node.operatingState === 'CLOSED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : node.operatingState === 'DECOMMISSIONED'
                        ? 'bg-slate-100 text-slate-500 border-slate-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {node.operatingState}
                  </span>
                </div>
                <div className="font-bold text-slate-900 truncate">{node.name}</div>
                <div className="font-mono text-[10.5px] space-y-0.5 pt-1 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rated Capacity:</span>
                    <strong>
                      {node.kva ? `${node.kva} kVA` : 'Utility Supply'}
                      {node.powerMw ? ` (${node.powerMw} MW)` : ''}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shared Bus Est:</span>
                    <span>
                      {st?.sharedBusDemandKva ?? 0} kVA / {st?.sharedBusDemandAmps ?? 0} A
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Actual Output:</span>
                    <strong className={st?.sourceActualOutputKva !== null ? 'text-emerald-800' : 'text-slate-400'}>
                      {st?.sourceActualOutputKva !== null && st?.sourceActualOutputKva !== undefined
                        ? `${st.sourceActualOutputKva} kVA`
                        : st?.sourceActualOutputAmps !== null && st?.sourceActualOutputAmps !== undefined
                        ? `${st.sourceActualOutputAmps} A`
                        : 'Unmetered'}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Distribution Hierarchy Load Table */}
          <div className="bg-white rounded-md border border-slate-200 shadow-2xs overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-3">Node / Feeder</th>
                  <th className="py-2.5 px-3">Energization</th>
                  <th className="py-2.5 px-3">Motors / Installed kW</th>
                  <th className="py-2.5 px-3">Estimated Demand</th>
                  <th className="py-2.5 px-3">Field / Meter Reading</th>
                  <th className="py-2.5 px-3">PF / Hz / Imbalance</th>
                  <th className="py-2.5 px-3">Util %</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {loadMonitoringRows.map(({ node, st, cond }) => {
                  const hasMeas = Boolean(st?.measurementSource);
                  return (
                    <tr key={node.id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-sans">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white">
                            {node.code}
                          </span>
                          <span className="font-semibold text-slate-900">{node.name}</span>
                          <ConditionBadge condition={cond} compact />
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                          {node.voltage} {node.ratedAmps ? `• Rated ${node.ratedAmps}A` : ''}
                          {node.kva ? `• ${node.kva}kVA` : ''}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[9.5px] font-bold ${
                            st?.energization === 'FAULT_BACKFEED'
                              ? 'bg-red-600 text-white border-red-700'
                              : st?.energization === 'ENERGIZED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {st?.energization?.replace('_', ' ') || 'DE_ENERGIZED'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900">{st?.connectedKw ?? 0} kW</div>
                        <div className="text-[10px] text-slate-500">
                          {st?.connectedEquipmentCount ?? 0} Motors ({st?.operationalEquipmentCount ?? 0} Op)
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900">
                          {st?.liveAmps ?? 0} A • {st?.estimatedOperatingKva ?? 0} kVA
                        </div>
                        <span className={`inline-block mt-0.5 px-1 rounded border text-[8.5px] font-bold ${loadSourceBadgeClass('ESTIMATED')}`}>
                          ESTIMATED
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {hasMeas ? (
                          <div>
                            <div className="font-bold text-emerald-900">
                              {st?.measuredCurrentAmps ?? '—'} A • {st?.measuredActivePowerKw ?? '—'} kW / {st?.measuredApparentPowerKva ?? '—'} kVA
                            </div>
                            <span className={`inline-block mt-0.5 px-1 rounded border text-[8.5px] font-bold ${loadSourceBadgeClass(st?.measurementSource)}`}>
                              {st?.measurementSource}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Unavailable</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-[10.5px]">
                        <div>
                          PF: {st?.measuredPowerFactor ?? '—'} • {st?.measuredFrequencyHz ?? '—'}Hz
                        </div>
                        <div className="text-slate-500">
                          Imbal: {st?.phaseImbalancePct !== null && st?.phaseImbalancePct !== undefined ? `${st.phaseImbalancePct}%` : '—'}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        {st?.utilizationPct !== null && st?.utilizationPct !== undefined ? (
                          <span
                            className={`font-bold ${
                              st.utilizationPct >= 85 ? 'text-red-700' : 'text-slate-900'
                            }`}
                          >
                            {st.utilizationPct}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {onRecordElectricalMeasurement && (
                            <button
                              type="button"
                              onClick={() => setMeasurementTargetNode(node)}
                              className="px-2 py-1 rounded bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Log Reading
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setFocusNodeId(node.id);
                              setTab('diagram');
                            }}
                            className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-semibold cursor-pointer"
                          >
                            SLD
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SHARED WORKSPACE MODALS (Inspections, Templates, Measurements) */}
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
        onRaiseJobCard={(prefill) => {
          setInspectionDetailTarget(null);
          onRaiseJobCardFromInspection?.(prefill);
        }}
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

      {measurementTargetNode && onRecordElectricalMeasurement && (
        <LogMeasurementModal
          assetId={measurementTargetNode.id}
          assetKind="POWER_NODE"
          assetCode={measurementTargetNode.code}
          assetName={measurementTargetNode.name}
          nominalVoltageV={resolveNominalNodeVoltageV(measurementTargetNode)}
          targetNode={measurementTargetNode}
          currentUserName={currentUserName}
          onClose={() => setMeasurementTargetNode(null)}
          onSubmitMeasurement={onRecordElectricalMeasurement}
        />
      )}
    </div>
  );
};
