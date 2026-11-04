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
  X,
  Zap,
  RotateCw,
  List,
  LayoutGrid,
  Check
} from 'lucide-react';
import { Equipment, EquipmentStatus, Criticality, ALL_DEPARTMENTS, JobCard, PlantArea } from '../../types';
import { syncOfficialPlantEquipmentRegistry } from '../../services/equipmentService';

interface EquipmentViewProps {
  equipmentList: Equipment[];
  jobCards: JobCard[];
  onCreateEquipment: (data: any) => Promise<void>;
  onNewJobCardForEquipment: (equipment: Equipment) => void;
  searchQuery: string;
}

const PLANT_AREAS: { id: string; label: string }[] = [
  { id: 'ALL', label: 'All Plant Areas' },
  { id: 'Boiler 1', label: 'Boiler 1' },
  { id: 'Boiler 2', label: 'Boiler 2' },
  { id: 'Boiler 3', label: 'Boiler 3' },
  { id: 'Universal', label: 'Universal (Feed Pumps & Ash)' },
  { id: 'Water Treatment', label: 'Water Treatment & Mahlabaneni' },
  { id: 'Distillation', label: 'Distillation Stillhouse' },
  { id: 'Fermentation', label: 'Fermentation Bay & Mash' },
  { id: 'Cooling Towers', label: 'Cooling Towers & Heavy Pumps' },
  { id: 'Distillation Fans', label: 'Distillation Fans (1-12)' },
  { id: 'Fermentation/Turbine Fans', label: 'Fermentation/Turbine Fans (1-20)' },
  { id: 'Green Tank', label: 'Green Tank Yard' },
  { id: 'CMS/Molasses Tank', label: 'CMS / Molasses Storage' },
  { id: 'Molasses Offloading Bay', label: 'Molasses Offloading Bay' },
  { id: 'Molasses Dam 1', label: 'Molasses Dam 1 Reservoir' }
];

