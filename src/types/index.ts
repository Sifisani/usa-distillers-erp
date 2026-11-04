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

  createdAt: string;
  updatedAt: string;
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
