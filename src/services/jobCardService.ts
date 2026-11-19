import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import {
  JobCard,
  JobCardStatus,
  JobCardWorkflowStage,
  Priority,
  LaborLog,
  ActivityComment,
  ShiftHandoverLog,
  SafetyPermits,
  TechnicalTrade,
  ShiftGroup,
  JobCardAttachment
} from '../types';
import { emitAppNotification } from './notificationService';
import { eventBus } from '../core/events/eventBus';
import {
  JobCardActorContext,
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
  getJobCardPermissionReason
} from '../core/jobcards/permissions';
import {
  appendStatusHistory,
  createStatusHistoryEntry,
  getWorkflowStageMeta,
  mapLegacyStatusToWorkflowStage,
  mapWorkflowStageToLegacy,
  resolveWorkflowStage
} from '../core/jobcards/workflow';

const COLLECTION_NAME = 'jobCards';

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (v !== undefined) {
        clean[k] = stripUndefinedDeep(v);
      }
    }
    return clean as T;
  }
  return value;
}

export const INITIAL_JOB_CARDS: Omit<JobCard, 'id'>[] = [
  {
    jobCardNumber: 'JC-UTIL-2026-001',
    department: 'Utilities - Boiler House',
    departmentCategory: 'Utilities',
    equipmentName: 'High-Pressure Steam Boiler #1',
    equipmentId: 'EQ-BLR-101',
    priority: 'Emergency',
    status: 'In Progress',
    description: 'Severe hot boiler feedwater leak detected at drive end mechanical seal on boiler feed pump B-2 during night shift. Immediate isolation, lock-out/tag-out, and cartridge seal replacement required to prevent boiler starvation and plant shutdown.',
    assignedTo: 'Tintile Gule (Utilities Supervisor)',
    targetDate: '2026-10-28',
    totalLaborHours: 5.5,
    laborLogs: [
      {
        id: 'lab-1',
        technician: 'Tintile Gule',
        date: '2026-10-26',
        hours: 3.5,
        taskNotes: 'Performed isolation, LOTO with Boiler Operator, drained pump housing, and extracted damaged tungsten carbide seal face.',
        loggedAt: '2026-10-26T10:15:00Z'
      },
      {
        id: 'lab-2',
        technician: 'Sam Ngubeni',
        date: '2026-10-26',
        hours: 2.0,
        taskNotes: 'Assisted Utilities with pump impeller shaft inspection for scoring; polished shaft sleeve and prepared spare Burgmann seal cartridge.',
        loggedAt: '2026-10-26T13:45:00Z'
      }
    ],
    comments: [
      {
        id: 'com-1',
        author: 'Tintile Gule',
        message: 'LOTO permit signed off with Andriese Mhlongo (Utilities Manager). Standby pump B-1 currently carrying 65% boiler load.',
        timestamp: '2026-10-26T09:30:00Z',
        type: 'comment'
      },
      {
        id: 'com-2',
        author: 'System',
        message: 'Status changed from Draft to In Progress by Tintile Gule',
        timestamp: '2026-10-26T09:35:00Z',
        type: 'status_change'
      },
      {
        id: 'com-3',
        author: 'Andriese Mhlongo',
        message: 'New seal installed. Alignment laser check scheduled for 15:00 before hydro-test.',
        timestamp: '2026-10-26T14:00:00Z',
        type: 'comment'
      }
    ],
    createdById: 'staff-andriese-mhlongo',
    createdByName: 'Andriese Mhlongo (Utilities Manager)',
    createdAt: '2026-10-26T08:15:00Z',
    updatedAt: '2026-10-26T14:00:00Z'
  },
  {
    jobCardNumber: 'JC-PROD-2026-002',
    department: 'Production - Fermentation Bay',
    departmentCategory: 'Production',
    equipmentName: 'Fermenter Tank 02 (60,000L Agitated)',
    equipmentId: 'EQ-FERM-302',
    priority: 'High',
    status: 'Pending Spares',
    description: 'Top-mounted Flender reduction gearbox weeping food-grade synthetic lube oil onto seal catch pan. Tank currently undergoing CIP sanitization. Needs new 120x150x12 Viton double-lip radial shaft seal.',
    assignedTo: 'Ncamiso Dlamini (Assistant Production Manager)',
    targetDate: '2026-10-29',
    totalLaborHours: 1.5,
    laborLogs: [
      {
        id: 'lab-3',
        technician: 'Ncamiso Dlamini',
        date: '2026-10-26',
        hours: 1.5,
        taskNotes: 'Disassembled motor coupling guard, cleaned oil accumulation, and measured shaft tolerance.',
        loggedAt: '2026-10-26T11:00:00Z'
      }
    ],
    comments: [
      {
        id: 'com-4',
        author: 'Ncamiso Dlamini',
        message: 'Stores requisition #SR-892 submitted to Elliot Mhlongo (Stores Manager) for Viton seal. Expected arrival tomorrow 09:00.',
        timestamp: '2026-10-26T11:30:00Z',
        type: 'comment'
      },
      {
        id: 'com-5',
        author: 'System',
        message: 'Status changed to Pending Spares by Ncamiso Dlamini',
        timestamp: '2026-10-26T11:31:00Z',
        type: 'status_change'
      }
    ],
    createdById: 'staff-mncedisi-gama',
    createdByName: 'Mncedisi Gama (Production Manager)',
    createdAt: '2026-10-26T09:00:00Z',
    updatedAt: '2026-10-26T11:31:00Z'
  },
  {
    jobCardNumber: 'JC-ENG-2026-003',
    department: 'Engineering - Electrical & Instrumentation',
    departmentCategory: 'Engineering',
    equipmentName: 'Copper Pot Still Wash Column A',
    equipmentId: 'EQ-COL-401',
    priority: 'Medium',
    status: 'In Progress',
    description: 'Tray #14 RTD Pt100 temperature transmitter displaying intermittent 4-20mA signal drift (-4°C discrepancy relative to manual test thermowell). Needs recalibration and transmitter terminal block inspection.',
    assignedTo: 'Stanley Matsenjwa (Instrumentation Supervisor)',
    targetDate: '2026-10-30',
    totalLaborHours: 2.0,
    laborLogs: [
      {
        id: 'lab-4',
        technician: 'Stanley Matsenjwa',
        date: '2026-10-26',
        hours: 2.0,
        taskNotes: 'Tested RTD resistance with Fluke 754 calibrator. Detected loose terminal wire in junction box JB-STILL-03.',
        loggedAt: '2026-10-26T12:30:00Z'
      }
    ],
    comments: [
      {
        id: 'com-6',
        author: 'Stanley Matsenjwa',
        message: 'Rewired terminal block with ferruled ends. Currently logging 2-hour trend on SCADA with Thoba Nhleko to verify signal stability.',
        timestamp: '2026-10-26T12:45:00Z',
        type: 'comment'
      }
    ],
    createdById: 'staff-thoba-nhleko',
    createdByName: 'Thoba Nhleko (Electrical & Instrumentation Manager)',
    createdAt: '2026-10-26T10:00:00Z',
    updatedAt: '2026-10-26T12:45:00Z'
  },
  {
    jobCardNumber: 'JC-UTIL-2026-004',
    department: 'Utilities - Turbine Power Plant',
    departmentCategory: 'Utilities',
    equipmentName: 'Siemens Steam Co-Gen Turbine 2.5MW',
    equipmentId: 'EQ-TRB-201',
    priority: 'High',
    status: 'Completed',
    description: 'Scheduled 500-hour preventive maintenance: spectral vibration analysis on generator drive-end and non-drive-end sleeve bearings, plus oil filter element change.',
    assignedTo: 'Sam Ngubeni (Maintenance Supervisor)',
    targetDate: '2026-10-25',
    totalLaborHours: 4.0,
    laborLogs: [
      {
        id: 'lab-5',
        technician: 'Sam Ngubeni',
        date: '2026-10-25',
        hours: 4.0,
        taskNotes: 'Vibration signatures within ISO 10816 Zone A (1.2 mm/s RMS). Replaced 10-micron duplex lube oil filters.',
        loggedAt: '2026-10-25T16:00:00Z'
      }
    ],
    comments: [
      {
        id: 'com-7',
        author: 'Sam Ngubeni',
        message: 'All vibration harmonics clean. Signed off by Antonio Miranda for continued 2.5MW continuous generation.',
        timestamp: '2026-10-25T16:15:00Z',
        type: 'comment'
      },
      {
        id: 'com-8',
        author: 'Antonio Miranda',
        message: 'Approved completion. Co-Gen efficiency recorded at 89.2% in accordance with Johan Smit plant KPIs.',
        timestamp: '2026-10-25T16:20:00Z',
        type: 'status_change'
      }
    ],
    createdById: 'staff-antonio-miranda',
    createdByName: 'Antonio Miranda (Engineering / Maintenance Manager)',
    createdAt: '2026-10-25T08:00:00Z',
    updatedAt: '2026-10-25T16:20:00Z'
  },
  {
    jobCardNumber: 'JC-TRAN-2026-005',
    department: 'Transport Workshop - Forklift Maintenance',
    departmentCategory: 'Transport Workshop',
    equipmentName: 'Toyota 3.5T Electric Forklift Unit #4',
    equipmentId: 'EQ-FLT-701',
    priority: 'Low',
    status: 'Draft',
    description: 'Driver reported minor hydraulic fluid weeping from right mast tilt cylinder gland during heavy cask movements in maturation warehouse #3. Check packing seals and wiper ring.',
    assignedTo: 'Blessing Ngubeni (Transport Workshop Supervisor)',
    targetDate: '2026-11-02',
    totalLaborHours: 0,
    laborLogs: [],
    comments: [],
    createdById: 'staff-bert-van-vureen',
    createdByName: 'Bert Van Vureen (Transport Workshop Manager)',
    createdAt: '2026-10-26T11:00:00Z',
    updatedAt: '2026-10-26T11:00:00Z'
  },
  {
    jobCardNumber: 'JC-PROD-2026-006',
    department: 'Production - Mash & Grain Milling',
    departmentCategory: 'Production',
    equipmentName: 'Bühler 4-Roll Malt Grain Mill',
    equipmentId: 'EQ-MILL-501',
    priority: 'Medium',
    status: 'Draft',
    description: 'Pre-production checks for next batch of bourbon mash: verify roll gap clearance with brass feeler gauge (0.8mm top rolls, 0.5mm bottom rolls) and inspect v-belt tension.',
    assignedTo: 'Ncamiso Dlamini (Assistant Production Manager)',
    targetDate: '2026-11-01',
    totalLaborHours: 0,
    laborLogs: [],
    comments: [],
    createdById: 'staff-mncedisi-gama',
    createdByName: 'Mncedisi Gama (Production Manager)',
    createdAt: '2026-10-26T12:00:00Z',
    updatedAt: '2026-10-26T12:00:00Z'
  }
];

