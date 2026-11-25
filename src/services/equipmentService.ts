import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  Equipment,
  EquipmentModificationLog,
  JobCard,
  PowerDistributionNode
} from '../types';
import { eventBus, JobCardStatusChangedPayload } from '../core/events/eventBus';
import { PLANT_EQUIPMENT_REGISTRY } from '../core/master-data/plantEquipment';
import {
  DEFAULT_POWER_NODES,
  resolveEquipmentFeederInfo
} from '../core/master-data/powerDistributionData';
import {
  validateEquipmentIntegrity,
  validateSafeEquipmentDelete
} from '../core/electrical/permissions';

const COLLECTION_NAME = 'equipment';

function sanitizeForFirestore<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// Decoupled inter-module event listener: Maintenance module -> Equipment Master Data
eventBus.subscribe<JobCardStatusChangedPayload>('JOB_CARD_STATUS_CHANGED', async (event) => {
  const { equipmentId, newStatus, jobCardNumber } = event.payload;
  if (!equipmentId) return;

  try {
    if (newStatus === 'In Progress' || newStatus === 'Pending Spares') {
      await updateEquipment(equipmentId, {
        status: 'Under Maintenance',
        notes: `Automated maintenance sync: ${jobCardNumber} is currently ${newStatus}.`
      });
      eventBus.publish('EQUIPMENT_STATUS_CHANGED', 'equipment', {
        equipmentId,
        equipmentCode: equipmentId,
        previousStatus: 'Operational',
        newStatus: 'Under Maintenance',
        reason: `Linked to active Job Card: ${jobCardNumber}`
      });
    }
  } catch (err) {
    console.warn(`[EquipmentService] Could not auto-sync equipment ${equipmentId}:`, err);
  }
});

export const INITIAL_EQUIPMENT_DATA: Omit<Equipment, 'id'>[] = PLANT_EQUIPMENT_REGISTRY;

