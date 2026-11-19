import {
  DEPARTMENTS_BY_CATEGORY,
  DepartmentGroup,
  OrgMasterDataConfig,
  OrgShiftConfigItem,
  OrgStandbyRosterItem,
  OrgTradeConfigItem,
  StandbyRosterEntry,
  StaffMember
} from '../../types';
import {
  COMPANY_ORGANOGRAM,
  SHIFTS_LIST,
  TECHNICAL_TRADES_LIST,
  getActiveStandbyRoster
} from './organization';

export const ORG_MASTER_DATA_DOC_ID = 'plant-default';

export const DEFAULT_ORG_MASTER_DATA: OrgMasterDataConfig = {
  id: ORG_MASTER_DATA_DOC_ID,
  departments: DEPARTMENTS_BY_CATEGORY.map((group) => ({
    category: group.category,
    departments: [...group.departments]
  })),
  trades: TECHNICAL_TRADES_LIST.map((t) => ({
    id: t.id,
    label: t.label,
    crewType: t.crewType,
    active: true
  })),
  shifts: SHIFTS_LIST.map((s) => ({
    id: s.id,
    label: s.label,
    timing: s.timing,
    active: true
  })),
  standbyRoster: getActiveStandbyRoster().map((r) => ({
    trade: r.trade,
    supervisor: r.supervisor,
    onDutyName: r.onDuty.name,
    onDutyStaffId: r.onDuty.id,
    backupName: r.backup.name,
    backupStaffId: r.backup.id,
    cycle: r.cycle
  })),
  version: 1
};

export function mergeOrgMasterData(
  remote?: Partial<OrgMasterDataConfig> | null
): OrgMasterDataConfig {
  if (!remote) {
    return {
      ...DEFAULT_ORG_MASTER_DATA,
      departments: DEFAULT_ORG_MASTER_DATA.departments.map((g) => ({
        category: g.category,
        departments: [...g.departments]
      })),
      trades: DEFAULT_ORG_MASTER_DATA.trades.map((t) => ({ ...t })),
      shifts: DEFAULT_ORG_MASTER_DATA.shifts.map((s) => ({ ...s })),
      standbyRoster: DEFAULT_ORG_MASTER_DATA.standbyRoster.map((r) => ({ ...r }))
    };
  }

  const departments: DepartmentGroup[] =
    Array.isArray(remote.departments) && remote.departments.length > 0
      ? remote.departments
          .filter((g) => g && typeof g.category === 'string' && g.category.trim().length > 0)
          .map((g) => ({
            category: g.category.trim().slice(0, 60),
            departments: Array.isArray(g.departments)
              ? g.departments
                  .map((d) => String(d).trim().slice(0, 80))
                  .filter(Boolean)
                  .slice(0, 30)
              : []
          }))
          .filter((g) => g.departments.length > 0)
      : DEFAULT_ORG_MASTER_DATA.departments;

  const trades: OrgTradeConfigItem[] =
    Array.isArray(remote.trades) && remote.trades.length > 0
      ? remote.trades
          .filter((t) => t && t.id)
          .map((t) => ({
            id: t.id,
            label: (t.label || t.id).trim().slice(0, 80),
            crewType: (t.crewType || 'General').trim().slice(0, 60),
            active: t.active !== false
          }))
      : DEFAULT_ORG_MASTER_DATA.trades;

  const shifts: OrgShiftConfigItem[] =
    Array.isArray(remote.shifts) && remote.shifts.length > 0
      ? remote.shifts
          .filter((s) => s && s.id)
          .map((s) => ({
            id: s.id,
            label: (s.label || s.id).trim().slice(0, 80),
            timing: (s.timing || '').trim().slice(0, 80),
            active: s.active !== false
          }))
      : DEFAULT_ORG_MASTER_DATA.shifts;

  const standbyRoster: OrgStandbyRosterItem[] =
    Array.isArray(remote.standbyRoster) && remote.standbyRoster.length > 0
      ? remote.standbyRoster
          .filter((r) => r && r.trade && r.onDutyName)
          .map((r) => ({
            trade: r.trade,
            supervisor: (r.supervisor || '').trim().slice(0, 120),
            onDutyName: r.onDutyName.trim().slice(0, 120),
            onDutyStaffId: r.onDutyStaffId,
            backupName: (r.backupName || '').trim().slice(0, 120),
            backupStaffId: r.backupStaffId,
            cycle: (r.cycle || 'Wed 17:00 to Wed 17:00').trim().slice(0, 100)
          }))
      : DEFAULT_ORG_MASTER_DATA.standbyRoster;

  return {
    id: remote.id || ORG_MASTER_DATA_DOC_ID,
    departments: departments.length > 0 ? departments : DEFAULT_ORG_MASTER_DATA.departments,
    trades: trades.length > 0 ? trades : DEFAULT_ORG_MASTER_DATA.trades,
    shifts: shifts.length > 0 ? shifts : DEFAULT_ORG_MASTER_DATA.shifts,
    standbyRoster:
      standbyRoster.length > 0 ? standbyRoster : DEFAULT_ORG_MASTER_DATA.standbyRoster,
    version: typeof remote.version === 'number' && remote.version >= 1 ? remote.version : 1,
    updatedBy: remote.updatedBy,
    updatedByUid: remote.updatedByUid,
    updatedAt: remote.updatedAt
  };
}