export function subscribeJobCards(
  onUpdate: (cards: JobCard[]) => void,
  onError?: (error: Error) => void
) {
  const q = collection(db, COLLECTION_NAME);
  let autoSeedAttempted = false;

  return onSnapshot(
    q,
    async (snapshot) => {
      if (snapshot.empty) {
        if (!autoSeedAttempted) {
          autoSeedAttempted = true;
          try {
            await seedInitialJobCards();
            return;
          } catch (e) {
            console.warn('Could not auto-seed job cards:', e);
          }
        }
        onUpdate([]);
        return;
      }
      const items: JobCard[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          jobCardNumber: data.jobCardNumber || data.jobNumber || data.code || `JC-${d.id.substring(0, 6).toUpperCase()}`,
          department: data.department || 'Engineering - General Maintenance',
          departmentCategory: data.departmentCategory || (data.department ? data.department.split(' - ')[0] : 'Engineering'),
          equipmentName: data.equipmentName || data.equipment || data.assetName || 'Plant Machinery',
          equipmentId: data.equipmentId || '',
          equipmentCode: data.equipmentCode || undefined,
          electricalFeeder: data.electricalFeeder || undefined,
          inspectionId: data.inspectionId || undefined,
          inspectionReference: data.inspectionReference || undefined,
          priority: (data.priority as Priority) || 'Medium',
          status: (data.status as JobCardStatus) || 'Draft',
          description: data.description || data.workDescription || data.notes || '',
          assignedTo: data.assignedTo || data.technician || 'Unassigned Staff',
          targetDate: data.targetDate || data.dueDate || '',
          totalLaborHours: typeof data.totalLaborHours === 'number' ? data.totalLaborHours : (
            Array.isArray(data.laborLogs) ? data.laborLogs.reduce((acc: number, l: any) => acc + (Number(l.hours) || 0), 0) : 0
          ),
          laborLogs: Array.isArray(data.laborLogs) ? data.laborLogs : [],
          comments: Array.isArray(data.comments) ? data.comments : [],
          createdById: data.createdById || '',
          createdByName: data.createdByName || 'Staff Member',
          tradeRequired: data.tradeRequired || undefined,
          shiftAssigned: data.shiftAssigned || undefined,
          standbyTechnician: data.standbyTechnician || undefined,
          safetyPermits: data.safetyPermits || undefined,
          shiftHandovers: Array.isArray(data.shiftHandovers) ? data.shiftHandovers : [],
          equipmentSpecs: data.equipmentSpecs || undefined,
          // Official Works Requisition Slip & Supervisor/HOD Workflow fields
          workOrderNumber: data.workOrderNumber || undefined,
          requisitionType: data.requisitionType || undefined,
          costCenter: data.costCenter || undefined,
          dangerTagRequired: typeof data.dangerTagRequired === 'boolean' ? data.dangerTagRequired : undefined,
          dangerTagNumber: data.dangerTagNumber || undefined,
          recipientDepartment: data.recipientDepartment || undefined,
          originatingDepartment: data.originatingDepartment || undefined,
          originatedBy: data.originatedBy || undefined,
          originatedTime: data.originatedTime || undefined,
          originatedSignature: data.originatedSignature || undefined,
          physicalSlipLogged: typeof data.physicalSlipLogged === 'boolean' ? data.physicalSlipLogged : undefined,
          workflowStage: data.workflowStage || undefined,
          statusHistory: Array.isArray(data.statusHistory) ? data.statusHistory : [],
          holdReason: data.holdReason || undefined,
          requisitionStage: data.requisitionStage || undefined,
          assignedSupervisor: data.assignedSupervisor || undefined,
          acceptedAt: data.acceptedAt || undefined,
          acceptedBy: data.acceptedBy || undefined,
          completedByArtisan: data.completedByArtisan || undefined,
          artisanSignature: data.artisanSignature || undefined,
          artisanHandbackNotes: data.artisanHandbackNotes || undefined,
          completionDate: data.completionDate || undefined,
          completionTime: data.completionTime || undefined,
          completionHours: typeof data.completionHours === 'number' ? data.completionHours : undefined,
          sparesRequested: Array.isArray(data.sparesRequested) ? data.sparesRequested : [],
          hodSignedBy: data.hodSignedBy || undefined,
          hodDigitalSignOff: data.hodDigitalSignOff || undefined,
          qcSignedBy: data.qcSignedBy || undefined,
          parentJobCardId: data.parentJobCardId || undefined,
          parentJobCardNumber: data.parentJobCardNumber || undefined,
          attachments: Array.isArray(data.attachments) ? data.attachments : [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        };
      });
      // Sort by createdAt descending
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, COLLECTION_NAME);
      } catch (wrappedErr) {
        if (onError) onError(wrappedErr as Error);
      }
    }
  );
}

