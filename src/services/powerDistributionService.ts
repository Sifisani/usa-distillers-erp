import {
  collection,
  doc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { PowerDistributionNode, EquipmentModificationLog } from '../types';
import { DEFAULT_POWER_NODES } from '../core/master-data/powerDistributionData';

const COLLECTION_NAME = 'powerDistributionNodes';

/**
 * Recursively strips undefined values before writing to Firestore (which rejects undefined fields).
 */
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

/**
 * Subscribes to Firestore overrides for Power Distribution SLD nodes and merges
 * them cleanly on top of DEFAULT_POWER_NODES (v2.0 Block Diagram master topology).
 */
export function subscribePowerNodes(
  onUpdate: (nodes: PowerDistributionNode[]) => void,
  onError?: (error: Error) => void
) {
  const q = collection(db, COLLECTION_NAME);
  return onSnapshot(
    q,
    (snapshot) => {
      const overrideMap = new Map<string, Partial<PowerDistributionNode>>();
      snapshot.docs.forEach((d) => {
        overrideMap.set(d.id, d.data() as Partial<PowerDistributionNode>);
      });

      const merged: PowerDistributionNode[] = DEFAULT_POWER_NODES.map((baseNode) => {
        const override = overrideMap.get(baseNode.id);
        if (!override) return baseNode;
        return {
          ...baseNode,
          ...override,
          id: baseNode.id,
          modificationHistory: Array.isArray(override.modificationHistory)
            ? override.modificationHistory
            : baseNode.modificationHistory || []
        };
      });

      // Include any custom added nodes if present in Firestore
      snapshot.docs.forEach((d) => {
        if (!DEFAULT_POWER_NODES.some(n => n.id === d.id)) {
          const data = d.data() as PowerDistributionNode;
          merged.push({ ...data, id: d.id });
        }
      });

      onUpdate(merged);
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

/**
 * Updates any SLD component (circuit breaker C1-C20, transformer, fuse, busbar, source)
 * with mandatory engineering audit log persisted to Firestore.
 */
export async function updatePowerNodeWithAudit(
  existingNode: PowerDistributionNode,
  updates: Partial<PowerDistributionNode>,
  audit: {
    modifiedBy: string;
    approvedBy?: string;
    changeType?: EquipmentModificationLog['changeType'];
    summary: string;
    reason: string;
    previousValues?: Record<string, any>;
    newValues?: Record<string, any>;
  }
): Promise<PowerDistributionNode> {
  const now = new Date().toISOString();
  const approver = audit.approvedBy || audit.modifiedBy || 'Engineering Supervisor';
  const newLogEntry: EquipmentModificationLog = {
    id: `sld-mod-${Date.now()}`,
    timestamp: now,
    modifiedBy: audit.modifiedBy || 'Engineering Supervisor',
    approvedBy: approver,
    approvedAt: now,
    changeType: audit.changeType || 'SPECS_UPDATE',
    summary: audit.summary,
    reason: audit.reason,
    previousValues: audit.previousValues,
    newValues: audit.newValues
  };

  const mergedNode: PowerDistributionNode = {
    ...existingNode,
    ...updates,
    id: existingNode.id,
    updatedAt: now,
    updatedBy: audit.modifiedBy || 'Engineering Supervisor',
    approvedBy: approver,
    approvedAt: now,
    modificationHistory: [newLogEntry, ...(existingNode.modificationHistory || [])].slice(0, 150)
  };

  const docRef = doc(db, COLLECTION_NAME, existingNode.id);
  try {
    await setDoc(docRef, sanitizeForFirestore(mergedNode), { merge: true });
    return mergedNode;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/${existingNode.id}`);
    throw error;
  }
}
