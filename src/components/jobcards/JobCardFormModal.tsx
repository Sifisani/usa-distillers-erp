import React, { useState, useEffect } from 'react';
import {
  X,
  Wrench,
  AlertTriangle,
  Calendar,
  User,
  Building,
  CheckCircle,
  Hash,
  FileText,
  Clock,
  Sparkles,
  Zap,
  ShieldCheck,
  Flame,
  ArrowRight,
  Layers,
  PhoneCall
} from 'lucide-react';
import {
  JobCard,
  Priority,
  JobCardStatus,
  DEPARTMENTS_BY_CATEGORY,
  Equipment,
  TechnicalTrade,
  ShiftGroup,
  SafetyPermits,
  ElectricalJobCardPrefill
} from '../../types';
import { generateNextJobCardNumber } from '../../services/jobCardService';
import {
  COMPANY_ORGANOGRAM,
  TECHNICAL_TRADES_LIST,
  SHIFTS_LIST,
  getActiveStandbyRoster,
  getStaffByTrade,
  getStaffByShift
} from '../../core/master-data/organization';

interface JobCardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (cardData: any) => Promise<void>;
  existingCard?: JobCard | null;
  prefillData?: ElectricalJobCardPrefill | null;
  existingCards: JobCard[];
  equipmentList: Equipment[];
}