export async function seedInitialJobCards() {
  const actorUid = auth.currentUser?.uid;
  for (const item of INITIAL_JOB_CARDS) {
    const docRef = doc(collection(db, COLLECTION_NAME));
    await setDoc(docRef, stripUndefinedDeep({
      ...item,
      createdById: actorUid || item.createdById
    }));
  }
}

export function generateNextJobCardNumber(category: string, existingCards: JobCard[]): string {
  const year = new Date().getFullYear();
  let prefix = 'JC-GEN';
  const catLower = category.toLowerCase();

  if (catLower.includes('util')) prefix = 'JC-UTIL';
  else if (catLower.includes('prod')) prefix = 'JC-PROD';
  else if (catLower.includes('eng')) prefix = 'JC-ENG';
  else if (catLower.includes('trans')) prefix = 'JC-TRAN';
  else if (catLower.includes('log')) prefix = 'JC-LOG';
  else if (catLower.includes('safe')) prefix = 'JC-SAFE';
  else if (catLower.includes('civ')) prefix = 'JC-CIV';
  else if (catLower.includes('admin')) prefix = 'JC-ADM';
  else if (catLower.includes('store')) prefix = 'JC-STR';
  else if (catLower.includes('sec')) prefix = 'JC-SEC';

  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let maxSeq = 0;
  for (const card of existingCards) {
    const match = card.jobCardNumber?.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${prefix}-${year}-${nextSeq}`;
}

export async function createJobCard(
  cardData: Omit<JobCard, 'id' | 'createdAt' | 'updatedAt' | 'totalLaborHours' | 'laborLogs' | 'comments' | 'createdById' | 'createdByName'>,
  userProfile?: { uid: string; displayName: string; role?: JobCardActorContext['role']; email?: string | null }
): Promise<string> {
  const docRef = doc(collection(db, COLLECTION_NAME));
  const uid = auth.currentUser?.uid || userProfile?.uid || 'anonymous-user';
  const name = userProfile?.displayName || auth.currentUser?.displayName || auth.currentUser?.email || 'Authorized Staff';

  const requestedStatus: JobCardStatus =
    cardData.status === 'Completed' || cardData.status === 'Cancelled'
      ? (canAssignOrAcceptJobCard(userProfile?.role, userProfile?.email || auth.currentUser?.email)
          ? cardData.status
          : 'Draft')
      : cardData.status;

  const initialWorkflowStage =
    cardData.workflowStage || mapLegacyStatusToWorkflowStage(requestedStatus);
  const nowIso = new Date().toISOString();
  const initialHistoryEntry = createStatusHistoryEntry({
    toStage: initialWorkflowStage,
    toStatus: requestedStatus,
    changedBy: name,
    changedByUid: uid,
    changedByRole: userProfile?.role || undefined,
    changedAt: nowIso,
    reason: cardData.parentJobCardNumber
      ? `Spawned companion job card linked to ${cardData.parentJobCardNumber}`
      : 'Work requisition logged'
  });

  const newCard = stripUndefinedDeep({
    ...cardData,
    status: requestedStatus,
    workflowStage: initialWorkflowStage,
    statusHistory: [initialHistoryEntry],
    totalLaborHours: 0,
    laborLogs: [],
    comments: [
      {
        id: `com-init-${Date.now()}`,
        author: name,
        message: cardData.parentJobCardNumber
          ? `Linked companion Job Card created by ${name} (Parent: ${cardData.parentJobCardNumber})`
          : `Job Card created by ${name}`,
        timestamp: nowIso,
        type: 'system' as const
      }
    ],
    createdById: uid,
    createdByName: name,
    createdAt: nowIso,
    updatedAt: nowIso
  });

  try {
    await setDoc(docRef, newCard);

    // Publish Domain Event for cross-module orchestration
    eventBus.publish('JOB_CARD_CREATED', 'maintenance', {
      jobCardId: docRef.id,
      jobCardNumber: newCard.jobCardNumber,
      equipmentId: newCard.equipmentId,
      equipmentName: newCard.equipmentName,
      department: newCard.department,
      priority: newCard.priority,
      status: newCard.status,
      assignedTo: newCard.assignedTo,
      targetDate: newCard.targetDate
    }).catch(err => console.error('[EventBus] Error publishing JOB_CARD_CREATED:', err));

    emitAppNotification({
      type: newCard.priority === 'Emergency' ? 'JOB_CARD_EMERGENCY' : 'JOB_CARD_CREATED',
      title:
        newCard.priority === 'Emergency'
          ? `🚨 Emergency Job Card ${newCard.jobCardNumber}`
          : `New Job Card ${newCard.jobCardNumber}`,
      message: `${newCard.equipmentName} (${newCard.department}): ${newCard.description.slice(0, 140)}`,
      severity: newCard.priority === 'Emergency' ? 'EMERGENCY' : 'ACTION_REQUIRED',
      jobCardId: docRef.id,
      jobCardNumber: newCard.jobCardNumber,
      department: newCard.department,
      createdBy: name
    }).catch(() => {});

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${COLLECTION_NAME}/${docRef.id}`);
    throw error;
  }
}

