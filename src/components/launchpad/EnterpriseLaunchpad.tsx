import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Clock,
  Calendar,
  Lock,
  ChevronRight,
  Shield,
  PhoneCall,
  FileSpreadsheet,
  Cpu,
  Layers,
  Users,
  AlertTriangle,
  Building2,
  ExternalLink,
  Flame,
  Droplets,
  Zap,
  Info,
  Radio,
  Newspaper,
  CheckCircle2,
  X
} from 'lucide-react';
import { getActiveStandbyRoster } from '../../core/master-data/organization';

interface EnterpriseLaunchpadProps {
  onNavigate: (view: 'dashboard' | 'jobcards' | 'equipment' | 'electrical' | 'organogram' | 'reports' | 'settings') => void;
  openJobCardCount: number;
  emergencyCount: number;
}

export const EnterpriseLaunchpad: React.FC<EnterpriseLaunchpadProps> = ({
  onNavigate,
  openJobCardCount,
  emergencyCount
}) => {
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
  const [showOperationsDrilldown, setShowOperationsDrilldown] = useState<boolean>(false);
  const [showContactsModal, setShowContactsModal] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showBulletinsModal, setShowBulletinsModal] = useState<boolean>(false);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const standbyRoster = getActiveStandbyRoster();
  const activeElectrician = standbyRoster.find((r) => r.trade === 'Electrician')?.onDuty.name || 'Msebenzi Gamedze';
  const activeBoilermaker = standbyRoster.find((r) => r.trade === 'Boilermaker')?.onDuty.name || 'John Khoza';

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) + ' • ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="min-h-full bg-[#f2f4f1] text-slate-900 pb-12 select-none">
      {/* Top Banner (from Ui1: "Date & time", "company logo", "company name") */}
      <div className="bg-[#1b4332] text-white border-b-4 border-[#143326] shadow-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: Real-time Date & Clock */}
          <div className="flex items-center space-x-2.5 bg-black/25 px-3.5 py-1.5 rounded-full border border-white/10 text-xs">
            <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-mono font-semibold tracking-wide text-emerald-200">
              {formatDateTime(currentDateTime)}
            </span>
          </div>

          {/* Center: Official Logo & Company Name */}
          <div className="flex items-center space-x-3.5">
            <img
              src="/assets/aistudio/Screenshot_2024-01-26_104006_cd1bebac.png"
              alt="USA Distillers"
              className="h-14 w-auto rounded bg-[#1e4620] p-1 border border-emerald-900/50 shadow-sm"
            />
            <div className="text-center md:text-left">
              <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase leading-none text-white">
                USA DISTILLERS (PTY) LTD
              </h1>
              <p className="text-xs text-emerald-300 font-semibold tracking-wider mt-1">
                ENTERPRISE MANAGEMENT SYSTEM • BIG BEND DISTILLERY
              </p>
            </div>
          </div>

          {/* Right: Live Shift & Standby Badges */}
          <div className="flex items-center space-x-2 text-xs">
            <div className="bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded text-left">
              <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Continuous Shift: Shift A
              </div>
              <div className="text-[11px] font-semibold text-white">
                P. Maseko (Fitter) • S. Mngomethulu (Rigger)
              </div>
            </div>
            <div className="bg-amber-950/80 border border-amber-500/40 px-3 py-1.5 rounded text-left hidden lg:block">
              <div className="text-[10px] uppercase font-bold text-amber-400">Standby (Wed-to-Wed)</div>
              <div className="text-[11px] font-semibold text-white">
                ⚡ {activeElectrician} (Elect.)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 space-y-8">
        {/* Welcome & Instructions Banner */}
        <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Central Plant Modular Monolith Shell
              </h2>
              <p className="text-xs text-slate-600">
                Select an active department below to access operational engines. Phase 2 modules remain locked in the skeleton.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setShowOperationsDrilldown(true)}
              className="px-4 py-2 bg-[#1b4332] hover:bg-[#143326] text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span>Launch Operations Portal</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            DEPARTMENT TILES (From Ui1 Hand Sketch: Operations, Procurement, HR,
            Logistics, Community Programs/Security, Projects + Core ERP pillars)
            ========================================================================= */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Company Department Modules
            </h3>
            <span className="text-[11px] text-slate-500 font-semibold">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1 align-middle"></span>
              Active Module &nbsp;|&nbsp;
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-300 mx-1 align-middle"></span>
              Phase 2 Locked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. OPERATIONS (ACTIVE - COLOR & CLICKABLE from Ui1 & Ui2) */}
            <div
              onClick={() => setShowOperationsDrilldown(true)}
              className="group relative bg-white border-2 border-emerald-600 hover:border-emerald-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col justify-between min-h-[170px]"
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 pointer-events-none group-hover:bg-emerald-100 transition-colors"></div>
              
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[#1e4620] text-white flex items-center justify-center shadow-md">
                    <Wrench className="w-6 h-6 text-emerald-300" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-300">
                    Active Module
                  </span>
                </div>

                <h4 className="text-lg font-black text-slate-900 group-hover:text-emerald-900 transition-colors">
                  Operations & Plant Maintenance
                </h4>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                  Works Requisitions (Job Cards), Electrical Distribution SLD, 105 machinery assets, LOTO &amp; Daily Report.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  Open Engine (5 Tools) <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
                {openJobCardCount > 0 && (
                  <span className="bg-emerald-600 text-white font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                    {openJobCardCount} Open Work Orders
                  </span>
                )}
              </div>
            </div>

            {/* 2. PROCUREMENT (GREYED OUT from Ui1) */}
            <div className="relative bg-slate-100/80 border border-slate-300 rounded-xl p-5 cursor-not-allowed opacity-75 flex flex-col justify-between min-h-[170px]">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-300 text-slate-500 flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Phase 2
                  </span>
                </div>

                <h4 className="text-lg font-bold text-slate-500">
                  Procurement
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Purchase orders, chemical tenders, supplier agreements, and vendor quotation comparisons.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-400">
                <span>Under Development</span>
                <span className="text-[10px] font-mono">v1.2 Scheduled</span>
              </div>
            </div>

            {/* 3. HR & SAFETY (GREYED OUT from Ui1) */}
            <div className="relative bg-slate-100/80 border border-slate-300 rounded-xl p-5 cursor-not-allowed opacity-75 flex flex-col justify-between min-h-[170px]">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-300 text-slate-500 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Phase 2
                  </span>
                </div>

                <h4 className="text-lg font-bold text-slate-500">
                  Human Resources & Safety
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Shift attendance, certified medicals, safety incident logs (Jason Dlamini), and employee files.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-400">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate('organogram');
                  }}
                  className="text-emerald-700 hover:underline font-semibold cursor-pointer"
                >
                  View Organogram Master Data →
                </button>
              </div>
            </div>

            {/* 4. LOGISTICS & WEIGHBRIDGE (GREYED OUT from Ui1) */}
            <div className="relative bg-slate-100/80 border border-slate-300 rounded-xl p-5 cursor-not-allowed opacity-75 flex flex-col justify-between min-h-[170px]">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-300 text-slate-500 flex items-center justify-center">
                    <Droplets className="w-6 h-6" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Phase 2
                  </span>
                </div>

                <h4 className="text-lg font-bold text-slate-500">
                  Logistics & Weighbridge
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Tanker bay loading, Gross/Tare weighbridge tickets, seal verification, and customs export notes.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-400">
                <span>Under Development (Vincent Masuku)</span>
                <span className="text-[10px] font-mono">v1.3</span>
              </div>
            </div>

            {/* 5. COMMUNITY PROGRAMS & SECURITY (GREYED OUT from Ui1) */}
            <div className="relative bg-slate-100/80 border border-slate-300 rounded-xl p-5 cursor-not-allowed opacity-75 flex flex-col justify-between min-h-[170px]">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-300 text-slate-500 flex items-center justify-center">
                    <Shield className="w-6 h-6" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Phase 2
                  </span>
                </div>

                <h4 className="text-lg font-bold text-slate-500">
                  Community Programs & Security
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Mahlabaneni community water scheme meters, perimeter patrols, and main gate vehicle logs (Smanga Mthembu).
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-400">
                <span>Under Development</span>
                <span className="text-[10px] font-mono">v1.4</span>
              </div>
            </div>

            {/* 6. PROJECTS & CAPITAL WORKS (GREYED OUT from Ui1) */}
            <div className="relative bg-slate-100/80 border border-slate-300 rounded-xl p-5 cursor-not-allowed opacity-75 flex flex-col justify-between min-h-[170px]">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-300 text-slate-500 flex items-center justify-center">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Phase 2
                  </span>
                </div>

                <h4 className="text-lg font-bold text-slate-500">
                  Projects & Civils
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  6,209 hp turbine maintenance, civils drainage, distillery expansion capital tracking (Martin Botha).
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-400">
                <span>Under Development</span>
                <span className="text-[10px] font-mono">v1.5</span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            LOWER SECTION (From Ui1 Hand Sketch: Contacts, Newsletter, About Us)
            ========================================================================= */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Operational Support & Company Services
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. CONTACTS FOR MANAGEMENT & KEY TECHNICAL STAFF (Ui1) */}
            <div
              onClick={() => setShowContactsModal(true)}
              className="bg-white hover:bg-slate-50 border border-slate-300 hover:border-emerald-600 rounded-xl p-4 shadow-xs transition cursor-pointer flex items-center space-x-3"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Key Staff & Standby Roster
                </h4>
                <p className="text-[11px] text-slate-500">
                  Direct callout contacts for 42 artisans, operators & supervisors.
                </p>
              </div>
            </div>

            {/* 2. PLANT NOTICES / NEWSLETTER (Ui1: News letter -> Plant Bulletins) */}
            <div
              onClick={() => setShowBulletinsModal(true)}
              className="bg-white hover:bg-slate-50 border border-slate-300 hover:border-emerald-600 rounded-xl p-4 shadow-xs transition cursor-pointer flex items-center space-x-3"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                <Newspaper className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Plant Bulletins & Stop Days
                </h4>
                <p className="text-[11px] text-slate-500">
                  Steam shutdown notices, river intake status & shift broadcasts.
                </p>
              </div>
            </div>

            {/* 3. ABOUT US (Ui1: About US - Company History, Vision & Mission) */}
            <div
              onClick={() => setShowAboutModal(true)}
              className="bg-white hover:bg-slate-50 border border-slate-300 hover:border-emerald-600 rounded-xl p-4 shadow-xs transition cursor-pointer flex items-center space-x-3"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  About USA Distillers (Pty) Ltd
                </h4>
                <p className="text-[11px] text-slate-500">
                  Great Usuthu facility specs, 3MW power generation & alcohol grades.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info note */}
        <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-200">
          USA Distillers (Pty) Ltd • P.O. Box 112, Big Bend, Eswatini • Clean Work Area is a Safe Work Area.
        </div>
      </div>

      {/* =========================================================================
          OPERATIONS DRILL-DOWN MODAL (From Ui2 Hand Sketch: Opening each Tab -> Operations)
          Revealing: Job Card Engine, Plant Daily Report Engine, Equipment Registry
          ========================================================================= */}
      {showOperationsDrilldown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#1b4332] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white uppercase">
                    Operations Department Modules
                  </h3>
                  <p className="text-xs text-emerald-300">
                    Select an operational engine to enter
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOperationsDrilldown(false)}
                className="p-1 text-white/70 hover:text-white rounded hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Engines Grid (Ui2: Job card engine + Plant Daily report engine) */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50">
              {/* 1. JOB CARD ENGINE (WORKS REQUISITIONS) */}
              <div
                onClick={() => {
                  setShowOperationsDrilldown(false);
                  onNavigate('jobcards');
                }}
                className="bg-white border-2 border-emerald-600 hover:border-emerald-800 rounded-xl p-4 shadow-xs hover:shadow-md transition cursor-pointer flex items-start space-x-3 group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                  <Wrench className="w-6 h-6 text-emerald-200" />
                </div>
                <div className="grow">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-900">
                      Job Card Engine
                    </h4>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                      LIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Works Requisition slips (WO #188499), trade assignments, standby callouts, and LOTO safety tags.
                  </p>
                  <div className="mt-2 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    Open Job Cards <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>

              {/* 2. PLANT DAILY REPORT ENGINE */}
              <div
                onClick={() => {
                  setShowOperationsDrilldown(false);
                  onNavigate('reports');
                }}
                className="bg-white border-2 border-emerald-600 hover:border-emerald-800 rounded-xl p-4 shadow-xs hover:shadow-md transition cursor-pointer flex items-start space-x-3 group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#1e4620] text-white flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
                </div>
                <div className="grow">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-900">
                      Daily Plant Report Engine
                    </h4>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                      LIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Official consolidated report: Water TDS, Steam, Coal, Cooling Towers, Molasses balance & 15 Alcohol Tanks.
                  </p>
                  <div className="mt-2 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    Open Daily Sheet <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>

              {/* 3. PLANT MACHINERY REGISTRY (105 Assets) */}
              <div
                onClick={() => {
                  setShowOperationsDrilldown(false);
                  onNavigate('equipment');
                }}
                className="bg-white border border-slate-300 hover:border-emerald-600 rounded-xl p-4 shadow-xs hover:shadow-md transition cursor-pointer flex items-start space-x-3 group"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0">
                  <Cpu className="w-6 h-6 text-amber-300" />
                </div>
                <div className="grow">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-900">
                      Equipment & Motors (105 Assets)
                    </h4>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-800">
                      105 Assets
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Full Electrical Plant Checklist: Boilers 1-3, Fans, Universal, Water treatment, kW ratings & starters.
                  </p>
                  <div className="mt-2 text-xs font-semibold text-slate-700 flex items-center gap-1">
                    View Registry <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>

              {/* 3b. ELECTRICAL DISTRIBUTION & POWER SLD */}
              <div
                onClick={() => {
                  setShowOperationsDrilldown(false);
                  onNavigate('electrical');
                }}
                className="bg-white border-2 border-amber-500 hover:border-amber-700 rounded-xl p-4 shadow-xs hover:shadow-md transition cursor-pointer flex items-start space-x-3 group"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6 text-amber-100" />
                </div>
                <div className="grow">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-amber-900">
                      Electrical Distribution &amp; SLD
                    </h4>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                      11 kV / 400 V
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Interactive Plant Single-Line Diagram, Tx1–Tx3 Load Monitoring &amp; Structured Asset Inspections.
                  </p>
                  <div className="mt-2 text-xs font-semibold text-amber-800 flex items-center gap-1">
                    Open Electrical Workspace <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>

              {/* 4. OPERATIONS EXECUTIVE DASHBOARD */}
              <div
                onClick={() => {
                  setShowOperationsDrilldown(false);
                  onNavigate('dashboard');
                }}
                className="bg-white border border-slate-300 hover:border-emerald-600 rounded-xl p-4 shadow-xs hover:shadow-md transition cursor-pointer flex items-start space-x-3 group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#714B67] text-white flex items-center justify-center shrink-0">
                  <Layers className="w-6 h-6 text-amber-300" />
                </div>
                <div className="grow">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-purple-900">
                      Operations Dashboard
                    </h4>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                      KPIs
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Executive overview for Johan Smit (Operations Director) and Antonio Miranda (Maintenance Manager).
                  </p>
                  <div className="mt-2 text-xs font-semibold text-[#714B67] flex items-center gap-1">
                    View Analytics <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          KEY STAFF CONTACTS MODAL
          ========================================================================= */}
      {showContactsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="bg-[#1b4332] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <PhoneCall className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Key Staff & Standby Roster</h3>
              </div>
              <button
                onClick={() => setShowContactsModal(false)}
                className="p-1 text-white/70 hover:text-white rounded hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-amber-900 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Active Wed-to-Wed Standby: Electrician ({activeElectrician}) • Boilermaker ({activeBoilermaker})</span>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold uppercase text-[11px] text-slate-500">Engineering & Operations Management</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900">Johan Smit</div>
                    <div className="text-slate-500 text-[11px]">Operations Director</div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900">Antonio Miranda</div>
                    <div className="text-slate-500 text-[11px]">Engineering & Maintenance Manager</div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900">Thoba Nhleko</div>
                    <div className="text-slate-500 text-[11px]">Electrical & Instrumentation Manager</div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900">Andriese Mhlongo</div>
                    <div className="text-slate-500 text-[11px]">Utilities Manager (Boilers & Water)</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold uppercase text-[11px] text-slate-500">Continuous Shift Fitters & Riggers</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <div className="font-semibold text-slate-900">Shift A</div>
                    <div className="text-slate-600 text-[11px]">Phumelele Maseko (Fitter) • Sonboy Mngomethulu (Rigger)</div>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <div className="font-semibold text-slate-900">Shift B</div>
                    <div className="text-slate-600 text-[11px]">Nkosnathi Nkhambule (Fitter) • Lwazi Ntjakala (Rigger)</div>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <div className="font-semibold text-slate-900">Shift C</div>
                    <div className="text-slate-600 text-[11px]">Dwyane Littler (Fitter) • Mandla Dlamini (Rigger)</div>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <div className="font-semibold text-slate-900">Shift D</div>
                    <div className="text-slate-600 text-[11px]">Sifiso Nyawo (Fitter) • Bhanyaza Gamedze (Rigger)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ABOUT USA DISTILLERS MODAL
          ========================================================================= */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-xl overflow-hidden">
            <div className="bg-[#1b4332] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">About USA Distillers (Pty) Ltd</h3>
              </div>
              <button
                onClick={() => setShowAboutModal(false)}
                className="p-1 text-white/70 hover:text-white rounded hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="flex items-center space-x-3 mb-2">
                <img
                  src="/assets/aistudio/Screenshot_2024-01-26_104006_cd1bebac.png"
                  alt="USA Distillers"
                  className="h-12 w-auto rounded bg-[#1e4620] p-1 border border-emerald-950"
                />
                <div>
                  <h4 className="font-black text-slate-900 uppercase">Big Bend, Eswatini</h4>
                  <p className="text-slate-500 text-[11px]">Founded by Joe Caldeira (Group Executive Chairman)</p>
                </div>
              </div>

              <p>
                <strong>USA Distillers (Pty) Ltd</strong> is a premier distillery situated along the Great Usuthu River. The facility draws raw river water to produce potable drinking water for both plant operations and the surrounding Mahlabaneni community.
              </p>
              <p>
                Our co-generation power plant features <strong>three 20-ton industrial boilers</strong> feeding steam to a <strong>6,209 hp back-pressure turbine driving a 3 MW generator</strong>. Exhaust steam supplies continuous energy to our distillation columns.
              </p>
              <p>
                Feedstock molasses is sourced from Ubombo Sugar (20 km away) and fermented into 9–13% wash beer before multi-column distillation yields <strong>94–95% high-grade potable alcohol</strong>, industrial spirits, and premium rum.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PLANT BULLETINS & STOP DAYS MODAL
          ========================================================================= */}
      {showBulletinsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden">
            <div className="bg-[#1b4332] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Newspaper className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Plant Bulletins & Shift Notices</h3>
              </div>
              <button
                onClick={() => setShowBulletinsModal(false)}
                className="p-1 text-white/70 hover:text-white rounded hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50">
                <div className="font-bold text-emerald-900 flex items-center justify-between">
                  <span>Continuous Production On Track</span>
                  <span className="text-[10px] text-emerald-700">Today</span>
                </div>
                <p className="text-emerald-800 text-[11px] mt-1">
                  Daily alcohol stock standing at 763,850 Litres across Day & Storage tanks. Molasses site balance at 8,097 Tonnes.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-amber-300 bg-amber-50">
                <div className="font-bold text-amber-900 flex items-center justify-between">
                  <span>Scheduled Stop Day Notice</span>
                  <span className="text-[10px] text-amber-700">Planned PM</span>
                </div>
                <p className="text-amber-800 text-[11px] mt-1">
                  Boiler #2 sootblowing and tube inspection scheduled for upcoming shift transition. Work requisitions marked &apos;Stop Day&apos; will take priority.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