export function subscribeEquipment(
  onUpdate: (equipment: Equipment[]) => void,
  onError?: (error: Error) => void
) {
  const q = collection(db, COLLECTION_NAME);
  return onSnapshot(
    q,
    async (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
        return;
      }
      const items: Equipment[] = snapshot.docs.map((d) => {
        const data = d.data();
        const resolvedFeeder = resolveEquipmentFeederInfo(data);
        return {
          id: d.id,
          code: data.code || data.equipmentCode || `EQ-${d.id.substring(0, 5).toUpperCase()}`,
          name: data.name || data.equipmentName || 'Plant Machinery Asset',
          department: data.department || 'Engineering - Mechanical Maintenance',
          location: data.location || 'General Plant Facility',
          status: data.status || 'Operational',
          criticality: data.criticality || 'Medium',
          lastServiceDate: data.lastServiceDate || '',
          nextServiceDate: data.nextServiceDate || '',
          activeJobCardsCount: typeof data.activeJobCardsCount === 'number' ? data.activeJobCardsCount : 0,
          manufacturer: data.manufacturer || '',
          modelNumber: data.modelNumber || '',
          serialNumber: data.serialNumber || '',
          notes: data.notes || '',
          // Electrical & Plant checklist specs
          speedRpm: typeof data.speedRpm === 'number' ? data.speedRpm : undefined,
          powerKw: typeof data.powerKw === 'number' ? data.powerKw : undefined,
          ratedCurrentAmps: typeof data.ratedCurrentAmps === 'number' ? data.ratedCurrentAmps : undefined,
          loadCurrentAmps: typeof data.loadCurrentAmps === 'number' ? data.loadCurrentAmps : undefined,
          overloadAmps: typeof data.overloadAmps === 'number' ? data.overloadAmps : undefined,
          starterType: data.starterType || undefined,
          plantArea: data.plantArea || undefined,
          feederNodeId: data.feederNodeId || resolvedFeeder.breakerId,
          feederPanel: data.feederPanel || resolvedFeeder.feederPanel,
          transformerSource: data.transformerSource || resolvedFeeder.transformerSource,
          feederBreaker: data.feederBreaker || resolvedFeeder.feederBreaker,
          modificationHistory: Array.isArray(data.modificationHistory) ? data.modificationHistory : [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        };
      });
      // Sort alphabetically by code
      items.sort((a, b) => a.code.localeCompare(b.code));
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

async function batchUpsertEquipment(
  items: Omit<Equipment, 'id'>[],
  stampUpdatedAt: boolean
): Promise<number> {
  if (!auth.currentUser) {
    throw new Error('Authentication required before initializing plant equipment.');
  }
  const CHUNK_SIZE = 400;
  const nowIso = new Date().toISOString();
  let count = 0;

  try {
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const item of chunk) {
        const docId = item.code.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const docRef = doc(db, COLLECTION_NAME, docId);
        const payload = stampUpdatedAt ? { ...item, updatedAt: nowIso } : item;
        batch.set(docRef, sanitizeForFirestore(payload), { merge: true });
        count++;
      }
      await batch.commit();
    }
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
    throw error;
  }
}

export async function seedInitialEquipment(): Promise<void> {
  await batchUpsertEquipment(INITIAL_EQUIPMENT_DATA, false);
}

/**
 * Idempotently syncs all 105 active plant machinery items from the official
 * USA Distillers Electrical Plant Checklist into Firestore via batched writes.
 */
export async function syncOfficialPlantEquipmentRegistry(): Promise<{ syncedCount: number }> {
  const syncedCount = await batchUpsertEquipment(PLANT_EQUIPMENT_REGISTRY, true);
  return { syncedCount };
}

export async function createEquipment(data: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = doc(collection(db, COLLECTION_NAME));
  const newEquipment: Omit<Equipment, 'id'> = {
    ...data,
    activeJobCardsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  try {
    await setDoc(docRef, sanitizeForFirestore(newEquipment));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${COLLECTION_NAME}/${docRef.id}`);
    throw error;
  }
}

/**
 * Integrity-checked equipment creation preventing duplicate asset tags and orphaned feeder links.
 */
export async function safeCreateEquipment(
  data: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>,
  existingEquipment: Equipment[],
  validPowerNodes: PowerDistributionNode[] = DEFAULT_POWER_NODES
): Promise<string> {
  const integrity = validateEquipmentIntegrity(
    {
      code: data.code,
      name: data.name,
      feederNodeId: data.feederNodeId,
      feederPanel: data.feederPanel ? String(data.feederPanel) : undefined
    },
    existingEquipment,
    validPowerNodes
  );
  if (!integrity.valid) {
    throw new Error(integrity.error || 'Equipment integrity validation failed.');
  }
  return createEquipment({
    ...data,
    code: data.code.trim().toUpperCase(),
    name: data.name.trim()
  });
}

export async function updateEquipment(id: string, updates: Partial<Equipment>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  try {
    await updateDoc(docRef, sanitizeForFirestore({
      ...updates,
      updatedAt: new Date().toISOString()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    throw error;
  }
}

/**
 * Technician-permitted inspection / clamp-meter update.
 * Mutates only inspection fields + audit trail without altering electrical topology.
 */
export async function updateEquipmentInspectionFields(
  equipment: Equipment,
  inspection: {
    loadCurrentAmps?: number;
    status?: Equipment['status'];
    notes?: string;
    lastServiceDate?: string;
    nextServiceDate?: string;
  },
  audit: {
    inspectedBy: string;
    reason: string;
  }
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, equipment.id);
  const logEntry: EquipmentModificationLog = {
    id: `insp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    modifiedBy: audit.inspectedBy,
    changeType: 'INSPECTION',
    summary: `Field Inspection: Load ${inspection.loadCurrentAmps ?? equipment.loadCurrentAmps ?? '—'}A, Status ${inspection.status ?? equipment.status}`,
    reason: audit.reason.trim() || 'Routine clamp-meter / condition inspection',
    previousValues: {
      loadCurrentAmps: equipment.loadCurrentAmps,
      status: equipment.status
    },
    newValues: {
      loadCurrentAmps: inspection.loadCurrentAmps ?? equipment.loadCurrentAmps,
      status: inspection.status ?? equipment.status
    }
  };

  const existingHistory = Array.isArray(equipment.modificationHistory)
    ? equipment.modificationHistory
    : [];
  const newHistory = [logEntry, ...existingHistory].slice(0, 150);

  const safeUpdates: Record<string, unknown> = {
    modificationHistory: newHistory,
    updatedAt: new Date().toISOString()
  };
  if (inspection.loadCurrentAmps !== undefined) safeUpdates.loadCurrentAmps = inspection.loadCurrentAmps;
  if (inspection.status !== undefined) safeUpdates.status = inspection.status;
  if (inspection.notes !== undefined) safeUpdates.notes = inspection.notes;
  if (inspection.lastServiceDate !== undefined) safeUpdates.lastServiceDate = inspection.lastServiceDate;
  if (inspection.nextServiceDate !== undefined) safeUpdates.nextServiceDate = inspection.nextServiceDate;

  try {
    await updateDoc(docRef, sanitizeForFirestore(safeUpdates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${equipment.id}`);
    throw error;
  }
}

export async function deleteEquipment(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    throw error;
  }
}

/**
 * Deletes an equipment asset ONLY after verifying zero historical/active jobCards reference it.
 */
export async function safeDeleteEquipmentWithCheck(
  equipment: Equipment,
  jobCards: JobCard[]
): Promise<void> {
  const check = validateSafeEquipmentDelete(equipment, jobCards);
  if (!check.canDelete) {
    throw new Error(check.error || 'Equipment is referenced by historical job cards.');
  }
  await deleteEquipment(equipment.id);
}

/**
 * Updates plant machinery with mandatory engineering audit trail and lineage.
 * Guarantees zero disruption to existing historical job cards.
 */
export async function modifyEquipmentWithAudit(
  equipment: Equipment,
  updates: Partial<Equipment>,
  audit: {
    modifiedBy: string;
    changeType: EquipmentModificationLog['changeType'];
    summary: string;
    reason: string;
    previousValues?: Record<string, any>;
    newValues?: Record<string, any>;
  },
  context?: {
    existingEquipment?: Equipment[];
    validPowerNodes?: PowerDistributionNode[];
  }
): Promise<void> {
  if (context?.existingEquipment || updates.code || updates.feederNodeId || updates.feederPanel) {
    const candidateCode = updates.code ?? equipment.code;
    const candidateName = updates.name ?? equipment.name;
    const existingList = context?.existingEquipment || [];
    const validNodes = context?.validPowerNodes || DEFAULT_POWER_NODES;
    const check = validateEquipmentIntegrity(
      {
        code: candidateCode,
        name: candidateName,
        feederNodeId: updates.feederNodeId,
        feederPanel: updates.feederPanel ? String(updates.feederPanel) : undefined
      },
      existingList,
      validNodes,
      equipment.id
    );
    if (!check.valid) {
      throw new Error(check.error || 'Equipment modification integrity validation failed.');
    }
  }

  const docRef = doc(db, COLLECTION_NAME, equipment.id);
  const logEntry: EquipmentModificationLog = {
    id: `mod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    modifiedBy: audit.modifiedBy,
    changeType: audit.changeType,
    summary: audit.summary,
    reason: audit.reason,
    previousValues: audit.previousValues,
    newValues: audit.newValues
  };

  const existingHistory = Array.isArray(equipment.modificationHistory)
    ? equipment.modificationHistory
    : [];

  const newHistory = [logEntry, ...existingHistory].slice(0, 150);

  try {
    await updateDoc(docRef, sanitizeForFirestore({
      ...updates,
      modificationHistory: newHistory,
      updatedAt: new Date().toISOString()
    }));

    eventBus.publish('EQUIPMENT_MODIFIED', 'equipment', {
      equipmentId: equipment.id,
      equipmentCode: equipment.code,
      changeType: audit.changeType,
      modifiedBy: audit.modifiedBy,
      reason: audit.reason
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${equipment.id}`);
    throw error;
  }
}
