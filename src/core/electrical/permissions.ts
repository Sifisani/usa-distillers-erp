/**
 * Electrical Topology Permissions & Data Integrity Validators
 *
 * Pure domain guards (zero React/Firebase side-effects) enforcing:
 * 1. Role-Based Access Control (Authorized Engineering Users vs Ordinary Technicians/Operators)
 * 2. Duplicate equipment asset tag rejection
 * 3. Orphaned electrical connection prevention (source/target & feeder references must exist)
 * 4. Referential integrity protection blocking deletion of assets referenced by historical jobCards
 */

import {
  Equipment,
  JobCard,
  PowerDistributionNode,
  PowerEdgeRole,
  PowerEdgeSpec,
  UserProfile
} from '../../types';

export const AUTHORIZED_ELECTRICAL_ROLES: ReadonlyArray<UserProfile['role']> = [
  'Admin',
  'Manager',
  'Supervisor'
];

export const PERMITTED_TECHNICIAN_INSPECTION_FIELDS = [
  'loadCurrentAmps',
  'status',
  'notes',
  'lastServiceDate',
  'nextServiceDate'
] as const;

export function isAuthorizedElectricalEngineer(
  role?: UserProfile['role'] | null,
  email?: string | null
): boolean {
  if (email && email.toLowerCase() === 'sifisani@gmail.com') {
    return true;
  }
  if (!role) return false;
  return AUTHORIZED_ELECTRICAL_ROLES.includes(role);
}

export function canEditEquipmentInspectionOnly(role?: UserProfile['role'] | null): boolean {
  return Boolean(role);
}

export const INSPECTION_SUBMITTER_ROLES: ReadonlyArray<UserProfile['role']> = [
  'Admin',
  'Manager',
  'Supervisor',
  'Technician'
];

export const INSPECTION_REVIEWER_ROLES: ReadonlyArray<UserProfile['role']> = [
  'Admin',
  'Manager',
  'Supervisor'
];

export const INSPECTION_TEMPLATE_ADMIN_ROLES: ReadonlyArray<UserProfile['role']> = [
  'Admin',
  'Manager'
];

export function canSubmitElectricalInspection(
  role?: UserProfile['role'] | null,
  email?: string | null
): boolean {
  if (email && email.toLowerCase() === 'sifisani@gmail.com') {
    return true;
  }
  if (!role) return false;
  return INSPECTION_SUBMITTER_ROLES.includes(role);
}

export function canReviewElectricalInspection(
  role?: UserProfile['role'] | null,
  email?: string | null
): boolean {
  if (email && email.toLowerCase() === 'sifisani@gmail.com') {
    return true;
  }
  if (!role) return false;
  return INSPECTION_REVIEWER_ROLES.includes(role);
}

export function canManageInspectionTemplates(
  role?: UserProfile['role'] | null,
  email?: string | null
): boolean {
  if (email && email.toLowerCase() === 'sifisani@gmail.com') {
    return true;
  }
  if (!role) return false;
  return INSPECTION_TEMPLATE_ADMIN_ROLES.includes(role);
}

