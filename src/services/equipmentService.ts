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
import { Equipment } from '../types';
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

export const INITIAL_EQUIPMENT_DATA: Omit<Equipment, 'id'>[] = [
  {
    code: 'EQ-BLR-101',
    name: 'High-Pressure Steam Boiler #1',
    department: 'Utilities - Boiler House',
    location: 'Boiler House Bay 1',
    status: 'Operational',
    criticality: 'Critical',
    lastServiceDate: '2026-09-15',
    nextServiceDate: '2026-11-15',
    activeJobCardsCount: 1,
    manufacturer: 'Babcock & Wilcox',
    modelNumber: 'BW-5000-STM',
    notes: 'Primary steam supply for distillation columns and grain mash cooker.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    code: 'EQ-TRB-201',
    name: 'Siemens Steam Co-Gen Turbine 2.5MW',
    department: 'Utilities - Turbine Power Plant',
    location: 'Turbine Hall Floor 2',
    status: 'Operational',
    criticality: 'Critical',
    lastServiceDate: '2026-10-01',
    nextServiceDate: '2026-12-01',
    activeJobCardsCount: 0,
    manufacturer: 'Siemens Energy',
    modelNumber: 'SST-300',
    notes: 'Generates on-site electricity from high-pressure process steam.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    code: 'EQ-FERM-301',
    name: 'Fermenter Tank 01 (60,000L Jacketed)',
    department: 'Production - Fermentation Bay',
    location: 'Fermentation Hall A',
    status: 'Operational',
    criticality: 'High',
    lastServiceDate: '2026-08-20',
    nextServiceDate: '2026-11-20',
    activeJobCardsCount: 0,
    manufacturer: 'Paul Mueller Company',
    modelNumber: 'PM-F60K',
    notes: 'Temperature-controlled glycol cooling jackets with CIP spray balls.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    code: 'EQ-FERM-302',
    name: 'Fermenter Tank 02 (60,000L Agitated)',
    department: 'Production - Fermentation Bay',
    location: 'Fermentation Hall A',
    status: 'Under Maintenance',
    criticality: 'High',
    lastServiceDate: '2026-10-10',
    nextServiceDate: '2026-11-01',
    activeJobCardsCount: 1,
    manufacturer: 'Paul Mueller Company',
    modelNumber: 'PM-F60K-AG',
    notes: 'Agitator gearbox seal inspection in progress.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    code: 'EQ-COL-401',
    name: 'Copper Pot Still Wash Column A',
    department: 'Production - Distillation Columns',
    location: 'Stillhouse Deck 1',
    status: 'Operational',
    criticality: 'Critical',
    lastServiceDate: '2026-09-05',
    nextServiceDate: '2026-12-05',
    activeJobCardsCount: 1,
    manufacturer: 'Forsyths of Rothes',
    modelNumber: 'FYS-COPPER-12K',
    notes: 'Traditional swan neck copper still with shell and tube condenser.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    code: 'EQ-MILL-501',
    name: 'Bühler 4-Roll Malt Grain Mill',
    department: 'Production - Mash & Grain Milling',
    location: 'Grist Mill Silo Tower',
    status: 'Operational',
    criticality: 'High',
    lastServiceDate: '2026-07-12',
    nextServiceDate: '2026-11-12',
    activeJobCardsCount: 1,
    manufacturer: 'Bühler Group',
    modelNumber: 'MDDK-1000',
    notes: 'Adjustable roll gap milling for barley, corn, and rye grist.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    code: 'EQ-WTR-601',
    name: 'Reverse Osmosis Water Purification Skid',
    department: 'Utilities - Water Treatment',
    location: 'Water Treatment Plant',
    status: 'Operational',
    criticality: 'High',
    lastServiceDate: '2026-10-05',
    nextServiceDate: '2026-11-30',
    activeJobCardsCount: 0,
    manufacturer: 'Ecolab Nalco',
    modelNumber: 'RO-PRO-400',
    notes: 'Purifies process spring water for mashing and boiler feed.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    code: 'EQ-FLT-701',
    name: 'Toyota 3.5T Electric Forklift Unit #4',
    department: 'Transport Workshop - Forklift Maintenance',
    location: 'Warehouse Dock A',
    status: 'Under Maintenance',
    criticality: 'Medium',
    lastServiceDate: '2026-10-18',
    nextServiceDate: '2026-11-05',
    activeJobCardsCount: 1,
    manufacturer: 'Toyota Material Handling',
    modelNumber: '8FB35',
    notes: 'Hydraulic lift cylinder seal overhaul.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

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
    const docRef = doc(collection(db, COLLECTION_NAME));
    await setDoc(docRef, item);
  }
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
