/**
 * USA Distillers ERP - Master Organization & Leadership Roster
 * 
 * Formal company organogram defining executive governance, department managers,
 * and plant operations supervisors.
 */

export type OrgLevel =
  | 'Chairman'
  | 'Managing Director'
  | 'Director'
  | 'Manager'
  | 'Assistant Manager'
  | 'Supervisor';

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
