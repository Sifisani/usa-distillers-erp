import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  Building,
  CheckCircle2,
  Package,
  Printer,
  Edit,
  Trash2,
  Send,
  MessageSquare,
  History,
  PlusCircle,
  FileText,
  AlertCircle,
  Check,
  ChevronRight,
  ShieldAlert,
  Zap,
  ShieldCheck,
  Flame,
  ArrowRightLeft,
  RotateCcw,
  Sparkles,
  PhoneCall
} from 'lucide-react';
import {
  JobCard,
  JobCardStatus,
  Priority,
  LaborLog,
  ActivityComment,
  ShiftHandoverLog,
  SafetyPermits,
  TechnicalTrade,
  ShiftGroup
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  COMPANY_ORGANOGRAM,
  TECHNICAL_TRADES_LIST,
  SHIFTS_LIST,
  getStaffByTrade,
  getStaffByShift
} from '../../core/master-data/organization';

interface JobCardDetailModalProps {
  card: JobCard | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (card: JobCard) => void;
  onDelete: (id: string) => Promise<void>;
  onUpdateStatus: (card: JobCard, status: JobCardStatus) => Promise<void>;
  onAddLabor: (
    card: JobCard,
    tech: string,
    date: string,
    hours: number,
    notes: string,
    options?: {
      trade?: TechnicalTrade;
      rateType?: 'Standard' | 'Shift' | 'Standby Callout' | 'Overtime';
      shift?: ShiftGroup;
    }
  ) => Promise<void>;
  onAddComment: (card: JobCard, author: string, message: string) => Promise<void>;
  onAddHandover?: (card: JobCard, handover: Omit<ShiftHandoverLog, 'id' | 'timestamp'>) => Promise<void>;
  onPrint: (card: JobCard) => void;
}

const STAGES: JobCardStatus[] = ['Draft', 'In Progress', 'Pending Spares', 'Completed'];

