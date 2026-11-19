/**
 * Job Card 8-Stage Phase 1 Lifecycle Workflow & Multi-Department Link Helpers
 *
 * Pure domain utilities (no React/Firebase side-effects):
 * 1. Normalizes legacy (status, requisitionStage) <-> canonical 8-stage JobCardWorkflowStage
 * 2. Builds bounded append-only statusHistory audit entries
 * 3. Computes parent/child multi-department linked Job Card family & labor rollups
 */

import {
  JobCard,
  JobCardStatus,
  JobCardWorkflowStage,
  RequisitionStage,
  StatusHistoryEntry
} from '../../types';

export interface WorkflowStageMeta {
  id: JobCardWorkflowStage;
  step: number;
  label: string;
  shortLabel: string;
  legacyStatus: JobCardStatus;
  legacyRequisitionStage: RequisitionStage;
  badgeClass: string;
  description: string;
}

export const MAX_STATUS_HISTORY_ENTRIES = 200;

export const WORKFLOW_STAGES: ReadonlyArray<WorkflowStageMeta> = [
  {
    id: 'SUBMITTED',
    step: 1,
    label: '1. Submitted',
    shortLabel: 'Submitted',
    legacyStatus: 'Draft',
    legacyRequisitionStage: 'Pending Acceptance',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    description: 'Requisition raised by plant operations and queued for supervisor review.'
  },
  {
    id: 'ACCEPTED',
    step: 2,
    label: '2. Accepted & Assigned',
    shortLabel: 'Accepted',
    legacyStatus: 'In Progress',
    legacyRequisitionStage: 'Accepted',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
    description: 'Supervisor accepted work scope and dispatched artisan/trade crew.'
  },
  {
    id: 'IN_PROGRESS',
    step: 3,
    label: '3. In Progress',
    shortLabel: 'In Progress',
    legacyStatus: 'In Progress',
    legacyRequisitionStage: 'In Progress',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Active maintenance execution underway on plant equipment.'
  },
  {
    id: 'WAITING_FOR_PARTS',
    step: 4,
    label: '4. Waiting for Parts',
    shortLabel: 'Wait Parts',
    legacyStatus: 'Pending Spares',
    legacyRequisitionStage: 'Pending Spares',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    description: 'Paused awaiting Stores issue voucher or external procurement spares.'
  },
  {
    id: 'WAITING_FOR_SHUTDOWN',
    step: 5,
    label: '5. Waiting for Shutdown',
    shortLabel: 'Wait Shutdown',
    legacyStatus: 'Pending Spares',
    legacyRequisitionStage: 'Pending Spares',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-300',
    description: 'Deferred to planned plant stop-day or unit isolation window.'
  },
  {
    id: 'WORK_COMPLETE',
    step: 6,
    label: '6. Work Complete (Verify)',
    shortLabel: 'Work Complete',
    legacyStatus: 'In Progress',
    legacyRequisitionStage: 'Artisan Completed',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
    description: 'Artisan handback recorded; awaiting final Manager/HOD sign-off.'
  },
  {
    id: 'CLOSED',
    step: 7,
    label: '7. Closed & Signed Off',
    shortLabel: 'Closed',
    legacyStatus: 'Completed',
    legacyRequisitionStage: 'HOD Closed',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Verified operational and closed with HOD digital sign-off.'
  },
  {
    id: 'CANCELLED',
    step: 8,
    label: '8. Cancelled',
    shortLabel: 'Cancelled',
    legacyStatus: 'Cancelled',
    legacyRequisitionStage: 'Cancelled',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'Work order cancelled and locked in historical register.'
  }
];

export const ACTIVE_PIPELINE_STAGES: ReadonlyArray<WorkflowStageMeta> = WORKFLOW_STAGES.filter(
  (s) => s.id !== 'CANCELLED'
);

export function getWorkflowStageMeta(stage: JobCardWorkflowStage): WorkflowStageMeta {
  return WORKFLOW_STAGES.find((s) => s.id === stage) || WORKFLOW_STAGES[0];
}

/**
 * Resolves canonical 8-stage workflow state cleanly even for older Firestore documents
 * that predate workflowStage.
 */
