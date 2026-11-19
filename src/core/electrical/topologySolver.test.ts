import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_POWER_NODES,
  FEEDER_PANELS,
  LOGICAL_MCC_GROUPS,
  computeNodeLoadMetrics,
  evaluatePowerDistributionHazards,
  getLogicalMccGroupForNode,
  getUpstreamChain,
  resolveEquipmentFeederWithConfidence
} from '../master-data/powerDistributionData';
import {
  AUTHORITATIVE_POWER_EDGES,
  buildEffectivePowerEdges,
  getDirectParentNodeIds,
  solvePlantElectricalState
} from './topologySolver';
import {
  isAuthorizedElectricalEngineer,
  validateEquipmentIntegrity,
  validatePowerConnectionCandidate,
  validateSafeEquipmentDelete
} from './permissions';
import { buildSldDiagramElements } from './sldLayout';
import {
  Equipment,
  FeederPanelId,
  JobCard,
  PowerConnection,
  PowerDistributionNode
} from '../../types';

const sampleEquipment: Equipment[] = [
  {
    id: 'eq-dist-1',
    code: 'EQ-DIST-01',
    name: 'Wash Column Feed Pump 1',
    department: 'Production - Distillation Columns',
    location: 'Stillhouse',
    status: 'Operational',
    criticality: 'High',
    plantArea: 'Distillation',
    powerKw: 15,
    ratedCurrentAmps: 28,
    loadCurrentAmps: 24,
    starterType: 'VSD',
    feederPanel: 'MCC 1',
    feederNodeId: 'C8',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'eq-wtp-1',
    code: 'EQ-WTP-01',
    name: 'River Intake Pump 1',
    department: 'Utilities - Water Treatment',
    location: 'Usuthu River Pump House',
    status: 'Operational',
    criticality: 'Critical',
    plantArea: 'Water Treatment',
    powerKw: 37,
    ratedCurrentAmps: 66,
    loadCurrentAmps: 58,
    starterType: 'Y/D',
    feederPanel: 'Old Water Treatment Plant',
    feederNodeId: 'C18',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'eq-blr3-1',
    code: 'EQ-BLR3-01',
    name: 'Boiler 3 ID Fan',
    department: 'Utilities - Boiler House',
    location: 'Boiler 3',
    status: 'Operational',
    criticality: 'Critical',
    plantArea: 'Boiler 3',
    powerKw: 55,
    ratedCurrentAmps: 98,
    loadCurrentAmps: 84,
    starterType: 'VSD',
    feederPanel: 'Boiler 3',
    feederNodeId: 'C16',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

const sampleJobCards: JobCard[] = [
  {
    id: 'jc-1',
    jobCardNumber: 'JC-1001',
    department: 'Utilities - Water Treatment',
    departmentCategory: 'Utilities',
    equipmentName: 'River Intake Pump 1',
    equipmentId: 'eq-wtp-1',
    priority: 'High',
    status: 'In Progress',
    description: 'Seal inspection under LOTO',
    assignedTo: 'Electrician',
    targetDate: '2026-06-01',
    totalLaborHours: 2,
    laborLogs: [],
    comments: [],
    createdById: 'u1',
    createdByName: 'Eng Sup',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    safetyPermits: {
      lotoRequired: true,
      lotoTag: 'LOTO-WTP-09',
      hotWorkRequired: false,
      confinedSpaceRequired: false,
      heightPermitRequired: false
    }
  }
];

function cloneNodes(): PowerDistributionNode[] {
  return DEFAULT_POWER_NODES.map(n => ({ ...n }));
}

function solve(nodes: PowerDistributionNode[], eq = sampleEquipment, jcs = sampleJobCards) {
  return solvePlantElectricalState(nodes, eq, jcs, (item) => {
    const info = resolveEquipmentFeederWithConfidence(item);
    return {
      breakerId: info.breakerId,
      confidence: info.confidence === 'UNASSIGNED' ? 'NAME_HEURISTIC' : info.confidence
    };
  });
}

test('Authoritative master data preserves all 36 power nodes and 12 feeder panels', () => {
  assert.equal(DEFAULT_POWER_NODES.length, 36);
  assert.equal(FEEDER_PANELS.length, 12);
});

test('Dead-bus detection de-energizes BUS_11KV and downstream transformers when C2 and C3 are OPEN', () => {
  const nodes = cloneNodes();
  for (const n of nodes) {
    if (n.id === 'C2' || n.id === 'C3') n.operatingState = 'OPEN';
  }
  const result = solve(nodes);
  assert.equal(result.activeHvSourceCount, 0);
  assert.equal(result.nodeStates.get('BUS_11KV')?.energization, 'DE_ENERGIZED');
  assert.equal(result.nodeStates.get('BUS_11KV')?.liveAmps, 0);
  assert.equal(result.nodeStates.get('C8')?.liveAmps, 0);
  assert.equal(result.nodeStates.get('C16')?.liveAmps, 0);
});

test('Decommissioned Old Turbine path remains isolated', () => {
  const result = solve(cloneNodes());
  assert.equal(result.nodeStates.get('OLD_TURBINE')?.energization, 'DECOMMISSIONED');
  assert.equal(result.nodeStates.get('OLD_STEP_UP_TX')?.energization, 'DECOMMISSIONED');
  assert.equal(result.nodeStates.get('C1')?.energization, 'DECOMMISSIONED');
});

test('Simultaneous closure of un-interlocked C4 and C7 triggers FAULT_BACKFEED and CRITICAL hazard', () => {
  const nodes = cloneNodes();
  for (const n of nodes) {
    if (n.id === 'C4' || n.id === 'C7' || n.id === 'GEN_SET') {
      n.operatingState = 'CLOSED';
    }
  }
  const result = solve(nodes);
  assert.equal(result.c4C7Conflict, true);
  assert.equal(result.nodeStates.get('C4')?.energization, 'FAULT_BACKFEED');
  assert.equal(result.nodeStates.get('C7')?.energization, 'FAULT_BACKFEED');
  assert.equal(result.edgeStates.get('E-INTERLOCK-C4-C7'), 'FAULT_BACKFEED');

  const hazards = evaluatePowerDistributionHazards(nodes, sampleEquipment, sampleJobCards);
  assert.ok(hazards.some(h => h.severity === 'CRITICAL' && h.id === 'HAZARD-C4-C7-SIMULTANEOUS-CLOSE'));
});

test('Opening C12 cuts live amps on C18/C19/C20 while preserving connected FLC', () => {
  const nodes = cloneNodes();
  for (const n of nodes) {
    if (n.id === 'C12') n.operatingState = 'OPEN';
  }
  const c18 = nodes.find(n => n.id === 'C18')!;
  const metrics = computeNodeLoadMetrics(c18, nodes, sampleEquipment, sampleJobCards);
  assert.equal(metrics.runningLoadAmps, 0);
  assert.equal(metrics.connectedRatedAmps, 66);
  assert.equal(metrics.activeJobCards, 1);
});

test('HV primary current scales accurately using 415/11000 on Tx1 and 420/11000 on Tx3', () => {
  const nodes = cloneNodes();
  const result = solve(nodes);
  const tx1FuseLive = result.nodeStates.get('TX1_FUSE')?.liveAmps ?? 0;
  const tx3FuseLive = result.nodeStates.get('TX3_FUSE')?.liveAmps ?? 0;

  assert.equal(tx1FuseLive, Number((24 * (415 / 11000)).toFixed(1)));
  assert.equal(tx3FuseLive, Number((84 * (420 / 11000)).toFixed(1)));
});

test('Upstream breadcrumb chain for GEN_SET and C7 resolves without cycles', () => {
  const chainC7 = getUpstreamChain('C7', DEFAULT_POWER_NODES);
  assert.deepEqual(
    chainC7.map(n => n.id),
    ['GEN_SET', 'C7']
  );
});

test('SLD layout builder renders full topology and respects C12 collapse/expand', () => {
  const nodes = cloneNodes();
  const solved = solve(nodes);

  const expanded = buildSldDiagramElements({
    powerNodes: nodes,
    solved,
    equipmentList: sampleEquipment,
    jobCards: sampleJobCards,
    selectedNodeId: 'C18',
    searchQuery: '',
    expandedBranchIds: new Set(['BUS_TX1', 'BUS_TX2', 'BUS_TX3', 'C12']),
    expandedPanelIds: new Set<FeederPanelId>(['Old Water Treatment Plant']),
    onSelectNode: () => {},
    onToggleBranch: () => {},
    onTogglePanelLoads: () => {}
  });
  assert.ok(expanded.nodes.some(n => n.id === 'C18'));
  assert.ok(expanded.nodes.some(n => n.id === 'mcc-Old Water Treatment Plant'));

  const collapsedC12 = buildSldDiagramElements({
    powerNodes: nodes,
    solved,
    equipmentList: sampleEquipment,
    jobCards: sampleJobCards,
    selectedNodeId: null,
    searchQuery: '',
    expandedBranchIds: new Set(['BUS_TX1', 'BUS_TX2', 'BUS_TX3']),
    expandedPanelIds: new Set<FeederPanelId>(),
    onSelectNode: () => {},
    onToggleBranch: () => {},
    onTogglePanelLoads: () => {}
  });
  assert.equal(collapsedC12.nodes.some(n => n.id === 'C18'), false);
  assert.equal(collapsedC12.nodes.some(n => n.id === 'C12'), true);
});

test('Multi-source PowerConnection merges cleanly and enables multi-parent lookup', () => {
  const nodes = cloneNodes();
  // Isolate C12 primary path from TX2, then add a custom standby link from BUS_TX3 -> C12
  for (const n of nodes) {
    if (n.id === 'C5') n.operatingState = 'OPEN';
  }
  const standbyTie: PowerConnection = {
    id: 'CONN_TX3_TO_C12',
    sourceNodeId: 'BUS_TX3',
    targetNodeId: 'C12',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    voltageTier: '400V',
    edgeRole: 'STANDBY_FEED',
    label: 'Alternate Tie Tx3 -> C12',
    isAuthoritative: false,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z'
  };

  const mergedEdges = buildEffectivePowerEdges(nodes, [standbyTie]);
  assert.ok(mergedEdges.some(e => e.id === 'CONN_TX3_TO_C12'));

  const parentIds = getDirectParentNodeIds('C12', mergedEdges);
  assert.ok(parentIds.includes('BUS_TX2'));
  assert.ok(parentIds.includes('BUS_TX3'));

  const solvedWithTie = solvePlantElectricalState(
    nodes,
    sampleEquipment,
    sampleJobCards,
    (item) => {
      const info = resolveEquipmentFeederWithConfidence(item);
      return {
        breakerId: info.breakerId,
        confidence: info.confidence === 'UNASSIGNED' ? 'NAME_HEURISTIC' : info.confidence
      };
    },
    [standbyTie]
  );

  // Even with C5 OPEN on Tx2, C12 and C18 remain energized via BUS_TX3 standby feed
  assert.equal(solvedWithTie.nodeStates.get('C12')?.energization, 'ENERGIZED');
  assert.equal(solvedWithTie.nodeStates.get('C18')?.energization, 'ENERGIZED');
  assert.equal(solvedWithTie.nodeStates.get('C18')?.liveAmps, 58);
});

test('All 12 MCC/DB logical groups resolve accurately via incoming breaker or panel ID', () => {
  assert.equal(LOGICAL_MCC_GROUPS.length, 12);
  const expectedMappings: Array<[string, FeederPanelId]> = [
    ['C8', 'MCC 1'],
    ['C9', 'Boiler 2'],
    ['C10', 'MCC 4'],
    ['C11', 'MCC 2'],
    ['C13', 'Boiler 1'],
    ['C14', 'MCC 3'],
    ['C15', 'Sub DB1 Compressors'],
    ['C16', 'Boiler 3'],
    ['C17', 'New Water Treatment Plant'],
    ['C18', 'Old Water Treatment Plant'],
    ['C19', 'Batch Plant'],
    ['C20', 'Dam 1 (slops)']
  ];

  for (const [breakerId, panelId] of expectedMappings) {
    const byBreaker = getLogicalMccGroupForNode(breakerId);
    const byPanel = getLogicalMccGroupForNode(panelId);
    assert.ok(byBreaker, `Expected logical group for ${breakerId}`);
    assert.equal(byBreaker?.panelId, panelId);
    assert.equal(byPanel?.incomingBreakerId, breakerId);
  }
});

test('validateEquipmentIntegrity rejects duplicate normalized tags and orphaned feeder links', () => {
  const dup = validateEquipmentIntegrity(
    {
      code: ' eq-dist-01 ',
      name: 'Duplicate Wash Pump',
      feederNodeId: 'C8',
      feederPanel: 'MCC 1'
    },
    sampleEquipment,
    DEFAULT_POWER_NODES
  );
  assert.equal(dup.valid, false);
  assert.match(dup.error || '', /Duplicate asset tag/i);

  const orphanNode = validateEquipmentIntegrity(
    {
      code: 'EQ-NEW-99',
      name: 'Unlinked Pump',
      feederNodeId: 'C999',
      feederPanel: 'MCC 1'
    },
    sampleEquipment,
    DEFAULT_POWER_NODES
  );
  assert.equal(orphanNode.valid, false);
  assert.match(orphanNode.error || '', /Orphaned electrical link/i);

  const orphanPanel = validateEquipmentIntegrity(
    {
      code: 'EQ-NEW-100',
      name: 'Phantom Panel Pump',
      feederNodeId: 'C8',
      feederPanel: 'MCC 99'
    },
    sampleEquipment,
    DEFAULT_POWER_NODES
  );
  assert.equal(orphanPanel.valid, false);
  assert.match(orphanPanel.error || '', /Orphaned feeder panel/i);

  const valid = validateEquipmentIntegrity(
    {
      code: 'EQ-NWTP-01',
      name: 'New WTP Feed Pump 1',
      feederNodeId: 'C17',
      feederPanel: 'New Water Treatment Plant'
    },
    sampleEquipment,
    DEFAULT_POWER_NODES
  );
  assert.equal(valid.valid, true);
});

test('validatePowerConnectionCandidate rejects orphan nodes, self-loops, duplicates, and cycles', () => {
  const orphan = validatePowerConnectionCandidate(
    { sourceNodeId: 'MISSING', targetNodeId: 'C17', edgeRole: 'STANDBY_FEED' },
    DEFAULT_POWER_NODES,
    AUTHORITATIVE_POWER_EDGES
  );
  assert.equal(orphan.valid, false);

  const selfLoop = validatePowerConnectionCandidate(
    { sourceNodeId: 'C8', targetNodeId: 'C8', edgeRole: 'STANDBY_FEED' },
    DEFAULT_POWER_NODES,
    AUTHORITATIVE_POWER_EDGES
  );
  assert.equal(selfLoop.valid, false);

  const duplicate = validatePowerConnectionCandidate(
    { sourceNodeId: 'BUS_TX1', targetNodeId: 'C8', edgeRole: 'PRIMARY_FEED' },
    DEFAULT_POWER_NODES,
    AUTHORITATIVE_POWER_EDGES
  );
  assert.equal(duplicate.valid, false);

  const cycle = validatePowerConnectionCandidate(
    { sourceNodeId: 'C8', targetNodeId: 'BUS_TX1', edgeRole: 'STANDBY_FEED' },
    DEFAULT_POWER_NODES,
    AUTHORITATIVE_POWER_EDGES
  );
  assert.equal(cycle.valid, false);
  assert.match(cycle.error || '', /Cycle rejected/i);
});

test('validateSafeEquipmentDelete protects assets referenced by historical job cards', () => {
  const blocked = validateSafeEquipmentDelete(sampleEquipment[1], sampleJobCards);
  assert.equal(blocked.canDelete, false);
  assert.equal(blocked.referencingJobCards.length, 1);

  const allowed = validateSafeEquipmentDelete(sampleEquipment[0], sampleJobCards);
  assert.equal(allowed.canDelete, true);
  assert.equal(allowed.referencingJobCards.length, 0);
});

test('isAuthorizedElectricalEngineer enforces strict engineering RBAC roles', () => {
  assert.equal(isAuthorizedElectricalEngineer('Admin', 'admin@usadistillers.co.sz'), true);
  assert.equal(isAuthorizedElectricalEngineer('Manager', 'hod@usadistillers.co.sz'), true);
  assert.equal(isAuthorizedElectricalEngineer('Supervisor', 'sup@usadistillers.co.sz'), true);
  assert.equal(isAuthorizedElectricalEngineer('Technician', 'sifisani@gmail.com'), true);
  assert.equal(isAuthorizedElectricalEngineer('Technician', 'tech@usadistillers.co.sz'), false);
  assert.equal(isAuthorizedElectricalEngineer('Operator', 'op@usadistillers.co.sz'), false);
  assert.equal(isAuthorizedElectricalEngineer(null, null), false);
});

