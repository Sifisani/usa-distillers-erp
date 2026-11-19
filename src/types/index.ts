export type Priority = 'Low' | 'Medium' | 'High' | 'Emergency';

export type JobCardStatus = 'Draft' | 'In Progress' | 'Pending Spares' | 'Completed' | 'Cancelled';

export type EquipmentStatus = 'Operational' | 'Under Maintenance' | 'Standby' | 'Decommissioned';

export type Criticality = 'Low' | 'Medium' | 'High' | 'Critical';

export type TechnicalTrade =
  | 'Mechanical Fitter'
  | 'Rigger'
  | 'Electrician'
  | 'Boilermaker'
  | 'Welder'
  | 'Painter'
  | 'General Assistant'
  | 'Boiler Operator'
  | 'Boiler Assistant'
  | 'Water Treatment Operator'
  | 'Distillation Operator'
  | 'Fermentation Operator'
  | 'General Maintenance';

export type ShiftGroup =
  | 'Shift A'
  | 'Shift B'
  | 'Shift C'
  | 'Shift D'
  | 'Day Shift'
  | 'Standby Callout';

export type StarterType = 'DOL' | 'Y/D' | 'VSD' | 'SOFT STARTER' | 'OTHER';

export type PlantArea =
  | 'Boiler 1'
  | 'Boiler 2'
  | 'Boiler 3'
  | 'Universal'
  | 'Water Treatment'
  | 'Distillation'
  | 'Fermentation'
  | 'Cooling Towers'
  | 'Distillation Fans'
  | 'Fermentation/Turbine Fans'
  | 'Green Tank'
  | 'CMS/Molasses Tank'
  | 'Molasses Offloading Bay'
  | 'Molasses Dam 1';

export interface LaborLog {
  id: string;
  technician: string;
  date: string;
  hours: number;
  taskNotes: string;
  loggedAt: string;
  trade?: TechnicalTrade;
  rateType?: 'Standard' | 'Shift' | 'Standby Callout' | 'Overtime';
  shift?: ShiftGroup;
}

export interface ShiftHandoverLog {
  id: string;
  timestamp: string;
  fromShift: ShiftGroup;
  toShift: ShiftGroup;
  handedOverBy: string;
  handedOverTo: string;
  tasksCompleted: string;
  pendingTasks: string;
  hazardsOrIsolations?: string;
}

export interface SafetyPermits {
  lotoRequired: boolean;
  lotoTag?: string;
  lotoSignedBy?: string;
  lotoSignedAt?: string;
  hotWorkRequired: boolean;
  hotWorkSignedBy?: string;
  hotWorkSignedAt?: string;
  confinedSpaceRequired: boolean;
  heightPermitRequired: boolean;
}

export interface ActivityComment {
  id: string;
  author: string;
  authorEmail?: string;
  message: string;
  timestamp: string;
  type: 'comment' | 'status_change' | 'labor_logged' | 'system' | 'handover';
}

export interface JobCard {
  id: string;
  jobCardNumber: string;
  department: string;
  departmentCategory: string;
  equipmentName: string;
  equipmentId?: string;
  equipmentCode?: string;
  electricalFeeder?: string;
  inspectionId?: string;
  inspectionReference?: string;
  priority: Priority;
  status: JobCardStatus;
  description: string;
  assignedTo: string;
  targetDate: string;
  totalLaborHours: number;
  laborLogs: LaborLog[];
  comments: ActivityComment[];
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;

  // Real plant operations extensions
  tradeRequired?: TechnicalTrade;
  shiftAssigned?: ShiftGroup;
  standbyTechnician?: string;
  safetyPermits?: SafetyPermits;
  shiftHandovers?: ShiftHandoverLog[];
  equipmentSpecs?: {
    speedRpm?: number;
    powerKw?: number;
    ratedCurrentAmps?: number;
    loadCurrentAmps?: number;
    overloadAmps?: number;
    starterType?: StarterType;
    plantArea?: PlantArea;
  };

