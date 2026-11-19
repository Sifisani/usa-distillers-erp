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
  PhoneCall,
  Lock,
  GitBranch,
  PauseCircle,
  Paperclip,
  Camera,
  Eye,
  Download
} from 'lucide-react';
import {
  JobCard,
  JobCardStatus,
  JobCardWorkflowStage,
  JobCardAttachment,
  JobCardAttachmentCategory,
  Priority,
  LaborLog,
  ActivityComment,
  ShiftHandoverLog,
  SafetyPermits,
  TechnicalTrade,
  ShiftGroup
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useOrgMasterData } from '../../context/OrgMasterDataContext';
import { compressInspectionPhotoFile } from '../../core/electrical/photoUtils';
import {
  MAX_JOB_CARD_ATTACHMENT_BYTES,
  MAX_JOB_CARD_ATTACHMENTS
} from '../../services/jobCardService';
import {
  COMPANY_ORGANOGRAM,
  getStaffByTrade,
  getStaffByShift
} from '../../core/master-data/organization';
import {
  canAssignOrAcceptJobCard,
  canDeleteJobCard,
  canEditJobCard,
  canHODSignOffJobCard,
  canIssueSpares,
  canLogLaborOrHandover,
  canRecordArtisanHandback,
  canRequestSpares,
  canSpawnLinkedJobCard,
  canTransitionJobCardStatus,
  canTransitionWorkflowStage,
  getJobCardPermissionReason,
  isJobCardAdmin,
  isJobCardTerminal
} from '../../core/jobcards/permissions';
import {
  ACTIVE_PIPELINE_STAGES,
  getLinkedJobCardFamily,
  getWorkflowStageMeta,
  resolveWorkflowStage
} from '../../core/jobcards/workflow';

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
  onAcceptRequisition?: (card: JobCard, params: { supervisorName: string; artisanName: string; trade?: TechnicalTrade; shift?: ShiftGroup; targetDate?: string; notes?: string }) => Promise<void>;
  onAddSparePart?: (card: JobCard, part: { partDescription: string; quantity: number; partNumber?: string; storeVoucherNumber?: string; requestedBy: string; markAsPendingSpares?: boolean; unitCostEmalangeni?: number }) => Promise<void>;
  onIssueSparePart?: (card: JobCard, partId: string, params: { issuedBy: string; storeVoucherNumber: string }) => Promise<void>;
  onRecordHandback?: (card: JobCard, params: { supervisorName: string; artisanName: string; completionDate: string; completionTime: string; hours: number; handbackNotes: string; trade?: TechnicalTrade }) => Promise<void>;
  onHODCloseOut?: (card: JobCard, params: { hodName: string; notes?: string }) => Promise<void>;
  allJobCards?: JobCard[];
  onSelectCard?: (card: JobCard) => void;
  onTransitionWorkflowStage?: (card: JobCard, targetStage: JobCardWorkflowStage, reason?: string) => Promise<void>;
  onSpawnLinkedJob?: (
    parentCard: JobCard,
    params: {
      department: string;
      departmentCategory: string;
      tradeRequired: TechnicalTrade;
      assignedTo: string;
      description: string;
      priority: Priority;
      shiftAssigned?: ShiftGroup;
      targetDate?: string;
      assignImmediately?: boolean;
    }
  ) => Promise<{ childId: string; childJobCardNumber: string }>;
  onAddAttachment?: (card: JobCard, attachment: JobCardAttachment) => Promise<void>;
  onRemoveAttachment?: (card: JobCard, attachmentId: string) => Promise<void>;
}

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
  onPrint,
  onAcceptRequisition,
  onAddSparePart,
  onIssueSparePart,
  onRecordHandback,
  onHODCloseOut,
  allJobCards = [],
  onSelectCard,
  onTransitionWorkflowStage,
  onSpawnLinkedJob,
  onAddAttachment,
  onRemoveAttachment
}) => {
  const { userProfile } = useAuth();
  const { departmentsByCategory, activeTrades, activeShifts } = useOrgMasterData();
  const [activeTab, setActiveTab] = useState<'details' | 'spares' | 'handback' | 'labor' | 'handovers' | 'chatter'>('details');

  // Accept & Assign state
  const [showAcceptForm, setShowAcceptForm] = useState(false);
  const [acceptingSupervisor, setAcceptingSupervisor] = useState(userProfile?.displayName || 'Sam Ngubeni (Maintenance Supervisor)');
  const [selectedArtisan, setSelectedArtisan] = useState('Phumelele Maseko (Mechanical Fitter)');
  const [assignTrade, setAssignTrade] = useState<TechnicalTrade>('Mechanical Fitter');
  const [assignShift, setAssignShift] = useState<ShiftGroup>('Shift A');
  const [assignTargetDate, setAssignTargetDate] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);

  // Spares Requisition state
  const [partDescription, setPartDescription] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [partNumber, setPartNumber] = useState('');
  const [storeVoucherNumber, setStoreVoucherNumber] = useState('');
  const [markPendingSpares, setMarkPendingSpares] = useState(false);
  const [isAddingSpare, setIsAddingSpare] = useState(false);
  const [issuingPartId, setIssuingPartId] = useState<string | null>(null);
  const [issueVoucher, setIssueVoucher] = useState('');

  // Handback state
  const [handbackArtisan, setHandbackArtisan] = useState('');
  const [handbackDate, setHandbackDate] = useState(new Date().toISOString().split('T')[0]);
  const [handbackTime, setHandbackTime] = useState('15:30');
  const [handbackHours, setHandbackHours] = useState('2.5');
  const [handbackNotes, setHandbackNotes] = useState('');
  const [isLoggingHandbackReceipt, setIsLoggingHandbackReceipt] = useState(false);

  // HOD Close-Out state
  const [hodName, setHodName] = useState(userProfile?.displayName || 'Antonio Miranda (Engineering Manager)');
  const [hodNotes, setHodNotes] = useState('Work inspected and verified operational. Requisition signed off.');
  const [isClosingHOD, setIsClosingHOD] = useState(false);

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

  // Comment & error state
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // 8-Stage workflow transition prompt state
  const [pendingStagePrompt, setPendingStagePrompt] = useState<JobCardWorkflowStage | null>(null);
  const [stageReasonText, setStageReasonText] = useState('');
  const [isTransitioningStage, setIsTransitioningStage] = useState(false);

  // Linked multi-department job spawning state
  const [showSpawnLinkedForm, setShowSpawnLinkedForm] = useState(false);
  const [spawnDeptCategory, setSpawnDeptCategory] = useState('Engineering');
  const [spawnDepartment, setSpawnDepartment] = useState('Engineering - Electrical & Instrumentation');
  const [spawnTrade, setSpawnTrade] = useState<TechnicalTrade>('Electrician');
  const [spawnAssignedTo, setSpawnAssignedTo] = useState('Msebenzi Gamedze — Plant Electrician (Standby)');
  const [spawnPriority, setSpawnPriority] = useState<Priority>('High');
  const [spawnShift, setSpawnShift] = useState<ShiftGroup>('Shift A');
  const [spawnDescription, setSpawnDescription] = useState('');
  const [isSpawningLinked, setIsSpawningLinked] = useState(false);
  const [spawnSuccessMsg, setSpawnSuccessMsg] = useState<string | null>(null);

  // Attachment & confirm state
  const [attachmentCategory, setAttachmentCategory] = useState<JobCardAttachmentCategory>('FAULT_PHOTO');
  const [attachmentCaption, setAttachmentCaption] = useState('');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<JobCardAttachment | null>(null);
  const [confirmDeleteCard, setConfirmDeleteCard] = useState(false);

  // Sync default technician when user switches active logged-in profile or card changes
  useEffect(() => {
    setDetailError(null);
    setPendingStagePrompt(null);
    setStageReasonText('');
    setShowSpawnLinkedForm(false);
    setSpawnSuccessMsg(null);
    setPreviewAttachment(null);
    setConfirmDeleteCard(false);
    setAttachmentCaption('');
    if (userProfile?.displayName) {
      setLaborTech(userProfile.title ? `${userProfile.displayName} (${userProfile.title})` : userProfile.displayName);
      setHandoverFromPerson(userProfile.displayName);
    }
    if (card) {
      setSpawnPriority(card.priority);
      if (card.tradeRequired) setLaborTrade(card.tradeRequired);
      if (card.shiftAssigned) {
        setLaborShift(card.shiftAssigned);
        setFromShift(card.shiftAssigned);
        setSpawnShift(card.shiftAssigned);
        // Suggest next continuous shift
        if (card.shiftAssigned === 'Shift A') setToShift('Shift B');
        else if (card.shiftAssigned === 'Shift B') setToShift('Shift C');
        else if (card.shiftAssigned === 'Shift C') setToShift('Shift D');
        else if (card.shiftAssigned === 'Shift D') setToShift('Shift A');
      }
    }
  }, [userProfile, card]);

  if (!isOpen || !card) return null;

  const actor = {
    uid: userProfile?.uid,
    role: userProfile?.role,
    email: userProfile?.email
  };
  const currentWorkflowStage = resolveWorkflowStage(card);
  const currentWorkflowMeta = getWorkflowStageMeta(currentWorkflowStage);
  const linkedFamily = getLinkedJobCardFamily(card, allJobCards);

  const isTerminal = isJobCardTerminal(card);
  const isAdminActor = isJobCardAdmin(actor.role, actor.email);
  const isReadOnlyLocked = isTerminal && !isAdminActor;
  const canEdit = canEditJobCard(actor, card);
  const canAssign = canAssignOrAcceptJobCard(actor.role, actor.email) && !isReadOnlyLocked;
  const canSpawnLinked = canSpawnLinkedJobCard(actor.role, actor.email) && !isReadOnlyLocked && Boolean(onSpawnLinkedJob);
  const canReqSpares = canRequestSpares(actor.role, actor.email) && !isReadOnlyLocked;
  const canIssSpares = canIssueSpares(actor.role, actor.email) && !isReadOnlyLocked;
  const canHandback = canRecordArtisanHandback(actor.role, actor.email) && !isReadOnlyLocked;
  const canHODSign = canHODSignOffJobCard(actor.role, actor.email) && !isReadOnlyLocked;
  const canLogLabor = canLogLaborOrHandover(actor.role, actor.email) && !isReadOnlyLocked;
  const canDelete = canDeleteJobCard(actor.role, actor.email);

  const currentAuthorName = userProfile?.displayName || userProfile?.email || 'Authorized Staff';

  const handleStatusChangeSafe = async (targetStatus: JobCardStatus) => {
    if (!canTransitionJobCardStatus(actor, card, targetStatus)) {
      setDetailError(getJobCardPermissionReason('complete', actor.role));
      return;
    }
    setDetailError(null);
    try {
      await onUpdateStatus(card, targetStatus);
    } catch (err: any) {
      setDetailError(err?.message || 'Failed to update Job Card status.');
    }
  };

  const executeWorkflowStageTransition = async (targetStage: JobCardWorkflowStage, reason?: string) => {
    if (!onTransitionWorkflowStage) return;
    if (!canTransitionWorkflowStage(actor, card, targetStage)) {
      setDetailError(
        targetStage === 'CLOSED'
          ? getJobCardPermissionReason('hod_signoff', actor.role)
          : getJobCardPermissionReason('complete', actor.role)
      );
      return;
    }
    setDetailError(null);
    setIsTransitioningStage(true);
    try {
      await onTransitionWorkflowStage(card, targetStage, reason?.trim() || undefined);
      setPendingStagePrompt(null);
      setStageReasonText('');
    } catch (err: any) {
      setDetailError(err?.message || 'Failed to transition workflow stage.');
    } finally {
      setIsTransitioningStage(false);
    }
  };

  const handlePipelineStageClick = (targetStage: JobCardWorkflowStage) => {
    if (
      targetStage === 'WAITING_FOR_SHUTDOWN' ||
      targetStage === 'WAITING_FOR_PARTS' ||
      targetStage === 'CANCELLED'
    ) {
      setPendingStagePrompt(targetStage);
      setStageReasonText('');
      return;
    }
    executeWorkflowStageTransition(targetStage);
  };

  const handleSpawnLinkedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSpawnLinkedJob || !spawnDescription.trim()) return;
    if (!canSpawnLinked) {
      setDetailError(getJobCardPermissionReason('assign', actor.role));
      return;
    }
    setDetailError(null);
    setIsSpawningLinked(true);
    try {
      const result = await onSpawnLinkedJob(card, {
        department: spawnDepartment,
        departmentCategory: spawnDeptCategory,
        tradeRequired: spawnTrade,
        assignedTo: spawnAssignedTo,
        description: spawnDescription.trim(),
        priority: spawnPriority,
        shiftAssigned: spawnShift,
        targetDate: card.targetDate,
        assignImmediately: true
      });
      setSpawnSuccessMsg(`Created companion job card ${result.childJobCardNumber} linked to ${card.jobCardNumber}.`);
      setSpawnDescription('');
      setShowSpawnLinkedForm(false);
    } catch (err: any) {
      setDetailError(err?.message || 'Failed to spawn companion department job.');
    } finally {
      setIsSpawningLinked(false);
    }
  };

  const handleLaborSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canLogLabor) {
      setDetailError(getJobCardPermissionReason('labor', actor.role));
      return;
    }
    const hoursNum = parseFloat(laborHours);
    if (isNaN(hoursNum) || hoursNum <= 0) return;
    if (!laborNotes.trim()) return;

    setDetailError(null);
    setIsLoggingLabor(true);
    try {
      await onAddLabor(card, laborTech, laborDate, hoursNum, laborNotes.trim(), {
        trade: laborTrade,
        rateType: laborRateType,
        shift: laborShift
      });
      setLaborNotes('');
      setLaborHours('1.0');
    } catch (err: any) {
      setDetailError(err?.message || 'Failed to record labor hours.');
    } finally {
      setIsLoggingLabor(false);
    }
  };

  const handleHandoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddHandover) return;
    if (!canLogLabor) {
      setDetailError(getJobCardPermissionReason('labor', actor.role));
      return;
    }
    if (!tasksCompleted.trim() || !pendingTasks.trim() || !handoverToPerson.trim()) return;

    setDetailError(null);
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
    } catch (err: any) {
      setDetailError(err?.message || 'Failed to submit shift handover.');
    } finally {
      setIsLoggingHandover(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isReadOnlyLocked) return;

    setDetailError(null);
    setIsSubmittingComment(true);
    try {
      await onAddComment(card, currentAuthorName, commentText.trim());
      setCommentText('');
    } catch (err: any) {
      setDetailError(err?.message || 'Failed to add comment.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAcceptRequisition) return;
    if (!canAssign) {
      setDetailError(getJobCardPermissionReason('assign', actor.role));
      return;
    }
    setDetailError(null);
    setIsAccepting(true);
    try {
      await onAcceptRequisition(card, {
        supervisorName: acceptingSupervisor,
        artisanName: selectedArtisan,
        trade: assignTrade,
        shift: assignShift,
        targetDate: assignTargetDate,
        notes: assignNotes
      });
      setShowAcceptForm(false);
    } catch (err: any) {
      setDetailError(err?.message || 'Failed to accept & assign requisition.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleAddSpareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddSparePart || !partDescription.trim()) return;
    if (!canReqSpares) {
      setDetailError(getJobCardPermissionReason('request_spares', actor.role));
      return;
    }
    setDetailError(null);
    setIsAddingSpare(true);
    try {
      await onAddSparePart(card, {
        partDescription: partDescription.trim(),
        quantity: Number(partQty) || 1,
        partNumber: partNumber.trim(),
        storeVoucherNumber: storeVoucherNumber.trim(),
        requestedBy: userProfile?.displayName || 'Maintenance Supervisor',
        markAsPendingSpares: markPendingSpares
      });
      setPartDescription('');
      setPartNumber('');
      setStoreVoucherNumber('');
      setMarkPendingSpares(false);
    } catch (err: any) {
      setDetailError(err?.message || 'Failed to submit spares requisition.');
    } finally {
      setIsAddingSpare(false);
    }
  };

  const handleIssueSpareSubmit = async (partId: string) => {
    if (!onIssueSparePart) return;
    if (!canIssSpares) {
      setDetailError(getJobCardPermissionReason('issue_spares', actor.role));
      return;
    }
    setDetailError(null);
    try {
      await onIssueSparePart(card, partId, {
        issuedBy: userProfile?.displayName || 'Elliot Mhlongo (Stores Manager)',
        storeVoucherNumber: issueVoucher || 'SV-DIRECT'
      });
      setIssuingPartId(null);
      setIssueVoucher('');
    } catch (err: any) {
      setDetailError(err?.message || 'Failed to issue spares from warehouse.');
    }
  };

  const handleHandbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRecordHandback) return;
    if (!canHandback) {
      setDetailError(getJobCardPermissionReason('handback', actor.role));
      return;
    }
    setDetailError(null);
    setIsLoggingHandbackReceipt(true);
    try {
      await onRecordHandback(card, {
        supervisorName: userProfile?.displayName || 'Maintenance Supervisor',
        artisanName: handbackArtisan || card.assignedTo || 'Artisan',
        completionDate: handbackDate,
        completionTime: handbackTime,
        hours: Number(handbackHours) || 1,
        handbackNotes: handbackNotes.trim()
      });
    } catch (err: any) {
      setDetailError(err?.message || 'Failed to record slip handback.');
    } finally {
      setIsLoggingHandbackReceipt(false);
    }
  };

  const handleHODSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onHODCloseOut) return;
    if (!canHODSign) {
      setDetailError(getJobCardPermissionReason('hod_signoff', actor.role));
      return;
    }
    setDetailError(null);
    setIsClosingHOD(true);
    try {
      await onHODCloseOut(card, {
        hodName: hodName || 'Antonio Miranda (Engineering Manager)',
        notes: hodNotes
      });
    } catch (err: any) {
      setDetailError(err?.message || 'Failed to apply HOD sign-off.');
    } finally {
      setIsClosingHOD(false);
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
        {/* USA Distillers Control Panel Header with Pipeline Stage Tracker */}
        <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Action Buttons Left */}
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <button
                onClick={() => onEdit(card)}
                className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}

            <button
              onClick={() => onPrint(card)}
              className="px-3 py-1.5 rounded border border-emerald-800/40 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-700" />
              <span>Print Works Requisition</span>
            </button>

            {/* SUPERVISOR WORKFLOW ACTION: Accept & Assign */}
            {canAssign && (!card.acceptedBy || card.requisitionStage === 'Pending Acceptance' || card.status === 'Draft') && (
              <button
                onClick={() => setShowAcceptForm(!showAcceptForm)}
                className="px-3.5 py-1.5 rounded bg-[#1b4332] hover:bg-[#143326] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition animate-pulse"
              >
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Accept Requisition & Assign Artisan</span>
              </button>
            )}

            {/* SUPERVISOR WORKFLOW ACTION: Request Spares */}
            <button
              onClick={() => setActiveTab('spares')}
              className="px-3 py-1.5 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Package className="w-3.5 h-3.5 text-amber-700" />
              <span>Spares ({card.sparesRequested?.length || 0})</span>
            </button>

            {/* SUPERVISOR WORKFLOW ACTION: Record Artisan Slip Handback */}
            {canHandback && card.status === 'In Progress' && (
              <button
                onClick={() => setActiveTab('handback')}
                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Record Slip Handback</span>
              </button>
            )}

            {/* MANAGER / HOD WORKFLOW ACTION: HOD Close-Out */}
            {canHODSign && (card.requisitionStage === 'Artisan Completed' || (card.status === 'In Progress' && card.totalLaborHours > 0)) && !card.hodSignedBy && (
              <button
                onClick={() => setActiveTab('handback')}
                className="px-3.5 py-1.5 rounded bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-200" />
                <span>HOD Digital Sign-Off</span>
              </button>
            )}

            {/* Stage Quick Actions (Role-Gated) */}
            {card.status === 'Draft' && canTransitionJobCardStatus(actor, card, 'In Progress') && (
              <button
                onClick={() => handleStatusChangeSafe('In Progress')}
                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer transition"
              >
                Start Work
              </button>
            )}

            {card.status === 'In Progress' && (
              <>
                {canTransitionJobCardStatus(actor, card, 'Pending Spares') && (
                  <button
                    onClick={() => handleStatusChangeSafe('Pending Spares')}
                    className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium cursor-pointer transition"
                  >
                    Hold for Spares
                  </button>
                )}
                {canTransitionJobCardStatus(actor, card, 'Completed') && (
                  <button
                    onClick={() => handleStatusChangeSafe('Completed')}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium cursor-pointer transition flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark Completed</span>
                  </button>
                )}
              </>
            )}

            {card.status === 'Pending Spares' && canTransitionJobCardStatus(actor, card, 'In Progress') && (
              <button
                onClick={() => handleStatusChangeSafe('In Progress')}
                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer transition"
              >
                Spares Received (Resume)
              </button>
            )}

            {card.status !== 'Cancelled' && card.status !== 'Completed' && canTransitionJobCardStatus(actor, card, 'Cancelled') && (
              <button
                onClick={() => handleStatusChangeSafe('Cancelled')}
                className="px-2.5 py-1.5 rounded hover:bg-rose-50 text-rose-700 border border-transparent hover:border-rose-200 text-xs cursor-pointer transition"
              >
                Cancel JC
              </button>
            )}
          </div>

          {/* Odoo Chevron Status Stage Bar (Legacy Quick Switch + Close) */}
          <div className="flex items-center space-x-1 text-xs">
            <span className={`px-2.5 py-1 rounded text-xs font-bold border ${currentWorkflowMeta.badgeClass}`}>
              {currentWorkflowMeta.label}
            </span>

            <button
              onClick={onClose}
              className="ml-2 p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 8-Stage Phase 1 Works Requisition Pipeline Bar */}
        {onTransitionWorkflowStage && (
          <div className="bg-white px-5 py-2.5 border-b border-slate-200 shrink-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {ACTIVE_PIPELINE_STAGES.map((stageItem) => {
                const isCurrent = currentWorkflowStage === stageItem.id;
                const canClick = !isCurrent && canTransitionWorkflowStage(actor, card, stageItem.id);
                return (
                  <button
                    key={stageItem.id}
                    type="button"
                    disabled={(!canClick && !isCurrent) || isTransitioningStage}
                    title={
                      isCurrent
                        ? stageItem.description
                        : canClick
                        ? `Transition to ${stageItem.label}: ${stageItem.description}`
                        : `Locked for role ${actor.role || 'Staff'}`
                    }
                    onClick={() => {
                      if (canClick) handlePipelineStageClick(stageItem.id);
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition flex items-center gap-1 ${
                      isCurrent
                        ? 'bg-[#714B67] text-white shadow-2xs ring-1 ring-[#714B67]'
                        : canClick
                        ? 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-purple-50 hover:border-purple-300 hover:text-[#714B67] cursor-pointer'
                        : 'bg-slate-50 border border-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span>{stageItem.label}</span>
                  </button>
                );
              })}

              {currentWorkflowStage === 'CANCELLED' ? (
                <span className="px-2.5 py-1 rounded bg-rose-600 text-white text-[11px] font-bold">
                  8. Cancelled
                </span>
              ) : (
                canTransitionWorkflowStage(actor, card, 'CANCELLED') && (
                  <button
                    type="button"
                    disabled={isTransitioningStage}
                    onClick={() => handlePipelineStageClick('CANCELLED')}
                    className="ml-auto px-2.5 py-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] font-semibold cursor-pointer"
                  >
                    Cancel Job
                  </button>
                )
              )}
            </div>

            {/* Hold / Deferral / Cancellation Reason Prompt */}
            {pendingStagePrompt && (
              <div className="p-2.5 rounded bg-amber-50 border border-amber-300 flex flex-wrap items-center gap-2 text-xs">
                <PauseCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-bold text-amber-950">
                  {getWorkflowStageMeta(pendingStagePrompt).label}:
                </span>
                <input
                  type="text"
                  value={stageReasonText}
                  onChange={(e) => setStageReasonText(e.target.value)}
                  placeholder={
                    pendingStagePrompt === 'WAITING_FOR_SHUTDOWN'
                      ? 'Specify planned shutdown window / isolation needed...'
                      : pendingStagePrompt === 'WAITING_FOR_PARTS'
                      ? 'Specify pending part or purchase requisition ref...'
                      : 'Specify reason for cancelling this Work Order...'
                  }
                  className="flex-1 min-w-[220px] px-2.5 py-1 border border-amber-300 rounded bg-white text-xs"
                />
                <button
                  type="button"
                  disabled={isTransitioningStage}
                  onClick={() => executeWorkflowStageTransition(pendingStagePrompt, stageReasonText)}
                  className="px-3 py-1 rounded bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {isTransitioningStage ? 'Updating...' : 'Confirm Stage'}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingStagePrompt(null)}
                  className="px-2 py-1 rounded text-slate-600 hover:bg-amber-100 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {card.holdReason && (currentWorkflowStage === 'WAITING_FOR_PARTS' || currentWorkflowStage === 'WAITING_FOR_SHUTDOWN') && (
              <div className="text-[11px] text-amber-900 bg-amber-50/70 border border-amber-200 rounded px-2.5 py-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span><strong>Hold / Deferral Reason:</strong> {card.holdReason}</span>
              </div>
            )}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-[#f8f9fa]">
          {detailError && (
            <div className="p-3 rounded bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{detailError}</span>
              </div>
              <button
                onClick={() => setDetailError(null)}
                className="text-rose-600 hover:text-rose-900 font-bold text-xs cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {isReadOnlyLocked && (
            <div className="p-2.5 rounded bg-slate-100 border border-slate-300 text-slate-700 text-xs flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>
                <strong>Terminal Lock:</strong> This Work Order is <strong>{card.status}</strong> and locked for audit integrity. Only an Admin may reopen or modify closed records.
              </span>
            </div>
          )}

          {showAcceptForm && canAssign && (
            <form onSubmit={handleAcceptSubmit} className="bg-emerald-50 border border-emerald-300 rounded-lg p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-700" />
                  Accept Works Requisition &amp; Dispatch Artisan
                </span>
                <button
                  type="button"
                  onClick={() => setShowAcceptForm(false)}
                  className="text-emerald-800 hover:text-emerald-950 font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Accepting Supervisor</label>
                  <input
                    type="text"
                    required
                    value={acceptingSupervisor}
                    onChange={(e) => setAcceptingSupervisor(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Assigned Artisan</label>
                  <input
                    type="text"
                    required
                    list="accept-artisan-list"
                    value={selectedArtisan}
                    onChange={(e) => setSelectedArtisan(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded bg-white text-xs"
                  />
                  <datalist id="accept-artisan-list">
                    {getStaffByTrade(assignTrade).map((s) => (
                      <option key={s.id} value={`${s.name} (${s.title})`} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Trade &amp; Shift</label>
                  <div className="flex gap-1.5">
                    <select
                      value={assignTrade}
                      onChange={(e) => setAssignTrade(e.target.value as TechnicalTrade)}
                      className="w-1/2 px-2 py-1.5 border border-emerald-300 rounded bg-white text-xs"
                    >
                      {activeTrades.map((t) => (
                        <option key={t.id} value={t.id}>{t.id}</option>
                      ))}
                    </select>
                    <select
                      value={assignShift}
                      onChange={(e) => setAssignShift(e.target.value as ShiftGroup)}
                      className="w-1/2 px-2 py-1.5 border border-emerald-300 rounded bg-white text-xs"
                    >
                      {activeShifts.map((s) => (
                        <option key={s.id} value={s.id}>{s.id}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  type="text"
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Optional supervisor instructions..."
                  className="flex-1 min-w-[200px] px-2.5 py-1.5 border border-emerald-300 rounded bg-white text-xs"
                />
                <button
                  type="submit"
                  disabled={isAccepting}
                  className="px-4 py-1.5 bg-[#1b4332] hover:bg-[#143326] text-white rounded font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {isAccepting ? 'Assigning...' : 'Confirm Assignment & Start'}
                </button>
              </div>
            </form>
          )}
          {/* Card Top Title Block */}
          <div className="bg-white p-5 rounded border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl font-mono font-bold text-slate-900 tracking-tight">
                    {card.jobCardNumber}
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-red-50 border border-red-300 text-red-600 font-mono font-black text-xs shadow-2xs">
                    WORKS REQUISITION #{card.workOrderNumber || card.jobCardNumber.replace(/[^0-9]/g, '') || '188499'}
                  </span>
                  {card.requisitionType && (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs">
                      {card.requisitionType}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-xs border ${getPriorityBadge(card.priority)}`}>
                    {card.priority === 'Emergency' && <AlertTriangle className="w-3 h-3 inline mr-1 text-rose-600" />}
                    {card.priority} Priority
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
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

            {/* Electrical Specs & Inspection Reference Badge */}
            {(specs || card.inspectionReference || card.electricalFeeder) && (
              <div className="bg-purple-50/70 border border-purple-200 rounded p-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-purple-900">
                <span className="font-bold flex items-center gap-1 text-[#714B67]">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Electrical Data:
                </span>
                {card.inspectionReference && (
                  <span className="bg-purple-200/80 text-purple-950 px-1.5 py-0.5 rounded font-mono font-bold">
                    Inspection: {card.inspectionReference}
                  </span>
                )}
                {card.electricalFeeder && (
                  <span className="font-mono text-slate-700">
                    <strong>Feeder:</strong> {card.electricalFeeder}
                  </span>
                )}
                {card.equipmentCode && (
                  <span className="font-mono text-slate-700">
                    <strong>Tag:</strong> {card.equipmentCode}
                  </span>
                )}
                {specs?.powerKw && <span><strong>Motor:</strong> {specs.powerKw} kW</span>}
                {specs?.starterType && (
                  <span className="bg-purple-200/80 text-purple-900 px-1.5 py-0.5 rounded font-mono font-semibold">
                    Starter: {specs.starterType}
                  </span>
                )}
                {specs?.ratedCurrentAmps && <span><strong>Rated:</strong> {specs.ratedCurrentAmps} A</span>}
                {specs?.overloadAmps && (
                  <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-semibold">
                    O/L Setting: {specs.overloadAmps} A
                  </span>
                )}
                {specs?.speedRpm && <span><strong>Speed:</strong> {specs.speedRpm} RPM</span>}
                {specs?.plantArea && <span className="text-slate-600">Area: <strong>{specs.plantArea}</strong></span>}
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

          {/* Tab Navigation: Details, Spares, Handback, Labor, Handovers, Chatter */}
          <div className="flex border-b border-slate-200 bg-white px-4 pt-2 rounded-t border-t border-l border-r overflow-x-auto">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-2 px-3 text-xs font-semibold border-b-2 -mb-px transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'details'
                  ? 'border-[#1b4332] text-[#1b4332]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Details & Routing</span>
            </button>

            <button
              onClick={() => setActiveTab('spares')}
              className={`py-2 px-3 text-xs font-semibold border-b-2 -mb-px transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'spares'
                  ? 'border-[#1b4332] text-[#1b4332]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Stores Spares ({card.sparesRequested?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('handback')}
              className={`py-2 px-3 text-xs font-semibold border-b-2 -mb-px transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'handback'
                  ? 'border-[#1b4332] text-[#1b4332]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Slip Handback & HOD {card.completedByArtisan ? '✓' : ''}</span>
            </button>

            <button
              onClick={() => setActiveTab('labor')}
              className={`py-2 px-3 text-xs font-semibold border-b-2 -mb-px transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'labor'
                  ? 'border-[#1b4332] text-[#1b4332]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Labor Logs ({card.laborLogs?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('handovers')}
              className={`py-2 px-3 text-xs font-semibold border-b-2 -mb-px transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'handovers'
                  ? 'border-[#1b4332] text-[#1b4332]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Shift Handovers ({card.shiftHandovers?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('chatter')}
              className={`py-2 px-3 text-xs font-semibold border-b-2 -mb-px transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'chatter'
                  ? 'border-[#1b4332] text-[#1b4332]'
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
              {linkedFamily.openChildCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Open Companion Department Work Orders ({linkedFamily.openChildCount}): </span>
                    <span>
                      Verify companion electrical/mechanical/welding sub-jobs below before signing off final plant closure.
                    </span>
                  </div>
                </div>
              )}

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

              {/* Multi-Department Linked Work Orders (Parent / Companion Child Split) */}
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-[#714B67]" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Linked Multi-Department Work Orders
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Coordinate parallel Mechanical, Electrical, Rigging, or Welding work without duplicating the asset breakdown record.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(linkedFamily.childCards.length > 0 || linkedFamily.parentCard) && (
                      <span className="px-2 py-0.5 rounded bg-purple-50 border border-purple-200 text-[#714B67] font-mono text-[11px] font-bold">
                        Family Labor: {linkedFamily.familyTotalHours.toFixed(1)}h
                      </span>
                    )}
                    {canSpawnLinked && (
                      <button
                        type="button"
                        onClick={() => setShowSpawnLinkedForm(!showSpawnLinkedForm)}
                        className="px-3 py-1 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>{showSpawnLinkedForm ? 'Close Companion Form' : 'Spawn Linked Dept Job'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {spawnSuccessMsg && (
                  <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    ✓ {spawnSuccessMsg}
                  </div>
                )}

                {linkedFamily.parentCard && (
                  <div className="p-2.5 rounded bg-teal-50 border border-teal-200 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-teal-700 block">Parent Breakdown Job Card</span>
                      <span className="font-mono font-bold text-teal-950">{linkedFamily.parentCard.jobCardNumber}</span>
                      <span className="text-teal-800 ml-2">{linkedFamily.parentCard.department}</span>
                    </div>
                    {onSelectCard && (
                      <button
                        type="button"
                        onClick={() => onSelectCard(linkedFamily.parentCard!)}
                        className="px-2.5 py-1 rounded bg-white border border-teal-300 text-teal-800 hover:bg-teal-100 font-semibold text-xs cursor-pointer"
                      >
                        Open Parent
                      </button>
                    )}
                  </div>
                )}

                {showSpawnLinkedForm && canSpawnLinked && (
                  <form onSubmit={handleSpawnLinkedSubmit} className="p-3.5 rounded bg-white border border-purple-200 space-y-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-[#714B67]">Create Companion Department Job Card</span>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { label: 'Electrical Isolation', cat: 'Engineering', dept: 'Engineering - Electrical & Instrumentation', trade: 'Electrician' as TechnicalTrade, staff: 'Msebenzi Gamedze — Plant Electrician' },
                          { label: 'Welding / Boilermaker', cat: 'Engineering', dept: 'Engineering - Mechanical Maintenance', trade: 'Welder' as TechnicalTrade, staff: 'Makhosi Mbhamali — Coded Welder' },
                          { label: 'Rigging Support', cat: 'Engineering', dept: 'Engineering - Mechanical Maintenance', trade: 'Rigger' as TechnicalTrade, staff: 'Mandla Dlamini — Plant Rigger' }
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setSpawnDeptCategory(preset.cat);
                              setSpawnDepartment(preset.dept);
                              setSpawnTrade(preset.trade);
                              setSpawnAssignedTo(preset.staff);
                            }}
                            className="px-2 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-[#714B67] border border-purple-200 text-[10px] font-semibold cursor-pointer"
                          >
                            + {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Target Department</label>
                        <select
                          value={spawnDepartment}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSpawnDepartment(val);
                            setSpawnDeptCategory(val.split(' - ')[0] || 'Engineering');
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                        >
                          {departmentsByCategory.flatMap((group) =>
                            group.departments.map((d) => {
                              const full = `${group.category} - ${d}`;
                              return (
                                <option key={full} value={full}>
                                  {full}
                                </option>
                              );
                            })
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Required Trade</label>
                        <select
                          value={spawnTrade}
                          onChange={(e) => setSpawnTrade(e.target.value as TechnicalTrade)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                        >
                          {activeTrades.map((t) => (
                            <option key={t.id} value={t.id}>{t.id}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Assign Artisan / Lead</label>
                        <input
                          type="text"
                          required
                          list="spawn-artisan-list"
                          value={spawnAssignedTo}
                          onChange={(e) => setSpawnAssignedTo(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                        />
                        <datalist id="spawn-artisan-list">
                          {getStaffByTrade(spawnTrade).map((s) => (
                            <option key={s.id} value={`${s.name} — ${s.title}`} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Priority</label>
                        <select
                          value={spawnPriority}
                          onChange={(e) => setSpawnPriority(e.target.value as Priority)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Emergency">Emergency</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Companion Trade Scope *</label>
                        <input
                          type="text"
                          required
                          value={spawnDescription}
                          onChange={(e) => setSpawnDescription(e.target.value)}
                          placeholder={`e.g. Isolate MCC feeder & perform LOTO / disconnect 400V motor for ${card.equipmentName}`}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSpawnLinkedForm(false)}
                        className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSpawningLinked}
                        className="px-4 py-1.5 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                      >
                        {isSpawningLinked ? 'Creating Linked Job...' : 'Create Companion Job Card'}
                      </button>
                    </div>
                  </form>
                )}

                {linkedFamily.childCards.length === 0 && !linkedFamily.parentCard ? (
                  <div className="text-[11px] text-slate-500 italic">
                    No companion department jobs linked to this Work Order yet.
                  </div>
                ) : (
                  linkedFamily.childCards.length > 0 && (
                    <div className="space-y-2">
                      {linkedFamily.childCards.map((child) => {
                        const childStageMeta = getWorkflowStageMeta(resolveWorkflowStage(child));
                        return (
                          <div
                            key={child.id}
                            className="p-2.5 rounded bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs hover:border-[#714B67] transition"
                          >
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-900">{child.jobCardNumber}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${childStageMeta.badgeClass}`}>
                                  {childStageMeta.shortLabel}
                                </span>
                                {child.tradeRequired && (
                                  <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium">
                                    {child.tradeRequired}
                                  </span>
                                )}
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {child.totalLaborHours.toFixed(1)}h
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600 truncate">
                                <strong>{child.department}</strong> • {child.assignedTo} — {child.description}
                              </div>
                            </div>
                            {onSelectCard && (
                              <button
                                type="button"
                                onClick={() => onSelectCard(child)}
                                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-purple-50 hover:text-[#714B67] text-slate-700 font-semibold text-xs cursor-pointer shrink-0"
                              >
                                Open
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>

              {/* Work Order Photos & Document Attachments (<= 4, <= 220 KB) */}
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-[#714B67]" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Photos &amp; Document Attachments ({card.attachments?.length || 0} / {MAX_JOB_CARD_ATTACHMENTS})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Attach fault photos, post-repair verification photos, or scanned paper slips (auto-compressed &le; 220 KB).
                      </p>
                    </div>
                  </div>
                </div>

                {onAddAttachment && canLogLabor && (card.attachments?.length || 0) < MAX_JOB_CARD_ATTACHMENTS && (
                  <div className="p-3 rounded bg-white border border-slate-200 flex flex-wrap items-end gap-2.5 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Attachment Type
                      </label>
                      <select
                        value={attachmentCategory}
                        onChange={(e) => setAttachmentCategory(e.target.value as JobCardAttachmentCategory)}
                        className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium"
                      >
                        <option value="FAULT_PHOTO">Fault Photo</option>
                        <option value="REPAIRED_PHOTO">Repaired Photo</option>
                        <option value="PAPER_SLIP_SCAN">Paper Slip Scan</option>
                        <option value="DOCUMENT">Technical Document (PDF/TXT)</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Optional Caption / Note
                      </label>
                      <input
                        type="text"
                        value={attachmentCaption}
                        onChange={(e) => setAttachmentCaption(e.target.value)}
                        placeholder="e.g. Damaged shaft sleeve prior to replacement"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                      />
                    </div>
                    <label className="px-3.5 py-1.5 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white font-semibold text-xs cursor-pointer flex items-center gap-1.5 shrink-0">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{isUploadingAttachment ? 'Processing...' : 'Upload File'}</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf,.txt"
                        disabled={isUploadingAttachment}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (!file) return;
                          setDetailError(null);
                          setIsUploadingAttachment(true);
                          try {
                            let newAttachment: JobCardAttachment;
                            if (file.type.startsWith('image/')) {
                              const compressed = await compressInspectionPhotoFile(file);
                              newAttachment = {
                                id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                name: compressed.name,
                                category: attachmentCategory,
                                mimeType: compressed.contentType,
                                sizeBytes: compressed.sizeBytes,
                                dataUrl: compressed.dataUrl,
                                uploadedBy: currentAuthorName,
                                uploadedByUid: actor.uid,
                                uploadedAt: compressed.capturedAt,
                                caption: attachmentCaption.trim() || undefined
                              };
                            } else {
                              if (file.size > MAX_JOB_CARD_ATTACHMENT_BYTES) {
                                throw new Error(
                                  `Document "${file.name}" exceeds the ${Math.round(MAX_JOB_CARD_ATTACHMENT_BYTES / 1000)} KB Firestore limit.`
                                );
                              }
                              const dataUrl = await new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () =>
                                  typeof reader.result === 'string'
                                    ? resolve(reader.result)
                                    : reject(new Error('Could not read file.'));
                                reader.onerror = () => reject(new Error('Could not read file.'));
                                reader.readAsDataURL(file);
                              });
                              if (dataUrl.length > MAX_JOB_CARD_ATTACHMENT_BYTES) {
                                throw new Error('Encoded document exceeds 220 KB limit.');
                              }
                              newAttachment = {
                                id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                name: file.name.slice(0, 80),
                                category: attachmentCategory,
                                mimeType: file.type || 'application/octet-stream',
                                sizeBytes: file.size,
                                dataUrl,
                                uploadedBy: currentAuthorName,
                                uploadedByUid: actor.uid,
                                uploadedAt: new Date().toISOString(),
                                caption: attachmentCaption.trim() || undefined
                              };
                            }
                            await onAddAttachment(card, newAttachment);
                            setAttachmentCaption('');
                          } catch (err: any) {
                            setDetailError(err?.message || 'Failed to upload attachment.');
                          } finally {
                            setIsUploadingAttachment(false);
                          }
                        }}
                      />
                    </label>
                  </div>
                )}

                {!card.attachments || card.attachments.length === 0 ? (
                  <div className="text-[11px] text-slate-500 italic">
                    No photos or document attachments uploaded for this work order yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {card.attachments.map((att) => {
                      const isImage = att.mimeType.startsWith('image/');
                      return (
                        <div
                          key={att.id}
                          className="p-2.5 rounded bg-white border border-slate-200 flex items-center gap-3 text-xs"
                        >
                          {isImage ? (
                            <img
                              src={att.dataUrl}
                              alt={att.name}
                              onClick={() => setPreviewAttachment(att)}
                              className="w-14 h-14 object-cover rounded border border-slate-200 cursor-pointer shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
                              <FileText className="w-6 h-6 text-slate-500" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 rounded bg-purple-50 border border-purple-200 text-[#714B67] font-bold text-[10px]">
                                {att.category.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {Math.round(att.sizeBytes / 1024)} KB
                              </span>
                            </div>
                            <div className="font-semibold text-slate-800 truncate">{att.name}</div>
                            {att.caption && (
                              <div className="text-[11px] text-slate-600 truncate">{att.caption}</div>
                            )}
                            <div className="text-[10px] text-slate-400 font-mono">
                              {att.uploadedBy} • {new Date(att.uploadedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            {isImage ? (
                              <button
                                type="button"
                                onClick={() => setPreviewAttachment(att)}
                                className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                                title="Preview image"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <a
                                href={att.dataUrl}
                                download={att.name}
                                className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                                title="Download file"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {onRemoveAttachment && canAssign && (
                              <button
                                type="button"
                                onClick={async () => {
                                  setDetailError(null);
                                  try {
                                    await onRemoveAttachment(card, att.id);
                                  } catch (err: any) {
                                    setDetailError(err?.message || 'Could not remove attachment.');
                                  }
                                }}
                                className="p-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                                title="Remove attachment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

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

          {/* TAB: SPARES & STORES WITHDRAWAL */}
          {activeTab === 'spares' && (
            <div className="bg-white p-5 rounded-b border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-600" />
                    Stores Spares Withdrawal & Inventory Link
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Artisans present Work Order #{card.workOrderNumber || card.jobCardNumber} to Stores (Elliot Mhlongo) to withdraw parts.
                  </p>
                </div>
              </div>

              {/* Add Spares Requisition Form (Role-Gated) */}
              {canReqSpares ? (
                <form onSubmit={handleAddSpareSubmit} className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-lg space-y-3">
                  <div className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                    <PlusCircle className="w-3.5 h-3.5 text-amber-700" />
                    <span>Request Spare Part from Stores</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Part Description *
                      </label>
                      <input
                        type="text"
                        required
                        value={partDescription}
                        onChange={(e) => setPartDescription(e.target.value)}
                        placeholder="e.g. Mechanical Seal 45mm Tungsten Carbide / Bearings 6308"
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Quantity Required *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={partQty}
                        onChange={(e) => setPartQty(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Part # / Bin Location
                      </label>
                      <input
                        type="text"
                        value={partNumber}
                        onChange={(e) => setPartNumber(e.target.value)}
                        placeholder="e.g. PN-SEAL-45 / Bin B3"
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={markPendingSpares}
                        onChange={(e) => setMarkPendingSpares(e.target.checked)}
                        className="text-amber-600 focus:ring-amber-500 rounded"
                      />
                      <span className="text-xs font-semibold text-amber-900">
                        Hold Work Order as &quot;Pending Spares&quot; (Waiting for Stores / Procurement)
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={isAddingSpare}
                      className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded transition shadow-xs cursor-pointer"
                    >
                      {isAddingSpare ? 'Requesting...' : 'Submit Spares Requisition'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{getJobCardPermissionReason('request_spares', actor.role)}</span>
                </div>
              )}

              {/* Table of Requested Parts */}
              <div>
                <h5 className="text-[11px] font-bold text-slate-600 uppercase mb-2">
                  Parts Requisitioned for this Work Order ({card.sparesRequested?.length || 0})
                </h5>

                {(!card.sparesRequested || card.sparesRequested.length === 0) ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded text-center text-slate-400 text-xs">
                    No spare parts have been requisitioned for this work order yet.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2">Part Description</th>
                          <th className="p-2 text-center">Qty</th>
                          <th className="p-2">Part # / Bin</th>
                          <th className="p-2">Status</th>
                          <th className="p-2">Stores Requisition Slip #</th>
                          <th className="p-2 text-right">Action (Stores)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {card.sparesRequested.map((part) => (
                          <tr key={part.id} className="hover:bg-slate-50">
                            <td className="p-2 font-semibold text-slate-800">{part.partDescription}</td>
                            <td className="p-2 text-center font-mono font-bold">{part.quantity}</td>
                            <td className="p-2 font-mono text-slate-500">{part.partNumber || '—'}</td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                part.status === 'Issued' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {part.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-2 font-mono">
                              {part.requisitionSlipNumber || part.storeVoucherNumber ? (
                                <span className="font-extrabold text-[#d32f2f] bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-[11px]">
                                  #{part.requisitionSlipNumber || part.storeVoucherNumber}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Pending Issue</span>
                              )}
                            </td>
                            <td className="p-2 text-right">
                              {part.status !== 'Issued' ? (
                                canIssSpares ? (
                                  issuingPartId === part.id ? (
                                    <div className="flex items-center justify-end space-x-1">
                                      <input
                                        type="text"
                                        value={issueVoucher}
                                        onChange={(e) => setIssueVoucher(e.target.value)}
                                        placeholder="Voucher #"
                                        className="w-20 text-xs px-1 py-0.5 border rounded font-mono"
                                      />
                                      <button
                                        onClick={() => handleIssueSpareSubmit(part.id)}
                                        className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer"
                                      >
                                        Confirm
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setIssuingPartId(part.id)}
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                    >
                                      Issue from Stores
                                    </button>
                                  )
                                ) : (
                                  <span className="text-slate-400 text-[10px] italic">Stores Sign-Off Required</span>
                                )
                              ) : (
                                <span className="text-emerald-700 text-[10px] font-bold">Issued by {part.issuedBy || 'Stores'}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: ARTISAN HANDBACK & HOD CLOSE-OUT */}
          {activeTab === 'handback' && (
            <div className="bg-white p-5 rounded-b border border-slate-200 shadow-2xs space-y-5">
              {/* Slip Handback Section */}
              <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-700" />
                    <h4 className="font-bold text-xs uppercase text-blue-950">
                      Record Physical Slip Handback (Returned to Office)
                    </h4>
                  </div>
                  {card.completedByArtisan && (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      HANDBACK RECORDED
                    </span>
                  )}
                </div>

                {card.completedByArtisan ? (
                  <div className="p-3 bg-white border border-emerald-200 rounded text-xs space-y-1">
                    <div className="font-bold text-emerald-900">
                      ✓ Completed by {card.completedByArtisan} on {card.completionDate} at {card.completionTime || '16:00'} ({card.completionHours} hrs logged)
                    </div>
                    {card.artisanHandbackNotes && (
                      <div className="text-slate-600 font-serif italic">
                        Notes on Slip: &quot;{card.artisanHandbackNotes}&quot;
                      </div>
                    )}
                  </div>
                ) : canHandback ? (
                  <form onSubmit={handleHandbackSubmit} className="space-y-3 text-xs">
                    <p className="text-[11px] text-slate-600">
                      When the artisan returns the physical paper slip with handwritten hours and signature, enter them here:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Artisan Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={handbackArtisan || card.assignedTo}
                          onChange={(e) => setHandbackArtisan(e.target.value)}
                          placeholder="Phumelele Maseko"
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Date Completed *
                        </label>
                        <input
                          type="date"
                          required
                          value={handbackDate}
                          onChange={(e) => setHandbackDate(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Time Completed
                        </label>
                        <input
                          type="text"
                          value={handbackTime}
                          onChange={(e) => setHandbackTime(e.target.value)}
                          placeholder="15:30"
                          className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Hours on Slip *
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          required
                          value={handbackHours}
                          onChange={(e) => setHandbackHours(e.target.value)}
                          placeholder="2.5"
                          className="w-full text-xs font-mono font-bold px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Handwritten Work Notes from Artisan *
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={handbackNotes}
                        onChange={(e) => setHandbackNotes(e.target.value)}
                        placeholder="e.g. Replaced worn bearings and mechanical seal. Aligned coupling. Test ran pump with operator Atanasio with normal pressure."
                        className="w-full text-xs font-serif p-2 border border-slate-300 rounded bg-white"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isLoggingHandbackReceipt}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs shadow-xs cursor-pointer"
                      >
                        {isLoggingHandbackReceipt ? 'Saving Handback...' : 'Save Slip Handback & Log Hours'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-3 bg-white border border-slate-200 rounded text-[11px] text-slate-600 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{getJobCardPermissionReason('handback', actor.role)}</span>
                  </div>
                )}
              </div>

              {/* HOD Close-Out Section */}
              <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-700" />
                    <h4 className="font-bold text-xs uppercase text-purple-950">
                      HOD Final Digital Sign-Off (Antonio Miranda / Engineering Manager)
                    </h4>
                  </div>
                  {card.hodSignedBy && (
                    <span className="px-2 py-0.5 rounded bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider">
                      OFFICIALLY CLOSED
                    </span>
                  )}
                </div>

                {card.hodSignedBy ? (
                  <div className="p-3 bg-white border border-purple-200 rounded text-xs space-y-1">
                    <div className="font-bold text-purple-900">
                      🎖️ Signed Off by {card.hodSignedBy}
                    </div>
                    {card.hodDigitalSignOff?.notes && (
                      <div className="text-slate-600 italic">
                        &quot;{card.hodDigitalSignOff.notes}&quot;
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 font-mono">
                      Timestamp: {new Date(card.hodDigitalSignOff?.signedAt || card.updatedAt).toLocaleString()}
                    </div>
                  </div>
                ) : canHODSign ? (
                  <form onSubmit={handleHODSubmit} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          HOD Name
                        </label>
                        <input
                          type="text"
                          required
                          value={hodName}
                          onChange={(e) => setHodName(e.target.value)}
                          className="w-full text-xs font-bold px-2.5 py-1.5 border border-purple-300 rounded bg-white text-purple-950"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Close-Out Remarks
                        </label>
                        <input
                          type="text"
                          value={hodNotes}
                          onChange={(e) => setHodNotes(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-purple-300 rounded bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isClosingHOD}
                        className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5 text-purple-300" />
                        <span>{isClosingHOD ? 'Closing Work Order...' : 'Digitally Sign & Close Work Order'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-3 bg-white border border-purple-200 rounded text-[11px] text-slate-600 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>{getJobCardPermissionReason('hod_signoff', actor.role)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Labor Hours Logging */}
          {activeTab === 'labor' && (
            <div className="bg-white p-5 rounded-b border border-slate-200 shadow-2xs space-y-5">
              {/* Add Labor Form (Role-Gated) */}
              {canLogLabor ? (
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
                      {activeTrades.map((t) => (
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
                      {activeShifts.map((s) => (
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
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{getJobCardPermissionReason('labor', actor.role)}</span>
                </div>
              )}

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

                {onAddHandover && canLogLabor && (
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
                        {activeShifts.map((s) => (
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
                        {activeShifts.map((s) => (
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

              {/* Immutable 8-Stage Transition Ledger */}
              <div className="space-y-2.5 pt-3 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#714B67]" />
                  <span>Stage Transition History ({card.statusHistory?.length || 0})</span>
                </h4>

                {(!card.statusHistory || card.statusHistory.length === 0) ? (
                  <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded text-slate-400 text-xs">
                    No structured stage transitions logged yet for this legacy card (current stage: {currentWorkflowMeta.label}).
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Timestamp</th>
                          <th className="py-2 px-3">Transition</th>
                          <th className="py-2 px-3">Actor &amp; Role</th>
                          <th className="py-2 px-3">Reason / Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {card.statusHistory.slice().reverse().map((h) => {
                          const toMeta = getWorkflowStageMeta(h.toStage);
                          const fromMeta = h.fromStage ? getWorkflowStageMeta(h.fromStage) : null;
                          return (
                            <tr key={h.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                {new Date(h.changedAt).toLocaleString()}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                {fromMeta && (
                                  <span className="text-slate-400 mr-1.5">{fromMeta.shortLabel} →</span>
                                )}
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${toMeta.badgeClass}`}>
                                  {toMeta.label}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-800 font-medium">
                                <span>{h.changedBy}</span>
                                {h.changedByRole && (
                                  <span className="ml-1.5 px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                    {h.changedByRole}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-600">{h.reason || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Timestamped Activity Feed */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Audit Trail &amp; Chatter
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
          <div className="font-mono text-[11px] flex items-center gap-3">
            <span>Doc ID: {card.id}</span>
            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-sans font-semibold text-[10px]">
              Access Role: {actor.role || 'Staff'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {canDelete && !confirmDeleteCard && (
              <button
                type="button"
                onClick={() => setConfirmDeleteCard(true)}
                className="px-3 py-1.5 rounded text-rose-700 hover:bg-rose-100 transition text-xs font-medium cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Job Card</span>
              </button>
            )}
            {canDelete && confirmDeleteCard && (
              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 rounded px-2.5 py-1">
                <span className="text-rose-900 font-semibold text-[11px]">Delete {card.jobCardNumber}?</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await onDelete(card.id);
                      onClose();
                    } catch (err: any) {
                      setDetailError(err?.message || 'Delete denied.');
                      setConfirmDeleteCard(false);
                    }
                  }}
                  className="px-2 py-0.5 rounded bg-rose-700 hover:bg-rose-800 text-white font-bold text-[11px] cursor-pointer"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteCard(false)}
                  className="px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-700 text-[11px] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Inline Attachment Lightbox Modal */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="bg-white rounded-lg max-w-3xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between text-xs">
              <div>
                <span className="font-bold">{previewAttachment.name}</span>
                {previewAttachment.caption && (
                  <span className="text-slate-300 ml-2">— {previewAttachment.caption}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="p-1 hover:bg-white/10 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={previewAttachment.dataUrl}
                alt={previewAttachment.name}
                className="max-w-full max-h-[68vh] object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
