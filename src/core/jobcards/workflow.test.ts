import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendStatusHistory,
  createStatusHistoryEntry,
  getLinkedJobCardFamily,
  mapWorkflowStageToLegacy,
  resolveWorkflowStage,
  WORKFLOW_STAGES
} from './workflow';
import {
  canSpawnLinkedJobCard,
  canTransitionWorkflowStage
} from './permissions';
import { JobCard } from '../../types';

const makeCard = (overrides: Partial<JobCard> = {}): JobCard => ({
  id: 'jc-1',
  jobCardNumber: 'JC-ENG-2026-001',
  department: 'Engineering - Mechanical Maintenance',
  departmentCategory: 'Engineering',
  equipmentName: 'Fermenter Feed Pump P-101',
  priority: 'High',
  status: 'In Progress',
  description: 'Replace mechanical seal and verify alignment.',
  assignedTo: 'Phumelele Maseko',
  targetDate: '2026-11-20',
  totalLaborHours: 2.5,
  laborLogs: [],
  comments: [],
  createdById: 'op-1',
  createdByName: 'Operator',
  createdAt: '2026-11-19T06:00:00.000Z',
  updatedAt: '2026-11-19T06:00:00.000Z',
  ...overrides
});

test('WORKFLOW_STAGES covers all 8 Phase 1 Brief stages in logical sequence', () => {
  assert.equal(WORKFLOW_STAGES.length, 8);
  assert.deepEqual(
    WORKFLOW_STAGES.map((s) => s.id),
    [
      'SUBMITTED',
      'ACCEPTED',
      'IN_PROGRESS',
      'WAITING_FOR_PARTS',
      'WAITING_FOR_SHUTDOWN',
      'WORK_COMPLETE',
      'CLOSED',
      'CANCELLED'
    ]
  );
});

test('resolveWorkflowStage accurately infers canonical stage for legacy and new Job Cards', () => {
  assert.equal(resolveWorkflowStage(makeCard({ status: 'Draft', requisitionStage: undefined })), 'SUBMITTED');
  assert.equal(resolveWorkflowStage(makeCard({ status: 'Pending Spares' })), 'WAITING_FOR_PARTS');
  assert.equal(resolveWorkflowStage(makeCard({ status: 'In Progress', requisitionStage: 'Artisan Completed' })), 'WORK_COMPLETE');
  assert.equal(resolveWorkflowStage(makeCard({ status: 'Completed', hodSignedBy: 'Antonio Miranda' })), 'CLOSED');
  assert.equal(resolveWorkflowStage(makeCard({ status: 'Cancelled' })), 'CANCELLED');
  assert.equal(
    resolveWorkflowStage(makeCard({ status: 'Pending Spares', workflowStage: 'WAITING_FOR_SHUTDOWN' })),
    'WAITING_FOR_SHUTDOWN'
  );
});

test('WORK_COMPLETE keeps legacy status non-terminal so HOD Manager can still sign off CLOSED', () => {
  const mappedWorkComplete = mapWorkflowStageToLegacy('WORK_COMPLETE');
  assert.equal(mappedWorkComplete.status, 'In Progress');
  assert.equal(mappedWorkComplete.requisitionStage, 'Artisan Completed');

  const mappedClosed = mapWorkflowStageToLegacy('CLOSED');
  assert.equal(mappedClosed.status, 'Completed');
  assert.equal(mappedClosed.requisitionStage, 'HOD Closed');
});

