import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAssignOrAcceptJobCard,
  canCloseOrCompleteJobCard,
  canDeleteJobCard,
  canEditJobCard,
  canHODSignOffJobCard,
  canIssueSpares,
  canLogLaborOrHandover,
  canRecordArtisanHandback,
  canRequestSpares,
  canTransitionJobCardStatus,
  getAllowedFormStatuses
} from './permissions';

test('Operator cannot assign, complete, HOD sign off, issue spares, or delete Job Cards', () => {
  assert.equal(canAssignOrAcceptJobCard('Operator'), false);
  assert.equal(canCloseOrCompleteJobCard('Operator'), false);
  assert.equal(canHODSignOffJobCard('Operator'), false);
  assert.equal(canIssueSpares('Operator'), false);
  assert.equal(canRequestSpares('Operator'), false);
  assert.equal(canLogLaborOrHandover('Operator'), false);
  assert.equal(canRecordArtisanHandback('Operator'), false);
  assert.equal(canDeleteJobCard('Operator'), false);
  assert.equal(
    canTransitionJobCardStatus({ uid: 'op-1', role: 'Operator' }, { status: 'Draft' }, 'In Progress'),
    false
  );
  assert.equal(
    canTransitionJobCardStatus({ uid: 'op-1', role: 'Operator' }, { status: 'In Progress' }, 'Completed'),
    false
  );
});

test('Operator can only edit their own Draft card, not another user card or In Progress card', () => {
  assert.equal(
    canEditJobCard({ uid: 'op-1', role: 'Operator' }, { status: 'Draft', createdById: 'op-1' }),
    true
  );
  assert.equal(
    canEditJobCard({ uid: 'op-1', role: 'Operator' }, { status: 'Draft', createdById: 'op-2' }),
    false
  );
  assert.equal(
    canEditJobCard({ uid: 'op-1', role: 'Operator' }, { status: 'In Progress', createdById: 'op-1' }),
    false
  );
});

test('Technician can log labor, request spares, and move between In Progress and Pending Spares, but cannot close or HOD sign off', () => {
  assert.equal(canLogLaborOrHandover('Technician'), true);
  assert.equal(canRequestSpares('Technician'), true);
  assert.equal(canIssueSpares('Technician'), false);
  assert.equal(canAssignOrAcceptJobCard('Technician'), false);
  assert.equal(canCloseOrCompleteJobCard('Technician'), false);
  assert.equal(canHODSignOffJobCard('Technician'), false);
  assert.equal(canDeleteJobCard('Technician'), false);

  assert.equal(
    canTransitionJobCardStatus({ uid: 'tech-1', role: 'Technician' }, { status: 'In Progress' }, 'Pending Spares'),
    true
  );
  assert.equal(
    canTransitionJobCardStatus({ uid: 'tech-1', role: 'Technician' }, { status: 'Pending Spares' }, 'In Progress'),
    true
  );
  assert.equal(
    canTransitionJobCardStatus({ uid: 'tech-1', role: 'Technician' }, { status: 'In Progress' }, 'Completed'),
    false
  );
  assert.equal(
    canTransitionJobCardStatus({ uid: 'tech-1', role: 'Technician' }, { status: 'In Progress' }, 'Cancelled'),
    false
  );
  assert.deepEqual(getAllowedFormStatuses('Technician'), ['Draft', 'In Progress', 'Pending Spares']);
});

test('Storeman can issue spares and transition In Progress <-> Pending Spares, but cannot close or HOD sign off', () => {
  assert.equal(canIssueSpares('Storeman'), true);
  assert.equal(canCloseOrCompleteJobCard('Storeman'), false);
  assert.equal(canHODSignOffJobCard('Storeman'), false);
  assert.equal(
    canTransitionJobCardStatus({ uid: 'store-1', role: 'Storeman' }, { status: 'Pending Spares' }, 'In Progress'),
    true
  );
  assert.equal(
    canTransitionJobCardStatus({ uid: 'store-1', role: 'Storeman' }, { status: 'Pending Spares' }, 'Completed'),
    false
  );
});

test('Supervisor can assign, record handback, and complete open cards, but HOD Sign-Off requires Manager/Admin', () => {
  assert.equal(canAssignOrAcceptJobCard('Supervisor'), true);
  assert.equal(canRecordArtisanHandback('Supervisor'), true);
  assert.equal(canCloseOrCompleteJobCard('Supervisor'), true);
  assert.equal(canHODSignOffJobCard('Supervisor'), false);
  assert.equal(canDeleteJobCard('Supervisor'), false);

  assert.equal(
    canTransitionJobCardStatus({ uid: 'sup-1', role: 'Supervisor' }, { status: 'In Progress' }, 'Completed'),
    true
  );
  // Terminal lock for non-Admin
  assert.equal(
    canTransitionJobCardStatus({ uid: 'sup-1', role: 'Supervisor' }, { status: 'Completed' }, 'In Progress'),
    false
  );
});

test('Manager can perform HOD Sign-Off on open cards; Admin can delete and override terminal states', () => {
  assert.equal(canHODSignOffJobCard('Manager'), true);
  assert.equal(canDeleteJobCard('Manager'), false);
  assert.equal(
    canEditJobCard({ uid: 'mgr-1', role: 'Manager' }, { status: 'Completed', createdById: 'op-1' }),
    false
  );

  assert.equal(canDeleteJobCard('Admin'), true);
  assert.equal(canHODSignOffJobCard('Admin'), true);
  assert.equal(
    canEditJobCard({ uid: 'adm-1', role: 'Admin' }, { status: 'Completed', createdById: 'op-1' }),
    true
  );
  assert.equal(
    canTransitionJobCardStatus({ uid: 'adm-1', role: 'Admin' }, { status: 'Completed' }, 'In Progress'),
    true
  );
});
