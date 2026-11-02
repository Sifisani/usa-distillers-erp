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
  ShieldAlert
} from 'lucide-react';
import { JobCard, JobCardStatus, Priority, LaborLog, ActivityComment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { COMPANY_ORGANOGRAM } from '../../core/master-data/organization';

interface JobCardDetailModalProps {
  card: JobCard | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (card: JobCard) => void;
  onDelete: (id: string) => Promise<void>;
  onUpdateStatus: (card: JobCard, status: JobCardStatus) => Promise<void>;
  onAddLabor: (card: JobCard, tech: string, date: string, hours: number, notes: string) => Promise<void>;
  onAddComment: (card: JobCard, author: string, message: string) => Promise<void>;
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
  onPrint
}) => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'details' | 'labor' | 'chatter'>('details');

  // Labor log form state
  const [laborTech, setLaborTech] = useState(userProfile?.displayName || 'Sam Ngubeni (Maintenance Supervisor)');
  const [laborDate, setLaborDate] = useState(new Date().toISOString().split('T')[0]);
  const [laborHours, setLaborHours] = useState('2.0');
  const [laborNotes, setLaborNotes] = useState('');
  const [isLoggingLabor, setIsLoggingLabor] = useState(false);

  // Sync default technician when user switches active logged-in profile
  useEffect(() => {
    if (userProfile?.displayName) {
      setLaborTech(userProfile.title ? `${userProfile.displayName} (${userProfile.title})` : userProfile.displayName);
    }
  }, [userProfile]);

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  if (!isOpen || !card) return null;

  const currentAuthorName = userProfile?.displayName || userProfile?.email || 'Authorized Staff';

  const handleLaborSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hoursNum = parseFloat(laborHours);
    if (isNaN(hoursNum) || hoursNum <= 0) return;
    if (!laborNotes.trim()) return;

    setIsLoggingLabor(true);
    try {
      await onAddLabor(card, laborTech, laborDate, hoursNum, laborNotes.trim());
      setLaborNotes('');
      setLaborHours('1.0');
    } finally {
      setIsLoggingLabor(false);
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
            {STAGES.map((stage, idx) => {
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
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-[#f8f9fa]">
          {/* Card Top Title Block */}
          <div className="bg-white p-5 rounded border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center space-x-2">
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
                </div>
                <h2 className="text-base font-bold text-slate-800 mt-1">
                  {card.equipmentName}
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

          {/* Tab Navigation: Details, Labor Hours, Activity Chatter */}
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
              <span>Work Order Details</span>
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
              <span>Labor Hours Log ({card.laborLogs?.length || 0})</span>
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
              <span>Activity & Chatter ({card.comments?.length || 0})</span>
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
                    <span className="font-bold">Plant Emergency Protocol Active: </span>
                    <span>
                      Requires continuous supervisor reporting and immediate post-repair hydro-testing or electrical calibration verification.
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded border border-slate-100 text-xs">
                  <span className="text-slate-400 block text-[11px] font-semibold">Asset Registered</span>
                  <span className="font-medium text-slate-800 mt-1 block">
                    {card.equipmentId ? `Linked Asset ID: ${card.equipmentId}` : 'Ad-hoc Plant Machinery Entry'}
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
                    Record Technician Labor
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">Updates total hours in real time</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Technician Name
                    </label>
                    <input
                      type="text"
                      required
                      list="staff-tech-list"
                      value={laborTech}
                      onChange={(e) => setLaborTech(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                    <datalist id="staff-tech-list">
                      {COMPANY_ORGANOGRAM.map((member) => (
                        <option key={member.id} value={`${member.name} (${member.title})`} />
                      ))}
                    </datalist>
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
                      Hours (e.g. 2.5)
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
                    Task Notes & Work Carried Out *
                  </label>
                  <input
                    type="text"
                    required
                    value={laborNotes}
                    onChange={(e) => setLaborNotes(e.target.value)}
                    placeholder="e.g. Dismantled pump coupling, drained oil, aligned with laser gauge..."
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
                          <th className="py-2 px-3">Technician</th>
                          <th className="py-2 px-3">Task Details</th>
                          <th className="py-2 px-3 text-right">Hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {card.laborLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono text-slate-600">{log.date}</td>
                            <td className="py-2 px-3 font-medium text-slate-800">{log.technician}</td>
                            <td className="py-2 px-3 text-slate-600">{log.taskNotes}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-[#714B67]">
                              {Number(log.hours).toFixed(2)}h
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                        <tr>
                          <td colSpan={3} className="py-2 px-3 text-slate-700">Cumulative Labor Logged</td>
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

          {/* TAB 3: Activity & Odoo Chatter */}
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
                    placeholder="Log a progress update, spare parts note, or observation..."
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
                      const isSystem = c.type === 'system' || c.type === 'status_change';
                      return (
                        <div
                          key={c.id}
                          className={`p-3 rounded text-xs border ${
                            isSystem
                              ? 'bg-purple-50/40 border-purple-100 text-slate-700'
                              : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {isSystem ? (
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
                          <div className="text-slate-700 text-xs pl-4">
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
