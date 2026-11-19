import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { OrgMasterDataConfig, UserProfile } from '../types';
import {
  DEFAULT_ORG_MASTER_DATA,
  ORG_MASTER_DATA_DOC_ID,
  mergeOrgMasterData,
  validateOrgMasterData
} from '../core/master-data/orgMasterData';
import { canHODSignOffJobCard } from '../core/jobcards/permissions';

const ORG_MASTER_COLLECTION = 'orgMasterData';

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

export function subscribeOrgMasterData(
  onUpdate: (config: OrgMasterDataConfig) => void,
  onError?: (error: Error) => void
) {
  const docRef = doc(db, ORG_MASTER_COLLECTION, ORG_MASTER_DATA_DOC_ID);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(mergeOrgMasterData(null));
        return;
      }
      onUpdate(mergeOrgMasterData({ id: snapshot.id, ...(snapshot.data() as Partial<OrgMasterDataConfig>) }));
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, `${ORG_MASTER_COLLECTION}/${ORG_MASTER_DATA_DOC_ID}`);
      } catch (wrappedErr) {
        if (onError) onError(wrappedErr as Error);
      }
    }
  );
}

export async function saveOrgMasterData(
  config: OrgMasterDataConfig,
  actor: {
    userName: string;
    userRole?: UserProfile['role'] | null;
    userEmail?: string | null;
  }
): Promise<OrgMasterDataConfig> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('Authentication required before modifying organization master data.');
  }
  if (!canHODSignOffJobCard(actor.userRole, actor.userEmail || auth.currentUser?.email)) {
    throw new Error(
      `Permission Denied: Role "${actor.userRole || 'Staff'}" cannot modify organization master data. Manager or Admin role required.`
    );
  }

  const normalized = mergeOrgMasterData({
    ...config,
    id: ORG_MASTER_DATA_DOC_ID,
    version: Math.max(1, (Number(config.version) || 1) + 1)
  });

  const validation = validateOrgMasterData(normalized);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid organization master data configuration.');
  }

  const nowIso = new Date().toISOString();
  const payload: OrgMasterDataConfig = stripUndefinedDeep({
    ...normalized,
    id: ORG_MASTER_DATA_DOC_ID,
    updatedBy: (actor.userName || auth.currentUser?.email || 'Engineering Admin').slice(0, 120),
    updatedByUid: uid,
    updatedAt: nowIso
  });

  const docRef = doc(db, ORG_MASTER_COLLECTION, ORG_MASTER_DATA_DOC_ID);
  try {
    await setDoc(docRef, payload);
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${ORG_MASTER_COLLECTION}/${ORG_MASTER_DATA_DOC_ID}`);
    throw err;
  }
}
