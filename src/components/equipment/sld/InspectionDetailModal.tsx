import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  History,
  Lock,
  ShieldCheck,
  Wrench,
  X
} from 'lucide-react';
import {
  ElectricalInspection,
  ElectricalInspectionReview,
  ElectricalJobCardPrefill,
  Equipment,
  InspectionReviewStatus,
  JobCard,
  UserProfile
} from '../../../types';
import {
  AssetConditionSummary,
  buildJobCardPrefillFromInspection,
  indexLatestReviewsByInspection
} from '../../../core/electrical/inspections';
import {
  canReviewElectricalInspection,
  canSubmitElectricalInspection
} from '../../../core/electrical/permissions';
import { ConditionBadge } from './ConditionBadge';
import { InspectionTargetAsset } from './ElectricalInspectionModal';

interface InspectionDetailModalProps {
  isOpen: boolean;
  target: InspectionTargetAsset | null;
  summary: AssetConditionSummary | null;
  allReviews: ElectricalInspectionReview[];
  equipmentList: Equipment[];
  jobCards: JobCard[];
  currentUserName: string;
  userRole?: UserProfile['role'] | null;
  userEmail?: string | null;
  onClose: () => void;
  onStartNewInspection: (target: InspectionTargetAsset) => void;
  onStartAmendment: (target: InspectionTargetAsset, inspection: ElectricalInspection) => void;
  onSubmitReview: (params: {
    inspectionId: string;
    assetId: string;
    decision: Exclude<InspectionReviewStatus, 'PENDING_REVIEW'>;
    reviewNotes: string;
  }) => Promise<void>;
  onRaiseJobCard: (prefill: ElectricalJobCardPrefill) => void;
}