  // Official Works Requisition fields (from physical slip WO #188499)
  workOrderNumber?: string;
  requisitionType?: 'Normal' | 'Call Out' | 'Stop Day';
  costCenter?: string;
  dangerTagRequired?: boolean;
  dangerTagNumber?: string;
  recipientDepartment?: string;
  originatingDepartment?: string;
  originatedBy?: string;
  originatedTime?: string;
  originatedSignature?: string;
  physicalSlipLogged?: boolean;

  // Supervisor & Manager Workflow
  requisitionStage?: RequisitionStage;
  assignedSupervisor?: string;
  acceptedAt?: string;
  acceptedBy?: string;
  completedByArtisan?: string;
  artisanSignature?: string;
  artisanHandbackNotes?: string;
  completionDate?: string;
  completionTime?: string;
  completionHours?: number;
  sparesRequested?: SparePartItem[];
  hodSignedBy?: string;
  hodDigitalSignOff?: {
    signedBy: string;
    signedAt: string;
    notes?: string;
  };
  qcSignedBy?: string;
}

export type RequisitionStage =
  | 'Pending Acceptance'
  | 'Accepted'
  | 'In Progress'
  | 'Pending Spares'
  | 'Artisan Completed'
  | 'HOD Closed'
  | 'Cancelled';

export interface SparePartItem {
  id: string;
  partDescription: string;
  quantity: number;
  partNumber?: string;
  storeVoucherNumber?: string;
  requisitionSlipNumber?: string;
  costCenter?: string;
  teamBook?: string;
  requestedBy: string;
  requestedAt: string;
  issuedBy?: string;
  issuedAt?: string;
  status: 'Requested' | 'Issued' | 'Out of Stock';
  unitCostEmalangeni?: number;
}

export interface StoresSlipItem {
  id: string;
  quantity: number;
  description: string;
  partNumber?: string;
  unitCostEmalangeni?: number;
}

export type MaintenanceBookType =
  | 'Mechanical'
  | 'Electrical'
  | 'Boilers'
  | 'Instrumentation'
  | 'General';

