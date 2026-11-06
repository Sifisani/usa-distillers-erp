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

  // Asset Lineage & Engineering Revision Log
  modificationHistory?: EquipmentModificationLog[];

  createdAt: string;
  updatedAt: string;
}

export interface EquipmentModificationLog {
  id: string;
  timestamp: string;
  modifiedBy: string;
  changeType: 'UPGRADE' | 'SWAP' | 'RELOCATION' | 'RENAME' | 'DECOMMISSION' | 'SPECS_UPDATE';
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
