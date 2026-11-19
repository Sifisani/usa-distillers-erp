/**
 * USA Distillers - Great Usuthu Plant Electrical Topology, Load Calculation & Energization Solver
 *
 * Single authoritative electrical calculation & topology engine (zero React/Firebase side-effects)
 * modeling the plant single-line power graph and 3-phase load metrics with strict LoadDataSource classification.
 */

import {
  ElectricalMeasurement,
  EnergizationStatus,
  Equipment,
  JobCard,
  LoadDataSource,
  MappingConfidence,
  PowerConnection,
  PowerDistributionNode,
  PowerEdgeSpec,
  PowerVoltageTier
} from '../../types';
import {
  calculateThreePhaseApparentPowerKva,
  calculateTransformerUtilizationPct,
  deriveMeasurementQuantities,
  indexLatestMeasurementsByAsset,
  resolveNominalNodeVoltageV,
  toFiniteNumber
} from './loadCalculations';

export const AUTHORITATIVE_POWER_EDGES: PowerEdgeSpec[] = [
  // =========================================================================
  // LEVEL 1: POWER SOURCES -> 11 KV MAIN BUSBAR
  // =========================================================================
  // Path 1A: Old Turbine Alternator (Decommissioned) -> Step-Up Tx -> C1 VCB -> 11kV Bus
  {
    id: 'E-OLD-TURBINE-TX',
    source: 'OLD_TURBINE',
    target: 'OLD_STEP_UP_TX',
    sourceHandle: 'right',
    targetHandle: 'left',
    voltageTier: '6.3kV',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-OLD-TX-C1',
    source: 'OLD_STEP_UP_TX',
    target: 'C1',
    sourceHandle: 'right',
    targetHandle: 'left',
    voltageTier: '11kV',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-C1-BUS11KV',
    source: 'C1',
    target: 'BUS_11KV',
    sourceHandle: 'bottom',
    targetHandle: 'top-c1',
    voltageTier: '11kV',
    edgeRole: 'PRIMARY_FEED'
  },

  // Path 1B: EEC 11kV Utility Supply -> Metering Tx -> C2 Incomer -> 11kV Bus
  {
    id: 'E-EEC-METERING',
    source: 'EEC_SUPPLY',
    target: 'METERING_TX',
    sourceHandle: 'right',
    targetHandle: 'left',
    voltageTier: '11kV',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-METERING-C2',
    source: 'METERING_TX',
    target: 'C2',
    sourceHandle: 'right',
    targetHandle: 'left',
    voltageTier: '11kV',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-C2-BUS11KV',
    source: 'C2',
    target: 'BUS_11KV',
    sourceHandle: 'bottom',
    targetHandle: 'top-c2',
    voltageTier: '11kV',
    edgeRole: 'PRIMARY_FEED'
  },

  // Path 1C: New Turbine Alternator (3.8 MW) -> C3 VCB -> 11kV Bus
  {
    id: 'E-NEWTURB-C3',
    source: 'NEW_TURBINE',
    target: 'C3',
    sourceHandle: 'right',
    targetHandle: 'left',
    voltageTier: '11kV',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-C3-BUS11KV',
    source: 'C3',
    target: 'BUS_11KV',
    sourceHandle: 'bottom',
    targetHandle: 'top-c3',
    voltageTier: '11kV',
    edgeRole: 'PRIMARY_FEED'
  },

  // =========================================================================
  // LEVEL 2 & 3: 11 KV BUSBAR -> HV FUSES -> TX1/TX2/TX3 -> C4/C5/C6 -> MCC BUSBARS
  // =========================================================================
  // Tx1 Branch (1600 kVA, 11000/415V)
  {
    id: 'E-BUS11KV-TX1FUSE',
    source: 'BUS_11KV',
    target: 'TX1_FUSE',
    sourceHandle: 'bottom-tx1',
    targetHandle: 'top',
    voltageTier: '11kV',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-TX1FUSE-TX1',
    source: 'TX1_FUSE',
    target: 'TX1',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    voltageTier: '11kV',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-TX1-C4',
    source: 'TX1',
    target: 'C4',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    voltageTier: '415V',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-C4-BUSTX1',
    source: 'C4',
    target: 'BUS_TX1',
    sourceHandle: 'bottom',
    targetHandle: 'top-incomer',
    voltageTier: '400V',
    edgeRole: 'PRIMARY_FEED'
  },

  // Tx2 Branch (800 kVA, 11000/420V)
  {
    id: 'E-BUS11KV-TX2FUSE',
    source: 'BUS_11KV',
    target: 'TX2_FUSE',
    sourceHandle: 'bottom-tx2',
    targetHandle: 'top',
    voltageTier: '11kV',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-TX2FUSE-TX2',
    source: 'TX2_FUSE',
    target: 'TX2',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    voltageTier: '11kV',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-TX2-C5',
    source: 'TX2',
    target: 'C5',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    voltageTier: '420V',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-C5-BUSTX2',
    source: 'C5',
    target: 'BUS_TX2',
    sourceHandle: 'bottom',
    targetHandle: 'top-incomer',
    voltageTier: '400V',
    edgeRole: 'PRIMARY_FEED'
  },

  // Tx3 Branch (800 kVA, 11000/420V)
  {
    id: 'E-BUS11KV-TX3FUSE',
    source: 'BUS_11KV',
    target: 'TX3_FUSE',
    sourceHandle: 'bottom-tx3',
    targetHandle: 'top',
    voltageTier: '11kV',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-TX3FUSE-TX3',
    source: 'TX3_FUSE',
    target: 'TX3',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    voltageTier: '11kV',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-TX3-C6',
    source: 'TX3',
    target: 'C6',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    voltageTier: '420V',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-C6-BUSTX3',
    source: 'C6',
    target: 'BUS_TX3',
    sourceHandle: 'bottom',
    targetHandle: 'top-incomer',
    voltageTier: '400V',
    edgeRole: 'PRIMARY_FEED'
  },

  // =========================================================================
  // LEVEL 4A: TX1 MCC BUSBAR <-> GEN SET INCOMER (C7) & FEEDERS (C8, C9, C10)
  // =========================================================================
  {
    id: 'E-GENSET-C7',
    source: 'GEN_SET',
    target: 'C7',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    voltageTier: '400V',
    edgeRole: 'STANDBY_FEED'
  },
  {
    id: 'E-C7-BUSTX1',
    source: 'C7',
    target: 'BUS_TX1',
    sourceHandle: 'bottom',
    targetHandle: 'top-genset',
    voltageTier: '400V',
    edgeRole: 'STANDBY_FEED'
  },
  {
    id: 'E-INTERLOCK-C4-C7',
    source: 'C4',
    target: 'C7',
    sourceHandle: 'right',
    targetHandle: 'left',
    voltageTier: '400V',
    edgeRole: 'INTERLOCK_TIE',
    label: 'C4 ↔ C7 Interlock Check'
  },
  {
    id: 'E-BUSTX1-C8',
    source: 'BUS_TX1',
    target: 'C8',
    sourceHandle: 'bottom-0',
    targetHandle: 'top',
    voltageTier: '400V',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-BUSTX1-C9',
    source: 'BUS_TX1',
    target: 'C9',
    sourceHandle: 'bottom-1',
    targetHandle: 'top',
    voltageTier: '400V',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-BUSTX1-C10',
    source: 'BUS_TX1',
    target: 'C10',
    sourceHandle: 'bottom-2',
    targetHandle: 'top',
    voltageTier: '400V',
    edgeRole: 'PRIMARY_FEED'
  },

  // =========================================================================
  // LEVEL 4B: TX2 MCC BUSBAR -> FEEDERS (C11, C12 -> C18/C19/C20, C13)
  // =========================================================================
  {
    id: 'E-BUSTX2-C11',
    source: 'BUS_TX2',
    target: 'C11',
    sourceHandle: 'bottom-0',
    targetHandle: 'top',
    voltageTier: '400V',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-BUSTX2-C12',
    source: 'BUS_TX2',
    target: 'C12',
    sourceHandle: 'bottom-1',
    targetHandle: 'top',
    voltageTier: '400V',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-BUSTX2-C13',
    source: 'BUS_TX2',
    target: 'C13',
    sourceHandle: 'bottom-2',
    targetHandle: 'top',
    voltageTier: '400V',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-C12-C18',
    source: 'C12',
    target: 'C18',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    voltageTier: '400V',
    edgeRole: 'SUB_FEED'
  },
  {
    id: 'E-C12-C19',
    source: 'C12',
    target: 'C19',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    voltageTier: '400V',
    edgeRole: 'SUB_FEED'
  },
  {
    id: 'E-C12-C20',
    source: 'C12',
    target: 'C20',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    voltageTier: '400V',
    edgeRole: 'SUB_FEED'
  },

  // =========================================================================
  // LEVEL 4C: TX3 MCC BUSBAR -> FEEDERS (C14, C15, C16, C17)
  // =========================================================================
  {
    id: 'E-BUSTX3-C14',
    source: 'BUS_TX3',
    target: 'C14',
    sourceHandle: 'bottom-0',
    targetHandle: 'top',
    voltageTier: '400V',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-BUSTX3-C15',
    source: 'BUS_TX3',
    target: 'C15',
    sourceHandle: 'bottom-1',
    targetHandle: 'top',
    voltageTier: '400V',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-BUSTX3-C16',
    source: 'BUS_TX3',
    target: 'C16',
    sourceHandle: 'bottom-2',
    targetHandle: 'top',
    voltageTier: '400V',
    edgeRole: 'PRIMARY_FEED'
  },
  {
    id: 'E-BUSTX3-C17',
    source: 'BUS_TX3',
    target: 'C17',
    sourceHandle: 'bottom-3',
    targetHandle: 'top',
    voltageTier: '400V',
    edgeRole: 'PRIMARY_FEED'
  }
];