export const EquipmentView: React.FC<EquipmentViewProps> = ({
  equipmentList,
  jobCards,
  onCreateEquipment,
  onNewJobCardForEquipment,
  searchQuery
}) => {
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedStarter, setSelectedStarter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // New Equipment Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Utilities - Boiler House');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<EquipmentStatus>('Operational');
  const [criticality, setCriticality] = useState<Criticality>('High');
  const [powerKw, setPowerKw] = useState<string>('');
  const [starterType, setStarterType] = useState<string>('DOL');
  const [overloadAmps, setOverloadAmps] = useState<string>('');
  const [plantArea, setPlantArea] = useState<PlantArea>('Boiler 1');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSyncMaster = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncOfficialPlantEquipmentRegistry();
      setSyncFeedback(`Successfully synchronized ${res.syncedCount} equipment items from the Electrical Plant Checklist.`);
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (e: any) {
      setSyncFeedback(`Sync failed: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredList = equipmentList.filter((eq) => {
    if (selectedArea !== 'ALL') {
      if (eq.plantArea) {
        if (eq.plantArea !== selectedArea) return false;
      } else if (!eq.location?.toLowerCase().includes(selectedArea.toLowerCase()) && !eq.department?.toLowerCase().includes(selectedArea.toLowerCase())) {
        return false;
      }
    }
    if (selectedStatus !== 'ALL' && eq.status !== selectedStatus) return false;
    if (selectedStarter !== 'ALL' && eq.starterType !== selectedStarter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        eq.code?.toLowerCase().includes(q) ||
        eq.name?.toLowerCase().includes(q) ||
        eq.department?.toLowerCase().includes(q) ||
        eq.plantArea?.toLowerCase().includes(q) ||
        eq.starterType?.toLowerCase().includes(q) ||
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
        plantArea,
        starterType: starterType as any,
        powerKw: powerKw ? parseFloat(powerKw) : undefined,
        overloadAmps: overloadAmps ? parseFloat(overloadAmps) : undefined,
        notes,
        lastServiceDate: new Date().toISOString().split('T')[0]
      });
      setIsModalOpen(false);
      setCode('');
      setName('');
      setLocation('');
      setNotes('');
      setPowerKw('');
      setOverloadAmps('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sync feedback notification */}
      {syncFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{syncFeedback}</span>
        </div>
      )}

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

          <button
            onClick={handleSyncMaster}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#714B67] text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            title="Populates all 105 active assets from the Electrical Plant Checklist"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Master Checklist (105 Assets)'}</span>
          </button>

          <div className="text-xs text-slate-500 hidden md:block border-l border-slate-200 pl-3">
            Showing <strong>{filteredList.length}</strong> of <strong>{equipmentList.length}</strong> Plant Assets
          </div>
        </div>

        {/* Filter Controls & View Switcher */}
        <div className="flex items-center space-x-2 text-xs">
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-700 focus:outline-none font-medium"
          >
            {PLANT_AREAS.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>

          <select
            value={selectedStarter}
            onChange={(e) => setSelectedStarter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Starters</option>
            <option value="DOL">Direct On-Line (DOL)</option>
            <option value="Y/D">Star-Delta (Y/D)</option>
            <option value="VSD">Variable Speed (VSD)</option>
            <option value="SOFT STARTER">Soft Starter</option>
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
            <option value="Decommissioned">Not In Use</option>
          </select>

          <div className="flex border border-slate-300 rounded bg-slate-50 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 cursor-pointer ${viewMode === 'grid' ? 'bg-white text-[#714B67] shadow-xs' : 'text-slate-400'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 cursor-pointer ${viewMode === 'table' ? 'bg-white text-[#714B67] shadow-xs' : 'text-slate-400'}`}
              title="Data Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: GRID MODE */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((eq) => {
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

                  {/* Department & Area */}
                  <div className="text-xs text-slate-500 mb-2 space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{eq.plantArea ? `${eq.plantArea} • ` : ''}{eq.department}</span>
                    </div>
                  </div>

                  {/* Electrical Checklist Technical Specs */}
                  {(eq.powerKw || eq.starterType || eq.overloadAmps) && (
                    <div className="bg-purple-50/70 border border-purple-200/80 rounded p-2 text-[11px] text-purple-900 mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {eq.powerKw && (
                        <span><strong>Power:</strong> {eq.powerKw} kW</span>
                      )}
                      {eq.starterType && (
                        <span className="bg-purple-200/80 text-purple-900 px-1 py-0.2 rounded font-mono font-semibold">
                          {eq.starterType}
                        </span>
                      )}
                      {eq.ratedCurrentAmps && (
                        <span><strong>Rated:</strong> {eq.ratedCurrentAmps}A</span>
                      )}
                      {eq.overloadAmps && (
                        <span className="text-amber-800 bg-amber-50 px-1 rounded font-semibold border border-amber-200">
                          O/L: {eq.overloadAmps}A
                        </span>
                      )}
                      {eq.speedRpm && (
                        <span>{eq.speedRpm} RPM</span>
                      )}
                    </div>
                  )}

                  {/* Notes */}
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
                        Operational
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onNewJobCardForEquipment(eq)}
                    className="px-2.5 py-1 rounded bg-purple-50 hover:bg-purple-100 text-[#714B67] font-semibold text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <Wrench className="w-3 h-3" />
                    <span>Raise JC</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: COMPACT DATA TABLE MODE (Odoo Style) */}
      {viewMode === 'table' && (
        <div className="bg-white rounded border border-slate-200 overflow-x-auto shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/90 text-slate-700 uppercase text-[10px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Asset Code</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Plant Area</th>
                <th className="py-2.5 px-3">kW</th>
                <th className="py-2.5 px-3">Starter</th>
                <th className="py-2.5 px-3">Rated (A)</th>
                <th className="py-2.5 px-3">O/L (A)</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {filteredList.map((eq) => (
                <tr key={eq.id} className="hover:bg-slate-50 transition">
                  <td className="py-2 px-3 font-mono font-bold text-slate-900">{eq.code}</td>
                  <td className="py-2 px-3 font-medium text-slate-800">{eq.name}</td>
                  <td className="py-2 px-3 text-slate-600 font-semibold">{eq.plantArea || 'General'}</td>
                  <td className="py-2 px-3 font-mono">{eq.powerKw ? `${eq.powerKw} kW` : '-'}</td>
                  <td className="py-2 px-3">
                    {eq.starterType ? (
                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-mono text-[10px] font-bold">
                        {eq.starterType}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="py-2 px-3 font-mono">{eq.ratedCurrentAmps ? `${eq.ratedCurrentAmps}A` : '-'}</td>
                  <td className="py-2 px-3 font-mono text-amber-700 font-bold">{eq.overloadAmps ? `${eq.overloadAmps}A` : '-'}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusBadge(eq.status)}`}>
                      {eq.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => onNewJobCardForEquipment(eq)}
                      className="px-2 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-[#714B67] text-[11px] font-semibold cursor-pointer"
                    >
                      Raise JC
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Equipment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#714B67] text-white px-5 py-3 flex items-center justify-between">
              <span className="font-bold text-sm">Register Plant Equipment / Machinery</span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-3.5 text-xs bg-[#f8f9fa]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Equipment Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="EQ-BLR-04"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Plant Area *</label>
                  <select
                    value={plantArea}
                    onChange={(e) => setPlantArea(e.target.value as PlantArea)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    {PLANT_AREAS.filter(a => a.id !== 'ALL').map(a => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Equipment Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Slops Pump 3"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Power (kW)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={powerKw}
                    onChange={(e) => setPowerKw(e.target.value)}
                    placeholder="18.5"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Starter Type</label>
                  <select
                    value={starterType}
                    onChange={(e) => setStarterType(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="DOL">DOL</option>
                    <option value="Y/D">Y/D (Star-Delta)</option>
                    <option value="VSD">VSD</option>
                    <option value="SOFT STARTER">Soft Starter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">O/L Setting (A)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={overloadAmps}
                    onChange={(e) => setOverloadAmps(e.target.value)}
                    placeholder="34"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Operating Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="Operational">Operational</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Standby">Standby</option>
                  <option value="Decommissioned">Decommissioned / Not In Use</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Operational details, spare seal references, starter panel MCC location..."
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white font-semibold cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
