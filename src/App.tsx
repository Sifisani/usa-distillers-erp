import React, { useState, useEffect } from 'react';
import {
  Plus,
  Table as TableIcon,
  Kanban as KanbanIcon,
  Filter,
  Layers,
  Wrench,
  Search,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { JobCardListView } from './components/jobcards/JobCardListView';
import { JobCardKanbanView } from './components/jobcards/JobCardKanbanView';
import { JobCardFormModal } from './components/jobcards/JobCardFormModal';
import { JobCardDetailModal } from './components/jobcards/JobCardDetailModal';
import { PrintWorkOrderModal } from './components/jobcards/PrintWorkOrderModal';
import { LoginModal } from './components/auth/LoginModal';
import { EquipmentView } from './components/equipment/EquipmentView';
import { DashboardView } from './components/dashboard/DashboardView';
import { SettingsView } from './components/settings/SettingsView';
import { OrganogramExplorer } from './components/organization/OrganogramExplorer';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  subscribeJobCards,
  createJobCard,
  updateJobCard,
  updateJobCardStatus,
  addLaborHours,
  addJobCardComment,
  deleteJobCard
} from './services/jobCardService';
import {
  subscribeEquipment,
  createEquipment,
  updateEquipment
} from './services/equipmentService';
import { JobCard, Equipment, JobCardStatus, Priority, DEPARTMENTS_BY_CATEGORY } from './types';