export interface BranchLoadContribution {
  nodeId: string;
  code: string;
  name: string;
  operatingState: PowerDistributionNode['operatingState'];
  equipmentCount: number;
  installedKw: number;
  estimatedOperatingAmps: number;
  estimatedApparentPowerKva: number | null;
  measuredCurrentAmps: number | null;
  measuredApparentPowerKva: number | null;
  measurementSource: 'MEASURED' | 'METERED' | null;
  shareOfParentEstimatedPct: number | null;
}

export interface SolvedNodeState {
  nodeId: string;
  energization: EnergizationStatus;
  activeSourceIds: string[];
  hasFaultConflict: boolean;
  openJobCardsCount: number;
  activeLotoTags: string[];
  connectedEquipmentCount: number;
  operationalEquipmentCount: number;
  maintenanceEquipmentCount: number;
  standbyEquipmentCount: number;
  // Nameplate & Estimated Rollup Metrics (NEVER disguised as MEASURED)
  connectedKw: number; // Installed nameplate kW (deduplicated downstream)
  connectedRatedAmps: number; // Nameplate FLC sum (scaled at HV legs)
  connectedNameplateKva: number | null; // Nameplate S = √3*V*FLC/1000
  liveAmps: number; // Estimated live running current respecting breaker state
  estimatedOperatingKva: number | null; // Estimated S = √3*V_nom*liveAmps/1000
  estimatedUtilizationPct: number | null;
  effectiveDisplayAmps: number;
  isMeasuredOverride: boolean;
  displayDataSource: LoadDataSource;
  // Rated Capacities
  nominalVoltageV: number;
  ratedCapacityKva: number | null;
  ratedCapacityAmps: number | null;
  // Verified Field / Meter Readings (null when unrecorded — NEVER fabricated or 0)
  measuredCurrentAmps: number | null;
  measuredPhaseCurrents: { l1?: number; l2?: number; l3?: number } | null;
  phaseImbalancePct: number | null;
  measuredVoltageV: number | null;
  measuredActivePowerKw: number | null;
  measuredApparentPowerKva: number | null;
  apparentPowerSource: LoadDataSource | null;
  measuredReactivePowerKvar: number | null;
  measuredPowerFactor: number | null;
  measuredFrequencyHz: number | null;
  measuredEnergyKwh: number | null;
  measurementTimestamp: string | null;
  measurementSource: 'MEASURED' | 'METERED' | null;
  measuredUtilizationPct: number | null;
  availableCapacityKva: number | null;
  availableCapacityAmps: number | null;
  // Equipment-level field clamp coverage on this branch
  measuredEquipmentCount: number;
  partialMeasuredEquipmentAmps: number | null;
  // Multi-source / Generator Bus Demand Separation
  isSharedBusSource: boolean;
  sharedBusDemandAmps: number | null;
  sharedBusDemandKva: number | null;
  sourceActualOutputAmps: number | null;
  sourceActualOutputKw: number | null;
  sourceActualOutputKva: number | null;
  // Downstream Direct Branch Breakdown
  branchContributions: BranchLoadContribution[];
  // Legacy / primary utilization selector (measured first, else estimated)
  utilizationPct: number | null;
}