export interface StoresRequisitionSlip {
  id: string;
  slipNumber: string; // e.g. "302857" (pre-printed red serial number)
  bookType: MaintenanceBookType;
  date: string;
  jobCardId?: string;
  jobCardNumber: string;
  workOrderNumber?: string;
  equipmentName: string;
  department: string;
  costCenter: string;
  requestedByArtisan: string;
  issuerSignature: string; // Storeman / Elliot Mhlongo
  receivedBySignature: string; // Artisan
  items: StoresSlipItem[];
  status: 'Issued' | 'Pending Verification' | 'Verified' | 'Cancelled';
  hodVerification?: {
    verified: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
    notes?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DailyPlantReport {
  id: string;
  reportDate: string;
  reportedBy: string;
  createdAt: string;
  updatedAt: string;
  status: 'Draft' | 'Submitted' | 'Verified';

  // Section 1: Water Plant
  waterPlant: {
    rawWtrTds: number;
    waterIn: number;
    waterOut: number;
    waterInNp: number;
    waterOutNp: number;
    stTankLevel: number;
    fermTankLevel: number;
    softHard: number;
    roTankLevel: number;
    dam1Ph: number;
    hotwellTemp: number;
  };

  // Section 2: Water Consumption
  waterConsumption: {
    bleedOffDist: number;
    bleedOffEvaps: number;
    bleedOffFerm: number;
    roPlant: number;
    coolingTower: number;
    hWell: number;
    distCt: number;
    evapsCt: number;
    fermTaCt: number;
    mahlabaneni24h: number;
    fermentation24h: number;
    community: number;
    bCry: number;
    blrPot: number;
    usa: number;
  };

  // Section 3: Steam Usage & Coal
  steamUsage: {
    boiler1Steam: number;
    boiler1Tds: number;
    boiler2Steam: number;
    boiler2Tds: number;
    boiler3Steam: number;
    boiler3Tds: number;
    totalSteam: number;
  };

  coal: {
    stockTonnes: number;
    daysRemaining: number;
    deliveredTonnes: number;
    usedTonnes: number;
    weLoads: number;
  };

  sootblowing: {
    boiler1: number;
    boiler2: number;
    boiler3: number;
  };

  // Section 4: Cooling Towers
  coolingTowers: {
    limits: { hardness: string; tds: string; ph: string; alk: string; chlor: string };
    dist: { hardness: number; tds: number; ph: number; alk: number; chlor: number };
    fermTa: { hardness: number; tds: number; ph: number; alk: number; chlor: number };
    ro: { hardness: number; tds: number; ph: number; alk: number; chlor: number };
    temps: {
      no1In: number; no1Out: number; no1Delta: number;
      no2EvIn: number; no2EvOut: number; no2EvDelta: number;
      no2FerIn: number; no2FerOut: number; no2FerDelta: number;
      no3In: number; no3Out: number; no3Delta: number;
    };
  };

  // Section 5: Fermentation & Chemicals
  fermentation: {
    fvTransferring: string;
    fvAlcoholPct: number;
    noFermentersTrans: number;
    beerAgeHours: number;
  };

  chemicals: {
    h3598Dist: number; h3598Ferm: number; h3598Evaps: number;
    h3300Dist: string; h3300Ferm: string;
    h3341Dist: string; h3341Ferm: string;
    h3533ADist: string; h3533AFerm: string;
  };

  // Section 6: Molasses Inventory & Balance
  molasses: {
    aveTempC: number;
    molassesTanksTonnes: number;
    molassesGreenTankTonnes: number;
    molassesDamTonnes: number;
    aquaDamsTonnes: number;
    cmsTankTonnes: number;
    stockMillTonnes: number;
    producedTonnes: number;
    molassesLoads: number;
    molRelNotes: number;
    loadsExMill: number;
    tonnesExMill: number;
    loadsExSa: number;
    tonnesExSa: number;
    loadsExSaWedsThurs: number;
    loadsExSaToDate: number;
    totalReceivedTonnes: number;
    molassesOnSiteTonnes: number;
  };

  // Section 7: Distillation & Alcohol Tanks
  distillation: {
    totalWashBeerFeedLitres: number;
    indStorageLitres: number;
    indIncreaseLitres: number;
    wcAlcFeed: number;
    wcWtrFeed: number;
    potProductionLitres: number;
    totalProductionLitres: number;
    lgFeedRateLhr: number;
    lgTanksLitres: number;
    lgProductionLitres: number;
    beerColumnDays: string;
    lowGradeALitres: number;
    rumStockLitres: number;
    rumProductionLitres: number;
    toppingMeter: string;
  };

  alcoholTanks: {
    storage1: number;
    storage2: number;
    storage3: number;
    day1: number;
    day2: number;
    day3: number;
    day4: number;
    day5: number;
    day6: number;
    day7: number;
    day8: number;
    day9: number;
    rum1: number;
    rum2: number;
    day12: number;
    day13: number;
    totalAlcoholLitres: number;
  };

  dieselYeast: {
    dieselLitres: number;
    yeastKg: number;
  };
}

export interface Equipment {
  id: string;
  code: string;
  name: string;
  department: string;
  location: string;
  status: EquipmentStatus;
  criticality: Criticality;
  lastServiceDate?: string;
  nextServiceDate?: string;
  activeJobCardsCount?: number;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  notes?: string;

  // Technical & electrical plant checklist fields
  speedRpm?: number;
  powerKw?: number;
  ratedCurrentAmps?: number;
  loadCurrentAmps?: number;
  overloadAmps?: number;
  starterType?: StarterType;
  plantArea?: PlantArea;

  // Power Distribution Single-Line Diagram (SLD) mapping
  feederNodeId?: string;
  feederPanel?: FeederPanelId | string;
  transformerSource?: TransformerSource;
  feederBreaker?: string;

  // Task 4: Load Classification & Measured Inspection Metadata
  loadMeasurementSource?: LoadDataSource;
  loadMeasuredAt?: string;
  measuredPowerFactor?: number;

  // Asset Lineage & Engineering Revision Log
  modificationHistory?: EquipmentModificationLog[];

  createdAt: string;
  updatedAt: string;
}

export type LoadDataSource = 'NAMEPLATE' | 'MEASURED' | 'METERED' | 'ESTIMATED';

export type MeasurementPhase =
  | '3PH_TOTAL'
  | '3PH_AVG'
  | 'L1'
  | 'L2'
  | 'L3'
  | 'L1_L2'
  | 'L2_L3'
  | 'L3_L1';

export type ElectricalMeasurementType =
  | 'CURRENT'
  | 'VOLTAGE'
  | 'POWER'
  | 'POWER_FACTOR'
  | 'FREQUENCY'
  | 'ENERGY'
  | 'COMPREHENSIVE_PANEL';

export interface ElectricalMeasurementValues {
  currentAmps?: number;
  currentL1Amps?: number;
  currentL2Amps?: number;
  currentL3Amps?: number;
  voltageV?: number;
  voltageL1L2V?: number;
  voltageL2L3V?: number;
  voltageL3L1V?: number;
  activePowerKw?: number;
  apparentPowerKva?: number;
  reactivePowerKvar?: number;
  powerFactor?: number;
  frequencyHz?: number;
  energyKwh?: number;
}

export interface ElectricalMeasurement {
  id: string;
  assetId: string;
  assetKind: 'POWER_NODE' | 'EQUIPMENT';
  assetCode?: string;
  measurementType: ElectricalMeasurementType;
  phase: MeasurementPhase;
  unit: string;
  source: 'MEASURED' | 'METERED';
  values: ElectricalMeasurementValues;
  timestamp: string;
  recordedBy: string;
  recordedByUid: string;
  notes?: string;
  createdAt: string;
}

export interface ElectricalAlertThresholds {
  transformerHighLoadPct: number;
  transformerCriticalLoadPct: number;
  breakerWarningPct: number;
  breakerCriticalPct: number;
  phaseImbalanceWarnPct: number;
  voltageDeviationWarnPct: number;
  voltageDeviationCriticalPct: number;
  minPowerFactorWarn: number;
}

export type MaintenanceCondition =
  | 'HEALTHY'
  | 'ATTENTION_REQUIRED'
  | 'FAULT_DETECTED'
  | 'UNDER_MAINTENANCE'
  | 'ISOLATED'
  | 'DECOMMISSIONED'
  | 'NOT_INSPECTED';

export type InspectionAssetCategory =
  | 'CIRCUIT_BREAKER'
  | 'TRANSFORMER'
  | 'MOTOR'
  | 'MCC_DB';

export type InspectionChecklistResult = 'PASS' | 'ATTENTION' | 'FAIL' | 'NA';

export interface InspectionChecklistItemSpec {
  id: string;
  label: string;
  guidance?: string;
  required: boolean;
  defaultPriorityOnFail?: Priority;
}

export interface InspectionTemplate {
  id: InspectionAssetCategory;
  category: InspectionAssetCategory;
  title: string;
  description: string;
  version: number;
  items: InspectionChecklistItemSpec[];
  updatedBy?: string;
  updatedByUid?: string;
  updatedAt?: string;
}

export interface InspectionChecklistResponse {
  itemId: string;
  label: string;
  result: InspectionChecklistResult;
  notes?: string;
}

export interface InspectionPhotoAttachment {
  id: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  dataUrl: string;
  capturedAt: string;
}

export type InspectionReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'ACTION_REQUIRED';

export interface ElectricalInspection {
  id: string;
  inspectionNumber: string;
  assetId: string;
  assetKind: 'POWER_NODE' | 'EQUIPMENT';
  assetCode: string;
  assetName: string;
  assetCategory: InspectionAssetCategory;
  plantArea: string;
  electricalFeeder: string;
  conditionAssessment: MaintenanceCondition;
  operatingStateSnapshot?: string;
  templateId: InspectionAssetCategory;
  templateVersion: number;
  checklistResults: InspectionChecklistResponse[];
  measurements?: ElectricalMeasurementValues;
  measurementSource?: 'MEASURED' | 'METERED';
  insulationResistanceMohm?: number;
  windingTempC?: number;
  ambientTempC?: number;
  observations: string;
  photos: InspectionPhotoAttachment[];
  recommendations: string;
  followUpRequired: boolean;
  followUpAction?: string;
  recommendedPriority?: Priority;
  technicianId: string;
  technicianName: string;
  technicianRole: UserProfile['role'];
  inspectedAt: string;
  createdAt: string;
  correctsInspectionId?: string;
  amendmentReason?: string;
  idempotencyKey?: string;
}

export interface ElectricalInspectionReview {
  id: string;
  inspectionId: string;
  assetId: string;
  decision: Exclude<InspectionReviewStatus, 'PENDING_REVIEW'>;
  reviewNotes: string;
  reviewerUid: string;
  reviewerName: string;
  reviewerRole: UserProfile['role'];
  reviewedAt: string;
  createdAt: string;
}

export interface ElectricalJobCardPrefill {
  equipmentId?: string;
  equipmentCode?: string;
  equipmentName: string;
  department?: string;
  departmentCategory?: string;
  plantArea?: string;
  electricalFeeder?: string;
  description: string;
  priority: Priority;
  inspectionId?: string;
  inspectionReference?: string;
  dangerTagRequired?: boolean;
  dangerTagNumber?: string;
  equipmentSpecs?: JobCard['equipmentSpecs'];
}

export type TransformerSource = 'Tx1' | 'Tx2' | 'Tx3';

export type FeederPanelId =
  | 'MCC 1'
  | 'Boiler 2'
  | 'MCC 4'
  | 'MCC 2'
  | 'Old Water Treatment Plant'
  | 'Batch Plant'
  | 'Dam 1 (slops)'
  | 'Boiler 1'
  | 'MCC 3'
  | 'Sub DB1 Compressors'
  | 'Boiler 3'
  | 'New Water Treatment Plant';

export type PowerNodeCategory =
  | 'SOURCE'
  | 'STEP_UP_TX'
  | 'METERING_TX'
  | 'BUSBAR'
  | 'HV_FUSE'
  | 'TRANSFORMER'
  | 'BREAKER'
  | 'CONTROL_CENTRE';

export type BreakerType =
  | 'VCB'
  | 'ACB'
  | 'MCCB'
  | 'MCB'
  | 'Fused Switch-Disconnector'
  | 'Unrecorded';

export type BreakerOperatingState = 'CLOSED' | 'OPEN' | 'TRIPPED' | 'DECOMMISSIONED';

export type PowerVoltageTier = '11kV' | '6.3kV' | '400V' | '415V' | '420V';

export type EnergizationStatus =
  | 'ENERGIZED'
  | 'DE_ENERGIZED'
  | 'DECOMMISSIONED'
  | 'FAULT_BACKFEED';

export type PowerEdgeRole =
  | 'PRIMARY_FEED'
  | 'SUB_FEED'
  | 'STANDBY_FEED'
  | 'INTERLOCK_TIE';

export type MappingConfidence =
  | 'EXPLICIT'
  | 'AREA_RULE'
  | 'NAME_HEURISTIC'
  | 'UNASSIGNED';

export interface PowerEdgeSpec {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  voltageTier: PowerVoltageTier;
  edgeRole: PowerEdgeRole;
  /** Nodes that must be CLOSED for power to conduct across this edge */
  gatedByNodeIds?: string[];
  label?: string;
}

export interface ElectricalTerminalSpec {
  id: string;
  label: string;
  side: 'top' | 'bottom' | 'left' | 'right';
  voltageTier: PowerVoltageTier;
}

export interface PowerConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
  voltageTier: PowerVoltageTier;
  edgeRole: PowerEdgeRole;
  label?: string;
  isAuthoritative?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  modificationHistory?: EquipmentModificationLog[];
}

export interface LogicalMccGroup {
  id: string;
  panelId: FeederPanelId;
  groupType: 'MCC' | 'DB';
  incomingBreakerId: string;
  internalBusbarId: string;
  internalBusbarLabel: string;
  nominalVoltage: string;
  busbarRatedAmps?: number;
}

export interface PowerDistributionNode {
  id: string;
  code: string;
  name: string;
  category: PowerNodeCategory;
  groupSection: 'OLD_TURBINE' | 'EEC_SUPPLY' | 'NEW_TURBINE' | 'HV_BUS' | 'TX1' | 'TX2' | 'TX3';
  transformerSource?: TransformerSource | 'HV_11KV';
  parentNodeId?: string;
  sourceNodeIds?: string[];
  feederPanelId?: FeederPanelId;
  nominalVoltageV?: number;
  version?: number;
  terminals?: ElectricalTerminalSpec[];

