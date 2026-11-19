import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ORG_MASTER_DATA,
  mergeOrgMasterData,
  resolveStandbyRosterEntries,
  validateOrgMasterData
} from './orgMasterData';

test('mergeOrgMasterData falls back cleanly to static distillery defaults when Firestore doc is absent', () => {
  const merged = mergeOrgMasterData(null);
  assert.equal(merged.id, 'plant-default');
  assert.ok(merged.departments.length >= 8);
  assert.ok(merged.trades.length >= 10);
  assert.ok(merged.shifts.length >= 5);
  assert.equal(merged.standbyRoster.length, 3);
});

test('mergeOrgMasterData overlays Firestore overrides and resolves StandbyRosterEntry records', () => {
  const merged = mergeOrgMasterData({
    version: 3,
    departments: [{ category: 'Engineering', departments: ['Mechanical Maintenance', 'HVAC & Chiller'] }],
    standbyRoster: [
      {
        trade: 'Electrician',
        supervisor: 'Bongani Dlamini',
        onDutyName: 'Scelo Simelane',
        backupName: 'Msebenzi Gamedze',
        cycle: 'Wed 17:00 to Wed 17:00'
      }
    ]
  });

  assert.equal(merged.version, 3);
  assert.equal(merged.departments.length, 1);
  assert.equal(merged.departments[0].departments[1], 'HVAC & Chiller');

  const resolved = resolveStandbyRosterEntries(merged);
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].onDuty.name, 'Scelo Simelane');
  assert.equal(resolved[0].backup.name, 'Msebenzi Gamedze');
});

test('validateOrgMasterData rejects empty categories, inactive-only trades, and blank standby entries', () => {
  assert.equal(validateOrgMasterData(DEFAULT_ORG_MASTER_DATA).valid, true);

  assert.equal(
    validateOrgMasterData({
      ...DEFAULT_ORG_MASTER_DATA,
      departments: []
    }).valid,
    false
  );

  assert.equal(
    validateOrgMasterData({
      ...DEFAULT_ORG_MASTER_DATA,
      trades: DEFAULT_ORG_MASTER_DATA.trades.map((t) => ({ ...t, active: false }))
    }).valid,
    false
  );

  assert.equal(
    validateOrgMasterData({
      ...DEFAULT_ORG_MASTER_DATA,
      standbyRoster: [
        {
          trade: 'Electrician',
          supervisor: '',
          onDutyName: '',
          backupName: 'Scelo',
          cycle: 'Wed-Wed'
        }
      ]
    }).valid,
    false
  );
});
