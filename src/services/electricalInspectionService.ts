import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  ElectricalInspection,
  ElectricalInspectionReview,
  InspectionAssetCategory,
  InspectionReviewStatus,
  InspectionTemplate,
  UserProfile
} from '../types';
import {
  DEFAULT_INSPECTION_TEMPLATES,
  SubmitInspectionInput,
  buildInspectionNumber,
  sortInspectionsNewestFirst,
  validateElectricalInspectionInput
} from '../core/electrical/inspections';
import {
  canManageInspectionTemplates,
  canReviewElectricalInspection,
  canSubmitElectricalInspection
} from '../core/electrical/permissions';

const INSPECTIONS_COLLECTION = 'electricalInspections';
const REVIEWS_COLLECTION = 'electricalInspectionReviews';
const TEMPLATES_COLLECTION = 'inspectionTemplates';

function normalizeTimestampToIso(val: any, fallbackIso: string): string {
  if (!val) return fallbackIso;
  if (typeof val === 'string') return val;
  if (typeof val.toDate === 'function') {
    return val.toDate().toISOString();
  }
  if (typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000).toISOString();
  }
  return fallbackIso;
}

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

export function subscribeElectricalInspections(
  onUpdate: (inspections: ElectricalInspection[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, INSPECTIONS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: ElectricalInspection[] = snapshot.docs.map((d) => {
        const data = d.data();
        const inspectedAt = normalizeTimestampToIso(
          data.inspectedAt,
          new Date().toISOString()
        );
        return {
          id: d.id,
          inspectionNumber: data.inspectionNumber || `INSP-${d.id.slice(0, 6).toUpperCase()}`,
          assetId: data.assetId || '',
          assetKind: data.assetKind === 'EQUIPMENT' ? 'EQUIPMENT' : 'POWER_NODE',
          assetCode: data.assetCode || '',
          assetName: data.assetName || '',
          assetCategory: (data.assetCategory as InspectionAssetCategory) || 'CIRCUIT_BREAKER',
          plantArea: data.plantArea || '',
          electricalFeeder: data.electricalFeeder || '',
          conditionAssessment: data.conditionAssessment || 'NOT_INSPECTED',
          operatingStateSnapshot: data.operatingStateSnapshot,
          templateId: (data.templateId as InspectionAssetCategory) || 'CIRCUIT_BREAKER',
          templateVersion: Number(data.templateVersion) || 1,
          checklistResults: Array.isArray(data.checklistResults) ? data.checklistResults : [],
          measurements: data.measurements,
          measurementSource: data.measurementSource,
          insulationResistanceMohm:
            typeof data.insulationResistanceMohm === 'number'
              ? data.insulationResistanceMohm
              : undefined,
          windingTempC: typeof data.windingTempC === 'number' ? data.windingTempC : undefined,
          ambientTempC: typeof data.ambientTempC === 'number' ? data.ambientTempC : undefined,
          observations: data.observations || '',
          photos: Array.isArray(data.photos) ? data.photos : [],
          recommendations: data.recommendations || '',
          followUpRequired: Boolean(data.followUpRequired),
          followUpAction: data.followUpAction,
          recommendedPriority: data.recommendedPriority,
          technicianId: data.technicianId || '',
          technicianName: data.technicianName || 'Authorized Technician',
          technicianRole: data.technicianRole || 'Technician',
          inspectedAt,
          createdAt: normalizeTimestampToIso(data.createdAt, inspectedAt),
          correctsInspectionId: data.correctsInspectionId,
          amendmentReason: data.amendmentReason,
          idempotencyKey: data.idempotencyKey
        };
      });
      onUpdate(sortInspectionsNewestFirst(items));
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, INSPECTIONS_COLLECTION);
      } catch (wrappedErr) {
        if (onError) onError(wrappedErr as Error);
      }
    }
  );
}

