import {
  ElectricalAlertThresholds,
  ElectricalMeasurement,
  ElectricalMeasurementType,
  ElectricalMeasurementValues,
  LoadDataSource,
  MeasurementPhase,
  PowerDistributionNode
} from '../../types';

export const SQRT_3 = Math.sqrt(3);

export const DEFAULT_ELECTRICAL_THRESHOLDS: ElectricalAlertThresholds = {
  transformerHighLoadPct: 80,
  transformerCriticalLoadPct: 95,
  breakerWarningPct: 85,
  breakerCriticalPct: 100,
  phaseImbalanceWarnPct: 15,
  voltageDeviationWarnPct: 5,
  voltageDeviationCriticalPct: 10,
  minPowerFactorWarn: 0.85
};

/**
 * Normalizes and validates finite numeric inputs. Returns null when missing or non-finite.
 */
export function toFiniteNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(num) ? num : null;
}

function roundTo(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Resolves exact nominal line-to-line voltage (in Volts) for a plant distribution node.
 * Preserves verified plant voltage tiers:
 * - TX1 secondary / C4: 415 V
 * - TX2 & TX3 secondary / C5 & C6: 420 V
 * - 11 kV HV distribution / C1-C3 / fuses: 11000 V
 * - Old Turbine alternator: 6300 V
 * - Downstream MCCs / DBs: 400 V
 */
export function resolveNominalNodeVoltageV(node: Pick<PowerDistributionNode, 'id' | 'category' | 'voltage' | 'nominalVoltageV'>): number {
  if (typeof node.nominalVoltageV === 'number' && Number.isFinite(node.nominalVoltageV) && node.nominalVoltageV > 0) {
    return node.nominalVoltageV;
  }

  const raw = (node.voltage || '').toLowerCase();
  if (raw.includes('6.3') || raw.includes('6300')) return 6300;
  if (raw.includes('11 kv') || raw.includes('11kv') || raw.includes('11000') || node.id === 'BUS_11KV') {
    // Transformers state e.g. "11000 / 415 V" -> secondary LV monitoring base
    if (node.category === 'TRANSFORMER') {
      if (raw.includes('415')) return 415;
      if (raw.includes('420')) return 420;
    }
    return 11000;
  }
  if (raw.includes('415')) return 415;
  if (raw.includes('420')) return 420;
  if (raw.includes('400')) return 400;
  return 400;
}

/**
 * S = √3 × V × I / 1000  (Three-phase apparent power in kVA)
 * Returns null if V <= 0 or I < 0 or missing. Never fabricates 0 when unavailable.
 */
export function calculateThreePhaseApparentPowerKva(
  voltageV: number | null | undefined,
  currentAmps: number | null | undefined
): number | null {
  const v = toFiniteNumber(voltageV);
  const i = toFiniteNumber(currentAmps);
  if (v === null || i === null || v <= 0 || i < 0) return null;
  return roundTo((SQRT_3 * v * i) / 1000, 2);
}

/**
 * P = √3 × V × I × PF / 1000  (Three-phase active power in kW)
 * Requires valid V (>0), I (>=0), and PF (0 < PF <= 1). Never assumes a fabricated PF.
 */
export function calculateThreePhaseActivePowerKw(
  voltageV: number | null | undefined,
  currentAmps: number | null | undefined,
  powerFactor: number | null | undefined
): number | null {
  const v = toFiniteNumber(voltageV);
  const i = toFiniteNumber(currentAmps);
  const pf = toFiniteNumber(powerFactor);
  if (v === null || i === null || pf === null || v <= 0 || i < 0 || pf <= 0 || pf > 1) {
    return null;
  }
  return roundTo((SQRT_3 * v * i * pf) / 1000, 2);
}

/**
 * Q = √(S² - P²)  (Three-phase reactive power in kVAr)
 * Returns null if either S or P is missing or if P materially exceeds S.
 */
export function calculateThreePhaseReactivePowerKvar(
  apparentKva: number | null | undefined,
  activeKw: number | null | undefined
): number | null {
  const s = toFiniteNumber(apparentKva);
  const p = toFiniteNumber(activeKw);
  if (s === null || p === null || s < 0 || p < 0) return null;
  if (p > s + 0.05) return null; // physically invalid: P cannot exceed S
  const diff = Math.max(0, s * s - p * p);
  return roundTo(Math.sqrt(diff), 2);
}

/**
 * PF = P / S
 * Returns null when S <= 0, P < 0, or P > S.
 */
export function calculatePowerFactor(
  activeKw: number | null | undefined,
  apparentKva: number | null | undefined
): number | null {
  const p = toFiniteNumber(activeKw);
  const s = toFiniteNumber(apparentKva);
  if (p === null || s === null || s <= 0 || p < 0) return null;
  if (p > s + 0.05) return null;
  return roundTo(Math.min(1, p / s), 3);
}

/**
 * Transformer / Capacity Utilisation % = Measured kVA / Rated kVA × 100
 */
export function calculateTransformerUtilizationPct(
  loadKva: number | null | undefined,
  ratedKva: number | null | undefined
): number | null {
  const load = toFiniteNumber(loadKva);
  const rated = toFiniteNumber(ratedKva);
  if (load === null || rated === null || rated <= 0 || load < 0) return null;
  return roundTo((load / rated) * 100, 1);
}

/**
 * NEMA / IEEE 3-Phase Current Imbalance % = max(|Li - Iavg|) / Iavg × 100
 * Requires all three phase currents L1, L2, L3.
 */
export function calculatePhaseImbalancePct(
  l1Amps: number | null | undefined,
  l2Amps: number | null | undefined,
  l3Amps: number | null | undefined
): number | null {
  const l1 = toFiniteNumber(l1Amps);
  const l2 = toFiniteNumber(l2Amps);
  const l3 = toFiniteNumber(l3Amps);
  if (l1 === null || l2 === null || l3 === null) return null;
  if (l1 < 0 || l2 < 0 || l3 < 0) return null;
  const avg = (l1 + l2 + l3) / 3;
  if (avg <= 0) return 0;
  const maxDev = Math.max(Math.abs(l1 - avg), Math.abs(l2 - avg), Math.abs(l3 - avg));
  return roundTo((maxDev / avg) * 100, 1);
}

export interface DerivedMeasurementSummary {
  currentAmps: number | null;
  phaseCurrents: { l1?: number; l2?: number; l3?: number } | null;
  phaseImbalancePct: number | null;
  voltageV: number | null;
  voltageSource: LoadDataSource | null;
  activePowerKw: number | null;
  apparentPowerKva: number | null;
  reactivePowerKvar: number | null;
  powerFactor: number | null;
  frequencyHz: number | null;
  energyKwh: number | null;
}

/**
 * Derives consistent 3-phase electrical quantities strictly from recorded measurement fields.
 * Never invents missing PF or missing readings.
 */
export function deriveMeasurementQuantities(
  values: ElectricalMeasurementValues,
  nominalVoltageV?: number | null
): DerivedMeasurementSummary {
  const l1 = toFiniteNumber(values.currentL1Amps);
  const l2 = toFiniteNumber(values.currentL2Amps);
  const l3 = toFiniteNumber(values.currentL3Amps);
  const hasAnyPhaseCurrent = l1 !== null || l2 !== null || l3 !== null;
  const phaseVals = [l1, l2, l3].filter((v): v is number => v !== null);

  let currentAmps = toFiniteNumber(values.currentAmps);
  if (currentAmps === null && phaseVals.length > 0) {
    currentAmps = roundTo(phaseVals.reduce((acc, v) => acc + v, 0) / phaseVals.length, 2);
  }

  const vDirect = toFiniteNumber(values.voltageV);
  const vL1L2 = toFiniteNumber(values.voltageL1L2V);
  const vL2L3 = toFiniteNumber(values.voltageL2L3V);
  const vL3L1 = toFiniteNumber(values.voltageL3L1V);
  const lineVolts = [vL1L2, vL2L3, vL3L1].filter((v): v is number => v !== null);
  const measuredVoltageV =
    vDirect !== null
      ? vDirect
      : lineVolts.length > 0
      ? roundTo(lineVolts.reduce((acc, v) => acc + v, 0) / lineVolts.length, 1)
      : null;

  // Use measured voltage when recorded; only use nominal node voltage if current was measured and apparent/active calculation uses nominal tier
  const calcVoltageV = measuredVoltageV ?? (toFiniteNumber(nominalVoltageV) || null);
  const voltageSource: LoadDataSource | null =
    measuredVoltageV !== null ? null : calcVoltageV !== null ? 'ESTIMATED' : null;

  let apparentPowerKva = toFiniteNumber(values.apparentPowerKva);
  let activePowerKw = toFiniteNumber(values.activePowerKw);
  let powerFactor = toFiniteNumber(values.powerFactor);
  let reactivePowerKvar = toFiniteNumber(values.reactivePowerKvar);

  // Only calculate S = √3 * V * I / 1000 if V is actually measured or nominal is explicitly supplied alongside measured current
  if (apparentPowerKva === null && measuredVoltageV !== null && currentAmps !== null) {
    apparentPowerKva = calculateThreePhaseApparentPowerKva(measuredVoltageV, currentAmps);
  } else if (apparentPowerKva === null && calcVoltageV !== null && currentAmps !== null) {
    // Allow nominal voltage tier calculation only when voltageV wasn't entered, caller tracks source/basis
    apparentPowerKva = calculateThreePhaseApparentPowerKva(calcVoltageV, currentAmps);
  }

  if (activePowerKw === null && apparentPowerKva !== null && powerFactor !== null) {
    activePowerKw = roundTo(apparentPowerKva * powerFactor, 2);
  } else if (activePowerKw === null && measuredVoltageV !== null && currentAmps !== null && powerFactor !== null) {
    activePowerKw = calculateThreePhaseActivePowerKw(measuredVoltageV, currentAmps, powerFactor);
  }

  if (powerFactor === null && activePowerKw !== null && apparentPowerKva !== null) {
    powerFactor = calculatePowerFactor(activePowerKw, apparentPowerKva);
  }

  if (reactivePowerKvar === null && apparentPowerKva !== null && activePowerKw !== null) {
    reactivePowerKvar = calculateThreePhaseReactivePowerKvar(apparentPowerKva, activePowerKw);
  }

  return {
    currentAmps,
    phaseCurrents: hasAnyPhaseCurrent
      ? {
          ...(l1 !== null ? { l1 } : {}),
          ...(l2 !== null ? { l2 } : {}),
          ...(l3 !== null ? { l3 } : {})
        }
      : null,
    phaseImbalancePct: calculatePhaseImbalancePct(l1, l2, l3),
    voltageV: measuredVoltageV,
    voltageSource,
    activePowerKw,
    apparentPowerKva,
    reactivePowerKvar,
    powerFactor,
    frequencyHz: toFiniteNumber(values.frequencyHz),
    energyKwh: toFiniteNumber(values.energyKwh)
  };
}

export interface MeasurementValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CreateElectricalMeasurementInput {
  assetId: string;
  assetKind: 'POWER_NODE' | 'EQUIPMENT';
  assetCode?: string;
  measurementType: ElectricalMeasurementType;
  phase: MeasurementPhase;
  unit: string;
  source: 'MEASURED' | 'METERED';
  values: ElectricalMeasurementValues;
  timestamp: string;
  recordedBy: string;
  recordedByUid: string;
  notes?: string;
}

/**
 * Strict measurement validation: enforces units, numeric range bounds,
 * ISO timestamps, and electrical consistency (P <= S).
 */
export function validateMeasurementInput(
  candidate: Partial<CreateElectricalMeasurementInput>
): MeasurementValidationResult {
  const errors: string[] = [];

  if (!candidate.assetId || !candidate.assetId.trim()) {
    errors.push('Target assetId is required.');
  }
  if (candidate.assetKind !== 'POWER_NODE' && candidate.assetKind !== 'EQUIPMENT') {
    errors.push('assetKind must be POWER_NODE or EQUIPMENT.');
  }
  if (candidate.source !== 'MEASURED' && candidate.source !== 'METERED') {
    errors.push('Measurement source classification must be MEASURED or METERED.');
  }
  if (!candidate.unit || !candidate.unit.trim()) {
    errors.push('Measurement engineering unit is required.');
  }
  if (!candidate.recordedBy || !candidate.recordedBy.trim()) {
    errors.push('Recorded By technician/engineer name is required.');
  }
  if (!candidate.recordedByUid || !candidate.recordedByUid.trim()) {
    errors.push('Authenticated recordedByUid is required.');
  }

  // ISO Timestamp check
  if (!candidate.timestamp || typeof candidate.timestamp !== 'string') {
    errors.push('Measurement ISO timestamp is required.');
  } else {
    const parsedTime = Date.parse(candidate.timestamp);
    if (Number.isNaN(parsedTime)) {
      errors.push('Measurement timestamp must be a valid ISO-8601 date/time string.');
    } else if (parsedTime > Date.now() + 15 * 60 * 1000) {
      errors.push('Measurement timestamp cannot be more than 15 minutes in the future.');
    }
  }

  const values = candidate.values || {};
  const numericEntries = Object.entries(values).filter(
    ([, val]) => val !== undefined && val !== null && val !== ('' as any)
  );

  if (numericEntries.length === 0) {
    errors.push('At least one numeric electrical reading must be entered.');
  }

  const checkRange = (label: string, val: unknown, min: number, max: number, strictPositive = false) => {
    if (val === undefined || val === null || val === '') return;
    const n = Number(val);
    if (!Number.isFinite(n)) {
      errors.push(`${label} must be a finite number.`);
      return;
    }
    if (strictPositive ? n <= min : n < min) {
      errors.push(`${label} must be ${strictPositive ? 'greater than' : 'at least'} ${min}.`);
    }
    if (n > max) {
      errors.push(`${label} exceeds valid engineering limit (${max}).`);
    }
  };

  checkRange('Current (A)', values.currentAmps, 0, 20000);
  checkRange('Phase L1 Current (A)', values.currentL1Amps, 0, 20000);
  checkRange('Phase L2 Current (A)', values.currentL2Amps, 0, 20000);
  checkRange('Phase L3 Current (A)', values.currentL3Amps, 0, 20000);
  checkRange('Voltage (V)', values.voltageV, 0, 35000, true);
  checkRange('Line Voltage L1-L2 (V)', values.voltageL1L2V, 0, 35000, true);
  checkRange('Line Voltage L2-L3 (V)', values.voltageL2L3V, 0, 35000, true);
  checkRange('Line Voltage L3-L1 (V)', values.voltageL3L1V, 0, 35000, true);
  checkRange('Active Power (kW)', values.activePowerKw, 0, 50000);
  checkRange('Apparent Power (kVA)', values.apparentPowerKva, 0, 50000);
  checkRange('Reactive Power (kVAr)', values.reactivePowerKvar, 0, 50000);
  checkRange('Power Factor', values.powerFactor, 0, 1, true);
  checkRange('Frequency (Hz)', values.frequencyHz, 40, 70);
  checkRange('Energy (kWh)', values.energyKwh, 0, 1000000000);

  const kw = toFiniteNumber(values.activePowerKw);
  const kva = toFiniteNumber(values.apparentPowerKva);
  if (kw !== null && kva !== null && kw > kva * 1.02 + 0.05) {
    errors.push('Active power (kW) cannot exceed apparent power (kVA).');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Selects the newest valid historical measurement per assetId (by ISO timestamp desc).
 * Preserves full chronological array for audit trails.
 */
export function indexLatestMeasurementsByAsset(
  measurements: ElectricalMeasurement[]
): Map<string, ElectricalMeasurement> {
  const latest = new Map<string, ElectricalMeasurement>();
  for (const m of measurements) {
    if (!m.assetId) continue;
    const existing = latest.get(m.assetId);
    if (!existing) {
      latest.set(m.assetId, m);
      continue;
    }
    const existingTime = Date.parse(existing.timestamp || existing.createdAt || '');
    const candidateTime = Date.parse(m.timestamp || m.createdAt || '');
    if (
      (!Number.isNaN(candidateTime) && Number.isNaN(existingTime)) ||
      candidateTime > existingTime
    ) {
      latest.set(m.assetId, m);
    }
  }
  return latest;
}