export const InspectionDetailModal: React.FC<InspectionDetailModalProps> = ({
  isOpen,
  target,
  summary,
  allReviews,
  equipmentList,
  jobCards,
  currentUserName,
  userRole,
  userEmail,
  onClose,
  onStartNewInspection,
  onStartAmendment,
  onSubmitReview,
  onRaiseJobCard
}) => {
  const inspections = summary?.inspections || [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] =
    useState<Exclude<InspectionReviewStatus, 'PENDING_REVIEW'>>('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const canInspect = canSubmitElectricalInspection(userRole, userEmail);
  const canReview = canReviewElectricalInspection(userRole, userEmail);

  const latestReviewsMap = useMemo(
    () => indexLatestReviewsByInspection(allReviews),
    [allReviews]
  );

  useEffect(() => {
    if (!isOpen) return;
    setSelectedId(inspections[0]?.id || null);
    setReviewNotes('');
    setReviewDecision('APPROVED');
    setReviewError(null);
    setPreviewPhoto(null);
  }, [isOpen, target?.assetId, inspections.length]);

  if (!isOpen || !target) return null;

  const activeInspection =
    inspections.find((i) => i.id === selectedId) || inspections[0] || null;

  const activeReviews = activeInspection
    ? allReviews.filter((r) => r.inspectionId === activeInspection.id)
    : [];
  const latestReview = activeInspection
    ? latestReviewsMap.get(activeInspection.id) || null
    : null;

  const linkedJobCards = activeInspection
    ? jobCards.filter((jc) => jc.inspectionId === activeInspection.id)
    : [];

  const canRaiseWorkOrder =
    activeInspection &&
    (activeInspection.conditionAssessment === 'FAULT_DETECTED' ||
      activeInspection.conditionAssessment === 'ATTENTION_REQUIRED' ||
      activeInspection.followUpRequired ||
      activeInspection.checklistResults.some(
        (c) => c.result === 'FAIL' || c.result === 'ATTENTION'
      ));

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInspection || !canReview || reviewSaving) return;
    setReviewError(null);
    setReviewSaving(true);
    try {
      await onSubmitReview({
        inspectionId: activeInspection.id,
        assetId: activeInspection.assetId,
        decision: reviewDecision,
        reviewNotes
      });
      setReviewNotes('');
    } catch (err: any) {
      setReviewError(err?.message || 'Failed to record supervisor review.');
    } finally {
      setReviewSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-white text-slate-900">
                {target.assetCode}
              </span>
              <span className="font-bold text-sm truncate">{target.assetName}</span>
              <ConditionBadge
                condition={summary?.condition || 'NOT_INSPECTED'}
              />
              {target.operatingStateSnapshot && (
                <span className="px-2 py-0.5 rounded bg-white/10 font-mono text-[10px] text-slate-200">
                  Op State: {target.operatingStateSnapshot}
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-300 mt-0.5 truncate">
              {target.plantArea} • Feeder: {target.electricalFeeder}
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

        {/* Action Toolbar */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-mono">
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {inspections.length} Immutable Inspection Record{inspections.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canInspect && (
              <button
                type="button"
                onClick={() => onStartNewInspection(target)}
                className="px-3 py-1.5 rounded bg-[#1b4332] hover:bg-[#143326] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Log New Inspection</span>
              </button>
            )}

            {activeInspection && canInspect && (
              <button
                type="button"
                onClick={() => onStartAmendment(target, activeInspection)}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Log Corrective Amendment</span>
              </button>
            )}

            {activeInspection && canRaiseWorkOrder && (
              <button
                type="button"
                onClick={() =>
                  onRaiseJobCard(
                    buildJobCardPrefillFromInspection(activeInspection, equipmentList)
                  )
                }
                className="px-3 py-1.5 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Raise ERP Job Card</span>
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 bg-[#f8f9fa]">
          {inspections.length === 0 ? (
            <div className="md:col-span-12 p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto">
                <ClipboardCheck className="w-6 h-6 text-slate-400" />
              </div>
              <div className="text-sm font-bold text-slate-800">
                No Recorded Electrical Inspections Yet
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Asset maintenance condition defaults to <strong>Not Inspected</strong> until an authenticated technician or engineer submits a structured inspection record.
              </p>
              {canInspect && (
                <button
                  type="button"
                  onClick={() => onStartNewInspection(target)}
                  className="px-4 py-2 rounded bg-[#1b4332] hover:bg-[#143326] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Record Initial Electrical Inspection</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Left History Timeline */}
              <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 bg-white divide-y divide-slate-100 max-h-[300px] md:max-h-none overflow-y-auto">
                {inspections.map((insp, idx) => {
                  const isSelected = activeInspection?.id === insp.id;
                  const rev = latestReviewsMap.get(insp.id);
                  return (
                    <button
                      key={insp.id}
                      type="button"
                      onClick={() => setSelectedId(insp.id)}
                      className={`w-full text-left p-3 cursor-pointer transition space-y-1 ${
                        isSelected ? 'bg-slate-100 border-l-4 border-l-slate-900' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[10.5px] font-bold text-slate-900">
                          {insp.inspectionNumber}
                          {idx === 0 ? ' (Latest)' : ''}
                        </span>
                        <ConditionBadge condition={insp.conditionAssessment} compact />
                      </div>
                      <div className="text-[11px] text-slate-700 font-medium truncate">
                        {insp.technicianName}
                      </div>
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-slate-500">
                        <span>{new Date(insp.inspectedAt).toLocaleString()}</span>
                        {rev ? (
                          <span
                            className={`px-1 rounded font-bold ${
                              rev.decision === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {rev.decision}
                          </span>
                        ) : (
                          <span className="text-slate-400">PENDING REV</span>
                        )}
                      </div>
                      {insp.correctsInspectionId && (
                        <div className="text-[9.5px] font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          Corrective Audit Record
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right Selected Inspection Details */}
              {activeInspection && (
                <div className="md:col-span-8 p-4 space-y-4 text-xs">
                  {/* Record Header Card */}
                  <div className="bg-white p-3.5 rounded border border-slate-200 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm text-slate-900">
                          {activeInspection.inspectionNumber}
                        </span>
                        <ConditionBadge condition={activeInspection.conditionAssessment} />
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                          <Lock className="w-2.5 h-2.5" /> Immutable
                        </span>
                      </div>
                      <span className="font-mono text-[10.5px] text-slate-500">
                        {new Date(activeInspection.inspectedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Inspector
                        </span>
                        <span className="font-semibold text-slate-900">
                          {activeInspection.technicianName} ({activeInspection.technicianRole})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Electrical Feeder
                        </span>
                        <span className="font-mono text-slate-800">
                          {activeInspection.electricalFeeder}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Op State Snapshot
                        </span>
                        <span className="font-mono text-slate-800">
                          {activeInspection.operatingStateSnapshot || '—'}
                        </span>
                      </div>
                    </div>

                    {activeInspection.correctsInspectionId && (
                      <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-950 text-[11px]">
                        <strong>Corrective Amendment:</strong> {activeInspection.amendmentReason}
                      </div>
                    )}
                  </div>

                  {/* Checklist Results */}
                  <div className="bg-white p-3.5 rounded border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      Inspection Checklist Results
                    </h4>
                    <div className="divide-y divide-slate-100">
                      {activeInspection.checklistResults.map((item) => (
                        <div key={item.itemId} className="py-1.5 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-800">{item.label}</span>
                            {item.notes && (
                              <span className="block text-[11px] text-slate-600">{item.notes}</span>
                            )}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold shrink-0 ${
                              item.result === 'PASS'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : item.result === 'ATTENTION'
                                ? 'bg-amber-50 text-amber-900 border border-amber-300'
                                : item.result === 'FAIL'
                                ? 'bg-red-50 text-red-800 border border-red-300'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {item.result}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Measurements / Insulation / Thermal */}
                  {(activeInspection.measurements ||
                    activeInspection.insulationResistanceMohm != null ||
                    activeInspection.windingTempC != null) && (
                    <div className="bg-white p-3.5 rounded border border-slate-200 space-y-1.5">
                      <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                        Recorded Field Measurements
                      </h4>
                      <div className="flex flex-wrap gap-2 font-mono text-[11px]">
                        {activeInspection.measurements?.currentAmps != null && (
                          <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200">
                            Iavg: <strong>{activeInspection.measurements.currentAmps} A</strong>
                          </span>
                        )}
                        {activeInspection.measurements?.currentL1Amps != null && (
                          <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200">
                            L1/L2/L3: <strong>{activeInspection.measurements.currentL1Amps}/{activeInspection.measurements.currentL2Amps ?? '—'}/{activeInspection.measurements.currentL3Amps ?? '—'} A</strong>
                          </span>
                        )}
                        {activeInspection.measurements?.voltageV != null && (
                          <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200">
                            V: <strong>{activeInspection.measurements.voltageV} V</strong>
                          </span>
                        )}
                        {activeInspection.insulationResistanceMohm != null && (
                          <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200">
                            IR: <strong>{activeInspection.insulationResistanceMohm} MΩ</strong>
                          </span>
                        )}
                        {activeInspection.windingTempC != null && (
                          <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200">
                            Temp: <strong>{activeInspection.windingTempC} °C</strong>
                          </span>
                        )}
                        {activeInspection.ambientTempC != null && (
                          <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200">
                            Ambient: <strong>{activeInspection.ambientTempC} °C</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Observations & Recommendations */}
                  <div className="bg-white p-3.5 rounded border border-slate-200 space-y-2">
                    <div>
                      <span className="text-[10.5px] font-bold uppercase text-slate-500 block">
                        Observations
                      </span>
                      <p className="text-slate-800 whitespace-pre-wrap mt-0.5">
                        {activeInspection.observations}
                      </p>
                    </div>
                    {activeInspection.recommendations && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10.5px] font-bold uppercase text-slate-500 block">
                          Recommendations
                        </span>
                        <p className="text-slate-800 whitespace-pre-wrap mt-0.5">
                          {activeInspection.recommendations}
                        </p>
                      </div>
                    )}
                    {activeInspection.followUpRequired && (
                      <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-950 flex items-center justify-between gap-2">
                        <div>
                          <strong>Follow-Up Required ({activeInspection.recommendedPriority || 'High'}):</strong>{' '}
                          {activeInspection.followUpAction || 'Corrective maintenance required'}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onRaiseJobCard(
                              buildJobCardPrefillFromInspection(activeInspection, equipmentList)
                            )
                          }
                          className="px-2.5 py-1 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white font-bold text-[11px] shrink-0 cursor-pointer"
                        >
                          Raise Job Card
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Linked Job Cards */}
                  {linkedJobCards.length > 0 && (
                    <div className="bg-white p-3.5 rounded border border-slate-200 space-y-1.5">
                      <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                        Linked ERP Job Cards ({linkedJobCards.length})
                      </h4>
                      <div className="space-y-1">
                        {linkedJobCards.map((jc) => (
                          <div
                            key={jc.id}
                            className="px-2.5 py-1.5 rounded bg-purple-50 border border-purple-200 flex items-center justify-between text-[11px]"
                          >
                            <span className="font-mono font-bold text-[#714B67]">
                              {jc.jobCardNumber} • {jc.priority}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-white border border-purple-200 font-semibold text-slate-700">
                              {jc.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Photos */}
                  {activeInspection.photos.length > 0 && (
                    <div className="bg-white p-3.5 rounded border border-slate-200 space-y-2">
                      <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Inspection Photographs ({activeInspection.photos.length})</span>
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {activeInspection.photos.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPreviewPhoto(p.dataUrl)}
                            className="rounded border border-slate-200 overflow-hidden bg-slate-100 hover:ring-2 hover:ring-slate-900 cursor-pointer"
                          >
                            <img
                              src={p.dataUrl}
                              alt={p.name}
                              className="w-full h-24 object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Supervisor Review & Approval Panel */}
                  <div className="bg-white p-3.5 rounded border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Supervisor Engineering Review</span>
                      </h4>
                      {latestReview ? (
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                            latestReview.decision === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-900 border-amber-300'
                          }`}
                        >
                          {latestReview.decision}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          PENDING REVIEW
                        </span>
                      )}
                    </div>

                    {activeReviews.length > 0 && (
                      <div className="space-y-1.5">
                        {activeReviews.map((rev) => (
                          <div
                            key={rev.id}
                            className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px]"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-900">
                                {rev.reviewerName} ({rev.reviewerRole})
                              </span>
                              <span className="font-mono text-[10px] text-slate-500">
                                {new Date(rev.reviewedAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-slate-700 mt-0.5">
                              <strong>{rev.decision}:</strong> {rev.reviewNotes}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {canReview && (
                      <form onSubmit={handleReviewSubmit} className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={reviewDecision}
                            onChange={(e) =>
                              setReviewDecision(
                                e.target.value as Exclude<InspectionReviewStatus, 'PENDING_REVIEW'>
                              )
                            }
                            className="px-2 py-1 rounded border border-slate-300 bg-white font-semibold"
                          >
                            <option value="APPROVED">Approve Findings</option>
                            <option value="ACTION_REQUIRED">Action Required</option>
                          </select>
                          <span className="text-[11px] text-slate-500">
                            Reviewer: <strong>{currentUserName}</strong>
                          </span>
                        </div>
                        <textarea
                          required
                          rows={2}
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Supervisor sign-off remarks, escalation guidance, or verification notes..."
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                        />
                        {reviewError && (
                          <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                            {reviewError}
                          </div>
                        )}
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={reviewSaving}
                            className="px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {reviewSaving ? 'Recording Review...' : 'Record Supervisor Review'}
                            </span>
                          </button>
                        </div>
                      </form>
                    )}

                    {!canReview && activeReviews.length === 0 && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Awaiting Supervisor or Engineering Manager sign-off.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Photo Lightbox */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4 cursor-pointer"
        >
          <img
            src={previewPhoto}
            alt="Inspection Full Preview"
            className="max-w-full max-h-[90vh] rounded shadow-2xl border border-white/20"
          />
        </div>
      )}
    </div>
  );
};