export interface SolvedTopologyResult {
  edges: PowerEdgeSpec[];
  nodeStates: Map<string, SolvedNodeState>;
  edgeStates: Map<string, EnergizationStatus>;
  c4C7Conflict: boolean;
  activeHvSourceCount: number;
  /** Deduplicated sum of installed nameplate kW across unique plant equipment (no parent+child double count) */
  totalPlantKw: number;
  totalPlantLiveAmps11kV: number;
  totalPlantEstimatedKva: number;
  totalPlantMeasuredKva: number | null;
  totalPlantMeasuredKw: number | null;
  meteredTransformerCount: number;
  unassignedEquipment: Equipment[];
}

/**
 * Builds complete directed edge list: authoritative edges + verified Firestore PowerConnection edges
 * + multi-source node.sourceNodeIds + legacy custom parentNodeId fallback (never orphaned).
 */
export function buildEffectivePowerEdges(
  nodes: PowerDistributionNode[],
  customConnections: PowerConnection[] = []
): PowerEdgeSpec[] {
  const nodeIds = new Set(nodes.map(n => n.id));
  const edges = AUTHORITATIVE_POWER_EDGES.filter(
    e => nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  const existingKeys = new Set(
    edges.map(e => `${e.source}->${e.target}::${e.edgeRole}`)
  );

  const existingFeedKeys = new Set(
    edges.filter(e => e.edgeRole !== 'INTERLOCK_TIE').map(e => `${e.source}->${e.target}`)
  );

  // 1. Merge explicit multi-source PowerConnection documents
  for (const conn of customConnections) {
    if (!nodeIds.has(conn.sourceNodeId) || !nodeIds.has(conn.targetNodeId)) continue;
    if (conn.sourceNodeId === conn.targetNodeId) continue;

    const fullKey = `${conn.sourceNodeId}->${conn.targetNodeId}::${conn.edgeRole}`;
    if (existingKeys.has(fullKey)) continue;

    existingKeys.add(fullKey);
    if (conn.edgeRole !== 'INTERLOCK_TIE') {
      existingFeedKeys.add(`${conn.sourceNodeId}->${conn.targetNodeId}`);
    }

    edges.push({
      id: conn.id || `E-CONN-${conn.sourceNodeId}-${conn.targetNodeId}`,
      source: conn.sourceNodeId,
      target: conn.targetNodeId,
      sourceHandle: conn.sourceHandle || 'bottom',
      targetHandle: conn.targetHandle || 'top',
      voltageTier: conn.voltageTier || '400V',
      edgeRole: conn.edgeRole || 'PRIMARY_FEED',
      label: conn.label
    });
  }

  // 2. Merge explicit multi-source node.sourceNodeIds arrays
  for (const node of nodes) {
    if (Array.isArray(node.sourceNodeIds)) {
      for (const srcId of node.sourceNodeIds) {
        if (!srcId || !nodeIds.has(srcId) || srcId === node.id) continue;
        const feedKey = `${srcId}->${node.id}`;
        if (existingFeedKeys.has(feedKey)) continue;
        existingFeedKeys.add(feedKey);
        const isHv =
          node.transformerSource === 'HV_11KV' ||
          node.voltage.includes('11 kV') ||
          node.voltage.includes('11000');
        edges.push({
          id: `E-SRC-${srcId}-${node.id}`,
          source: srcId,
          target: node.id,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          voltageTier: isHv ? '11kV' : '400V',
          edgeRole: 'PRIMARY_FEED'
        });
      }
    }
  }

  // 3. Backward-compatible fallback for custom nodes specifying parentNodeId
  for (const node of nodes) {
    if (node.parentNodeId && nodeIds.has(node.parentNodeId)) {
      const key = `${node.parentNodeId}->${node.id}`;
      if (node.id === 'GEN_SET' && node.parentNodeId === 'C7') continue;
      if (node.id === 'C7' && node.parentNodeId === 'BUS_TX1') continue;

      if (!existingFeedKeys.has(key)) {
        existingFeedKeys.add(key);
        const isHv =
          node.transformerSource === 'HV_11KV' ||
          node.voltage.includes('11 kV') ||
          node.voltage.includes('11000');
        const tier: PowerVoltageTier = isHv ? '11kV' : '400V';
        edges.push({
          id: `E-CUSTOM-${node.parentNodeId}-${node.id}`,
          source: node.parentNodeId,
          target: node.id,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          voltageTier: tier,
          edgeRole: 'PRIMARY_FEED'
        });
      }
    }
  }

  return edges;
}

/**
 * Returns direct downstream child node IDs along power-conducting edges.
 */
export function getDirectChildNodeIds(
  nodeId: string,
  edges: PowerEdgeSpec[]
): string[] {
  const children: string[] = [];
  const seen = new Set<string>();
  for (const edge of edges) {
    if (edge.edgeRole === 'INTERLOCK_TIE') continue;
    if (edge.source === nodeId && !seen.has(edge.target)) {
      seen.add(edge.target);
      children.push(edge.target);
    }
  }
  return children;
}

/**
 * Returns direct upstream parent node IDs (multi-source aware) along power-conducting edges.
 */
export function getDirectParentNodeIds(
  nodeId: string,
  edges: PowerEdgeSpec[]
): string[] {
  const parents: string[] = [];
  const seen = new Set<string>();
  for (const edge of edges) {
    if (edge.edgeRole === 'INTERLOCK_TIE') continue;
    if (edge.target === nodeId && !seen.has(edge.source)) {
      seen.add(edge.source);
      parents.push(edge.source);
    }
  }
  return parents;
}

export function isNodeConducting(node: PowerDistributionNode): boolean {
  return node.operatingState === 'CLOSED';
}

export function getDescendantNodeIds(
  startNodeId: string,
  edges: PowerEdgeSpec[]
): Set<string> {
  const result = new Set<string>();
  const queue: string[] = [startNodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (visited.has(curr)) continue;
    visited.add(curr);
    result.add(curr);

    for (const edge of edges) {
      if (edge.edgeRole === 'INTERLOCK_TIE') continue;
      if (edge.source === curr && !visited.has(edge.target)) {
        queue.push(edge.target);
      }
    }
  }

  return result;
}

export function getUpstreamNodeIds(
  startNodeId: string,
  edges: PowerEdgeSpec[]
): Set<string> {
  const result = new Set<string>();
  const queue: string[] = [startNodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (visited.has(curr)) continue;
    visited.add(curr);
    result.add(curr);

    for (const edge of edges) {
      if (edge.edgeRole === 'INTERLOCK_TIE') continue;
      if (edge.target === curr && !visited.has(edge.source)) {
        queue.push(edge.source);
      }
    }
  }

  return result;
}

function getTransformerHvScaleFactor(node: PowerDistributionNode): number {
  if (node.id === 'TX2_FUSE' || node.id === 'TX3_FUSE') {
    return 420 / 11000;
  }
  return 415 / 11000;
}

function getFeederEquipmentForNode(
  node: PowerDistributionNode,
  descendantFeederIds: Set<string>,
  equipmentByFeederNodeId: Map<string, Equipment[]>
): Equipment[] {
  const collected: Equipment[] = [];
  const seenEqIds = new Set<string>();

  for (const id of descendantFeederIds) {
    const list = equipmentByFeederNodeId.get(id) || [];
    for (const eq of list) {
      if (!seenEqIds.has(eq.id)) {
        seenEqIds.add(eq.id);
        collected.push(eq);
      }
    }
  }

  const direct = equipmentByFeederNodeId.get(node.id) || [];
  for (const eq of direct) {
    if (!seenEqIds.has(eq.id)) {
      seenEqIds.add(eq.id);
      collected.push(eq);
    }
  }

  return collected;
}

/**
 * Resolves verified MEASURED or METERED readings for a PowerDistributionNode
 * using immutable electricalMeasurements first, then explicit node overrides.
 */
function resolveNodeMeasurementSnapshot(
  node: PowerDistributionNode,
  latestMeasurements: Map<string, ElectricalMeasurement>,
  nominalVoltageV: number
) {
  const record = latestMeasurements.get(node.id);

  if (record) {
    const derived = deriveMeasurementQuantities(record.values, nominalVoltageV);
    const hasDirectVoltage = derived.voltageV !== null;
    const apparentPowerSource: LoadDataSource | null =
      record.values.apparentPowerKva !== undefined && record.values.apparentPowerKva !== null
        ? record.source
        : derived.apparentPowerKva !== null
        ? hasDirectVoltage
          ? record.source
          : 'ESTIMATED'
        : null;

    return {
      hasNodeReading: true,
      source: record.source,
      timestamp: record.timestamp,
      currentAmps: derived.currentAmps,
      phaseCurrents: derived.phaseCurrents,
      phaseImbalancePct: derived.phaseImbalancePct,
      voltageV: derived.voltageV,
      activePowerKw: derived.activePowerKw,
      apparentPowerKva: derived.apparentPowerKva,
      apparentPowerSource,
      reactivePowerKvar: derived.reactivePowerKvar,
      powerFactor: derived.powerFactor,
      frequencyHz: derived.frequencyHz,
      energyKwh: derived.energyKwh
    };
  }

  const overrideAmps = toFiniteNumber(node.measuredLoadAmps);
  if (overrideAmps !== null && overrideAmps >= 0) {
    const src: 'MEASURED' | 'METERED' = node.measuredLoadSource || 'MEASURED';
    const apparentFromNominal = calculateThreePhaseApparentPowerKva(nominalVoltageV, overrideAmps);
    return {
      hasNodeReading: true,
      source: src,
      timestamp: node.measuredLoadUpdatedAt || node.updatedAt || null,
      currentAmps: overrideAmps,
      phaseCurrents: null,
      phaseImbalancePct: null,
      voltageV: null,
      activePowerKw: null,
      apparentPowerKva: apparentFromNominal,
      apparentPowerSource: apparentFromNominal !== null ? ('ESTIMATED' as LoadDataSource) : null,
      reactivePowerKvar: null,
      powerFactor: null,
      frequencyHz: toFiniteNumber(node.frequencyHz),
      energyKwh: null
    };
  }

  return {
    hasNodeReading: false,
    source: null,
    timestamp: null,
    currentAmps: null,
    phaseCurrents: null,
    phaseImbalancePct: null,
    voltageV: null,
    activePowerKw: null,
    apparentPowerKva: null,
    apparentPowerSource: null,
    reactivePowerKvar: null,
    powerFactor: null,
    frequencyHz: null,
    energyKwh: null
  };
}

/**
 * Pure graph energization, back-feed conflict, 3-phase load calculation & LOTO solver.
 */
export function solvePlantElectricalState(
  nodes: PowerDistributionNode[],
  equipmentList: Equipment[],
  jobCards: JobCard[],
  resolveEquipmentBreakerId: (eq: Partial<Equipment>) => {
    breakerId: string;
    confidence: MappingConfidence;
  },
  customConnections: PowerConnection[] = [],
  measurements: ElectricalMeasurement[] = []
): SolvedTopologyResult {
  const nodeMap = new Map<string, PowerDistributionNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const edges = buildEffectivePowerEdges(nodes, customConnections);
  const latestMeasurements = indexLatestMeasurementsByAsset(measurements);

  // 1. Detect C4 <-> C7 un-interlocked simultaneous close fault
  const c4 = nodeMap.get('C4');
  const c7 = nodeMap.get('C7');
  const c4C7Conflict = Boolean(
    c4 &&
      c7 &&
      c4.operatingState === 'CLOSED' &&
      c7.operatingState === 'CLOSED' &&
      (c4.interlockStatus === 'NONE_HAZARD' || c7.interlockStatus === 'NONE_HAZARD')
  );

  // 2. BFS forward energization from all CLOSED SOURCE nodes
  const energizedBySources = new Map<string, Set<string>>();
  nodes.forEach(n => energizedBySources.set(n.id, new Set()));

  const sources = nodes.filter(
    n => n.category === 'SOURCE' && n.operatingState === 'CLOSED'
  );

  for (const src of sources) {
    const queue: string[] = [src.id];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currId = queue.shift()!;
      if (visited.has(currId)) continue;
      visited.add(currId);

      const currNode = nodeMap.get(currId);
      if (!currNode) continue;

      energizedBySources.get(currId)?.add(src.id);
      if (!isNodeConducting(currNode)) continue;

      for (const edge of edges) {
        if (edge.edgeRole === 'INTERLOCK_TIE') continue;
        if (edge.source === currId && !visited.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }
  }

  // 3. Index equipment to canonical breaker IDs & track unassigned
  const equipmentByBreakerId = new Map<string, Equipment[]>();
  const unassignedEquipment: Equipment[] = [];
  const seenUniqueEqIds = new Set<string>();

  for (const eq of equipmentList) {
    if (seenUniqueEqIds.has(eq.id)) continue;
    seenUniqueEqIds.add(eq.id);

    const resolved = resolveEquipmentBreakerId(eq);
    if (resolved.confidence === 'UNASSIGNED' || !nodeMap.has(resolved.breakerId)) {
      unassignedEquipment.push(eq);
      continue;
    }
    const existing = equipmentByBreakerId.get(resolved.breakerId) || [];
    existing.push(eq);
    equipmentByBreakerId.set(resolved.breakerId, existing);
  }

  const openJobCards = jobCards.filter(
    jc => jc.status !== 'Completed' && jc.status !== 'Cancelled'
  );

  const nodeStates = new Map<string, SolvedNodeState>();
  const conflictNodeIds = new Set<string>(
    c4C7Conflict ? ['C4', 'C7', 'BUS_TX1', 'TX1', 'GEN_SET'] : []
  );

  const calcSubtree = (node: PowerDistributionNode) => {
    let descendantScope = getDescendantNodeIds(node.id, edges);

    if (node.id === 'GEN_SET' || node.id === 'C7') {
      const gen = nodeMap.get('GEN_SET');
      const isGenFeeding =
        gen?.operatingState === 'CLOSED' && c7?.operatingState === 'CLOSED';
      if (!isGenFeeding) {
        return {
          connectedEq: [] as Equipment[],
          liveAmpsRaw: 0,
          connectedRatedAmpsRaw: 0,
          connectedKw: 0,
          opCount: 0,
          maintCount: 0,
          standbyCount: 0,
          openJCs: 0,
          lotoTags: new Set<string>(),
          measuredEqCount: 0,
          partialMeasuredEqAmps: 0
        };
      }
      descendantScope = getDescendantNodeIds('BUS_TX1', edges);
    }

    const connectedEq = getFeederEquipmentForNode(
      node,
      descendantScope,
      equipmentByBreakerId
    );

    let liveAmpsRaw = 0;
    let connectedRatedAmpsRaw = 0;
    let connectedKw = 0;
    let opCount = 0;
    let maintCount = 0;
    let standbyCount = 0;
    let measuredEqCount = 0;
    let partialMeasuredEqAmps = 0;
    const matchedJcIds = new Set<string>();
    const lotoTags = new Set<string>();

    const isBranchConductingUnderNode = (breakerId: string): boolean => {
      if (!isNodeConducting(node)) return false;
      const breaker = nodeMap.get(breakerId);
      if (!breaker || !isNodeConducting(breaker)) return false;
      if (['C18', 'C19', 'C20'].includes(breakerId) && node.id !== breakerId) {
        const c12 = nodeMap.get('C12');
        if (!c12 || !isNodeConducting(c12)) return false;
      }
      if (['BUS_11KV', 'C2', 'EEC_SUPPLY', 'METERING_TX', 'C3', 'NEW_TURBINE'].includes(node.id)) {
        const tx1Path =
          nodeMap.get('TX1_FUSE')?.operatingState === 'CLOSED' &&
          nodeMap.get('TX1')?.operatingState === 'CLOSED' &&
          nodeMap.get('C4')?.operatingState === 'CLOSED';
        const tx2Path =
          nodeMap.get('TX2_FUSE')?.operatingState === 'CLOSED' &&
          nodeMap.get('TX2')?.operatingState === 'CLOSED' &&
          nodeMap.get('C5')?.operatingState === 'CLOSED';
        const tx3Path =
          nodeMap.get('TX3_FUSE')?.operatingState === 'CLOSED' &&
          nodeMap.get('TX3')?.operatingState === 'CLOSED' &&
          nodeMap.get('C6')?.operatingState === 'CLOSED';

        if (['C8', 'C9', 'C10'].includes(breakerId) && !tx1Path) return false;
        if (['C11', 'C12', 'C13', 'C18', 'C19', 'C20'].includes(breakerId) && !tx2Path) return false;
        if (['C14', 'C15', 'C16', 'C17'].includes(breakerId) && !tx3Path) return false;
      }
      const srcs = energizedBySources.get(breakerId);
      return Boolean(srcs && srcs.size > 0);
    };

    for (const eq of connectedEq) {
      const resolved = resolveEquipmentBreakerId(eq);
      const rated = Number(eq.ratedCurrentAmps) || 0;
      const eqMeasurement = latestMeasurements.get(eq.id);
      const eqMeasDerived = eqMeasurement ? deriveMeasurementQuantities(eqMeasurement.values, 400) : null;
      const verifiedEqAmps =
        eqMeasDerived?.currentAmps !== null && eqMeasDerived?.currentAmps !== undefined
          ? eqMeasDerived.currentAmps
          : (eq.loadMeasurementSource === 'MEASURED' || eq.loadMeasurementSource === 'METERED') &&
            typeof eq.loadCurrentAmps === 'number'
          ? eq.loadCurrentAmps
          : null;

      if (verifiedEqAmps !== null && eq.status === 'Operational') {
        measuredEqCount++;
        partialMeasuredEqAmps += verifiedEqAmps;
      }

      const load = verifiedEqAmps ?? (Number(eq.loadCurrentAmps) || rated);
      const kw = Number(eq.powerKw) || 0;

      connectedRatedAmpsRaw += rated;
      connectedKw += kw;

      if (eq.status === 'Operational') {
        opCount++;
        if (isBranchConductingUnderNode(resolved.breakerId)) {
          liveAmpsRaw += load;
        }
      } else if (eq.status === 'Under Maintenance') {
        maintCount++;
      } else if (eq.status === 'Standby') {
        standbyCount++;
      }

      for (const jc of openJobCards) {
        const matchesEq =
          jc.equipmentId === eq.id ||
          (jc.equipmentName &&
            eq.name &&
            jc.equipmentName.toLowerCase() === eq.name.toLowerCase());
        if (matchesEq) {
          matchedJcIds.add(jc.id);
          if (jc.safetyPermits?.lotoRequired) {
            lotoTags.add(jc.safetyPermits.lotoTag || `LOTO:${jc.jobCardNumber}`);
          }
          if (jc.dangerTagRequired) {
            lotoTags.add(jc.dangerTagNumber || `DANGER:${jc.jobCardNumber}`);
          }
        }
      }
    }

    return {
      connectedEq,
      liveAmpsRaw,
      connectedRatedAmpsRaw,
      connectedKw,
      opCount,
      maintCount,
      standbyCount,
      openJCs: matchedJcIds.size,
      lotoTags,
      measuredEqCount,
      partialMeasuredEqAmps
    };
  };

  const activeHvSources = [
    nodeMap.get('C2')?.operatingState === 'CLOSED' &&
    nodeMap.get('EEC_SUPPLY')?.operatingState === 'CLOSED' &&
    nodeMap.get('METERING_TX')?.operatingState === 'CLOSED'
      ? 'C2'
      : null,
    nodeMap.get('C3')?.operatingState === 'CLOSED' &&
    nodeMap.get('NEW_TURBINE')?.operatingState === 'CLOSED'
      ? 'C3'
      : null
  ].filter(Boolean) as string[];

  const calcLegHv = (fuseId: string, ratio: number) => {
    const fNode = nodeMap.get(fuseId);
    if (!fNode) return 0;
    return calcSubtree(fNode).liveAmpsRaw * ratio;
  };
  const calcLegRatedHv = (fuseId: string, ratio: number) => {
    const fNode = nodeMap.get(fuseId);
    if (!fNode) return 0;
    return calcSubtree(fNode).connectedRatedAmpsRaw * ratio;
  };

  const totalHvLive =
    calcLegHv('TX1_FUSE', 415 / 11000) +
    calcLegHv('TX2_FUSE', 420 / 11000) +
    calcLegHv('TX3_FUSE', 420 / 11000);
  const totalHvRated =
    calcLegRatedHv('TX1_FUSE', 415 / 11000) +
    calcLegRatedHv('TX2_FUSE', 420 / 11000) +
    calcLegRatedHv('TX3_FUSE', 420 / 11000);

  for (const node of nodes) {
    const srcSet = energizedBySources.get(node.id) || new Set<string>();
    let energization: EnergizationStatus = 'DE_ENERGIZED';

    if (node.operatingState === 'DECOMMISSIONED') {
      energization = 'DECOMMISSIONED';
    } else if (conflictNodeIds.has(node.id)) {
      energization = 'FAULT_BACKFEED';
    } else if (srcSet.size > 0 && node.operatingState !== 'TRIPPED') {
      energization = node.operatingState === 'CLOSED' ? 'ENERGIZED' : 'DE_ENERGIZED';
    }

    const subtree = calcSubtree(node);
    const nominalVoltageV = resolveNominalNodeVoltageV(node);
    const snap = resolveNodeMeasurementSnapshot(node, latestMeasurements, nominalVoltageV);

    let liveAmps = subtree.liveAmpsRaw;
    let connectedRatedAmps = subtree.connectedRatedAmpsRaw;

    const isHvSingleLeg = node.id === 'TX1_FUSE' || node.id === 'TX2_FUSE' || node.id === 'TX3_FUSE';
    const isHvMainBusOrIncomer = ['BUS_11KV', 'C2', 'EEC_SUPPLY', 'METERING_TX', 'C3', 'NEW_TURBINE'].includes(node.id);
    const isSharedBusSource = node.category === 'SOURCE';

    if (isHvSingleLeg) {
      const factor = getTransformerHvScaleFactor(node);
      liveAmps *= factor;
      connectedRatedAmps *= factor;
    } else if (isHvMainBusOrIncomer) {
      if (node.id === 'BUS_11KV') {
        liveAmps = energization === 'ENERGIZED' ? totalHvLive : 0;
        connectedRatedAmps = totalHvRated;
      } else if (node.id === 'C2' || node.id === 'EEC_SUPPLY' || node.id === 'METERING_TX') {
        const c2Closed = activeHvSources.includes('C2');
        liveAmps = c2Closed ? totalHvLive / Math.max(1, activeHvSources.length) : 0;
        connectedRatedAmps = totalHvRated;
      } else if (node.id === 'C3' || node.id === 'NEW_TURBINE') {
        const c3Closed = activeHvSources.includes('C3');
        liveAmps = c3Closed ? totalHvLive / Math.max(1, activeHvSources.length) : 0;
        connectedRatedAmps = totalHvRated;
      }
    }

    // Shared Bus Demand vs Individual Source Output separation
    let sharedBusDemandAmps: number | null = null;
    let sharedBusDemandKva: number | null = null;
    if (isSharedBusSource) {
      if (node.id === 'GEN_SET') {
        const busTx1 = nodeMap.get('BUS_TX1');
        const busTx1Amps = busTx1 ? calcSubtree(busTx1).liveAmpsRaw : 0;
        sharedBusDemandAmps = Number(busTx1Amps.toFixed(1));
        sharedBusDemandKva = calculateThreePhaseApparentPowerKva(400, sharedBusDemandAmps);
      } else if (node.id === 'EEC_SUPPLY' || node.id === 'NEW_TURBINE') {
        sharedBusDemandAmps = Number(totalHvLive.toFixed(1));
        sharedBusDemandKva = calculateThreePhaseApparentPowerKva(11000, sharedBusDemandAmps);
      } else if (node.id === 'OLD_TURBINE') {
        sharedBusDemandAmps = 0;
        sharedBusDemandKva = 0;
      }
    }

    // Source actual output MUST come exclusively from MEASURED/METERED readings (never assume rated kVA = output)
    const sourceBreakerSnapshot =
      node.id === 'GEN_SET'
        ? (() => {
            const c7Node = nodeMap.get('C7');
            return c7Node ? resolveNodeMeasurementSnapshot(c7Node, latestMeasurements, 400) : null;
          })()
        : node.id === 'NEW_TURBINE'
        ? (() => {
            const c3Node = nodeMap.get('C3');
            return c3Node ? resolveNodeMeasurementSnapshot(c3Node, latestMeasurements, 11000) : null;
          })()
        : node.id === 'EEC_SUPPLY'
        ? (() => {
            const mNode = nodeMap.get('METERING_TX');
            const c2Node = nodeMap.get('C2');
            const mSnap = mNode ? resolveNodeMeasurementSnapshot(mNode, latestMeasurements, 11000) : null;
            if (mSnap?.hasNodeReading) return mSnap;
            return c2Node ? resolveNodeMeasurementSnapshot(c2Node, latestMeasurements, 11000) : null;
          })()
        : null;

    const effectiveSourceSnap = snap.hasNodeReading
      ? snap
      : sourceBreakerSnapshot?.hasNodeReading
      ? sourceBreakerSnapshot
      : null;

    const sourceActualOutputAmps = isSharedBusSource ? effectiveSourceSnap?.currentAmps ?? null : null;
    const sourceActualOutputKw = isSharedBusSource ? effectiveSourceSnap?.activePowerKw ?? null : null;
    const sourceActualOutputKva = isSharedBusSource ? effectiveSourceSnap?.apparentPowerKva ?? null : null;

    const estimatedOperatingKva = calculateThreePhaseApparentPowerKva(nominalVoltageV, liveAmps);
    const connectedNameplateKva = calculateThreePhaseApparentPowerKva(nominalVoltageV, connectedRatedAmps);

    const ratedCapacityKva = toFiniteNumber(node.kva);
    const ratedCapacityAmps = toFiniteNumber(node.ratedAmps) ?? toFiniteNumber(node.secondaryAmps);

    const isMeasuredOverride = snap.hasNodeReading && snap.currentAmps !== null;
    const effectiveDisplayAmps = isMeasuredOverride
      ? Number(snap.currentAmps!.toFixed(1))
      : Number(liveAmps.toFixed(1));

    const displayDataSource: LoadDataSource = snap.hasNodeReading && snap.source ? snap.source : 'ESTIMATED';

    // Utilisation % calculation
    const measuredUtilizationPct =
      node.category === 'TRANSFORMER' && ratedCapacityKva !== null
        ? calculateTransformerUtilizationPct(snap.apparentPowerKva, ratedCapacityKva)
        : snap.currentAmps !== null && ratedCapacityAmps !== null && ratedCapacityAmps > 0
        ? Number(((snap.currentAmps / ratedCapacityAmps) * 100).toFixed(1))
        : null;

    const estimatedUtilizationPct =
      node.category === 'TRANSFORMER' && ratedCapacityKva !== null
        ? calculateTransformerUtilizationPct(estimatedOperatingKva, ratedCapacityKva)
        : ratedCapacityAmps !== null && ratedCapacityAmps > 0
        ? Number(((liveAmps / ratedCapacityAmps) * 100).toFixed(1))
        : null;

    const utilizationPct =
      measuredUtilizationPct !== null
        ? Math.min(999, Math.round(measuredUtilizationPct))
        : estimatedUtilizationPct !== null
        ? Math.min(999, Math.round(estimatedUtilizationPct))
        : null;

    const availableCapacityKva =
      ratedCapacityKva !== null && snap.apparentPowerKva !== null
        ? Number((ratedCapacityKva - snap.apparentPowerKva).toFixed(2))
        : null;

    const availableCapacityAmps =
      ratedCapacityAmps !== null && snap.currentAmps !== null
        ? Number((ratedCapacityAmps - snap.currentAmps).toFixed(1))
        : null;

    nodeStates.set(node.id, {
      nodeId: node.id,
      energization,
      activeSourceIds: Array.from(srcSet),
      hasFaultConflict: conflictNodeIds.has(node.id),
      openJobCardsCount: subtree.openJCs,
      activeLotoTags: Array.from(subtree.lotoTags),
      connectedEquipmentCount: subtree.connectedEq.length,
      operationalEquipmentCount: subtree.opCount,
      maintenanceEquipmentCount: subtree.maintCount,
      standbyEquipmentCount: subtree.standbyCount,
      connectedKw: Number(subtree.connectedKw.toFixed(1)),
      connectedRatedAmps: Number(connectedRatedAmps.toFixed(1)),
      connectedNameplateKva,
      liveAmps: Number(liveAmps.toFixed(1)),
      estimatedOperatingKva,
      estimatedUtilizationPct,
      effectiveDisplayAmps,
      isMeasuredOverride,
      displayDataSource,
      nominalVoltageV,
      ratedCapacityKva,
      ratedCapacityAmps,
      measuredCurrentAmps: snap.currentAmps,
      measuredPhaseCurrents: snap.phaseCurrents,
      phaseImbalancePct: snap.phaseImbalancePct,
      measuredVoltageV: snap.voltageV,
      measuredActivePowerKw: snap.activePowerKw,
      measuredApparentPowerKva: snap.apparentPowerKva,
      apparentPowerSource: snap.apparentPowerSource,
      measuredReactivePowerKvar: snap.reactivePowerKvar,
      measuredPowerFactor: snap.powerFactor,
      measuredFrequencyHz: snap.frequencyHz,
      measuredEnergyKwh: snap.energyKwh,
      measurementTimestamp: snap.timestamp,
      measurementSource: snap.source,
      measuredUtilizationPct,
      availableCapacityKva,
      availableCapacityAmps,
      measuredEquipmentCount: subtree.measuredEqCount,
      partialMeasuredEquipmentAmps:
        subtree.measuredEqCount > 0 ? Number(subtree.partialMeasuredEqAmps.toFixed(1)) : null,
      isSharedBusSource,
      sharedBusDemandAmps,
      sharedBusDemandKva,
      sourceActualOutputAmps,
      sourceActualOutputKw,
      sourceActualOutputKva,
      branchContributions: [],
      utilizationPct
    });
  }

  // Second pass: populate direct downstream branch contributions per node without double counting
  for (const node of nodes) {
    const parentState = nodeStates.get(node.id);
    if (!parentState) continue;

    const childIds = getDirectChildNodeIds(node.id, edges).filter((cid) => {
      // Avoid cyclic standby reverse view on BUS_TX1
      if (node.id === 'C7' && cid === 'BUS_TX1') return true;
      return true;
    });

    const parentTotalEstimated = parentState.liveAmps;
    const contributions: BranchLoadContribution[] = [];

    for (const childId of childIds) {
      const childNode = nodeMap.get(childId);
      const childState = nodeStates.get(childId);
      if (!childNode || !childState) continue;

      const share =
        parentTotalEstimated > 0
          ? Number(((childState.liveAmps / parentTotalEstimated) * 100).toFixed(1))
          : null;

      contributions.push({
        nodeId: childNode.id,
        code: childNode.code,
        name: childNode.name,
        operatingState: childNode.operatingState,
        equipmentCount: childState.connectedEquipmentCount,
        installedKw: childState.connectedKw,
        estimatedOperatingAmps: childState.liveAmps,
        estimatedApparentPowerKva: childState.estimatedOperatingKva,
        measuredCurrentAmps: childState.measuredCurrentAmps,
        measuredApparentPowerKva: childState.measuredApparentPowerKva,
        measurementSource: childState.measurementSource,
        shareOfParentEstimatedPct: share
      });
    }

    parentState.branchContributions = contributions;
  }

  // 6. Compute per-edge energization state
  const edgeStates = new Map<string, EnergizationStatus>();
  for (const edge of edges) {
    if (edge.edgeRole === 'INTERLOCK_TIE') {
      edgeStates.set(edge.id, c4C7Conflict ? 'FAULT_BACKFEED' : 'DE_ENERGIZED');
      continue;
    }
    const srcNode = nodeMap.get(edge.source);
    const tgtNode = nodeMap.get(edge.target);
    const srcState = nodeStates.get(edge.source);

    if (
      srcNode?.operatingState === 'DECOMMISSIONED' ||
      tgtNode?.operatingState === 'DECOMMISSIONED'
    ) {
      edgeStates.set(edge.id, 'DECOMMISSIONED');
    } else if (
      c4C7Conflict &&
      ['C4', 'C7', 'BUS_TX1', 'TX1', 'GEN_SET'].includes(edge.source) &&
      ['C4', 'C7', 'BUS_TX1', 'TX1', 'GEN_SET'].includes(edge.target)
    ) {
      edgeStates.set(edge.id, 'FAULT_BACKFEED');
    } else if (srcState?.energization === 'ENERGIZED' && srcNode?.operatingState === 'CLOSED') {
      edgeStates.set(edge.id, 'ENERGIZED');
    } else {
      edgeStates.set(edge.id, 'DE_ENERGIZED');
    }
  }

  // 7. Deduplicated Plant-Wide Totals (never sum parent + child)
  // Top-level transformers TX1 + TX2 + TX3 are disjoint subtrees across the plant.
  const txStates = ['TX1', 'TX2', 'TX3'].map(id => nodeStates.get(id)).filter((s): s is SolvedNodeState => Boolean(s));
  const bus11kVState = nodeStates.get('BUS_11KV');

  let uniqueInstalledKw = 0;
  for (const eq of equipmentList) {
    uniqueInstalledKw += Number(eq.powerKw) || 0;
  }

  const totalPlantEstimatedKva = Number(
    txStates.reduce((acc, s) => acc + (s.estimatedOperatingKva ?? 0), 0).toFixed(2)
  );

  const meteredTx = txStates.filter(s => s.measuredApparentPowerKva !== null);
  const totalPlantMeasuredKva =
    txStates.length > 0 && meteredTx.length === txStates.length
      ? Number(meteredTx.reduce((acc, s) => acc + (s.measuredApparentPowerKva ?? 0), 0).toFixed(2))
      : null;

  const kwMeteredTx = txStates.filter(s => s.measuredActivePowerKw !== null);
  const totalPlantMeasuredKw =
    txStates.length > 0 && kwMeteredTx.length === txStates.length
      ? Number(kwMeteredTx.reduce((acc, s) => acc + (s.measuredActivePowerKw ?? 0), 0).toFixed(2))
      : null;

  return {
    edges,
    nodeStates,
    edgeStates,
    c4C7Conflict,
    activeHvSourceCount: activeHvSources.length,
    totalPlantKw: Number(uniqueInstalledKw.toFixed(1)),
    totalPlantLiveAmps11kV: bus11kVState?.liveAmps ?? 0,
    totalPlantEstimatedKva,
    totalPlantMeasuredKva,
    totalPlantMeasuredKw,
    meteredTransformerCount: meteredTx.length,
    unassignedEquipment
  };
}
