import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Lock,
  ShieldCheck,
  Trash2,
  X
} from 'lucide-react';
import {
  ElectricalInspection,
  ElectricalMeasurementValues,
  Equipment,
  InspectionAssetCategory,
  InspectionChecklistResponse,
  InspectionChecklistResult,
  InspectionPhotoAttachment,
  InspectionTemplate,
  MaintenanceCondition,
  PowerDistributionNode,
  Priority,
  UserProfile
} from '../../../types';
import {
  MAX_INSPECTION_PHOTOS,
  SubmitInspectionInput,
  getConditionDisplayMeta,
  resolveInspectionCategoryForNode,
  resolvePlantAreaForNode,
  validateElectricalInspectionInput
} from '../../../core/electrical/inspections';
import { compressInspectionPhotoFile } from '../../../core/electrical/photoUtils';
import { auth } from '../../../firebase';
import { canSubmitElectricalInspection } from '../../../core/electrical/permissions';
import { ConditionBadge } from './ConditionBadge';

export interface InspectionTargetAsset {
  assetId: string;
  assetKind: 'POWER_NODE' | 'EQUIPMENT';
  assetCode: string;
  assetName: string;
  assetCategory: InspectionAssetCategory;
  plantArea: string;
  electricalFeeder: string;
  operatingStateSnapshot?: string;
  node?: PowerDistributionNode;
  equipment?: Equipment;
}

export function buildInspectionTargetFromNode(
  node: PowerDistributionNode
): InspectionTargetAsset {
  return {
    assetId: node.id,
    assetKind: 'POWER_NODE',
    assetCode: node.code,
    assetName: node.name,
    assetCategory: resolveInspectionCategoryForNode(node),
    plantArea: resolvePlantAreaForNode(node),
    electricalFeeder: node.feederPanelId
      ? `${node.feederPanelId} (${node.code})`
      : `${node.groupSection} / ${node.code}`,
    operatingStateSnapshot: node.operatingState,
    node
  };
}

export function buildInspectionTargetFromEquipment(
  equipment: Equipment
): InspectionTargetAsset {
  return {
    assetId: equipment.id,
    assetKind: 'EQUIPMENT',
    assetCode: equipment.code,
    assetName: equipment.name,
    assetCategory: 'MOTOR',
    plantArea: equipment.plantArea || equipment.location || equipment.department,
    electricalFeeder: equipment.feederPanel
      ? `${equipment.feederPanel}${equipment.feederBreaker ? ` / ${equipment.feederBreaker}` : ''}`
      : equipment.location || 'Plant LV Feeder',
    operatingStateSnapshot: equipment.status,
    equipment
  };
}

interface ElectricalInspectionModalProps {
  isOpen: boolean;
  target: InspectionTargetAsset | null;
  templates: Record<InspectionAssetCategory, InspectionTemplate>;
  currentUserName: string;
  userRole?: UserProfile['role'] | null;
  userEmail?: string | null;
  correctsInspection?: ElectricalInspection | null;
  onClose: () => void;
  onSubmitInspection: (
    payload: Omit<SubmitInspectionInput, 'technicianId' | 'technicianName' | 'technicianRole'>
  ) => Promise<void>;
}

const SELECTABLE_CONDITIONS: MaintenanceCondition[] = [
  'HEALTHY',
  'ATTENTION_REQUIRED',
  'FAULT_DETECTED',
  'UNDER_MAINTENANCE',
  'ISOLATED',
  'DECOMMISSIONED'
];

