import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ELECTRICAL_THRESHOLDS,
  SQRT_3,
  calculatePhaseImbalancePct,
  calculatePowerFactor,
  calculateThreePhaseActivePowerKw,
  calculateThreePhaseApparentPowerKva,
  calculateThreePhaseReactivePowerKvar,
  calculateTransformerUtilizationPct,
  deriveMeasurementQuantities,
  indexLatestMeasurementsByAsset,
  resolveNominalNodeVoltageV,
  validateMeasurementInput
} from './loadCalculations';
import { solvePlantElectricalState } from './topologySolver';
import {
  DEFAULT_POWER_NODES,
  computeNodeLoadMetrics,
  evaluatePowerDistributionHazards,
  resolveEquipmentFeederWithConfidence
} from '../master-data/powerDistributionData';
import {
  ElectricalMeasurement,
  Equipment,
  JobCard,
  PowerConnection,
  PowerDistributionNode
} from '../../types';

function cloneNodes(): PowerDistributionNode[] {
  return DEFAULT_POWER_NODES.map((n) => ({ ...n }));
}

const fixtureEquipment: Equipment[] = [
  {
    id: 'eq-mcc1-1',
    code: 'DIST-P01',
    name: 'Mash Column Pump 1',
    department: 'Production - Distillation Columns',
    location: 'Stillhouse',
    status: 'Operational',
    criticality: 'High',
    plantArea: 'Distillation',
    powerKw: 45,
    ratedCurrentAmps: 82,
    loadCurrentAmps: 70,
    feederPanel: 'MCC 1',
    feederNodeId: 'C8',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'eq-blr2-1',
    code: 'BLR2-ID1',
    name: 'Boiler 2 ID Fan',
    department: 'Utilities - Boiler House',
    location: 'Boiler 2',
    status: 'Operational',
    criticality: 'Critical',
    plantArea: 'Boiler 2',
    powerKw: 55,
    ratedCurrentAmps: 98,
    loadCurrentAmps: 85,
    feederPanel: 'Boiler 2',
    feederNodeId: 'C9',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'eq-mcc4-1',
    code: 'FERM-AG1',
    name: 'Fermenter 1 Agitator',
    department: 'Production - Fermentation Bay',
    location: 'Fermentation',
    status: 'Operational',
    criticality: 'High',
    plantArea: 'Fermentation',
    powerKw: 30,
    ratedCurrentAmps: 56,
    loadCurrentAmps: 45,
    feederPanel: 'MCC 4',
    feederNodeId: 'C10',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'eq-c18-wtp',
    code: 'WTP-P01',
    name: 'River Intake Pump',
    department: 'Utilities - Water Treatment',
    location: 'Usuthu River',
    status: 'Operational',
    criticality: 'Critical',
    plantArea: 'Water Treatment',
    powerKw: 37,
    ratedCurrentAmps: 66,
    loadCurrentAmps: 58,
    feederPanel: 'Old Water Treatment Plant',
    feederNodeId: 'C18',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'eq-c19-batch',
    code: 'BAT-M01',
    name: 'Green Tank Mixer',
    department: 'Production - Fermentation Bay',
    location: 'Batch Plant',
    status: 'Operational',
    criticality: 'Medium',
    plantArea: 'Green Tank',
    powerKw: 18.5,
    ratedCurrentAmps: 34,
    loadCurrentAmps: 26,
    feederPanel: 'Batch Plant',
    feederNodeId: 'C19',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'eq-c20-dam1',
    code: 'DAM1-P01',
    name: 'Dam 1 Mono Pump',
    department: 'Utilities - Effluent Plant',
    location: 'Dam 1',
    status: 'Operational',
    criticality: 'Medium',
    plantArea: 'Molasses Dam 1',
    powerKw: 22,
    ratedCurrentAmps: 41,
    loadCurrentAmps: 31,
    feederPanel: 'Dam 1 (slops)',
    feederNodeId: 'C20',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'eq-c16-blr3',
    code: 'BLR3-ID1',
    name: 'Boiler 3 ID Fan',
    department: 'Utilities - Boiler House',
    location: 'Boiler 3',
    status: 'Operational',
    criticality: 'Critical',
    plantArea: 'Boiler 3',
    powerKw: 75,
    ratedCurrentAmps: 132,
    loadCurrentAmps: 110,
    feederPanel: 'Boiler 3',
    feederNodeId: 'C16',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

function solvePlant(
  nodes: PowerDistributionNode[],
  equipmentList: Equipment[] = fixtureEquipment,
  connections: PowerConnection[] = [],
  measurements: ElectricalMeasurement[] = []
) {
  return solvePlantElectricalState(
    nodes,
    equipmentList,
    [] as JobCard[],
    (eq) => {
      const info = resolveEquipmentFeederWithConfidence(eq);
      return {
        breakerId: info.breakerId,
        confidence: info.confidence === 'UNASSIGNED' ? 'NAME_HEURISTIC' : info.confidence
      };
    },
    connections,
    measurements
  );
}

test('1. Three-phase formulas and plant nominal voltage tiers match electrical equations', () => {
  // Apparent power S = √3 × V × I / 1000
  const s = calculateThreePhaseApparentPowerKva(415, 1000);
  assert.equal(s, Number(((SQRT_3 * 415 * 1000) / 1000).toFixed(2))); // 718.80

  // Active power P = √3 × V × I × PF / 1000
  const p = calculateThreePhaseActivePowerKw(415, 1000, 0.85);
  assert.equal(p, Number(((SQRT_3 * 415 * 1000 * 0.85) / 1000).toFixed(2))); // 610.98

  // Reactive power Q = √(S² - P²)
  const q = calculateThreePhaseReactivePowerKvar(s, p);
  assert.equal(q, Number(Math.sqrt(s! * s! - p! * p!).toFixed(2))); // 378.65

  // Power factor PF = P / S
  assert.equal(calculatePowerFactor(p, s), 0.85);

  // Transformer utilisation % = Measured kVA / Rated kVA × 100
  assert.equal(calculateTransformerUtilizationPct(800, 1600), 50);
  assert.equal(calculateTransformerUtilizationPct(1280, 1600), 80);

  // Phase imbalance % = max(|Li - avg|) / avg × 100
  assert.equal(calculatePhaseImbalancePct(100, 100, 100), 0);
  assert.equal(calculatePhaseImbalancePct(120, 90, 90), 20);
  assert.equal(calculatePhaseImbalancePct(100, 95, null), null);

  // Exact plant voltage tiers
  const byId = new Map(DEFAULT_POWER_NODES.map((n) => [n.id, n]));
  assert.equal(resolveNominalNodeVoltageV(byId.get('TX1')!), 415);
  assert.equal(resolveNominalNodeVoltageV(byId.get('C4')!), 415);
  assert.equal(resolveNominalNodeVoltageV(byId.get('TX2')!), 420);
  assert.equal(resolveNominalNodeVoltageV(byId.get('TX3')!), 420);
  assert.equal(resolveNominalNodeVoltageV(byId.get('BUS_11KV')!), 11000);
  assert.equal(resolveNominalNodeVoltageV(byId.get('OLD_TURBINE')!), 6300);
  assert.equal(resolveNominalNodeVoltageV(byId.get('C8')!), 400);
});

test('2. Null/missing-input honesty: never fabricates PF, kVA, kVAr, or 0 measured load when unrecorded', () => {
  const onlyCurrent = deriveMeasurementQuantities({ currentAmps: 120 }, 415);
  assert.equal(onlyCurrent.currentAmps, 120);
  assert.equal(onlyCurrent.voltageV, null);
  assert.equal(onlyCurrent.voltageSource, 'ESTIMATED');
  assert.equal(onlyCurrent.apparentPowerKva, calculateThreePhaseApparentPowerKva(415, 120));
  assert.equal(onlyCurrent.activePowerKw, null);
  assert.equal(onlyCurrent.reactivePowerKvar, null);
  assert.equal(onlyCurrent.powerFactor, null);
  assert.equal(onlyCurrent.phaseImbalancePct, null);

  // With zero logged electricalMeasurements, no transformer or plant measured totals may be fabricated as 0
  const nodes = cloneNodes();
  const solved = solvePlant(nodes, fixtureEquipment, [], []);

  for (const txId of ['TX1', 'TX2', 'TX3']) {
    const tx = solved.nodeStates.get(txId)!;
    assert.equal(tx.measuredCurrentAmps, null);
    assert.equal(tx.measuredApparentPowerKva, null);
    assert.equal(tx.measuredActivePowerKw, null);
    assert.equal(tx.measuredPowerFactor, null);
    assert.equal(tx.measuredUtilizationPct, null);
    assert.equal(tx.displayDataSource, 'ESTIMATED');
  }

  assert.equal(solved.meteredTransformerCount, 0);
  assert.equal(solved.totalPlantMeasuredKva, null);
  assert.equal(solved.totalPlantMeasuredKw, null);
});

test('3. validateMeasurementInput rejects invalid currents, voltages, PF, Hz, timestamps, empty payloads, P>S, and bad sources', () => {
  const validNow = new Date(Date.now() - 60_000).toISOString();
  const base = {
    assetId: 'TX1',
    assetKind: 'POWER_NODE' as const,
    measurementType: 'COMPREHENSIVE_PANEL' as const,
    phase: '3PH_TOTAL' as const,
    unit: 'A / V / kW',
    source: 'MEASURED' as const,
    timestamp: validNow,
    recordedBy: 'Chief Electrician',
    recordedByUid: 'uid-123'
  };

  assert.equal(
    validateMeasurementInput({
      ...base,
      values: { currentAmps: 450, voltageV: 415, powerFactor: 0.88 }
    }).valid,
    true
  );

  // Negative current
  assert.equal(
    validateMeasurementInput({ ...base, values: { currentAmps: -5 } }).valid,
    false
  );
  // Zero / negative voltage
  assert.equal(
    validateMeasurementInput({ ...base, values: { voltageV: 0 } }).valid,
    false
  );
  // Out-of-range PF (<=0 or >1)
  assert.equal(
    validateMeasurementInput({ ...base, values: { powerFactor: 0 } }).valid,
    false
  );
  assert.equal(
    validateMeasurementInput({ ...base, values: { powerFactor: 1.05 } }).valid,
    false
  );
  // Out-of-range Frequency (<40 or >70)
  assert.equal(
    validateMeasurementInput({ ...base, values: { frequencyHz: 35 } }).valid,
    false
  );
  assert.equal(
    validateMeasurementInput({ ...base, values: { frequencyHz: 75 } }).valid,
    false
  );
  // Malformed or future timestamp
  assert.equal(
    validateMeasurementInput({ ...base, timestamp: 'not-a-date', values: { currentAmps: 10 } }).valid,
    false
  );
  assert.equal(
    validateMeasurementInput({
      ...base,
      timestamp: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      values: { currentAmps: 10 }
    }).valid,
    false
  );
  // Empty readings object
  assert.equal(validateMeasurementInput({ ...base, values: {} }).valid, false);
  // P > S
  assert.equal(
    validateMeasurementInput({
      ...base,
      values: { activePowerKw: 500, apparentPowerKva: 400 }
    }).valid,
    false
  );
  // Non-MEASURED/METERED classification
  assert.equal(
    validateMeasurementInput({
      ...base,
      source: 'ESTIMATED' as unknown as 'MEASURED',
      values: { currentAmps: 100 }
    }).valid,
    false
  );
});

test('4. Hierarchical aggregation sums exact downstream branches without double-counting parents or multi-source edges', () => {
  const nodes = cloneNodes();
  const solved = solvePlant(nodes, fixtureEquipment);

  // TX1 = MCC1 (45kW, 70A) + Boiler 2 (55kW, 85A) + MCC 4 (30kW, 45A) = 130 kW, 200 A
  const tx1 = solved.nodeStates.get('TX1')!;
  const c8 = solved.nodeStates.get('C8')!;
  const c9 = solved.nodeStates.get('C9')!;
  const c10 = solved.nodeStates.get('C10')!;
  assert.equal(tx1.connectedKw, c8.connectedKw + c9.connectedKw + c10.connectedKw);
  assert.equal(tx1.connectedKw, 130);
  assert.equal(tx1.liveAmps, 200);

  // C12 = C18 (37kW, 58A) + C19 (18.5kW, 26A) + C20 (22kW, 31A) = 77.5 kW, 115 A
  const c12 = solved.nodeStates.get('C12')!;
  assert.equal(c12.connectedKw, 77.5);
  assert.equal(c12.liveAmps, 115);

  // Deduplicated plant-wide total installed kW (sum of unique fixture equipment only: 45+55+30+37+18.5+22+75 = 282.5 kW)
  assert.equal(solved.totalPlantKw, 282.5);

  // Multi-source standby connection from BUS_TX3 -> C12 must NOT double-count C18/C19/C20 equipment
  const standbyTie: PowerConnection = {
    id: 'TIE_TX3_C12',
    sourceNodeId: 'BUS_TX3',
    targetNodeId: 'C12',
    voltageTier: '400V',
    edgeRole: 'STANDBY_FEED',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
  const solvedWithTie = solvePlant(nodes, fixtureEquipment, [standbyTie]);
  assert.equal(solvedWithTie.totalPlantKw, 282.5);
  // Under BUS_TX3: C16 (75kW) + C12 subtree (77.5kW) counted once each = 152.5 kW
  assert.equal(solvedWithTie.nodeStates.get('BUS_TX3')?.connectedKw, 152.5);
});

test('5. Shared bus demand vs source actual output separation never equates rated kVA with generator/turbine output', () => {
  const nodes = cloneNodes();
  const baseline = solvePlant(nodes, fixtureEquipment);

  const newTurbine = baseline.nodeStates.get('NEW_TURBINE')!;
  const genSet = baseline.nodeStates.get('GEN_SET')!;

  // Rated capacities preserved, but actual output is strictly null when unmeasured
  assert.equal(newTurbine.ratedCapacityKva, 4223.96);
  assert.equal(newTurbine.sourceActualOutputKva, null);
  assert.equal(newTurbine.sourceActualOutputKw, null);
  assert.equal(newTurbine.sourceActualOutputAmps, null);
  assert.ok((newTurbine.sharedBusDemandAmps ?? 0) > 0);
  assert.ok((newTurbine.sharedBusDemandKva ?? 0) > 0);

  assert.equal(genSet.ratedCapacityKva, 680);
  assert.equal(genSet.sourceActualOutputKva, null);
  assert.ok((genSet.sharedBusDemandAmps ?? 0) === 200); // BUS_TX1 estimated demand

  // Adding a METERED reading for NEW_TURBINE populates actual output while leaving nameplate capacity intact
  const nowIso = new Date().toISOString();
  const turbineMeter: ElectricalMeasurement = {
    id: 'm-turb-1',
    assetId: 'NEW_TURBINE',
    assetKind: 'POWER_NODE',
    assetCode: 'T/A (NEW)',
    measurementType: 'COMPREHENSIVE_PANEL',
    phase: '3PH_TOTAL',
    unit: 'A / V / kW',
    source: 'METERED',
    values: {
      voltageV: 11000,
      currentAmps: 110,
      powerFactor: 0.92
    },
    timestamp: nowIso,
    recordedBy: 'Plant Engineer',
    recordedByUid: 'eng-1',
    createdAt: nowIso
  };

  // Also test standby Gen Set C7 breaker metering propagation when GEN_SET node itself has no direct reading
  const c7Meter: ElectricalMeasurement = {
    id: 'm-c7-1',
    assetId: 'C7',
    assetKind: 'POWER_NODE',
    assetCode: 'C7',
    measurementType: 'POWER',
    phase: '3PH_TOTAL',
    unit: 'A / V / kW',
    source: 'MEASURED',
    values: {
      voltageV: 400,
      currentAmps: 310,
      powerFactor: 0.86
    },
    timestamp: nowIso,
    recordedBy: 'Electrician',
    recordedByUid: 'elec-1',
    createdAt: nowIso
  };

  const withReadings = solvePlant(nodes, fixtureEquipment, [], [turbineMeter, c7Meter]);
  const ntSolved = withReadings.nodeStates.get('NEW_TURBINE')!;
  const gsSolved = withReadings.nodeStates.get('GEN_SET')!;

  assert.equal(ntSolved.ratedCapacityKva, 4223.96);
  assert.equal(ntSolved.sourceActualOutputAmps, 110);
  assert.equal(ntSolved.sourceActualOutputKva, calculateThreePhaseApparentPowerKva(11000, 110));
  assert.equal(ntSolved.sourceActualOutputKw, calculateThreePhaseActivePowerKw(11000, 110, 0.92));

  assert.equal(gsSolved.ratedCapacityKva, 680);
  assert.equal(gsSolved.sourceActualOutputAmps, 310);
  assert.equal(gsSolved.sourceActualOutputKva, calculateThreePhaseApparentPowerKva(400, 310));
});

test('6. indexLatestMeasurementsByAsset picks newest ISO timestamp per asset while preserving audit history', () => {
  const older: ElectricalMeasurement = {
    id: 'm-1',
    assetId: 'TX1',
    assetKind: 'POWER_NODE',
    measurementType: 'CURRENT',
    phase: '3PH_AVG',
    unit: 'A',
    source: 'MEASURED',
    values: { currentAmps: 900, voltageV: 415 },
    timestamp: '2026-10-01T08:00:00.000Z',
    recordedBy: 'Tech A',
    recordedByUid: 'u1',
    createdAt: '2026-10-01T08:00:00.000Z'
  };
  const newer: ElectricalMeasurement = {
    id: 'm-2',
    assetId: 'TX1',
    assetKind: 'POWER_NODE',
    measurementType: 'CURRENT',
    phase: '3PH_AVG',
    unit: 'A',
    source: 'METERED',
    values: { currentAmps: 1250, voltageV: 415, powerFactor: 0.9 },
    timestamp: '2026-10-02T14:30:00.000Z',
    recordedBy: 'Eng B',
    recordedByUid: 'u2',
    createdAt: '2026-10-02T14:30:00.000Z'
  };

  const history = [newer, older];
  const indexed = indexLatestMeasurementsByAsset(history);
  assert.equal(indexed.get('TX1')?.id, 'm-2');
  assert.equal(history.length, 2);

  const nodes = cloneNodes();
  const tx1Node = nodes.find((n) => n.id === 'TX1')!;
  const metrics = computeNodeLoadMetrics(tx1Node, nodes, fixtureEquipment, [], [], [older, newer]);
  assert.equal(metrics.measuredCurrentAmps, 1250);
  assert.equal(metrics.measurementSource, 'METERED');
});

test('7. evaluatePowerDistributionHazards respects configurable thresholds and separates MEASURED vs ESTIMATED dataBasis', () => {
  const nodes = cloneNodes();
  const nowIso = new Date().toISOString();

  // Create TX2 reading with: high loading (avg 1000A @ 385V -> 666.84 kVA = 83.4% of 800 kVA),
  // phase imbalance > 15% (1260, 870, 870 -> avg 1000, maxDev 260 -> 26%),
  // voltage deviation > 5% (385V vs 420V -> 8.3%), poor PF 0.78
  const tx2AlertMeasurement: ElectricalMeasurement = {
    id: 'm-tx2-warn',
    assetId: 'TX2',
    assetKind: 'POWER_NODE',
    assetCode: 'Tx2',
    measurementType: 'COMPREHENSIVE_PANEL',
    phase: '3PH_TOTAL',
    unit: 'A / V / kW',
    source: 'METERED',
    values: {
      currentL1Amps: 1260,
      currentL2Amps: 870,
      currentL3Amps: 870,
      voltageV: 385,
      powerFactor: 0.78
    },
    timestamp: nowIso,
    recordedBy: 'Control Room Meter',
    recordedByUid: 'u-meter',
    createdAt: nowIso
  };

  // Also trigger C4 measured breaker overload via custom threshold lowered to 50% (1300A / 2500A = 52%)
  const c4AlertMeasurement: ElectricalMeasurement = {
    id: 'm-c4-warn',
    assetId: 'C4',
    assetKind: 'POWER_NODE',
    assetCode: 'C4',
    measurementType: 'CURRENT',
    phase: '3PH_AVG',
    unit: 'A',
    source: 'MEASURED',
    values: {
      currentAmps: 1300,
      voltageV: 415
    },
    timestamp: nowIso,
    recordedBy: 'Clamp Meter Tech',
    recordedByUid: 'u-tech',
    createdAt: nowIso
  };

  const alertsDefault = evaluatePowerDistributionHazards(
    nodes,
    fixtureEquipment,
    [],
    [],
    [tx2AlertMeasurement, c4AlertMeasurement],
    DEFAULT_ELECTRICAL_THRESHOLDS
  );

  const tx2LoadAlert = alertsDefault.find((a) => a.id === 'HAZARD-TX-LOAD-TX2');
  const tx2ImbalanceAlert = alertsDefault.find((a) => a.id === 'HAZARD-IMBALANCE-TX2');
  const tx2VoltageAlert = alertsDefault.find((a) => a.id === 'HAZARD-VOLTAGE-TX2');
  const tx2PfAlert = alertsDefault.find((a) => a.id === 'HAZARD-PF-TX2');

  assert.ok(tx2LoadAlert);
  assert.equal(tx2LoadAlert?.dataBasis, 'METERED');
  assert.ok(tx2ImbalanceAlert);
  assert.equal(tx2ImbalanceAlert?.dataBasis, 'METERED');
  assert.ok(tx2VoltageAlert);
  assert.equal(tx2VoltageAlert?.dataBasis, 'METERED');
  assert.ok(tx2PfAlert);
  assert.equal(tx2PfAlert?.dataBasis, 'METERED');

  // With default 85% breaker threshold, C4 at 52% should NOT alert; with custom 50%, it MUST alert as MEASURED
  assert.equal(alertsDefault.some((a) => a.id === 'HAZARD-OVERLOAD-C4'), false);

  const alertsStrict = evaluatePowerDistributionHazards(
    nodes,
    fixtureEquipment,
    [],
    [],
    [tx2AlertMeasurement, c4AlertMeasurement],
    {
      ...DEFAULT_ELECTRICAL_THRESHOLDS,
      breakerWarningPct: 50
    }
  );
  const c4Overload = alertsStrict.find((a) => a.id === 'HAZARD-OVERLOAD-C4');
  assert.ok(c4Overload);
  assert.equal(c4Overload?.dataBasis, 'MEASURED');
});
