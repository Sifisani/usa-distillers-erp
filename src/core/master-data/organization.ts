/**
 * USA Distillers ERP - Master Organization & Leadership Roster
 * 
 * Formal company organogram defining executive governance, department managers,
 * and plant operations supervisors.
 */

import { TechnicalTrade, ShiftGroup } from '../../types';

export type OrgLevel =
  | 'Chairman'
  | 'Managing Director'
  | 'Director'
  | 'Manager'
  | 'Assistant Manager'
  | 'Supervisor'
  | 'Artisan'
  | 'Operator'
  | 'Assistant';

export interface StaffMember {
  id: string;
  name: string;
  title: string;
  department: string;
  departmentCategory: string;
  reportsToId?: string;
  reportsToName?: string;
  level: OrgLevel;
  role: 'Admin' | 'Manager' | 'Supervisor' | 'Technician' | 'Operator';
  email: string;
  avatarColor: string;
  responsibilities: string[];
  trade?: TechnicalTrade;
  shift?: ShiftGroup;
  isStandbyEligible?: boolean;
}

export const COMPANY_ORGANOGRAM: StaffMember[] = [
  // Executive Leadership
  {
    id: 'staff-joe-caldeira',
    name: 'Joe Caldeira',
    title: 'Group Executive Chairman & Founder',
    department: 'Executive Governance',
    departmentCategory: 'Administration',
    level: 'Chairman',
    role: 'Admin',
    email: 'j.caldeira@usadistillers.com',
    avatarColor: 'bg-amber-700',
    responsibilities: ['Corporate Strategy', 'Capital Allocation', 'Distillery Group Vision', 'Board Oversight']
  },
  {
    id: 'staff-haydn-rencken',
    name: 'Haydn Rencken',
    title: 'Managing Director',
    department: 'Executive Management',
    departmentCategory: 'Administration',
    reportsToId: 'staff-joe-caldeira',
    reportsToName: 'Joe Caldeira',
    level: 'Managing Director',
    role: 'Admin',
    email: 'h.rencken@usadistillers.com',
    avatarColor: 'bg-[#714B67]',
    responsibilities: ['Overall Distillery Operations', 'P&L Accountability', 'Cross-Directorate Execution']
  },

  // Directorate Layer
  {
    id: 'staff-johan-smit',
    name: 'Johan Smit',
    title: 'Operations Director',
    department: 'Plant Operations Directorate',
    departmentCategory: 'Administration',
    reportsToId: 'staff-haydn-rencken',
    reportsToName: 'Haydn Rencken',
    level: 'Director',
    role: 'Admin',
    email: 'j.smit@usadistillers.com',
    avatarColor: 'bg-indigo-700',
    responsibilities: ['Plant Production & Maintenance', 'Asset Reliability (ISO 55001)', 'Distillery Yield & Safety']
  },
  {
    id: 'staff-trevor-stapelberg',
    name: 'Trevor Stapelberg',
    title: 'Commercial Director',
    department: 'Commercial & Sales Directorate',
    departmentCategory: 'Administration',
    reportsToId: 'staff-haydn-rencken',
    reportsToName: 'Haydn Rencken',
    level: 'Director',
    role: 'Manager',
    email: 't.stapelberg@usadistillers.com',
    avatarColor: 'bg-blue-700',
    responsibilities: ['Commercial Strategy', 'Bulk Spirit Off-Take', 'Brand Distribution Contracts']
  },
  {
    id: 'staff-john-creamer',
    name: 'John Creamer',
    title: 'Administrative Director',
    department: 'Corporate Administration & Security',
    departmentCategory: 'Administration',
    reportsToId: 'staff-haydn-rencken',
    reportsToName: 'Haydn Rencken',
    level: 'Director',
    role: 'Admin',
    email: 'j.creamer@usadistillers.com',
    avatarColor: 'bg-slate-700',
    responsibilities: ['Plant Security', 'Legal & Regulatory Compliance', 'Human Capital Management']
  },
  {
    id: 'staff-molly-masuku',
    name: 'Molly Masuku',
    title: 'Finance Director',
    department: 'Finance & Treasury',
    departmentCategory: 'Administration',
    reportsToId: 'staff-haydn-rencken',
    reportsToName: 'Haydn Rencken',
    level: 'Director',
    role: 'Admin',
    email: 'm.masuku@usadistillers.com',
    avatarColor: 'bg-emerald-700',
    responsibilities: ['Capital Expenditure (CapEx)', 'Maintenance Budgeting', 'Stores Spares Auditing']
  },

  // Operations Directorate - Production
  {
    id: 'staff-mncedisi-gama',
    name: 'Mncedisi Gama',
    title: 'Production Manager',
    department: 'Production - Fermentation Bay',
    departmentCategory: 'Production',
    reportsToId: 'staff-johan-smit',
    reportsToName: 'Johan Smit',
    level: 'Manager',
    role: 'Manager',
    email: 'm.gama@usadistillers.com',
    avatarColor: 'bg-orange-600',
    responsibilities: ['Grain Mashing', 'Fermentation Run Quality', 'Pot Still Distillation Cycles']
  },
  {
    id: 'staff-ncamiso-dlamini',
    name: 'Ncamiso Dlamini',
    title: 'Assistant Production Manager',
    department: 'Production - Distillation Columns',
    departmentCategory: 'Production',
    reportsToId: 'staff-mncedisi-gama',
    reportsToName: 'Mncedisi Gama',
    level: 'Assistant Manager',
    role: 'Supervisor',
    email: 'n.dlamini@usadistillers.com',
    avatarColor: 'bg-orange-500',
    responsibilities: ['Stillhouse Shift Scheduling', 'Wash Column Temperature Logs', 'CIP Sanitization']
  },

  // Operations Directorate - Engineering & Maintenance
  {
    id: 'staff-antonio-miranda',
    name: 'Antonio Miranda',
    title: 'Engineering / Maintenance Manager',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-johan-smit',
    reportsToName: 'Johan Smit',
    level: 'Manager',
    role: 'Manager',
    email: 'a.miranda@usadistillers.com',
    avatarColor: 'bg-[#714B67]',
    responsibilities: ['Plant-Wide Preventive Maintenance', 'Job Card Approvals', 'Major Equipment Overhauls']
  },
  {
    id: 'staff-sam-ngubeni',
    name: 'Sam Ngubeni',
    title: 'Maintenance Supervisor',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-antonio-miranda',
    reportsToName: 'Antonio Miranda',
    level: 'Supervisor',
    role: 'Supervisor',
    email: 's.ngubeni@usadistillers.com',
    avatarColor: 'bg-purple-600',
    responsibilities: ['Mechanical Fitter Dispatch', 'Pump & Gearbox Alignment', 'Work Order Execution']
  },
  {
    id: 'staff-john-khoza',
    name: 'John Khoza',
    title: 'Painting Supervisor',
    department: 'Engineering - General Plant Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-antonio-miranda',
    reportsToName: 'Antonio Miranda',
    level: 'Supervisor',
    role: 'Supervisor',
    email: 'j.khoza@usadistillers.com',
    avatarColor: 'bg-purple-500',
    responsibilities: ['Pipe Color Coding Compliance', 'Corrosion Protection', 'Tank Epoxy Coatings']
  },

  // Operations Directorate - Utilities
  {
    id: 'staff-andriese-mhlongo',
    name: 'Andriese Mhlongo',
    title: 'Utilities Manager',
    department: 'Utilities - Boiler House',
    departmentCategory: 'Utilities',
    reportsToId: 'staff-johan-smit',
    reportsToName: 'Johan Smit',
    level: 'Manager',
    role: 'Manager',
    email: 'a.mhlongo@usadistillers.com',
    avatarColor: 'bg-sky-700',
    responsibilities: ['High-Pressure Steam Supply', 'Turbine Co-Gen Efficiency', 'Water Treatment Skid Health']
  },
  {
    id: 'staff-tintile-gule',
    name: 'Tintile Gule',
    title: 'Utilities Supervisor',
    department: 'Utilities - Boiler House',
    departmentCategory: 'Utilities',
    reportsToId: 'staff-andriese-mhlongo',
    reportsToName: 'Andriese Mhlongo',
    level: 'Supervisor',
    role: 'Supervisor',
    email: 't.gule@usadistillers.com',
    avatarColor: 'bg-sky-600',
    responsibilities: ['Boiler Feedwater Chemical Dosing', 'Turbine Bearing Logs', 'Effluent Quality Checks']
  },

  // Operations Directorate - Electrical & Instrumentation
  {
    id: 'staff-thoba-nhleko',
    name: 'Thoba Nhleko',
    title: 'Electrical & Instrumentation Manager',
    department: 'Engineering - Electrical & Instrumentation',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-johan-smit',
    reportsToName: 'Johan Smit',
    level: 'Manager',
    role: 'Manager',
    email: 't.nhleko@usadistillers.com',
    avatarColor: 'bg-teal-700',
    responsibilities: ['PLC & SCADA Automation', 'High Voltage Switchgear', 'Transmitter Calibrations']
  },
  {
    id: 'staff-bongani-dlamini',
    name: 'Bongani Dlamini',
    title: 'Electrical Supervisor',
    department: 'Engineering - Electrical & Instrumentation',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-thoba-nhleko',
    reportsToName: 'Thoba Nhleko',
    level: 'Supervisor',
    role: 'Supervisor',
    email: 'b.dlamini@usadistillers.com',
    avatarColor: 'bg-teal-600',
    responsibilities: ['Motor Control Center (MCC) Maintenance', 'LOTO Electrical Isolation', 'Cable Tray Integrity']
  },
  {
    id: 'staff-stanley-matsenjwa',
    name: 'Stanley Matsenjwa',
    title: 'Instrumentation Supervisor',
    department: 'Engineering - Electrical & Instrumentation',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-thoba-nhleko',
    reportsToName: 'Thoba Nhleko',
    level: 'Supervisor',
    role: 'Supervisor',
    email: 's.matsenjwa@usadistillers.com',
    avatarColor: 'bg-teal-500',
    responsibilities: ['RTD / Thermocouple Tuning', 'Control Valve Positioners', 'Flowmeter Recalibration']
  },

  // Operations Directorate - Civils
  {
    id: 'staff-martin-botha',
    name: 'Martin Botha',
    title: 'Civils Manager',
    department: 'Civils - Facilities & Grounds',
    departmentCategory: 'Civils',
    reportsToId: 'staff-johan-smit',
    reportsToName: 'Johan Smit',
    level: 'Manager',
    role: 'Manager',
    email: 'm.botha@usadistillers.com',
    avatarColor: 'bg-stone-600',
    responsibilities: ['Stillhouse Structural Integrity', 'Plant Pavements & Bund Walls', 'Grounds & Drainage']
  },
  {
    id: 'staff-mandla-mngometulu',
    name: 'Mandla Mngometulu',
    title: 'Civils Supervisor',
    department: 'Civils - Facilities & Grounds',
    departmentCategory: 'Civils',
    reportsToId: 'staff-martin-botha',
    reportsToName: 'Martin Botha',
    level: 'Supervisor',
    role: 'Supervisor',
    email: 'm.mngometulu@usadistillers.com',
    avatarColor: 'bg-stone-500',
    responsibilities: ['Civil Maintenance Crew', 'Concrete Repair & Resurfacing', 'Roof Sealing & Guttering']
  },

  // Operations Directorate - Transport Workshop
  {
    id: 'staff-bert-van-vureen',
    name: 'Bert Van Vureen',
    title: 'Transport Workshop Manager',
    department: 'Transport Workshop - Heavy Haulage Fleet',
    departmentCategory: 'Transport Workshop',
    reportsToId: 'staff-johan-smit',
    reportsToName: 'Johan Smit',
    level: 'Manager',
    role: 'Manager',
    email: 'b.vanvureen@usadistillers.com',
    avatarColor: 'bg-rose-700',
    responsibilities: ['Heavy Grain Haulers', 'Fleet Availability', 'Workshop Job Card Sign-Off']
  },
  {
    id: 'staff-blessing-ngubeni',
    name: 'Blessing Ngubeni',
    title: 'Transport Workshop Supervisor',
    department: 'Transport Workshop - Forklift Maintenance',
    departmentCategory: 'Transport Workshop',
    reportsToId: 'staff-bert-van-vureen',
    reportsToName: 'Bert Van Vureen',
    level: 'Supervisor',
    role: 'Supervisor',
    email: 'b.ngubeni@usadistillers.com',
    avatarColor: 'bg-rose-600',
    responsibilities: ['Electric & Diesel Forklift Servicing', 'Hydraulic Mast Inspections', 'Tyre & Battery Banks']
  },

  // Operations Directorate - Stores & Spares
  {
    id: 'staff-elliot-mhlongo',
    name: 'Elliot Mhlongo',
    title: 'Stores Manager',
    department: 'Stores - Engineering Spares Warehouse',
    departmentCategory: 'Stores',
    reportsToId: 'staff-johan-smit',
    reportsToName: 'Johan Smit',
    level: 'Manager',
    role: 'Manager',
    email: 'e.mhlongo@usadistillers.com',
    avatarColor: 'bg-amber-600',
    responsibilities: ['Mechanical & Electrical Spares Inventory', 'Requisition Approvals', 'Critical Spares Par Levels']
  },
  {
    id: 'staff-phumlile-mamba',
    name: 'Phumlile Mamba',
    title: 'Stores Supervisor',
    department: 'Stores - Engineering Spares Warehouse',
    departmentCategory: 'Stores',
    reportsToId: 'staff-elliot-mhlongo',
    reportsToName: 'Elliot Mhlongo',
    level: 'Supervisor',
    role: 'Supervisor',
    email: 'p.mamba@usadistillers.com',
    avatarColor: 'bg-amber-500',
    responsibilities: ['Bin Location Auditing', 'Parts Issuance to Technicians', 'Goods Received Quality Inspection']
  },

  // Operations Directorate - Logistics & Safety
  {
    id: 'staff-vincent-masuku',
    name: 'Vincent Masuku',
    title: 'Logistics Manager',
    department: 'Logistics - Finished Goods Dispatch',
    departmentCategory: 'Logistics',
    reportsToId: 'staff-johan-smit',
    reportsToName: 'Johan Smit',
    level: 'Manager',
    role: 'Manager',
    email: 'v.masuku@usadistillers.com',
    avatarColor: 'bg-cyan-700',
    responsibilities: ['Cask Yard Movements', 'Matured Bourbon Barrel Storage', 'Finished Goods Dispatch']
  },
  {
    id: 'staff-jason-dlamini',
    name: 'Jason Dlamini',
    title: 'Safety Manager',
    department: 'Safety - HSE & Fire Suppression',
    departmentCategory: 'Safety',
    reportsToId: 'staff-johan-smit',
    reportsToName: 'Johan Smit',
    level: 'Manager',
    role: 'Manager',
    email: 'j.dlamini@usadistillers.com',
    avatarColor: 'bg-red-700',
    responsibilities: ['LOTO Safety Audits', 'Hot Work & Confined Space Permits', 'ATEX Explosive Atmosphere Safety']
  },

  // Administration Directorate - Security
  {
    id: 'staff-smanga-mthembu',
    name: 'Smanga Mthembu',
    title: 'Security Manager',
    department: 'Security - Perimeter & Gatehouse',
    departmentCategory: 'Security',
    reportsToId: 'staff-john-creamer',
    reportsToName: 'John Creamer',
    level: 'Manager',
    role: 'Manager',
    email: 's.mthembu@usadistillers.com',
    avatarColor: 'bg-slate-800',
    responsibilities: ['Plant Perimeter Security', 'Access Control Systems', 'Loss Prevention & CCTV']
  },
  {
    id: 'staff-mlungisi-nhleko',
    name: 'Mlungisi Nhleko',
    title: 'Security Supervisor',
    department: 'Security - Perimeter & Gatehouse',
    departmentCategory: 'Security',
    reportsToId: 'staff-smanga-mthembu',
    reportsToName: 'Smanga Mthembu',
    level: 'Supervisor',
    role: 'Supervisor',
    email: 'm.nhleko@usadistillers.com',
    avatarColor: 'bg-slate-700',
    responsibilities: ['Main Gate Weighbridge', 'Visitor & Contractor Screening', 'Incident Reporting']
  },
  {
    id: 'staff-sphephile-dlamini',
    name: 'Sphephile Dlamini',
    title: 'Security Supervisor',
    department: 'Security - CCTV & Access Control',
    departmentCategory: 'Security',
    reportsToId: 'staff-smanga-mthembu',
    reportsToName: 'Smanga Mthembu',
    level: 'Supervisor',
    role: 'Supervisor',
    email: 's.pdlamini@usadistillers.com',
    avatarColor: 'bg-slate-600',
    responsibilities: ['Control Room Monitoring', 'Patrol Guard Scheduling', 'Barrel Yard Perimeter Alarms']
  },

  // ==========================================
  // TECHNICAL STAFF: ELECTRICAL & INSTRUMENTATION
  // ==========================================
  {
    id: 'staff-msebenzi-gamedze',
    name: 'Msebenzi Gamedze',
    title: 'Plant Electrician (Day & Standby)',
    department: 'Engineering - Electrical & Instrumentation',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-bongani-dlamini',
    reportsToName: 'Bongani Dlamini',
    level: 'Artisan',
    role: 'Technician',
    trade: 'Electrician',
    shift: 'Day Shift',
    isStandbyEligible: true,
    email: 'm.gamedze@usadistillers.com',
    avatarColor: 'bg-teal-600',
    responsibilities: ['MCC Panel Maintenance', 'VSD & Soft Starter Tuning', 'Standby Callout Rotation']
  },
  {
    id: 'staff-scelo-simelane',
    name: 'Scelo Simelane',
    title: 'Plant Electrician (Day & Standby)',
    department: 'Engineering - Electrical & Instrumentation',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-bongani-dlamini',
    reportsToName: 'Bongani Dlamini',
    level: 'Artisan',
    role: 'Technician',
    trade: 'Electrician',
    shift: 'Day Shift',
    isStandbyEligible: true,
    email: 's.simelane@usadistillers.com',
    avatarColor: 'bg-teal-500',
    responsibilities: ['Motor Insulation Testing (Megger)', 'LOTO Isolations', 'Standby Callout Rotation']
  },

  // ==========================================
  // TECHNICAL STAFF: MECHANICAL FITTERS (4 SHIFT CONTINUOUS)
  // ==========================================
  {
    id: 'staff-phumelele-maseko',
    name: 'Phumelele Maseko',
    title: 'Mechanical Fitter (Shift A)',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-sam-ngubeni',
    reportsToName: 'Sam Ngubeni',
    level: 'Artisan',
    role: 'Technician',
    trade: 'Mechanical Fitter',
    shift: 'Shift A',
    email: 'p.maseko@usadistillers.com',
    avatarColor: 'bg-purple-600',
    responsibilities: ['Shift A Mechanical Breakdowns', 'Pump Seal Replacements', 'Gearbox Overhauls']
  },
  {
    id: 'staff-nkosnathi-nkhambule',
    name: 'Nkosnathi Nkhambule',
    title: 'Mechanical Fitter (Shift B)',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-sam-ngubeni',
    reportsToName: 'Sam Ngubeni',
    level: 'Artisan',
    role: 'Technician',
    trade: 'Mechanical Fitter',
    shift: 'Shift B',
    email: 'n.nkhambule@usadistillers.com',
    avatarColor: 'bg-purple-600',
    responsibilities: ['Shift B Mechanical Breakdowns', 'Boiler Stoker Feeders', 'Distillation Pumps Alignment']
  },
  {
    id: 'staff-dwyane-littler',
    name: 'Dwyane Littler',
    title: 'Mechanical Fitter (Shift C)',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-sam-ngubeni',
    reportsToName: 'Sam Ngubeni',
    level: 'Artisan',
    role: 'Technician',
    trade: 'Mechanical Fitter',
    shift: 'Shift C',
    email: 'd.littler@usadistillers.com',
    avatarColor: 'bg-purple-600',
    responsibilities: ['Shift C Mechanical Breakdowns', 'Turbine Auxiliary Pumps', 'Bearing Replacement']
  },
  {
    id: 'staff-nyawo',
    name: 'Sifiso Nyawo',
    title: 'Mechanical Fitter (Shift D)',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-sam-ngubeni',
    reportsToName: 'Sam Ngubeni',
    level: 'Artisan',
    role: 'Technician',
    trade: 'Mechanical Fitter',
    shift: 'Shift D',
    email: 's.nyawo@usadistillers.com',
    avatarColor: 'bg-purple-600',
    responsibilities: ['Shift D Mechanical Breakdowns', 'Compressor Maintenance', 'Fermenter Agitators']
  },

  // ==========================================
  // TECHNICAL STAFF: RIGGERS (4 SHIFT CONTINUOUS)
  // ==========================================
  {
    id: 'staff-sonboy-mngomethulu',
    name: 'Sonboy Mngomethulu',
    title: 'Plant Rigger (Shift A)',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-sam-ngubeni',
    reportsToName: 'Sam Ngubeni',
    level: 'Artisan',
    role: 'Technician',
    trade: 'Rigger',
    shift: 'Shift A',
    email: 's.mngomethulu@usadistillers.com',
    avatarColor: 'bg-indigo-600',
    responsibilities: ['Shift A Heavy Lifting & Rigging', 'Crane & Hoist Inspections', 'Fitter Team Support']
  },
  {
    id: 'staff-lwazi-ntjakala',
    name: 'Lwazi Ntjakala',
    title: 'Plant Rigger (Shift B)',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-sam-ngubeni',
    reportsToName: 'Sam Ngubeni',
    level: 'Artisan',
    role: 'Technician',
    trade: 'Rigger',
    shift: 'Shift B',
    email: 'l.ntjakala@usadistillers.com',
    avatarColor: 'bg-indigo-600',
    responsibilities: ['Shift B Heavy Rigging', 'Sling & Shackle Safety Certifications', 'Motor Extraction']
  },
  {
    id: 'staff-mandla-dlamini-rigger',
    name: 'Mandla Dlamini',
    title: 'Plant Rigger (Shift C)',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-sam-ngubeni',
    reportsToName: 'Sam Ngubeni',
    level: 'Artisan',
    role: 'Technician',
    trade: 'Rigger',
    shift: 'Shift C',
    email: 'm.dlamini.rigger@usadistillers.com',
    avatarColor: 'bg-indigo-600',
    responsibilities: ['Shift C Heavy Rigging', 'Boiler Fan Impeller Lifts', 'Scaffolding Coordination']
  },
  {
    id: 'staff-bhanyaza-gamedze',
    name: 'Bhanyaza Gamedze',
    title: 'Plant Rigger (Shift D)',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-sam-ngubeni',
    reportsToName: 'Sam Ngubeni',
    level: 'Artisan',
    role: 'Technician',
    trade: 'Rigger',
    shift: 'Shift D',
    email: 'b.gamedze@usadistillers.com',
    avatarColor: 'bg-indigo-600',
    responsibilities: ['Shift D Rigging Operations', 'Confined Space Extraction Rigging', 'Lifting Tackle Checks']
  },

  // ==========================================
  // TECHNICAL STAFF: BOILERMAKERS (DAY + STANDBY WED-TO-WED)
  // ==========================================
  {
    id: 'staff-john-khoza-bm',
    name: 'John Khoza (Boilermaker)',
    title: 'Senior Boilermaker (Day & Standby)',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-sam-ngubeni',
    reportsToName: 'Sam Ngubeni',
    level: 'Artisan',
    role: 'Technician',
    trade: 'Boilermaker',
    shift: 'Day Shift',
    isStandbyEligible: true,
    email: 'j.khoza.bm@usadistillers.com',
    avatarColor: 'bg-amber-700',
    responsibilities: ['Boiler Pressure Vessel Shells', 'Steam Line Pipe Fabrication', 'Chute & Ducting Re-lines']
  },
  {
    id: 'staff-patric-mamba',
    name: 'Patric Mamba',
    title: 'Boilermaker (Day & Standby)',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-sam-ngubeni',
    reportsToName: 'Sam Ngubeni',
    level: 'Artisan',
    role: 'Technician',
    trade: 'Boilermaker',
    shift: 'Day Shift',
    isStandbyEligible: true,
    email: 'p.mamba.bm@usadistillers.com',
    avatarColor: 'bg-amber-600',
    responsibilities: ['Ash Conveyor Casing Repair', 'Fermenter Tank Flange Replacements', 'Structural Steel Fabrication']
  },

  // ==========================================
  // TECHNICAL STAFF: WELDERS (DAY + STANDBY WED-TO-WED)
  // ==========================================
  {
    id: 'staff-makhosi-mbhamali',
    name: 'Makhosi Mbhamali',
    title: 'Certified High-Pressure Welder (Day & Standby)',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-sam-ngubeni',
    reportsToName: 'Sam Ngubeni',
    level: 'Artisan',
    role: 'Technician',
    trade: 'Welder',
    shift: 'Day Shift',
    isStandbyEligible: true,
    email: 'm.mbhamali@usadistillers.com',
    avatarColor: 'bg-orange-700',
    responsibilities: ['High Pressure Steam Line TIG/Arc Welding', 'Boiler Tube Patching', 'Hot Work Permit Execution']
  },
  {
    id: 'staff-sfundvo-malichie',
    name: 'Sfundvo Malichie',
    title: 'Plant Welder (Day & Standby)',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-sam-ngubeni',
    reportsToName: 'Sam Ngubeni',
    level: 'Artisan',
    role: 'Technician',
    trade: 'Welder',
    shift: 'Day Shift',
    isStandbyEligible: true,
    email: 's.malichie@usadistillers.com',
    avatarColor: 'bg-orange-600',
    responsibilities: ['Stainless Steel Mash & Beer Piping', 'Distillation Column Flange Welds', 'Structural Welding']
  },

  // ==========================================
  // SURFACE PROTECTION: PAINTERS (DAY 7AM-5PM M-F)
  // ==========================================
  {
    id: 'staff-zwelisha-gina',
    name: 'Zwelisha Gina',
    title: 'Industrial Painter',
    department: 'Engineering - General Plant Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-john-khoza',
    reportsToName: 'John Khoza',
    level: 'Artisan',
    role: 'Technician',
    trade: 'Painter',
    shift: 'Day Shift',
    email: 'z.gina@usadistillers.com',
    avatarColor: 'bg-blue-600',
    responsibilities: ['Pipe Color Coding Standard Marking', 'Epoxy Tank Lining', 'Corrosion Descaling & Primer']
  },
  {
    id: 'staff-vincent-dlamini-painter',
    name: 'Vincent Dlamini',
    title: 'Industrial Painter',
    department: 'Engineering - General Plant Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-john-khoza',
    reportsToName: 'John Khoza',
    level: 'Artisan',
    role: 'Technician',
    trade: 'Painter',
    shift: 'Day Shift',
    email: 'v.dlamini.painter@usadistillers.com',
    avatarColor: 'bg-blue-500',
    responsibilities: ['Stillhouse Tower Structural Coating', 'Safety Demarcation Lines', 'Spray Painting & Lagging']
  },
  {
    id: 'staff-torrez',
    name: 'Torrez',
    title: 'Industrial Painter',
    department: 'Engineering - General Plant Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-john-khoza',
    reportsToName: 'John Khoza',
    level: 'Artisan',
    role: 'Technician',
    trade: 'Painter',
    shift: 'Day Shift',
    email: 'torrez@usadistillers.com',
    avatarColor: 'bg-blue-400',
    responsibilities: ['Surface Grit Blasting', 'Heat Resistant Boiler Coating', 'Handrail & Gantry Marking']
  },

  // ==========================================
  // MECHANICAL SUPPORT: GENERAL ASSISTANTS (5 DAY CREW)
  // ==========================================
  {
    id: 'staff-charlie-mvubu',
    name: 'Charlie Mvubu',
    title: 'General Assistant',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-sam-ngubeni',
    reportsToName: 'Sam Ngubeni',
    level: 'Assistant',
    role: 'Operator',
    trade: 'General Assistant',
    shift: 'Day Shift',
    email: 'c.mvubu@usadistillers.com',
    avatarColor: 'bg-stone-500',
    responsibilities: ['Mechanical Crew Workshop Support', 'Tool Rigging & Staging', 'Spares Transport from Stores']
  },
  {
    id: 'staff-sabelo-mkhonta',
    name: 'Sabelo Mkhonta',
    title: 'General Assistant',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-sam-ngubeni',
    reportsToName: 'Sam Ngubeni',
    level: 'Assistant',
    role: 'Operator',
    trade: 'General Assistant',
    shift: 'Day Shift',
    email: 's.mkhonta@usadistillers.com',
    avatarColor: 'bg-stone-500',
    responsibilities: ['Pump Strip & Washdown Bay', 'Lube Oil Drum Handling', 'Gasket Cleaning & Assembly Prep']
  },
  {
    id: 'staff-bongani-ga',
    name: 'Bongani',
    title: 'General Assistant',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-sam-ngubeni',
    reportsToName: 'Sam Ngubeni',
    level: 'Assistant',
    role: 'Operator',
    trade: 'General Assistant',
    shift: 'Day Shift',
    email: 'bongani.ga@usadistillers.com',
    avatarColor: 'bg-stone-500',
    responsibilities: ['Boiler Ash Basement Maintenance Support', 'Heavy Scaffolding Transport', 'Site Housekeeping']
  },
  {
    id: 'staff-matsenjwa-ga',
    name: 'Matsenjwa',
    title: 'General Assistant',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-sam-ngubeni',
    reportsToName: 'Sam Ngubeni',
    level: 'Assistant',
    role: 'Operator',
    trade: 'General Assistant',
    shift: 'Day Shift',
    email: 'matsenjwa.ga@usadistillers.com',
    avatarColor: 'bg-stone-500',
    responsibilities: ['Stillhouse Maintenance Staging', 'Drain Bund Clearance', 'Stores Requisition Deliveries']
  },
  {
    id: 'staff-mcunu-ga',
    name: 'Mcunu',
    title: 'General Assistant',
    department: 'Engineering - Mechanical Maintenance',
    departmentCategory: 'Engineering',
    reportsToId: 'staff-sam-ngubeni',
    reportsToName: 'Sam Ngubeni',
    level: 'Assistant',
    role: 'Operator',
    trade: 'General Assistant',
    shift: 'Day Shift',
    email: 'mcunu.ga@usadistillers.com',
    avatarColor: 'bg-stone-500',
    responsibilities: ['Compressor House Filter Maintenance Assistance', 'Tool Crib Checking', 'General Mechanical Crew Support']
  },

  // ==========================================
  // OPERATIONAL STAFF: WATER TREATMENT (4 SHIFT CONTINUOUS)
  // ==========================================
  {
    id: 'staff-andriese-gamedze',
    name: 'Andriese Gamedze',
    title: 'Water Treatment Operator (Shift A)',
    department: 'Utilities - Water Treatment',
    departmentCategory: 'Utilities',
    reportsToId: 'staff-tintile-gule',
    reportsToName: 'Tintile Gule',
    level: 'Operator',
    role: 'Operator',
    trade: 'Water Treatment Operator',
    shift: 'Shift A',
    email: 'a.gamedze@usadistillers.com',
    avatarColor: 'bg-sky-600',
    responsibilities: ['Great Usuthu River Intake Levels', 'RO Soft Water Quality Logs', 'Mahlabaneni Community Water Flow']
  },
  {
    id: 'staff-masuku-wto',
    name: 'Masuku',
    title: 'Water Treatment Operator (Shift B)',
    department: 'Utilities - Water Treatment',
    departmentCategory: 'Utilities',
    reportsToId: 'staff-tintile-gule',
    reportsToName: 'Tintile Gule',
    level: 'Operator',
    role: 'Operator',
    trade: 'Water Treatment Operator',
    shift: 'Shift B',
    email: 'masuku.wto@usadistillers.com',
    avatarColor: 'bg-sky-600',
    responsibilities: ['Chemical Dosing (Coagulant & Lime)', 'Sand Filter Backwash Cycles', 'Boiler Feed TDS Monitoring']
  },
  {
    id: 'staff-simphiwe-dlamini-wto',
    name: 'Simphiwe Dlamini',
    title: 'Water Treatment Operator (Shift C)',
    department: 'Utilities - Water Treatment',
    departmentCategory: 'Utilities',
    reportsToId: 'staff-tintile-gule',
    reportsToName: 'Tintile Gule',
    level: 'Operator',
    role: 'Operator',
    trade: 'Water Treatment Operator',
    shift: 'Shift C',
    email: 's.dlamini.wto@usadistillers.com',
    avatarColor: 'bg-sky-600',
    responsibilities: ['RO Membrane Differential Pressure', 'River Pump House Status', 'Clarifier Sludge Discharge']
  },
  {
    id: 'staff-sakhile-wto',
    name: 'Sakhile',
    title: 'Water Treatment Operator (Shift D)',
    department: 'Utilities - Water Treatment',
    departmentCategory: 'Utilities',
    reportsToId: 'staff-tintile-gule',
    reportsToName: 'Tintile Gule',
    level: 'Operator',
    role: 'Operator',
    trade: 'Water Treatment Operator',
    shift: 'Shift D',
    email: 'sakhile.wto@usadistillers.com',
    avatarColor: 'bg-sky-600',
    responsibilities: ['Effluent Neutralization', 'Potable Plant Chlorine Residuals', 'Fermentation Water Tank Levels']
  },

  // ==========================================
  // OPERATIONAL STAFF: BOILER OPERATORS (4 SHIFT CONTINUOUS)
  // ==========================================
  {
    id: 'staff-melusi-dlamini',
    name: 'Melusi Dlamini',
    title: 'Boiler Operator (Shift A)',
    department: 'Utilities - Boiler House',
    departmentCategory: 'Utilities',
    reportsToId: 'staff-tintile-gule',
    reportsToName: 'Tintile Gule',
    level: 'Operator',
    role: 'Operator',
    trade: 'Boiler Operator',
    shift: 'Shift A',
    email: 'm.dlamini.blr@usadistillers.com',
    avatarColor: 'bg-amber-600',
    responsibilities: ['Shift A 3x 20t Boilers Control', 'Steam Pressure & Superheat Temperature', 'Turbine Co-Gen Steam Supply']
  },
  {
    id: 'staff-bongani-dladla',
    name: 'Bongani Dladla',
    title: 'Boiler Operator (Shift B)',
    department: 'Utilities - Boiler House',
    departmentCategory: 'Utilities',
    reportsToId: 'staff-tintile-gule',
    reportsToName: 'Tintile Gule',
    level: 'Operator',
    role: 'Operator',
    trade: 'Boiler Operator',
    shift: 'Shift B',
    email: 'b.dladla@usadistillers.com',
    avatarColor: 'bg-amber-600',
    responsibilities: ['Shift B Combustion Air Balance', 'Water Drum Gauge Glasses Check', 'Continuous Ash Conveyor Operation']
  },
  {
    id: 'staff-bryce-matsenjwa',
    name: 'Bryce Matsenjwa',
    title: 'Boiler Operator (Shift C)',
    department: 'Utilities - Boiler House',
    departmentCategory: 'Utilities',
    reportsToId: 'staff-tintile-gule',
    reportsToName: 'Tintile Gule',
    level: 'Operator',
    role: 'Operator',
    trade: 'Boiler Operator',
    shift: 'Shift C',
    email: 'b.matsenjwa.blr@usadistillers.com',
    avatarColor: 'bg-amber-600',
    responsibilities: ['Shift C Steam Header Pressure', 'Deaerator Pressure & Temperature', 'Feedwater Pump Transfer']
  },
  {
    id: 'staff-victor-vilakati',
    name: 'Victor Vilakati',
    title: 'Boiler Operator (Shift D)',
    department: 'Utilities - Boiler House',
    departmentCategory: 'Utilities',
    reportsToId: 'staff-tintile-gule',
    reportsToName: 'Tintile Gule',
    level: 'Operator',
    role: 'Operator',
    trade: 'Boiler Operator',
    shift: 'Shift D',
    email: 'v.vilakati@usadistillers.com',
    avatarColor: 'bg-amber-600',
    responsibilities: ['Shift D Flue Gas Temperature & Oxygen', 'Stoker Grate Speed Controls', 'Blowdown Execution']
  },

  // ==========================================
  // OPERATIONAL STAFF: BOILER ASSISTANTS (4 SHIFT CONTINUOUS)
  // ==========================================
  {
    id: 'staff-maswazi-manyatsi',
    name: 'Maswazi Manyatsi',
    title: 'Boiler Assistant (Shift A)',
    department: 'Utilities - Boiler House',
    departmentCategory: 'Utilities',
    reportsToId: 'staff-tintile-gule',
    reportsToName: 'Tintile Gule',
    level: 'Assistant',
    role: 'Operator',
    trade: 'Boiler Assistant',
    shift: 'Shift A',
    email: 'm.manyatsi@usadistillers.com',
    avatarColor: 'bg-amber-500',
    responsibilities: ['Coal & Bagasse Fuel Chute Clearance', 'Ash Pit Quench Flushing', 'Sight Glass Blowthrough Support']
  },
  {
    id: 'staff-mandla-msibi',
    name: 'Mandla Msibi',
    title: 'Boiler Assistant (Shift B)',
    department: 'Utilities - Boiler House',
    departmentCategory: 'Utilities',
    reportsToId: 'staff-tintile-gule',
    reportsToName: 'Tintile Gule',
    level: 'Assistant',
    role: 'Operator',
    trade: 'Boiler Assistant',
    shift: 'Shift B',
    email: 'm.msibi@usadistillers.com',
    avatarColor: 'bg-amber-500',
    responsibilities: ['Screw Conveyor Clearance', 'Bottom Ash Extraction Monitoring', 'Boiler Floor Inspections']
  },
  {
    id: 'staff-happy-mamba',
    name: 'Happy Mamba',
    title: 'Boiler Assistant (Shift C)',
    department: 'Utilities - Boiler House',
    departmentCategory: 'Utilities',
    reportsToId: 'staff-tintile-gule',
    reportsToName: 'Tintile Gule',
    level: 'Assistant',
    role: 'Operator',
    trade: 'Boiler Assistant',
    shift: 'Shift C',
    email: 'h.mamba@usadistillers.com',
    avatarColor: 'bg-amber-500',
    responsibilities: ['ID/FD Fan Oil Sight Glasses Check', 'Sootblower Operations Assistance', 'Ash Bin Swaps']
  },
  {
    id: 'staff-sibonangaye-siyaya',
    name: 'Sibonangaye Siyaya',
    title: 'Boiler Assistant (Shift D)',
    department: 'Utilities - Boiler House',
    departmentCategory: 'Utilities',
    reportsToId: 'staff-tintile-gule',
    reportsToName: 'Tintile Gule',
    level: 'Assistant',
    role: 'Operator',
    trade: 'Boiler Assistant',
    shift: 'Shift D',
    email: 's.siyaya@usadistillers.com',
    avatarColor: 'bg-amber-500',
    responsibilities: ['Fuel Feed Hoppers Level Monitoring', 'Fly Ash Dust Suppression', 'Boiler Water Sampling']
  },

  // ==========================================
  // OPERATIONAL STAFF: DISTILLATION OPERATORS (4 SHIFT CONTINUOUS)
  // ==========================================
  {
    id: 'staff-jobe-gamedze',
    name: 'Jobe Gamedze',
    title: 'Distillation Operator (Shift A)',
    department: 'Production - Distillation Columns',
    departmentCategory: 'Production',
    reportsToId: 'staff-ncamiso-dlamini',
    reportsToName: 'Ncamiso Dlamini',
    level: 'Operator',
    role: 'Operator',
    trade: 'Distillation Operator',
    shift: 'Shift A',
    email: 'j.gamedze.dist@usadistillers.com',
    avatarColor: 'bg-orange-600',
    responsibilities: ['Shift A Stillhouse Control', '94-95% Potable Alcohol Proof Tuning', 'Exhaust Steam Balancing']
  },
  {
    id: 'staff-dumsane-gumede',
    name: 'Dumsane Gumede',
    title: 'Distillation Operator (Shift B)',
    department: 'Production - Distillation Columns',
    departmentCategory: 'Production',
    reportsToId: 'staff-ncamiso-dlamini',
    reportsToName: 'Ncamiso Dlamini',
    level: 'Operator',
    role: 'Operator',
    trade: 'Distillation Operator',
    shift: 'Shift B',
    email: 'd.gumede@usadistillers.com',
    avatarColor: 'bg-orange-600',
    responsibilities: ['Shift B Wash Column Beer Stripping', 'Washer & Rectifier Column Reflux Ratios', 'Slops Alcohol Loss Checks']
  },
  {
    id: 'staff-atanasio-muchine',
    name: 'Atanasio Muchine',
    title: 'Distillation Operator (Shift C)',
    department: 'Production - Distillation Columns',
    departmentCategory: 'Production',
    reportsToId: 'staff-ncamiso-dlamini',
    reportsToName: 'Ncamiso Dlamini',
    level: 'Operator',
    role: 'Operator',
    trade: 'Distillation Operator',
    shift: 'Shift C',
    email: 'a.muchine@usadistillers.com',
    avatarColor: 'bg-orange-600',
    responsibilities: ['Shift C Rum Distillation Run Control', 'Industrial Alcohol Cuts', 'Condenser Water Temperatures']
  },
  {
    id: 'staff-smanga-dlamini-dist',
    name: 'Smanga Dlamini',
    title: 'Distillation Operator (Shift D)',
    department: 'Production - Distillation Columns',
    departmentCategory: 'Production',
    reportsToId: 'staff-ncamiso-dlamini',
    reportsToName: 'Ncamiso Dlamini',
    level: 'Operator',
    role: 'Operator',
    trade: 'Distillation Operator',
    shift: 'Shift D',
    email: 's.dlamini.dist@usadistillers.com',
    avatarColor: 'bg-orange-600',
    responsibilities: ['Shift D Potable Spirit Receiver Tanks', 'Fusel Oil Separation', 'Distillation Safe Shutdown Protocols']
  },

  // ==========================================
  // OPERATIONAL STAFF: FERMENTATION OPERATORS (4 SHIFT CONTINUOUS)
  // ==========================================
  {
    id: 'staff-kenny-kunene',
    name: 'Kenny Kunene',
    title: 'Fermentation Operator (Shift A)',
    department: 'Production - Fermentation Bay',
    departmentCategory: 'Production',
    reportsToId: 'staff-ncamiso-dlamini',
    reportsToName: 'Ncamiso Dlamini',
    level: 'Operator',
    role: 'Operator',
    trade: 'Fermentation Operator',
    shift: 'Shift A',
    email: 'k.kunene@usadistillers.com',
    avatarColor: 'bg-orange-500',
    responsibilities: ['Shift A Molasses Dilution & Brix Control', 'Yeast Innoculation Timing', 'Fermentation Temperature Loops']
  },
  {
    id: 'staff-themba-mamba',
    name: 'Themba Mamba',
    title: 'Fermentation Operator (Shift B)',
    department: 'Production - Fermentation Bay',
    departmentCategory: 'Production',
    reportsToId: 'staff-ncamiso-dlamini',
    reportsToName: 'Ncamiso Dlamini',
    level: 'Operator',
    role: 'Operator',
    trade: 'Fermentation Operator',
    shift: 'Shift B',
    email: 't.mamba.ferm@usadistillers.com',
    avatarColor: 'bg-orange-500',
    responsibilities: ['Shift B 9-13% Wash Alcohol Verification', 'Fermenter External Cooling Circulation', 'CIP Cycles']
  },
  {
    id: 'staff-gerald-fakudze',
    name: 'Gerald Fakudze',
    title: 'Fermentation Operator (Shift C)',
    department: 'Production - Fermentation Bay',
    departmentCategory: 'Production',
    reportsToId: 'staff-ncamiso-dlamini',
    reportsToName: 'Ncamiso Dlamini',
    level: 'Operator',
    role: 'Operator',
    trade: 'Fermentation Operator',
    shift: 'Shift C',
    email: 'g.fakudze@usadistillers.com',
    avatarColor: 'bg-orange-500',
    responsibilities: ['Shift C Propagation Aeration Loops', 'Acid & Nutrient Dosing Checks', 'Beer Well Transfer Pump Control']
  },
  {
    id: 'staff-zandile-nkhabinze',
    name: 'Zandile Nkhabinze',
    title: 'Fermentation Operator (Shift D)',
    department: 'Production - Fermentation Bay',
    departmentCategory: 'Production',
    reportsToId: 'staff-ncamiso-dlamini',
    reportsToName: 'Ncamiso Dlamini',
    level: 'Operator',
    role: 'Operator',
    trade: 'Fermentation Operator',
    shift: 'Shift D',
    email: 'z.nkhabinze@usadistillers.com',
    avatarColor: 'bg-orange-500',
    responsibilities: ['Shift D Yeast Vitality Testing', 'Tank Foaming Control', 'Molasses Receiving Tank Switching']
  }
];