export async function updateJobCard(
  id: string,
  updates: Partial<JobCard>,
  options?: {
    actor?: JobCardActorContext;
    existingCard?: Pick<JobCard, 'status' | 'createdById'>;
  }
): Promise<void> {
  if (options?.actor && options?.existingCard) {
    if (!canEditJobCard(options.actor, options.existingCard)) {
      throw new Error(getJobCardPermissionReason('edit', options.actor.role));
    }
  }
  const docRef = doc(db, COLLECTION_NAME, id);
  const cleanUpdates = stripUndefinedDeep({
    ...updates,
    updatedAt: new Date().toISOString()
  });
  try {
    await updateDoc(docRef, cleanUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    throw error;
  }
}

export async function updateJobCardStatus(
  card: JobCard,
  newStatus: JobCardStatus,
  authorName: string,
  actor?: JobCardActorContext
): Promise<void> {
  if (actor && !canTransitionJobCardStatus(actor, card, newStatus)) {
    throw new Error(getJobCardPermissionReason('complete', actor.role));
  }

  const fromStage = resolveWorkflowStage(card);
  const toStage = mapLegacyStatusToWorkflowStage(newStatus, fromStage);
  const nowIso = new Date().toISOString();

  const historyEntry = createStatusHistoryEntry({
    fromStage,
    toStage,
    fromStatus: card.status,
    toStatus: newStatus,
    changedBy: authorName,
    changedByUid: actor?.uid || auth.currentUser?.uid || undefined,
    changedByRole: actor?.role || undefined,
    changedAt: nowIso
  });

  const comment: ActivityComment = {
    id: `com-status-${Date.now()}`,
    author: authorName,
    message: `Status changed from ${card.status} to ${newStatus}`,
    timestamp: nowIso,
    type: 'status_change'
  };

  const updatedComments = [...(card.comments || []), comment];

  await updateJobCard(card.id, {
    status: newStatus,
    workflowStage: toStage,
    statusHistory: appendStatusHistory(card.statusHistory, historyEntry),
    comments: updatedComments
  });

  // Publish Domain Event
  eventBus.publish('JOB_CARD_STATUS_CHANGED', 'maintenance', {
    jobCardId: card.id,
    jobCardNumber: card.jobCardNumber,
    equipmentId: card.equipmentId,
    equipmentName: card.equipmentName,
    previousStatus: card.status,
    newStatus,
    workflowStage: toStage,
    actor: authorName
  }).catch(err => console.error('[EventBus] Error publishing JOB_CARD_STATUS_CHANGED:', err));
}

export async function transitionJobCardWorkflowStage(
  card: JobCard,
  targetStage: JobCardWorkflowStage,
  params: {
    actorName: string;
    reason?: string;
    actor?: JobCardActorContext;
  }
): Promise<void> {
  if (params.actor && !canTransitionWorkflowStage(params.actor, card, targetStage)) {
    throw new Error(
      targetStage === 'CLOSED'
        ? getJobCardPermissionReason('hod_signoff', params.actor.role)
        : getJobCardPermissionReason('complete', params.actor.role)
    );
  }

  const fromStage = resolveWorkflowStage(card);
  if (fromStage === targetStage) return;

  const { status: mappedStatus, requisitionStage: mappedReqStage } = mapWorkflowStageToLegacy(targetStage);
  const stageMeta = getWorkflowStageMeta(targetStage);
  const nowIso = new Date().toISOString();

  const historyEntry = createStatusHistoryEntry({
    fromStage,
    toStage: targetStage,
    fromStatus: card.status,
    toStatus: mappedStatus,
    changedBy: params.actorName,
    changedByUid: params.actor?.uid || auth.currentUser?.uid || undefined,
    changedByRole: params.actor?.role || undefined,
    changedAt: nowIso,
    reason: params.reason
  });

  const comment: ActivityComment = {
    id: `com-stage-${Date.now()}`,
    author: params.actorName,
    message: `Workflow stage updated: ${getWorkflowStageMeta(fromStage).shortLabel} → ${stageMeta.label}${params.reason ? ` (${params.reason})` : ''}`,
    timestamp: nowIso,
    type: 'status_change'
  };

  const updates: Partial<JobCard> = {
    workflowStage: targetStage,
    status: mappedStatus,
    requisitionStage: mappedReqStage,
    statusHistory: appendStatusHistory(card.statusHistory, historyEntry),
    comments: [...(card.comments || []), comment]
  };

  if (targetStage === 'WAITING_FOR_SHUTDOWN' || targetStage === 'WAITING_FOR_PARTS') {
    if (params.reason) {
      updates.holdReason = params.reason;
    }
  } else if (card.holdReason && targetStage === 'IN_PROGRESS') {
    updates.holdReason = '';
  }

  if (targetStage === 'CLOSED') {
    updates.hodSignedBy = params.actorName;
    updates.hodDigitalSignOff = {
      signedBy: params.actorName,
      signedAt: nowIso,
      notes: params.reason || 'Verified & closed via 8-stage approval workflow.'
    };
  }

  await updateJobCard(card.id, updates);

  eventBus.publish('JOB_CARD_STATUS_CHANGED', 'maintenance', {
    jobCardId: card.id,
    jobCardNumber: card.jobCardNumber,
    equipmentId: card.equipmentId,
    equipmentName: card.equipmentName,
    previousStatus: card.status,
    newStatus: mappedStatus,
    workflowStage: targetStage,
    actor: params.actorName
  }).catch(() => {});

  if (
    targetStage === 'WAITING_FOR_PARTS' ||
    targetStage === 'WAITING_FOR_SHUTDOWN' ||
    targetStage === 'WORK_COMPLETE' ||
    targetStage === 'CLOSED'
  ) {
    const notifType =
      targetStage === 'WORK_COMPLETE'
        ? 'JOB_CARD_WORK_COMPLETE'
        : targetStage === 'CLOSED'
        ? 'JOB_CARD_CLOSED'
        : 'JOB_CARD_HOLD';
    emitAppNotification({
      type: notifType,
      title: `${card.jobCardNumber} → ${stageMeta.label}`,
      message: `${card.equipmentName}${params.reason ? ` (${params.reason})` : ''} updated by ${params.actorName}.`,
      severity: targetStage === 'WORK_COMPLETE' ? 'ACTION_REQUIRED' : 'INFO',
      jobCardId: card.id,
      jobCardNumber: card.jobCardNumber,
      department: card.department,
      createdBy: params.actorName
    }).catch(() => {});
  }
}

export async function addLaborHours(
  card: JobCard,
  technician: string,
  date: string,
  hours: number,
  taskNotes: string,
  options?: {
    trade?: TechnicalTrade;
    rateType?: 'Standard' | 'Shift' | 'Standby Callout' | 'Overtime';
    shift?: ShiftGroup;
  },
  actor?: JobCardActorContext
): Promise<void> {
  if (actor && !canLogLaborOrHandover(actor.role, actor.email)) {
    throw new Error(getJobCardPermissionReason('labor', actor.role));
  }
  const newLog: LaborLog = {
    id: `lab-${Date.now()}`,
    technician,
    date,
    hours,
    taskNotes,
    loggedAt: new Date().toISOString(),
    trade: options?.trade,
    rateType: options?.rateType || 'Standard',
    shift: options?.shift
  };

  const updatedLaborLogs = [...(card.laborLogs || []), newLog];
  const newTotalHours = updatedLaborLogs.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);

  const rateTag = options?.rateType && options.rateType !== 'Standard' ? ` [${options.rateType}]` : '';
  const tradeTag = options?.trade ? ` (${options.trade})` : '';

  const comment: ActivityComment = {
    id: `com-lab-${Date.now()}`,
    author: technician,
    message: `Logged ${hours} hrs${rateTag}${tradeTag}: "${taskNotes}"`,
    timestamp: new Date().toISOString(),
    type: 'labor_logged'
  };

  const updatedComments = [...(card.comments || []), comment];

  await updateJobCard(card.id, {
    laborLogs: updatedLaborLogs,
    totalLaborHours: Number(newTotalHours.toFixed(2)),
    comments: updatedComments
  });

  // Publish Domain Event
  eventBus.publish('LABOR_LOGGED', 'maintenance', {
    jobCardId: card.id,
    jobCardNumber: card.jobCardNumber,
    technician,
    hours,
    taskNotes
  }).catch(err => console.error('[EventBus] Error publishing LABOR_LOGGED:', err));
}

