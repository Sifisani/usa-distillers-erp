import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Table as TableIcon,
  Kanban as KanbanIcon,
  Filter,
  Layers,
  Wrench,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Inbox,
  ClipboardCheck,
  PackageCheck,
  Send,
  Users,
  Package,
  Shield,
  Lock
} from 'lucide-react';
import { firebaseRuntimeInfo } from './firebase';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { JobCardListView } from './components/jobcards/JobCardListView';
import { JobCardKanbanView } from './components/jobcards/JobCardKanbanView';
import { JobCardFormModal } from './components/jobcards/JobCardFormModal';
import { JobCardDetailModal } from './components/jobcards/JobCardDetailModal';
import { PrintWorkOrderModal } from './components/jobcards/PrintWorkOrderModal';
import { LoginModal } from './components/auth/LoginModal';
import { EquipmentView } from './components/equipment/EquipmentView';
import {
  ElectricalDistributionView,
  ElectricalSubModule
} from './components/equipment/ElectricalDistributionView';
import { DashboardView } from './components/dashboard/DashboardView';
import { SettingsView } from './components/settings/SettingsView';
import { OrganogramExplorer } from './components/organization/OrganogramExplorer';
import { EnterpriseLaunchpad } from './components/launchpad/EnterpriseLaunchpad';
import { DailyPlantReportView } from './components/reports/DailyPlantReportView';
import { QuickLogPhysicalSlipModal } from './components/jobcards/QuickLogPhysicalSlipModal';
import { StoresSparesView } from './components/spares/StoresSparesView';
import { PhysicalSlipsView } from './components/jobcards/PhysicalSlipsView';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  subscribeJobCards,
  createJobCard,
  updateJobCard,
  updateJobCardStatus,
  addLaborHours,
  addShiftHandover,
  addJobCardComment,
  deleteJobCard,
  acceptAndAssignRequisition,
  addSparePartRequisition,
  issueSparePart,
  recordArtisanHandback,
  closeOutJobCardHOD
} from './services/jobCardService';
import {
  subscribeEquipment,
  safeCreateEquipment,
  modifyEquipmentWithAudit,
  updateEquipmentInspectionFields,
  safeDeleteEquipmentWithCheck
} from './services/equipmentService';
import {
  subscribeStoresSlips,
  createStoresSlip,
  verifyStoresSlipHOD
} from './services/storesSlipService';
import {
  subscribePowerNodes,
  updatePowerNodeWithAudit
} from './services/powerDistributionService';
import {
  subscribePowerConnections,
  createPowerConnectionWithAudit,
  deletePowerConnectionWithAudit
} from './services/powerConnectionService';
import {
  subscribeElectricalMeasurements,
  recordElectricalMeasurement
} from './services/electricalMeasurementService';
import {
  subscribeElectricalInspections,
  subscribeElectricalInspectionReviews,
  subscribeInspectionTemplates,
  submitElectricalInspection,
  submitInspectionReview,
  saveInspectionTemplate
} from './services/electricalInspectionService';
import {
  DEFAULT_INSPECTION_TEMPLATES,
  SubmitInspectionInput,
  collectElectricalMaintenanceAlerts,
  indexLatestInspectionsByAsset
} from './core/electrical/inspections';
import {
  DEFAULT_POWER_NODES,
  evaluatePowerDistributionHazards
} from './core/master-data/powerDistributionData';
import {
  JobCard,
  Equipment,
  JobCardStatus,
  Priority,
  DEPARTMENTS_BY_CATEGORY,
  TechnicalTrade,
  ShiftGroup,
  StoresRequisitionSlip,
  PowerDistributionNode,
  PowerConnection,
  ElectricalMeasurement,
  ElectricalInspection,
  ElectricalInspectionReview,
  ElectricalJobCardPrefill,
  InspectionAssetCategory,
  InspectionReviewStatus,
  InspectionTemplate,
  FeederPanelId,
  PowerVoltageTier,
  PowerEdgeRole
} from './types';
import {
  getActiveStandbyRoster,
  TECHNICAL_TRADES_LIST,
  SHIFTS_LIST
} from './core/master-data/organization';