function MainApp() {
  const { userProfile } = useAuth();

  // Navigation & View state
  const [currentView, setCurrentView] = useState<'dashboard' | 'jobcards' | 'equipment' | 'organogram' | 'settings'>('jobcards');
  const [jobCardViewMode, setJobCardViewMode] = useState<'list' | 'kanban'>('kanban');

  // Search & Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');

  // Data state
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedCardForEdit, setSelectedCardForEdit] = useState<JobCard | null>(null);
  const [selectedCardForDetail, setSelectedCardForDetail] = useState<JobCard | null>(null);
  const [selectedCardForPrint, setSelectedCardForPrint] = useState<JobCard | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Subscribe to real-time Firestore collections
  useEffect(() => {
    const unsubCards = subscribeJobCards(
      (cards) => {
        setJobCards(cards);
        setLoading(false);
      },
      (err) => {
        console.error('Job cards subscription error:', err);
        setLoading(false);
      }
    );

    const unsubEquip = subscribeEquipment(
      (equip) => {
        setEquipmentList(equip);
      },
      (err) => {
        console.error('Equipment subscription error:', err);
      }
    );

    return () => {
      unsubCards();
      unsubEquip();
    };
  }, []);

  // Sync open detail modal when real-time updates happen
  useEffect(() => {
    if (selectedCardForDetail) {
      const updated = jobCards.find((c) => c.id === selectedCardForDetail.id);
      if (updated) {
        setSelectedCardForDetail(updated);
      }
    }
  }, [jobCards]);

  // Derived counts
  const openCount = jobCards.filter((c) => c.status !== 'Completed' && c.status !== 'Cancelled').length;
  const emergencyCount = jobCards.filter(
    (c) => c.priority === 'Emergency' && c.status !== 'Completed' && c.status !== 'Cancelled'
  ).length;
  const pendingSparesCount = jobCards.filter((c) => c.status === 'Pending Spares').length;

  // Handlers for Job Card CRUD
  const handleCreateOrUpdateJobCard = async (cardData: any) => {
    if (selectedCardForEdit) {
      await updateJobCard(selectedCardForEdit.id, cardData);
      setSelectedCardForEdit(null);
    } else {
      await createJobCard(cardData, userProfile || undefined);
    }
  };

  const handleUpdateStatus = async (card: JobCard, newStatus: JobCardStatus) => {
    const actor = userProfile?.displayName || 'Authorized Staff';
    await updateJobCardStatus(card, newStatus, actor);
  };

  const handleAddLabor = async (card: JobCard, tech: string, date: string, hours: number, notes: string) => {
    await addLaborHours(card, tech, date, hours, notes);
  };

  const handleAddComment = async (card: JobCard, author: string, message: string) => {
    await addJobCardComment(card, author, message);
  };

  const handleDeleteJobCard = async (id: string) => {
    await deleteJobCard(id);
    if (selectedCardForDetail?.id === id) {
      setSelectedCardForDetail(null);
    }
  };

  const handleNewJobCardForEquipment = (equipment: Equipment) => {
    setSelectedCardForEdit(null);
    setIsFormModalOpen(true);
    // Pre-set in form modal
  };

  const handleOpenEditFromDetail = (card: JobCard) => {
    setSelectedCardForDetail(null);
    setSelectedCardForEdit(card);
    setIsFormModalOpen(true);
  };

  const STATUS_TABS: { id: string; label: string }[] = [
    { id: 'ALL', label: 'All Stages' },
    { id: 'Draft', label: 'Draft' },
    { id: 'In Progress', label: 'In Progress' },
    { id: 'Pending Spares', label: 'Pending Spares' },
    { id: 'Completed', label: 'Completed' },
    { id: 'Cancelled', label: 'Cancelled' }
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans text-slate-800 antialiased selection:bg-[#714B67] selection:text-white">
      {/* Odoo Header Bar */}
      <Header
        currentView={currentView}
        subView={currentView === 'jobcards' ? (jobCardViewMode === 'kanban' ? 'Kanban View' : 'List View') : undefined}
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
        emergencyCount={emergencyCount}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentView={currentView}
          onSelectView={(v) => setCurrentView(v as any)}
          openCount={openCount}
          emergencyCount={emergencyCount}
          pendingSparesCount={pendingSparesCount}
        />

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-[1700px] w-full mx-auto">
          {/* VIEW: DASHBOARD */}
          {currentView === 'dashboard' && (
            <DashboardView
              jobCards={jobCards}
              equipmentList={equipmentList}
              onNavigateToJobCards={(filter) => {
                setCurrentView('jobcards');
                if (filter === 'Emergency') {
                  setSelectedPriority('Emergency');
                  setStatusFilter('ALL');
                } else if (filter) {
                  setStatusFilter(filter);
                }
              }}
              onNavigateToEquipment={() => setCurrentView('equipment')}
              onOpenCreateJobCard={() => {
                setSelectedCardForEdit(null);
                setIsFormModalOpen(true);
              }}
            />
          )}

          {/* VIEW: EQUIPMENT */}
          {currentView === 'equipment' && (
            <EquipmentView
              equipmentList={equipmentList}
              jobCards={jobCards}
              onCreateEquipment={async (data) => {
                await createEquipment(data);
              }}
              onNewJobCardForEquipment={handleNewJobCardForEquipment}
              searchQuery={searchQuery}
            />
          )}

          {/* VIEW: ORGANOGRAM */}
          {currentView === 'organogram' && (
            <OrganogramExplorer />
          )}

          {/* VIEW: SETTINGS */}
          {currentView === 'settings' && (
            <SettingsView jobCards={jobCards} equipmentList={equipmentList} />
          )}

          {/* VIEW: JOB CARDS (CORE WORKSPACE) */}
          {currentView === 'jobcards' && (
            <div className="space-y-4">
              {/* Odoo ERP Control Panel */}
              <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                {/* Left: Primary Action "New" & Quick Views */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setSelectedCardForEdit(null);
                      setIsFormModalOpen(true);
                    }}
                    className="px-4 py-1.5 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Job Card</span>
                  </button>

                  {/* Dual View Switcher: List vs Kanban */}
                  <div className="flex items-center border border-slate-300 rounded overflow-hidden text-xs">
                    <button
                      title="List View"
                      onClick={() => setJobCardViewMode('list')}
                      className={`p-1.5 px-2.5 transition flex items-center gap-1 cursor-pointer ${
                        jobCardViewMode === 'list'
                          ? 'bg-[#714B67] text-white font-semibold'
                          : 'bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">List</span>
                    </button>
                    <button
                      title="Kanban Board View"
                      onClick={() => setJobCardViewMode('kanban')}
                      className={`p-1.5 px-2.5 transition flex items-center gap-1 cursor-pointer ${
                        jobCardViewMode === 'kanban'
                          ? 'bg-[#714B67] text-white font-semibold'
                          : 'bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <KanbanIcon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Kanban</span>
                    </button>
                  </div>
                </div>

                {/* Right: Filters & Grouping Dropdowns */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {/* Department Filter */}
                  <div className="flex items-center space-x-1">
                    <Filter className="w-3 h-3 text-slate-400" />
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-700 focus:outline-none"
                    >
                      <option value="">All Departments</option>
                      {DEPARTMENTS_BY_CATEGORY.map((g) => (
                        <optgroup key={g.category} label={g.category}>
                          {g.departments.map((d) => (
                            <option key={d} value={`${g.category} - ${d}`}>
                              {d}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Priority Filter */}
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-700 focus:outline-none"
                  >
                    <option value="">All Priorities</option>
                    <option value="Emergency">Emergency Only</option>
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>

                  {(selectedDepartment || selectedPriority || searchQuery) && (
                    <button
                      onClick={() => {
                        setSelectedDepartment('');
                        setSelectedPriority('');
                        setSearchQuery('');
                      }}
                      className="text-slate-500 hover:text-slate-800 text-[11px] underline px-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filter Stage Tabs (Odoo sub-bar) */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                {STATUS_TABS.map((tab) => {
                  const isActive = statusFilter === tab.id;
                  const count =
                    tab.id === 'ALL'
                      ? jobCards.length
                      : jobCards.filter((c) => c.status === tab.id).length;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                        isActive
                          ? 'bg-slate-800 text-white shadow-xs font-semibold'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* DUAL VIEWS: KANBAN vs LIST */}
              {jobCardViewMode === 'kanban' ? (
                <JobCardKanbanView
                  jobCards={jobCards}
                  onSelectCard={(card) => setSelectedCardForDetail(card)}
                  onUpdateStatus={handleUpdateStatus}
                  selectedDepartment={selectedDepartment}
                  selectedPriority={selectedPriority}
                  searchQuery={searchQuery}
                />
              ) : (
                <JobCardListView
                  jobCards={jobCards}
                  onSelectCard={(card) => setSelectedCardForDetail(card)}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  selectedDepartment={selectedDepartment}
                  onDepartmentChange={setSelectedDepartment}
                  selectedPriority={selectedPriority}
                  onPriorityChange={setSelectedPriority}
                  searchQuery={searchQuery}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* MODALS */}
      {/* 1. Create / Edit Job Card Modal */}
      <JobCardFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedCardForEdit(null);
        }}
        onSubmit={handleCreateOrUpdateJobCard}
        existingCard={selectedCardForEdit}
        existingCards={jobCards}
        equipmentList={equipmentList}
      />

      {/* 2. Job Card Detail / Labor Log / Chatter Modal */}
      <JobCardDetailModal
        card={selectedCardForDetail}
        isOpen={Boolean(selectedCardForDetail)}
        onClose={() => setSelectedCardForDetail(null)}
        onEdit={handleOpenEditFromDetail}
        onDelete={handleDeleteJobCard}
        onUpdateStatus={handleUpdateStatus}
        onAddLabor={handleAddLabor}
        onAddComment={handleAddComment}
        onPrint={(card) => {
          setSelectedCardForDetail(null);
          setSelectedCardForPrint(card);
        }}
      />

      {/* 3. Physical Work Order Sheet Modal */}
      <PrintWorkOrderModal
        card={selectedCardForPrint}
        isOpen={Boolean(selectedCardForPrint)}
        onClose={() => setSelectedCardForPrint(null)}
      />

      {/* 4. Login & Staff Role Switcher Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
