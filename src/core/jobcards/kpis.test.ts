import test from 'node:test';
import assert from 'node:assert/strict';
import { JobCard } from '../../types';
import { computeDirectorKPIs } from './kpis';

function makeCard(overrides: Partial<JobCard>): JobCard {
  return {
    id: 'jc-1',
    jobCardNumber: 'JC-ENG-2026-001',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    equipmentName: 'Feedwater Pump P-101',
    priority: 'High',
    status: 'Draft',
    workflowStage: 'SUBMITTED',
    description: 'Seal leak',
    assignedTo: 'Phumelele Maseko',
    targetDate: '2026-11-25',
    totalLaborHours: 0,
    laborLogs: [],
    comments: [],
    createdById: 'op-1',
    createdByName: 'Operator',
    createdAt: '2026-11-18T08:00:00.000Z',
    updatedAt: '2026-11-18T08:00:00.000Z',
    ...overrides
  };
}

test('computeDirectorKPIs calculates MTTA, MTTR, overdue counts, and stage bottleneck aging accurately', () => {
  const nowMs = Date.parse('2026-11-19T08:00:00.000Z'); // 24h after 2026-11-18T08:00Z

  const cards: JobCard[] = [
    // Closed card: ack in 2h, closed in 10h
    makeCard({
      id: 'c1',
      status: 'Completed',
      workflowStage: 'CLOSED',
      acceptedAt: '2026-11-18T10:00:00.000Z',
      totalLaborHours: 4.5,
      hodDigitalSignOff: {
        signedBy: 'Antonio Miranda',
        signedAt: '2026-11-18T18:00:00.000Z'
      }
    }),
    // Open WAITING_FOR_PARTS overdue card (age in stage = 12h, ack in 4h)
    makeCard({
      id: 'c2',
      status: 'Pending Spares',
      workflowStage: 'WAITING_FOR_PARTS',
      priority: 'Emergency',
      targetDate: '2026-11-18', // overdue at 2026-11-19T08:00Z
      acceptedAt: '2026-11-18T12:00:00.000Z',
      totalLaborHours: 2.0,
      statusHistory: [
        {
          id: 'h1',
          toStage: 'WAITING_FOR_PARTS',
          toStatus: 'Pending Spares',
          changedBy: 'Sam Ngubeni',
          changedAt: '2026-11-18T20:00:00.000Z'
        }
      ]
    }),
    // Open WORK_COMPLETE awaiting HOD sign-off + linked child card
    makeCard({
      id: 'c3',
      parentJobCardId: 'c2',
      parentJobCardNumber: 'JC-ENG-2026-002',
      status: 'In Progress',
      workflowStage: 'WORK_COMPLETE',
      requisitionStage: 'Artisan Completed',
      acceptedAt: '2026-11-18T14:00:00.000Z', // ack in 6h
      totalLaborHours: 1.5,
      statusHistory: [
        {
          id: 'h2',
          toStage: 'WORK_COMPLETE',
          toStatus: 'In Progress',
          changedBy: 'Sam Ngubeni',
          changedAt: '2026-11-19T02:00:00.000Z' // complete in 18h
        }
      ]
    })
  ];

  const kpis = computeDirectorKPIs(cards, nowMs);

  assert.equal(kpis.totalCards, 3);
  assert.equal(kpis.openCount, 2);
  assert.equal(kpis.closedCount, 1);
  assert.equal(kpis.emergencyOpenCount, 1);
  assert.equal(kpis.overdueOpenCount, 1);
  assert.equal(kpis.awaitingHodSignOffCount, 1);
  assert.equal(kpis.multiDeptChildCount, 1);
  assert.equal(kpis.closureRatePercent, 33);
  assert.equal(kpis.totalLaborHours, 8.0);
  // (2 + 4 + 6) / 3 = 4.0h
  assert.equal(kpis.meanTimeToAcknowledgeHours, 4.0);
  // (10 + 18) / 2 = 14.0h
  assert.equal(kpis.meanTimeToCompleteHours, 14.0);

  assert.ok(kpis.topBottleneck);
  assert.equal(kpis.topBottleneck?.stage, 'WAITING_FOR_PARTS');
  assert.equal(kpis.topBottleneck?.avgAgeHours, 12.0);
});