  // Circuit breaker & switchgear attributes (editable)
  brand: string;
  model: string;
  breakerType: BreakerType;
  frameSize?: string;
  ratedAmps: number | null;
  tripSettingAmps?: number | null;
  measuredLoadAmps?: number | null;
  measuredLoadSource?: 'MEASURED' | 'METERED';
  measuredLoadUpdatedAt?: string;
  operatingState: BreakerOperatingState;

  // Electrical ratings (sources, transformers, busbars)
  voltage: string;
  kva?: number;
  powerMw?: number;
  primaryAmps?: number;
  secondaryAmps?: number;
  frequencyHz?: number;

  // Safety & Interlock Watchdog
  interlockStatus: 'INTERLOCKED' | 'NONE_HAZARD' | 'NOT_APPLICABLE';
  interlockPartnerId?: string;
  interlockHazardNote?: string;
  lotoIsolationProcedure: string;

  location: string;
  description: string;
  notes?: string;
  modificationHistory?: EquipmentModificationLog[];
  updatedAt?: string;
  updatedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface ElectricalFeederNodeMeta {
  id: FeederPanelId;
  name: string;
  code: string;
  breakerId: string;
  breakerCode: string;
  breakerSpecs: string;
  transformerSource: TransformerSource;
  voltage: string;
  upstreamBreaker: string;
  location: string;
  description: string;
  lotoIsolationProcedure: string;
}

export interface EquipmentModificationLog {
  id: string;
  timestamp: string;
  modifiedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  changeType: 'UPGRADE' | 'SWAP' | 'RELOCATION' | 'RENAME' | 'DECOMMISSION' | 'SPECS_UPDATE' | 'INSPECTION';
  summary: string;
  reason: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  department: string;
  role: 'Admin' | 'Supervisor' | 'Technician' | 'Operator' | 'Manager';
  title?: string;
  staffId?: string;
  level?: string;
  avatarColor?: string;
}

export * from '../core/master-data/organization';

export interface DepartmentGroup {
  category: string;
  departments: string[];
}

export const DEPARTMENTS_BY_CATEGORY: DepartmentGroup[] = [
  {
    category: 'Utilities',
    departments: ['Water Treatment', 'Boiler House', 'Turbine Power Plant', 'Effluent Plant']
  },
  {
    category: 'Production',
    departments: ['Fermentation Bay', 'Distillation Columns', 'Mash & Grain Milling', 'Barrel Aging & Storage']
  },
  {
    category: 'Engineering',
    departments: ['Mechanical Maintenance', 'Electrical & Instrumentation', 'General Plant Maintenance', 'Automation & PLC']
  },
  {
    category: 'Transport Workshop',
    departments: ['Heavy Haulage Fleet', 'Forklift Maintenance', 'Utility Vehicles']
  },
  {
    category: 'Logistics',
    departments: ['Raw Material Receiving', 'Finished Goods Dispatch', 'Cask Yard']
  },
  {
    category: 'Safety',
    departments: ['HSE & Fire Suppression', 'Environmental Compliance', 'Occupational Health']
  },
  {
    category: 'Civils',
    departments: ['Facilities & Grounds', 'Building Maintenance', 'Drainage & Pavements']
  },
  {
    category: 'Administration',
    departments: ['Plant Operations HQ', 'Finance & Procurement', 'HR & Training']
  },
  {
    category: 'Stores',
    departments: ['Engineering Spares Warehouse', 'Lubricants & Chemical Store', 'Consumables Depot']
  },
  {
    category: 'Security',
    departments: ['Perimeter & Gatehouse', 'CCTV & Access Control', 'Patrol Operations']
  }
];

export const ALL_DEPARTMENTS = DEPARTMENTS_BY_CATEGORY.flatMap(group => 
  group.departments.map(dept => `${group.category} - ${dept}`)
);