export function normalizeAssetTag(code?: string): string {
  return (code || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function validateEquipmentIntegrity(
  candidate: {
    code?: string;
    name?: string;
    feederNodeId?: string;
    feederPanel?: string;
  },
  existingEquipment: Equipment[],
  validPowerNodes: PowerDistributionNode[],
  editingEquipmentId?: string
): { valid: boolean; error?: string } {
  const normalizedCode = normalizeAssetTag(candidate.code);
  const trimmedName = (candidate.name || '').trim();

  if (!normalizedCode) {
    return {
      valid: false,
      error: 'Equipment asset tag (code) is required.'
    };
  }

  if (!trimmedName) {
    return {
      valid: false,
      error: 'Equipment name / description is required.'
    };
  }

  const duplicate = existingEquipment.find(
    (eq) => eq.id !== editingEquipmentId && normalizeAssetTag(eq.code) === normalizedCode
  );
  if (duplicate) {
    return {
      valid: false,
      error: `Duplicate asset tag "${candidate.code?.trim()}": already assigned to "${duplicate.name}" (${duplicate.feederPanel || duplicate.location}).`
    };
  }

  if (candidate.feederNodeId) {
    const targetNode = validPowerNodes.find((n) => n.id === candidate.feederNodeId);
    if (!targetNode) {
      return {
        valid: false,
        error: `Orphaned electrical link rejected: feeder node "${candidate.feederNodeId}" does not exist in power topology.`
      };
    }
  }

  if (candidate.feederPanel) {
    const matchesPanel = validPowerNodes.some(
      (n) =>
        n.feederPanelId === candidate.feederPanel ||
        n.code === candidate.feederPanel ||
        n.name === candidate.feederPanel
    );
    if (!matchesPanel) {
      return {
        valid: false,
        error: `Orphaned feeder panel rejected: "${candidate.feederPanel}" is not a verified electrical panel.`
      };
    }
  }

  return { valid: true };
}

export function validateSafeEquipmentDelete(
  equipment: Pick<Equipment, 'id' | 'code' | 'name'>,
  jobCards: JobCard[]
): {
  canDelete: boolean;
  referencingJobCards: JobCard[];
  error?: string;
} {
  const eqNameLower = (equipment.name || '').trim().toLowerCase();
  const referencingJobCards = jobCards.filter(
    (jc) =>
      jc.equipmentId === equipment.id ||
      (Boolean(eqNameLower) && Boolean(jc.equipmentName) && jc.equipmentName.trim().toLowerCase() === eqNameLower)
  );

  if (referencingJobCards.length > 0) {
    const refs = referencingJobCards
      .slice(0, 4)
      .map((jc) => jc.jobCardNumber || jc.id)
      .join(', ');
    const extra = referencingJobCards.length > 4 ? ` (+${referencingJobCards.length - 4} more)` : '';
    return {
      canDelete: false,
      referencingJobCards,
      error: `Cannot delete ${equipment.code} ("${equipment.name}"): referenced by ${referencingJobCards.length} historical or active Job Card(s) [${refs}${extra}]. Mark status as Decommissioned instead to preserve audit lineage.`
    };
  }

  return {
    canDelete: true,
    referencingJobCards: []
  };
}

function isReachableDownstream(
  startId: string,
  targetId: string,
  edges: PowerEdgeSpec[]
): boolean {
  const queue: string[] = [startId];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === targetId) return true;
    if (visited.has(curr)) continue;
    visited.add(curr);
    for (const edge of edges) {
      if (edge.edgeRole === 'INTERLOCK_TIE') continue;
      if (edge.source === curr && !visited.has(edge.target)) {
        queue.push(edge.target);
      }
    }
  }
  return false;
}

export function validatePowerConnectionCandidate(
  candidate: {
    sourceNodeId: string;
    targetNodeId: string;
    edgeRole: PowerEdgeRole;
  },
  nodes: PowerDistributionNode[],
  existingEdges: PowerEdgeSpec[]
): { valid: boolean; error?: string } {
  const nodeIds = new Set(nodes.map((n) => n.id));
  if (!candidate.sourceNodeId || !nodeIds.has(candidate.sourceNodeId)) {
    return {
      valid: false,
      error: `Orphaned connection rejected: source node "${candidate.sourceNodeId}" does not exist.`
    };
  }
  if (!candidate.targetNodeId || !nodeIds.has(candidate.targetNodeId)) {
    return {
      valid: false,
      error: `Orphaned connection rejected: target node "${candidate.targetNodeId}" does not exist.`
    };
  }
  if (candidate.sourceNodeId === candidate.targetNodeId) {
    return {
      valid: false,
      error: 'Invalid connection: a node cannot connect to itself.'
    };
  }

  const duplicate = existingEdges.some(
    (e) =>
      e.source === candidate.sourceNodeId &&
      e.target === candidate.targetNodeId &&
      e.edgeRole === candidate.edgeRole
  );
  if (duplicate) {
    return {
      valid: false,
      error: `Duplicate connection: ${candidate.sourceNodeId} -> ${candidate.targetNodeId} (${candidate.edgeRole}) already exists.`
    };
  }

  if (
    candidate.edgeRole !== 'INTERLOCK_TIE' &&
    isReachableDownstream(candidate.targetNodeId, candidate.sourceNodeId, existingEdges)
  ) {
    return {
      valid: false,
      error: `Cycle rejected: connecting ${candidate.sourceNodeId} -> ${candidate.targetNodeId} would create a closed electrical feedback loop.`
    };
  }

  return { valid: true };
}
