import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  PowerConnection,
  PowerDistributionNode,
  PowerEdgeRole,
  PowerVoltageTier
} from '../types';
import {
  buildEffectivePowerEdges
} from '../core/electrical/topologySolver';
import { validatePowerConnectionCandidate } from '../core/electrical/permissions';

const COLLECTION_NAME = 'powerConnections';

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

export function subscribePowerConnections(
  onUpdate: (connections: PowerConnection[]) => void,
  onError?: (error: Error) => void
) {
  const q = collection(db, COLLECTION_NAME);
  return onSnapshot(
    q,
    (snapshot) => {
      const connections: PowerConnection[] = snapshot.docs.map((d) => {
        const data = d.data() as PowerConnection;
        return {
          ...data,
          id: d.id
        };
      });
      onUpdate(connections);
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

export async function createPowerConnectionWithAudit(
  candidate: {
    sourceNodeId: string;
    targetNodeId: string;
    voltageTier: PowerVoltageTier;
    edgeRole: PowerEdgeRole;
    label?: string;
    reason: string;
    createdBy: string;
    approvedBy?: string;
  },
  allNodes: PowerDistributionNode[],
  existingConnections: PowerConnection[]
): Promise<PowerConnection> {
  const currentEdges = buildEffectivePowerEdges(allNodes, existingConnections);
  const check = validatePowerConnectionCandidate(
    {
      sourceNodeId: candidate.sourceNodeId,
      targetNodeId: candidate.targetNodeId,
      edgeRole: candidate.edgeRole
    },
    allNodes,
    currentEdges
  );

  if (!check.valid) {
    throw new Error(check.error || 'Invalid electrical connection.');
  }

  const now = new Date().toISOString();
  const safeId = `CONN_${candidate.sourceNodeId}_${candidate.targetNodeId}_${Date.now()}`
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  const record: PowerConnection = {
    id: safeId,
    sourceNodeId: candidate.sourceNodeId,
    targetNodeId: candidate.targetNodeId,
    sourceHandle: 'bottom',
    targetHandle: 'top',
    voltageTier: candidate.voltageTier,
    edgeRole: candidate.edgeRole,
    label: candidate.label?.trim() || `${candidate.edgeRole.replace('_', ' ')} (${candidate.voltageTier})`,
    isAuthoritative: false,
    createdBy: candidate.createdBy,
    approvedBy: candidate.approvedBy || candidate.createdBy,
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
    modificationHistory: [
      {
        id: `conn-mod-${Date.now()}`,
        timestamp: now,
        modifiedBy: candidate.createdBy,
        approvedBy: candidate.approvedBy || candidate.createdBy,
        approvedAt: now,
        changeType: 'SPECS_UPDATE',
        summary: `Added ${candidate.edgeRole} link: ${candidate.sourceNodeId} -> ${candidate.targetNodeId} (${candidate.voltageTier})`,
        reason: candidate.reason.trim() || 'Authorized electrical topology connection added'
      }
    ]
  };

  const docRef = doc(db, COLLECTION_NAME, safeId);
  try {
    await setDoc(docRef, sanitizeForFirestore(record));
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${COLLECTION_NAME}/${safeId}`);
    throw error;
  }
}

export async function deletePowerConnectionWithAudit(connectionId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, connectionId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${connectionId}`);
    throw error;
  }
}