test('canTransitionWorkflowStage enforces least-privilege stage RBAC across roles', () => {
  const openCard = makeCard({ status: 'In Progress', workflowStage: 'IN_PROGRESS' });
  const completePendingVerify = makeCard({
    status: 'In Progress',
    workflowStage: 'WORK_COMPLETE',
    requisitionStage: 'Artisan Completed'
  });
  const closedCard = makeCard({ status: 'Completed', workflowStage: 'CLOSED' });

  // Technician can move between IN_PROGRESS and WAITING_FOR_PARTS only
  assert.equal(canTransitionWorkflowStage({ uid: 't1', role: 'Technician' }, openCard, 'WAITING_FOR_PARTS'), true);
  assert.equal(canTransitionWorkflowStage({ uid: 't1', role: 'Technician' }, openCard, 'WAITING_FOR_SHUTDOWN'), false);
  assert.equal(canTransitionWorkflowStage({ uid: 't1', role: 'Technician' }, openCard, 'WORK_COMPLETE'), false);
  assert.equal(canTransitionWorkflowStage({ uid: 't1', role: 'Technician' }, openCard, 'CLOSED'), false);

  // Supervisor can mark WAITING_FOR_SHUTDOWN, WORK_COMPLETE, CANCELLED, but not HOD CLOSED
  assert.equal(canTransitionWorkflowStage({ uid: 's1', role: 'Supervisor' }, openCard, 'WAITING_FOR_SHUTDOWN'), true);
  assert.equal(canTransitionWorkflowStage({ uid: 's1', role: 'Supervisor' }, openCard, 'WORK_COMPLETE'), true);
  assert.equal(canTransitionWorkflowStage({ uid: 's1', role: 'Supervisor' }, completePendingVerify, 'CLOSED'), false);
  assert.equal(canTransitionWorkflowStage({ uid: 's1', role: 'Supervisor' }, closedCard, 'IN_PROGRESS'), false);

  // Manager can close WORK_COMPLETE -> CLOSED, but cannot reopen CLOSED
  assert.equal(canTransitionWorkflowStage({ uid: 'm1', role: 'Manager' }, completePendingVerify, 'CLOSED'), true);
  assert.equal(canTransitionWorkflowStage({ uid: 'm1', role: 'Manager' }, closedCard, 'IN_PROGRESS'), false);

  // Admin can reopen CLOSED
  assert.equal(canTransitionWorkflowStage({ uid: 'a1', role: 'Admin' }, closedCard, 'IN_PROGRESS'), true);

  // Spawning linked companion multi-department jobs requires Supervisor+
  assert.equal(canSpawnLinkedJobCard('Operator'), false);
  assert.equal(canSpawnLinkedJobCard('Technician'), false);
  assert.equal(canSpawnLinkedJobCard('Supervisor'), true);
  assert.equal(canSpawnLinkedJobCard('Manager'), true);
});

test('appendStatusHistory preserves immutable chronology and enforces 200-entry bound', () => {
  const e1 = createStatusHistoryEntry({
    fromStage: 'SUBMITTED',
    toStage: 'ACCEPTED',
    fromStatus: 'Draft',
    toStatus: 'In Progress',
    changedBy: 'Sam Ngubeni',
    changedByRole: 'Supervisor',
    changedAt: '2026-11-19T07:00:00.000Z'
  });
  const history = appendStatusHistory([], e1);
  assert.equal(history.length, 1);
  assert.equal(history[0].toStage, 'ACCEPTED');

  // Verify cap at 200 entries
  let largeHistory = history;
  for (let i = 0; i < 205; i++) {
    largeHistory = appendStatusHistory(largeHistory, { ...e1, id: `h-${i}` });
  }
  assert.equal(largeHistory.length, 200);
  assert.equal(largeHistory[largeHistory.length - 1].id, 'h-204');
});

test('getLinkedJobCardFamily resolves parent, open/closed child counters, and combined labor hours', () => {
  const parent = makeCard({ id: 'parent-1', jobCardNumber: 'JC-ENG-2026-100', totalLaborHours: 4.0 });
  const childElec = makeCard({
    id: 'child-1',
    jobCardNumber: 'JC-ENG-2026-101',
    parentJobCardId: 'parent-1',
    parentJobCardNumber: 'JC-ENG-2026-100',
    status: 'In Progress',
    workflowStage: 'IN_PROGRESS',
    totalLaborHours: 1.5
  });
  const childWeld = makeCard({
    id: 'child-2',
    jobCardNumber: 'JC-ENG-2026-102',
    parentJobCardId: 'parent-1',
    parentJobCardNumber: 'JC-ENG-2026-100',
    status: 'Completed',
    workflowStage: 'CLOSED',
    totalLaborHours: 2.0
  });

  const all = [parent, childElec, childWeld];
  const parentFamily = getLinkedJobCardFamily(parent, all);
  assert.equal(parentFamily.parentCard, null);
  assert.equal(parentFamily.childCards.length, 2);
  assert.equal(parentFamily.openChildCount, 1);
  assert.equal(parentFamily.closedChildCount, 1);
  assert.equal(parentFamily.familyTotalHours, 7.5);

  const childFamily = getLinkedJobCardFamily(childElec, all);
  assert.equal(childFamily.parentCard?.id, 'parent-1');
  assert.equal(childFamily.childCards.length, 0);
});
