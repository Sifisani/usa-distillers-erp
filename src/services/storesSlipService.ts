import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, firebaseRuntimeInfo } from '../firebase';
import {
  StoresRequisitionSlip,
  StoresSlipItem,
  JobCard,
  SparePartItem,
  ActivityComment
} from '../types';
import { eventBus } from '../core/events/eventBus';

const STORES_SLIPS_COLLECTION = 'storesSlips';
const JOB_CARDS_COLLECTION = 'jobCards';

// Initial Seed Data: Realistic factory stores slips (including authentic slip #302857 from stors2_5afe982c.pdf)
export const INITIAL_STORES_SLIPS_SEED: StoresRequisitionSlip[] = [
  {
    id: 'slip-302857',
    slipNumber: '302857',
    bookType: 'Mechanical',
    date: new Date().toISOString().split('T')[0],
    jobCardNumber: 'JC-2026-0001',
    workOrderNumber: '188499',
    equipmentName: 'Boiler 1 Feed Water Pump 1 (75 kW)',
    department: 'Utilities - Boiler House',
    costCenter: '2100 - Boiler House',
    requestedByArtisan: 'Ndumiso Shongwe (Artisan Mechanical)',
    issuerSignature: 'Elliot Mhlongo (Stores Officer)',
    receivedBySignature: 'Ndumiso Shongwe',
    items: [
      {
        id: 'item-1',
        quantity: 2,
        description: 'SKF 6308-2RS C3 Deep Groove Ball Bearings',
        partNumber: 'BRG-6308-2RS',
        unitCostEmalangeni: 480.0
      },
      {
        id: 'item-2',
        quantity: 1,
        description: 'Burgmann Mechanical Seal MG1-35mm Silicon/Silicon',
        partNumber: 'SEAL-MG1-35',
        unitCostEmalangeni: 2450.0
      },
      {
        id: 'item-3',
        quantity: 1,
        description: 'Klinger C4400 2mm Gasket Sheet (Pre-cut flange)',
        partNumber: 'GSK-KL-C4400',
        unitCostEmalangeni: 320.0
      }
    ],
    status: 'Issued',
    hodVerification: {
      verified: true,
      verifiedBy: 'Antonio Miranda (HOD Engineering)',
      verifiedAt: new Date(Date.now() - 3600000).toISOString(),
      notes: 'Triplicate copies 1 & 2 verified against maintenance work order WO #188499.'
    },
    notes: 'Urgent breakdown spare withdrawal during morning shift. High-pressure feed pump vibration.',
    createdAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'slip-302858',
    slipNumber: '302858',
    bookType: 'Electrical',
    date: new Date().toISOString().split('T')[0],
    jobCardNumber: 'JC-2026-0002',
    workOrderNumber: '188492',
    equipmentName: 'Fermenter 2 Top Agitator Motor (15 kW)',
    department: 'Fermentation Plant',
    costCenter: '2400 - Fermentation Plant',
    requestedByArtisan: 'Scelo Simelane (Artisan Electrical)',
    issuerSignature: 'Elliot Mhlongo (Stores Officer)',
    receivedBySignature: 'Scelo Simelane',
    items: [
      {
        id: 'item-4',
        quantity: 1,
        description: 'Schneider LC1D32M7 32A 220V Contactor',
        partNumber: 'EL-CONT-32A',
        unitCostEmalangeni: 890.0
      },
      {
        id: 'item-5',
        quantity: 1,
        description: 'LRD332 Thermal Overload Relay 23-32A',
        partNumber: 'EL-OLR-2332',
        unitCostEmalangeni: 650.0
      }
    ],
    status: 'Pending Verification',
    hodVerification: {
      verified: false
    },
    notes: 'Fermenter agitator tripped on phase imbalance; coil burnt out.',
    createdAt: new Date(Date.now() - 14400000).toISOString()
  }
];

let hasAttemptedSeed = false;

/**
 * Subscribe to realtime Stores Issue Requisition Slips
 */
export function subscribeStoresSlips(
  callback: (slips: StoresRequisitionSlip[]) => void,
  onError?: (error: Error) => void
) {
  const slipsRef = collection(db, STORES_SLIPS_COLLECTION);
  const q = query(slipsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    async (snapshot) => {
      if (snapshot.empty) {
        if (!firebaseRuntimeInfo.isProduction && !hasAttemptedSeed) {
          hasAttemptedSeed = true;
          try {
            const batch = writeBatch(db);
            for (const item of INITIAL_STORES_SLIPS_SEED) {
              batch.set(doc(db, STORES_SLIPS_COLLECTION, item.id), item);
            }
            await batch.commit();
            return;
          } catch (e) {
            console.warn('[StoresSlipService] Auto-seed failed:', e);
          }
        }
        callback([]);
        return;
      }

      const slips: StoresRequisitionSlip[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as StoresRequisitionSlip;
        slips.push({
          ...data,
          id: d.id,
          items: Array.isArray(data.items) ? data.items : []
        });
      });

      callback(slips);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, STORES_SLIPS_COLLECTION);
      } catch (wrappedErr) {
        if (onError) onError(wrappedErr as Error);
      }
    }
  );
}

/**
 * Log a new Physical Stores Issue Requisition Slip (#302857)
 * Directly binds items to the linked Job Card and updates job card state
 */