export async function addShiftHandover(
  card: JobCard,
  handover: Omit<ShiftHandoverLog, 'id' | 'timestamp'>,
  actor?: JobCardActorContext
): Promise<void> {
  if (actor && !canLogLaborOrHandover(actor.role, actor.email)) {
    throw new Error(getJobCardPermissionReason('labor', actor.role));
  }
  const newHandover: ShiftHandoverLog = {
    id: `handover-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...handover
  };

  const updatedHandovers = [...(card.shiftHandovers || []), newHandover];

  const comment: ActivityComment = {
    id: `com-handover-${Date.now()}`,
    author: handover.handedOverBy,
    message: `🔄 Shift Handover from ${handover.fromShift} to ${handover.toShift} (Received by ${handover.handedOverTo}). Completed: ${handover.tasksCompleted}. Pending: ${handover.pendingTasks}${handover.hazardsOrIsolations ? ` | Isolations: ${handover.hazardsOrIsolations}` : ''}`,
    timestamp: new Date().toISOString(),
    type: 'handover'
  };

  const updatedComments = [...(card.comments || []), comment];

  await updateJobCard(card.id, {
    shiftHandovers: updatedHandovers,
    shiftAssigned: handover.toShift,
    assignedTo: handover.handedOverTo,
    comments: updatedComments
  });
}

export async function updateSafetyPermits(
  card: JobCard,
  permits: SafetyPermits,
  actor: string
): Promise<void> {
  const comment: ActivityComment = {
    id: `com-safety-${Date.now()}`,
    author: actor,
    message: `🛡️ Safety Permits updated: LOTO ${permits.lotoRequired ? (permits.lotoTag ? `Active (Tag: ${permits.lotoTag})` : 'Required') : 'Not Required'} | Hot Work ${permits.hotWorkRequired ? 'Required & Authorized' : 'Not Required'}`,
    timestamp: new Date().toISOString(),
    type: 'system'
  };

  const updatedComments = [...(card.comments || []), comment];

  await updateJobCard(card.id, {
    safetyPermits: permits,
    comments: updatedComments
  });
}

export async function addJobCardComment(
  card: JobCard,
  author: string,
  message: string
): Promise<void> {
  const comment: ActivityComment = {
    id: `com-${Date.now()}`,
    author,
    message,
    timestamp: new Date().toISOString(),
    type: 'comment'
  };

  const updatedComments = [...(card.comments || []), comment];

  await updateJobCard(card.id, {
    comments: updatedComments
  });
}

export async function deleteJobCard(
  id: string,
  actor?: JobCardActorContext
): Promise<void> {
  if (actor && !canDeleteJobCard(actor.role, actor.email)) {
    throw new Error(getJobCardPermissionReason('delete', actor.role));
  }
  const docRef = doc(db, COLLECTION_NAME, id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    throw error;
  }
}

// ==========================================
// SUPERVISOR & MANAGER WORKFLOW METHODS
// ==========================================

export async function acceptAndAssignRequisition(
  card: JobCard,
  params: {
    supervisorName: string;
    artisanName: string;
    trade?: TechnicalTrade;
    shift?: ShiftGroup;
    targetDate?: string;
    notes?: string;
  },
  actor?: JobCardActorContext
): Promise<void> {
  if (actor && !canAssignOrAcceptJobCard(actor.role, actor.email)) {
    throw new Error(getJobCardPermissionReason('assign', actor.role));
  }
  const nowIso = new Date().toISOString();
  const fromStage = resolveWorkflowStage(card);
  const historyEntry = createStatusHistoryEntry({
    fromStage,
    toStage: 'ACCEPTED',
    fromStatus: card.status,
    toStatus: 'In Progress',
    changedBy: params.supervisorName,
    changedByUid: actor?.uid || auth.currentUser?.uid || undefined,
    changedByRole: actor?.role || undefined,
    changedAt: nowIso,
    reason: `Assigned to ${params.artisanName} (${params.trade || card.tradeRequired || 'Maintenance'})`
  });

  const comment: ActivityComment = {
    id: `com-accept-${Date.now()}`,
    author: params.supervisorName,
    message: `Requisition accepted by ${params.supervisorName}. Assigned to Artisan: ${params.artisanName} (${params.trade || card.tradeRequired || 'Maintenance'})${params.shift ? ` on ${params.shift}` : ''}.${params.notes ? ` Instructions: "${params.notes}"` : ''}`,
    timestamp: nowIso,
    type: 'system'
  };

  const updatedComments = [...(card.comments || []), comment];

  await updateJobCard(card.id, {
    workflowStage: 'ACCEPTED',
    requisitionStage: 'Accepted',
    status: 'In Progress',
    statusHistory: appendStatusHistory(card.statusHistory, historyEntry),
    assignedSupervisor: params.supervisorName,
    assignedTo: params.artisanName,
    tradeRequired: params.trade || card.tradeRequired,
    shiftAssigned: params.shift || card.shiftAssigned,
    targetDate: params.targetDate || card.targetDate,
    acceptedAt: nowIso,
    acceptedBy: params.supervisorName,
    comments: updatedComments
  });

  eventBus.publish('JOB_CARD_STATUS_CHANGED', 'maintenance', {
    jobCardId: card.id,
    jobCardNumber: card.jobCardNumber,
    previousStatus: card.status,
    newStatus: 'In Progress',
    workflowStage: 'ACCEPTED',
    actor: params.supervisorName
  }).catch(() => {});

  emitAppNotification({
    type: 'JOB_CARD_ASSIGNED',
    title: `${card.jobCardNumber} Accepted & Assigned`,
    message: `Assigned to ${params.artisanName} on ${card.equipmentName}.`,
    severity: 'INFO',
    jobCardId: card.id,
    jobCardNumber: card.jobCardNumber,
    department: card.department,
    createdBy: params.supervisorName
  }).catch(() => {});
}

export async function addSparePartRequisition(
  card: JobCard,
  part: {
    partDescription: string;
    quantity: number;
    partNumber?: string;
    storeVoucherNumber?: string;
    requestedBy: string;
    markAsPendingSpares?: boolean;
    unitCostEmalangeni?: number;
  },
  actor?: JobCardActorContext
): Promise<void> {
  if (actor && !canRequestSpares(actor.role, actor.email)) {
    throw new Error(getJobCardPermissionReason('request_spares', actor.role));
  }
  const newItem = stripUndefinedDeep({
    id: `part-${Date.now()}`,
    partDescription: part.partDescription,
    quantity: part.quantity,
    partNumber: part.partNumber || '',
    storeVoucherNumber: part.storeVoucherNumber || '',
    requestedBy: part.requestedBy,
    requestedAt: new Date().toISOString(),
    status: 'Requested' as const,
    unitCostEmalangeni: part.unitCostEmalangeni
  });

  const updatedSpares = [...(card.sparesRequested || []), newItem];

  const comment: ActivityComment = {
    id: `com-spare-${Date.now()}`,
    author: part.requestedBy,
    message: `📦 Spares Requisition: Requested ${part.quantity}x ${part.partDescription} (Stores / Elliot Mhlongo)${part.partNumber ? ` [PN: ${part.partNumber}]` : ''}`,
    timestamp: new Date().toISOString(),
    type: 'comment'
  };

  const updatedComments = [...(card.comments || []), comment];

  const updates: Partial<JobCard> = {
    sparesRequested: updatedSpares,
    comments: updatedComments
  };

  if (part.markAsPendingSpares) {
    const nowIso = new Date().toISOString();
    const fromStage = resolveWorkflowStage(card);
    updates.status = 'Pending Spares';
    updates.requisitionStage = 'Pending Spares';
    updates.workflowStage = 'WAITING_FOR_PARTS';
    updates.holdReason = `Awaiting ${part.quantity}x ${part.partDescription}`;
    updates.statusHistory = appendStatusHistory(
      card.statusHistory,
      createStatusHistoryEntry({
        fromStage,
        toStage: 'WAITING_FOR_PARTS',
        fromStatus: card.status,
        toStatus: 'Pending Spares',
        changedBy: part.requestedBy,
        changedByUid: actor?.uid || auth.currentUser?.uid || undefined,
        changedByRole: actor?.role || undefined,
        changedAt: nowIso,
        reason: `Waiting for spare part: ${part.partDescription}`
      })
    );
  }

  await updateJobCard(card.id, updates);
}

export async function issueSparePart(
  card: JobCard,
  partId: string,
  params: {
    issuedBy: string;
    storeVoucherNumber: string;
  },
  actor?: JobCardActorContext
): Promise<void> {
  if (actor && !canIssueSpares(actor.role, actor.email)) {
    throw new Error(getJobCardPermissionReason('issue_spares', actor.role));
  }
  const spares = card.sparesRequested || [];
  const target = spares.find((p) => p.id === partId);
  if (!target) return;

  const updatedSpares = spares.map((p) =>
    p.id === partId
      ? {
          ...p,
          status: 'Issued' as const,
          issuedBy: params.issuedBy,
          issuedAt: new Date().toISOString(),
          storeVoucherNumber: params.storeVoucherNumber || p.storeVoucherNumber
        }
      : p
  );

  const comment: ActivityComment = {
    id: `com-issue-${Date.now()}`,
    author: params.issuedBy,
    message: `✅ Stores Issued: ${target.quantity}x ${target.partDescription} (Voucher #${params.storeVoucherNumber || 'Direct Issue'})`,
    timestamp: new Date().toISOString(),
    type: 'comment'
  };

  await updateJobCard(card.id, {
    sparesRequested: updatedSpares,
    comments: [...(card.comments || []), comment]
  });
}

export async function recordArtisanHandback(
  card: JobCard,
  params: {
    supervisorName: string;
    artisanName: string;
    completionDate: string;
    completionTime: string;
    hours: number;
    handbackNotes: string;
    trade?: TechnicalTrade;
  },
  actor?: JobCardActorContext
): Promise<void> {
  if (actor && !canRecordArtisanHandback(actor.role, actor.email)) {
    throw new Error(getJobCardPermissionReason('handback', actor.role));
  }
  // Create labor log from physical hours
  const newLog: LaborLog = {
    id: `lab-handback-${Date.now()}`,
    technician: params.artisanName,
    date: params.completionDate,
    hours: params.hours,
    taskNotes: `Artisan slip handback: ${params.handbackNotes}`,
    loggedAt: new Date().toISOString(),
    trade: params.trade || card.tradeRequired,
    rateType: card.requisitionType === 'Call Out' ? 'Standby Callout' : 'Standard',
    shift: card.shiftAssigned
  };

  const updatedLaborLogs = [...(card.laborLogs || []), newLog];
  const newTotalHours = updatedLaborLogs.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);

  const comment: ActivityComment = {
    id: `com-handback-${Date.now()}`,
    author: params.supervisorName,
    message: `📋 Physical Slip Handback Recorded by ${params.supervisorName}: Artisan ${params.artisanName} completed work (${params.hours} hrs). Notes: "${params.handbackNotes}"`,
    timestamp: new Date().toISOString(),
    type: 'system'
  };

  const nowIso = new Date().toISOString();
  const fromStage = resolveWorkflowStage(card);
  const historyEntry = createStatusHistoryEntry({
    fromStage,
    toStage: 'WORK_COMPLETE',
    fromStatus: card.status,
    toStatus: 'In Progress',
    changedBy: params.supervisorName,
    changedByUid: actor?.uid || auth.currentUser?.uid || undefined,
    changedByRole: actor?.role || undefined,
    changedAt: nowIso,
    reason: `Artisan slip handback logged (${params.hours}h by ${params.artisanName})`
  });

  await updateJobCard(card.id, {
    workflowStage: 'WORK_COMPLETE',
    requisitionStage: 'Artisan Completed',
    statusHistory: appendStatusHistory(card.statusHistory, historyEntry),
    completedByArtisan: params.artisanName,
    completionDate: params.completionDate,
    completionTime: params.completionTime,
    completionHours: params.hours,
    artisanHandbackNotes: params.handbackNotes,
    laborLogs: updatedLaborLogs,
    totalLaborHours: Number(newTotalHours.toFixed(2)),
    comments: [...(card.comments || []), comment]
  });

  emitAppNotification({
    type: 'JOB_CARD_WORK_COMPLETE',
    title: `${card.jobCardNumber} Ready for HOD Sign-Off`,
    message: `${params.artisanName} completed work (${params.hours}h) on ${card.equipmentName}.`,
    severity: 'ACTION_REQUIRED',
    jobCardId: card.id,
    jobCardNumber: card.jobCardNumber,
    department: card.department,
    createdBy: params.supervisorName
  }).catch(() => {});
}