export function subscribeElectricalInspectionReviews(
  onUpdate: (reviews: ElectricalInspectionReview[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, REVIEWS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: ElectricalInspectionReview[] = snapshot.docs.map((d) => {
        const data = d.data();
        const reviewedAt = normalizeTimestampToIso(
          data.reviewedAt,
          new Date().toISOString()
        );
        return {
          id: d.id,
          inspectionId: data.inspectionId || '',
          assetId: data.assetId || '',
          decision: (data.decision as Exclude<InspectionReviewStatus, 'PENDING_REVIEW'>) || 'APPROVED',
          reviewNotes: data.reviewNotes || '',
          reviewerUid: data.reviewerUid || '',
          reviewerName: data.reviewerName || 'Supervisor',
          reviewerRole: data.reviewerRole || 'Supervisor',
          reviewedAt,
          createdAt: normalizeTimestampToIso(data.createdAt, reviewedAt)
        };
      });
      items.sort((a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime());
      onUpdate(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, REVIEWS_COLLECTION);
      } catch (wrappedErr) {
        if (onError) onError(wrappedErr as Error);
      }
    }
  );
}

export function subscribeInspectionTemplates(
  onUpdate: (templates: Record<InspectionAssetCategory, InspectionTemplate>) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, TEMPLATES_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const merged: Record<InspectionAssetCategory, InspectionTemplate> = {
        CIRCUIT_BREAKER: { ...DEFAULT_INSPECTION_TEMPLATES.CIRCUIT_BREAKER },
        TRANSFORMER: { ...DEFAULT_INSPECTION_TEMPLATES.TRANSFORMER },
        MOTOR: { ...DEFAULT_INSPECTION_TEMPLATES.MOTOR },
        MCC_DB: { ...DEFAULT_INSPECTION_TEMPLATES.MCC_DB }
      };

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const cat = (data.category || docSnap.id) as InspectionAssetCategory;
        if (cat in merged && Array.isArray(data.items) && data.items.length > 0) {
          merged[cat] = {
            id: cat,
            category: cat,
            title: data.title || merged[cat].title,
            description: data.description ?? merged[cat].description,
            version: Number(data.version) || merged[cat].version,
            items: data.items,
            updatedBy: data.updatedBy,
            updatedByUid: data.updatedByUid,
            updatedAt: normalizeTimestampToIso(data.updatedAt, '')
          };
        }
      }
      onUpdate(merged);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, TEMPLATES_COLLECTION);
      } catch (wrappedErr) {
        if (onError) onError(wrappedErr as Error);
      }
    }
  );
}