export function resolveWorkflowStage(
  card: Pick<JobCard, 'workflowStage' | 'status' | 'requisitionStage' | 'hodSignedBy' | 'hodDigitalSignOff' | 'acceptedBy'>
): JobCardWorkflowStage {
  if (card.workflowStage) {
    return card.workflowStage;
  }
  if (card.status === 'Cancelled' || card.requisitionStage === 'Cancelled') {
    return 'CANCELLED';
  }
  if (card.hodSignedBy || card.hodDigitalSignOff?.signedBy || card.requisitionStage === 'HOD Closed' || card.status === 'Completed') {
    return 'CLOSED';
  }
  if (card.requisitionStage === 'Artisan Completed') {
    return 'WORK_COMPLETE';
  }
  if (card.status === 'Pending Spares' || card.requisitionStage === 'Pending Spares') {
    return 'WAITING_FOR_PARTS';
  }
  if (card.requisitionStage === 'Accepted' || (card.status === 'In Progress' && Boolean(card.acceptedBy))) {
    return 'IN_PROGRESS';
  }
  if (card.status === 'In Progress') {
    return 'IN_PROGRESS';
  }
  return 'SUBMITTED';
}

export function mapWorkflowStageToLegacy(stage: JobCardWorkflowStage): {
  status: JobCardStatus;
  requisitionStage: RequisitionStage;
} {
  const meta = getWorkflowStageMeta(stage);
  return {
    status: meta.legacyStatus,
    requisitionStage: meta.legacyRequisitionStage
  };
}

export function mapLegacyStatusToWorkflowStage(
  status: JobCardStatus,
  currentStage?: JobCardWorkflowStage
): JobCardWorkflowStage {
  switch (status) {
    case 'Draft':
      return 'SUBMITTED';
    case 'In Progress':
      if (currentStage === 'ACCEPTED' || currentStage === 'WORK_COMPLETE') {
        return currentStage;
      }
      return 'IN_PROGRESS';
    case 'Pending Spares':
      return currentStage === 'WAITING_FOR_SHUTDOWN' ? 'WAITING_FOR_SHUTDOWN' : 'WAITING_FOR_PARTS';
    case 'Completed':
      return 'CLOSED';
    case 'Cancelled':
      return 'CANCELLED';
  }
}

export function createStatusHistoryEntry(params: {
  fromStage?: JobCardWorkflowStage;
  toStage: JobCardWorkflowStage;
  fromStatus?: JobCardStatus;
  toStatus: JobCardStatus;
  changedBy: string;
  changedByUid?: string;
  changedByRole?: string;
  changedAt?: string;
  reason?: string;
}): StatusHistoryEntry {
  return {
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...(params.fromStage ? { fromStage: params.fromStage } : {}),
    toStage: params.toStage,
    ...(params.fromStatus ? { fromStatus: params.fromStatus } : {}),
    toStatus: params.toStatus,
    changedBy: params.changedBy,
    ...(params.changedByUid ? { changedByUid: params.changedByUid } : {}),
    ...(params.changedByRole ? { changedByRole: params.changedByRole } : {}),
    changedAt: params.changedAt || new Date().toISOString(),
    ...(params.reason ? { reason: params.reason } : {})
  };
}

export function appendStatusHistory(
  existingHistory: ReadonlyArray<StatusHistoryEntry> | undefined,
  entry: StatusHistoryEntry
): StatusHistoryEntry[] {
  const base = Array.isArray(existingHistory) ? [...existingHistory] : [];
  base.push(entry);
  if (base.length > MAX_STATUS_HISTORY_ENTRIES) {
    return base.slice(base.length - MAX_STATUS_HISTORY_ENTRIES);
  }
  return base;
}

export interface LinkedJobCardFamily {
  parentCard: JobCard | null;
  childCards: JobCard[];
  openChildCount: number;
  closedChildCount: number;
  familyTotalHours: number;
}

export function getLinkedJobCardFamily(
  card: Pick<JobCard, 'id' | 'parentJobCardId' | 'totalLaborHours'>,
  allCards: ReadonlyArray<JobCard>
): LinkedJobCardFamily {
  const parentCard = card.parentJobCardId
    ? allCards.find((c) => c.id === card.parentJobCardId) || null
    : null;

  const childCards = allCards.filter((c) => c.parentJobCardId === card.id);
  const openChildCount = childCards.filter((c) => {
    const stage = resolveWorkflowStage(c);
    return stage !== 'CLOSED' && stage !== 'CANCELLED' && c.status !== 'Completed' && c.status !== 'Cancelled';
  }).length;
  const closedChildCount = childCards.length - openChildCount;

  const familyTotalHours = Number(
    (
      (Number(card.totalLaborHours) || 0) +
      childCards.reduce((sum, child) => sum + (Number(child.totalLaborHours) || 0), 0)
    ).toFixed(2)
  );

  return {
    parentCard,
    childCards,
    openChildCount,
    closedChildCount,
    familyTotalHours
  };
}