export async function closeOutJobCardHOD(
  card: JobCard,
  params: {
    hodName: string;
    notes?: string;
  },
  actor?: JobCardActorContext
): Promise<void> {
  if (actor && !canHODSignOffJobCard(actor.role, actor.email)) {
    throw new Error(getJobCardPermissionReason('hod_signoff', actor.role));
  }
  const nowIso = new Date().toISOString();
  const fromStage = resolveWorkflowStage(card);
  const historyEntry = createStatusHistoryEntry({
    fromStage,
    toStage: 'CLOSED',
    fromStatus: card.status,
    toStatus: 'Completed',
    changedBy: params.hodName,
    changedByUid: actor?.uid || auth.currentUser?.uid || undefined,
    changedByRole: actor?.role || undefined,
    changedAt: nowIso,
    reason: params.notes || 'HOD Digital Sign-Off & Close-Out'
  });

  const comment: ActivityComment = {
    id: `com-hod-${Date.now()}`,
    author: params.hodName,
    message: `🎖️ Official HOD Digital Sign-Off by ${params.hodName} (Engineering Manager). Job card approved, completed, and closed.${params.notes ? ` Remarks: "${params.notes}"` : ''}`,
    timestamp: nowIso,
    type: 'status_change'
  };

  await updateJobCard(card.id, {
    workflowStage: 'CLOSED',
    requisitionStage: 'HOD Closed',
    status: 'Completed',
    statusHistory: appendStatusHistory(card.statusHistory, historyEntry),
    hodSignedBy: params.hodName,
    hodDigitalSignOff: {
      signedBy: params.hodName,
      signedAt: nowIso,
      notes: params.notes
    },
    comments: [...(card.comments || []), comment]
  });

  eventBus.publish('JOB_CARD_STATUS_CHANGED', 'maintenance', {
    jobCardId: card.id,
    jobCardNumber: card.jobCardNumber,
    previousStatus: card.status,
    newStatus: 'Completed',
    workflowStage: 'CLOSED',
    actor: params.hodName
  }).catch(() => {});
}

