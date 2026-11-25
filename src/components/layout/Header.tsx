import React, { useState } from 'react';
import {
  Bell,
  Grid,
  User,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Database,
  Search,
  CheckCheck,
  AlertTriangle,
  Info,
  BellRing,
  Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { firebaseRuntimeInfo } from '../../firebase';
import { AppNotification } from '../../types';
import {
  getBrowserNotificationCapability,
  requestBrowserNotificationPermission
} from '../../services/notificationService';

interface HeaderProps {
  currentView: string;
  subView?: string;
  onSearchChange: (query: string) => void;
  searchQuery: string;
  emergencyCount: number;
  onOpenLogin: () => void;
  onSelectView?: (view: any) => void;
  notifications?: AppNotification[];
  currentUserUid?: string | null;
  onMarkNotificationRead?: (notificationId: string) => void;
  onMarkAllNotificationsRead?: () => void;
  onOpenJobCardFromNotification?: (jobCardId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  subView,
  onSearchChange,
  searchQuery,
  emergencyCount,
  onOpenLogin,
  onSelectView,
  notifications = [],
  currentUserUid,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onOpenJobCardFromNotification
}) => {
  const { userProfile, logout, currentUser } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [pushStatus, setPushStatus] = useState(() => getBrowserNotificationCapability());

  const activeUid = currentUserUid || currentUser?.uid || '';
  const unreadCount = activeUid
    ? notifications.filter((n) => !n.readByUids.includes(activeUid)).length
    : notifications.length;

  const getBreadcrumbs = () => {
    switch (currentView) {
      case 'launchpad':
        return ['USA Distillers', 'Enterprise Department Launchpad'];
      case 'reports':
        return ['Operations', 'Daily Plant Report Engine'];
      case 'dashboard':
        return ['Operations', 'Executive Operations Dashboard'];
      case 'jobcards':
        return subView ? ['Operations', 'Works Requisitions (Job Cards)', subView] : ['Operations', 'Works Requisitions (Job Cards)'];
      case 'spares':
        return ['Stores & Inventory', 'Spares Requisitions (Elliot Mhlongo Desk)'];
      case 'slips':
        return ['Operations', 'Physical Works Requisitions (Paper Book Intake Archive)'];
      case 'equipment':
        return ['Maintenance', 'Plant Machinery & Motors (105 Assets)'];
      case 'electrical':
        return subView
          ? ['Engineering', 'Electrical Distribution', subView]
          : ['Engineering', 'Electrical Distribution'];
      case 'organogram':
        return ['Executive Governance', 'Company Organogram & Leadership'];
      case 'settings':
        return ['Configuration', 'Plant & System Settings'];
      default:
        return ['Operations', 'Works Requisitions'];
    }
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="bg-[#1b4332] text-white select-none z-30 sticky top-0 shadow-md">
      {/* USA Distillers Primary Navigation Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#143326]">
        {/* Left: App Switcher & Brand */}
        <div className="flex items-center space-x-3">
          <button
            title="USA Distillers Department Launchpad"
            onClick={() => onSelectView?.('launchpad')}
            className="p-1.5 hover:bg-white/10 rounded transition cursor-pointer text-emerald-300 hover:text-white flex items-center gap-1.5"
          >
            <Grid className="w-5 h-5" />
            <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider text-emerald-300">
              Apps
            </span>
          </button>

          <div
            onClick={() => onSelectView?.('launchpad')}
            className="flex items-center space-x-2 cursor-pointer group"
          >
            <img
              src="/assets/aistudio/Screenshot_2024-01-26_104006_cd1bebac.png"
              alt="USA Distillers"
              className="h-7 w-auto object-contain rounded bg-[#1e4620] p-0.5 border border-emerald-900/50 shadow-inner group-hover:scale-105 transition-transform"
            />
            <div className="leading-tight">
              <span className="font-black tracking-tight text-sm text-white">USA DISTILLERS</span>
              <span className="ml-1.5 text-[9px] font-bold bg-emerald-500/30 px-1.5 py-0.5 rounded text-emerald-200 border border-emerald-400/30">
                ERP
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center text-xs text-white/60 space-x-1 pl-4 border-l border-white/20">
            <span className="text-emerald-200/90 font-medium">Big Bend Operations</span>
          </div>
        </div>

        {/* Center: Search & Dev Tag */}
        <div className="flex-1 max-w-md mx-4 hidden lg:block">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search Job Cards, Equipment, Technicians... (e.g. JC-2026, Boiler)"
              className="w-full bg-[#5b3c53] text-white placeholder-white/50 text-xs pl-8 pr-3 py-1.5 rounded border border-transparent focus:border-amber-400 focus:outline-none transition"
            />
          </div>
        </div>

        {/* Right: Environment, Alerts, Notifications, User Profile */}
        <div className="flex items-center space-x-2 text-xs">
          {/* Environment Indicator Badge */}
          <div className="hidden sm:flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-400/30 text-emerald-300 font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{firebaseRuntimeInfo.environment.toUpperCase()}: {firebaseRuntimeInfo.projectId}</span>
          </div>

          {/* Emergency Alert Indicator */}
          {emergencyCount > 0 && (
            <button
              type="button"
              onClick={() => onSelectView?.('jobcards')}
              title={`${emergencyCount} Emergency Job Cards Require Action!`}
              className="flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-600/90 hover:bg-rose-600 text-white font-medium animate-pulse cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{emergencyCount} Emergency</span>
            </button>
          )}

          {/* Live Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotificationsDropdown(!showNotificationsDropdown);
                setShowUserDropdown(false);
              }}
              title="Plant Workflow Notifications"
              className="relative p-1.5 rounded hover:bg-white/10 text-emerald-100 hover:text-white transition cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center border border-[#1b4332]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotificationsDropdown && (
              <div className="absolute right-0 mt-1 w-80 sm:w-96 bg-white text-slate-800 rounded-md shadow-xl border border-slate-200 z-50 text-xs overflow-hidden">
                <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-[#714B67]" />
                      <span>Plant Alerts &amp; Dispatch Feed</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {unreadCount} unread of {notifications.length} recent events
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {pushStatus === 'default' && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await requestBrowserNotificationPermission();
                          setPushStatus(res);
                        }}
                        className="px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-[#714B67] border border-purple-200 text-[10px] font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <BellRing className="w-3 h-3" />
                        <span>Enable Push</span>
                      </button>
                    )}
                    {unreadCount > 0 && onMarkAllNotificationsRead && (
                      <button
                        type="button"
                        onClick={() => onMarkAllNotificationsRead()}
                        className="px-2 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <CheckCheck className="w-3 h-3 text-emerald-600" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      No dispatch or workflow alerts yet.
                    </div>
                  ) : (
                    notifications.slice(0, 20).map((notif) => {
                      const isUnread = activeUid ? !notif.readByUids.includes(activeUid) : false;
                      const severityClass =
                        notif.severity === 'EMERGENCY'
                          ? 'bg-rose-50/70 border-l-4 border-l-rose-600'
                          : notif.severity === 'ACTION_REQUIRED'
                          ? 'bg-amber-50/60 border-l-4 border-l-amber-500'
                          : 'bg-white border-l-4 border-l-transparent';

                      return (
                        <button
                          key={notif.id}
                          type="button"
                          onClick={() => {
                            if (isUnread) {
                              onMarkNotificationRead?.(notif.id);
                            }
                            if (notif.jobCardId && onOpenJobCardFromNotification) {
                              onOpenJobCardFromNotification(notif.jobCardId);
                              setShowNotificationsDropdown(false);
                            }
                          }}
                          className={`w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition cursor-pointer flex items-start gap-2.5 ${severityClass}`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {notif.severity === 'EMERGENCY' ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            ) : notif.severity === 'ACTION_REQUIRED' ? (
                              <BellRing className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <Info className="w-3.5 h-3.5 text-blue-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`truncate ${isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                {notif.title}
                              </span>
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-[#714B67] shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                              {notif.message}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                              <span>{notif.createdBy}</span>
                              <span>{new Date(notif.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            {userProfile ? (
              <button
                onClick={() => {
                  setShowUserDropdown(!showUserDropdown);
                  setShowNotificationsDropdown(false);
                }}
                className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-white/10 transition cursor-pointer"
              >
                <div className={`w-6 h-6 rounded-full ${userProfile.avatarColor || 'bg-indigo-600'} flex items-center justify-center text-[11px] font-bold text-white border border-white/20`}>
                  {userProfile.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-semibold text-xs leading-none text-white">{userProfile.displayName}</div>
                  <div className="text-[10px] text-white/80 leading-tight mt-0.5 truncate max-w-[140px]">
                    {userProfile.title || userProfile.department?.split(' - ')[0] || userProfile.role}
                  </div>
                </div>
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-xs font-medium transition cursor-pointer"
              >
                Sign In
              </button>
            )}

            {/* Dropdown Menu */}
            {showUserDropdown && userProfile && (
              <div className="absolute right-0 mt-1 w-72 bg-white text-slate-800 rounded shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50">
                  <div className="font-bold text-slate-900 text-sm">{userProfile.displayName}</div>
                  {userProfile.title && (
                    <div className="text-xs font-semibold text-[#714B67] leading-tight mt-0.5">
                      {userProfile.title}
                    </div>
                  )}
                  <div className="text-slate-500 text-[11px] truncate mt-0.5">{userProfile.email}</div>
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                      {userProfile.role}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]">
                      {userProfile.department}
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  <div className="px-3 py-1.5 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                    Session Details
                  </div>
                  <div className="px-3 py-1 text-slate-600 flex items-center justify-between">
                    <span>Auth Method</span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {currentUser ? 'Firebase Auth' : 'Demo Staff Preset'}
                    </span>
                  </div>
                  <div className="px-3 py-1 text-slate-600 flex items-center justify-between">
                    <span>Database</span>
                    <span className="font-mono text-[10px] text-emerald-600 flex items-center gap-1">
                      <Database className="w-3 h-3" /> Live Firestore
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-1 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      onSelectView?.('settings');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center space-x-2 text-slate-700 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-500" />
                    <span>Plant Settings &amp; User Access</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenLogin();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center space-x-2 text-slate-700 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Switch Staff Role / Login</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-700 flex items-center space-x-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Odoo Secondary Sub-header: Structured Breadcrumbs & Module Status */}
      <div className="bg-[#5b3c53] px-4 py-1.5 flex items-center justify-between text-xs text-white/90 border-b border-[#4d3246]">
        <div className="flex items-center space-x-1.5 font-medium">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-white/40" />}
              <span className={idx === breadcrumbs.length - 1 ? 'text-white font-semibold' : 'text-white/70 hover:text-white cursor-pointer'}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>

        <div className="hidden sm:flex items-center space-x-4 text-[11px] text-white/70">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ISO 55001 Asset Management Compliant
          </span>
          <span className="text-white/30">|</span>
          <span>Plant: Great Usuthu Distillery — Big Bend</span>
        </div>
      </div>
    </header>
  );
};
