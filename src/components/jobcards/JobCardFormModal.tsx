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
  Sparkles
} from 'lucide-react';
import { JobCard, Priority, JobCardStatus, DEPARTMENTS_BY_CATEGORY, Equipment } from '../../types';
import { generateNextJobCardNumber } from '../../services/jobCardService';
import { COMPANY_ORGANOGRAM, getSupervisorsForDepartment } from '../../core/master-data/organization';

interface JobCardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (cardData: any) => Promise<void>;
  existingCard?: JobCard | null;
  existingCards: JobCard[];
  equipmentList: Equipment[];
}

export const JobCardFormModal: React.FC<JobCardFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingCard,
  existingCards,
  equipmentList
}) => {
  const [departmentCategory, setDepartmentCategory] = useState<string>('Engineering');
  const [department, setDepartment] = useState<string>('Engineering - Mechanical Maintenance');
  const [jobCardNumber, setJobCardNumber] = useState<string>('');
  const [equipmentName, setEquipmentName] = useState<string>('');
  const [equipmentId, setEquipmentId] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [status, setStatus] = useState<JobCardStatus>('Draft');
  const [description, setDescription] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('Sam Ngubeni — Maintenance Supervisor');
  const [targetDate, setTargetDate] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset form
  useEffect(() => {
    if (existingCard) {
      setJobCardNumber(existingCard.jobCardNumber);
      setDepartment(existingCard.department);
      setDepartmentCategory(existingCard.departmentCategory || 'Engineering');
      setEquipmentName(existingCard.equipmentName);
      setEquipmentId(existingCard.equipmentId || '');
      setPriority(existingCard.priority);
      setStatus(existingCard.status);
      setDescription(existingCard.description);
      setAssignedTo(existingCard.assignedTo);
      setTargetDate(existingCard.targetDate || '');
    } else {
      // Create mode: auto-generate next JC number based on category
      const autoNum = generateNextJobCardNumber(departmentCategory, existingCards);
      setJobCardNumber(autoNum);
      setDepartmentCategory('Utilities');
      setDepartment('Utilities - Boiler House');
      setEquipmentName('');
      setEquipmentId('');
      setPriority('Medium');
      setStatus('Draft');
      setDescription('');
      setAssignedTo('Tintile Gule — Utilities Supervisor');

      // Default target date to +2 days from now
      const d = new Date();
      d.setDate(d.getDate() + 2);
      setTargetDate(d.toISOString().split('T')[0]);
    }
  }, [existingCard, isOpen]);

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

    setSubmitting(true);
    try {
      await onSubmit({
        jobCardNumber,
        department,
        departmentCategory,
        equipmentName,
        equipmentId,
        priority,
        status,
        description,
        assignedTo,
        targetDate
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
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Odoo Form Header */}
        <div className="bg-[#714B67] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                {existingCard ? `Edit Job Card: ${existingCard.jobCardNumber}` : 'New Maintenance Job Card'}
              </h3>
              <p className="text-[11px] text-white/70">USA Distillers ERP - Work Order Dispatch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs bg-[#f8f9fa]">
          {error && (
            <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Top Row: Auto JC Number & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-[#714B67]" />
                Job Card Number (Auto-Generated)
              </label>
              <input
                type="text"
                required
                value={jobCardNumber}
                onChange={(e) => setJobCardNumber(e.target.value)}
                placeholder="JC-ENG-2026-001"
                className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] bg-slate-50 text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Standard format: JC-[CATEGORY]-[YEAR]-[SEQUENCE]
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lifecycle Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as JobCardStatus)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:border-[#714B67] focus:outline-none bg-white font-medium"
              >
                <option value="Draft">Draft</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending Spares">Pending Spares</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Department Grouping Section */}
          <div className="bg-white p-4 rounded border border-slate-200 space-y-3">
            <div className="font-semibold text-slate-800 text-xs border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[#714B67]" />
              Plant Department & Location
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  1. Department Category
                </label>
                <select
                  value={departmentCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-[#714B67] focus:outline-none bg-white"
                >
                  {DEPARTMENTS_BY_CATEGORY.map((cat) => (
                    <option key={cat.category} value={cat.category}>
                      {cat.category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  2. Specific Sub-Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-[#714B67] focus:outline-none bg-white"
                >
                  {currentCategoryGroup?.departments.map((subDept) => {
                    const fullDept = `${departmentCategory} - ${subDept}`;
                    return (
                      <option key={fullDept} value={fullDept}>
                        {subDept}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Equipment / Asset Selection */}
          <div className="bg-white p-4 rounded border border-slate-200 space-y-3">
            <div className="font-semibold text-slate-800 text-xs border-b border-slate-100 pb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-[#714B67]" />
                Equipment / Machinery Serviced
              </span>
              <span className="text-[10px] text-slate-400">Select asset or type name</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Select Registered Distillery Asset
                </label>
                <select
                  value={equipmentId}
                  onChange={(e) => handleSelectEquipment(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-[#714B67] focus:outline-none bg-white font-medium"
                >
                  <option value="">-- Choose from Equipment Master --</option>
                  {equipmentList.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      [{eq.code}] {eq.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Equipment / Asset Name *
                </label>
                <input
                  type="text"
                  required
                  value={equipmentName}
                  onChange={(e) => setEquipmentName(e.target.value)}
                  placeholder="e.g. Steam Boiler #1 Feed Pump"
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-[#714B67] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Priority & Work Assignment */}
          <div className="bg-white p-4 rounded border border-slate-200 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Priority Level (Select Severity)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['Low', 'Medium', 'High', 'Emergency'] as Priority[]).map((lvl) => {
                  const isSelected = priority === lvl;
                  let colorClass = '';
                  if (lvl === 'Emergency') {
                    colorClass = isSelected
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm font-bold'
                      : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100';
                  } else if (lvl === 'High') {
                    colorClass = isSelected
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm font-semibold'
                      : 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100';
                  } else if (lvl === 'Medium') {
                    colorClass = isSelected
                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                      : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100';
                  } else {
                    colorClass = isSelected
                      ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
                  }

                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setPriority(lvl)}
                      className={`py-2 px-2 rounded border text-xs font-medium text-center transition cursor-pointer flex items-center justify-center gap-1 ${colorClass}`}
                    >
                      {lvl === 'Emergency' && <AlertTriangle className="w-3 h-3" />}
                      <span>{lvl}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Assigned Technician / Supervisor
                </label>
                <input
                  type="text"
                  required
                  list="technicians-list"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="e.g. Sam Ngubeni — Maintenance Supervisor"
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-[#714B67] focus:outline-none"
                />
                <datalist id="technicians-list">
                  {COMPANY_ORGANOGRAM.map((member) => (
                    <option key={member.id} value={`${member.name} — ${member.title}`}>
                      {member.department} ({member.level})
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Target Completion Date
                </label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-[#714B67] focus:outline-none bg-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Description of Work */}
          <div className="bg-white p-4 rounded border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description of Work & Fault Details *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide complete breakdown details, symptoms, leak rates, diagnostic codes, safety lockouts, or required parts..."
              className="w-full text-xs p-2.5 border border-slate-300 rounded focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] focus:outline-none resize-y"
            ></textarea>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
              <span>Be specific to assist technicians with lock-out/tag-out (LOTO) and spare parts preparation.</span>
              <span>{description.length} chars</span>
            </div>
          </div>

          {/* Modal Action Footer */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition cursor-pointer"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
            >
              {submitting ? (
                <span>Saving to Firestore...</span>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{existingCard ? 'Save Changes' : 'Create Job Card'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