export const JobCardFormModal: React.FC<JobCardFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingCard,
  prefillData = null,
  existingCards,
  equipmentList
}) => {
  const [departmentCategory, setDepartmentCategory] = useState<string>('Utilities');
  const [department, setDepartment] = useState<string>('Utilities - Boiler House');
  const [jobCardNumber, setJobCardNumber] = useState<string>('');
  const [equipmentName, setEquipmentName] = useState<string>('');
  const [equipmentId, setEquipmentId] = useState<string>('');
  const [equipmentCode, setEquipmentCode] = useState<string>('');
  const [electricalFeeder, setElectricalFeeder] = useState<string>('');
  const [inspectionId, setInspectionId] = useState<string>('');
  const [inspectionReference, setInspectionReference] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [status, setStatus] = useState<JobCardStatus>('Draft');
  const [description, setDescription] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('Phumelele Maseko — Mechanical Fitter (Shift A)');
  const [targetDate, setTargetDate] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Real plant operations extensions
  const [tradeRequired, setTradeRequired] = useState<TechnicalTrade>('Mechanical Fitter');
  const [shiftAssigned, setShiftAssigned] = useState<ShiftGroup>('Shift A');
  const [standbyTechnician, setStandbyTechnician] = useState<string>('');

  // Official Works Requisition fields (Slip #188499)
  const [workOrderNumber, setWorkOrderNumber] = useState<string>('188499');
  const [requisitionType, setRequisitionType] = useState<'Normal' | 'Call Out' | 'Stop Day'>('Normal');
  const [costCenter, setCostCenter] = useState<string>('CC-ENG-03');
  const [dangerTagRequired, setDangerTagRequired] = useState<boolean>(false);
  const [dangerTagNumber, setDangerTagNumber] = useState<string>('');
  const [recipientDepartment, setRecipientDepartment] = useState<string>('Engineering Dept.');
  const [originatedBy, setOriginatedBy] = useState<string>('Atanasio Muchine (Distillation)');
  const [originatedTime, setOriginatedTime] = useState<string>('11:30');

  // Safety permits
  const [lotoRequired, setLotoRequired] = useState<boolean>(false);
  const [lotoTag, setLotoTag] = useState<string>('');
  const [hotWorkRequired, setHotWorkRequired] = useState<boolean>(false);
  const [confinedSpaceRequired, setConfinedSpaceRequired] = useState<boolean>(false);
  const [heightPermitRequired, setHeightPermitRequired] = useState<boolean>(false);

  // Selected equipment technical specs
  const selectedEquipment = equipmentList.find((e) => e.id === equipmentId || e.name === equipmentName);
  const standbyRoster = getActiveStandbyRoster();

  // Initialize or reset form
  useEffect(() => {
    if (existingCard) {
      setJobCardNumber(existingCard.jobCardNumber);
      setDepartment(existingCard.department);
      setDepartmentCategory(existingCard.departmentCategory || 'Engineering');
      setEquipmentName(existingCard.equipmentName);
      setEquipmentId(existingCard.equipmentId || '');
      setEquipmentCode(existingCard.equipmentCode || '');
      setElectricalFeeder(existingCard.electricalFeeder || '');
      setInspectionId(existingCard.inspectionId || '');
      setInspectionReference(existingCard.inspectionReference || '');
      setPriority(existingCard.priority);
      setStatus(existingCard.status);
      setDescription(existingCard.description);
      setAssignedTo(existingCard.assignedTo);
      setTargetDate(existingCard.targetDate || '');
      setTradeRequired(existingCard.tradeRequired || 'Mechanical Fitter');
      setShiftAssigned(existingCard.shiftAssigned || 'Shift A');
      setStandbyTechnician(existingCard.standbyTechnician || '');

      if (existingCard.safetyPermits) {
        setLotoRequired(existingCard.safetyPermits.lotoRequired || false);
        setLotoTag(existingCard.safetyPermits.lotoTag || '');
        setHotWorkRequired(existingCard.safetyPermits.hotWorkRequired || false);
        setConfinedSpaceRequired(existingCard.safetyPermits.confinedSpaceRequired || false);
        setHeightPermitRequired(existingCard.safetyPermits.heightPermitRequired || false);
      }

      setWorkOrderNumber(existingCard.workOrderNumber || existingCard.jobCardNumber.replace(/[^0-9]/g, '') || '188499');
      setRequisitionType(existingCard.requisitionType || (existingCard.priority === 'Emergency' ? 'Call Out' : 'Normal'));
      setCostCenter(existingCard.costCenter || 'CC-ENG-03');
      setDangerTagRequired(existingCard.dangerTagRequired || existingCard.safetyPermits?.lotoRequired || false);
      setDangerTagNumber(existingCard.dangerTagNumber || existingCard.safetyPermits?.lotoTag || '');
      setRecipientDepartment(existingCard.recipientDepartment || 'Engineering Dept.');
      setOriginatedBy(existingCard.originatedBy || existingCard.createdByName || 'Atanasio Muchine (Distillation)');
      setOriginatedTime(existingCard.originatedTime || '11:30');
    } else if (prefillData) {
      const cat = prefillData.departmentCategory || 'Engineering';
      const autoNum = generateNextJobCardNumber(cat, existingCards);
      setJobCardNumber(autoNum);
      setWorkOrderNumber(`${188500 + existingCards.length}`);
      setRequisitionType(prefillData.priority === 'Emergency' ? 'Call Out' : 'Normal');
      setCostCenter('CC-ENG-03');
      setDepartmentCategory(cat);
      setDepartment(prefillData.department || 'Engineering - Electrical & Instrumentation');
      setEquipmentName(prefillData.equipmentName || '');
      setEquipmentId(prefillData.equipmentId || '');
      setEquipmentCode(prefillData.equipmentCode || '');
      setElectricalFeeder(prefillData.electricalFeeder || '');
      setInspectionId(prefillData.inspectionId || '');
      setInspectionReference(prefillData.inspectionReference || '');
      setPriority(prefillData.priority || 'High');
      setStatus('Draft');
      setDescription(prefillData.description || '');
      setTradeRequired('Electrician');
      setShiftAssigned('Shift A');
      setStandbyTechnician('');
      setAssignedTo('Msebenzi Gamedze — Electrician (Standby)');
      setLotoRequired(Boolean(prefillData.dangerTagRequired));
      setLotoTag(prefillData.dangerTagNumber || '');
      setDangerTagRequired(Boolean(prefillData.dangerTagRequired));
      setDangerTagNumber(prefillData.dangerTagNumber || '');
      setHotWorkRequired(false);
      setConfinedSpaceRequired(false);
      setHeightPermitRequired(false);
      setRecipientDepartment('Engineering Dept.');
      setOriginatedBy('Electrical Inspection System');
      const now = new Date();
      setOriginatedTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      const d = new Date();
      d.setDate(d.getDate() + (prefillData.priority === 'Emergency' ? 0 : 1));
      setTargetDate(d.toISOString().split('T')[0]);
    } else {
      // Create mode: auto-generate next JC number based on category
      const autoNum = generateNextJobCardNumber(departmentCategory, existingCards);
      setJobCardNumber(autoNum);
      const generatedWoNum = `${188500 + existingCards.length}`;
      setWorkOrderNumber(generatedWoNum);
      setRequisitionType('Normal');
      setCostCenter('CC-ENG-03');
      setDangerTagRequired(false);
      setDangerTagNumber('');
      setRecipientDepartment('Engineering Dept.');
      setOriginatedBy('Atanasio Muchine (Distillation)');
      
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setOriginatedTime(timeStr);

      setDepartmentCategory('Utilities');
      setDepartment('Utilities - Boiler House');
      setEquipmentName('');
      setEquipmentId('');
      setEquipmentCode('');
      setElectricalFeeder('');
      setInspectionId('');
      setInspectionReference('');
      setPriority('Medium');
      setStatus('Draft');
      setDescription('');
      setTradeRequired('Mechanical Fitter');
      setShiftAssigned('Shift A');
      setStandbyTechnician('');
      setAssignedTo('Phumelele Maseko — Mechanical Fitter (Shift A)');
      setLotoRequired(false);
      setLotoTag('');
      setHotWorkRequired(false);
      setConfinedSpaceRequired(false);
      setHeightPermitRequired(false);

      // Default target date to +2 days from now
      const d = new Date();
      d.setDate(d.getDate() + 2);
      setTargetDate(d.toISOString().split('T')[0]);
    }
  }, [existingCard, prefillData, isOpen]);

  // Recalculate auto JC number when category changes (only in create mode)
  const handleCategoryChange = (cat: string) => {
    setDepartmentCategory(cat);
    const group = DEPARTMENTS_BY_CATEGORY.find((g) => g.category === cat);
    if (group && group.departments.length > 0) {
      setDepartment(`${cat} - ${group.departments[0]}`);
    }
    if (!existingCard) {
      const nextNum = generateNextJobCardNumber(cat, existingCards);
      setJobCardNumber(nextNum);
    }
  };

  // Select equipment helper
  const handleSelectEquipment = (equipId: string) => {
    setEquipmentId(equipId);
    const selected = equipmentList.find((e) => e.id === equipId);
    if (selected) {
      setEquipmentName(selected.name);
      if (selected.department) {
        setDepartment(selected.department);
        const cat = selected.department.split(' - ')[0];
        if (cat) setDepartmentCategory(cat);
      }
      // Auto-flag LOTO requirement for high power electrical machinery (>15 kW or Star-Delta / VSD)
      if (selected.powerKw && selected.powerKw >= 15) {
        setLotoRequired(true);
        if (!lotoTag) setLotoTag(`LOTO-${selected.code.replace('EQ-', '')}`);
      }
    }
  };

  // Quick auto-assign based on Trade & Shift
  const handleTradeChange = (newTrade: TechnicalTrade) => {
    setTradeRequired(newTrade);
    // Find matching technicians for trade
    const staffInTrade = getStaffByTrade(newTrade);
    if (staffInTrade.length > 0) {
      // If a shift is selected, try to find the artisan on that shift
      const shiftArtisan = staffInTrade.find((s) => s.shift === shiftAssigned);
      if (shiftArtisan) {
        setAssignedTo(`${shiftArtisan.name} — ${shiftArtisan.title}`);
      } else {
        setAssignedTo(`${staffInTrade[0].name} — ${staffInTrade[0].title}`);
      }
    }

    // Auto-set permits based on trade
    if (newTrade === 'Boilermaker' || newTrade === 'Welder') {
      setHotWorkRequired(true);
    }
    if (newTrade === 'Electrician') {
      setLotoRequired(true);
    }
    if (newTrade === 'Rigger') {
      setHeightPermitRequired(true);
    }
  };

  const handleShiftChange = (newShift: ShiftGroup) => {
    setShiftAssigned(newShift);
    const staffInTrade = getStaffByTrade(tradeRequired);
    const shiftArtisan = staffInTrade.find((s) => s.shift === newShift);
    if (shiftArtisan) {
      setAssignedTo(`${shiftArtisan.name} — ${shiftArtisan.title}`);
    }
    if (newShift === 'Standby Callout') {
      if (tradeRequired === 'Electrician') {
        const standby = standbyRoster.find((r) => r.trade === 'Electrician');
        if (standby) {
          setStandbyTechnician(standby.onDuty.name);
          setAssignedTo(`${standby.onDuty.name} — ${standby.onDuty.title}`);
        }
      } else if (tradeRequired === 'Boilermaker' || tradeRequired === 'Welder') {
        const standby = standbyRoster.find((r) => r.trade === tradeRequired);
        if (standby) {
          setStandbyTechnician(standby.onDuty.name);
          setAssignedTo(`${standby.onDuty.name} — ${standby.onDuty.title}`);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!jobCardNumber.trim()) {
      setError('Job Card Number is required.');
      return;
    }
    if (!equipmentName.trim()) {
      setError('Equipment / Asset Name is required.');
      return;
    }
    if (!description.trim()) {
      setError('Description of Work is required.');
      return;
    }

    const safetyPermitsPayload: SafetyPermits = {
      lotoRequired,
      lotoTag: lotoRequired ? lotoTag : undefined,
      hotWorkRequired,
      confinedSpaceRequired,
      heightPermitRequired
    };

    const equipmentSpecsPayload = selectedEquipment ? {
      speedRpm: selectedEquipment.speedRpm,
      powerKw: selectedEquipment.powerKw,
      ratedCurrentAmps: selectedEquipment.ratedCurrentAmps,
      loadCurrentAmps: selectedEquipment.loadCurrentAmps,
      overloadAmps: selectedEquipment.overloadAmps,
      starterType: selectedEquipment.starterType,
      plantArea: selectedEquipment.plantArea
    } : undefined;

    setSubmitting(true);
    try {
      await onSubmit({
        jobCardNumber,
        department,
        departmentCategory,
        equipmentName,
        equipmentId,
        equipmentCode: equipmentCode || selectedEquipment?.code || undefined,
        electricalFeeder: electricalFeeder || selectedEquipment?.feederPanel || undefined,
        inspectionId: inspectionId || undefined,
        inspectionReference: inspectionReference || undefined,
        priority,
        status,
        description,
        assignedTo,
        targetDate,
        tradeRequired,
        shiftAssigned,
        standbyTechnician: shiftAssigned === 'Standby Callout' ? standbyTechnician : undefined,
        safetyPermits: safetyPermitsPayload,
        equipmentSpecs: equipmentSpecsPayload || prefillData?.equipmentSpecs,
        // Official Works Requisition Slip fields
        workOrderNumber,
        requisitionType,
        costCenter,
        dangerTagRequired: dangerTagRequired || lotoRequired,
        dangerTagNumber: dangerTagNumber || (lotoRequired ? lotoTag : undefined),
        recipientDepartment,
        originatedBy,
        originatedTime
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save Job Card.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentCategoryGroup = DEPARTMENTS_BY_CATEGORY.find((g) => g.category === departmentCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Odoo Header */}
        <div className="bg-[#714B67] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                {existingCard ? `Edit Work Order: ${existingCard.jobCardNumber}` : 'Raise Industrial Job Card'}
              </h3>
              <p className="text-[11px] text-white/70">USA Distillers ERP — Maintenance & Engineering CMMS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition cursor-pointer p-1 rounded hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs bg-[#f8f9fa] overflow-y-auto grow">
          {error && (
            <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {(inspectionReference || electricalFeeder) && (
            <div className="p-3 rounded bg-purple-50 border border-purple-200 text-purple-900 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#714B67]" />
                Linked Electrical Inspection Finding
              </span>
              <span className="font-mono text-[11px]">
                {inspectionReference ? `Ref: ${inspectionReference}` : ''}{inspectionReference && electricalFeeder ? ' • ' : ''}{electricalFeeder ? `Feeder: ${electricalFeeder}` : ''}
              </span>
            </div>
          )}

          {/* Official Works Requisition Slip Header (from physical slip WO #188499) */}
          <div className="bg-[#f4f6f4] p-3.5 rounded border-2 border-emerald-800/40 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-800/20 pb-2">
              <div className="flex items-center space-x-2">
                <img
                  src="/assets/aistudio/Screenshot_2024-01-26_104006_cd1bebac.png"
                  alt="USA Distillers"
                  className="h-9 w-auto rounded bg-[#1e4620] p-0.5 border border-emerald-950"
                />
                <div>
                  <span className="font-black text-xs text-slate-900 tracking-wide uppercase block">
                    WORKS REQUISITION
                  </span>
                  <span className="text-[10px] text-emerald-900 font-medium">
                    USA Distillers (Pty) Ltd • Big Bend Plant
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">WORK ORDER NO:</span>
                  <input
                    type="text"
                    value={workOrderNumber}
                    onChange={(e) => setWorkOrderNumber(e.target.value)}
                    placeholder="188499"
                    className="w-24 text-center font-mono font-black text-red-600 bg-white border border-red-300 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Slip Meta Checkboxes: Requisition Type & Danger Tag */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Type options: Normal, Call Out, Stop Day */}
              <div className="bg-white p-2 rounded border border-slate-200">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Requisition Classification
                </label>
                <div className="flex items-center space-x-3 text-xs">
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="reqType"
                      checked={requisitionType === 'Normal'}
                      onChange={() => setRequisitionType('Normal')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-800">Normal</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="reqType"
                      checked={requisitionType === 'Call Out'}
                      onChange={() => setRequisitionType('Call Out')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="font-semibold text-slate-800">Call Out</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="reqType"
                      checked={requisitionType === 'Stop Day'}
                      onChange={() => setRequisitionType('Stop Day')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="font-semibold text-slate-800">Stop Day</span>
                  </label>
                </div>
              </div>

              {/* Danger Tag Req */}
              <div className={`p-2 rounded border ${dangerTagRequired ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dangerTagRequired}
                      onChange={(e) => {
                        setDangerTagRequired(e.target.checked);
                        if (e.target.checked) setLotoRequired(true);
                      }}
                      className="text-red-600 focus:ring-red-500 rounded"
                    />
                    <span className="text-[10px] font-black uppercase text-red-900">DANGER TAG REQ.</span>
                  </label>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${dangerTagRequired ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {dangerTagRequired ? 'YES' : 'NO'}
                  </span>
                </div>
                {dangerTagRequired && (
                  <input
                    type="text"
                    value={dangerTagNumber}
                    onChange={(e) => {
                      setDangerTagNumber(e.target.value);
                      setLotoTag(e.target.value);
                    }}
                    placeholder="Tag # (e.g. DT-094)"
                    className="mt-1 w-full text-[11px] px-2 py-0.5 border border-red-300 rounded bg-white font-mono"
                  />
                )}
              </div>

              {/* Originated By & Time */}
              <div className="bg-white p-2 rounded border border-slate-200">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Originated By (Shift Staff)
                </label>
                <div className="flex items-center space-x-1.5">
                  <select
                    value={originatedBy}
                    onChange={(e) => setOriginatedBy(e.target.value)}
                    className="w-full text-[11px] px-1.5 py-0.5 border border-slate-300 rounded bg-white font-medium"
                  >
                    <optgroup label="Distillation Operators">
                      <option value="Atanasio Muchine (Distillation)">Atanasio Muchine</option>
                      <option value="Jobe Gamedze (Distillation)">Jobe Gamedze</option>
                      <option value="Dumsane Gumede (Distillation)">Dumsane Gumede</option>
                      <option value="Smanga Dlamini (Distillation)">Smanga Dlamini</option>
                    </optgroup>
                    <optgroup label="Fermentation Operators">
                      <option value="Kenny Kunene (Fermentation)">Kenny Kunene</option>
                      <option value="Themba Mamba (Fermentation)">Themba Mamba</option>
                      <option value="Gerald Fakudze (Fermentation)">Gerald Fakudze</option>
                      <option value="Zandile Nkhabinze (Fermentation)">Zandile Nkhabinze</option>
                    </optgroup>
                    <optgroup label="Boiler Operators">
                      <option value="Melusi Dlamini (Boilers)">Melusi Dlamini</option>
                      <option value="Bongani Dladla (Boilers)">Bongani Dladla</option>
                      <option value="Bryce Matsenjwa (Boilers)">Bryce Matsenjwa</option>
                      <option value="Victor Vilakati (Boilers)">Victor Vilakati</option>
                    </optgroup>
                    <optgroup label="Water Treatment">
                      <option value="Andriese Gamedze (Water Plant)">Andriese Gamedze</option>
                      <option value="Masuku (Water Plant)">Masuku</option>
                      <option value="Simphiwe Dlamini (Water Plant)">Simphiwe Dlamini</option>
                      <option value="Sakhile (Water Plant)">Sakhile</option>
                    </optgroup>
                  </select>
                  <input
                    type="text"
                    value={originatedTime}
                    onChange={(e) => setOriginatedTime(e.target.value)}
                    placeholder="11:30"
                    title="Time Originated"
                    className="w-14 text-center font-mono text-xs px-1 py-0.5 border border-slate-300 rounded bg-slate-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Row 1: Auto Number, Status & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded border border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-[#714B67]" />
                Job Card #
              </label>
              <input
                type="text"
                required
                value={jobCardNumber}
                onChange={(e) => setJobCardNumber(e.target.value)}
                placeholder="JC-ENG-2026-001"
                className="w-full text-xs font-mono font-bold px-2.5 py-1.5 border border-slate-300 rounded focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] bg-slate-50 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as JobCardStatus)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-[#714B67] bg-white font-medium"
              >
                <option value="Draft">Draft</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending Spares">Pending Spares</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className={`w-full text-xs px-2.5 py-1.5 border rounded font-bold ${
                  priority === 'Emergency' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                  priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-300' :
                  priority === 'Medium' ? 'bg-sky-50 text-sky-700 border-sky-300' :
                  'bg-slate-50 text-slate-700 border-slate-300'
                }`}
              >
                <option value="Low">Low (Scheduled PM)</option>
                <option value="Medium">Medium (Routine)</option>
                <option value="High">High (Impending Failure)</option>
                <option value="Emergency">🚨 Emergency (Plant Breakdown)</option>
              </select>
            </div>
          </div>

          {/* Row 2: Equipment / Machinery from Master Checklist */}
          <div className="bg-white p-3.5 rounded border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-[#714B67]" />
                Machinery Asset (Electrical Plant Checklist Registry)
              </span>
              <span className="text-[10px] text-slate-400">105 Cataloged Motor & Pump Assets</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Select Registered Plant Asset
                </label>
                <select
                  value={equipmentId}
                  onChange={(e) => handleSelectEquipment(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-[#714B67] bg-white font-medium"
                >
                  <option value="">-- Choose Asset from Official Checklist --</option>
                  {equipmentList.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      [{eq.plantArea || eq.department.split(' - ')[1] || 'Plant'}] {eq.name} {eq.powerKw ? `(${eq.powerKw} kW - ${eq.starterType || 'DOL'})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Equipment / Asset Label *
                </label>
                <input
                  type="text"
                  required
                  value={equipmentName}
                  onChange={(e) => setEquipmentName(e.target.value)}
                  placeholder="e.g. Boiler 1 - ID Fan (Induced Draft)"
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-[#714B67]"
                />
              </div>
            </div>

            {/* Electrical & Technical Specs Badge */}
            {selectedEquipment && (
              <div className="bg-purple-50/60 border border-purple-200 rounded p-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-purple-900">
                <span className="font-bold flex items-center gap-1 text-[#714B67]">
                  <Zap className="w-3 h-3 text-amber-500" />
                  Asset Specifications:
                </span>
                {selectedEquipment.powerKw && (
                  <span>
                    <strong>Power:</strong> {selectedEquipment.powerKw} kW
                  </span>
                )}
                {selectedEquipment.starterType && (
                  <span className="bg-purple-200/70 text-purple-800 px-1.5 py-0.5 rounded font-mono font-semibold">
                    Starter: {selectedEquipment.starterType}
                  </span>
                )}
                {selectedEquipment.ratedCurrentAmps && (
                  <span>
                    <strong>Rated Current:</strong> {selectedEquipment.ratedCurrentAmps} A
                  </span>
                )}
                {selectedEquipment.overloadAmps && (
                  <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-semibold">
                    O/L Trip: {selectedEquipment.overloadAmps} A
                  </span>
                )}
                {selectedEquipment.speedRpm && (
                  <span>
                    <strong>Speed:</strong> {selectedEquipment.speedRpm} RPM
                  </span>
                )}
                {selectedEquipment.plantArea && (
                  <span className="text-slate-600">
                    Area: <strong>{selectedEquipment.plantArea}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Row 3: Technical Trade & Shift / Standby Dispatch */}
          <div className="bg-white p-3.5 rounded border border-slate-200 space-y-3">
            <div className="font-semibold text-slate-800 text-xs border-b border-slate-100 pb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#714B67]" />
                Technical Crew Dispatch & Roster
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                4-Shift Continuous + Standby Rotation
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  1. Trade Required *
                </label>
                <select
                  value={tradeRequired}
                  onChange={(e) => handleTradeChange(e.target.value as TechnicalTrade)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-[#714B67] bg-white font-medium"
                >
                  {TECHNICAL_TRADES_LIST.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} ({t.crewType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  2. Shift / Dispatch Mode *
                </label>
                <select
                  value={shiftAssigned}
                  onChange={(e) => handleShiftChange(e.target.value as ShiftGroup)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-[#714B67] bg-white font-medium"
                >
                  {SHIFTS_LIST.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({s.timing})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  3. Assigned Lead Artisan / Operator *
                </label>
                <input
                  type="text"
                  required
                  list="plant-staff-list"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Select technician"
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-[#714B67]"
                />
                <datalist id="plant-staff-list">
                  {COMPANY_ORGANOGRAM.map((member) => (
                    <option
                      key={member.id}
                      value={`${member.name} — ${member.title}`}
                    >
                      {member.trade ? `[${member.trade}${member.shift ? ` - ${member.shift}` : ''}] ` : ''}{member.department}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            {/* Standby Call-out Alert Box */}
            {shiftAssigned === 'Standby Callout' && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-[11px] text-amber-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">Active Standby Rotation (Wed 17:00 to Wed 17:00):</span>
                    <span className="ml-1 text-slate-700">
                      Electrical: <strong>Msebenzi Gamedze</strong> | Boilermaking: <strong>John Khoza</strong> | Welding: <strong>Makhosi Mbhamali</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Row 4: Permit to Work & Safety Gates (LOTO & Hot Work) */}
          <div className="bg-white p-3.5 rounded border border-slate-200 space-y-2.5">
            <div className="font-semibold text-slate-800 text-xs border-b border-slate-100 pb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Permit to Work (PTW) & Safety Isolation Gates
              </span>
              <span className="text-[10px] text-slate-400">HSE Compliance Protocol</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* LOTO */}
              <div className={`p-2.5 rounded border ${lotoRequired ? 'bg-amber-50/50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                  <input
                    type="checkbox"
                    checked={lotoRequired}
                    onChange={(e) => setLotoRequired(e.target.checked)}
                    className="rounded text-[#714B67] focus:ring-[#714B67] w-3.5 h-3.5"
                  />
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    Electrical LOTO Required (Lock-Out / Tag-Out)
                  </span>
                </label>
                {lotoRequired && (
                  <div className="pl-5 space-y-1">
                    <label className="block text-[10px] text-slate-600 font-medium">LOTO Padlock / Tag ID</label>
                    <input
                      type="text"
                      value={lotoTag}
                      onChange={(e) => setLotoTag(e.target.value)}
                      placeholder="e.g. LOTO-MCC-04-TAG-12"
                      className="w-full text-xs px-2 py-1 border border-amber-300 rounded bg-white font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Hot Work & Permits */}
              <div className="p-2.5 rounded border bg-slate-50 border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hotWorkRequired}
                    onChange={(e) => setHotWorkRequired(e.target.checked)}
                    className="rounded text-[#714B67] focus:ring-[#714B67] w-3.5 h-3.5"
                  />
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-600" />
                    Hot Work Permit (Welding / Flame Cutting)
                  </span>
                </label>

                <div className="flex items-center gap-4 pl-5">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={confinedSpaceRequired}
                      onChange={(e) => setConfinedSpaceRequired(e.target.checked)}
                      className="rounded text-[#714B67] w-3 h-3"
                    />
                    <span>Confined Space Entry</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={heightPermitRequired}
                      onChange={(e) => setHeightPermitRequired(e.target.checked)}
                      className="rounded text-[#714B67] w-3 h-3"
                    />
                    <span>Working at Heights / Rigging</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Row 5: Description & Target Date */}
          <div className="bg-white p-3.5 rounded border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Target Completion Date *
                </label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-[#714B67] bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Plant Department
                </label>
                <input
                  type="text"
                  readOnly
                  value={department}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-slate-50 text-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description of Work & Fault Details *
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail breakdown symptoms, leak rates, tripped overload amps, required mechanical seals, bearing part numbers, or fabrication notes..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] resize-y"
              ></textarea>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                <span>Provide clear technical notes for shift handovers and stores requisition.</span>
                <span>{description.length} characters</span>
              </div>
            </div>
          </div>

          {/* Modal Action Footer */}
          <div className="pt-2 flex items-center justify-end space-x-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
            >
              {submitting ? (
                <span>Dispatching Work Order...</span>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{existingCard ? 'Update Job Card' : 'Dispatch Job Card'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