export const STAFF_BY_DEPARTMENT: Record<string, StaffMember[]> = COMPANY_ORGANOGRAM.reduce(
  (acc, member) => {
    const key = member.departmentCategory;
    if (!acc[key]) acc[key] = [];
    acc[key].push(member);
    return acc;
  },
  {} as Record<string, StaffMember[]>
);

export function getStaffById(id: string): StaffMember | undefined {
  return COMPANY_ORGANOGRAM.find((m) => m.id === id);
}

export function getDirectReports(staffId: string): StaffMember[] {
  return COMPANY_ORGANOGRAM.filter((m) => m.reportsToId === staffId);
}

export interface OrganogramNode {
  member: StaffMember;
  reports: OrganogramNode[];
}

export function getOrganogramTree(): OrganogramNode {
  const chairman = COMPANY_ORGANOGRAM.find((m) => m.level === 'Chairman') || COMPANY_ORGANOGRAM[0];
  function buildSubTree(member: StaffMember): OrganogramNode {
    const directReports = getDirectReports(member.id);
    return {
      member,
      reports: directReports.map(buildSubTree)
    };
  }
  return buildSubTree(chairman);
}

export function getSupervisorsForDepartment(departmentCategory: string): StaffMember[] {
  return COMPANY_ORGANOGRAM.filter(
    (m) =>
      m.departmentCategory === departmentCategory ||
      m.department.startsWith(departmentCategory) ||
      m.role === 'Manager' ||
      m.role === 'Supervisor'
  );
}

