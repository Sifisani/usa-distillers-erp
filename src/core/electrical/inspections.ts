/**
 * Pure Domain Module: Structured Electrical Asset Inspections
 *
 * - Structured checklists by asset type (Circuit Breaker, Transformer, Motor, MCC/DB)
 * - Dedicated MaintenanceCondition state decoupled from operatingState
 * - Chronological inspection ledger indexing & latest condition resolution
 * - Input validation & Firestore-bounded photo constraints
 * - Prefill builder linking inspection faults cleanly to the existing ERP Job Card workflow
 */

import {
  ElectricalInspection,
  ElectricalInspectionReview,
  ElectricalJobCardPrefill,
  ElectricalMeasurementValues,
  Equipment,
  InspectionAssetCategory,
  InspectionChecklistResponse,
  InspectionPhotoAttachment,
  InspectionReviewStatus,
  InspectionTemplate,
  MaintenanceCondition,
  PowerDistributionNode,
  Priority,
  UserProfile
} from '../../types';
import { FEEDER_PANELS } from '../master-data/powerDistributionData';

export const MAINTENANCE_CONDITIONS: ReadonlyArray<MaintenanceCondition> = [
  'HEALTHY',
  'ATTENTION_REQUIRED',
  'FAULT_DETECTED',
  'UNDER_MAINTENANCE',
  'ISOLATED',
  'DECOMMISSIONED',
  'NOT_INSPECTED'
];

export const MAX_INSPECTION_PHOTOS = 4;
export const MAX_PHOTO_DATA_URL_BYTES = 220_000;