export const JobCardDetailModal: React.FC<JobCardDetailModalProps> = ({
  card,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onUpdateStatus,
  onAddLabor,
  onAddComment,
  onAddHandover,
  onPrint
}) => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'details' | 'labor' | 'handovers' | 'chatter'>('details');

  // Labor log form state
  const [laborTech, setLaborTech] = useState(userProfile?.displayName || 'Phumelele Maseko (Mechanical Fitter)');
  const [laborTrade, setLaborTrade] = useState<TechnicalTrade>('Mechanical Fitter');
  const [laborRateType, setLaborRateType] = useState<'Standard' | 'Shift' | 'Standby Callout' | 'Overtime'>('Shift');
  const [laborShift, setLaborShift] = useState<ShiftGroup>('Shift A');
  const [laborDate, setLaborDate] = useState(new Date().toISOString().split('T')[0]);
  const [laborHours, setLaborHours] = useState('2.0');
  const [laborNotes, setLaborNotes] = useState('');
  const [isLoggingLabor, setIsLoggingLabor] = useState(false);

  // Shift Handover form state
  const [fromShift, setFromShift] = useState<ShiftGroup>('Shift A');
  const [toShift, setToShift] = useState<ShiftGroup>('Shift B');
  const [handoverFromPerson, setHandoverFromPerson] = useState('');
  const [handoverToPerson, setHandoverToPerson] = useState('');
  const [tasksCompleted, setTasksCompleted] = useState('');
  const [pendingTasks, setPendingTasks] = useState('');
  const [hazardsOrIsolations, setHazardsOrIsolations] = useState('');
  const [isLoggingHandover, setIsLoggingHandover] = useState(false);
  const [showHandoverForm, setShowHandoverForm] = useState(false);

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Sync default technician when user switches active logged-in profile or card changes
  useEffect(() => {
    if (userProfile?.displayName) {
      setLaborTech(userProfile.title ? `${userProfile.displayName} (${userProfile.title})` : userProfile.displayName);
      setHandoverFromPerson(userProfile.displayName);
    }
    if (card) {
      if (card.tradeRequired) setLaborTrade(card.tradeRequired);
      if (card.shiftAssigned) {
        setLaborShift(card.shiftAssigned);
        setFromShift(card.shiftAssigned);
        // Suggest next continuous shift
        if (card.shiftAssigned === 'Shift A') setToShift('Shift B');
        else if (card.shiftAssigned === 'Shift B') setToShift('Shift C');
        else if (card.shiftAssigned === 'Shift C') setToShift('Shift D');
        else if (card.shiftAssigned === 'Shift D') setToShift('Shift A');
      }
    }
  }, [userProfile, card]);

  if (!isOpen || !card) return null;

  const currentAuthorName = userProfile?.displayName || userProfile?.email || 'Authorized Staff';

  const handleLaborSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hoursNum = parseFloat(laborHours);
    if (isNaN(hoursNum) || hoursNum <= 0) return;
    if (!laborNotes.trim()) return;

    setIsLoggingLabor(true);
    try {
      await onAddLabor(card, laborTech, laborDate, hoursNum, laborNotes.trim(), {
        trade: laborTrade,
        rateType: laborRateType,
        shift: laborShift
      });
      setLaborNotes('');
      setLaborHours('1.0');
    } finally {
      setIsLoggingLabor(false);
    }
  };

  const handleHandoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddHandover) return;
    if (!tasksCompleted.trim() || !pendingTasks.trim() || !handoverToPerson.trim()) return;

    setIsLoggingHandover(true);
    try {
      await onAddHandover(card, {
        fromShift,
        toShift,
        handedOverBy: handoverFromPerson || currentAuthorName,
        handedOverTo: handoverToPerson,
        tasksCompleted: tasksCompleted.trim(),
        pendingTasks: pendingTasks.trim(),
        hazardsOrIsolations: hazardsOrIsolations.trim()
      });
      setTasksCompleted('');
      setPendingTasks('');
      setHazardsOrIsolations('');
      setShowHandoverForm(false);
    } finally {
      setIsLoggingHandover(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      await onAddComment(card, currentAuthorName, commentText.trim());
      setCommentText('');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'Emergency':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300 font-semibold';
      case 'Medium':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Low':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const specs = card.equipmentSpecs;
  const permits = card.safetyPermits;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden my-6 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Odoo Control Panel Header with Pipeline Stage Tracker */}
        <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Action Buttons Left */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(card)}
              className="px-3 py-1.5 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            <button
              onClick={() => onPrint(card)}
              className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Work Order</span>
            </button>

            {/* Stage Quick Actions */}
            {card.status === 'Draft' && (
              <button
                onClick={() => onUpdateStatus(card, 'In Progress')}
                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer transition"
              >
                Start Work
              </button>
            )}

            {card.status === 'In Progress' && (
              <>
                <button
                  onClick={() => onUpdateStatus(card, 'Pending Spares')}
                  className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium cursor-pointer transition"
                >
                  Hold for Spares
                </button>
                <button
                  onClick={() => onUpdateStatus(card, 'Completed')}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium cursor-pointer transition flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark Completed</span>
                </button>
              </>
            )}

            {card.status === 'Pending Spares' && (
              <button
                onClick={() => onUpdateStatus(card, 'In Progress')}
                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer transition"
              >
                Spares Received (Resume)
              </button>
            )}

            {card.status !== 'Cancelled' && card.status !== 'Completed' && (
              <button
                onClick={() => onUpdateStatus(card, 'Cancelled')}
                className="px-2.5 py-1.5 rounded hover:bg-rose-50 text-rose-700 border border-transparent hover:border-rose-200 text-xs cursor-pointer transition"
              >
                Cancel JC
              </button>
            )}
          </div>

          {/* Odoo Chevron Status Stage Bar */}
          <div className="flex items-center space-x-1 text-xs">
            {STAGES.map((stage) => {
              const isCurrent = card.status === stage;
              return (
                <button
                  key={stage}
                  onClick={() => onUpdateStatus(card, stage)}
                  className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                    isCurrent
                      ? 'bg-[#714B67] text-white font-bold shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{stage}</span>
                </button>
              );
            })}

            {card.status === 'Cancelled' && (
              <span className="px-3 py-1 rounded bg-rose-600 text-white font-bold text-xs">
                Cancelled
              </span>
            )}

            <button
              onClick={onClose}
              className="ml-2 p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-[#f8f9fa]">
          {/* Card Top Title Block */}
          <div className="bg-white p-5 rounded border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl font-mono font-bold text-slate-900 tracking-tight">
                    {card.jobCardNumber}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs border ${getPriorityBadge(card.priority)}`}>
                    {card.priority === 'Emergency' && <AlertTriangle className="w-3 h-3 inline mr-1 text-rose-600" />}
                    {card.priority} Priority
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-[#714B67] border border-purple-200">
                    {card.status}
                  </span>

                  {card.tradeRequired && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                      🛠️ {card.tradeRequired}
                    </span>
                  )}

                  {card.shiftAssigned && (
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-800 border border-slate-200">
                      🕒 {card.shiftAssigned}
                    </span>
                  )}
                </div>

                <h2 className="text-base font-bold text-slate-800 mt-1.5 flex items-center gap-2">
                  <span>{card.equipmentName}</span>
                </h2>
              </div>

              {/* Total Labor Hours Counter */}
              <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded text-right">
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Total Logged Labor
                </div>
                <div className="text-xl font-mono font-bold text-[#714B67]">
                  {card.totalLaborHours.toFixed(1)} <span className="text-xs font-sans text-slate-500 font-normal">hours</span>
                </div>
              </div>
            </div>

            {/* Electrical Specs Badge (if available from PDF checklist) */}
            {specs && (
              <div className="bg-purple-50/70 border border-purple-200 rounded p-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-purple-900">
                <span className="font-bold flex items-center gap-1 text-[#714B67]">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Electrical Checklist Data:
                </span>
                {specs.powerKw && <span><strong>Motor:</strong> {specs.powerKw} kW</span>}
                {specs.starterType && (
                  <span className="bg-purple-200/80 text-purple-900 px-1.5 py-0.5 rounded font-mono font-semibold">
                    Starter: {specs.starterType}
                  </span>
                )}
                {specs.ratedCurrentAmps && <span><strong>Rated:</strong> {specs.ratedCurrentAmps} A</span>}
                {specs.overloadAmps && (
                  <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-semibold">
                    O/L Setting: {specs.overloadAmps} A
                  </span>
                )}
                {specs.speedRpm && <span><strong>Speed:</strong> {specs.speedRpm} RPM</span>}
                {specs.plantArea && <span className="text-slate-600">Area: <strong>{specs.plantArea}</strong></span>}
              </div>
            )}

            {/* Safety Permits Bar */}
            {permits && (permits.lotoRequired || permits.hotWorkRequired || permits.confinedSpaceRequired || permits.heightPermitRequired) && (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded p-2.5 flex flex-wrap items-center gap-3 text-xs text-emerald-900">
                <span className="font-bold flex items-center gap-1 text-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Safety Permits Active:
                </span>
                {permits.lotoRequired && (
                  <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-semibold border border-amber-300 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-700" />
                    LOTO Tag: {permits.lotoTag || 'Active Electrical Isolation'}
                  </span>
                )}
                {permits.hotWorkRequired && (
                  <span className="bg-rose-100 text-rose-900 px-2 py-0.5 rounded font-semibold border border-rose-300 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-rose-700" />
                    Hot Work Permit Authorized
                  </span>
                )}
                {permits.confinedSpaceRequired && (
                  <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300">
                    Confined Space Entry
                  </span>
                )}
                {permits.heightPermitRequired && (
                  <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300">
                    Rigging / Working at Heights
                  </span>
                )}
              </div>
            )}

            {/* Key Field Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-semibold">Department</span>
                <span className="font-medium text-slate-800 mt-0.5 block">{card.department}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-semibold">Assigned Tech</span>
                <span className="font-medium text-slate-800 mt-0.5 block">{card.assignedTo}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-semibold">Target Date</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{card.targetDate || 'Not set'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-semibold">Created By</span>
                <span className="text-slate-800 mt-0.5 block truncate">{card.createdByName || 'Staff'}</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation: Details, Labor Hours, Shift Handovers, Chatter */}
          <div className="flex border-b border-slate-200 bg-white px-4 pt-2 rounded-t border-t border-l border-r">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-2 px-4 text-xs font-semibold border-b-2 -mb-px transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'details'
                  ? 'border-[#714B67] text-[#714B67]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Details</span>
            </button>

            <button
              onClick={() => setActiveTab('labor')}
              className={`py-2 px-4 text-xs font-semibold border-b-2 -mb-px transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'labor'
                  ? 'border-[#714B67] text-[#714B67]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Labor Logs ({card.laborLogs?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('handovers')}
              className={`py-2 px-4 text-xs font-semibold border-b-2 -mb-px transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'handovers'
                  ? 'border-[#714B67] text-[#714B67]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Shift Handovers ({card.shiftHandovers?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('chatter')}
              className={`py-2 px-4 text-xs font-semibold border-b-2 -mb-px transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'chatter'
                  ? 'border-[#714B67] text-[#714B67]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Timeline ({card.comments?.length || 0})</span>
            </button>
          </div>

          {/* TAB 1: Work Order Details */}
          {activeTab === 'details' && (
            <div className="bg-white p-5 rounded-b border border-slate-200 shadow-2xs space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Fault Diagnosis & Work Instructions
                </h4>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {card.description}
                </div>
              </div>

              {card.priority === 'Emergency' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Plant Emergency Breakdown Protocol: </span>
                    <span>
                      Requires continuous supervisor reporting, standby artisan dispatch, and immediate post-repair hydro-testing or electrical calibration verification.
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded border border-slate-100 text-xs">
                  <span className="text-slate-400 block text-[11px] font-semibold">Asset Registered</span>
                  <span className="font-medium text-slate-800 mt-1 block">
                    {card.equipmentId ? `Asset Tag: ${card.equipmentId}` : 'Plant Machinery Registry Asset'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100 text-xs">
                  <span className="text-slate-400 block text-[11px] font-semibold">Created Timestamp</span>
                  <span className="font-mono text-slate-800 mt-1 block">
                    {new Date(card.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Labor Hours Logging */}
          {activeTab === 'labor' && (
            <div className="bg-white p-5 rounded-b border border-slate-200 shadow-2xs space-y-5">
              {/* Add Labor Form */}
              <form onSubmit={handleLaborSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <PlusCircle className="w-3.5 h-3.5 text-[#714B67]" />
                    Record Artisan / Crew Labor
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">Real-time timesheet & payroll tracking</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Technician / Artisan
                    </label>
                    <input
                      type="text"
                      required
                      list="staff-tech-list-detail"
                      value={laborTech}
                      onChange={(e) => setLaborTech(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                    <datalist id="staff-tech-list-detail">
                      {COMPANY_ORGANOGRAM.map((member) => (
                        <option key={member.id} value={`${member.name} (${member.title})`} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Trade Category
                    </label>
                    <select
                      value={laborTrade}
                      onChange={(e) => setLaborTrade(e.target.value as TechnicalTrade)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
                    >
                      {TECHNICAL_TRADES_LIST.map((t) => (
                        <option key={t.id} value={t.id}>{t.id}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Rate Type
                    </label>
                    <select
                      value={laborRateType}
                      onChange={(e) => setLaborRateType(e.target.value as any)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
                    >
                      <option value="Standard">Standard (07:00-17:00 M-F)</option>
                      <option value="Shift">Shift Hours (24/7)</option>
                      <option value="Standby Callout">Standby Call-out (Wed-to-Wed)</option>
                      <option value="Overtime">Overtime Hours</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Shift
                    </label>
                    <select
                      value={laborShift}
                      onChange={(e) => setLaborShift(e.target.value as ShiftGroup)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
                    >
                      {SHIFTS_LIST.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Date Worked
                    </label>
                    <input
                      type="date"
                      required
                      value={laborDate}
                      onChange={(e) => setLaborDate(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Hours Worked
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      max="48"
                      required
                      value={laborHours}
                      onChange={(e) => setLaborHours(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Task Notes & Technical Work Carried Out *
                  </label>
                  <input
                    type="text"
                    required
                    value={laborNotes}
                    onChange={(e) => setLaborNotes(e.target.value)}
                    placeholder="e.g. Uncoupled pump motor, pulled damaged mechanical seal, cleaned shaft sleeve..."
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isLoggingLabor}
                    className="px-4 py-1.5 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{isLoggingLabor ? 'Saving...' : 'Log Labor Hours'}</span>
                  </button>
                </div>
              </form>

              {/* Labor Log Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Labor Timesheet Records
                </h4>

                {(!card.laborLogs || card.laborLogs.length === 0) ? (
                  <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded">
                    No labor hours recorded yet on this Job Card.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 text-[11px] font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Technician / Trade</th>
                          <th className="py-2 px-3">Rate & Shift</th>
                          <th className="py-2 px-3">Task Details</th>
                          <th className="py-2 px-3 text-right">Hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {card.laborLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono text-slate-600">{log.date}</td>
                            <td className="py-2 px-3 font-medium text-slate-800">
                              <div>{log.technician}</div>
                              {log.trade && <div className="text-[10px] text-indigo-600">{log.trade}</div>}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] border border-slate-200">
                                {log.rateType || 'Standard'}
                              </span>
                              {log.shift && <span className="ml-1 text-[10px] text-slate-500 font-mono">({log.shift})</span>}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{log.taskNotes}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-[#714B67]">
                              {Number(log.hours).toFixed(2)}h
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                        <tr>
                          <td colSpan={4} className="py-2 px-3 text-slate-700">Cumulative Labor Logged</td>
                          <td className="py-2 px-3 text-right font-mono text-[#714B67]">
                            {card.totalLaborHours.toFixed(2)}h
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Shift Handovers (Continuous 24/7 Plant Support) */}
          {activeTab === 'handovers' && (
            <div className="bg-white p-5 rounded-b border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-[#714B67]" />
                    Shift Handover Log (24/7 Crew Continuity)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Pass breakdown custody between incoming and outgoing Fitters & Riggers without creating duplicate tickets.
                  </p>
                </div>

                {onAddHandover && (
                  <button
                    onClick={() => setShowHandoverForm(!showHandoverForm)}
                    className="px-3 py-1.5 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs font-semibold cursor-pointer transition flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{showHandoverForm ? 'Close Handover Form' : 'Hand Over to Next Shift'}</span>
                  </button>
                )}
              </div>

              {/* Handover Form */}
              {showHandoverForm && onAddHandover && (
                <form onSubmit={handleHandoverSubmit} className="p-4 bg-purple-50/50 border border-purple-200 rounded space-y-3">
                  <div className="text-xs font-bold text-purple-900 border-b border-purple-200 pb-1">
                    Record Formal Shift Handover
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        From Shift
                      </label>
                      <select
                        value={fromShift}
                        onChange={(e) => setFromShift(e.target.value as ShiftGroup)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
                      >
                        {SHIFTS_LIST.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Handing Over (Outgoing)
                      </label>
                      <input
                        type="text"
                        required
                        value={handoverFromPerson}
                        onChange={(e) => setHandoverFromPerson(e.target.value)}
                        placeholder="Outgoing artisan name"
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        To Shift
                      </label>
                      <select
                        value={toShift}
                        onChange={(e) => {
                          const ns = e.target.value as ShiftGroup;
                          setToShift(ns);
                          const crew = getStaffByShift(ns);
                          if (crew.length > 0) {
                            setHandoverToPerson(crew[0].name);
                          }
                        }}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
                      >
                        {SHIFTS_LIST.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Receiving (Incoming)
                      </label>
                      <input
                        type="text"
                        required
                        list="incoming-crew-list"
                        value={handoverToPerson}
                        onChange={(e) => setHandoverToPerson(e.target.value)}
                        placeholder="Incoming artisan"
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                      <datalist id="incoming-crew-list">
                        {COMPANY_ORGANOGRAM.map((member) => (
                          <option key={member.id} value={member.name}>
                            {member.trade} ({member.shift})
                          </option>
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Work Completed on This Shift *
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={tasksCompleted}
                        onChange={(e) => setTasksCompleted(e.target.value)}
                        placeholder="e.g. Pump casing unbolted, old impeller removed, new seal faces cleaned..."
                        className="w-full text-xs p-2 border border-slate-300 rounded bg-white"
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Pending Tasks for Incoming Shift *
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={pendingTasks}
                        onChange={(e) => setPendingTasks(e.target.value)}
                        placeholder="e.g. Torque bolts to 85 Nm, install coupling guard, verify alignment with Stanley..."
                        className="w-full text-xs p-2 border border-slate-300 rounded bg-white"
                      ></textarea>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Safety Isolations & LOTO Status (Critical)
                    </label>
                    <input
                      type="text"
                      value={hazardsOrIsolations}
                      onChange={(e) => setHazardsOrIsolations(e.target.value)}
                      placeholder="e.g. Breaker 14 locked out by Bongani Dlamini. Suction valve closed and tagged."
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isLoggingHandover}
                      className="px-4 py-1.5 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>{isLoggingHandover ? 'Transferring...' : 'Submit Handover'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Handover Timeline History */}
              <div className="space-y-3">
                {(!card.shiftHandovers || card.shiftHandovers.length === 0) ? (
                  <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded">
                    No shift handovers logged yet. If this breakdown crosses into the next 4-shift rotation, use the button above.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {card.shiftHandovers.slice().reverse().map((h) => (
                      <div key={h.id} className="p-4 rounded border border-purple-200 bg-purple-50/30 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-purple-100 pb-1.5">
                          <div className="font-bold text-[#714B67] flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-mono text-[11px]">
                              {h.fromShift} ➔ {h.toShift}
                            </span>
                            <span>Handed over by <strong>{h.handedOverBy}</strong> to <strong>{h.handedOverTo}</strong></span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(h.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                          <div className="bg-white p-2.5 rounded border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-emerald-700 block mb-1">
                              ✓ Completed on {h.fromShift}
                            </span>
                            <p className="text-slate-800">{h.tasksCompleted}</p>
                          </div>

                          <div className="bg-white p-2.5 rounded border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-amber-700 block mb-1">
                              ➔ Handed Over to {h.toShift}
                            </span>
                            <p className="text-slate-800">{h.pendingTasks}</p>
                          </div>
                        </div>

                        {h.hazardsOrIsolations && (
                          <div className="bg-amber-50 border border-amber-200 rounded p-2 text-[11px] text-amber-900 flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span><strong>Isolations & Hazards:</strong> {h.hazardsOrIsolations}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Activity & Odoo Chatter */}
          {activeTab === 'chatter' && (
            <div className="bg-white p-5 rounded-b border border-slate-200 shadow-2xs space-y-4">
              {/* Odoo Chatter Input */}
              <form onSubmit={handleCommentSubmit} className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Add Progress Note / Supervisor Remark
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Log progress, stores spares arrival, torque verification..."
                    className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded focus:border-[#714B67] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !commentText.trim()}
                    className="px-4 py-2 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>

              {/* Timestamped Activity Feed */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Audit Trail & Timeline
                </h4>

                {(!card.comments || card.comments.length === 0) ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No activity notes yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {card.comments.slice().reverse().map((c) => {
                      const isSystem = c.type === 'system' || c.type === 'status_change' || c.type === 'handover';
                      return (
                        <div
                          key={c.id}
                          className={`p-3 rounded text-xs border ${
                            c.type === 'handover'
                              ? 'bg-purple-50/50 border-purple-200 text-slate-800'
                              : isSystem
                              ? 'bg-slate-50 border-slate-200 text-slate-700'
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {c.type === 'handover' ? (
                                <ArrowRightLeft className="w-3.5 h-3.5 text-[#714B67]" />
                              ) : isSystem ? (
                                <History className="w-3 h-3 text-[#714B67]" />
                              ) : (
                                <MessageSquare className="w-3 h-3 text-slate-500" />
                              )}
                              <span>{c.author}</span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(c.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-slate-700 text-xs pl-5">
                            {c.message}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="font-mono text-[11px]">
            Doc ID: {card.id}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete Job Card ${card.jobCardNumber}?`)) {
                  onDelete(card.id);
                  onClose();
                }
              }}
              className="px-3 py-1.5 rounded text-rose-700 hover:bg-rose-100 transition text-xs font-medium cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Job Card</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