export function validateOrgMasterData(
  config: OrgMasterDataConfig
): { valid: boolean; error?: string } {
  if (!Array.isArray(config.departments) || config.departments.length === 0) {
    return { valid: false, error: 'At least one department category is required.' };
  }
  if (config.departments.length > 30) {
    return { valid: false, error: 'Maximum 30 department categories allowed.' };
  }
  for (const group of config.departments) {
    if (!group.category.trim()) {
      return { valid: false, error: 'Department category name cannot be blank.' };
    }
    if (!Array.isArray(group.departments) || group.departments.length === 0) {
      return {
        valid: false,
        error: `Department category "${group.category}" must have at least one department.`
      };
    }
  }
  if (!Array.isArray(config.trades) || config.trades.filter((t) => t.active).length === 0) {
    return { valid: false, error: 'At least one active technical trade is required.' };
  }
  if (!Array.isArray(config.shifts) || config.shifts.filter((s) => s.active).length === 0) {
    return { valid: false, error: 'At least one active shift group is required.' };
  }
  if (!Array.isArray(config.standbyRoster) || config.standbyRoster.length === 0) {
    return { valid: false, error: 'Standby roster must contain at least one trade entry.' };
  }
  for (const entry of config.standbyRoster) {
    if (!entry.onDutyName.trim() || !entry.supervisor.trim()) {
      return {
        valid: false,
        error: `Standby entry for ${entry.trade} requires both supervisor and on-duty technician.`
      };
    }
  }
  return { valid: true };
}

function findStaffByIdOrName(id?: string, name?: string, fallbackIdx = 0): StaffMember {
  if (id) {
    const byId = COMPANY_ORGANOGRAM.find((s) => s.id === id);
    if (byId) return byId;
  }
  if (name) {
    const lower = name.trim().toLowerCase();
    const byName = COMPANY_ORGANOGRAM.find((s) => s.name.toLowerCase() === lower);
    if (byName) return byName;
    return {
      id: `custom-${lower.replace(/[^a-z0-9]/g, '-')}`,
      name: name.trim(),
      title: 'Standby Technician',
      department: 'Engineering - Maintenance',
      departmentCategory: 'Engineering',
      level: 'Artisan',
      role: 'Technician',
      email: 'standby@usadistillers.com',
      avatarColor: 'bg-teal-600',
      responsibilities: ['Standby Emergency Coverage']
    };
  }
  return COMPANY_ORGANOGRAM[fallbackIdx] || COMPANY_ORGANOGRAM[0];
}

export function resolveStandbyRosterEntries(
  config: OrgMasterDataConfig
): StandbyRosterEntry[] {
  return config.standbyRoster.map((entry, idx) => ({
    trade: entry.trade,
    supervisor: entry.supervisor,
    onDuty: findStaffByIdOrName(entry.onDutyStaffId, entry.onDutyName, idx),
    backup: findStaffByIdOrName(entry.backupStaffId, entry.backupName, idx + 1),
    cycle: entry.cycle
  }));
}