export async function createLinkedDepartmentJobCard(
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
  },
  userProfile: { uid: string; displayName: string; role?: JobCardActorContext['role']; email?: string | null },
  existingCards: JobCard[]
): Promise<{ childId: string; childJobCardNumber: string }> {
  if (!canSpawnLinkedJobCard(userProfile.role, userProfile.email)) {
    throw new Error(getJobCardPermissionReason('assign', userProfile.role));
  }

  const childJobCardNumber = generateNextJobCardNumber(params.departmentCategory, existingCards);
  const assignNow = params.assignImmediately !== false;
  const initialStage: JobCardWorkflowStage = assignNow ? 'ACCEPTED' : 'SUBMITTED';
  const legacy = mapWorkflowStageToLegacy(initialStage);

  const childId = await createJobCard(
    {
      jobCardNumber: childJobCardNumber,
      department: params.department,
      departmentCategory: params.departmentCategory,
      equipmentName: parentCard.equipmentName,
      equipmentId: parentCard.equipmentId || '',
      equipmentCode: parentCard.equipmentCode,
      electricalFeeder: parentCard.electricalFeeder,
      inspectionId: parentCard.inspectionId,
      inspectionReference: parentCard.inspectionReference,
      equipmentSpecs: parentCard.equipmentSpecs,
      workOrderNumber: parentCard.workOrderNumber,
      costCenter: parentCard.costCenter,
      requisitionType: parentCard.requisitionType || 'Normal',
      priority: params.priority,
      status: legacy.status,
      workflowStage: initialStage,
      requisitionStage: legacy.requisitionStage,
      description: params.description,
      assignedTo: params.assignedTo,
      assignedSupervisor: assignNow ? userProfile.displayName : undefined,
      acceptedBy: assignNow ? userProfile.displayName : undefined,
      acceptedAt: assignNow ? new Date().toISOString() : undefined,
      tradeRequired: params.tradeRequired,
      shiftAssigned: params.shiftAssigned || parentCard.shiftAssigned || 'Shift A',
      targetDate: params.targetDate || parentCard.targetDate,
      originatingDepartment: parentCard.department,
      recipientDepartment: params.department,
      originatedBy: userProfile.displayName,
      safetyPermits: parentCard.safetyPermits,
      dangerTagRequired: parentCard.dangerTagRequired,
      dangerTagNumber: parentCard.dangerTagNumber,
      parentJobCardId: parentCard.id,
      parentJobCardNumber: parentCard.jobCardNumber
    },
    userProfile
  );

  // Record a linked-spawn audit entry on the parent card (non-fatal if parent already locked by race)
  const linkComment: ActivityComment = {
    id: `com-link-${Date.now()}`,
    author: userProfile.displayName,
    message: `🔗 Spawned companion ${params.tradeRequired} job card ${childJobCardNumber} (${params.department}) assigned to ${params.assignedTo}.`,
    timestamp: new Date().toISOString(),
    type: 'system'
  };

  await updateJobCard(parentCard.id, {
    comments: [...(parentCard.comments || []), linkComment]
  }).catch((err) => console.warn('Could not append link comment to parent card:', err));

  emitAppNotification({
    type: 'COMPANION_JOB_CREATED',
    title: `Companion Job ${childJobCardNumber} Linked to ${parentCard.jobCardNumber}`,
    message: `${params.tradeRequired} dispatch to ${params.assignedTo} (${params.department}).`,
    severity: 'INFO',
    jobCardId: childId,
    jobCardNumber: childJobCardNumber,
    department: params.department,
    createdBy: userProfile.displayName
  }).catch(() => {});

  return { childId, childJobCardNumber };
}