export const ElectricalInspectionModal: React.FC<ElectricalInspectionModalProps> = ({
  isOpen,
  target,
  templates,
  currentUserName,
  userRole,
  userEmail,
  correctsInspection = null,
  onClose,
  onSubmitInspection
}) => {
  const canSubmit = canSubmitElectricalInspection(userRole, userEmail);
  const authenticatedUid = auth.currentUser?.uid || 'unauthenticated';

  const template = useMemo(() => {
    if (!target) return null;
    return templates[target.assetCategory];
  }, [target, templates]);

  const [conditionAssessment, setConditionAssessment] =
    useState<MaintenanceCondition>('HEALTHY');
  const [checklistResults, setChecklistResults] = useState<InspectionChecklistResponse[]>([]);
  const [inspectedAtLocal, setInspectedAtLocal] = useState<string>('');
  const [observations, setObservations] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string>('');
  const [followUpRequired, setFollowUpRequired] = useState<boolean>(false);
  const [followUpAction, setFollowUpAction] = useState<string>('');
  const [recommendedPriority, setRecommendedPriority] = useState<Priority>('Medium');
  const [amendmentReason, setAmendmentReason] = useState<string>('');
  const [photos, setPhotos] = useState<InspectionPhotoAttachment[]>([]);
  const [photoBusy, setPhotoBusy] = useState<boolean>(false);

  // Electrical field measurements (optional)
  const [currentAmps, setCurrentAmps] = useState<string>('');
  const [currentL1, setCurrentL1] = useState<string>('');
  const [currentL2, setCurrentL2] = useState<string>('');
  const [currentL3, setCurrentL3] = useState<string>('');
  const [voltageV, setVoltageV] = useState<string>('');
  const [insulationMohm, setInsulationMohm] = useState<string>('');
  const [windingTempC, setWindingTempC] = useState<string>('');
  const [ambientTempC, setAmbientTempC] = useState<string>('');

  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !target || !template) return;

    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setInspectedAtLocal(localIso);
    setIdempotencyKey(`insp-${target.assetId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    setError(null);
    setSubmitting(false);

    if (correctsInspection) {
      setConditionAssessment(
        correctsInspection.conditionAssessment === 'NOT_INSPECTED'
          ? 'ATTENTION_REQUIRED'
          : correctsInspection.conditionAssessment
      );
      setChecklistResults(
        template.items.map((item) => {
          const prev = correctsInspection.checklistResults.find((r) => r.itemId === item.id);
          return {
            itemId: item.id,
            label: item.label,
            result: prev?.result || 'PASS',
            notes: prev?.notes || ''
          };
        })
      );
      setObservations(correctsInspection.observations || '');
      setRecommendations(correctsInspection.recommendations || '');
      setFollowUpRequired(Boolean(correctsInspection.followUpRequired));
      setFollowUpAction(correctsInspection.followUpAction || '');
      setRecommendedPriority(correctsInspection.recommendedPriority || 'High');
      setAmendmentReason('');
      setPhotos(correctsInspection.photos || []);
      setCurrentAmps(
        correctsInspection.measurements?.currentAmps != null
          ? String(correctsInspection.measurements.currentAmps)
          : ''
      );
      setCurrentL1(
        correctsInspection.measurements?.currentL1Amps != null
          ? String(correctsInspection.measurements.currentL1Amps)
          : ''
      );
      setCurrentL2(
        correctsInspection.measurements?.currentL2Amps != null
          ? String(correctsInspection.measurements.currentL2Amps)
          : ''
      );
      setCurrentL3(
        correctsInspection.measurements?.currentL3Amps != null
          ? String(correctsInspection.measurements.currentL3Amps)
          : ''
      );
      setVoltageV(
        correctsInspection.measurements?.voltageV != null
          ? String(correctsInspection.measurements.voltageV)
          : ''
      );
      setInsulationMohm(
        correctsInspection.insulationResistanceMohm != null
          ? String(correctsInspection.insulationResistanceMohm)
          : ''
      );
      setWindingTempC(
        correctsInspection.windingTempC != null ? String(correctsInspection.windingTempC) : ''
      );
      setAmbientTempC(
        correctsInspection.ambientTempC != null ? String(correctsInspection.ambientTempC) : ''
      );
    } else {
      setConditionAssessment('HEALTHY');
      setChecklistResults(
        template.items.map((item) => ({
          itemId: item.id,
          label: item.label,
          result: 'PASS',
          notes: ''
        }))
      );
      setObservations('');
      setRecommendations('');
      setFollowUpRequired(false);
      setFollowUpAction('');
      setRecommendedPriority('Medium');
      setAmendmentReason('');
      setPhotos([]);
      setCurrentAmps('');
      setCurrentL1('');
      setCurrentL2('');
      setCurrentL3('');
      setVoltageV('');
      setInsulationMohm('');
      setWindingTempC('');
      setAmbientTempC('');
    }
  }, [isOpen, target, template, correctsInspection]);

  if (!isOpen || !target || !template) return null;

  const handleChecklistChange = (
    itemId: string,
    result: InspectionChecklistResult
  ) => {
    setChecklistResults((prev) => {
      const updated = prev.map((entry) =>
        entry.itemId === itemId ? { ...entry, result } : entry
      );
      // Suggest maintenance condition / follow-up cleanly without overriding explicit DECOMMISSIONED/ISOLATED
      if (result === 'FAIL') {
        if (
          conditionAssessment === 'HEALTHY' ||
          conditionAssessment === 'ATTENTION_REQUIRED'
        ) {
          setConditionAssessment('FAULT_DETECTED');
        }
        setFollowUpRequired(true);
        setRecommendedPriority('Emergency');
      } else if (result === 'ATTENTION' && conditionAssessment === 'HEALTHY') {
        setConditionAssessment('ATTENTION_REQUIRED');
        setFollowUpRequired(true);
        setRecommendedPriority('High');
      }
      return updated;
    });
  };

  const handleChecklistNote = (itemId: string, notes: string) => {
    setChecklistResults((prev) =>
      prev.map((entry) => (entry.itemId === itemId ? { ...entry, notes } : entry))
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);

    if (photos.length + files.length > MAX_INSPECTION_PHOTOS) {
      setError(`Maximum ${MAX_INSPECTION_PHOTOS} photos allowed per inspection record.`);
      e.target.value = '';
      return;
    }

    setPhotoBusy(true);
    try {
      const compressed: InspectionPhotoAttachment[] = [];
      for (const file of Array.from(files)) {
        const attachment = await compressInspectionPhotoFile(file);
        compressed.push(attachment);
      }
      setPhotos((prev) => [...prev, ...compressed].slice(0, MAX_INSPECTION_PHOTOS));
    } catch (err: any) {
      setError(err?.message || 'Failed to attach photo.');
    } finally {
      setPhotoBusy(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!canSubmit) {
      setError(
        `Role "${userRole || 'Operator'}" is not authorized to submit electrical inspections.`
      );
      return;
    }

    const measurements: ElectricalMeasurementValues = {};
    if (currentAmps.trim()) measurements.currentAmps = Number(currentAmps);
    if (currentL1.trim()) measurements.currentL1Amps = Number(currentL1);
    if (currentL2.trim()) measurements.currentL2Amps = Number(currentL2);
    if (currentL3.trim()) measurements.currentL3Amps = Number(currentL3);
    if (voltageV.trim()) measurements.voltageV = Number(voltageV);
    const hasMeasurements = Object.keys(measurements).length > 0;

    const inspectedAtIso = inspectedAtLocal
      ? new Date(inspectedAtLocal).toISOString()
      : new Date().toISOString();

    const payload: Omit<
      SubmitInspectionInput,
      'technicianId' | 'technicianName' | 'technicianRole'
    > = {
      assetId: target.assetId,
      assetKind: target.assetKind,
      assetCode: target.assetCode,
      assetName: target.assetName,
      assetCategory: target.assetCategory,
      plantArea: target.plantArea,
      electricalFeeder: target.electricalFeeder,
      conditionAssessment,
      operatingStateSnapshot: target.operatingStateSnapshot,
      templateId: template.category,
      templateVersion: template.version,
      checklistResults: checklistResults.map((c) => ({
        itemId: c.itemId,
        label: c.label,
        result: c.result,
        notes: c.notes?.trim() ? c.notes.trim() : undefined
      })),
      measurements: hasMeasurements ? measurements : undefined,
      measurementSource: hasMeasurements ? 'MEASURED' : undefined,
      insulationResistanceMohm: insulationMohm.trim()
        ? Number(insulationMohm)
        : undefined,
      windingTempC: windingTempC.trim() ? Number(windingTempC) : undefined,
      ambientTempC: ambientTempC.trim() ? Number(ambientTempC) : undefined,
      observations: observations.trim(),
      photos,
      recommendations: recommendations.trim(),
      followUpRequired,
      followUpAction: followUpAction.trim() || undefined,
      recommendedPriority,
      inspectedAt: inspectedAtIso,
      correctsInspectionId: correctsInspection?.id,
      amendmentReason: correctsInspection ? amendmentReason.trim() : undefined,
      idempotencyKey
    };

    const check = validateElectricalInspectionInput({
      ...payload,
      technicianId: authenticatedUid,
      technicianName: currentUserName,
      technicianRole:
        userRole && userRole !== 'Operator' ? userRole : 'Technician'
    });
    if (!check.valid) {
      setError(check.error || 'Please complete all required inspection fields.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitInspection(payload);
      onClose();
    } catch (err: any) {
      setError(
        err?.message ||
          'Failed to save electrical inspection to Firestore. Asset condition was NOT modified.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <ClipboardCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold text-sm">
                {correctsInspection
                  ? `Corrective Amendment (${correctsInspection.inspectionNumber})`
                  : template.title}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">
                {target.assetCode}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono truncate mt-0.5">
              {target.assetName} • Feeder: {target.electricalFeeder}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Immutable & Auth Attribution Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-700 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>
              Inspector: <strong>{currentUserName}</strong> ({userRole || 'Authenticated'})
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              UID: {authenticatedUid.slice(0, 10)}…
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px]">
            {target.operatingStateSnapshot && (
              <span className="px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-800 font-bold">
                Operating State: {target.operatingStateSnapshot} (Preserved)
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Lock className="w-3 h-3" /> Immutable Ledger
            </span>
          </div>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs bg-[#f8f9fa]">
          {!canSubmit && (
            <div className="p-3 rounded bg-rose-50 border border-rose-300 text-rose-800 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Read-only role ({userRole || 'Operator'}): Technicians, Supervisors, Managers, or Admins must sign in to submit formal electrical inspections.
              </span>
            </div>
          )}

          {correctsInspection && (
            <div className="p-3 rounded bg-amber-50 border border-amber-300 space-y-1.5">
              <label className="block font-bold text-amber-950">
                Amendment Reason (Appends new audit record; {correctsInspection.inspectionNumber} remains immutable) *
              </label>
              <input
                type="text"
                required
                value={amendmentReason}
                onChange={(e) => setAmendmentReason(e.target.value)}
                placeholder="e.g. Verified phase C lug torque & updated Megger reading after isolation"
                className="w-full px-2.5 py-1.5 rounded border border-amber-300 bg-white text-slate-900"
              />
            </div>
          )}

          {/* Condition Assessment + Date/Time */}
          <div className="bg-white p-3.5 rounded border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Maintenance Condition Assessment *
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {SELECTABLE_CONDITIONS.map((cond) => {
                    const meta = getConditionDisplayMeta(cond);
                    const active = conditionAssessment === cond;
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => {
                          setConditionAssessment(cond);
                          if (cond === 'FAULT_DETECTED') {
                            setFollowUpRequired(true);
                            setRecommendedPriority('Emergency');
                          } else if (cond === 'ATTENTION_REQUIRED') {
                            setFollowUpRequired(true);
                            setRecommendedPriority('High');
                          }
                        }}
                        className={`px-2 py-1.5 rounded border text-left font-mono text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition ${
                          active
                            ? 'ring-2 ring-slate-900 border-slate-900 bg-slate-50'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dotClass}`} />
                        <span className="truncate">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Inspection Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={inspectedAtLocal}
                    onChange={(e) => setInspectedAtLocal(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-mono"
                  />
                </div>

                <div className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] text-slate-600">Selected Assessment:</span>
                  <ConditionBadge condition={conditionAssessment} />
                </div>
              </div>
            </div>
          </div>

          {/* Structured Equipment Checklist */}
          <div className="bg-white p-3.5 rounded border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Structured Checklist ({template.category.replace('_', ' ')}) • v{template.version}
                </h4>
                <p className="text-[11px] text-slate-500">{template.description}</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {checklistResults.map((row) => {
                const spec = template.items.find((i) => i.id === row.itemId);
                return (
                  <div key={row.itemId} className="py-2 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-slate-900">{row.label}</span>
                        {spec?.guidance && (
                          <span className="block text-[10.5px] text-slate-500">
                            {spec.guidance}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {(['PASS', 'ATTENTION', 'FAIL', 'NA'] as InspectionChecklistResult[]).map(
                          (opt) => {
                            const selected = row.result === opt;
                            const tone =
                              opt === 'PASS'
                                ? selected
                                  ? 'bg-emerald-600 text-white border-emerald-700'
                                  : 'bg-white text-slate-600 border-slate-300 hover:bg-emerald-50'
                                : opt === 'ATTENTION'
                                ? selected
                                  ? 'bg-amber-500 text-white border-amber-600'
                                  : 'bg-white text-slate-600 border-slate-300 hover:bg-amber-50'
                                : opt === 'FAIL'
                                ? selected
                                  ? 'bg-red-600 text-white border-red-700'
                                  : 'bg-white text-slate-600 border-slate-300 hover:bg-red-50'
                                : selected
                                ? 'bg-slate-700 text-white border-slate-800'
                                : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100';
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleChecklistChange(row.itemId, opt)}
                                className={`px-2 py-0.5 rounded border font-mono text-[10px] font-bold cursor-pointer transition ${tone}`}
                              >
                                {opt}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>

                    <input
                      type="text"
                      value={row.notes || ''}
                      onChange={(e) => handleChecklistNote(row.itemId, e.target.value)}
                      placeholder={
                        row.result === 'FAIL' || row.result === 'ATTENTION'
                          ? 'Describe defect / abnormal finding...'
                          : 'Optional item note...'
                      }
                      className="w-full px-2 py-1 rounded border border-slate-200 bg-slate-50/70 text-[11px] focus:bg-white focus:outline-none focus:border-slate-400"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Field Measurements & Thermal / Megger Readings */}
          <div className="bg-white p-3.5 rounded border border-slate-200 space-y-2.5">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Field Electrical & Thermal Measurements (Optional)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[10.5px] font-medium text-slate-600 mb-0.5">
                  3Ø Avg Current (A)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={currentAmps}
                  onChange={(e) => setCurrentAmps(e.target.value)}
                  placeholder="e.g. 142.5"
                  className="w-full px-2 py-1 rounded border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-medium text-slate-600 mb-0.5">
                  L1 / L2 / L3 (A)
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={currentL1}
                    onChange={(e) => setCurrentL1(e.target.value)}
                    placeholder="L1"
                    className="w-full px-1 py-1 rounded border border-slate-300 font-mono text-[10.5px]"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={currentL2}
                    onChange={(e) => setCurrentL2(e.target.value)}
                    placeholder="L2"
                    className="w-full px-1 py-1 rounded border border-slate-300 font-mono text-[10.5px]"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={currentL3}
                    onChange={(e) => setCurrentL3(e.target.value)}
                    placeholder="L3"
                    className="w-full px-1 py-1 rounded border border-slate-300 font-mono text-[10.5px]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10.5px] font-medium text-slate-600 mb-0.5">
                  Line Voltage (V)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={voltageV}
                  onChange={(e) => setVoltageV(e.target.value)}
                  placeholder="e.g. 402"
                  className="w-full px-2 py-1 rounded border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-medium text-slate-600 mb-0.5">
                  Insulation IR (MΩ)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={insulationMohm}
                  onChange={(e) => setInsulationMohm(e.target.value)}
                  placeholder="e.g. 550"
                  className="w-full px-2 py-1 rounded border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-medium text-slate-600 mb-0.5">
                  Hotspot / Winding (°C)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={windingTempC}
                  onChange={(e) => setWindingTempC(e.target.value)}
                  placeholder="e.g. 54.0"
                  className="w-full px-2 py-1 rounded border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-medium text-slate-600 mb-0.5">
                  Ambient (°C)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={ambientTempC}
                  onChange={(e) => setAmbientTempC(e.target.value)}
                  placeholder="e.g. 29.0"
                  className="w-full px-2 py-1 rounded border border-slate-300 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Observations, Recommendations & Follow-Up */}
          <div className="bg-white p-3.5 rounded border border-slate-200 space-y-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Field Observations *
              </label>
              <textarea
                required
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Summarize physical condition, thermal hotspots, contact wear, oil level, noise, or test findings..."
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Recommendations & Corrective Actions
              </label>
              <textarea
                rows={2}
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="Recommended remedial maintenance, spares required, or stop-day window..."
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white"
              />
            </div>

            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={followUpRequired}
                    onChange={(e) => setFollowUpRequired(e.target.checked)}
                    className="rounded text-[#714B67]"
                  />
                  <span>Follow-Up Maintenance / Job Card Required</span>
                </label>

                {followUpRequired && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-600">Priority:</span>
                    <select
                      value={recommendedPriority}
                      onChange={(e) => setRecommendedPriority(e.target.value as Priority)}
                      className="px-2 py-1 rounded border border-slate-300 bg-white font-semibold"
                    >
                      <option value="Emergency">Emergency</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                )}
              </div>

              {followUpRequired && (
                <input
                  type="text"
                  value={followUpAction}
                  onChange={(e) => setFollowUpAction(e.target.value)}
                  placeholder="Specific follow-up action required before next shift / stop day..."
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                />
              )}
            </div>
          </div>

          {/* Photo Attachments */}
          <div className="bg-white p-3.5 rounded border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">
                Inspection Photographs ({photos.length}/{MAX_INSPECTION_PHOTOS})
              </span>
              <label className="px-2.5 py-1 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer">
                <Camera className="w-3.5 h-3.5" />
                <span>{photoBusy ? 'Compressing...' : 'Attach Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={photoBusy || photos.length >= MAX_INSPECTION_PHOTOS}
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative rounded border border-slate-200 overflow-hidden bg-slate-100"
                  >
                    <img
                      src={photo.dataUrl}
                      alt={photo.name}
                      className="w-full h-24 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
                      }
                      className="absolute top-1 right-1 p-1 rounded bg-slate-900/75 text-white hover:bg-red-600 cursor-pointer"
                      title="Remove photo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="px-1.5 py-0.5 text-[9.5px] font-mono text-slate-600 truncate bg-white">
                      {photo.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-300 text-rose-800 font-semibold">
              {error}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || submitting || photoBusy}
              className="px-4 py-1.5 rounded bg-[#1b4332] hover:bg-[#143326] disabled:opacity-50 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {submitting
                  ? 'Saving Immutable Record...'
                  : correctsInspection
                  ? 'Submit Corrective Record'
                  : 'Submit Electrical Inspection'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