export async function createStoresSlip(
  slipData: Omit<StoresRequisitionSlip, 'id' | 'createdAt' | 'status'> & {
    status?: StoresRequisitionSlip['status'];
  },
  options?: {
    currentUser?: string;
  }
): Promise<StoresRequisitionSlip> {
  const docId = `slip-${slipData.slipNumber.trim()}-${Date.now()}`;
  const now = new Date().toISOString();

  const newSlip: StoresRequisitionSlip = {
    ...slipData,
    id: docId,
    slipNumber: slipData.slipNumber.trim(),
    status: slipData.status || 'Issued',
    createdAt: now,
    updatedAt: now,
    hodVerification: slipData.hodVerification || {
      verified: false
    }
  };

  try {
    // 1. Save Stores Requisition Slip document in Firestore
    await setDoc(doc(db, STORES_SLIPS_COLLECTION, docId), newSlip);

    // 2. Synchronize to linked Job Card if specified
    if (slipData.jobCardId) {
      const jobCardRef = doc(db, JOB_CARDS_COLLECTION, slipData.jobCardId);
      const jcSnap = await getDoc(jobCardRef);

      if (jcSnap.exists()) {
        const existingCard = jcSnap.data() as JobCard;
        const currentSpares = existingCard.sparesRequested || [];

        // Convert slip items to SparePartItem shape
        const newSpareItems: SparePartItem[] = slipData.items.map((item, idx) => ({
          id: `sp-slip-${slipData.slipNumber}-${idx}-${Date.now()}`,
          partDescription: item.description,
          quantity: item.quantity,
          partNumber: item.partNumber || '',
          storeVoucherNumber: slipData.slipNumber,
          requisitionSlipNumber: slipData.slipNumber,
          costCenter: slipData.costCenter,
          teamBook: `${slipData.bookType} Team Book`,
          requestedBy: slipData.requestedByArtisan,
          requestedAt: slipData.date || now,
          issuedBy: slipData.issuerSignature,
          issuedAt: now,
          status: 'Issued',
          unitCostEmalangeni: item.unitCostEmalangeni
        }));

        const updatedSpares = [...currentSpares, ...newSpareItems];

        // Activity chatter comment
        const comment: ActivityComment = {
          id: `com-slip-${Date.now()}`,
          author: slipData.issuerSignature || options?.currentUser || 'Stores Officer',
          message: `📦 Stores Issue Slip #${slipData.slipNumber} logged: Issued ${slipData.items.length} item(s) to ${slipData.requestedByArtisan} (${slipData.bookType} Team Book).`,
          timestamp: now,
          type: 'comment'
        };

        const updates: Partial<JobCard> = {
          sparesRequested: updatedSpares,
          comments: [...(existingCard.comments || []), comment]
        };

        // If card was waiting for spares, automatically advance to In Progress
        if (existingCard.status === 'Pending Spares') {
          updates.status = 'In Progress';
          updates.requisitionStage = 'In Progress';
        }

        await updateDoc(jobCardRef, updates);
      }
    }

    // 3. Publish domain event
    eventBus.publish('STORES_SLIP_LOGGED', 'stores', {
      slipId: docId,
      slipNumber: newSlip.slipNumber,
      bookType: newSlip.bookType,
      jobCardNumber: newSlip.jobCardNumber,
      itemCount: newSlip.items.length,
      requestedBy: newSlip.requestedByArtisan,
      issuedBy: newSlip.issuerSignature
    }).catch((err) => console.error('[EventBus] Error publishing STORES_SLIP_LOGGED:', err));

    return newSlip;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${STORES_SLIPS_COLLECTION}/${docId}`);
    throw error;
  }
}

/**
 * HOD Verification of Physical Stores Issue Slip (Triplicate Copies 1 & 2)
 * Performed by Antonio Miranda (HOD Engineering) or relevant Maintenance HOD
 */
export async function verifyStoresSlipHOD(
  slip: StoresRequisitionSlip,
  params: {
    verifiedBy: string;
    notes?: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const slipRef = doc(db, STORES_SLIPS_COLLECTION, slip.id);

  const updatedVerification = {
    verified: true,
    verifiedBy: params.verifiedBy,
    verifiedAt: now,
    notes: params.notes || 'HOD verified physical original and duplicate copies against work order.'
  };

  try {
    await updateDoc(slipRef, {
      status: 'Verified',
      hodVerification: updatedVerification,
      updatedAt: now
    });

    // If linked to a Job Card, append verification notice in chatter
    if (slip.jobCardId) {
      const jobCardRef = doc(db, JOB_CARDS_COLLECTION, slip.jobCardId);
      const jcSnap = await getDoc(jobCardRef);
      if (jcSnap.exists()) {
        const existingCard = jcSnap.data() as JobCard;
        const comment: ActivityComment = {
          id: `com-hod-verify-${Date.now()}`,
          author: params.verifiedBy,
          message: `✅ HOD Stores Slip Verified: ${params.verifiedBy} verified physical Stores Issue Slip #${slip.slipNumber} (${slip.bookType} Book) against maintenance records.`,
          timestamp: now,
          type: 'comment'
        };
        await updateDoc(jobCardRef, {
          comments: [...(existingCard.comments || []), comment]
        });
      }
    }

    // Publish domain event
    eventBus.publish('STORES_SLIP_VERIFIED', 'stores', {
      slipId: slip.id,
      slipNumber: slip.slipNumber,
      verifiedBy: params.verifiedBy,
      jobCardNumber: slip.jobCardNumber
    }).catch((err) => console.error('[EventBus] Error publishing STORES_SLIP_VERIFIED:', err));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${STORES_SLIPS_COLLECTION}/${slip.id}`);
    throw error;
  }
}
