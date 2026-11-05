import React, { useState } from 'react';
import {
  X,
  FileText,
  AlertOctagon,
  Clock,
  User,
  Wrench,
  CheckCircle,
  Building,
  ArrowRight,
  Shield,
  Zap,
  Flame,
  Send
} from 'lucide-react';
import {
  Equipment,
  TechnicalTrade,
  ShiftGroup,
  JobCard
} from '../../types';
import {
  TECHNICAL_TRADES_LIST,
  SHIFTS_LIST,
  getActiveStandbyRoster,
  getStaffByTrade
} from '../../core/master-data/organization';

interface QuickLogPhysicalSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (cardData: any) => Promise<void>;
  equipmentList: Equipment[];
  existingCardsCount: number;
}

export const QuickLogPhysicalSlipModal: React.FC<QuickLogPhysicalSlipModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  equipmentList,
  existingCardsCount
}) => {
  const [workOrderNumber, setWorkOrderNumber] = useState<string>(`${188500 + existingCardsCount}`);
  const [slipDate, setSlipDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [slipTime, setSlipTime] = useState<string>('11:30');
  const [originatingDept, setOriginatingDept] = useState<string>('Production - Distillation');
  const [originatedBy, setOriginatedBy] = useState<string>('Atanasio Muchine (Distillation Operator)');
  const [recipientDept, setRecipientDept] = useState<string>('Engineering & Maintenance');
  const [tradeRequired, setTradeRequired] = useState<TechnicalTrade>('Electrician');
  const [requisitionType, setRequisitionType] = useState<'Normal' | 'Call Out' | 'Stop Day'>('Normal');
  const [dangerTagRequired, setDangerTagRequired] = useState<boolean>(false);
  const [dangerTagNumber, setDangerTagNumber] = useState<string>('');
  const [costCenter, setCostCenter] = useState<string>('CC-ENG-03');

  // Equipment selection
  const [equipmentId, setEquipmentId] = useState<string>('');
  const [equipmentName, setEquipmentName] = useState<string>('Cooling Towers - Fan 2 & 11');
  const [workDescription, setWorkDescription] = useState<string>('To attend to the Fans no. 2 & 11');

  // Immediate assignment option
  const [assignImmediately, setAssignImmediately] = useState<boolean>(false);
  const [assignedArtisan, setAssignedArtisan] = useState<string>('Msebenzi Gamedze (Electrician)');
  const [assignedShift, setAssignedShift] = useState<ShiftGroup>('Shift A');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectEquipment = (id: string) => {
    setEquipmentId(id);
    const eq = equipmentList.find((e) => e.id === id);
    if (eq) {
      setEquipmentName(eq.name);
      if (eq.powerKw && eq.powerKw >= 15) {
        setDangerTagRequired(true);
        setDangerTagNumber(`DT-${eq.code.replace('EQ-', '')}`);
      }
    }
  };

  const handleTradeChange = (newTrade: TechnicalTrade) => {
    setTradeRequired(newTrade);
    const staff = getStaffByTrade(newTrade);
    if (staff.length > 0) {
      setAssignedArtisan(`${staff[0].name} (${staff[0].title})`);
    }
    if (newTrade === 'Electrician') {
      setDangerTagRequired(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!workOrderNumber.trim()) {
      setError('Physical Work Order Number is required.');
      return;
    }
    if (!equipmentName.trim()) {
      setError('Equipment name is required.');
      return;
    }
    if (!workDescription.trim()) {
      setError('Work required description is required.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedEq = equipmentList.find((e) => e.id === equipmentId || e.name === equipmentName);

      const payload = {
        jobCardNumber: `WO-${workOrderNumber.trim()}`,
        workOrderNumber: workOrderNumber.trim(),
        department: recipientDept,
        departmentCategory: 'Engineering',
        originatingDepartment: originatingDept,
        recipientDepartment: recipientDept,
        originatedBy,
        originatedTime: slipTime,
        physicalSlipLogged: true,
        equipmentName,
        equipmentId: selectedEq?.id || equipmentId,
        priority: requisitionType === 'Call Out' ? 'Emergency' : requisitionType === 'Stop Day' ? 'High' : 'Medium',
        status: assignImmediately ? 'In Progress' : 'Draft',
        requisitionStage: assignImmediately ? 'Accepted' : 'Pending Acceptance',
        requisitionType,
        costCenter,
        dangerTagRequired,
        dangerTagNumber: dangerTagRequired ? (dangerTagNumber || 'DT-REQ') : undefined,
        description: workDescription,
        tradeRequired,
        shiftAssigned: assignImmediately ? assignedShift : 'Day Shift',
        assignedTo: assignImmediately ? assignedArtisan : 'Pending Supervisor Assignment',
        targetDate: slipDate,
        safetyPermits: {
          lotoRequired: dangerTagRequired,
          lotoTag: dangerTagRequired ? dangerTagNumber : undefined,
          hotWorkRequired: tradeRequired === 'Boilermaker' || tradeRequired === 'Welder',
          confinedSpaceRequired: false,
          heightPermitRequired: tradeRequired === 'Rigger'
        },
        equipmentSpecs: selectedEq ? {
          powerKw: selectedEq.powerKw,
          starterType: selectedEq.starterType,
          overloadAmps: selectedEq.overloadAmps,
          plantArea: selectedEq.plantArea
        } : undefined
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to log physical slip.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden my-6 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#1b4332] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wide uppercase">
                Log Physical Works Requisition Slip
              </h3>
              <p className="text-[11px] text-emerald-300 font-medium">
                Transcribe handwritten operator slip into Department Queue
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs bg-[#f8f9fa] overflow-y-auto grow">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">
              {error}
            </div>
          )}

          {/* Slip Header Box: Work Order No & Date */}
          <div className="bg-white p-3.5 rounded-lg border-2 border-emerald-800/40 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                Work Order No. (Red Stamp) *
              </label>
              <input
                type="text"
                required
                value={workOrderNumber}
                onChange={(e) => setWorkOrderNumber(e.target.value)}
                placeholder="188499"
                className="w-full text-base font-mono font-black text-red-600 bg-red-50/50 border border-red-300 rounded px-2.5 py-1 focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Date on Slip
              </label>
              <input
                type="date"
                required
                value={slipDate}
                onChange={(e) => setSlipDate(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Time Handed In
              </label>
              <input
                type="text"
                value={slipTime}
                onChange={(e) => setSlipTime(e.target.value)}
                placeholder="11:30"
                className="w-full text-xs font-mono font-semibold px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              />
            </div>
          </div>

          {/* Department Routing: From -> To */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-2.5">
            <div className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-700" />
              Inter-Departmental Routing
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Originating Department (Floor Request)
                </label>
                <select
                  value={originatingDept}
                  onChange={(e) => setOriginatingDept(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
                >
                  <option value="Production - Distillation">Production - Distillation Columns</option>
                  <option value="Production - Fermentation">Production - Fermentation Bay</option>
                  <option value="Utilities - Boiler House">Utilities - Boiler House (3× 20T)</option>
                  <option value="Utilities - Water Treatment">Utilities - Water Treatment Plant</option>
                  <option value="Utilities - Turbine Generator">Utilities - 3MW Turbine Power Plant</option>
                  <option value="Logistics - Tanker Loading">Logistics - Tanker Loading Bay</option>
                  <option value="Transport - Fleet Workshop">Transport Workshop</option>
                  <option value="Civils - Facilities">Civils & Grounds</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Recipient Department (Assigned To)
                </label>
                <select
                  value={recipientDept}
                  onChange={(e) => setRecipientDept(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-emerald-50/40 text-emerald-950 font-bold"
                >
                  <option value="Engineering & Maintenance">Engineering & Maintenance (Sam Ngubeni)</option>
                  <option value="Electrical & Instrumentation">Electrical & Instrumentation (Bongani Dlamini)</option>
                  <option value="Utilities Maintenance">Utilities Maintenance (Tintile Gule)</option>
                  <option value="Civils & Maintenance">Civils (Mandla Mngometulu)</option>
                  <option value="Transport Workshop">Transport Workshop (Blessing Ngubeni)</option>
                </select>
              </div>
            </div>

            {/* Originated By (Operator) */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                Originated By (Shift Operator on Slip)
              </label>
              <select
                value={originatedBy}
                onChange={(e) => setOriginatedBy(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
              >
                <optgroup label="Distillation Operators">
                  <option value="Atanasio Muchine (Distillation Operator)">Atanasio Muchine</option>
                  <option value="Jobe Gamedze (Distillation Operator)">Jobe Gamedze</option>
                  <option value="Dumsane Gumede (Distillation Operator)">Dumsane Gumede</option>
                  <option value="Smanga Dlamini (Distillation Operator)">Smanga Dlamini</option>
                </optgroup>
                <optgroup label="Fermentation Operators">
                  <option value="Kenny Kunene (Fermentation Operator)">Kenny Kunene</option>
                  <option value="Themba Mamba (Fermentation Operator)">Themba Mamba</option>
                  <option value="Gerald Fakudze (Fermentation Operator)">Gerald Fakudze</option>
                  <option value="Zandile Nkhabinze (Fermentation Operator)">Zandile Nkhabinze</option>
                </optgroup>
                <optgroup label="Boiler Operators">
                  <option value="Melusi Dlamini (Boiler Operator)">Melusi Dlamini</option>
                  <option value="Bongani Dladla (Boiler Operator)">Bongani Dladla</option>
                  <option value="Bryce Matsenjwa (Boiler Operator)">Bryce Matsenjwa</option>
                  <option value="Victor Vilakati (Boiler Operator)">Victor Vilakati</option>
                </optgroup>
                <optgroup label="Water Treatment">
                  <option value="Andriese Gamedze (Water Plant Operator)">Andriese Gamedze</option>
                  <option value="Masuku (Water Plant Operator)">Masuku</option>
                  <option value="Simphiwe Dlamini (Water Plant Operator)">Simphiwe Dlamini</option>
                  <option value="Sakhile (Water Plant Operator)">Sakhile</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Plant Equipment & Trade */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Plant Asset (Cataloged Machinery)
                </label>
                <select
                  value={equipmentId}
                  onChange={(e) => handleSelectEquipment(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
                >
                  <option value="">-- Choose Asset from 105 Motors --</option>
                  {equipmentList.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      [{eq.plantArea || 'Plant'}] {eq.name} {eq.powerKw ? `(${eq.powerKw} kW)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Equipment Written on Slip *
                </label>
                <input
                  type="text"
                  required
                  value={equipmentName}
                  onChange={(e) => setEquipmentName(e.target.value)}
                  placeholder="Cooling Towers - Fan No. 2 & 11"
                  className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Trade Required *
                </label>
                <select
                  value={tradeRequired}
                  onChange={(e) => handleTradeChange(e.target.value as TechnicalTrade)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-bold text-slate-800"
                >
                  {TECHNICAL_TRADES_LIST.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Requisition Classification
                </label>
                <select
                  value={requisitionType}
                  onChange={(e) => setRequisitionType(e.target.value as any)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                >
                  <option value="Normal">Normal (Routine)</option>
                  <option value="Call Out">🚨 Call Out (Standby Needed)</option>
                  <option value="Stop Day">🛑 Stop Day (Shutdown Priority)</option>
                </select>
              </div>

              <div className={`p-2 rounded border ${dangerTagRequired ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'}`}>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dangerTagRequired}
                    onChange={(e) => setDangerTagRequired(e.target.checked)}
                    className="text-red-600 focus:ring-red-500 rounded"
                  />
                  <span className="text-[10px] font-black uppercase text-red-900">DANGER TAG REQ.</span>
                </label>
                {dangerTagRequired && (
                  <input
                    type="text"
                    value={dangerTagNumber}
                    onChange={(e) => setDangerTagNumber(e.target.value)}
                    placeholder="Tag # (e.g. DT-094)"
                    className="mt-1 w-full text-[11px] px-2 py-0.5 border border-red-300 rounded bg-white font-mono"
                  />
                )}
              </div>
            </div>

            {/* Scope of Work */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                Work Required (Handwritten on Slip) *
              </label>
              <textarea
                required
                rows={2}
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                placeholder="e.g. To attend to the Fan's no. 2 & 11"
                className="w-full text-xs font-serif p-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-700 bg-white"
              />
            </div>
          </div>

          {/* Immediate Assignment Option */}
          <div className="bg-emerald-50/70 border border-emerald-300/80 rounded-lg p-3 space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={assignImmediately}
                onChange={(e) => setAssignImmediately(e.target.checked)}
                className="text-emerald-700 focus:ring-emerald-600 rounded"
              />
              <span className="text-xs font-bold text-emerald-950">
                Immediately Assign Artisan Now (Artisan is in the office)
              </span>
            </label>

            {assignImmediately && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-semibold text-emerald-900 mb-1">
                    Select Artisan
                  </label>
                  <select
                    value={assignedArtisan}
                    onChange={(e) => setAssignedArtisan(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-emerald-400 rounded bg-white font-medium"
                  >
                    {getStaffByTrade(tradeRequired).map((s) => (
                      <option key={s.id} value={`${s.name} (${s.title})`}>
                        {s.name} — {s.title} ({s.shift || 'Standby'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-emerald-900 mb-1">
                    Shift Roster
                  </label>
                  <select
                    value={assignedShift}
                    onChange={(e) => setAssignedShift(e.target.value as ShiftGroup)}
                    className="w-full text-xs px-2.5 py-1.5 border border-emerald-400 rounded bg-white font-medium"
                  >
                    {SHIFTS_LIST.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#1b4332] hover:bg-[#143326] text-white rounded font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <Send className="w-3.5 h-3.5 text-emerald-300" />
              <span>{submitting ? 'Logging Slip...' : assignImmediately ? 'Log & Assign Artisan' : 'Log to Department Queue'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