export const DEFAULT_INSPECTION_TEMPLATES: Record<InspectionAssetCategory, InspectionTemplate> = {
  CIRCUIT_BREAKER: {
    id: 'CIRCUIT_BREAKER',
    category: 'CIRCUIT_BREAKER',
    title: 'Circuit Breaker / Switchgear Inspection',
    description: '11kV VCB, 400V ACB/MCCB, and HV fused switch-disconnector condition checklist.',
    version: 1,
    items: [
      { id: 'cb_physical', label: 'Physical condition', guidance: 'Enclosure integrity, door latches, arc chutes, and labeling', required: true },
      { id: 'cb_contacts', label: 'Contact condition', guidance: 'Main/arcing contact wear, pitting, or vacuum bottle indicator', required: true },
      { id: 'cb_terminals', label: 'Terminal connections', guidance: 'Torque marks, lugs, bus stabs, and absence of looseness', required: true },
      { id: 'cb_insulation', label: 'Insulation condition', guidance: 'Tracking, moisture, flashover soot, or insulation resistance test', required: true },
      { id: 'cb_mechanical', label: 'Mechanical operation', guidance: 'Spring charging, trip/close mechanism smoothness, interlocks', required: true },
      { id: 'cb_thermal', label: 'Thermal condition', guidance: 'IR thermography hotspot scan across phases and terminations', required: true },
      { id: 'cb_protection', label: 'Protection settings', guidance: 'OCR/earth fault relay settings verified against coordination schedule', required: true },
      { id: 'cb_general', label: 'General observations', guidance: 'Panel heater, auxiliary wiring, and cabinet cleanliness', required: false }
    ]
  },
  TRANSFORMER: {
    id: 'TRANSFORMER',
    category: 'TRANSFORMER',
    title: 'Power Transformer Inspection',
    description: '11kV/400V step-down and 6.3kV/11kV step-up transformer preventive inspection.',
    version: 1,
    items: [
      { id: 'tx_oil_cond', label: 'Oil condition', guidance: 'Sight glass level, colour, silica gel breather moisture saturation', required: true },
      { id: 'tx_oil_leak', label: 'Oil leakage', guidance: 'Radiator fins, tank gaskets, drain valve, and bushing seals', required: true },
      { id: 'tx_temp', label: 'Temperature', guidance: 'Top oil and winding temperature gauges vs ambient & load', required: true },
      { id: 'tx_cooling', label: 'Cooling system', guidance: 'Cooling fins airflow, bund integrity, and forced fan operation if fitted', required: true },
      { id: 'tx_terminals', label: 'Terminal condition', guidance: 'HV/LV cable boxes, bushings, earth straps, and lugs', required: true },
      { id: 'tx_insulation', label: 'Insulation condition', guidance: 'Porcelain bushings crack-free, Megger/dielectric test notes', required: true },
      { id: 'tx_physical', label: 'Physical condition', guidance: 'Buchholz relay, pressure relief vent, fencing, and danger signage', required: true }
    ]
  },
  MOTOR: {
    id: 'MOTOR',
    category: 'MOTOR',
    title: 'Plant Motor & Drive Inspection',
    description: 'AC induction motor, starter/VSD field electrical & mechanical health check.',
    version: 1,
    items: [
      { id: 'mtr_bearings', label: 'Bearing condition', guidance: 'DE/NDE bearing housing temperature, grease seal integrity', required: true },
      { id: 'mtr_vibration', label: 'Vibration', guidance: 'Radial/axial vibration severity and mounting bolt tightness', required: true },
      { id: 'mtr_temp', label: 'Temperature', guidance: 'Frame, winding surface, and cooling cowl thermal check', required: true },
      { id: 'mtr_insulation', label: 'Insulation test results', guidance: 'Winding-to-earth IR (MΩ) and phase balance check when isolated', required: true },
      { id: 'mtr_terminals', label: 'Terminal connections', guidance: 'Terminal box gasket, brass glands, phase lugs, and earth stud', required: true },
      { id: 'mtr_current', label: 'Current measurements', guidance: 'Clamp-meter L1/L2/L3 amps vs nameplate FLA and O/L setting', required: true },
      { id: 'mtr_noise', label: 'Noise', guidance: 'Magnetic hum, fan cowl rub, or bearing whine', required: true },
      { id: 'mtr_physical', label: 'Physical condition', guidance: 'Cooling fan cowl, coupling guard, nameplate legibility', required: true }
    ]
  },
  MCC_DB: {
    id: 'MCC_DB',
    category: 'MCC_DB',
    title: 'MCC & Distribution Board Inspection',
    description: 'Motor Control Centre, main LV busbar, and plant distribution board inspection.',
    version: 1,
    items: [
      { id: 'mcc_busbar', label: 'Busbar condition', guidance: 'Main/dropper copper bars, supports, heat discoloration, phase barriers', required: true },
      { id: 'mcc_breakers', label: 'Circuit breaker condition', guidance: 'Incoming/outgoing ACB/MCCB toggle/indicator integrity', required: true },
      { id: 'mcc_cables', label: 'Cable terminations', guidance: 'Outgoing feeder glands, ferruled control wires, crimp lugs', required: true },
      { id: 'mcc_overheat', label: 'Signs of overheating', guidance: 'Discolored insulation, burnt odor, or thermal scan hot spots', required: true },
      { id: 'mcc_clean', label: 'Panel cleanliness', guidance: 'Dust/molasses/moisture ingress, door seals, and filter mats', required: true },
      { id: 'mcc_earthing', label: 'Earthing condition', guidance: 'Main earth bar bond, door earth braids, armour clamp continuity', required: true },
      { id: 'mcc_protection', label: 'Protection equipment condition', guidance: 'Overload relays, VSD fault logs, meters, and surge arrestors', required: true }
    ]
  }
};

export function resolveInspectionCategoryForNode(node: PowerDistributionNode): InspectionAssetCategory {
  switch (node.category) {
    case 'TRANSFORMER':
    case 'STEP_UP_TX':
      return 'TRANSFORMER';
    case 'BUSBAR':
    case 'CONTROL_CENTRE':
      return 'MCC_DB';
    case 'BREAKER':
    case 'HV_FUSE':
    case 'SOURCE':
    case 'METERING_TX':
    default:
      return 'CIRCUIT_BREAKER';
  }
}

