import {
  collection,
  doc,
  onSnapshot,
  setDoc
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  ElectricalMeasurement,
  ElectricalMeasurementValues,
  PowerDistributionNode
} from '../types';
import {
  CreateElectricalMeasurementInput,
  deriveMeasurementQuantities,
  resolveNominalNodeVoltageV,
  validateMeasurementInput
} from '../core/electrical/loadCalculations';

const COLLECTION_NAME = 'electricalMeasurements';

function sanitizeMeasurementValues(values: ElectricalMeasurementValues): ElectricalMeasurementValues {
  const cleaned: Record<string, number> = {};
  for (const [k, v] of Object.entries(values)) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      cleaned[k] = v;
    }
  }
  return cleaned as ElectricalMeasurementValues;
}

/**
 * Subscribes to the immutable electricalMeasurements ledger sorted newest-first.
 * Never seeds fake/demonstration measurements.
 */
export function subscribeElectricalMeasurements(
  onUpdate: (measurements: ElectricalMeasurement[]) => void,
  onError?: (error: Error) => void
) {
  const q = collection(db, COLLECTION_NAME);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: ElectricalMeasurement[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          assetId: String(data.assetId || ''),
          assetKind: data.assetKind === 'EQUIPMENT' ? 'EQUIPMENT' : 'POWER_NODE',
          assetCode: data.assetCode ? String(data.assetCode) : undefined,
          measurementType: data.measurementType || 'COMPREHENSIVE_PANEL',
          phase: data.phase || '3PH_AVG',
          unit: String(data.unit || 'MULTI'),
          source: data.source === 'METERED' ? 'METERED' : 'MEASURED',
          values: sanitizeMeasurementValues(data.values || {}),
          timestamp: String(data.timestamp || data.createdAt || ''),
          recordedBy: String(data.recordedBy || 'Plant Staff'),
          recordedByUid: String(data.recordedByUid || ''),
          notes: data.notes ? String(data.notes) : undefined,
          createdAt: String(data.createdAt || data.timestamp || '')
        };
      });

      items.sort((a, b) => Date.parse(b.timestamp || b.createdAt) - Date.parse(a.timestamp || a.createdAt));
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

/**
 * Appends a new immutable electrical measurement record.
 * Validates units, numeric bounds, phase data, and ISO timestamp before saving.
 * Never mutates or overwrites existing historical records.
 */
export async function recordElectricalMeasurement(
  input: Omit<CreateElectricalMeasurementInput, 'recordedByUid'> & {
    recordedByUid?: string;
    targetNode?: PowerDistributionNode;
  }
): Promise<string> {
  const activeUid = input.recordedByUid || auth.currentUser?.uid || '';
  const timestamp = input.timestamp || new Date().toISOString();

  const rawValues = sanitizeMeasurementValues(input.values);
  const candidate: CreateElectricalMeasurementInput = {
    assetId: input.assetId.trim(),
    assetKind: input.assetKind,
    assetCode: input.assetCode?.trim(),
    measurementType: input.measurementType,
    phase: input.phase,
    unit: input.unit.trim() || 'MULTI',
    source: input.source,
    values: rawValues,
    timestamp,
    recordedBy: input.recordedBy.trim(),
    recordedByUid: activeUid,
    notes: input.notes?.trim()
  };

  const validation = validateMeasurementInput(candidate);
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '));
  }

  // Enrich values ONLY with mathematically exact derived quantities when direct V/I/P/PF inputs exist
  const nominalV = input.targetNode ? resolveNominalNodeVoltageV(input.targetNode) : null;
  const derived = deriveMeasurementQuantities(rawValues, nominalV);
  const enrichedValues: ElectricalMeasurementValues = { ...rawValues };

  if (enrichedValues.currentAmps === undefined && derived.currentAmps !== null) {
    enrichedValues.currentAmps = derived.currentAmps;
  }
  if (enrichedValues.voltageV === undefined && derived.voltageV !== null) {
    enrichedValues.voltageV = derived.voltageV;
  }
  if (enrichedValues.apparentPowerKva === undefined && derived.apparentPowerKva !== null) {
    enrichedValues.apparentPowerKva = derived.apparentPowerKva;
  }
  if (enrichedValues.activePowerKw === undefined && derived.activePowerKw !== null) {
    enrichedValues.activePowerKw = derived.activePowerKw;
  }
  if (enrichedValues.reactivePowerKvar === undefined && derived.reactivePowerKvar !== null) {
    enrichedValues.reactivePowerKvar = derived.reactivePowerKvar;
  }
  if (enrichedValues.powerFactor === undefined && derived.powerFactor !== null) {
    enrichedValues.powerFactor = derived.powerFactor;
  }

  const measurementId = `EM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const docRef = doc(db, COLLECTION_NAME, measurementId);
  const createdAt = new Date().toISOString();

  const payload: Record<string, unknown> = {
    assetId: candidate.assetId,
    assetKind: candidate.assetKind,
    measurementType: candidate.measurementType,
    phase: candidate.phase,
    unit: candidate.unit,
    source: candidate.source,
    values: sanitizeMeasurementValues(enrichedValues),
    timestamp: candidate.timestamp,
    recordedBy: candidate.recordedBy,
    recordedByUid: candidate.recordedByUid,
    createdAt
  };
  if (candidate.assetCode) payload.assetCode = candidate.assetCode;
  if (candidate.notes) payload.notes = candidate.notes;

  try {
    await setDoc(docRef, payload);
    return measurementId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${COLLECTION_NAME}/${measurementId}`);
    throw error;
  }
}
