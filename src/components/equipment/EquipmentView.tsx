import React, { useState } from 'react';
import {
  Cpu,
  Plus,
  Search,
  Filter,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building,
  Activity,
  ArrowUpRight,
  X
} from 'lucide-react';
import { Equipment, EquipmentStatus, Criticality, ALL_DEPARTMENTS, JobCard } from '../../types';

interface EquipmentViewProps {
  equipmentList: Equipment[];
  jobCards: JobCard[];
  onCreateEquipment: (data: any) => Promise<void>;
  onNewJobCardForEquipment: (equipment: Equipment) => void;
  searchQuery: string;
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({
  equipmentList,
  jobCards,
  onCreateEquipment,
  onNewJobCardForEquipment,
  searchQuery
}) => {
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // New Equipment Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Production - Fermentation Bay');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<EquipmentStatus>('Operational');
  const [criticality, setCriticality] = useState<Criticality>('High');
  const [manufacturer, setManufacturer] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredList = equipmentList.filter((eq) => {
    if (selectedDept !== 'ALL' && !eq.department?.startsWith(selectedDept)) return false;
    if (selectedStatus !== 'ALL' && eq.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        eq.code?.toLowerCase().includes(q) ||
        eq.name?.toLowerCase().includes(q) ||
        eq.department?.toLowerCase().includes(q) ||
        eq.location?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getStatusBadge = (st: EquipmentStatus) => {
    switch (st) {
      case 'Operational':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Under Maintenance':
        return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'Standby':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Decommissioned':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getCriticalityBadge = (crit: Criticality) => {
    switch (crit) {
      case 'Critical':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300 font-semibold';
      case 'Medium':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Low':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) return;
    setSubmitting(true);
    try {
      await onCreateEquipment({
        code,
        name,
        department,
        location,
        status,
        criticality,
        manufacturer,
        modelNumber,
        notes,
        lastServiceDate: new Date().toISOString().split('T')[0]
      });
      setIsModalOpen(false);
      setCode('');
      setName('');
      setLocation('');
      setNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Odoo Control Panel for Equipment */}
      <div className="bg-white p-3 rounded border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-1.5 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Equipment</span>
          </button>

          <div className="text-xs text-slate-500 hidden sm:block border-l border-slate-200 pl-3">
            Plant Machinery & Asset Registry
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-2 text-xs">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            <option value="Utilities">Utilities</option>
            <option value="Production">Production</option>
            <option value="Engineering">Engineering</option>
            <option value="Transport Workshop">Transport Workshop</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Operational">Operational</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Standby">Standby</option>
          </select>
        </div>
      </div>

      {/* Equipment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredList.map((eq) => {
          // Count active job cards for this equipment
          const activeJCs = jobCards.filter(
            (c) =>
              (c.equipmentId === eq.id || c.equipmentName?.toLowerCase() === eq.name?.toLowerCase()) &&
              c.status !== 'Completed' &&
              c.status !== 'Cancelled'
          );

          return (
            <div
              key={eq.id}
              className="bg-white rounded-md border border-slate-200 p-4 shadow-2xs hover:shadow-md hover:border-[#714B67]/50 transition flex flex-col justify-between"
            >
              <div>
                {/* Top: Code & Status */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {eq.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(eq.status)}`}>
                      {eq.status}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getCriticalityBadge(eq.criticality)}`}>
                      {eq.criticality}
                    </span>
                  </div>
                </div>

                {/* Name */}
                <h3 className="font-bold text-sm text-slate-800 mb-1 leading-snug">
                  {eq.name}
                </h3>

                {/* Department & Location */}
                <div className="text-xs text-slate-500 mb-3 space-y-0.5">
                  <div className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{eq.department}</span>
                  </div>
                  {eq.location && (
                    <div className="text-[11px] text-slate-400 pl-4.5">
                      Bay / Room: {eq.location}
                    </div>
                  )}
                </div>

                {/* Notes or Manufacturer */}
                {eq.notes && (
                  <p className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded border border-slate-100 mb-3">
                    {eq.notes}
                  </p>
                )}
              </div>

              {/* Bottom Actions & Linked Job Cards */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  {activeJCs.length > 0 ? (
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold text-[11px] border border-amber-200 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      {activeJCs.length} Open Job Card{activeJCs.length > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      No Open Faults
                    </span>
                  )}
                </div>

                <button
                  onClick={() => onNewJobCardForEquipment(eq)}
                  className="px-2.5 py-1 rounded bg-purple-50 hover:bg-purple-100 text-[#714B67] font-semibold text-xs transition cursor-pointer flex items-center gap-1"
                >
                  <Wrench className="w-3 h-3" />
                  <span>Issue JC</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Equipment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#714B67] text-white px-5 py-3 flex items-center justify-between">
              <span className="font-bold text-sm">Register Plant Equipment / Machinery</span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white transition cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-3.5 text-xs bg-[#f8f9fa]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Equipment Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. EQ-PMP-801"
                    className="w-full text-xs font-mono font-bold px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operational Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="Operational">Operational</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Standby">Standby</option>
                    <option value="Decommissioned">Decommissioned</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Equipment Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Grain Cooker Agitator Motor #2"
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    {ALL_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Criticality
                  </label>
                  <select
                    value={criticality}
                    onChange={(e) => setCriticality(e.target.value as Criticality)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Plant Bay / Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Mash House Level 2"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="e.g. ABB / Sulzer"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Engineering Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Preventive maintenance notes, lubrication spec, motor rating..."
                  className="w-full text-xs p-2 border border-slate-300 rounded bg-white"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Registering...' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