export function resolvePlantAreaForNode(node: PowerDistributionNode): string {
  if (node.feederPanelId) {
    const panel = FEEDER_PANELS.find((p) => p.id === node.feederPanelId);
    if (panel) return `${panel.name} (${panel.transformerSource})`;
  }
  return node.location || node.groupSection;
}

export function getConditionDisplayMeta(condition: MaintenanceCondition): {
  label: string;
  shortLabel: string;
  badgeClass: string;
  dotClass: string;
} {
  switch (condition) {
    case 'HEALTHY':
      return {
        label: 'Healthy',
        shortLabel: 'HEALTHY',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        dotClass: 'bg-emerald-500'
      };
    case 'ATTENTION_REQUIRED':
      return {
        label: 'Attention Required',
        shortLabel: 'ATTN REQ',
        badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
        dotClass: 'bg-amber-500'
      };
    case 'FAULT_DETECTED':
      return {
        label: 'Fault Detected',
        shortLabel: 'FAULT',
        badgeClass: 'bg-red-50 text-red-800 border-red-300',
        dotClass: 'bg-red-600'
      };
    case 'UNDER_MAINTENANCE':
      return {
        label: 'Under Maintenance',
        shortLabel: 'MAINT',
        badgeClass: 'bg-sky-50 text-sky-900 border-sky-300',
        dotClass: 'bg-sky-500'
      };
    case 'ISOLATED':
      return {
        label: 'Isolated (LOTO)',
        shortLabel: 'ISOLATED',
        badgeClass: 'bg-purple-50 text-purple-900 border-purple-300',
        dotClass: 'bg-purple-600'
      };
    case 'DECOMMISSIONED':
      return {
        label: 'Decommissioned',
        shortLabel: 'DECOMM',
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
        dotClass: 'bg-slate-400'
      };
    case 'NOT_INSPECTED':
    default:
      return {
        label: 'Not Inspected',
        shortLabel: 'UNINSP',
        badgeClass: 'bg-slate-50 text-slate-500 border-slate-200',
        dotClass: 'bg-slate-300'
      };
  }
}

export interface AssetConditionSummary {
  assetId: string;
  condition: MaintenanceCondition;
  latestInspection: ElectricalInspection | null;
  latestReview: ElectricalInspectionReview | null;
  reviewStatus: InspectionReviewStatus | null;
  totalInspections: number;
  inspections: ElectricalInspection[];
}

export function sortInspectionsNewestFirst(
  inspections: ElectricalInspection[]
): ElectricalInspection[] {
  return [...inspections].sort((a, b) => {
    const inspectedDiff = new Date(b.inspectedAt).getTime() - new Date(a.inspectedAt).getTime();
    if (!Number.isNaN(inspectedDiff) && inspectedDiff !== 0) return inspectedDiff;
    const createdDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (!Number.isNaN(createdDiff) && createdDiff !== 0) return createdDiff;
    return b.id.localeCompare(a.id);
  });
}