export function getStaffByTrade(trade: TechnicalTrade): StaffMember[] {
  return COMPANY_ORGANOGRAM.filter((m) => m.trade === trade);
}

export function getStaffByShift(shift: ShiftGroup): StaffMember[] {
  return COMPANY_ORGANOGRAM.filter((m) => m.shift === shift);
}

export interface StandbyRosterEntry {
  trade: 'Electrician' | 'Boilermaker' | 'Welder';
  supervisor: string;
  onDuty: StaffMember;
  backup: StaffMember;
  cycle: string;
}

/**
 * Wednesday-to-Wednesday Standby Roster Engine for USA Distillers
 * Outside 07:00-17:00 M-F and on weekends, these designated artisans handle plant call-outs
 */
export function getActiveStandbyRoster(): StandbyRosterEntry[] {
  const electricians = COMPANY_ORGANOGRAM.filter((m) => m.trade === 'Electrician');
  const boilermakers = COMPANY_ORGANOGRAM.filter((m) => m.trade === 'Boilermaker');
  const welders = COMPANY_ORGANOGRAM.filter((m) => m.trade === 'Welder');

  return [
    {
      trade: 'Electrician',
      supervisor: 'Bongani Dlamini (Electrical Supervisor)',
      onDuty: electricians[0] || COMPANY_ORGANOGRAM[0],
      backup: electricians[1] || COMPANY_ORGANOGRAM[1],
      cycle: 'Wed 17:00 to Wed 17:00 (Current Week Standby)'
    },
    {
      trade: 'Boilermaker',
      supervisor: 'Sam Ngubeni (Maintenance Supervisor)',
      onDuty: boilermakers[0] || COMPANY_ORGANOGRAM[0],
      backup: boilermakers[1] || COMPANY_ORGANOGRAM[1],
      cycle: 'Wed 17:00 to Wed 17:00 (Current Week Standby)'
    },
    {
      trade: 'Welder',
      supervisor: 'Sam Ngubeni (Maintenance Supervisor)',
      onDuty: welders[0] || COMPANY_ORGANOGRAM[0],
      backup: welders[1] || COMPANY_ORGANOGRAM[1],
      cycle: 'Wed 17:00 to Wed 17:00 (Current Week Standby)'
    }
  ];
}

