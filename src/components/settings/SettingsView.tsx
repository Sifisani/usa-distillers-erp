import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Database,
  Download,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  Activity,
  Layers,
  Cpu,
  Radio,
  Zap,
  Check,
  Users,
  Clock,
  Wrench,
  Plus,
  Trash2,
  Save,
  Lock
} from 'lucide-react';
import {
  JobCard,
  Equipment,
  OrgMasterDataConfig
} from '../../types';
import { seedInitialJobCards } from '../../services/jobCardService';
import { seedInitialEquipment } from '../../services/equipmentService';
import { eventBus, DomainEvent } from '../../core/events/eventBus';
import { OrganogramExplorer } from '../organization/OrganogramExplorer';
import { firebaseRuntimeInfo } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useOrgMasterData } from '../../context/OrgMasterDataContext';
import { canHODSignOffJobCard } from '../../core/jobcards/permissions';
import { validateOrgMasterData } from '../../core/master-data/orgMasterData';
import { COMPANY_ORGANOGRAM } from '../../core/master-data/organization';

interface SettingsViewProps {
  jobCards: JobCard[];
  equipmentList: Equipment[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({ jobCards, equipmentList }) => {
  const { userProfile, currentUser } = useAuth();
  const { config: liveOrgConfig, departmentsByCategory, updateOrgMasterData } = useOrgMasterData();

  const [reSeeding, setReSeeding] = useState(false);
  const [confirmReSeed, setConfirmReSeed] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [events, setEvents] = useState<DomainEvent[]>(() => eventBus.getHistory());

  // Configurable Org Master Data editor state
  const canManageOrgConfig = canHODSignOffJobCard(
    userProfile?.role,
    userProfile?.email || currentUser?.email
  );
  const [orgTab, setOrgTab] = useState<'standby' | 'departments' | 'trades_shifts'>('standby');
  const [draftOrgConfig, setDraftOrgConfig] = useState<OrgMasterDataConfig>(liveOrgConfig);
  const [isOrgDirty, setIsOrgDirty] = useState(false);
  const [savingOrgConfig, setSavingOrgConfig] = useState(false);
  const [orgSaveMessage, setOrgSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newDeptInputs, setNewDeptInputs] = useState<Record<string, string>>({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDept, setNewCategoryDept] = useState('');

  useEffect(() => {
    if (!isOrgDirty) {
      setDraftOrgConfig(liveOrgConfig);
    }
  }, [liveOrgConfig, isOrgDirty]);

  useEffect(() => {
    setEvents(eventBus.getHistory());
    const unsub1 = eventBus.subscribe('JOB_CARD_CREATED', () => setEvents(eventBus.getHistory()));
    const unsub2 = eventBus.subscribe('JOB_CARD_STATUS_CHANGED', () => setEvents(eventBus.getHistory()));
    const unsub3 = eventBus.subscribe('LABOR_LOGGED', () => setEvents(eventBus.getHistory()));
    const unsub4 = eventBus.subscribe('EQUIPMENT_STATUS_CHANGED', () => setEvents(eventBus.getHistory()));

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, []);

  // Export JSON
  const handleExportJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      plant: 'USA Distillers — Great Usuthu Plant (Big Bend)',
      jobCards,
      equipment: equipmentList
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usa-distillers-erp-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'JobCardNumber',
      'Department',
      'Equipment',
      'Priority',
      'Status',
      'AssignedTo',
      'TargetDate',
      'TotalLaborHours',
      'CreatedAt'
    ];
    const rows = jobCards.map((c) => [
      `"${c.jobCardNumber}"`,
      `"${c.department}"`,
      `"${c.equipmentName}"`,
      `"${c.priority}"`,
      `"${c.status}"`,
      `"${c.assignedTo}"`,
      `"${c.targetDate}"`,
      c.totalLaborHours,
      `"${c.createdAt}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usa-distillers-jobcards-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmReSeedData = async () => {
    setReSeeding(true);
    try {
      await seedInitialEquipment();
      await seedInitialJobCards();
      setSeedSuccess(true);
      setConfirmReSeed(false);
      setTimeout(() => setSeedSuccess(false), 4000);
    } finally {
      setReSeeding(false);
    }
  };

  const updateDraftOrg = (updater: (prev: OrgMasterDataConfig) => OrgMasterDataConfig) => {
    setDraftOrgConfig((prev) => updater(prev));
    setIsOrgDirty(true);
    setOrgSaveMessage(null);
  };

  const handleSaveOrgMasterData = async () => {
    const check = validateOrgMasterData(draftOrgConfig);
    if (!check.valid) {
      setOrgSaveMessage({ type: 'error', text: check.error || 'Invalid configuration.' });
      return;
    }
    setSavingOrgConfig(true);
    setOrgSaveMessage(null);
    try {
      await updateOrgMasterData(draftOrgConfig);
      setIsOrgDirty(false);
      setOrgSaveMessage({
        type: 'success',
        text: 'Plant master data saved to Firestore and synced live across all active ERP users.'
      });
    } catch (err: any) {
      setOrgSaveMessage({
        type: 'error',
        text: err?.message || 'Failed to save organization master data.'
      });
    } finally {
      setSavingOrgConfig(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl select-none">
      <div className="bg-white p-4 rounded-md border border-slate-200 shadow-2xs">
        <h2 className="text-base font-bold text-slate-800 tracking-tight">
          System & Enterprise Plant Configuration
        </h2>
        <p className="text-xs text-slate-500">
          Global parameters, database synchronization, configurable department &amp; standby rosters, and operational data exports.
        </p>
      </div>

      {seedSuccess && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Default plant records and job cards have been successfully seeded into Firestore!</span>
        </div>
      )}

      {/* Grid Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company & Plant Details */}
        <div className="bg-white p-5 rounded-md border border-slate-200 shadow-2xs space-y-3 text-xs">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Building className="w-4 h-4 text-[#714B67]" />
            <h3 className="font-bold text-slate-800">Distillery Organization Profile</h3>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Company Name</span>
              <span className="font-semibold text-slate-800">USA Distillers Inc.</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Primary Facility</span>
              <span className="font-medium text-slate-800">Great Usuthu Plant — Big Bend, Eswatini</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">ERP Software Edition</span>
              <span className="font-medium text-slate-800">USA Distillers Enterprise ERP (React + Tailwind + Firestore)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Standards Compliance</span>
              <span className="font-medium text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> ISO 55001 Asset Management Protocol
              </span>
            </div>
          </div>
        </div>

        {/* Database & Cloud Connection */}
        <div className="bg-white p-5 rounded-md border border-slate-200 shadow-2xs space-y-3 text-xs">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Database className="w-4 h-4 text-[#714B67]" />
            <h3 className="font-bold text-slate-800">Firebase Environment & Firestore Status</h3>
          </div>

          <div className="space-y-2 font-mono text-[11px]">
            <div>
              <span className="text-slate-400 block font-sans text-[11px] font-semibold">Active Firebase Project</span>
              <span className={`font-bold px-2 py-0.5 rounded flex items-center justify-between border ${
                firebaseRuntimeInfo.isProduction
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <span>{firebaseRuntimeInfo.projectId}</span>
                <span className="text-[10px] font-sans uppercase tracking-wider font-semibold">
                  {firebaseRuntimeInfo.environment}
                </span>
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-sans text-[11px] font-semibold">Configuration Source</span>
              <span className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded flex items-center justify-between">
                <span>{firebaseRuntimeInfo.configSource}</span>
                <span className="text-[10px] text-slate-500 font-sans">
                  {firebaseRuntimeInfo.configSource === 'env' ? 'VITE_FIREBASE_*' : 'Dev Fallback'}
                </span>
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-sans text-[11px] font-semibold">Firestore Database ID</span>
              <span className="text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded truncate block">
                {firebaseRuntimeInfo.databaseId}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-sans text-[11px] font-semibold">Real-Time Sync</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-sans font-semibold border border-emerald-200 inline-block">
                onSnapshot Active ({firebaseRuntimeInfo.projectId})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Configurable Plant Org Master Data Panel (/orgMasterData/plant-default) */}
      <div className="bg-white p-5 rounded-md border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#714B67]" />
              <span>Configurable Plant Master Data (Departments, Trades, Shifts &amp; Standby Roster)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Live Firestore config (<span className="font-mono">orgMasterData/plant-default</span> • v{liveOrgConfig.version || 1}
              {liveOrgConfig.updatedBy ? ` • last saved by ${liveOrgConfig.updatedBy}` : ''}).
            </p>
          </div>
          {canManageOrgConfig ? (
            <div className="flex items-center gap-2">
              {isOrgDirty && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftOrgConfig(liveOrgConfig);
                    setIsOrgDirty(false);
                    setOrgSaveMessage(null);
                  }}
                  className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Discard Changes
                </button>
              )}
              <button
                type="button"
                disabled={savingOrgConfig || !isOrgDirty}
                onClick={handleSaveOrgMasterData}
                className="px-3.5 py-1.5 rounded bg-[#1b4332] hover:bg-[#143326] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingOrgConfig ? 'Saving...' : 'Save Master Data'}</span>
              </button>
            </div>
          ) : (
            <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-slate-500" />
              Manager / Admin Write Access Only
            </span>
          )}
        </div>

        {orgSaveMessage && (
          <div
            className={`p-2.5 rounded border text-xs flex items-center gap-2 ${
              orgSaveMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {orgSaveMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{orgSaveMessage.text}</span>
          </div>
        )}

        {/* Sub-Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2 text-xs">
          <button
            type="button"
            onClick={() => setOrgTab('standby')}
            className={`px-3 py-1.5 rounded font-semibold cursor-pointer flex items-center gap-1.5 ${
              orgTab === 'standby'
                ? 'bg-[#714B67] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Weekly Standby Roster ({draftOrgConfig.standbyRoster.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setOrgTab('departments')}
            className={`px-3 py-1.5 rounded font-semibold cursor-pointer flex items-center gap-1.5 ${
              orgTab === 'departments'
                ? 'bg-[#714B67] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Departments ({draftOrgConfig.departments.length} Groups)</span>
          </button>
          <button
            type="button"
            onClick={() => setOrgTab('trades_shifts')}
            className={`px-3 py-1.5 rounded font-semibold cursor-pointer flex items-center gap-1.5 ${
              orgTab === 'trades_shifts'
                ? 'bg-[#714B67] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Trades &amp; 4-Shift Crews</span>
          </button>
        </div>

        {/* Tab 1: Standby Roster */}
        {orgTab === 'standby' && (
          <div className="space-y-2.5 text-xs">
            <datalist id="org-staff-directory-list">
              {COMPANY_ORGANOGRAM.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.title}
                </option>
              ))}
            </datalist>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {draftOrgConfig.standbyRoster.map((entry, idx) => (
                <div key={entry.trade} className="p-3 rounded border border-amber-200 bg-amber-50/40 space-y-2">
                  <div className="font-bold text-amber-950 flex items-center justify-between border-b border-amber-200 pb-1">
                    <span>{entry.trade}</span>
                    <span className="text-[10px] font-mono text-amber-700">Weekly Rotation</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                      On-Duty Artisan
                    </label>
                    <input
                      type="text"
                      disabled={!canManageOrgConfig}
                      list="org-staff-directory-list"
                      value={entry.onDutyName}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateDraftOrg((prev) => ({
                          ...prev,
                          standbyRoster: prev.standbyRoster.map((r, i) =>
                            i === idx ? { ...r, onDutyName: val, onDutyStaffId: undefined } : r
                          )
                        }));
                      }}
                      className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                      Backup / Relief Artisan
                    </label>
                    <input
                      type="text"
                      disabled={!canManageOrgConfig}
                      list="org-staff-directory-list"
                      value={entry.backupName}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateDraftOrg((prev) => ({
                          ...prev,
                          standbyRoster: prev.standbyRoster.map((r, i) =>
                            i === idx ? { ...r, backupName: val, backupStaffId: undefined } : r
                          )
                        }));
                      }}
                      className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                      Reporting Supervisor
                    </label>
                    <input
                      type="text"
                      disabled={!canManageOrgConfig}
                      value={entry.supervisor}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateDraftOrg((prev) => ({
                          ...prev,
                          standbyRoster: prev.standbyRoster.map((r, i) =>
                            i === idx ? { ...r, supervisor: val } : r
                          )
                        }));
                      }}
                      className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                      Rotation Window
                    </label>
                    <input
                      type="text"
                      disabled={!canManageOrgConfig}
                      value={entry.cycle}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateDraftOrg((prev) => ({
                          ...prev,
                          standbyRoster: prev.standbyRoster.map((r, i) =>
                            i === idx ? { ...r, cycle: val } : r
                          )
                        }));
                      }}
                      className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-[11px] font-mono disabled:bg-slate-100"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Departments */}
        {orgTab === 'departments' && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {draftOrgConfig.departments.map((group, catIdx) => (
                <div key={`${group.category}-${catIdx}`} className="p-3 rounded border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="font-bold text-[#714B67] flex items-center justify-between border-b border-slate-200 pb-1">
                    <span>{group.category}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {group.departments.length} units
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.departments.map((dept, deptIdx) => (
                      <span
                        key={`${dept}-${deptIdx}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[11px]"
                      >
                        <span>{dept}</span>
                        {canManageOrgConfig && group.departments.length > 1 && (
                          <button
                            type="button"
                            title="Remove department unit"
                            onClick={() => {
                              updateDraftOrg((prev) => ({
                                ...prev,
                                departments: prev.departments.map((g, i) =>
                                  i === catIdx
                                    ? { ...g, departments: g.departments.filter((_, j) => j !== deptIdx) }
                                    : g
                                )
                              }));
                            }}
                            className="text-rose-500 hover:text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {canManageOrgConfig && (
                    <div className="flex gap-1.5 pt-1">
                      <input
                        type="text"
                        value={newDeptInputs[group.category] || ''}
                        onChange={(e) =>
                          setNewDeptInputs((prev) => ({ ...prev, [group.category]: e.target.value }))
                        }
                        placeholder={`Add unit under ${group.category}...`}
                        className="flex-1 px-2 py-1 border border-slate-300 rounded bg-white text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const name = (newDeptInputs[group.category] || '').trim();
                          if (!name) return;
                          updateDraftOrg((prev) => ({
                            ...prev,
                            departments: prev.departments.map((g, i) =>
                              i === catIdx && !g.departments.includes(name)
                                ? { ...g, departments: [...g.departments, name] }
                                : g
                            )
                          }));
                          setNewDeptInputs((prev) => ({ ...prev, [group.category]: '' }));
                        }}
                        className="px-2.5 py-1 rounded bg-[#714B67] text-white text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {canManageOrgConfig && (
              <div className="p-3 rounded border border-dashed border-slate-300 bg-slate-50 flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    New Department Category
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Packaging & Logistics"
                    className="w-full px-2.5 py-1 border border-slate-300 rounded bg-white text-xs"
                  />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Initial Plant Unit
                  </label>
                  <input
                    type="text"
                    value={newCategoryDept}
                    onChange={(e) => setNewCategoryDept(e.target.value)}
                    placeholder="e.g. Drum Filling Line"
                    className="w-full px-2.5 py-1 border border-slate-300 rounded bg-white text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const cat = newCategoryName.trim();
                    const unit = newCategoryDept.trim();
                    if (!cat || !unit) return;
                    updateDraftOrg((prev) => ({
                      ...prev,
                      departments: [...prev.departments, { category: cat, departments: [unit] }]
                    }));
                    setNewCategoryName('');
                    setNewCategoryDept('');
                  }}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Category</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Trades & Shifts */}
        {orgTab === 'trades_shifts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div className="font-bold text-slate-700 uppercase text-[11px] flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-[#714B67]" />
                <span>Technical Trades</span>
              </div>
              <div className="space-y-1.5">
                {draftOrgConfig.trades.map((trade, idx) => (
                  <div
                    key={trade.id}
                    className="p-2.5 rounded border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="font-bold text-slate-800">{trade.id}</div>
                      <input
                        type="text"
                        disabled={!canManageOrgConfig}
                        value={trade.crewType}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateDraftOrg((prev) => ({
                            ...prev,
                            trades: prev.trades.map((t, i) => (i === idx ? { ...t, crewType: val } : t))
                          }));
                        }}
                        className="w-full px-2 py-0.5 border border-slate-300 rounded bg-white text-[11px] disabled:bg-slate-100"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        disabled={!canManageOrgConfig}
                        checked={trade.active !== false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          updateDraftOrg((prev) => ({
                            ...prev,
                            trades: prev.trades.map((t, i) => (i === idx ? { ...t, active: checked } : t))
                          }));
                        }}
                      />
                      <span>{trade.active !== false ? 'Active' : 'Disabled'}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-slate-700 uppercase text-[11px] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#714B67]" />
                <span>24/7 Shifts &amp; Standby Windows</span>
              </div>
              <div className="space-y-1.5">
                {draftOrgConfig.shifts.map((shift, idx) => (
                  <div
                    key={shift.id}
                    className="p-2.5 rounded border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <input
                        type="text"
                        disabled={!canManageOrgConfig}
                        value={shift.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateDraftOrg((prev) => ({
                            ...prev,
                            shifts: prev.shifts.map((s, i) => (i === idx ? { ...s, label: val } : s))
                          }));
                        }}
                        className="w-full px-2 py-0.5 border border-slate-300 rounded bg-white font-semibold text-[11px] disabled:bg-slate-100"
                      />
                      <input
                        type="text"
                        disabled={!canManageOrgConfig}
                        value={shift.timing}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateDraftOrg((prev) => ({
                            ...prev,
                            shifts: prev.shifts.map((s, i) => (i === idx ? { ...s, timing: val } : s))
                          }));
                        }}
                        className="w-full px-2 py-0.5 border border-slate-300 rounded bg-white text-[10px] font-mono text-slate-600 disabled:bg-slate-100"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        disabled={!canManageOrgConfig}
                        checked={shift.active !== false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          updateDraftOrg((prev) => ({
                            ...prev,
                            shifts: prev.shifts.map((s, i) => (i === idx ? { ...s, active: checked } : s))
                          }));
                        }}
                      />
                      <span>{shift.active !== false ? 'Active' : 'Disabled'}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Company Organogram & Leadership Structure Explorer */}
      <OrganogramExplorer />

      {/* Modular Monolith Architecture Blueprint & Domain Event Stream */}
      <div className="bg-white p-5 rounded-md border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#714B67]" />
            <h3 className="font-bold text-sm text-slate-800">Modular Monolith Architecture & Inter-Module Event Bus</h3>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-50 text-[#714B67] border border-purple-200 flex items-center gap-1">
            <Radio className="w-3 h-3 text-[#714B67] animate-pulse" />
            Live Event Bus Active
          </span>
        </div>

        {/* Visual Architecture Map */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded border border-purple-200 bg-purple-50/50">
            <div className="font-bold text-[#714B67] flex items-center gap-1.5 mb-1">
              <Building className="w-3.5 h-3.5" />
              1. Web Shell Host
            </div>
            <p className="text-[11px] text-slate-600">
              Unified Odoo navigation, Firebase Auth session, department breadcrumbs, and role gates.
            </p>
          </div>

          <div className="p-3 rounded border border-blue-200 bg-blue-50/50">
            <div className="font-bold text-blue-700 flex items-center gap-1.5 mb-1">
              <Cpu className="w-3.5 h-3.5" />
              2. Master Data Core
            </div>
            <p className="text-[11px] text-slate-600">
              Centralized Equipment Registry ({equipmentList.length} assets), staff directory, and plant facility hierarchy.
            </p>
          </div>

          <div className="p-3 rounded border border-emerald-200 bg-emerald-50/50">
            <div className="font-bold text-emerald-700 flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5" />
              3. Maintenance Module
            </div>
            <p className="text-[11px] text-slate-600">
              Work orders ({jobCards.length} cards), labor timesheets, LOTO compliance, and Odoo chatter logs.
            </p>
          </div>

          <div className="p-3 rounded border border-amber-200 bg-amber-50/50">
            <div className="font-bold text-amber-800 flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5" />
              4. Domain Event Bus
            </div>
            <p className="text-[11px] text-slate-600">
              Asynchronous, strongly-typed in-process pub/sub without external broker overhead.
            </p>
          </div>
        </div>

        {/* Live Domain Event Stream Feed */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#714B67]" />
              Inter-Module Event Audit Trail ({events.length} emitted)
            </span>
            <button
              onClick={() => setEvents(eventBus.getHistory())}
              className="text-[11px] text-[#714B67] hover:underline cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh Log
            </button>
          </div>

          {events.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded text-center text-xs text-slate-400">
              No domain events emitted during current session yet. Transition a Job Card or log labor hours to observe inter-module event orchestration.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {events.slice(0, 10).map((evt) => (
                <div key={evt.id} className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#714B67] text-white">
                      {evt.type}
                    </span>
                    <span className="text-[11px] text-slate-600 font-mono">
                      Module: <strong className="text-slate-800">{evt.sourceModule}</strong>
                    </span>
                    <span className="text-[11px] text-slate-500 truncate max-w-md">
                      {JSON.stringify(evt.payload)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Data Export & Backup */}
      <div className="bg-white p-5 rounded-md border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
          <Download className="w-4 h-4 text-[#714B67]" />
          <h3 className="font-bold text-sm text-slate-800">Data Export & Maintenance Archives</h3>
        </div>

        <p className="text-xs text-slate-600">
          Download complete production and maintenance work orders for regulatory audits, environmental reporting, or offline spreadsheets.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Job Cards as CSV ({jobCards.length} rows)</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="px-4 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Export Full Backup (JSON)</span>
          </button>

          {!confirmReSeed ? (
            <button
              type="button"
              onClick={() => setConfirmReSeed(true)}
              disabled={reSeeding}
              className="px-4 py-2 rounded bg-purple-50 hover:bg-purple-100 text-[#714B67] border border-purple-200 text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${reSeeding ? 'animate-spin' : ''}`} />
              <span>{reSeeding ? 'Seeding Firestore...' : 'Re-Seed Demo Data'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-amber-50 border border-amber-300 text-xs">
              <span className="text-amber-900 font-semibold">Seed default equipment &amp; job cards?</span>
              <button
                type="button"
                disabled={reSeeding}
                onClick={handleConfirmReSeedData}
                className="px-2.5 py-1 rounded bg-amber-700 hover:bg-amber-800 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {reSeeding ? 'Seeding...' : 'Confirm'}
              </button>
              <button
                type="button"
                disabled={reSeeding}
                onClick={() => setConfirmReSeed(false)}
                className="px-2 py-1 rounded bg-white border border-slate-300 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Department Directory */}
      <div className="bg-white p-5 rounded-md border border-slate-200 shadow-2xs space-y-3">
        <h3 className="font-bold text-sm text-slate-800">
          Plant Departments Directory ({departmentsByCategory.length} Categories)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {departmentsByCategory.map((cat) => (
            <div key={cat.category} className="p-2.5 rounded border border-slate-100 bg-slate-50">
              <span className="font-bold text-slate-800 block text-xs text-[#714B67] mb-1">
                {cat.category}
              </span>
              <ul className="text-[11px] text-slate-600 space-y-0.5">
                {cat.departments.map((d) => (
                  <li key={d} className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