export async function submitElectricalInspection(
  input: Omit<SubmitInspectionInput, 'technicianId' | 'technicianName' | 'technicianRole'>,
  actor: {
    technicianName: string;
    technicianRole?: UserProfile['role'] | null;
    userEmail?: string | null;
    existingCount?: number;
  }
): Promise<{ id: string; inspectionNumber: string }> {
  const firebaseUid = auth.currentUser?.uid;
  if (!firebaseUid) {
    throw new Error('Authentication required: sign in before submitting an electrical inspection.');
  }
  if (!canSubmitElectricalInspection(actor.technicianRole, actor.userEmail)) {
    throw new Error(
      `Permission Denied: Role "${actor.technicianRole || 'Operator'}" cannot submit formal electrical inspections.`
    );
  }

  const effectiveRole: UserProfile['role'] =
    actor.technicianRole && actor.technicianRole !== 'Operator'
      ? actor.technicianRole
      : 'Technician';

  const resolvedName =
    auth.currentUser?.displayName ||
    actor.technicianName ||
    auth.currentUser?.email ||
    'Authenticated Technician';

  const fullInput: SubmitInspectionInput = {
    ...input,
    technicianId: firebaseUid,
    technicianName: resolvedName.slice(0, 120),
    technicianRole: effectiveRole
  };

  const validation = validateElectricalInspectionInput(fullInput);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid electrical inspection payload.');
  }

  const inspectionNumber = buildInspectionNumber(actor.existingCount || 0);
  const docRef = doc(collection(db, INSPECTIONS_COLLECTION));

  const payload = stripUndefinedDeep({
    inspectionNumber,
    assetId: fullInput.assetId,
    assetKind: fullInput.assetKind,
    assetCode: fullInput.assetCode.slice(0, 50),
    assetName: fullInput.assetName.slice(0, 150),
    assetCategory: fullInput.assetCategory,
    plantArea: fullInput.plantArea.slice(0, 120),
    electricalFeeder: fullInput.electricalFeeder.slice(0, 150),
    conditionAssessment: fullInput.conditionAssessment,
    operatingStateSnapshot: fullInput.operatingStateSnapshot,
    templateId: fullInput.templateId,
    templateVersion: fullInput.templateVersion,
    checklistResults: fullInput.checklistResults,
    measurements: fullInput.measurements,
    measurementSource: fullInput.measurementSource,
    insulationResistanceMohm: fullInput.insulationResistanceMohm,
    windingTempC: fullInput.windingTempC,
    ambientTempC: fullInput.ambientTempC,
    observations: fullInput.observations.trim(),
    photos: fullInput.photos,
    recommendations: fullInput.recommendations.trim(),
    followUpRequired: Boolean(fullInput.followUpRequired),
    followUpAction: fullInput.followUpAction?.trim() || undefined,
    recommendedPriority: fullInput.recommendedPriority,
    technicianId: firebaseUid,
    technicianName: fullInput.technicianName,
    technicianRole: effectiveRole,
    inspectedAt: fullInput.inspectedAt,
    createdAt: serverTimestamp(),
    correctsInspectionId: fullInput.correctsInspectionId || undefined,
    amendmentReason: fullInput.amendmentReason?.trim() || undefined,
    idempotencyKey: fullInput.idempotencyKey || undefined
  });

  try {
    await setDoc(docRef, payload);
    return { id: docRef.id, inspectionNumber };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${INSPECTIONS_COLLECTION}/${docRef.id}`);
    throw error;
  }
}

export async function submitInspectionReview(params: {
  inspectionId: string;
  assetId: string;
  decision: Exclude<InspectionReviewStatus, 'PENDING_REVIEW'>;
  reviewNotes: string;
  reviewerName: string;
  reviewerRole?: UserProfile['role'] | null;
  userEmail?: string | null;
}): Promise<string> {
  const firebaseUid = auth.currentUser?.uid;
  if (!firebaseUid) {
    throw new Error('Authentication required to review an electrical inspection.');
  }
  if (!canReviewElectricalInspection(params.reviewerRole, params.userEmail)) {
    throw new Error(
      `Permission Denied: Only Supervisors, Engineering Managers, or Admins can review/approve inspection findings.`
    );
  }
  if (!params.reviewNotes.trim()) {
    throw new Error('Supervisor review notes are required.');
  }

  const effectiveRole: 'Admin' | 'Manager' | 'Supervisor' =
    params.reviewerRole === 'Admin' || params.reviewerRole === 'Manager'
      ? params.reviewerRole
      : 'Supervisor';

  const docRef = doc(collection(db, REVIEWS_COLLECTION));
  const payload = {
    inspectionId: params.inspectionId,
    assetId: params.assetId,
    decision: params.decision,
    reviewNotes: params.reviewNotes.trim().slice(0, 1000),
    reviewerUid: firebaseUid,
    reviewerName: (
      auth.currentUser?.displayName ||
      params.reviewerName ||
      auth.currentUser?.email ||
      'Engineering Supervisor'
    ).slice(0, 120),
    reviewerRole: effectiveRole,
    reviewedAt: new Date().toISOString(),
    createdAt: serverTimestamp()
  };

  try {
    await setDoc(docRef, payload);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${REVIEWS_COLLECTION}/${docRef.id}`);
    throw error;
  }
}

export async function saveInspectionTemplate(
  template: InspectionTemplate,
  actor: {
    userName: string;
    userRole?: UserProfile['role'] | null;
    userEmail?: string | null;
  }
): Promise<void> {
  const firebaseUid = auth.currentUser?.uid;
  if (!firebaseUid) {
    throw new Error('Authentication required to update inspection templates.');
  }
  if (!canManageInspectionTemplates(actor.userRole, actor.userEmail)) {
    throw new Error(
      'Permission Denied: Only Engineering Administrators (Admin / Manager) can modify inspection templates.'
    );
  }
  if (!template.title.trim() || template.items.length === 0) {
    throw new Error('Template title and at least one checklist item are required.');
  }

  const docRef = doc(db, TEMPLATES_COLLECTION, template.category);
  const payload = stripUndefinedDeep({
    category: template.category,
    title: template.title.trim().slice(0, 150),
    description: (template.description || '').trim().slice(0, 500),
    version: Math.max(1, (template.version || 1) + 1),
    items: template.items.slice(0, 40),
    updatedBy: (
      auth.currentUser?.displayName ||
      actor.userName ||
      auth.currentUser?.email ||
      'Engineering Admin'
    ).slice(0, 120),
    updatedByUid: firebaseUid,
    updatedAt: serverTimestamp()
  });

  try {
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${TEMPLATES_COLLECTION}/${template.category}`);
    throw error;
  }
}
