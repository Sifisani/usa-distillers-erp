import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_INSPECTION_TEMPLATES,
  MAX_INSPECTION_PHOTOS,
  MAX_PHOTO_DATA_URL_BYTES,
  SubmitInspectionInput,
  buildJobCardPrefillFromInspection,
  collectElectricalMaintenanceAlerts,
  evaluateAssetInspectionDue,
  indexLatestInspectionsByAsset,
  matchJobCardsForPowerNode,
  resolveAssetMaintenanceCondition,
  resolveInspectionCategoryForNode,
  validateElectricalInspectionInput
} from './inspections';
import {
  canManageInspectionTemplates,
  canReviewElectricalInspection,
  canSubmitElectricalInspection
} from './permissions';
import { DEFAULT_POWER_NODES } from '../master-data/powerDistributionData';
import {
  ElectricalInspection,
  ElectricalInspectionReview,
  Equipment
} from '../../types';

const SAMPLE_EQUIPMENT: Equipment[] = [
  {
    id: 'eq-ferm-p1',
    code: 'EQ-FERM-01',
    name: 'Mash Transfer Pump 1',
    department: 'Production - Fermentation Bay',
    location: 'Fermentation Bay',
    plantArea: 'Fermentation',
    feederPanel: 'MCC 4',
    feederBreaker: 'C8',
    status: 'Operational',
    criticality: 'High',
    powerKw: 22,
    ratedCurrentAmps: 41,
    overloadAmps: 45,
    starterType: 'Y/D',
    speedRpm: 1470,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

function makeBaseSubmission(overrides: Partial<SubmitInspectionInput> = {}): SubmitInspectionInput {
  return {
    assetId: 'C8',
    assetKind: 'POWER_NODE',
    assetCode: 'C8',
    assetName: 'MCC 4 Incomer Breaker',
    assetCategory: 'CIRCUIT_BREAKER',
    plantArea: 'Fermentation Bay (Tx1)',
    electricalFeeder: 'MCC 4 (C8)',
    conditionAssessment: 'HEALTHY',
    operatingStateSnapshot: 'CLOSED',
    templateId: 'CIRCUIT_BREAKER',
    templateVersion: 1,
    checklistResults: [
      { itemId: 'cb_physical', label: 'Physical condition', result: 'PASS' },
      { itemId: 'cb_contacts', label: 'Contact condition', result: 'PASS' }
    ],
    observations: 'Contacts clean, thermography normal at 36C.',
    photos: [],
    recommendations: 'Continue routine 90-day inspection cycle.',
    followUpRequired: false,
    technicianId: 'uid-tech-01',
    technicianName: 'Msebenzi Gamedze',
    technicianRole: 'Technician',
    inspectedAt: '2026-11-18T08:30:00.000Z',
    ...overrides
  };
}

test('default inspection templates include all required asset categories and key checklist fields', () => {
  const breakerLabels = DEFAULT_INSPECTION_TEMPLATES.CIRCUIT_BREAKER.items.map((i) => i.label);
  assert.ok(breakerLabels.includes('Physical condition'));
  assert.ok(breakerLabels.includes('Contact condition'));
  assert.ok(breakerLabels.includes('Protection settings'));

  const txLabels = DEFAULT_INSPECTION_TEMPLATES.TRANSFORMER.items.map((i) => i.label);
  assert.ok(txLabels.includes('Oil condition'));
  assert.ok(txLabels.includes('Oil leakage'));
  assert.ok(txLabels.includes('Cooling system'));

  const motorLabels = DEFAULT_INSPECTION_TEMPLATES.MOTOR.items.map((i) => i.label);
  assert.ok(motorLabels.includes('Bearing condition'));
  assert.ok(motorLabels.includes('Vibration'));
  assert.ok(motorLabels.includes('Insulation test results'));
  assert.ok(motorLabels.includes('Current measurements'));

  const mccLabels = DEFAULT_INSPECTION_TEMPLATES.MCC_DB.items.map((i) => i.label);
  assert.ok(mccLabels.includes('Busbar condition'));
  assert.ok(mccLabels.includes('Signs of overheating'));
  assert.ok(mccLabels.includes('Earthing condition'));
});

test('category resolution maps transformers, busbars, and breakers accurately', () => {
  const tx1 = DEFAULT_POWER_NODES.find((n) => n.id === 'TX1');
  const busTx1 = DEFAULT_POWER_NODES.find((n) => n.id === 'BUS_TX1');
  const c8 = DEFAULT_POWER_NODES.find((n) => n.id === 'C8');

  assert.ok(tx1 && busTx1 && c8);
  assert.equal(resolveInspectionCategoryForNode(tx1), 'TRANSFORMER');
  assert.equal(resolveInspectionCategoryForNode(busTx1), 'MCC_DB');
  assert.equal(resolveInspectionCategoryForNode(c8), 'CIRCUIT_BREAKER');
});

test('maintenance condition defaults to NOT_INSPECTED and remains independent from operatingState', () => {
  const emptySummaries = indexLatestInspectionsByAsset([]);
  assert.equal(resolveAssetMaintenanceCondition('C8', emptySummaries, false), 'NOT_INSPECTED');
  assert.equal(resolveAssetMaintenanceCondition('OLD_TURBINE', emptySummaries, true), 'DECOMMISSIONED');

  const closedAttentionInspection: ElectricalInspection = {
    id: 'insp-1',
    inspectionNumber: 'INSP-2026-0001-AAA',
    assetId: 'C8',
    assetKind: 'POWER_NODE',
    assetCode: 'C8',
    assetName: 'MCC 4 Incomer',
    assetCategory: 'CIRCUIT_BREAKER',
    plantArea: 'Fermentation',
    electricalFeeder: 'MCC 4 (C8)',
    conditionAssessment: 'ATTENTION_REQUIRED',
    operatingStateSnapshot: 'CLOSED',
    templateId: 'CIRCUIT_BREAKER',
    templateVersion: 1,
    checklistResults: [{ itemId: 'cb_thermal', label: 'Thermal condition', result: 'ATTENTION' }],
    observations: 'Hot spot 68C on L2 lug.',
    photos: [],
    recommendations: 'Re-torque L2 termination at Stop Day.',
    followUpRequired: true,
    technicianId: 'uid-tech-01',
    technicianName: 'Msebenzi Gamedze',
    technicianRole: 'Technician',
    inspectedAt: '2026-11-18T09:00:00.000Z',
    createdAt: '2026-11-18T09:00:05.000Z'
  };

  const summaries = indexLatestInspectionsByAsset([closedAttentionInspection]);
  assert.equal(resolveAssetMaintenanceCondition('C8', summaries), 'ATTENTION_REQUIRED');
  assert.equal(summaries.get('C8')?.latestInspection?.operatingStateSnapshot, 'CLOSED');
});

test('validation rejects missing observations, NOT_INSPECTED, missing amendmentReason, and oversized/excess photos', () => {
  assert.equal(validateElectricalInspectionInput(makeBaseSubmission()).valid, true);

  const notInspected = validateElectricalInspectionInput(
    makeBaseSubmission({ conditionAssessment: 'NOT_INSPECTED' })
  );
  assert.equal(notInspected.valid, false);

  const missingObs = validateElectricalInspectionInput(
    makeBaseSubmission({ observations: '   ' })
  );
  assert.equal(missingObs.valid, false);

  const missingFollowUpNote = validateElectricalInspectionInput(
    makeBaseSubmission({ followUpRequired: true, recommendations: '', followUpAction: '' })
  );
  assert.equal(missingFollowUpNote.valid, false);

  const missingAmendmentReason = validateElectricalInspectionInput(
    makeBaseSubmission({ correctsInspectionId: 'insp-prev', amendmentReason: ' ' })
  );
  assert.equal(missingAmendmentReason.valid, false);

  const tooManyPhotos = validateElectricalInspectionInput(
    makeBaseSubmission({
      photos: Array.from({ length: MAX_INSPECTION_PHOTOS + 1 }, (_, idx) => ({
        id: `p-${idx}`,
        name: `photo-${idx}.jpg`,
        contentType: 'image/jpeg',
        dataUrl: 'data:image/jpeg;base64,AAAA',
        capturedAt: '2026-11-18T08:00:00.000Z',
        sizeBytes: 120
      }))
    })
  );
  assert.equal(tooManyPhotos.valid, false);

  const hugePhoto = validateElectricalInspectionInput(
    makeBaseSubmission({
      photos: [
        {
          id: 'p-big',
          name: 'huge.jpg',
          contentType: 'image/jpeg',
          dataUrl: `data:image/jpeg;base64,${'A'.repeat(MAX_PHOTO_DATA_URL_BYTES + 10)}`,
          capturedAt: '2026-11-18T08:00:00.000Z',
          sizeBytes: MAX_PHOTO_DATA_URL_BYTES + 50
        }
      ]
    })
  );
  assert.equal(hugePhoto.valid, false);
});

test('chronological indexing preserves concurrent entries and matches latest supervisor review', () => {
  const older: ElectricalInspection = {
    id: 'insp-a',
    inspectionNumber: 'INSP-2026-0001-AAA',
    assetId: 'TX1',
    assetKind: 'POWER_NODE',
    assetCode: 'TX1',
    assetName: 'Transformer 1',
    assetCategory: 'TRANSFORMER',
    plantArea: 'Substation 1',
    electricalFeeder: 'C4 (TX1)',
    conditionAssessment: 'HEALTHY',
    templateId: 'TRANSFORMER',
    templateVersion: 1,
    checklistResults: [{ itemId: 'tx_oil_cond', label: 'Oil condition', result: 'PASS' }],
    observations: 'Morning check normal.',
    photos: [],
    recommendations: 'None',
    followUpRequired: false,
    technicianId: 'uid-1',
    technicianName: 'Tech One',
    technicianRole: 'Technician',
    inspectedAt: '2026-11-18T07:00:00.000Z',
    createdAt: '2026-11-18T07:00:05.000Z'
  };

  const newer: ElectricalInspection = {
    ...older,
    id: 'insp-b',
    inspectionNumber: 'INSP-2026-0002-BBB',
    conditionAssessment: 'FAULT_DETECTED',
    observations: 'Buchholz alarm & oil weep on radiator flange.',
    followUpRequired: true,
    recommendations: 'Isolate TX1 on Stop Day and reseal gasket.',
    inspectedAt: '2026-11-18T11:30:00.000Z',
    createdAt: '2026-11-18T11:30:05.000Z'
  };

  const reviews: ElectricalInspectionReview[] = [
    {
      id: 'rev-1',
      inspectionId: 'insp-b',
      assetId: 'TX1',
      decision: 'ACTION_REQUIRED',
      reviewNotes: 'Approved for immediate Stop Day Work Order.',
      reviewerUid: 'uid-sup',
      reviewerName: 'Sicelo Simelane',
      reviewerRole: 'Supervisor',
      reviewedAt: '2026-11-18T12:00:00.000Z',
      createdAt: '2026-11-18T12:00:02.000Z'
    }
  ];

  const summaries = indexLatestInspectionsByAsset([older, newer], reviews);
  const txSummary = summaries.get('TX1');
  assert.ok(txSummary);
  assert.equal(txSummary.totalInspections, 2);
  assert.equal(txSummary.condition, 'FAULT_DETECTED');
  assert.equal(txSummary.latestInspection?.id, 'insp-b');
  assert.equal(txSummary.reviewStatus, 'ACTION_REQUIRED');
  assert.equal(txSummary.latestReview?.reviewerName, 'Sicelo Simelane');
});

test('buildJobCardPrefillFromInspection links asset, feeder, inspection reference, priority, and LOTO danger tag', () => {
  const faultInspection: ElectricalInspection = {
    id: 'insp-fault-9',
    inspectionNumber: 'INSP-2026-0009-XYZ',
    assetId: 'eq-ferm-p1',
    assetKind: 'EQUIPMENT',
    assetCode: 'EQ-FERM-01',
    assetName: 'Mash Transfer Pump 1',
    assetCategory: 'MOTOR',
    plantArea: 'Fermentation',
    electricalFeeder: 'MCC 4 / C8',
    conditionAssessment: 'FAULT_DETECTED',
    templateId: 'MOTOR',
    templateVersion: 1,
    checklistResults: [
      { itemId: 'mtr_insulation', label: 'Insulation test results', result: 'FAIL', notes: '0.4 MOhm L1-E' }
    ],
    observations: 'Low stator winding insulation resistance after washdown.',
    photos: [],
    recommendations: 'Bake out stator and megger test before re-energizing.',
    followUpRequired: true,
    followUpAction: 'Lock out C8 cubicle and swap motor if IR < 10 MOhm.',
    technicianId: 'uid-tech-01',
    technicianName: 'Msebenzi Gamedze',
    technicianRole: 'Technician',
    inspectedAt: '2026-11-18T14:00:00.000Z',
    createdAt: '2026-11-18T14:00:05.000Z'
  };

  const prefill = buildJobCardPrefillFromInspection(faultInspection, SAMPLE_EQUIPMENT);
  assert.equal(prefill.equipmentId, 'eq-ferm-p1');
  assert.equal(prefill.equipmentCode, 'EQ-FERM-01');
  assert.equal(prefill.electricalFeeder, 'MCC 4 / C8');
  assert.equal(prefill.inspectionId, 'insp-fault-9');
  assert.equal(prefill.inspectionReference, 'INSP-2026-0009-XYZ');
  assert.equal(prefill.priority, 'Emergency');
  assert.equal(prefill.dangerTagRequired, true);
  assert.ok(prefill.description.includes('INSP-2026-0009-XYZ'));
  assert.ok(prefill.description.includes('0.4 MOhm L1-E'));
  assert.equal(prefill.equipmentSpecs?.powerKw, 22);
});

test('RBAC separates Operator, Technician, Supervisor, and Engineering Admin capabilities', () => {
  // Operator: read-only for formal inspections, reviews, and templates
  assert.equal(canSubmitElectricalInspection('Operator', null), false);
  assert.equal(canReviewElectricalInspection('Operator', null), false);
  assert.equal(canManageInspectionTemplates('Operator', null), false);

  // Technician: submit inspections only
  assert.equal(canSubmitElectricalInspection('Technician', null), true);
  assert.equal(canReviewElectricalInspection('Technician', null), false);
  assert.equal(canManageInspectionTemplates('Technician', null), false);

  // Supervisor: submit + review, cannot mutate global checklists
  assert.equal(canSubmitElectricalInspection('Supervisor', null), true);
  assert.equal(canReviewElectricalInspection('Supervisor', null), true);
  assert.equal(canManageInspectionTemplates('Supervisor', null), false);

  // Manager / Admin / Principal Engineer: full access
  assert.equal(canSubmitElectricalInspection('Manager', null), true);
  assert.equal(canReviewElectricalInspection('Manager', null), true);
  assert.equal(canManageInspectionTemplates('Manager', null), true);
  assert.equal(canManageInspectionTemplates('Operator', 'sifisani@gmail.com'), true);
});

test('evaluateAssetInspectionDue classifies NEVER_INSPECTED, CURRENT, DUE_SOON, OVERDUE, and DECOMMISSIONED', () => {
  assert.equal(
    evaluateAssetInspectionDue({
      assetCategory: 'TRANSFORMER',
      voltage: '11 kV / 415 V',
      isDecommissioned: false,
      summary: null,
      nowIso: '2026-11-19T00:00:00.000Z'
    }).status,
    'NEVER_INSPECTED'
  );

  assert.equal(
    evaluateAssetInspectionDue({
      assetCategory: 'CIRCUIT_BREAKER',
      isDecommissioned: true,
      summary: null,
      nowIso: '2026-11-19T00:00:00.000Z'
    }).status,
    'DECOMMISSIONED'
  );

  const txInsp: ElectricalInspection = {
    id: 'insp-tx1',
    inspectionNumber: 'INSP-2026-0010-TX1',
    assetId: 'TX1',
    assetKind: 'POWER_NODE',
    assetCode: 'TX1',
    assetName: 'Transformer 1',
    assetCategory: 'TRANSFORMER',
    plantArea: 'Substation 1',
    electricalFeeder: 'TX1',
    conditionAssessment: 'HEALTHY',
    templateId: 'TRANSFORMER',
    templateVersion: 1,
    checklistResults: [{ itemId: 'tx_oil_cond', label: 'Oil condition', result: 'PASS' }],
    observations: 'Normal oil level.',
    photos: [],
    recommendations: 'Routine.',
    followUpRequired: false,
    technicianId: 'uid-1',
    technicianName: 'Tech',
    technicianRole: 'Technician',
    inspectedAt: '2026-11-15T00:00:00.000Z',
    createdAt: '2026-11-15T00:01:00.000Z'
  };

  const summaries = indexLatestInspectionsByAsset([txInsp]);
  const summary = summaries.get('TX1');

  // 4 days after 30-day cycle -> CURRENT (26 days left)
  const currentRes = evaluateAssetInspectionDue({
    assetCategory: 'TRANSFORMER',
    voltage: '11 kV / 415 V',
    summary,
    nowIso: '2026-11-19T00:00:00.000Z'
  });
  assert.equal(currentRes.status, 'CURRENT');
  assert.equal(currentRes.daysUntilDue, 26);

  // 20 days later -> DUE_SOON (10 days left <= 14)
  const dueSoonRes = evaluateAssetInspectionDue({
    assetCategory: 'TRANSFORMER',
    voltage: '11 kV / 415 V',
    summary,
    nowIso: '2026-12-05T00:00:00.000Z'
  });
  assert.equal(dueSoonRes.status, 'DUE_SOON');
  assert.equal(dueSoonRes.daysUntilDue, 10);

  // 40 days later -> OVERDUE (-10 days)
  const overdueRes = evaluateAssetInspectionDue({
    assetCategory: 'TRANSFORMER',
    voltage: '11 kV / 415 V',
    summary,
    nowIso: '2026-12-25T00:00:00.000Z'
  });
  assert.equal(overdueRes.status, 'OVERDUE');
  assert.equal(overdueRes.daysUntilDue, -10);
});

test('matchJobCardsForPowerNode & collectElectricalMaintenanceAlerts aggregate faults, overdue, and hazards cleanly', () => {
  const c8 = DEFAULT_POWER_NODES.find((n) => n.id === 'C8');
  assert.ok(c8);

  const matchedJcs = matchJobCardsForPowerNode(c8, SAMPLE_EQUIPMENT, [
    {
      id: 'jc-1',
      status: 'In Progress',
      equipmentId: 'eq-ferm-p1',
      equipmentName: 'Mash Transfer Pump 1',
      electricalFeeder: 'MCC 1 (C8)'
    },
    {
      id: 'jc-2',
      status: 'Pending',
      equipmentCode: 'C8',
      equipmentName: 'MCC 1 (Distillation & Stills)'
    },
    {
      id: 'jc-unrelated',
      status: 'Pending',
      equipmentId: 'eq-other',
      equipmentName: 'Boiler Coal Conveyor',
      electricalFeeder: 'MCC 3 (C10)'
    }
  ]);

  assert.equal(matchedJcs.length, 2);
  assert.deepEqual(
    matchedJcs.map((j) => j.id),
    ['jc-1', 'jc-2']
  );

  const faultInsp: ElectricalInspection = {
    id: 'insp-c8-fault',
    inspectionNumber: 'INSP-2026-0099-FLT',
    assetId: 'C8',
    assetKind: 'POWER_NODE',
    assetCode: 'C8',
    assetName: 'MCC 4 Incomer Breaker',
    assetCategory: 'CIRCUIT_BREAKER',
    plantArea: 'Fermentation',
    electricalFeeder: 'MCC 4 (C8)',
    conditionAssessment: 'FAULT_DETECTED',
    templateId: 'CIRCUIT_BREAKER',
    templateVersion: 1,
    checklistResults: [{ itemId: 'cb_contacts', label: 'Contact condition', result: 'FAIL' }],
    observations: 'Arcing on L1 contact.',
    photos: [],
    recommendations: 'Replace contact kit.',
    followUpRequired: true,
    technicianId: 'uid-1',
    technicianName: 'Tech',
    technicianRole: 'Technician',
    inspectedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:05:00.000Z'
  };

  const alerts = collectElectricalMaintenanceAlerts({
    powerNodes: [c8],
    equipmentList: SAMPLE_EQUIPMENT,
    conditionSummaries: indexLatestInspectionsByAsset([faultInsp]),
    hazards: [],
    nowIso: '2026-11-19T00:00:00.000Z'
  });

  assert.ok(alerts.some((a) => a.sourceType === 'CONDITION' && a.severity === 'CRITICAL' && a.assetId === 'C8'));
  assert.ok(alerts.some((a) => a.sourceType === 'INSPECTION_DUE' && a.dueStatus === 'OVERDUE' && a.assetId === 'C8'));
});
