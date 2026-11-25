import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canManageUserRoles,
  sortUserProfilesForDirectory,
  validateUserRoleUpdate
} from './userManagement.ts';
import { UserProfile } from '../../types';

test('only Admins and primary bootstrap admin can manage user roles', () => {
  assert.equal(canManageUserRoles({ uid: 'u1', role: 'Admin', email: 'admin@usadistillers.com' }), true);
  assert.equal(canManageUserRoles({ uid: 'u2', role: 'Operator', email: 'sifisani@gmail.com' }), true);
  assert.equal(canManageUserRoles({ uid: 'u3', role: 'Manager', email: 'mgr@usadistillers.com' }), false);
  assert.equal(canManageUserRoles({ uid: 'u4', role: 'Supervisor', email: 'sup@usadistillers.com' }), false);
  assert.equal(canManageUserRoles({ uid: 'u5', role: 'Operator', email: 'op@usadistillers.com' }), false);
  assert.equal(canManageUserRoles(null), false);
});

test('validateUserRoleUpdate blocks non-admin actors and invalid payloads', () => {
  const nonAdmin = validateUserRoleUpdate(
    { targetUid: 'target-1', role: 'Supervisor', department: 'Engineering - Mechanical Maintenance' },
    { uid: 'u-mgr', role: 'Manager', email: 'mgr@usadistillers.com' }
  );
  assert.equal(nonAdmin.valid, false);

  const emptyDept = validateUserRoleUpdate(
    { targetUid: 'target-1', role: 'Technician', department: '   ' },
    { uid: 'u-adm', role: 'Admin', email: 'admin@usadistillers.com' }
  );
  assert.equal(emptyDept.valid, false);
});

test('validateUserRoleUpdate prevents self-demotion from Admin', () => {
  const selfDemote = validateUserRoleUpdate(
    { targetUid: 'u-adm', role: 'Operator', department: 'Administration - Plant Operations HQ' },
    { uid: 'u-adm', role: 'Admin', email: 'admin@usadistillers.com' }
  );
  assert.equal(selfDemote.valid, false);
  assert.match(selfDemote.error || '', /cannot remove their own Admin/i);

  const keepAdmin = validateUserRoleUpdate(
    {
      targetUid: 'u-adm',
      role: 'Admin',
      department: 'Administration - Plant Operations HQ',
      title: 'Plant Administrator'
    },
    { uid: 'u-adm', role: 'Admin', email: 'admin@usadistillers.com' }
  );
  assert.equal(keepAdmin.valid, true);
  assert.equal(keepAdmin.normalized?.title, 'Plant Administrator');
});

test('sortUserProfilesForDirectory orders privileged roles before operators and sorts alphabetically', () => {
  const sample: UserProfile[] = [
    { uid: '1', email: 'z@a.com', displayName: 'Zanele', department: 'Production', role: 'Operator' },
    { uid: '2', email: 'b@a.com', displayName: 'Bongani', department: 'Engineering', role: 'Supervisor' },
    { uid: '3', email: 'a@a.com', displayName: 'Antonio', department: 'Engineering', role: 'Manager' },
    { uid: '4', email: 's@a.com', displayName: 'Sifiso', department: 'Admin', role: 'Admin' }
  ];

  const sorted = sortUserProfilesForDirectory(sample);
  assert.deepEqual(
    sorted.map((u) => u.uid),
    ['4', '3', '2', '1']
  );
});
