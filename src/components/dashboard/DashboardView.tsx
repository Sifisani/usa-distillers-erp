import React from 'react';
import {
  ClipboardList,
  AlertTriangle,
  Package,
  Clock,
  TrendingUp,
  Cpu,
  ArrowRight,
  Flame,
  CheckCircle2,
  Calendar,
  Layers,
  Wrench,
  Users
} from 'lucide-react';
import { JobCard, Equipment } from '../../types';

interface DashboardViewProps {
  jobCards: JobCard[];
  equipmentList: Equipment[];
  onNavigateToJobCards: (filter?: string) => void;
  onNavigateToEquipment: () => void;
  onOpenCreateJobCard: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  jobCards,
  equipmentList,
  onNavigateToJobCards,
  onNavigateToEquipment,
  onOpenCreateJobCard
}) => {
  // Metric calculations
  const totalCards = jobCards.length;
  const openCards = jobCards.filter((c) => c.status !== 'Completed' && c.status !== 'Cancelled');
  const emergencyCards = jobCards.filter((c) => c.priority === 'Emergency' && c.status !== 'Completed' && c.status !== 'Cancelled');
  const pendingSpares = jobCards.filter((c) => c.status === 'Pending Spares');
  const completedCards = jobCards.filter((c) => c.status === 'Completed');

  const totalLaborHours = jobCards.reduce((acc, curr) => acc + (Number(curr.totalLaborHours) || 0), 0);

  // Department breakdown
  const departmentWorkload: Record<string, number> = {};
  openCards.forEach((c) => {
    const category = c.departmentCategory || c.department.split(' - ')[0] || 'General';
    departmentWorkload[category] = (departmentWorkload[category] || 0) + 1;
  });

  // Recent activity logs
  const allComments = jobCards
    .flatMap((c) =>
      (c.comments || []).map((comm) => ({
        ...comm,
        jobCardNumber: c.jobCardNumber,
        equipmentName: c.equipmentName
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-5 select-none">
      {/* Top Welcome / Odoo Control Strip */}
      <div className="bg-white p-4 rounded-md border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 tracking-tight">
            Distillery Maintenance Overview
          </h2>
          <p className="text-xs text-slate-500">
            Real-time status of boiler houses, turbines, fermentation bays, and mash milling lines.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenCreateJobCard}
            className="px-3.5 py-1.5 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Wrench className="w-4 h-4" />
            <span>Create Job Card</span>
          </button>

          <button
            onClick={() => onNavigateToJobCards('ALL')}
            className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer flex items-center gap-1"
          >
            <span>View All Records</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 Odoo KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Job Cards */}
        <div
          onClick={() => onNavigateToJobCards('In Progress')}
          className="bg-white p-4 rounded-md border border-slate-200 shadow-2xs hover:shadow-md hover:border-[#714B67]/50 transition cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Job Cards
            </span>
            <div className="w-8 h-8 rounded bg-purple-50 text-[#714B67] flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{openCards.length}</span>
            <span className="text-xs text-slate-500">of {totalCards} total</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Completed: {completedCards.length}</span>
            <span className="text-[#714B67] font-semibold flex items-center gap-0.5">
              Manage <ArrowRight className="w-2.5 h-2.5" />
            </span>
          </div>
        </div>

        {/* Card 2: Emergency Alerts */}
        <div
          onClick={() => onNavigateToJobCards('Emergency')}
          className={`bg-white p-4 rounded-md border shadow-2xs hover:shadow-md transition cursor-pointer ${
            emergencyCards.length > 0
              ? 'border-rose-300 ring-1 ring-rose-100'
              : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Emergency Queue
            </span>
            <div className="w-8 h-8 rounded bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              {emergencyCards.length}
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-rose-700">{emergencyCards.length}</span>
            <span className="text-xs text-rose-600 font-medium">Critical Repairs</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Boilers & Steam Turbines</span>
            <span className="text-rose-700 font-semibold flex items-center gap-0.5">
              Triage <ArrowRight className="w-2.5 h-2.5" />
            </span>
          </div>
        </div>

        {/* Card 3: Pending Spares */}
        <div
          onClick={() => onNavigateToJobCards('Pending Spares')}
          className="bg-white p-4 rounded-md border border-slate-200 shadow-2xs hover:shadow-md hover:border-amber-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              Pending Spares
            </span>
            <div className="w-8 h-8 rounded bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              {pendingSpares.length}
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-amber-800">{pendingSpares.length}</span>
            <span className="text-xs text-amber-600">Awaiting Warehouse</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Stores Requisitions</span>
            <span className="text-amber-700 font-semibold flex items-center gap-0.5">
              Review <ArrowRight className="w-2.5 h-2.5" />
            </span>
          </div>
        </div>

        {/* Card 4: Logged Labor Hours */}
        <div className="bg-white p-4 rounded-md border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cumulative Labor
            </span>
            <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{totalLaborHours.toFixed(1)}</span>
            <span className="text-xs text-slate-500">hours recorded</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Across all work orders</span>
            <span className="text-emerald-600 font-medium">Logged in live DB</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Department Workload & Machinery Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Department Workload Distribution */}
        <div className="lg:col-span-2 bg-white p-5 rounded-md border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                Department Workload Distribution
              </h3>
              <p className="text-xs text-slate-400">Open job cards by distillery operational sector</p>
            </div>
            <span className="text-xs font-mono font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
              {openCards.length} Active Tasks
            </span>
          </div>

          <div className="space-y-3">
            {Object.entries(departmentWorkload).length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                All maintenance tasks completed!
              </div>
            ) : (
              Object.entries(departmentWorkload).map(([dept, count]) => {
                const percent = Math.round((count / (openCards.length || 1)) * 100);
                return (
                  <div key={dept} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{dept}</span>
                      <span className="font-mono text-slate-500 font-medium">
                        {count} card{count > 1 ? 's' : ''} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#714B67] h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Maintenance Schedule Target: 98% On-Time Completion</span>
            <button
              onClick={() => onNavigateToJobCards('ALL')}
              className="text-[#714B67] font-semibold hover:underline cursor-pointer"
            >
              Open Full Kanban View
            </button>
          </div>
        </div>

        {/* Machinery Health Overview */}
        <div className="bg-white p-5 rounded-md border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[#714B67]" />
                Plant Machinery
              </h3>
              <button
                onClick={onNavigateToEquipment}
                className="text-xs text-[#714B67] font-semibold hover:underline cursor-pointer"
              >
                View ({equipmentList.length})
              </button>
            </div>

            <div className="space-y-2">
              {equipmentList.slice(0, 4).map((eq) => (
                <div
                  key={eq.id}
                  className="p-2.5 rounded border border-slate-100 bg-slate-50/70 text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-800 truncate max-w-[170px]">{eq.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{eq.code}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      eq.status === 'Operational'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }`}
                  >
                    {eq.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onNavigateToEquipment}
            className="w-full mt-4 py-2 border border-slate-200 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer text-center"
          >
            Manage Plant Equipment Registry
          </button>
        </div>
      </div>

      {/* Bottom Row: Recent Chatter Feed */}
      <div className="bg-white p-5 rounded-md border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#714B67]" />
            <h3 className="font-bold text-sm text-slate-800">
              Live Activity Stream & Supervisor Notes
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Synchronized via Firestore Realtime</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allComments.map((comm) => (
            <div
              key={comm.id}
              className="p-3 rounded border border-slate-200 bg-slate-50/50 text-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-slate-900 text-[11px]">
                    {comm.jobCardNumber}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(comm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-[11px] font-medium text-slate-500 mb-1 truncate">
                  {comm.equipmentName}
                </div>
                <p className="text-slate-700 text-xs line-clamp-2">
                  {comm.message}
                </p>
              </div>

              <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                By: {comm.author}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