export function indexLatestReviewsByInspection(
  reviews: ElectricalInspectionReview[]
): Map<string, ElectricalInspectionReview> {
  const sorted = [...reviews].sort((a, b) => {
    const tDiff = new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime();
    if (!Number.isNaN(tDiff) && tDiff !== 0) return tDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const map = new Map<string, ElectricalInspectionReview>();
  for (const r of sorted) {
    if (!map.has(r.inspectionId)) {
      map.set(r.inspectionId, r);
    }
  }
  return map;
}

export function indexLatestInspectionsByAsset(
  inspections: ElectricalInspection[],
  reviews: ElectricalInspectionReview[] = []
): Map<string, AssetConditionSummary> {
  const sorted = sortInspectionsNewestFirst(inspections);
  const reviewsByInspection = indexLatestReviewsByInspection(reviews);
  const grouped = new Map<string, ElectricalInspection[]>();

  for (const insp of sorted) {
    const list = grouped.get(insp.assetId) || [];
    list.push(insp);
    grouped.set(insp.assetId, list);
  }

  const summaries = new Map<string, AssetConditionSummary>();
  grouped.forEach((assetInspections, assetId) => {
    const latest = assetInspections[0] || null;
    const latestReview = latest ? reviewsByInspection.get(latest.id) || null : null;
    summaries.set(assetId, {
      assetId,
      condition: latest ? latest.conditionAssessment : 'NOT_INSPECTED',
      latestInspection: latest,
      latestReview,
      reviewStatus: latest ? (latestReview?.decision || 'PENDING_REVIEW') : null,
      totalInspections: assetInspections.length,
      inspections: assetInspections
    });
  });

  return summaries;
}

export function resolveAssetMaintenanceCondition(
  assetId: string,
  summaries: Map<string, AssetConditionSummary>,
  isDecommissionedFallback = false
): MaintenanceCondition {
  const summary = summaries.get(assetId);
  if (summary?.latestInspection) {
    return summary.condition;
  }
  return isDecommissionedFallback ? 'DECOMMISSIONED' : 'NOT_INSPECTED';
}

export interface SubmitInspectionInput {
  assetId: string;
  assetKind: 'POWER_NODE' | 'EQUIPMENT';
  assetCode: string;
  assetName: string;
  assetCategory: InspectionAssetCategory;
  plantArea: string;
  electricalFeeder: string;
  conditionAssessment: MaintenanceCondition;
  operatingStateSnapshot?: string;
  templateId: InspectionAssetCategory;
  templateVersion: number;
  checklistResults: InspectionChecklistResponse[];
  measurements?: ElectricalMeasurementValues;
  measurementSource?: 'MEASURED' | 'METERED';
  insulationResistanceMohm?: number;
  windingTempC?: number;
  ambientTempC?: number;
  observations: string;
  photos: InspectionPhotoAttachment[];
  recommendations: string;
  followUpRequired: boolean;
  followUpAction?: string;
  recommendedPriority?: Priority;
  technicianId: string;
  technicianName: string;
  technicianRole: UserProfile['role'];
  inspectedAt: string;
  correctsInspectionId?: string;
  amendmentReason?: string;
  idempotencyKey?: string;
}

export function validateElectricalInspectionInput(
  input: SubmitInspectionInput
): { valid: boolean; error?: string } {
  if (!input.assetId.trim() || !input.assetCode.trim() || !input.assetName.trim()) {
    return { valid: false, error: 'Target electrical asset ID, code, and name are required.' };
  }
  if (!MAINTENANCE_CONDITIONS.includes(input.conditionAssessment) || input.conditionAssessment === 'NOT_INSPECTED') {
    return {
      valid: false,
      error: 'Select an explicit Maintenance Condition assessment (Healthy, Attention Required, Fault Detected, Under Maintenance, Isolated, or Decommissioned).'
    };
  }
  if (!input.technicianId.trim() || !input.technicianName.trim()) {
    return { valid: false, error: 'Authenticated technician identity is required to submit an inspection.' };
  }
  const parsedTime = Date.parse(input.inspectedAt);
  if (Number.isNaN(parsedTime)) {
    return { valid: false, error: 'Valid inspection date and time are required.' };
  }
  if (!Array.isArray(input.checklistResults) || input.checklistResults.length === 0) {
    return { valid: false, error: 'Inspection checklist results cannot be empty.' };
  }
  if (!input.observations.trim()) {
    return { valid: false, error: 'Field inspection observations are required.' };
  }
  if (input.observations.length > 3000 || input.recommendations.length > 2000) {
    return { valid: false, error: 'Observations or recommendations exceed maximum length.' };
  }
  if (input.followUpRequired && !input.recommendations.trim() && !(input.followUpAction || '').trim()) {
    return {
      valid: false,
      error: 'Recommendations or follow-up action are required when Follow-Up Required is flagged.'
    };
  }
  if (input.correctsInspectionId && !(input.amendmentReason || '').trim()) {
    return {
      valid: false,
      error: 'An amendment reason is required when logging a corrective inspection record.'
    };
  }
  if (input.photos.length > MAX_INSPECTION_PHOTOS) {
    return {
      valid: false,
      error: `Maximum ${MAX_INSPECTION_PHOTOS} inspection photos are allowed per submission.`
    };
  }
  for (const photo of input.photos) {
    if (!photo.dataUrl || photo.dataUrl.length > MAX_PHOTO_DATA_URL_BYTES) {
      return {
        valid: false,
        error: `Photo "${photo.name}" exceeds maximum compressed size (${Math.round(MAX_PHOTO_DATA_URL_BYTES / 1000)} KB).`
      };
    }
  }
  return { valid: true };
}

export function buildInspectionNumber(existingCount = 0): string {
  const year = new Date().getFullYear();
  const seq = String(existingCount + 1).padStart(4, '0');
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `INSP-${year}-${seq}-${suffix}`;
}

export function recommendPriorityForInspection(
  inspection: Pick<ElectricalInspection, 'conditionAssessment' | 'recommendedPriority' | 'checklistResults'>
): Priority {
  if (inspection.recommendedPriority) return inspection.recommendedPriority;
  if (inspection.conditionAssessment === 'FAULT_DETECTED') return 'Emergency';
  if (inspection.conditionAssessment === 'ATTENTION_REQUIRED') return 'High';
  const hasFail = inspection.checklistResults.some((item) => item.result === 'FAIL');
  return hasFail ? 'High' : 'Medium';
}

export function buildJobCardPrefillFromInspection(
  inspection: ElectricalInspection,
  equipmentList: Equipment[]
): ElectricalJobCardPrefill {
  const matchedEq =
    inspection.assetKind === 'EQUIPMENT'
      ? equipmentList.find((e) => e.id === inspection.assetId)
      : equipmentList.find(
          (e) => e.code.toLowerCase() === inspection.assetCode.toLowerCase()
        );

  const failedItems = inspection.checklistResults
    .filter((i) => i.result === 'FAIL' || i.result === 'ATTENTION')
    .map((i) => `- [${i.result}] ${i.label}${i.notes ? `: ${i.notes}` : ''}`);

  const descriptionLines = [
    `Raised from Electrical Inspection ${inspection.inspectionNumber} (${inspection.conditionAssessment.replace('_', ' ')})`,
    `Asset: ${inspection.assetCode} — ${inspection.assetName}`,
    `Plant Area: ${inspection.plantArea}`,
    `Electrical Feeder: ${inspection.electricalFeeder}`,
    failedItems.length > 0 ? `Checklist Findings:\n${failedItems.join('\n')}` : null,
    `Observations: ${inspection.observations}`,
    inspection.recommendations ? `Recommendations: ${inspection.recommendations}` : null,
    inspection.followUpAction ? `Follow-Up Action: ${inspection.followUpAction}` : null
  ].filter(Boolean);

  const department =
    matchedEq?.department || 'Engineering - Electrical & Instrumentation';
  const departmentCategory = department.split(' - ')[0] || 'Engineering';

  return {
    equipmentId: matchedEq?.id || (inspection.assetKind === 'EQUIPMENT' ? inspection.assetId : undefined),
    equipmentCode: inspection.assetCode,
    equipmentName: inspection.assetName,
    department,
    departmentCategory,
    plantArea: matchedEq?.plantArea || inspection.plantArea,
    electricalFeeder: inspection.electricalFeeder,
    description: descriptionLines.join('\n\n'),
    priority: recommendPriorityForInspection(inspection),
    inspectionId: inspection.id,
    inspectionReference: inspection.inspectionNumber,
    dangerTagRequired:
      inspection.conditionAssessment === 'FAULT_DETECTED' ||
      inspection.conditionAssessment === 'ISOLATED',
    dangerTagNumber:
      inspection.conditionAssessment === 'ISOLATED'
        ? `LOTO-${inspection.assetCode}`
        : undefined,
    equipmentSpecs: matchedEq
      ? {
          powerKw: matchedEq.powerKw,
          ratedCurrentAmps: matchedEq.ratedCurrentAmps,
          loadCurrentAmps: matchedEq.loadCurrentAmps,
          overloadAmps: matchedEq.overloadAmps,
          starterType: matchedEq.starterType,
          speedRpm: matchedEq.speedRpm,
          plantArea: matchedEq.plantArea
        }
      : undefined
  };
}

export const DUE_SOON_WINDOW_DAYS = 14;

export type InspectionDueStatus =
  | 'NEVER_INSPECTED'
  | 'OVERDUE'
  | 'DUE_SOON'
  | 'CURRENT'
  | 'DECOMMISSIONED';

export interface AssetInspectionDueInfo {
  status: InspectionDueStatus;
  intervalDays: number;
  lastInspectedAt: string | null;
  dueDateIso: string | null;
  daysSinceLastInspection: number | null;
  daysUntilDue: number | null;
}

export function getDefaultInspectionIntervalDays(
  category: InspectionAssetCategory,
  voltage?: string
): number {
  const isHv = Boolean(voltage && (voltage.includes('11 kV') || voltage.includes('6.3 kV') || voltage.includes('11kV')));
  if (category === 'TRANSFORMER' || isHv) return 30;
  if (category === 'CIRCUIT_BREAKER' || category === 'MCC_DB') return 90;
  return 90;
}

export function evaluateAssetInspectionDue(params: {
  assetCategory: InspectionAssetCategory;
  voltage?: string;
  isDecommissioned?: boolean;
  summary?: AssetConditionSummary | null;
  intervalDays?: number;
  nowIso?: string;
}): AssetInspectionDueInfo {
  const intervalDays =
    params.intervalDays ??
    getDefaultInspectionIntervalDays(params.assetCategory, params.voltage);

  if (
    params.isDecommissioned ||
    params.summary?.condition === 'DECOMMISSIONED'
  ) {
    return {
      status: 'DECOMMISSIONED',
      intervalDays,
      lastInspectedAt: params.summary?.latestInspection?.inspectedAt || null,
      dueDateIso: null,
      daysSinceLastInspection: null,
      daysUntilDue: null
    };
  }

  const latest = params.summary?.latestInspection;
  if (!latest) {
    return {
      status: 'NEVER_INSPECTED',
      intervalDays,
      lastInspectedAt: null,
      dueDateIso: null,
      daysSinceLastInspection: null,
      daysUntilDue: null
    };
  }

  const inspectedMs = new Date(latest.inspectedAt).getTime();
  const nowMs = new Date(params.nowIso || new Date().toISOString()).getTime();

  if (Number.isNaN(inspectedMs) || Number.isNaN(nowMs)) {
    return {
      status: 'NEVER_INSPECTED',
      intervalDays,
      lastInspectedAt: latest.inspectedAt,
      dueDateIso: null,
      daysSinceLastInspection: null,
      daysUntilDue: null
    };
  }

  const dayMs = 86_400_000;
  const dueMs = inspectedMs + intervalDays * dayMs;
  const daysSinceLastInspection = Math.max(0, Math.floor((nowMs - inspectedMs) / dayMs));
  const daysUntilDue = Math.ceil((dueMs - nowMs) / dayMs);

  let status: InspectionDueStatus = 'CURRENT';
  if (daysUntilDue < 0) {
    status = 'OVERDUE';
  } else if (daysUntilDue <= DUE_SOON_WINDOW_DAYS) {
    status = 'DUE_SOON';
  }

  return {
    status,
    intervalDays,
    lastInspectedAt: latest.inspectedAt,
    dueDateIso: new Date(dueMs).toISOString(),
    daysSinceLastInspection,
    daysUntilDue
  };
}

export interface ElectricalMaintenanceAlertItem {
  id: string;
  sourceType: 'HAZARD' | 'CONDITION' | 'INSPECTION_DUE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  assetId: string;
  assetKind: 'POWER_NODE' | 'EQUIPMENT';
  assetCode: string;
  assetName: string;
  title: string;
  detail: string;
  recommendedAction: string;
  condition?: MaintenanceCondition;
  dueStatus?: InspectionDueStatus;
}

export function matchJobCardsForPowerNode<
  T extends {
    id: string;
    status: string;
    equipmentId?: string;
    equipmentCode?: string;
    equipmentName: string;
    electricalFeeder?: string;
    description?: string;
  }
>(
  node: PowerDistributionNode,
  connectedEquipment: Equipment[],
  jobCards: T[]
): T[] {
  const eqIdSet = new Set(connectedEquipment.map((eq) => eq.id));
  const eqCodeSet = new Set(
    connectedEquipment.map((eq) => eq.code.trim().toLowerCase()).filter(Boolean)
  );
  const eqNameSet = new Set(
    connectedEquipment.map((eq) => eq.name.trim().toLowerCase()).filter(Boolean)
  );

  const nodeCodeLower = node.code.trim().toLowerCase();
  const nodeNameLower = node.name.trim().toLowerCase();
  const panelIdLower = (node.feederPanelId || '').trim().toLowerCase();

  return jobCards.filter((jc) => {
    if (jc.equipmentId && eqIdSet.has(jc.equipmentId)) return true;
    if (jc.equipmentCode) {
      const jcCodeLower = jc.equipmentCode.trim().toLowerCase();
      if (jcCodeLower === nodeCodeLower || eqCodeSet.has(jcCodeLower)) return true;
    }
    const jcEqNameLower = (jc.equipmentName || '').trim().toLowerCase();
    if (jcEqNameLower && (jcEqNameLower === nodeNameLower || eqNameSet.has(jcEqNameLower))) {
      return true;
    }
    if (jc.electricalFeeder) {
      const feederLower = jc.electricalFeeder.toLowerCase();
      if (panelIdLower && feederLower.includes(panelIdLower)) return true;
      if (
        feederLower === nodeCodeLower ||
        feederLower.includes(`(${nodeCodeLower})`) ||
        feederLower.includes(`/ ${nodeCodeLower}`) ||
        feederLower.startsWith(`${nodeCodeLower} `)
      ) {
        return true;
      }
    }
    return false;
  });
}

export function collectElectricalMaintenanceAlerts(params: {
  powerNodes: PowerDistributionNode[];
  equipmentList: Equipment[];
  conditionSummaries: Map<string, AssetConditionSummary>;
  hazards?: {
    id: string;
    severity: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
    title: string;
    message: string;
    affectedNodeIds: string[];
    actionRequired: string;
  }[];
  nowIso?: string;
}): ElectricalMaintenanceAlertItem[] {
  const alerts: ElectricalMaintenanceAlertItem[] = [];
  const nodeMap = new Map(params.powerNodes.map((n) => [n.id, n]));
  const nowIso = params.nowIso || new Date().toISOString();

  // 1. Topology & Load Hazards (CRITICAL / HIGH)
  for (const hz of params.hazards || []) {
    if (hz.severity !== 'CRITICAL' && hz.severity !== 'HIGH') continue;
    const primaryNodeId = hz.affectedNodeIds[0] || hz.id;
    const primaryNode = nodeMap.get(primaryNodeId);
    alerts.push({
      id: `hz-${hz.id}`,
      sourceType: 'HAZARD',
      severity: hz.severity,
      assetId: primaryNodeId,
      assetKind: 'POWER_NODE',
      assetCode: primaryNode?.code || primaryNodeId,
      assetName: primaryNode?.name || hz.title,
      title: hz.title,
      detail: hz.message,
      recommendedAction: hz.actionRequired
    });
  }

  // 2. Distribution Node Condition & Due Alerts
  for (const node of params.powerNodes) {
    const summary = params.conditionSummaries.get(node.id);
    const isDecomm = node.operatingState === 'DECOMMISSIONED';
    const condition: MaintenanceCondition = isDecomm
      ? 'DECOMMISSIONED'
      : summary?.condition || 'NOT_INSPECTED';

    if (condition === 'FAULT_DETECTED' || condition === 'ATTENTION_REQUIRED' || condition === 'UNDER_MAINTENANCE') {
      alerts.push({
        id: `cond-node-${node.id}`,
        sourceType: 'CONDITION',
        severity: condition === 'FAULT_DETECTED' ? 'CRITICAL' : 'HIGH',
        assetId: node.id,
        assetKind: 'POWER_NODE',
        assetCode: node.code,
        assetName: node.name,
        title: `${node.code}: ${getConditionDisplayMeta(condition).label}`,
        detail:
          summary?.latestInspection?.observations ||
          `Maintenance condition flagged as ${getConditionDisplayMeta(condition).label}.`,
        recommendedAction:
          summary?.latestInspection?.followUpAction ||
          summary?.latestInspection?.recommendations ||
          'Open inspection record and verify corrective job card.',
        condition
      });
    }

    const due = evaluateAssetInspectionDue({
      assetCategory: resolveInspectionCategoryForNode(node),
      voltage: node.voltage,
      isDecommissioned: isDecomm,
      summary,
      nowIso
    });

    if (due.status === 'OVERDUE' || due.status === 'DUE_SOON') {
      alerts.push({
        id: `due-node-${node.id}`,
        sourceType: 'INSPECTION_DUE',
        severity: due.status === 'OVERDUE' ? 'HIGH' : 'MEDIUM',
        assetId: node.id,
        assetKind: 'POWER_NODE',
        assetCode: node.code,
        assetName: node.name,
        title:
          due.status === 'OVERDUE'
            ? `${node.code} Inspection Overdue (${Math.abs(due.daysUntilDue ?? 0)}d)`
            : `${node.code} Inspection Due in ${due.daysUntilDue ?? 0}d`,
        detail: `Last inspected ${due.lastInspectedAt ? new Date(due.lastInspectedAt).toLocaleDateString() : '—'} (${due.intervalDays}-day cycle).`,
        recommendedAction: `Schedule and log formal inspection for ${node.code}.`,
        condition,
        dueStatus: due.status
      });
    }
  }

  // 3. Connected Motor/Equipment Fault, Attention & Overdue Inspection Alerts
  for (const eq of params.equipmentList) {
    const summary = params.conditionSummaries.get(eq.id);
    const condition: MaintenanceCondition = summary?.condition || 'NOT_INSPECTED';

    if (condition === 'FAULT_DETECTED' || condition === 'ATTENTION_REQUIRED') {
      alerts.push({
        id: `cond-eq-${eq.id}`,
        sourceType: 'CONDITION',
        severity: condition === 'FAULT_DETECTED' ? 'CRITICAL' : 'HIGH',
        assetId: eq.id,
        assetKind: 'EQUIPMENT',
        assetCode: eq.code,
        assetName: eq.name,
        title: `${eq.code} (${eq.name}): ${getConditionDisplayMeta(condition).label}`,
        detail:
          summary?.latestInspection?.observations ||
          `Motor inspection flagged ${getConditionDisplayMeta(condition).label}.`,
        recommendedAction:
          summary?.latestInspection?.followUpAction ||
          summary?.latestInspection?.recommendations ||
          'Review motor findings and raise corrective Job Card.',
        condition
      });
    }

    const due = evaluateAssetInspectionDue({
      assetCategory: 'MOTOR',
      isDecommissioned: false,
      summary,
      nowIso
    });

    if (due.status === 'OVERDUE') {
      alerts.push({
        id: `due-eq-${eq.id}`,
        sourceType: 'INSPECTION_DUE',
        severity: 'MEDIUM',
        assetId: eq.id,
        assetKind: 'EQUIPMENT',
        assetCode: eq.code,
        assetName: eq.name,
        title: `${eq.code} Motor Inspection Overdue`,
        detail: `Last inspected ${due.lastInspectedAt ? new Date(due.lastInspectedAt).toLocaleDateString() : '—'}.`,
        recommendedAction: `Inspect motor ${eq.code} and record field readings.`,
        condition,
        dueStatus: due.status
      });
    }
  }

  const rank: Record<'CRITICAL' | 'HIGH' | 'MEDIUM', number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2
  };
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
