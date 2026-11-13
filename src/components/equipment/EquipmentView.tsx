import React, { useState, useMemo } from 'react';
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
  Check,
  Flame,
  Droplets,
  Wind,
  Layers,
  ChevronRight,
  Gauge,
  ShieldAlert,
  Clock,
  Sparkles,
  Edit3,
  History,
  ShieldCheck,
  FileText,
  Tag,
  Shuffle,
  ArrowRight,
  MoveRight,
  ArrowUpCircle,
  AlertOctagon
} from 'lucide-react';
import {
  Equipment,
  EquipmentStatus,
  Criticality,
  JobCard,
  PlantArea,
  StarterType,
  EquipmentModificationLog,
  FeederPanelId,
  PowerDistributionNode
} from '../../types';
import { syncOfficialPlantEquipmentRegistry } from '../../services/equipmentService';
import { PowerDistributionSLDView } from './PowerDistributionSLDView';
import {
  resolveEquipmentFeederInfo,
  FEEDER_PANELS,
  DEFAULT_POWER_NODES
} from '../../core/master-data/powerDistributionData';

interface EquipmentViewProps {
  equipmentList: Equipment[];
  jobCards: JobCard[];
  powerNodes?: PowerDistributionNode[];
  currentUserName?: string;
  onUpdatePowerNode?: (
    node: PowerDistributionNode,
    updates: Partial<PowerDistributionNode>,
    audit: {
      modifiedBy: string;
      summary: string;
      reason: string;
      previousValues?: Record<string, any>;
      newValues?: Record<string, any>;
    }
  ) => Promise<void>;
  onCreateEquipment: (data: any) => Promise<void>;
  onModifyEquipment?: (
    equipment: Equipment,
    updates: Partial<Equipment>,
    audit: {
      modifiedBy: string;
      changeType: EquipmentModificationLog['changeType'];
      summary: string;
      reason: string;
      previousValues?: Record<string, any>;
      newValues?: Record<string, any>;
    }
  ) => Promise<void>;
  onNewJobCardForEquipment: (equipment: Equipment) => void;
  searchQuery: string;
}

export type PlantSectionId =
  | 'ALL'
  | 'boilers'
  | 'water_treatment'
  | 'cooling_towers'
  | 'distillation'
  | 'fermentation'
  | 'molasses_storage';

export interface PlantSectionMeta {
  id: PlantSectionId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgActive: string;
  badgeColor: string;
  areas: PlantArea[];
  description: string;
  managerInCharge: string;
}

export const PLANT_SECTIONS_CONFIG: PlantSectionMeta[] = [
  {
    id: 'boilers',
    label: 'Boilers & Steam Generation',
    shortLabel: 'Boilers',
    icon: Flame,
    color: 'text-amber-600',
    bgActive: 'bg-amber-600 text-white',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    areas: ['Boiler 1', 'Boiler 2', 'Boiler 3', 'Universal'],
    description: 'High-pressure coal boilers 1-3, coal stokers, ID/FD draft fans, and multi-stage boiler feed water pumps',
    managerInCharge: 'Melusi Dlamini (Boiler Sup) • Bongani Dladla • Antonio Miranda (HOD)'
  },
  {
    id: 'water_treatment',
    label: 'Water Treatment Plant (WTP)',
    shortLabel: 'Water Treatment',
    icon: Droplets,
    color: 'text-blue-600',
    bgActive: 'bg-blue-600 text-white',
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
    areas: ['Water Treatment'],
    description: 'Great Usuthu River raw water intake, clarifier dosing, sand filters, RO boiler feed & Mahlabaneni community supply',
    managerInCharge: 'Andriese Gamedze • Simphiwe Dlamini • Masuku'
  },
  {
    id: 'cooling_towers',
    label: 'Cooling Towers & Utilities',
    shortLabel: 'Cooling Towers',
    icon: Wind,
    color: 'text-cyan-700',
    bgActive: 'bg-cyan-700 text-white',
    badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    areas: ['Cooling Towers', 'Distillation Fans', 'Fermentation/Turbine Fans'],
    description: 'Evaporative cooling tower cells 1-4, heavy condenser water circulation pumps, stillhouse fans & turbine air coolers',
    managerInCharge: 'Antonio Miranda (HOD) • Scelo Simelane (Elec)'
  },
  {
    id: 'distillation',
    label: 'Distillation Stillhouse',
    shortLabel: 'Distillation',
    icon: Activity,
    color: 'text-purple-700',
    bgActive: 'bg-purple-700 text-white',
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
    areas: ['Distillation'],
    description: 'Continuous wash column, rectifier, hydro-selection, reflux pumps, spirit transfer & bulk ethanol loading bays',
    managerInCharge: 'Jobe Gamedze • Dumsane Gumede • Atanasio Muchine'
  },
  {
    id: 'fermentation',
    label: 'Fermentation & Mash Prep',
    shortLabel: 'Fermentation',
    icon: Cpu,
    color: 'text-emerald-700',
    bgActive: 'bg-emerald-700 text-white',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    areas: ['Fermentation'],
    description: 'Fermenters 1-6 dual-tier mechanical agitators, mash plate coolers, air compressors & yeast propagation tanks',
    managerInCharge: 'Kenny Kunene • Themba Mamba • Gerald Fakudze'
  },
  {
    id: 'molasses_storage',
    label: 'Molasses Storage & Tank Farm',
    shortLabel: 'Molasses Storage',
    icon: Layers,
    color: 'text-amber-900',
    bgActive: 'bg-amber-900 text-white',
    badgeColor: 'bg-amber-100 text-amber-950 border-amber-400',
    areas: ['Green Tank', 'CMS/Molasses Tank', 'Molasses Offloading Bay', 'Molasses Dam 1'],
    description: 'Sugarcane molasses offloading bay, heavy displacement transfer pumps, Green Tank, CMS storage & holding dams',
    managerInCharge: 'Elliot Mhlongo (Stores/Intake) • Charlie Mvubu'
  }
];