function MainApp() {
  const { currentUser, userProfile, loading: authLoading, loginWithGoogle } = useAuth();
  const [authActionError, setAuthActionError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Navigation & View state (Default to Works Requisitions for supervisor action)
  const [currentView, setCurrentView] = useState<
    'jobcards' | 'equipment' | 'electrical' | 'spares' | 'slips' | 'launchpad' | 'dashboard' | 'organogram' | 'reports' | 'settings'
  >('jobcards');
  const [jobCardViewMode, setJobCardViewMode] = useState<'list' | 'kanban'>('kanban');
  const [electricalSubModule, setElectricalSubModule] = useState<ElectricalSubModule>('diagram');
  const [electricalTargetPanel, setElectricalTargetPanel] = useState<FeederPanelId | null>(null);

  // Search & Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedTrade, setSelectedTrade] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<string>('');

  // Supervisor Department Queues
  const [departmentQueue, setDepartmentQueue] = useState<'ALL' | 'INCOMING_ENGINEERING' | 'RAISED_BY_ME' | 'PENDING_SPARES' | 'AWAITING_HOD'>('ALL');

  // Data state
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [storesSlips, setStoresSlips] = useState<StoresRequisitionSlip[]>([]);
  const [powerNodes, setPowerNodes] = useState<PowerDistributionNode[]>([]);
  const [powerConnections, setPowerConnections] = useState<PowerConnection[]>([]);
  const [electricalMeasurements, setElectricalMeasurements] = useState<ElectricalMeasurement[]>([]);
  const [electricalInspections, setElectricalInspections] = useState<ElectricalInspection[]>([]);
  const [electricalInspectionReviews, setElectricalInspectionReviews] = useState<ElectricalInspectionReview[]>([]);
  const [inspectionTemplates, setInspectionTemplates] = useState<Record<InspectionAssetCategory, InspectionTemplate>>(
    DEFAULT_INSPECTION_TEMPLATES
  );
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [jobCardPrefill, setJobCardPrefill] = useState<ElectricalJobCardPrefill | null>(null);
  const [isQuickLogModalOpen, setIsQuickLogModalOpen] = useState(false);
  const [isStandbyModalOpen, setIsStandbyModalOpen] = useState(false);
  const [selectedCardForEdit, setSelectedCardForEdit] = useState<JobCard | null>(null);
  const [selectedCardForDetail, setSelectedCardForDetail] = useState<JobCard | null>(null);
  const [selectedCardForPrint, setSelectedCardForPrint] = useState<JobCard | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Subscribe to real-time Firestore collections only when Firebase Auth session is active
  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      setJobCards([]);
      setEquipmentList([]);
      setStoresSlips([]);
      setPowerNodes([]);
      setPowerConnections([]);
      setElectricalMeasurements([]);
      setElectricalInspections([]);
      setElectricalInspectionReviews([]);
      setInspectionTemplates(DEFAULT_INSPECTION_TEMPLATES);
      setLoading(false);
      return;
    }

    setLoading(true);
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

    const unsubSlips = subscribeStoresSlips((slips) => {
      setStoresSlips(slips);
    });

    const unsubPower = subscribePowerNodes(
      (nodes) => {
        setPowerNodes(nodes);
      },
      (err) => {
        console.error('Power distribution subscription error:', err);
      }
    );

    const unsubConnections = subscribePowerConnections(
      (connections) => {
        setPowerConnections(connections);
      },
      (err) => {
        console.error('Power connections subscription error:', err);
      }
    );

    const unsubMeasurements = subscribeElectricalMeasurements(
      (measurements) => {
        setElectricalMeasurements(measurements);
      },
      (err) => {
        console.error('Electrical measurements subscription error:', err);
      }
    );

    const unsubInspections = subscribeElectricalInspections(
      (inspections) => {
        setElectricalInspections(inspections);
      },
      (err) => {
        console.error('Electrical inspections subscription error:', err);
      }
    );

    const unsubInspectionReviews = subscribeElectricalInspectionReviews(
      (reviews) => {
        setElectricalInspectionReviews(reviews);
      },
      (err) => {
        console.error('Electrical inspection reviews subscription error:', err);
      }
    );

    const unsubTemplates = subscribeInspectionTemplates(
      (templates) => {
        setInspectionTemplates(templates);
      },
      (err) => {
        console.error('Inspection templates subscription error:', err);
      }
    );

    return () => {
      unsubCards();
      unsubEquip();
      unsubSlips();
      unsubPower();
      unsubConnections();
      unsubMeasurements();
      unsubInspections();
      unsubInspectionReviews();
      unsubTemplates();
    };
  }, [currentUser, authLoading]);

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

  // Supervisor Routing Queues derived counts
  const incomingToEngCount = React.useMemo(() => {
    return jobCards.filter((c) => {
      const isEng = c.recipientDepartment?.toLowerCase().includes('engineering') ||
        c.recipientDepartment?.toLowerCase().includes('maintenance') ||
        c.department?.toLowerCase().includes('engineering') ||
        c.department?.toLowerCase().includes('maintenance');
      return isEng || c.requisitionStage === 'Pending Acceptance';
    }).length;
  }, [jobCards]);

  const raisedByMeCount = React.useMemo(() => {
    if (!userProfile) return 0;
    const myDept = userProfile.department?.toLowerCase() || '';
    const myName = userProfile.displayName?.toLowerCase() || '';
    return jobCards.filter((c) =>
      (c.originatingDepartment && c.originatingDepartment.toLowerCase().includes(myDept)) ||
      (c.department && c.department.toLowerCase().includes(myDept)) ||
      ((c.originatedBy && c.originatedBy.toLowerCase().includes(myName)) || (c.createdByName && c.createdByName.toLowerCase().includes(myName)))
    ).length;
  }, [jobCards, userProfile]);

  const pendingSparesCountAll = React.useMemo(() => {
    return jobCards.filter((c) =>
      c.status === 'Pending Spares' ||
      c.requisitionStage === 'Pending Spares' ||
      (c.sparesRequested && c.sparesRequested.some(p => p.status === 'Requested'))
    ).length;
  }, [jobCards]);

  const awaitingHODCount = React.useMemo(() => {
    return jobCards.filter((c) =>
      c.requisitionStage === 'Artisan Completed' ||
      (c.status === 'Completed' && !c.hodDigitalSignOff)
    ).length;
  }, [jobCards]);

  const paperSlipsCount = React.useMemo(() => {
    return jobCards.filter((c) => c.physicalSlipLogged === true || Boolean(c.workOrderNumber)).length;
  }, [jobCards]);

  const queueFilteredCards = React.useMemo(() => {
    return jobCards.filter((c) => {
      if (departmentQueue === 'INCOMING_ENGINEERING') {
        const isEng = c.recipientDepartment?.toLowerCase().includes('engineering') ||
          c.recipientDepartment?.toLowerCase().includes('maintenance') ||
          c.department?.toLowerCase().includes('engineering') ||
          c.department?.toLowerCase().includes('maintenance');
        return isEng || c.requisitionStage === 'Pending Acceptance';
      }
      if (departmentQueue === 'RAISED_BY_ME') {
        if (!userProfile) return true;
        const myDept = userProfile.department?.toLowerCase() || '';
        const myName = userProfile.displayName?.toLowerCase() || '';
        return (c.originatingDepartment && c.originatingDepartment.toLowerCase().includes(myDept)) ||
               (c.department && c.department.toLowerCase().includes(myDept)) ||
               ((c.originatedBy && c.originatedBy.toLowerCase().includes(myName)) || (c.createdByName && c.createdByName.toLowerCase().includes(myName)));
      }
      if (departmentQueue === 'PENDING_SPARES') {
        return c.status === 'Pending Spares' ||
          c.requisitionStage === 'Pending Spares' ||
          (c.sparesRequested && c.sparesRequested.some(p => p.status === 'Requested'));
      }
      if (departmentQueue === 'AWAITING_HOD') {
        return c.requisitionStage === 'Artisan Completed' ||
          (c.status === 'Completed' && !c.hodDigitalSignOff);
      }
      return true;
    });
  }, [jobCards, departmentQueue, userProfile]);

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

  const handleAddLabor = async (
    card: JobCard,
    tech: string,
    date: string,
    hours: number,
    notes: string,
    options?: {
      trade?: TechnicalTrade;
      rateType?: 'Standard' | 'Shift' | 'Standby Callout' | 'Overtime';
      shift?: ShiftGroup;
    }
  ) => {
    await addLaborHours(card, tech, date, hours, notes, options);
  };

  const handleAddHandover = async (card: JobCard, handover: any) => {
    await addShiftHandover(card, handover);
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
    const deptCategory = equipment.department?.split(' - ')[0] || 'Engineering';
    setSelectedCardForEdit(null);
    setJobCardPrefill({
      equipmentId: equipment.id,
      equipmentCode: equipment.code,
      equipmentName: equipment.name,
      department: equipment.department || 'Engineering - Electrical & Instrumentation',
      departmentCategory: deptCategory,
      plantArea: equipment.plantArea || equipment.location,
      electricalFeeder: equipment.feederPanel
        ? `${equipment.feederPanel}${equipment.feederBreaker ? ` / ${equipment.feederBreaker}` : ''}`
        : undefined,
      description: '',
      priority: 'Medium',
      equipmentSpecs: {
        powerKw: equipment.powerKw,
        ratedCurrentAmps: equipment.ratedCurrentAmps,
        loadCurrentAmps: equipment.loadCurrentAmps,
        overloadAmps: equipment.overloadAmps,
        starterType: equipment.starterType,
        speedRpm: equipment.speedRpm,
        plantArea: equipment.plantArea
      }
    });
    setIsFormModalOpen(true);
  };

  const handleRaiseJobCardFromInspection = (prefill: ElectricalJobCardPrefill) => {
    setSelectedCardForEdit(null);
    setJobCardPrefill(prefill);
    setIsFormModalOpen(true);
  };

  const electricalAlertCount = useMemo(() => {
    const nodes = powerNodes.length > 0 ? powerNodes : DEFAULT_POWER_NODES;
    const summaries = indexLatestInspectionsByAsset(
      electricalInspections,
      electricalInspectionReviews
    );
    const hazards = evaluatePowerDistributionHazards(
      nodes,
      equipmentList,
      jobCards,
      powerConnections,
      electricalMeasurements
    );
    return collectElectricalMaintenanceAlerts({
      powerNodes: nodes,
      equipmentList,
      conditionSummaries: summaries,
      hazards
    }).length;
  }, [
    powerNodes,
    electricalInspections,
    electricalInspectionReviews,
    equipmentList,
    jobCards,
    powerConnections,
    electricalMeasurements
  ]);

  const handleOpenElectricalModule = (panelId?: FeederPanelId) => {
    setElectricalTargetPanel(panelId || null);
    setElectricalSubModule('diagram');
    setCurrentView('electrical');
  };

  const handleUpdatePowerNodeShared = async (
    node: PowerDistributionNode,
    updates: Partial<PowerDistributionNode>,
    audit: {
      modifiedBy: string;
      summary: string;
      reason: string;
      previousValues?: Record<string, any>;
      newValues?: Record<string, any>;
    }
  ) => {
    await updatePowerNodeWithAudit(node, updates, {
      ...audit,
      approvedBy: userProfile?.displayName || audit.modifiedBy
    });
  };

  const handleCreatePowerConnectionShared = async (candidate: {
    sourceNodeId: string;
    targetNodeId: string;
    voltageTier: PowerVoltageTier;
    edgeRole: PowerEdgeRole;
    label?: string;
    reason: string;
    createdBy: string;
  }) => {
    await createPowerConnectionWithAudit(
      {
        ...candidate,
        approvedBy: userProfile?.displayName || candidate.createdBy
      },
      powerNodes,
      powerConnections
    );
  };

  const handleSubmitElectricalInspectionShared = async (
    input: Omit<SubmitInspectionInput, 'technicianId' | 'technicianName' | 'technicianRole'>
  ) => {
    if (!currentUser) return;
    await submitElectricalInspection(input, {
      technicianName: userProfile?.displayName || currentUser.email || 'Authorized Technician',
      technicianRole: userProfile?.role,
      userEmail: userProfile?.email || currentUser.email,
      existingCount: electricalInspections.length
    });
    if (
      input.measurements &&
      (input.measurements.currentAmps !== undefined ||
        input.measurements.voltageV !== undefined ||
        input.measurements.currentL1Amps !== undefined)
    ) {
      try {
        await recordElectricalMeasurement({
          assetId: input.assetId,
          assetKind: input.assetKind,
          assetCode: input.assetCode,
          measurementType: 'CURRENT',
          phase: '3PH_AVG',
          unit: 'A',
          source: input.measurementSource || 'MEASURED',
          values: input.measurements,
          timestamp: input.inspectedAt,
          recordedBy: userProfile?.displayName || currentUser.email || 'Authorized Technician',
          recordedByUid: currentUser.uid,
          notes: `Logged with Electrical Inspection (${input.conditionAssessment})`
        });
      } catch (measErr) {
        console.warn('Optional measurement mirror failed after inspection save:', measErr);
      }
    }
  };

  const handleSubmitInspectionReviewShared = async (params: {
    inspectionId: string;
    assetId: string;
    decision: Exclude<InspectionReviewStatus, 'PENDING_REVIEW'>;
    reviewNotes: string;
  }) => {
    if (!currentUser) return;
    await submitInspectionReview({
      ...params,
      reviewerName: userProfile?.displayName || currentUser.email || 'Engineering Supervisor',
      reviewerRole: userProfile?.role,
      userEmail: userProfile?.email || currentUser.email
    });
  };

  const handleSaveInspectionTemplateShared = async (template: InspectionTemplate) => {
    if (!currentUser) return;
    await saveInspectionTemplate(template, {
      userName: userProfile?.displayName || currentUser.email || 'Engineering Admin',
      userRole: userProfile?.role,
      userEmail: userProfile?.email || currentUser.email
    });
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f2f4f1] flex items-center justify-center p-6 font-sans">
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-6 py-5 text-center space-y-2 max-w-sm w-full">
          <div className="w-8 h-8 border-2 border-[#1b4332] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-700">
            Verifying Firebase session ({firebaseRuntimeInfo.projectId})...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#1b4332] flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
          <div className="bg-[#714B67] text-white px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-white/10 border border-white/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">USA Distillers ERP</h1>
                <p className="text-xs text-white/80">Great Usuthu Plant — Authenticated Workspace</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] font-mono bg-black/25 px-2.5 py-1.5 rounded border border-white/10">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <Shield className="w-3.5 h-3.5" />
                {firebaseRuntimeInfo.projectId}
              </span>
              <span className="uppercase text-[10px] font-sans font-bold px-1.5 py-0.5 rounded bg-white/15">
                {firebaseRuntimeInfo.environment}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Firestore security rules enforce authenticated plant access. Sign in with your Google workspace account or company credentials to synchronize work orders, machinery assets, and power distribution records.
            </p>

            {authActionError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {authActionError}
              </div>
            )}

            <button
              type="button"
              disabled={authBusy}
              onClick={async () => {
                setAuthActionError(null);
                setAuthBusy(true);
                try {
                  await loginWithGoogle();
                } catch (err: any) {
                  setAuthActionError(err.message || 'Google Sign-In failed.');
                } finally {
                  setAuthBusy(false);
                }
              }}
              className="w-full flex items-center justify-center gap-2.5 bg-[#1b4332] hover:bg-[#143326] text-white py-2.5 px-4 rounded text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <span>{authBusy ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full py-2 px-4 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Sign in with Email / Staff Options
            </button>
          </div>
        </div>

        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans text-slate-800 antialiased selection:bg-[#714B67] selection:text-white">
      {/* USA Distillers Header Bar */}
      <Header
        currentView={currentView}
        subView={
          currentView === 'jobcards'
            ? jobCardViewMode === 'kanban'
              ? 'Kanban View'
              : 'List View'
            : currentView === 'electrical'
            ? electricalSubModule === 'diagram'
              ? 'Single-Line Diagram'
              : electricalSubModule === 'inspections'
              ? 'Asset Inspections'
              : 'Load Monitoring'
            : undefined
        }
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
        emergencyCount={emergencyCount}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onSelectView={(v) => setCurrentView(v as any)}
      />

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {currentView !== 'launchpad' && (
          <Sidebar
            currentView={currentView}
            onSelectView={(v) => setCurrentView(v as any)}
            openCount={openCount}
            emergencyCount={emergencyCount}
            pendingSparesCount={pendingSparesCount}
            paperSlipsCount={paperSlipsCount}
            electricalAlertCount={electricalAlertCount}
          />
        )}

        <main className={`flex-1 overflow-y-auto ${currentView === 'launchpad' ? 'p-0 bg-[#f2f4f1]' : 'p-4 lg:p-6 max-w-[1700px] w-full mx-auto'}`}>
          {/* VIEW: ENTERPRISE LAUNCHPAD (From Ui1 & Ui2 Sketches) */}
          {currentView === 'launchpad' && (
            <EnterpriseLaunchpad
              onNavigate={(v) => setCurrentView(v as any)}
              openJobCardCount={openCount}
              emergencyCount={emergencyCount}
            />
          )}

          {/* VIEW: DAILY PLANT REPORT (Phase 2 Roadmap) */}
          {currentView === 'reports' && (
            <DailyPlantReportView />
          )}

          {/* VIEW: DASHBOARD (Phase 2 Roadmap) */}
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

          {/* VIEW: EQUIPMENT (Plant Machinery & 105 Motors Asset Catalog) */}
          {currentView === 'equipment' && (
            <EquipmentView
              equipmentList={equipmentList}
              jobCards={jobCards}
              powerNodes={powerNodes}
              powerConnections={powerConnections}
              electricalMeasurements={electricalMeasurements}
              currentUserName={userProfile?.displayName || 'Engineering Supervisor'}
              userRole={userProfile?.role}
              userEmail={userProfile?.email}
              onUpdatePowerNode={handleUpdatePowerNodeShared}
              onCreateEquipment={async (data) => {
                await safeCreateEquipment(data, equipmentList, powerNodes);
              }}
              onModifyEquipment={(eq, updates, audit) =>
                modifyEquipmentWithAudit(eq, updates, audit, {
                  existingEquipment: equipmentList,
                  validPowerNodes: powerNodes
                })
              }
              onInspectUpdateEquipment={async (eq, inspection, audit) => {
                await updateEquipmentInspectionFields(eq, inspection, audit);
                if (typeof inspection.loadCurrentAmps === 'number' && !Number.isNaN(inspection.loadCurrentAmps)) {
                  await recordElectricalMeasurement({
                    assetId: eq.id,
                    assetKind: 'EQUIPMENT',
                    assetCode: eq.code,
                    measurementType: 'CURRENT',
                    phase: '3PH_AVG',
                    unit: 'A',
                    source: 'MEASURED',
                    values: { currentAmps: inspection.loadCurrentAmps },
                    timestamp: new Date().toISOString(),
                    recordedBy: audit.inspectedBy,
                    recordedByUid: currentUser.uid,
                    notes: audit.reason
                  });
                }
              }}
              onDeleteEquipment={(eq) => safeDeleteEquipmentWithCheck(eq, jobCards)}
              onCreatePowerConnection={handleCreatePowerConnectionShared}
              onDeletePowerConnection={deletePowerConnectionWithAudit}
              onRecordElectricalMeasurement={async (input) => {
                await recordElectricalMeasurement({
                  ...input,
                  recordedByUid: currentUser.uid
                });
              }}
              onNewJobCardForEquipment={handleNewJobCardForEquipment}
              electricalInspections={electricalInspections}
              electricalInspectionReviews={electricalInspectionReviews}
              inspectionTemplates={inspectionTemplates}
              onSubmitElectricalInspection={handleSubmitElectricalInspectionShared}
              onSubmitInspectionReview={handleSubmitInspectionReviewShared}
              onSaveInspectionTemplate={handleSaveInspectionTemplateShared}
              onRaiseJobCardFromInspection={handleRaiseJobCardFromInspection}
              onSelectJobCard={(card) => setSelectedCardForDetail(card)}
              onOpenElectricalDistribution={handleOpenElectricalModule}
              searchQuery={searchQuery}
            />
          )}

          {/* VIEW: ELECTRICAL DISTRIBUTION MODULE (SLD, Inspections & Load Monitoring) */}
          {currentView === 'electrical' && (
            <ElectricalDistributionView
              powerNodes={powerNodes}
              powerConnections={powerConnections}
              electricalMeasurements={electricalMeasurements}
              equipmentList={equipmentList}
              jobCards={jobCards}
              currentUserName={userProfile?.displayName || 'Engineering Supervisor'}
              userRole={userProfile?.role}
              userEmail={userProfile?.email}
              activeSubModule={electricalSubModule}
              onSubModuleChange={setElectricalSubModule}
              initialSelectedPanel={electricalTargetPanel}
              onOpenEquipmentRegistry={() => setCurrentView('equipment')}
              onUpdatePowerNode={handleUpdatePowerNodeShared}
              onCreateEquipment={async (data) => {
                await safeCreateEquipment(data, equipmentList, powerNodes);
              }}
              onModifyEquipment={(eq, updates, audit) =>
                modifyEquipmentWithAudit(eq, updates, audit, {
                  existingEquipment: equipmentList,
                  validPowerNodes: powerNodes
                })
              }
              onInspectUpdateEquipment={async (eq, inspection, audit) => {
                await updateEquipmentInspectionFields(eq, inspection, audit);
                if (typeof inspection.loadCurrentAmps === 'number' && !Number.isNaN(inspection.loadCurrentAmps)) {
                  await recordElectricalMeasurement({
                    assetId: eq.id,
                    assetKind: 'EQUIPMENT',
                    assetCode: eq.code,
                    measurementType: 'CURRENT',
                    phase: '3PH_AVG',
                    unit: 'A',
                    source: 'MEASURED',
                    values: { currentAmps: inspection.loadCurrentAmps },
                    timestamp: new Date().toISOString(),
                    recordedBy: audit.inspectedBy,
                    recordedByUid: currentUser.uid,
                    notes: audit.reason
                  });
                }
              }}
              onDeleteEquipment={(eq) => safeDeleteEquipmentWithCheck(eq, jobCards)}
              onCreatePowerConnection={handleCreatePowerConnectionShared}
              onDeletePowerConnection={deletePowerConnectionWithAudit}
              onRecordElectricalMeasurement={async (input) => {
                await recordElectricalMeasurement({
                  ...input,
                  recordedByUid: currentUser.uid
                });
              }}
              onNewJobCardForEquipment={handleNewJobCardForEquipment}
              onSelectJobCard={(card) => setSelectedCardForDetail(card)}
              electricalInspections={electricalInspections}
              electricalInspectionReviews={electricalInspectionReviews}
              inspectionTemplates={inspectionTemplates}
              onSubmitElectricalInspection={handleSubmitElectricalInspectionShared}
              onSubmitInspectionReview={handleSubmitInspectionReviewShared}
              onSaveInspectionTemplate={handleSaveInspectionTemplateShared}
              onRaiseJobCardFromInspection={handleRaiseJobCardFromInspection}
              globalSearchQuery={searchQuery}
            />
          )}

          {/* VIEW: STORES & SPARES REQUISITIONS (Elliot Mhlongo Stores Desk) */}
          {currentView === 'spares' && (
            <StoresSparesView
              jobCards={jobCards}
              storesSlips={storesSlips}
              onSelectCard={(card) => setSelectedCardForDetail(card)}
              onIssueSparePart={issueSparePart}
              onCreateStoresSlip={async (data) => {
                await createStoresSlip(data, { currentUser: userProfile?.displayName });
              }}
              onVerifyStoresSlip={async (slip) => {
                await verifyStoresSlipHOD(slip, {
                  verifiedBy: userProfile?.displayName || 'Antonio Miranda (HOD Engineering)'
                });
              }}
              currentUser={userProfile?.displayName || 'Elliot Mhlongo'}
            />
          )}

          {/* VIEW: PHYSICAL PAPER SLIPS ARCHIVE (Red WO Stamp Log) */}
          {currentView === 'slips' && (
            <PhysicalSlipsView
              jobCards={jobCards}
              onSelectCard={(card) => setSelectedCardForDetail(card)}
              onOpenQuickLog={() => setIsQuickLogModalOpen(true)}
              onPrintCard={(card) => setSelectedCardForPrint(card)}
            />
          )}

          {/* VIEW: ORGANOGRAM (Phase 2 Roadmap) */}
          {currentView === 'organogram' && (
            <OrganogramExplorer />
          )}

          {/* VIEW: SETTINGS (Phase 2 Roadmap) */}
          {currentView === 'settings' && (
            <SettingsView jobCards={jobCards} equipmentList={equipmentList} />
          )}

          {/* VIEW: JOB CARDS (CORE WORKSPACE) */}
          {currentView === 'jobcards' && (
            <div className="space-y-4">
              {/* Odoo ERP Control Panel */}
              <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                {/* Left: Primary Action "New", "Log Paper Slip" & Quick Views */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      setSelectedCardForEdit(null);
                      setIsFormModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Job Card</span>
                  </button>

                  {/* 📄 Quick-Log Physical Slip walked in by an operator's assistant */}
                  <button
                    onClick={() => setIsQuickLogModalOpen(true)}
                    className="px-3.5 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer border border-amber-700"
                    title="Quickly record an operator's handwritten requisition slip walked into the office"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Log Paper Slip (WO #)</span>
                  </button>

                  {/* 👥 Standby Crew On-Demand Toggle */}
                  <button
                    onClick={() => setIsStandbyModalOpen(true)}
                    className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition cursor-pointer border border-slate-300"
                    title="View continuous 4-shift crew and weekly on-call standby roster"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-600" />
                    <span>Standby Crew</span>
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
                  {/* Trade Filter */}
                  <select
                    value={selectedTrade}
                    onChange={(e) => setSelectedTrade(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-700 focus:outline-none"
                  >
                    <option value="">All Trades</option>
                    {TECHNICAL_TRADES_LIST.map((t) => (
                      <option key={t.id} value={t.id}>{t.id}</option>
                    ))}
                  </select>

                  {/* Shift Filter */}
                  <select
                    value={selectedShift}
                    onChange={(e) => setSelectedShift(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-700 focus:outline-none font-medium"
                  >
                    <option value="">All Shifts / Rosters</option>
                    {SHIFTS_LIST.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>

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
                    <option value="Emergency">🚨 Emergency Only</option>
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>

                  {(selectedDepartment || selectedPriority || selectedTrade || selectedShift || searchQuery) && (
                    <button
                      onClick={() => {
                        setSelectedDepartment('');
                        setSelectedPriority('');
                        setSelectedTrade('');
                        setSelectedShift('');
                        setSearchQuery('');
                      }}
                      className="text-slate-500 hover:text-slate-800 text-[11px] underline px-1 cursor-pointer font-medium"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Supervisor Inter-Departmental Workflow Queue Selector Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-md p-2.5 text-white shadow-xs flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    Supervisor Routing Queues:
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setDepartmentQueue('ALL')}
                    className={`px-2.5 py-1 rounded font-medium transition cursor-pointer flex items-center gap-1.5 ${
                      departmentQueue === 'ALL'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <span>All Work Orders</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/25">
                      {jobCards.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setDepartmentQueue('INCOMING_ENGINEERING')}
                    className={`px-2.5 py-1 rounded font-medium transition cursor-pointer flex items-center gap-1.5 ${
                      departmentQueue === 'INCOMING_ENGINEERING'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <Inbox className="w-3.5 h-3.5 text-blue-400" />
                    <span>📥 Incoming to Engineering</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${incomingToEngCount > 0 ? 'bg-blue-500 text-white' : 'bg-black/25'}`}>
                      {incomingToEngCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setDepartmentQueue('RAISED_BY_ME')}
                    className={`px-2.5 py-1 rounded font-medium transition cursor-pointer flex items-center gap-1.5 ${
                      departmentQueue === 'RAISED_BY_ME'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    <span>📤 Raised by My Dept</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/25">
                      {raisedByMeCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setDepartmentQueue('PENDING_SPARES')}
                    className={`px-2.5 py-1 rounded font-medium transition cursor-pointer flex items-center gap-1.5 ${
                      departmentQueue === 'PENDING_SPARES'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <PackageCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>📦 Pending Spares (Stores)</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${pendingSparesCountAll > 0 ? 'bg-amber-500 text-slate-950' : 'bg-black/25'}`}>
                      {pendingSparesCountAll}
                    </span>
                  </button>

                  <button
                    onClick={() => setDepartmentQueue('AWAITING_HOD')}
                    className={`px-2.5 py-1 rounded font-medium transition cursor-pointer flex items-center gap-1.5 ${
                      departmentQueue === 'AWAITING_HOD'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>📋 Awaiting HOD Sign-Off</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${awaitingHODCount > 0 ? 'bg-purple-500 text-white animate-pulse' : 'bg-black/25'}`}>
                      {awaitingHODCount}
                    </span>
                  </button>
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
                  jobCards={queueFilteredCards.filter(c => {
                    if (selectedTrade && c.tradeRequired !== selectedTrade) return false;
                    if (selectedShift && c.shiftAssigned !== selectedShift) return false;
                    return true;
                  })}
                  onSelectCard={(card) => setSelectedCardForDetail(card)}
                  onUpdateStatus={handleUpdateStatus}
                  selectedDepartment={selectedDepartment}
                  selectedPriority={selectedPriority}
                  searchQuery={searchQuery}
                />
              ) : (
                <JobCardListView
                  jobCards={queueFilteredCards.filter(c => {
                    if (selectedTrade && c.tradeRequired !== selectedTrade) return false;
                    if (selectedShift && c.shiftAssigned !== selectedShift) return false;
                    return true;
                  })}
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
          setJobCardPrefill(null);
        }}
        onSubmit={handleCreateOrUpdateJobCard}
        existingCard={selectedCardForEdit}
        prefillData={jobCardPrefill}
        existingCards={jobCards}
        equipmentList={equipmentList}
      />

      {/* 2. Job Card Detail / Labor Log / Shift Handover / Chatter / Supervisor & HOD Workflow Modal */}
      <JobCardDetailModal
        card={selectedCardForDetail}
        isOpen={Boolean(selectedCardForDetail)}
        onClose={() => setSelectedCardForDetail(null)}
        onEdit={handleOpenEditFromDetail}
        onDelete={handleDeleteJobCard}
        onUpdateStatus={handleUpdateStatus}
        onAddLabor={handleAddLabor}
        onAddComment={handleAddComment}
        onAddHandover={handleAddHandover}
        onPrint={(card) => {
          setSelectedCardForDetail(null);
          setSelectedCardForPrint(card);
        }}
        onAcceptRequisition={acceptAndAssignRequisition}
        onAddSparePart={addSparePartRequisition}
        onIssueSparePart={issueSparePart}
        onRecordHandback={recordArtisanHandback}
        onHODCloseOut={closeOutJobCardHOD}
      />

      {/* 3. Physical Work Order Sheet Modal (Print view matching real slip) */}
      <PrintWorkOrderModal
        card={selectedCardForPrint}
        isOpen={Boolean(selectedCardForPrint)}
        onClose={() => setSelectedCardForPrint(null)}
      />

      {/* 3b. Quick Log Physical Slip Modal (Paper Requisition Book Intake) */}
      <QuickLogPhysicalSlipModal
        isOpen={isQuickLogModalOpen}
        onClose={() => setIsQuickLogModalOpen(false)}
        onSubmit={handleCreateOrUpdateJobCard}
        equipmentList={equipmentList}
        existingCardsCount={jobCards.length}
      />

      {/* 4. Login & Staff Role Switcher Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* 5. Standby & Shift Crew On-Demand Modal */}
      {isStandbyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-2xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#714B67]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Great Usuthu Plant • Operational Crew & Standby Roster
                </h3>
              </div>
              <button
                onClick={() => setIsStandbyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded bg-purple-50/60 border border-purple-100 space-y-1.5">
                <span className="font-bold text-[#714B67] block">Continuous 4-Shift Breakdown Artisans:</span>
                <div className="text-slate-700 space-y-1 text-[11px]">
                  <div><strong>Shift A:</strong> Phumelele Maseko & Sonboy Mngomethulu</div>
                  <div><strong>Shift B:</strong> Nkosnathi Nkhambule & Lwazi Ntjakala</div>
                  <div><strong>Shift C:</strong> Dwyane Littler & Mandla Dlamini</div>
                  <div><strong>Shift D:</strong> Sifiso Nyawo & Bhanyaza Gamedze</div>
                </div>
              </div>

              <div className="p-3 rounded bg-amber-50/70 border border-amber-200 space-y-1.5">
                <span className="font-bold text-amber-900 block flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
                  Weekly On-Call Standby (Wed-to-Wed):
                </span>
                <div className="text-slate-800 space-y-1 text-[11px]">
                  <div>⚡ <strong>Electrician:</strong> Msebenzi Gamedze (Bongani Sup)</div>
                  <div>🛠️ <strong>Boilermaker:</strong> John Khoza (Sam Sup)</div>
                  <div>🔥 <strong>Welder:</strong> Makhosi Mbhamali (Sam Sup)</div>
                  <div>🎨 <strong>Painting / Support:</strong> 3 Painters + 5 Helpers (Day)</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsStandbyModalOpen(false)}
                className="px-4 py-1.5 rounded bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 cursor-pointer"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}
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