export const MAX_JOB_CARD_ATTACHMENTS = 4;
export const MAX_JOB_CARD_ATTACHMENT_BYTES = 220_000;

export async function addJobCardAttachment(
  card: JobCard,
  attachment: JobCardAttachment,
  actor?: JobCardActorContext
): Promise<void> {
  if (actor && !canLogLaborOrHandover(actor.role, actor.email)) {
    throw new Error(getJobCardPermissionReason('labor', actor.role));
  }
  const existing = Array.isArray(card.attachments) ? card.attachments : [];
  if (existing.length >= MAX_JOB_CARD_ATTACHMENTS) {
    throw new Error(`Maximum ${MAX_JOB_CARD_ATTACHMENTS} attachments allowed per Job Card.`);
  }
  if (!attachment.dataUrl || attachment.dataUrl.length > MAX_JOB_CARD_ATTACHMENT_BYTES) {
    throw new Error('Attachment exceeds the 220 KB size limit.');
  }

  const nowIso = new Date().toISOString();
  const cleanAttachment: JobCardAttachment = stripUndefinedDeep({
    ...attachment,
    name: attachment.name.slice(0, 80),
    uploadedBy: attachment.uploadedBy.slice(0, 120),
    uploadedByUid: actor?.uid || auth.currentUser?.uid || undefined,
    uploadedAt: attachment.uploadedAt || nowIso,
    caption: attachment.caption?.slice(0, 200)
  });

  const comment: ActivityComment = {
    id: `com-att-${Date.now()}`,
    author: cleanAttachment.uploadedBy,
    message: `📎 Attached [${cleanAttachment.category}]: ${cleanAttachment.name}${cleanAttachment.caption ? ` — "${cleanAttachment.caption}"` : ''}`,
    timestamp: nowIso,
    type: 'system'
  };

  await updateJobCard(card.id, {
    attachments: [...existing, cleanAttachment],
    comments: [...(card.comments || []), comment]
  });
}

export async function removeJobCardAttachment(
  card: JobCard,
  attachmentId: string,
  actorName: string,
  actor?: JobCardActorContext
): Promise<void> {
  if (actor && !canAssignOrAcceptJobCard(actor.role, actor.email)) {
    throw new Error(getJobCardPermissionReason('assign', actor.role));
  }
  const existing = Array.isArray(card.attachments) ? card.attachments : [];
  const target = existing.find((a) => a.id === attachmentId);
  if (!target) return;

  const updated = existing.filter((a) => a.id !== attachmentId);
  const nowIso = new Date().toISOString();
  const comment: ActivityComment = {
    id: `com-att-rm-${Date.now()}`,
    author: actorName,
    message: `🗑️ Removed attachment: ${target.name}`,
    timestamp: nowIso,
    type: 'system'
  };

  await updateJobCard(card.id, {
    attachments: updated,
    comments: [...(card.comments || []), comment]
  });
}

