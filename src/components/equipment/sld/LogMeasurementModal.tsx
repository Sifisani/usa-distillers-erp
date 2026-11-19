import React, { useMemo, useState } from 'react';
import { Check, Gauge, X } from 'lucide-react';
import {
  ElectricalMeasurementType,
  ElectricalMeasurementValues,
  MeasurementPhase,
  PowerDistributionNode
} from '../../../types';
import {
  CreateElectricalMeasurementInput,
  deriveMeasurementQuantities,
  validateMeasurementInput
} from '../../../core/electrical/loadCalculations';

interface LogMeasurementModalProps {
  assetId: string;
  assetKind: 'POWER_NODE' | 'EQUIPMENT';
  assetCode: string;
  assetName: string;
  nominalVoltageV?: number;
  targetNode?: PowerDistributionNode;
  currentUserName: string;
  onClose: () => void;
  onSubmitMeasurement: (
    input: Omit<CreateElectricalMeasurementInput, 'recordedByUid'> & {
      targetNode?: PowerDistributionNode;
    }
  ) => Promise<void>;
}

function toLocalDateTimeInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const LogMeasurementModal: React.FC<LogMeasurementModalProps> = ({
  assetId,
  assetKind,
  assetCode,
  assetName,
  nominalVoltageV = 400,
  targetNode,
  currentUserName,
  onClose,
  onSubmitMeasurement
}) => {
  const [source, setSource] = useState<'MEASURED' | 'METERED'>('MEASURED');
  const [measurementType, setMeasurementType] =
    useState<ElectricalMeasurementType>('COMPREHENSIVE_PANEL');
  const [phase, setPhase] = useState<MeasurementPhase>('3PH_AVG');
  const [timestampLocal, setTimestampLocal] = useState(() =>
    toLocalDateTimeInputValue(new Date())
  );
  const [recordedBy, setRecordedBy] = useState(currentUserName);

  const [currentAmps, setCurrentAmps] = useState('');
  const [l1Amps, setL1Amps] = useState('');
  const [l2Amps, setL2Amps] = useState('');
  const [l3Amps, setL3Amps] = useState('');
  const [voltageV, setVoltageV] = useState('');
  const [activePowerKw, setActivePowerKw] = useState('');
  const [apparentPowerKva, setApparentPowerKva] = useState('');
  const [powerFactor, setPowerFactor] = useState('');
  const [frequencyHz, setFrequencyHz] = useState('');
  const [energyKwh, setEnergyKwh] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const parsedValues = useMemo<ElectricalMeasurementValues>(() => {
    const parseOpt = (s: string): number | undefined => {
      const trimmed = s.trim();
      if (!trimmed) return undefined;
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : NaN;
    };
    const obj: ElectricalMeasurementValues = {};
    const c = parseOpt(currentAmps);
    const l1 = parseOpt(l1Amps);
    const l2 = parseOpt(l2Amps);
    const l3 = parseOpt(l3Amps);
    const v = parseOpt(voltageV);
    const kw = parseOpt(activePowerKw);
    const kva = parseOpt(apparentPowerKva);
    const pf = parseOpt(powerFactor);
    const hz = parseOpt(frequencyHz);
    const kwh = parseOpt(energyKwh);

    if (c !== undefined) obj.currentAmps = c;
    if (l1 !== undefined) obj.currentL1Amps = l1;
    if (l2 !== undefined) obj.currentL2Amps = l2;
    if (l3 !== undefined) obj.currentL3Amps = l3;
    if (v !== undefined) obj.voltageV = v;
    if (kw !== undefined) obj.activePowerKw = kw;
    if (kva !== undefined) obj.apparentPowerKva = kva;
    if (pf !== undefined) obj.powerFactor = pf;
    if (hz !== undefined) obj.frequencyHz = hz;
    if (kwh !== undefined) obj.energyKwh = kwh;
    return obj;
  }, [
    currentAmps,
    l1Amps,
    l2Amps,
    l3Amps,
    voltageV,
    activePowerKw,
    apparentPowerKva,
    powerFactor,
    frequencyHz,
    energyKwh
  ]);

  const preview = useMemo(
    () => deriveMeasurementQuantities(parsedValues, nominalVoltageV),
    [parsedValues, nominalVoltageV]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedTs = new Date(timestampLocal);
    if (Number.isNaN(parsedTs.getTime())) {
      setErrorMsg('Please enter a valid measurement date and time.');
      return;
    }

    const isoTimestamp = parsedTs.toISOString();
    const validation = validateMeasurementInput({
      assetId,
      assetKind,
      assetCode,
      measurementType,
      phase,
      unit: 'MULTI',
      source,
      values: parsedValues,
      timestamp: isoTimestamp,
      recordedBy,
      recordedByUid: 'client-pending-auth',
      notes
    });

    if (!validation.valid) {
      setErrorMsg(validation.errors.join(' '));
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitMeasurement({
        assetId,
        assetKind,
        assetCode,
        measurementType,
        phase,
        unit: 'MULTI',
        source,
        values: parsedValues,
        timestamp: isoTimestamp,
        recordedBy: recordedBy.trim(),
        notes: notes.trim() || undefined,
        targetNode
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record measurement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Gauge className="w-4 h-4 text-teal-400 shrink-0" />
            <div className="min-w-0">
              <div className="font-mono text-[10px] text-teal-300 font-bold truncate">
                {assetCode} • Nominal {nominalVoltageV}V 3Ø
              </div>
              <h3 className="text-sm font-bold truncate">
                Record Electrical Measurement — {assetName}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto text-xs bg-slate-50">
          {errorMsg && (
            <div className="p-2.5 rounded bg-red-50 border border-red-300 text-red-900 font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Source Classification, Type, Phase, Timestamp */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-white p-3 rounded border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Data Classification *</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as 'MEASURED' | 'METERED')}
                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
              >
                <option value="MEASURED">MEASURED (Field Clamp)</option>
                <option value="METERED">METERED (Panel Meter)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reading Scope</label>
              <select
                value={measurementType}
                onChange={(e) => setMeasurementType(e.target.value as ElectricalMeasurementType)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
              >
                <option value="COMPREHENSIVE_PANEL">Comprehensive Panel</option>
                <option value="CURRENT">Current (A)</option>
                <option value="VOLTAGE">Voltage (V)</option>
                <option value="POWER">Power (kW / kVA)</option>
                <option value="POWER_FACTOR">Power Factor</option>
                <option value="FREQUENCY">Frequency (Hz)</option>
                <option value="ENERGY">Energy Meter (kWh)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phase Reference</label>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value as MeasurementPhase)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono"
              >
                <option value="3PH_AVG">3Ø Average</option>
                <option value="3PH_TOTAL">3Ø Total</option>
                <option value="L1">Phase L1</option>
                <option value="L2">Phase L2</option>
                <option value="L3">Phase L3</option>
                <option value="L1_L2">Line L1-L2</option>
                <option value="L2_L3">Line L2-L3</option>
                <option value="L3_L1">Line L3-L1</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Timestamp *</label>
              <input
                type="datetime-local"
                required
                value={timestampLocal}
                onChange={(e) => setTimestampLocal(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono text-[11px]"
              />
            </div>
          </div>

          {/* 3-Phase Current & Voltage Inputs */}
          <div className="bg-white p-3 rounded border border-slate-200 space-y-2.5">
            <div className="font-mono text-[10px] font-bold uppercase text-slate-500">
              Current & Voltage Readings (Leave unmeasured fields blank — never zero-fill)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">3Ø Avg / Total (A)</label>
                <input
                  type="number"
                  step="0.1"
                  value={currentAmps}
                  onChange={(e) => setCurrentAmps(e.target.value)}
                  placeholder="Auto if L1-L3"
                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">L1 (A)</label>
                <input
                  type="number"
                  step="0.1"
                  value={l1Amps}
                  onChange={(e) => setL1Amps(e.target.value)}
                  placeholder="e.g. 420"
                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">L2 (A)</label>
                <input
                  type="number"
                  step="0.1"
                  value={l2Amps}
                  onChange={(e) => setL2Amps(e.target.value)}
                  placeholder="e.g. 418"
                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">L3 (A)</label>
                <input
                  type="number"
                  step="0.1"
                  value={l3Amps}
                  onChange={(e) => setL3Amps(e.target.value)}
                  placeholder="e.g. 425"
                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">
                  Line Voltage (V)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={voltageV}
                  onChange={(e) => setVoltageV(e.target.value)}
                  placeholder={`Nom ${nominalVoltageV}V`}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
            </div>
          </div>

          {/* Power, PF, Frequency, Energy */}
          <div className="bg-white p-3 rounded border border-slate-200 space-y-2.5">
            <div className="font-mono text-[10px] font-bold uppercase text-slate-500">
              Power, Power Factor, Frequency & Metered Energy
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Active (kW)</label>
                <input
                  type="number"
                  step="0.1"
                  value={activePowerKw}
                  onChange={(e) => setActivePowerKw(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Apparent (kVA)</label>
                <input
                  type="number"
                  step="0.1"
                  value={apparentPowerKva}
                  onChange={(e) => setApparentPowerKva(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Power Factor</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="1"
                  value={powerFactor}
                  onChange={(e) => setPowerFactor(e.target.value)}
                  placeholder="0.01–1.00"
                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Freq (Hz)</label>
                <input
                  type="number"
                  step="0.01"
                  value={frequencyHz}
                  onChange={(e) => setFrequencyHz(e.target.value)}
                  placeholder="50.00"
                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Energy (kWh)</label>
                <input
                  type="number"
                  step="0.1"
                  value={energyKwh}
                  onChange={(e) => setEnergyKwh(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
            </div>
          </div>

          {/* Real-time 3-Phase Calculation Preview */}
          <div className="p-2.5 rounded border border-teal-200 bg-teal-50/70 flex flex-wrap items-center justify-between gap-2 font-mono text-[10.5px]">
            <span className="font-bold text-teal-950">Derived 3Ø Preview:</span>
            <div className="flex flex-wrap items-center gap-3 text-teal-900">
              <span>S = {preview.apparentPowerKva !== null ? `${preview.apparentPowerKva} kVA` : 'Unavailable'}</span>
              <span>P = {preview.activePowerKw !== null ? `${preview.activePowerKw} kW` : 'Unavailable'}</span>
              <span>Q = {preview.reactivePowerKvar !== null ? `${preview.reactivePowerKvar} kVAr` : 'Unavailable'}</span>
              <span>PF = {preview.powerFactor !== null ? preview.powerFactor : 'Unavailable'}</span>
              <span>Imbal = {preview.phaseImbalancePct !== null ? `${preview.phaseImbalancePct}%` : 'Unavailable'}</span>
            </div>
          </div>

          {/* Recorded By & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-0.5">Recorded By *</label>
              <input
                type="text"
                required
                value={recordedBy}
                onChange={(e) => setRecordedBy(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-0.5">Field / Meter Observation Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Shift A routine switchboard clamp check"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] text-slate-500">
              Records are append-only in immutable historical audit storage.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{submitting ? 'Saving Record...' : 'Save Immutable Measurement'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
