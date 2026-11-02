import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Cpu,
  Settings,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Package,
  Flame,
  Droplets,
  Users
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  openCount: number;
  emergencyCount: number;
  pendingSparesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  openCount,
  emergencyCount,
  pendingSparesCount
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'jobcards',
      label: 'Job Cards',
      icon: ClipboardList,
      badge: openCount > 0 ? openCount : null,
      badgeColor: 'bg-purple-100 text-purple-800'
    },
    {
      id: 'equipment',
      label: 'Equipment',
      icon: Cpu,
      badge: null
    },
    {
      id: 'organogram',
      label: 'Organogram',
      icon: Users,
      badge: '23',
      badgeColor: 'bg-purple-100 text-[#714B67]'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: null
    }
  ];

  return (
    <aside className="w-60 bg-[#f8f9fa] border-r border-slate-200 flex flex-col justify-between shrink-0 select-none">
      <div className="p-3">
        {/* Module Title */}
        <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Enterprise ERP Apps
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-[#714B67] text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
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

        {/* Quick Operational Telemetry */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Priority Queue
          </div>

          <div className="space-y-1.5 px-2">
            <div className="flex items-center justify-between text-xs p-2 rounded bg-white border border-slate-200 shadow-2xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Emergency
              </span>
              <span className="font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[11px]">
                {emergencyCount}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-2 rounded bg-white border border-slate-200 shadow-2xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <Package className="w-3.5 h-3.5 text-amber-600" />
                Pending Spares
              </span>
              <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                {pendingSparesCount}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-2 rounded bg-white border border-slate-200 shadow-2xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                In Progress
              </span>
              <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                {openCount}
              </span>
            </div>
          </div>
        </div>

        {/* Distillery Quick Indicators */}
        <div className="mt-6 px-3">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Distillery Units
          </div>
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex items-center justify-between py-0.5">
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" /> Boiler Steam
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">12.5 Bar (OK)</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="flex items-center gap-1">
                <Droplets className="w-3 h-3 text-blue-500" /> Mash Wash Feed
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">Flowing</span>
            </div>
          </div>
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