export const TECHNICAL_TRADES_LIST: { id: TechnicalTrade; label: string; crewType: string }[] = [
  { id: 'Mechanical Fitter', label: 'Mechanical Fitter (4-Shift Plant Crew)', crewType: 'Continuous 4-Shift' },
  { id: 'Rigger', label: 'Plant Rigger (4-Shift Heavy Lifting)', crewType: 'Continuous 4-Shift' },
  { id: 'Electrician', label: 'Plant Electrician (Day & Standby)', crewType: 'Day + Standby Rotation' },
  { id: 'Boilermaker', label: 'Boilermaker (Vessels & Fabrication)', crewType: 'Day + Standby Rotation' },
  { id: 'Welder', label: 'High-Pressure Welder (TIG/Arc)', crewType: 'Day + Standby Rotation' },
  { id: 'Painter', label: 'Industrial Painter (Corrosion & Piping)', crewType: 'Day Shift (7am-5pm)' },
  { id: 'General Assistant', label: 'General Assistant (Mechanical Pool)', crewType: 'Day Shift (7am-5pm)' },
  { id: 'Water Treatment Operator', label: 'Water Treatment Operator (Continuous)', crewType: 'Continuous 4-Shift' },
  { id: 'Boiler Operator', label: 'Boiler Operator (3x 20t Boilers)', crewType: 'Continuous 4-Shift' },
  { id: 'Boiler Assistant', label: 'Boiler Assistant (Continuous)', crewType: 'Continuous 4-Shift' },
  { id: 'Distillation Operator', label: 'Distillation Operator (94-95% Potable)', crewType: 'Continuous 4-Shift' },
  { id: 'Fermentation Operator', label: 'Fermentation Operator (Continuous)', crewType: 'Continuous 4-Shift' },
  { id: 'General Maintenance', label: 'General Plant Maintenance', crewType: 'General' }
];

export const SHIFTS_LIST: { id: ShiftGroup; label: string; timing: string }[] = [
  { id: 'Shift A', label: 'Shift A', timing: '24/7 Continuous Rotation' },
  { id: 'Shift B', label: 'Shift B', timing: '24/7 Continuous Rotation' },
  { id: 'Shift C', label: 'Shift C', timing: '24/7 Continuous Rotation' },
  { id: 'Shift D', label: 'Shift D', timing: '24/7 Continuous Rotation' },
  { id: 'Day Shift', label: 'Day Shift (Standard)', timing: '07:00 to 17:00 (Mon - Fri)' },
  { id: 'Standby Callout', label: 'Standby Emergency Call-out', timing: 'After 17:00 / Weekends (Wed-to-Wed)' }
];
