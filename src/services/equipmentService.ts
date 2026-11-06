import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Equipment, EquipmentModificationLog } from '../types';
import { eventBus, JobCardStatusChangedPayload } from '../core/events/eventBus';

const COLLECTION_NAME = 'equipment';

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

import { PLANT_EQUIPMENT_REGISTRY } from '../core/master-data/plantEquipment';

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
        // Pre-seed default distillery equipment if first time
        try {
          await seedInitialEquipment();
        } catch (e) {
          console.warn('Could not auto-seed equipment:', e);
        }
        return;
      }
      const items: Equipment[] = snapshot.docs.map((d) => {
        const data = d.data();
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

export async function seedInitialEquipment() {
  for (const item of INITIAL_EQUIPMENT_DATA) {
    const docId = item.code.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const docRef = doc(db, COLLECTION_NAME, docId);
    await setDoc(docRef, item, { merge: true });
  }
}

/**
 * Idempotently syncs all 105 active plant machinery items from the official
 * USA Distillers Electrical Plant Checklist into Firestore.
 */
export async function syncOfficialPlantEquipmentRegistry(): Promise<{ syncedCount: number }> {
  let count = 0;
  for (const item of PLANT_EQUIPMENT_REGISTRY) {
    const docId = item.code.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const docRef = doc(db, COLLECTION_NAME, docId);
    await setDoc(docRef, {
      ...item,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    count++;
  }
  return { syncedCount: count };
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
    await setDoc(docRef, newEquipment);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${COLLECTION_NAME}/${docRef.id}`);
    throw error;
  }
}

export async function updateEquipment(id: string, updates: Partial<Equipment>): Promise<void> {
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
  }
): Promise<void> {
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

  const newHistory = [logEntry, ...existingHistory];

  try {
    await updateDoc(docRef, {
      ...updates,
      modificationHistory: newHistory,
      updatedAt: new Date().toISOString()
    });

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
