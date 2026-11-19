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
  Priority,
  LaborLog,
  ActivityComment,
  ShiftHandoverLog,
  SafetyPermits,
  TechnicalTrade,
  ShiftGroup
} from '../types';
import { eventBus } from '../core/events/eventBus';

const COLLECTION_NAME = 'jobCards';

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
  return onSnapshot(
    q,
    async (snapshot) => {
      if (snapshot.empty) {
        // If the collection is completely empty, seed initial distillery template cards
        try {
          await seedInitialJobCards();
        } catch (e) {
          console.warn('Could not auto-seed job cards:', e);
        }
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
  for (const item of INITIAL_JOB_CARDS) {
    const docRef = doc(collection(db, COLLECTION_NAME));
    await setDoc(docRef, item);
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
  userProfile?: { uid: string; displayName: string }
): Promise<string> {
  const docRef = doc(collection(db, COLLECTION_NAME));
  const uid = auth.currentUser?.uid || userProfile?.uid || 'anonymous-user';
  const name = auth.currentUser?.displayName || auth.currentUser?.email || userProfile?.displayName || 'Authorized Staff';

  const newCard: Omit<JobCard, 'id'> = {
    ...cardData,
    totalLaborHours: 0,
    laborLogs: [],
    comments: [
      {
        id: `com-init-${Date.now()}`,
        author: name,
        message: `Job Card created by ${name}`,
        timestamp: new Date().toISOString(),
        type: 'system'
      }
    ],
    createdById: uid,
    createdByName: name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

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

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${COLLECTION_NAME}/${docRef.id}`);
    throw error;
  }
}

export async function updateJobCard(id: string, updates: Partial<JobCard>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  try {
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    throw error;
  }
}

export async function updateJobCardStatus(
  card: JobCard,
  newStatus: JobCardStatus,
  authorName: string
): Promise<void> {
  const comment: ActivityComment = {
    id: `com-status-${Date.now()}`,
    author: authorName,
    message: `Status changed from ${card.status} to ${newStatus}`,
    timestamp: new Date().toISOString(),
    type: 'status_change'
  };

  const updatedComments = [...(card.comments || []), comment];

  await updateJobCard(card.id, {
    status: newStatus,
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
    actor: authorName
  }).catch(err => console.error('[EventBus] Error publishing JOB_CARD_STATUS_CHANGED:', err));
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
  }
): Promise<void> {
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
  handover: Omit<ShiftHandoverLog, 'id' | 'timestamp'>
): Promise<void> {
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

export async function deleteJobCard(id: string): Promise<void> {
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
  }
): Promise<void> {
  const comment: ActivityComment = {
    id: `com-accept-${Date.now()}`,
    author: params.supervisorName,
    message: `Requisition accepted by ${params.supervisorName}. Assigned to Artisan: ${params.artisanName} (${params.trade || card.tradeRequired || 'Maintenance'})${params.shift ? ` on ${params.shift}` : ''}.${params.notes ? ` Instructions: "${params.notes}"` : ''}`,
    timestamp: new Date().toISOString(),
    type: 'system'
  };

  const updatedComments = [...(card.comments || []), comment];

  await updateJobCard(card.id, {
    requisitionStage: 'Accepted',
    status: 'In Progress',
    assignedSupervisor: params.supervisorName,
    assignedTo: params.artisanName,
    tradeRequired: params.trade || card.tradeRequired,
    shiftAssigned: params.shift || card.shiftAssigned,
    targetDate: params.targetDate || card.targetDate,
    acceptedAt: new Date().toISOString(),
    acceptedBy: params.supervisorName,
    comments: updatedComments
  });

  eventBus.publish('JOB_CARD_STATUS_CHANGED', 'maintenance', {
    jobCardId: card.id,
    jobCardNumber: card.jobCardNumber,
    previousStatus: card.status,
    newStatus: 'In Progress',
    actor: params.supervisorName
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
  }
): Promise<void> {
  const newItem = {
    id: `part-${Date.now()}`,
    partDescription: part.partDescription,
    quantity: part.quantity,
    partNumber: part.partNumber || '',
    storeVoucherNumber: part.storeVoucherNumber || '',
    requestedBy: part.requestedBy,
    requestedAt: new Date().toISOString(),
    status: 'Requested' as const,
    unitCostEmalangeni: part.unitCostEmalangeni
  };

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
    updates.status = 'Pending Spares';
    updates.requisitionStage = 'Pending Spares';
  }

  await updateJobCard(card.id, updates);
}

export async function issueSparePart(
  card: JobCard,
  partId: string,
  params: {
    issuedBy: string;
    storeVoucherNumber: string;
  }
): Promise<void> {
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
  }
): Promise<void> {
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

  await updateJobCard(card.id, {
    requisitionStage: 'Artisan Completed',
    completedByArtisan: params.artisanName,
    completionDate: params.completionDate,
    completionTime: params.completionTime,
    completionHours: params.hours,
    artisanHandbackNotes: params.handbackNotes,
    laborLogs: updatedLaborLogs,
    totalLaborHours: Number(newTotalHours.toFixed(2)),
    comments: [...(card.comments || []), comment]
  });
}

export async function closeOutJobCardHOD(
  card: JobCard,
  params: {
    hodName: string;
    notes?: string;
  }
): Promise<void> {
  const comment: ActivityComment = {
    id: `com-hod-${Date.now()}`,
    author: params.hodName,
    message: `🎖️ Official HOD Digital Sign-Off by ${params.hodName} (Engineering Manager). Job card approved, completed, and closed.${params.notes ? ` Remarks: "${params.notes}"` : ''}`,
    timestamp: new Date().toISOString(),
    type: 'status_change'
  };

  await updateJobCard(card.id, {
    requisitionStage: 'HOD Closed',
    status: 'Completed',
    hodSignedBy: params.hodName,
    hodDigitalSignOff: {
      signedBy: params.hodName,
      signedAt: new Date().toISOString(),
      notes: params.notes
    },
    comments: [...(card.comments || []), comment]
  });

  eventBus.publish('JOB_CARD_STATUS_CHANGED', 'maintenance', {
    jobCardId: card.id,
    jobCardNumber: card.jobCardNumber,
    previousStatus: card.status,
    newStatus: 'Completed',
    actor: params.hodName
  }).catch(() => {});
}