export const EquipmentView: React.FC<EquipmentViewProps> = ({
  equipmentList,
  jobCards,
  powerNodes = DEFAULT_POWER_NODES,
  currentUserName = 'Engineering Supervisor',
  onUpdatePowerNode,
  onCreateEquipment,
  onModifyEquipment,
  onNewJobCardForEquipment,
  searchQuery
}) => {
  const [activeSection, setActiveSection] = useState<PlantSectionId>('ALL');
  const [selectedSubArea, setSelectedSubArea] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedStarter, setSelectedStarter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'sld'>('grid');
  const [targetFeederPanel, setTargetFeederPanel] = useState<FeederPanelId | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedEquipmentForDetail, setSelectedEquipmentForDetail] = useState<Equipment | null>(null);
  const [detailTab, setDetailTab] = useState<'work_orders' | 'lineage'>('work_orders');
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

  // Lifecycle Edit / Modification State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [equipmentToEdit, setEquipmentToEdit] = useState<Equipment | null>(null);
  const [editChangeType, setEditChangeType] = useState<EquipmentModificationLog['changeType']>('UPGRADE');
  const [editName, setEditName] = useState<string>('');
  const [editCode, setEditCode] = useState<string>('');
  const [editDepartment, setEditDepartment] = useState<string>('');
  const [editPlantArea, setEditPlantArea] = useState<PlantArea>('Boiler 1');
  const [editLocation, setEditLocation] = useState<string>('');
  const [editPowerKw, setEditPowerKw] = useState<string>('');
  const [editStarterType, setEditStarterType] = useState<StarterType>('DOL');
  const [editSpeedRpm, setEditSpeedRpm] = useState<string>('');
  const [editRatedCurrentAmps, setEditRatedCurrentAmps] = useState<string>('');
  const [editOverloadAmps, setEditOverloadAmps] = useState<string>('');
  const [editStatus, setEditStatus] = useState<EquipmentStatus>('Operational');
  const [editCriticality, setEditCriticality] = useState<Criticality>('High');
  const [editFeederPanel, setEditFeederPanel] = useState<FeederPanelId>('MCC 1');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [editModifiedBy, setEditModifiedBy] = useState<string>('Antonio Miranda (HOD Engineering)');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editFeedback, setEditFeedback] = useState<string | null>(null);

  const handleOpenEditModal = (
    eq: Equipment,
    defaultType: EquipmentModificationLog['changeType'] = 'UPGRADE'
  ) => {
    const resolvedFeeder = resolveEquipmentFeederInfo(eq);
    setEquipmentToEdit(eq);
    setEditChangeType(defaultType);
    setEditName(eq.name || '');
    setEditCode(eq.code || '');
    setEditDepartment(eq.department || 'Utilities - Boiler House');
    setEditPlantArea(eq.plantArea || 'Boiler 1');
    setEditLocation(eq.location || '');
    setEditPowerKw(eq.powerKw !== undefined ? String(eq.powerKw) : '');
    setEditStarterType((eq.starterType as StarterType) || 'DOL');
    setEditSpeedRpm(eq.speedRpm !== undefined ? String(eq.speedRpm) : '');
    setEditRatedCurrentAmps(eq.ratedCurrentAmps !== undefined ? String(eq.ratedCurrentAmps) : '');
    setEditOverloadAmps(eq.overloadAmps !== undefined ? String(eq.overloadAmps) : '');
    setEditStatus(eq.status || 'Operational');
    setEditCriticality(eq.criticality || 'High');
    setEditFeederPanel(resolvedFeeder.feederPanel);
    setEditNotes(eq.notes || '');
    setEditReason('');
    setEditModifiedBy('Antonio Miranda (HOD Engineering)');
    setEditFeedback(null);
    setIsEditModalOpen(true);
  };

  const handleSaveModification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentToEdit) return;

    if (!editReason.trim()) {
      setEditFeedback('Engineering change reason is strictly mandatory for CMMS audit compliance.');
      return;
    }

    setIsSavingEdit(true);
    setEditFeedback(null);

    try {
      const panelMeta = FEEDER_PANELS.find(p => p.id === editFeederPanel);
      const updates: Partial<Equipment> = {
        name: editName.trim(),
        code: editCode.trim(),
        department: editDepartment.trim(),
        plantArea: editPlantArea,
        location: editLocation.trim(),
        powerKw: editPowerKw ? parseFloat(editPowerKw) : undefined,
        starterType: editStarterType,
        speedRpm: editSpeedRpm ? parseFloat(editSpeedRpm) : undefined,
        ratedCurrentAmps: editRatedCurrentAmps ? parseFloat(editRatedCurrentAmps) : undefined,
        overloadAmps: editOverloadAmps ? parseFloat(editOverloadAmps) : undefined,
        status: editStatus,
        criticality: editCriticality,
        feederPanel: editFeederPanel,
        transformerSource: panelMeta?.transformerSource,
        feederBreaker: panelMeta?.breakerCode,
        notes: editNotes.trim()
      };

      // Detect differences to build automatic summary
      const changes: string[] = [];
      const prev: Record<string, any> = {};
      const next: Record<string, any> = {};

      if (equipmentToEdit.name !== updates.name) {
        changes.push(`Name: "${equipmentToEdit.name}" ➔ "${updates.name}"`);
        prev.name = equipmentToEdit.name;
        next.name = updates.name;
      }
      if (equipmentToEdit.code !== updates.code) {
        changes.push(`Tag: ${equipmentToEdit.code} ➔ ${updates.code}`);
        prev.code = equipmentToEdit.code;
        next.code = updates.code;
      }
      if (equipmentToEdit.plantArea !== updates.plantArea) {
        changes.push(`Area: ${equipmentToEdit.plantArea} ➔ ${updates.plantArea}`);
        prev.plantArea = equipmentToEdit.plantArea;
        next.plantArea = updates.plantArea;
      }
      if (equipmentToEdit.powerKw !== updates.powerKw) {
        changes.push(`Power: ${equipmentToEdit.powerKw ?? 'N/A'}kW ➔ ${updates.powerKw ?? 'N/A'}kW`);
        prev.powerKw = equipmentToEdit.powerKw;
        next.powerKw = updates.powerKw;
      }
      if (equipmentToEdit.starterType !== updates.starterType) {
        changes.push(`Starter: ${equipmentToEdit.starterType ?? 'DOL'} ➔ ${updates.starterType}`);
        prev.starterType = equipmentToEdit.starterType;
        next.starterType = updates.starterType;
      }
      if (equipmentToEdit.status !== updates.status) {
        changes.push(`Status: ${equipmentToEdit.status} ➔ ${updates.status}`);
        prev.status = equipmentToEdit.status;
        next.status = updates.status;
      }
      if (equipmentToEdit.overloadAmps !== updates.overloadAmps) {
        changes.push(`O/L: ${equipmentToEdit.overloadAmps ?? 'N/A'}A ➔ ${updates.overloadAmps ?? 'N/A'}A`);
        prev.overloadAmps = equipmentToEdit.overloadAmps;
        next.overloadAmps = updates.overloadAmps;
      }

      const summary = changes.length > 0 
        ? `${editChangeType}: ${changes.join(', ')}`
        : `${editChangeType}: Technical specifications verified`;

      if (onModifyEquipment) {
        await onModifyEquipment(equipmentToEdit, updates, {
          modifiedBy: editModifiedBy.trim() || 'Engineering Supervisor',
          changeType: editChangeType,
          summary,
          reason: editReason.trim(),
          previousValues: prev,
          newValues: next
        });
      }

      // Update active detail modal view if same equipment is currently inspected
      if (selectedEquipmentForDetail && selectedEquipmentForDetail.id === equipmentToEdit.id) {
        const newLogEntry: EquipmentModificationLog = {
          id: `mod-${Date.now()}`,
          timestamp: new Date().toISOString(),
          modifiedBy: editModifiedBy.trim() || 'Engineering Supervisor',
          changeType: editChangeType,
          summary,
          reason: editReason.trim(),
          previousValues: prev,
          newValues: next
        };
        setSelectedEquipmentForDetail({
          ...selectedEquipmentForDetail,
          ...updates,
          modificationHistory: [newLogEntry, ...(selectedEquipmentForDetail.modificationHistory || [])]
        });
      }

      setIsEditModalOpen(false);
      setEquipmentToEdit(null);
    } catch (err: any) {
      setEditFeedback(`Save failed: ${err.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Helper to determine the section of any equipment item
  const getSectionForAsset = (eq: Equipment): PlantSectionId => {
    if (eq.plantArea) {
      for (const sec of PLANT_SECTIONS_CONFIG) {
        if (sec.areas.includes(eq.plantArea)) {
          return sec.id;
        }
      }
    }
    const loc = (eq.location + ' ' + eq.department + ' ' + eq.name).toLowerCase();
    if (loc.includes('boiler')) return 'boilers';
    if (loc.includes('water') || loc.includes('river') || loc.includes('wtp')) return 'water_treatment';
    if (loc.includes('cooling') || loc.includes('tower') || loc.includes('fan')) return 'cooling_towers';
    if (loc.includes('distill') || loc.includes('still') || loc.includes('rectif') || loc.includes('spirit') || loc.includes('column')) return 'distillation';
    if (loc.includes('ferment') || loc.includes('mash') || loc.includes('yeast') || loc.includes('agitator')) return 'fermentation';
    if (loc.includes('molasses') || loc.includes('cms') || loc.includes('green tank') || loc.includes('dam')) return 'molasses_storage';
    return 'boilers';
  };

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

  // Section Counts & Open Breakdowns
  const sectionStats = useMemo(() => {
    const stats: Record<string, { count: number; openJCs: number; totalKw: number }> = {
      ALL: { count: equipmentList.length, openJCs: 0, totalKw: 0 },
      boilers: { count: 0, openJCs: 0, totalKw: 0 },
      water_treatment: { count: 0, openJCs: 0, totalKw: 0 },
      cooling_towers: { count: 0, openJCs: 0, totalKw: 0 },
      distillation: { count: 0, openJCs: 0, totalKw: 0 },
      fermentation: { count: 0, openJCs: 0, totalKw: 0 },
      molasses_storage: { count: 0, openJCs: 0, totalKw: 0 }
    };

    equipmentList.forEach((eq) => {
      const secId = getSectionForAsset(eq);
      const kw = Number(eq.powerKw) || 0;
      const openJCsForEq = jobCards.filter(
        (c) =>
          (c.equipmentId === eq.id || c.equipmentName?.toLowerCase() === eq.name?.toLowerCase()) &&
          c.status !== 'Completed' &&
          c.status !== 'Cancelled'
      ).length;

      stats.ALL.openJCs += openJCsForEq;
      stats.ALL.totalKw += kw;

      if (stats[secId]) {
        stats[secId].count += 1;
        stats[secId].openJCs += openJCsForEq;
        stats[secId].totalKw += kw;
      }
    });

    return stats;
  }, [equipmentList, jobCards]);

  // Sub-areas available for current section
  const currentSectionMeta = useMemo(() => {
    return PLANT_SECTIONS_CONFIG.find((s) => s.id === activeSection) || null;
  }, [activeSection]);

  // Main Filter Logic
  const filteredList = useMemo(() => {
    return equipmentList.filter((eq) => {
      // 1. Department Section Filter
      if (activeSection !== 'ALL') {
        const sec = getSectionForAsset(eq);
        if (sec !== activeSection) return false;
      }

      // 2. Sub-Area Filter
      if (selectedSubArea !== 'ALL' && eq.plantArea !== selectedSubArea) {
        return false;
      }

      // 3. Status Filter
      if (selectedStatus !== 'ALL' && eq.status !== selectedStatus) {
        return false;
      }

      // 4. Starter Filter
      if (selectedStarter !== 'ALL' && eq.starterType !== selectedStarter) {
        return false;
      }

      // 5. Search Query
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
  }, [equipmentList, activeSection, selectedSubArea, selectedStatus, selectedStarter, searchQuery]);

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
        notes: notes.trim() ? notes.trim() : undefined
      });
      setIsModalOpen(false);
      setCode('');
      setName('');
      setNotes('');
      setPowerKw('');
      setOverloadAmps('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sync Feedback Alert */}
      {syncFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-md text-emerald-800 text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{syncFeedback}</span>
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* MASTER SECTION SELECTOR TABS (Hidden in 1-page Power SLD view so the diagram fits one screen) */}
      {viewMode !== 'sld' && (
        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#714B67]" />
            <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Plant Operational Departments & Machinery Sections
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {equipmentList.length} Cataloged Industrial Assets
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-1.5 pt-2">
          {/* 0. All Sections */}
          <button
            onClick={() => {
              setActiveSection('ALL');
              setSelectedSubArea('ALL');
            }}
            className={`p-2 rounded-md transition cursor-pointer flex flex-col items-start justify-between text-left border ${
              activeSection === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-base">🏭</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                activeSection === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {sectionStats.ALL.count}
              </span>
            </div>
            <div className="mt-1">
              <div className="font-bold text-xs leading-tight">All Sections</div>
              <div className="text-[10px] opacity-75 font-mono">Full Plant</div>
            </div>
          </button>

          {/* 1 to 6: The 6 Canonical Departments */}
          {PLANT_SECTIONS_CONFIG.map((sec) => {
            const Icon = sec.icon;
            const stats = sectionStats[sec.id] || { count: 0, openJCs: 0, totalKw: 0 };
            const isActive = activeSection === sec.id;

            return (
              <button
                key={sec.id}
                onClick={() => {
                  setActiveSection(sec.id);
                  setSelectedSubArea('ALL');
                }}
                className={`p-2 rounded-md transition cursor-pointer flex flex-col items-start justify-between text-left border ${
                  isActive
                    ? `${sec.bgActive} border-transparent shadow-xs`
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : sec.color}`} />
                  <div className="flex items-center gap-1">
                    {stats.openJCs > 0 && (
                      <span
                        title={`${stats.openJCs} open work order${stats.openJCs > 1 ? 's' : ''}`}
                        className={`text-[9px] font-extrabold px-1 rounded-full ${
                          isActive ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {stats.openJCs}⚠️
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {stats.count}
                    </span>
                  </div>
                </div>
                <div className="mt-1">
                  <div className="font-bold text-xs leading-tight line-clamp-1">{sec.shortLabel}</div>
                  <div className={`text-[10px] font-mono ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                    {Math.round(stats.totalKw)} kW
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* DEPARTMENT CONTEXT CARD (When specific section is active and not in SLD view) */}
      {viewMode !== 'sld' && currentSectionMeta && (
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${currentSectionMeta.color.replace('text-', 'bg-')} animate-pulse`}></span>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                {currentSectionMeta.label}
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentSectionMeta.badgeColor}`}>
                {sectionStats[currentSectionMeta.id]?.count || 0} Connected Assets
              </span>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Supervisor / Lead: <strong className="text-slate-800">{currentSectionMeta.managerInCharge}</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <p className="text-slate-600 text-xs max-w-3xl leading-relaxed">
              {currentSectionMeta.description}
            </p>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-mono bg-purple-50 text-[#714B67] font-bold px-2 py-1 rounded border border-purple-200">
                Connected Load: {Math.round(sectionStats[currentSectionMeta.id]?.totalKw || 0)} kW
              </span>
              {sectionStats[currentSectionMeta.id]?.openJCs > 0 && (
                <span className="text-[11px] bg-rose-50 text-rose-700 font-bold px-2 py-1 rounded border border-rose-200 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {sectionStats[currentSectionMeta.id].openJCs} Active Work Order(s)
                </span>
              )}
            </div>
          </div>

          {/* Sub-Area Filter Chips */}
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">
              Sub-Bays:
            </span>
            <button
              onClick={() => setSelectedSubArea('ALL')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                selectedSubArea === 'ALL'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              All {currentSectionMeta.shortLabel} ({sectionStats[currentSectionMeta.id]?.count || 0})
            </button>
            {currentSectionMeta.areas.map((area) => {
              const areaCount = equipmentList.filter((e) => e.plantArea === area).length;
              return (
                <button
                  key={area}
                  onClick={() => setSelectedSubArea(area)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer flex items-center gap-1 shrink-0 ${
                    selectedSubArea === area
                      ? 'bg-[#714B67] text-white font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{area}</span>
                  <span className="text-[10px] opacity-75 font-mono">({areaCount})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTER CONTROLS & MASTER ACTIONS BAR */}
      <div className="bg-white p-3 rounded-md border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Equipment</span>
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

        {/* Right: Technical Filters & View Switcher */}
        <div className="flex items-center space-x-2 text-xs">
          {/* Starter Filter */}
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

          {/* Operational Status */}
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

          {/* View Mode Toggle */}
          <div className="flex border border-slate-300 rounded bg-slate-50 overflow-hidden shadow-2xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1.5 cursor-pointer flex items-center gap-1.5 text-xs font-medium transition ${
                viewMode === 'grid' ? 'bg-[#714B67] text-white shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grid Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 cursor-pointer flex items-center gap-1.5 text-xs font-medium border-l border-slate-200 transition ${
                viewMode === 'table' ? 'bg-[#714B67] text-white shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Compact Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => {
                setTargetFeederPanel(null);
                setViewMode('sld');
              }}
              className={`px-3 py-1.5 cursor-pointer flex items-center gap-1.5 text-xs font-semibold border-l border-slate-200 transition ${
                viewMode === 'sld'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50/60 text-amber-800 hover:bg-amber-100/80 hover:text-amber-900'
              }`}
              title="Plant Power Distribution Single-Line Diagram"
            >
              <Zap className={`w-3.5 h-3.5 ${viewMode === 'sld' ? 'text-white' : 'text-amber-600 fill-amber-500'}`} />
              <span>Power SLD</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: GRID MODE */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded border border-slate-200">
              <Cpu className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <div className="font-bold text-slate-700 text-sm">No Machinery Found in this Section</div>
              <div className="text-slate-400 text-xs mt-1">
                Try selecting "All Sections" or clearing your filter criteria
              </div>
            </div>
          ) : (
            filteredList.map((eq) => {
              const activeJCs = jobCards.filter(
                (c) =>
                  (c.equipmentId === eq.id || c.equipmentName?.toLowerCase() === eq.name?.toLowerCase()) &&
                  c.status !== 'Completed' &&
                  c.status !== 'Cancelled'
              );

              return (
                <div
                  key={eq.id}
                  onClick={() => setSelectedEquipmentForDetail(eq)}
                  className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs hover:shadow-md hover:border-[#714B67] transition cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: Code, Area & Status */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 group-hover:text-[#714B67]">
                        {eq.code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusBadge(eq.status)}`}>
                          {eq.status}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getCriticalityBadge(eq.criticality)}`}>
                          {eq.criticality}
                        </span>
                      </div>
                    </div>

                    {/* Machine Name */}
                    <h3 className="font-bold text-sm text-slate-900 mb-1 leading-snug group-hover:text-[#714B67] transition-colors">
                      {eq.name}
                    </h3>

                    {/* Department & Plant Area Pill */}
                    <div className="text-xs text-slate-500 mb-2.5 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                        {eq.plantArea || 'Plant Asset'}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate">
                        {eq.department}
                      </span>
                    </div>

                    {/* Electrical Power Distribution Lineage Badge */}
                    {(() => {
                      const feeder = resolveEquipmentFeederInfo(eq);
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTargetFeederPanel(feeder.feederPanel);
                            setViewMode('sld');
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition cursor-pointer mb-2.5"
                          title={`Fed via ${feeder.transformerSource} ➔ ${feeder.feederBreaker}. Click to locate in Single-Line Diagram.`}
                        >
                          <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
                          <span>{feeder.transformerSource} • {feeder.feederBreaker} ({feeder.feederPanel})</span>
                        </button>
                      );
                    })()}

                    {/* Electrical & Mechanical Checklist Specs */}
                    {(eq.powerKw || eq.starterType || eq.overloadAmps || eq.speedRpm) && (
                      <div className="bg-purple-50/60 border border-purple-200 rounded p-2 text-[11px] text-purple-950 mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {eq.powerKw && (
                          <span><strong>Power:</strong> {eq.powerKw} kW</span>
                        )}
                        {eq.starterType && (
                          <span className="bg-purple-200/90 text-purple-950 px-1.5 py-0.2 rounded font-mono font-bold text-[10px]">
                            {eq.starterType}
                          </span>
                        )}
                        {eq.ratedCurrentAmps && (
                          <span><strong>Rated:</strong> {eq.ratedCurrentAmps}A</span>
                        )}
                        {eq.overloadAmps && (
                          <span className="text-amber-900 bg-amber-100 px-1 rounded font-bold text-[10px]">
                            O/L: {eq.overloadAmps}A
                          </span>
                        )}
                        {eq.speedRpm && (
                          <span className="text-slate-600">{eq.speedRpm} RPM</span>
                        )}
                      </div>
                    )}

                    {/* Operational Notes */}
                    {eq.notes && (
                      <p className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded border border-slate-100 mb-3">
                        {eq.notes}
                      </p>
                    )}
                  </div>

                  {/* Bottom: Breakdown Counter & 1-Click Raise JC Action */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs" onClick={(e) => e.stopPropagation()}>
                    <div>
                      {activeJCs.length > 0 ? (
                        <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-bold text-[11px] border border-amber-300 flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          {activeJCs.length} Open Work Order{activeJCs.length > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Operational
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(eq, 'UPGRADE')}
                        className="p-1 rounded border border-slate-200 text-slate-500 hover:text-[#714B67] hover:bg-purple-50 transition cursor-pointer"
                        title="Edit Machine Lifecycle (Upgrade, Swap, Relocate, Rename, Decommission)"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onNewJobCardForEquipment(eq)}
                        className="px-2.5 py-1 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1 shadow-xs"
                        title="Directly create a new Works Requisition pre-filled for this machine"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>Log Job Card</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: COMPACT DATA TABLE MODE */}
      {viewMode === 'table' && (
        <div className="bg-white rounded border border-slate-200 overflow-x-auto shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/90 text-slate-700 uppercase text-[10px] font-semibold border-b border-slate-200 select-none">
              <tr>
                <th className="py-2.5 px-3">Asset Code</th>
                <th className="py-2.5 px-3">Machine Description</th>
                <th className="py-2.5 px-3">Department Section</th>
                <th className="py-2.5 px-3">Plant Bay</th>
                <th className="py-2.5 px-3">Feeder Breaker</th>
                <th className="py-2.5 px-3 text-right">Power (kW)</th>
                <th className="py-2.5 px-3">Starter</th>
                <th className="py-2.5 px-3">Rated / O/L</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.map((eq) => {
                const sec = PLANT_SECTIONS_CONFIG.find(s => s.id === getSectionForAsset(eq));
                const activeJCs = jobCards.filter(
                  (c) =>
                    (c.equipmentId === eq.id || c.equipmentName?.toLowerCase() === eq.name?.toLowerCase()) &&
                    c.status !== 'Completed' &&
                    c.status !== 'Cancelled'
                );

                return (
                  <tr
                    key={eq.id}
                    onClick={() => setSelectedEquipmentForDetail(eq)}
                    className="hover:bg-slate-50 transition cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {eq.code}
                    </td>

                    <td className="py-2.5 px-3 font-medium text-slate-900 max-w-[220px]">
                      <div className="truncate font-semibold">{eq.name}</div>
                      {activeJCs.length > 0 && (
                        <span className="text-[10px] font-bold text-rose-600">
                          ⚠️ {activeJCs.length} Open Work Order{activeJCs.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-700">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sec?.badgeColor || 'bg-slate-100'}`}>
                        {sec?.shortLabel || eq.department}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      {eq.plantArea || '-'}
                    </td>

                    <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const feeder = resolveEquipmentFeederInfo(eq);
                        return (
                          <button
                            onClick={() => {
                              setTargetFeederPanel(feeder.feederPanel);
                              setViewMode('sld');
                            }}
                            className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-850 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition cursor-pointer"
                            title={`Fed via ${feeder.transformerSource} ➔ ${feeder.feederBreaker}. Click to locate in Single-Line Diagram.`}
                          >
                            <Zap className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                            <span>{feeder.feederBreaker}</span>
                          </button>
                        );
                      })()}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-right font-bold text-slate-900">
                      {eq.powerKw ? `${eq.powerKw} kW` : '-'}
                    </td>

                    <td className="py-2.5 px-3">
                      {eq.starterType ? (
                        <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-950 font-mono text-[10px] font-bold">
                          {eq.starterType}
                        </span>
                      ) : '-'}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      <span className="text-slate-800">{eq.ratedCurrentAmps ? `${eq.ratedCurrentAmps}A` : '-'}</span>
                      {eq.overloadAmps && (
                        <span className="text-amber-800 font-bold ml-1">({eq.overloadAmps}A)</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusBadge(eq.status)}`}>
                        {eq.status}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(eq, 'UPGRADE')}
                          className="p-1 rounded border border-slate-200 text-slate-500 hover:text-[#714B67] hover:bg-purple-50 transition cursor-pointer"
                          title="Edit Machine Lifecycle (Upgrade, Swap, Relocate, Rename, Decommission)"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onNewJobCardForEquipment(eq)}
                          className="px-2.5 py-1 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white text-[11px] font-semibold cursor-pointer shadow-2xs"
                        >
                          Raise JC
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 3: POWER DISTRIBUTION SINGLE-LINE DIAGRAM (SLD) */}
      {viewMode === 'sld' && (
        <PowerDistributionSLDView
          powerNodes={powerNodes.length > 0 ? powerNodes : DEFAULT_POWER_NODES}
          equipmentList={equipmentList}
          jobCards={jobCards}
          currentUserName={currentUserName}
          initialSelectedPanel={targetFeederPanel}
          onUpdatePowerNode={async (node, updates, audit) => {
            if (onUpdatePowerNode) {
              await onUpdatePowerNode(node, updates, audit);
            }
          }}
          onModifyEquipment={onModifyEquipment}
          onCreateEquipment={onCreateEquipment}
          onSelectEquipment={(eq) => setSelectedEquipmentForDetail(eq)}
          onNewJobCardForEquipment={(eq) => onNewJobCardForEquipment(eq)}
        />
      )}

      {/* ASSET DETAIL POPUP / SLIDE-OVER MODAL */}
      {selectedEquipmentForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-purple-100 text-[#714B67] flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-tight">
                    {selectedEquipmentForDetail.name}
                  </h3>
                  <span className="font-mono text-xs text-slate-500">
                    {selectedEquipmentForDetail.code}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedEquipmentForDetail(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            {/* Department & Operational Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Plant Department</span>
                <span className="font-semibold text-slate-800">{selectedEquipmentForDetail.department}</span>
              </div>

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Plant Bay</span>
                <span className="font-semibold text-slate-800">{selectedEquipmentForDetail.plantArea || 'General'}</span>
              </div>

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Operating Status</span>
                <span className={`inline-block px-2 py-0.2 rounded-full font-bold text-[10px] border ${getStatusBadge(selectedEquipmentForDetail.status)}`}>
                  {selectedEquipmentForDetail.status}
                </span>
              </div>

              <div className="p-2.5 rounded bg-purple-50 border border-purple-200">
                <span className="text-[10px] text-purple-700 uppercase font-bold block">Power Rating</span>
                <span className="font-mono font-bold text-sm text-purple-950">
                  {selectedEquipmentForDetail.powerKw ? `${selectedEquipmentForDetail.powerKw} kW` : 'N/A'}
                </span>
              </div>

              <div className="p-2.5 rounded bg-purple-50 border border-purple-200">
                <span className="text-[10px] text-purple-700 uppercase font-bold block">Starter Type</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedEquipmentForDetail.starterType || 'DOL'}
                </span>
              </div>

              <div className="p-2.5 rounded bg-purple-50 border border-purple-200">
                <span className="text-[10px] text-purple-700 uppercase font-bold block">Speed RPM</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedEquipmentForDetail.speedRpm ? `${selectedEquipmentForDetail.speedRpm} RPM` : 'N/A'}
                </span>
              </div>

              <div className="p-2.5 rounded bg-amber-50 border border-amber-200">
                <span className="text-[10px] text-amber-800 uppercase font-bold block">Rated Current</span>
                <span className="font-mono font-bold text-amber-950">
                  {selectedEquipmentForDetail.ratedCurrentAmps ? `${selectedEquipmentForDetail.ratedCurrentAmps} A` : 'N/A'}
                </span>
              </div>

              <div className="p-2.5 rounded bg-amber-50 border border-amber-200">
                <span className="text-[10px] text-amber-800 uppercase font-bold block">Overload Setting</span>
                <span className="font-mono font-bold text-amber-950">
                  {selectedEquipmentForDetail.overloadAmps ? `${selectedEquipmentForDetail.overloadAmps} A` : 'N/A'}
                </span>
              </div>

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Criticality</span>
                <span className={`inline-block px-2 py-0.2 rounded text-[10px] font-bold border ${getCriticalityBadge(selectedEquipmentForDetail.criticality)}`}>
                  {selectedEquipmentForDetail.criticality}
                </span>
              </div>
            </div>

            {/* Electrical Power Distribution Lineage & SLD Locator */}
            {(() => {
              const feeder = resolveEquipmentFeederInfo(selectedEquipmentForDetail);
              const panelMeta = FEEDER_PANELS.find(p => p.id === feeder.feederPanel);
              return (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-300/80 text-xs text-amber-950 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-amber-900 font-mono text-[11px] uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                      Power Distribution Lineage (SLD)
                    </span>
                    <span className="font-mono text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-semibold border border-amber-200">
                      {panelMeta?.voltage || '415V / 420V'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                    <div className="bg-white/90 p-1.5 rounded border border-amber-200">
                      <span className="text-[9px] text-slate-500 uppercase block">Source Tx</span>
                      <span className="font-bold text-slate-900">{feeder.transformerSource}</span>
                    </div>
                    <div className="bg-white/90 p-1.5 rounded border border-amber-200">
                      <span className="text-[9px] text-slate-500 uppercase block">Feeder Breaker</span>
                      <span className="font-bold text-amber-700">{feeder.feederBreaker}</span>
                    </div>
                    <div className="bg-white/90 p-1.5 rounded border border-amber-200">
                      <span className="text-[9px] text-slate-500 uppercase block">Distribution Panel</span>
                      <span className="font-bold text-slate-900 truncate block">{feeder.feederPanel}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-600 truncate max-w-[280px]">
                      {panelMeta?.location}
                    </span>
                    <button
                      onClick={() => {
                        setTargetFeederPanel(feeder.feederPanel);
                        setViewMode('sld');
                        setSelectedEquipmentForDetail(null);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded transition flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Zap className="w-3 h-3" />
                      Locate in Single-Line Diagram
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Notes */}
            {selectedEquipmentForDetail.notes && (
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Engineering Notes</span>
                <p className="text-slate-700">{selectedEquipmentForDetail.notes}</p>
              </div>
            )}

            {/* Tab Navigation: Maintenance Work Orders vs Engineering Lineage */}
            <div className="flex items-center space-x-2 border-b border-slate-200 pt-1">
              <button
                type="button"
                onClick={() => setDetailTab('work_orders')}
                className={`pb-2 px-1 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  detailTab === 'work_orders'
                    ? 'border-[#714B67] text-[#714B67]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Maintenance Work Orders</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 font-mono text-slate-700">
                  {jobCards.filter(
                    (c) =>
                      c.equipmentId === selectedEquipmentForDetail.id ||
                      c.equipmentName?.toLowerCase() === selectedEquipmentForDetail.name?.toLowerCase()
                  ).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('lineage')}
                className={`pb-2 px-1 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  detailTab === 'lineage'
                    ? 'border-[#714B67] text-[#714B67]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Engineering Revisions & Lineage</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    (selectedEquipmentForDetail.modificationHistory?.length || 0) > 0
                      ? 'bg-purple-100 text-[#714B67] font-bold'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {selectedEquipmentForDetail.modificationHistory?.length || 0}
                </span>
              </button>
            </div>

            {/* TAB 1: WORK ORDERS LIST */}
            {detailTab === 'work_orders' && (
              <div className="space-y-1.5 text-xs">
                {jobCards.filter(
                  (c) =>
                    c.equipmentId === selectedEquipmentForDetail.id ||
                    c.equipmentName?.toLowerCase() === selectedEquipmentForDetail.name?.toLowerCase()
                ).length === 0 ? (
                  <div className="p-3 rounded bg-slate-50 text-slate-500 text-center italic text-[11px] border border-slate-200">
                    No maintenance work orders recorded on this machinery asset
                  </div>
                ) : (
                  <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                    {jobCards
                      .filter(
                        (c) =>
                          c.equipmentId === selectedEquipmentForDetail.id ||
                          c.equipmentName?.toLowerCase() === selectedEquipmentForDetail.name?.toLowerCase()
                      )
                      .map((jc) => (
                        <div
                          key={jc.id}
                          className="p-2 rounded border border-slate-200 bg-white flex items-center justify-between text-[11px] hover:bg-slate-50"
                        >
                          <div>
                            <span className="font-mono font-bold text-slate-900">{jc.jobCardNumber}</span>
                            {jc.workOrderNumber && (
                              <span className="ml-1 text-[10px] text-red-700 font-bold font-mono">
                                (WO #{jc.workOrderNumber})
                              </span>
                            )}
                            <div className="text-slate-600 line-clamp-1">{jc.description}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 shrink-0">
                            {jc.status}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ENGINEERING REVISION LINEAGE */}
            {detailTab === 'lineage' && (
              <div className="space-y-2 text-xs">
                {(!selectedEquipmentForDetail.modificationHistory || selectedEquipmentForDetail.modificationHistory.length === 0) ? (
                  <div className="p-4 rounded bg-slate-50 border border-slate-200 text-center text-slate-500 space-y-1">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto" />
                    <p className="font-bold text-slate-700 text-xs">Baseline Engineering Specifications</p>
                    <p className="text-[11px] text-slate-500">
                      No component swaps, motor upgrades, or renames have been logged. All historical job cards link securely to baseline nameplate specs.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedEquipmentForDetail.modificationHistory.map((log) => {
                      const getChangeBadge = (type: string) => {
                        switch (type) {
                          case 'UPGRADE':
                            return 'bg-purple-100 text-purple-900 border-purple-300';
                          case 'SWAP':
                            return 'bg-blue-100 text-blue-900 border-blue-300';
                          case 'RELOCATION':
                            return 'bg-cyan-100 text-cyan-900 border-cyan-300';
                          case 'RENAME':
                            return 'bg-amber-100 text-amber-900 border-amber-300';
                          case 'DECOMMISSION':
                            return 'bg-rose-100 text-rose-900 border-rose-300';
                          default:
                            return 'bg-slate-100 text-slate-900 border-slate-300';
                        }
                      };

                      return (
                        <div
                          key={log.id}
                          className="p-2.5 rounded border border-slate-200 bg-white shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getChangeBadge(log.changeType)}`}>
                                {log.changeType}
                              </span>
                              <span className="font-semibold text-slate-800">{log.modifiedBy}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500">
                              {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-900 font-medium">
                            {log.summary}
                          </div>

                          <div className="text-[11px] bg-slate-50 p-1.5 rounded border border-slate-200 text-slate-600 flex items-start gap-1">
                            <span className="font-bold text-slate-700 shrink-0">Reason:</span>
                            <span>{log.reason}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedEquipmentForDetail(null)}
                  className="px-3.5 py-1.5 rounded border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const eq = selectedEquipmentForDetail;
                    handleOpenEditModal(eq, 'UPGRADE');
                  }}
                  className="px-3 py-1.5 rounded border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#714B67] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit / Swap Asset</span>
                </button>
              </div>

              <button
                onClick={() => {
                  const eq = selectedEquipmentForDetail;
                  setSelectedEquipmentForDetail(null);
                  onNewJobCardForEquipment(eq);
                }}
                className="px-4 py-1.5 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Log Works Order for this Machine</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIFECYCLE MODIFICATION & ENGINEERING CHANGE CONTROL MODAL */}
      {isEditModalOpen && equipmentToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-xl overflow-hidden my-6">
            <div className="bg-[#714B67] text-white px-5 py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm block">Plant Machinery Lifecycle & Engineering Change Control</span>
                <span className="text-[11px] text-purple-200 font-mono">
                  {equipmentToEdit.code} • {equipmentToEdit.name}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEquipmentToEdit(null);
                }}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Historical Snapshot Guarantee Banner */}
            <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center gap-2 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Immutable Historical Snapshot:</strong> Updating or decommissioning this asset will <strong>never</strong> corrupt or mutate closed job cards. Historical work orders maintain their original snapshot at the time of repair.
              </span>
            </div>

            <form onSubmit={handleSaveModification} className="p-5 space-y-3.5 text-xs bg-[#f8f9fa]">
              {/* Change Type Selector */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Action Classification *</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {(
                    [
                      { id: 'UPGRADE', label: 'Upgrade', icon: ArrowUpCircle },
                      { id: 'SWAP', label: 'Swap', icon: Shuffle },
                      { id: 'RELOCATION', label: 'Relocate', icon: MoveRight },
                      { id: 'RENAME', label: 'Rename', icon: Tag },
                      { id: 'SPECS_UPDATE', label: 'Specs', icon: Gauge },
                      { id: 'DECOMMISSION', label: 'Retire', icon: AlertOctagon }
                    ] as const
                  ).map((action) => {
                    const isSelected = editChangeType === action.id;
                    const IconComp = action.icon;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => {
                          setEditChangeType(action.id);
                          if (action.id === 'DECOMMISSION') {
                            setEditStatus('Decommissioned');
                          }
                        }}
                        className={`p-1.5 rounded border text-center font-semibold text-[11px] flex flex-col items-center gap-1 cursor-pointer transition ${
                          isSelected
                            ? action.id === 'DECOMMISSION'
                              ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                              : 'bg-[#714B67] text-white border-[#5b3c53] shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                        <span>{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Decommission Notice */}
              {editChangeType === 'DECOMMISSION' && (
                <div className="bg-rose-50 border border-rose-200 p-2.5 rounded text-rose-900 text-xs flex items-start gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Soft Decommissioning:</strong> This unit will be marked "Decommissioned / Not In Use" and hidden from new job card requisition dropdowns. Past job cards will still link to this record for historical MTBF and cost audit.
                  </div>
                </div>
              )}

              {/* Equipment Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Equipment Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Asset Tag / Code *</label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono text-slate-900"
                  />
                </div>
              </div>

              {/* Department & Plant Bay Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Department</label>
                  <select
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900"
                  >
                    <option value="Utilities - Boiler House">Utilities - Boiler House</option>
                    <option value="Water Treatment Plant">Water Treatment Plant</option>
                    <option value="Distillation Stillhouse">Distillation Stillhouse</option>
                    <option value="Fermentation Plant">Fermentation Plant</option>
                    <option value="Cooling & Utilities">Cooling & Utilities</option>
                    <option value="Molasses Storage">Molasses Storage</option>
                    <option value="Engineering & Workshops">Engineering & Workshops</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Plant Bay Area *</label>
                  <select
                    value={editPlantArea}
                    onChange={(e) => setEditPlantArea(e.target.value as PlantArea)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-medium"
                  >
                    <option value="Boiler 1">Boiler 1</option>
                    <option value="Boiler 2">Boiler 2</option>
                    <option value="Boiler 3">Boiler 3</option>
                    <option value="Universal">Universal Coal/Steam Loop</option>
                    <option value="Water Treatment">Water Treatment Plant</option>
                    <option value="Distillation">Distillation Stillhouse</option>
                    <option value="Fermentation">Fermentation Bay</option>
                    <option value="Cooling Towers">Cooling Towers</option>
                    <option value="Distillation Fans">Distillation Fans</option>
                    <option value="Fermentation/Turbine Fans">Fermentation/Turbine Fans</option>
                    <option value="Green Tank">Green Tank</option>
                    <option value="CMS/Molasses Tank">CMS / Molasses Storage</option>
                    <option value="Molasses Offloading Bay">Molasses Offloading Bay</option>
                    <option value="Molasses Dam 1">Molasses Dam 1</option>
                  </select>
                </div>
              </div>

              {/* Technical Specifications: Power, Starter, RPM */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Power Rating (kW)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editPowerKw}
                    onChange={(e) => setEditPowerKw(e.target.value)}
                    placeholder="18.5"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Starter Type</label>
                  <select
                    value={editStarterType}
                    onChange={(e) => setEditStarterType(e.target.value as StarterType)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-mono font-bold"
                  >
                    <option value="DOL">DOL</option>
                    <option value="Y/D">Y/D (Star-Delta)</option>
                    <option value="VSD">VSD (Variable Speed)</option>
                    <option value="SOFT STARTER">Soft Starter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Speed (RPM)</label>
                  <input
                    type="number"
                    value={editSpeedRpm}
                    onChange={(e) => setEditSpeedRpm(e.target.value)}
                    placeholder="1450"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono text-slate-900"
                  />
                </div>
              </div>

              {/* Electrical Current Ratings & Operating Status */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Rated Current (A)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editRatedCurrentAmps}
                    onChange={(e) => setEditRatedCurrentAmps(e.target.value)}
                    placeholder="34"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Overload Setting (A)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editOverloadAmps}
                    onChange={(e) => setEditOverloadAmps(e.target.value)}
                    placeholder="38"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono text-amber-950 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Operating Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as EquipmentStatus)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-semibold"
                  >
                    <option value="Operational">Operational</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Standby">Standby</option>
                    <option value="Decommissioned">Decommissioned</option>
                  </select>
                </div>
              </div>

              {/* Electrical Feeder Panel Assignment */}
              <div className="p-2.5 rounded bg-slate-100 border border-slate-200">
                <label className="block text-slate-800 font-bold mb-1">
                  Power Distribution Feeder Breaker (SLD Branch)
                </label>
                <select
                  value={editFeederPanel}
                  onChange={(e) => setEditFeederPanel(e.target.value as FeederPanelId)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-semibold"
                >
                  {FEEDER_PANELS.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.breakerCode} — {p.name} ({p.transformerSource})
                    </option>
                  ))}
                </select>
              </div>

              {/* Engineering Change Reason (Compulsory Audit Field) */}
              <div className="p-2.5 rounded bg-amber-50/70 border border-amber-200">
                <label className="block text-amber-950 font-bold mb-1">
                  Reason for Modification / Engineering Change Note *
                </label>
                <textarea
                  required
                  rows={2}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Swapped with 22kW reconditioned unit during Stop Day; fitted new SKF bearings and adjusted O/L relay to 42A"
                  className="w-full px-2.5 py-1.5 border border-amber-300 rounded bg-white text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                ></textarea>
              </div>

              {/* Authorized By */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">Authorized / Supervised By *</label>
                <input
                  type="text"
                  required
                  value={editModifiedBy}
                  onChange={(e) => setEditModifiedBy(e.target.value)}
                  placeholder="Antonio Miranda (HOD Engineering)"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900"
                />
              </div>

              {editFeedback && (
                <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  {editFeedback}
                </div>
              )}

              {/* Form Buttons */}
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEquipmentToEdit(null);
                  }}
                  className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-1.5 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  {isSavingEdit ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Change...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Audit Change</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE EQUIPMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden">
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
                    <option value="Boiler 1">Boiler 1</option>
                    <option value="Boiler 2">Boiler 2</option>
                    <option value="Boiler 3">Boiler 3</option>
                    <option value="Universal">Universal Coal/Steam Loop</option>
                    <option value="Water Treatment">Water Treatment Plant</option>
                    <option value="Distillation">Distillation Stillhouse</option>
                    <option value="Fermentation">Fermentation Bay</option>
                    <option value="Cooling Towers">Cooling Towers</option>
                    <option value="Distillation Fans">Distillation Fans</option>
                    <option value="Fermentation/Turbine Fans">Fermentation/Turbine Fans</option>
                    <option value="Green Tank">Green Tank</option>
                    <option value="CMS/Molasses Tank">CMS / Molasses Storage</option>
                    <option value="Molasses Offloading Bay">Molasses Offloading Bay</option>
                    <option value="Molasses Dam 1">Molasses Dam 1</option>
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
