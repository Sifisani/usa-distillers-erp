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
  Check
} from 'lucide-react';
import { JobCard, Equipment, DEPARTMENTS_BY_CATEGORY } from '../../types';
import { seedInitialJobCards } from '../../services/jobCardService';
import { seedInitialEquipment } from '../../services/equipmentService';
import { eventBus, DomainEvent } from '../../core/events/eventBus';
import { OrganogramExplorer } from '../organization/OrganogramExplorer';
import { firebaseRuntimeInfo } from '../../firebase';

interface SettingsViewProps {
  jobCards: JobCard[];
  equipmentList: Equipment[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({ jobCards, equipmentList }) => {
  const [reSeeding, setReSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [events, setEvents] = useState<DomainEvent[]>(() => eventBus.getHistory());

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

  const handleReSeedData = async () => {
    if (window.confirm('Do you want to re-seed default distillery job cards and equipment into Firestore?')) {
      setReSeeding(true);
      try {
        await seedInitialEquipment();
        await seedInitialJobCards();
        setSeedSuccess(true);
        setTimeout(() => setSeedSuccess(false), 4000);
      } finally {
        setReSeeding(false);
      }
    }
  };

  return (
    <div className="space-y-5 max-w-4xl select-none">
      <div className="bg-white p-4 rounded-md border border-slate-200 shadow-2xs">
        <h2 className="text-base font-bold text-slate-800 tracking-tight">
          System & Enterprise Plant Configuration
        </h2>
        <p className="text-xs text-slate-500">
          Global parameters, database synchronization, department rosters, and operational data exports.
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

          <button
            onClick={handleReSeedData}
            disabled={reSeeding}
            className="px-4 py-2 rounded bg-purple-50 hover:bg-purple-100 text-[#714B67] border border-purple-200 text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${reSeeding ? 'animate-spin' : ''}`} />
            <span>{reSeeding ? 'Seeding Firestore...' : 'Re-Seed Demo Data'}</span>
          </button>
        </div>
      </div>

      {/* Department Directory */}
      <div className="bg-white p-5 rounded-md border border-slate-200 shadow-2xs space-y-3">
        <h3 className="font-bold text-sm text-slate-800">
          Plant Departments Directory ({DEPARTMENTS_BY_CATEGORY.length} Categories)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {DEPARTMENTS_BY_CATEGORY.map((cat) => (
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
