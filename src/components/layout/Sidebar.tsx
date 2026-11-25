import React from 'react';
import {
  ClipboardList,
  Cpu,
  Package,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  LayoutDashboard,
  Users,
  Settings,
  Grid,
  Zap
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  openCount: number;
  emergencyCount: number;
  pendingSparesCount: number;
  paperSlipsCount?: number;
  electricalAlertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  openCount,
  emergencyCount,
  pendingSparesCount,
  paperSlipsCount = 0,
  electricalAlertCount = 0
}) => {
  // Phase 1: Core Functional Job Card & Maintenance Suite
  const coreJobCardApps = [
    {
      id: 'jobcards',
      label: 'Works Requisitions',
      icon: ClipboardList,
      badge: openCount > 0 ? openCount : null,
      badgeColor: 'bg-[#714B67] text-white',
      desc: 'Active Kanban & List Board'
    },
    {
      id: 'equipment',
      label: 'Plant Machinery (105)',
      icon: Cpu,
      badge: '105',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      desc: 'Motors, Pumps, Specs & History'
    },
    {
      id: 'electrical',
      label: 'Electrical Distribution',
      icon: Zap,
      badge: electricalAlertCount > 0 ? electricalAlertCount : null,
      badgeColor: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
      desc: 'Single-Line Diagram, Inspections & Load Monitoring'
    },
    {
      id: 'spares',
      label: 'Stores Spares Queue',
      icon: Package,
      badge: pendingSparesCount > 0 ? pendingSparesCount : null,
      badgeColor: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
      desc: 'Elliot Mhlongo Voucher Desk'
    },
    {
      id: 'slips',
      label: 'Paper Slips Archive',
      icon: FileSpreadsheet,
      badge: paperSlipsCount > 0 ? paperSlipsCount : null,
      badgeColor: 'bg-red-100 text-red-800 font-bold',
      desc: 'Red WO # Handwritten Slips'
    }
  ];

  const operationsGovernanceApps = [
    {
      id: 'reports',
      label: 'Daily Plant Report',
      icon: FileSpreadsheet,
      desc: 'Consolidated Daily Plant & Alcohol Tanks Sheet'
    },
    {
      id: 'dashboard',
      label: 'Operations KPIs',
      icon: LayoutDashboard,
      desc: 'Maintenance KPIs & Work Order Analytics'
    },
    {
      id: 'organogram',
      label: 'Staff Organogram',
      icon: Users,
      desc: 'Management & Shift Roster Directory'
    }
  ];

  const configurationApps = [
    {
      id: 'settings',
      label: 'Plant Settings & Users',
      icon: Settings,
      desc: 'Environment Status, User Roles, Org Master Data & Exports'
    }
  ];

  return (
    <aside className="w-60 bg-[#f8f9fa] border-r border-slate-200 flex flex-col justify-between shrink-0 select-none">
      <div className="p-3">
        {/* Module Title */}
        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Job Card Engine</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
            Active
          </span>
        </div>

        {/* Primary Functional Navigation Items */}
        <nav className="space-y-1 mt-1">
          {coreJobCardApps.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                title={item.desc}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-[#714B67] text-white shadow-xs font-semibold'
                    : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Priority Backlog */}
        <div className="mt-5 pt-3.5 border-t border-slate-200">
          <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Supervisory Backlog
          </div>

          <div className="space-y-1.5 px-1">
            <button
              onClick={() => onSelectView('jobcards')}
              className="w-full flex items-center justify-between text-xs p-2 rounded bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition text-left cursor-pointer"
            >
              <span className="flex items-center gap-1.5 text-slate-600">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Emergency Jobs
              </span>
              <span className="font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded text-[11px]">
                {emergencyCount}
              </span>
            </button>

            <button
              onClick={() => onSelectView('spares')}
              className="w-full flex items-center justify-between text-xs p-2 rounded bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition text-left cursor-pointer"
            >
              <span className="flex items-center gap-1.5 text-slate-600">
                <Package className="w-3.5 h-3.5 text-amber-600" />
                Awaiting Spares
              </span>
              <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded text-[11px]">
                {pendingSparesCount}
              </span>
            </button>

            <button
              onClick={() => onSelectView('jobcards')}
              className="w-full flex items-center justify-between text-xs p-2 rounded bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition text-left cursor-pointer"
            >
              <span className="flex items-center gap-1.5 text-slate-600">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Open / In Progress
              </span>
              <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded text-[11px]">
                {openCount}
              </span>
            </button>
          </div>
        </div>

        {/* Operations & Governance Modules */}
        <div className="mt-5 pt-3.5 border-t border-slate-200">
          <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>Operations &amp; Governance</span>
          </div>

          <nav className="space-y-1">
            {operationsGovernanceApps.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  title={item.desc}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-[#714B67] text-white shadow-xs font-semibold'
                      : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Administration & Plant Configuration */}
        <div className="mt-4 pt-3 border-t border-slate-200">
          <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            <span>Administration</span>
          </div>
          <nav className="space-y-1">
            {configurationApps.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  title={item.desc}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-[#1b4332] text-white shadow-xs font-semibold'
                      : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-300' : 'text-slate-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-slate-200 bg-slate-100/60 text-[11px] text-slate-500">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-700">USA Distillers</span>
          <span className="font-mono text-[10px] text-slate-400">KY-03</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          Job Card & Spares Subsystem
        </div>
      </div>
    </aside>
  );
};
