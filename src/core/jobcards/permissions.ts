/**
 * Job Card Role-Based Access Control (RBAC) & Workflow State Guards
 *
 * Pure domain helpers (zero React/Firebase side-effects) mirrored 1-to-1
 * in firestore.rules to enforce least-privilege access across:
 * - Supervisors / Managers / Admins (assign, transition, complete, close)
 * - HOD / Managers / Admins (final HOD digital sign-off)
 * - Artisans / Technicians (execution, labor, spares request, shift handovers)
 * - Storemen (spares issuance & awaiting spares updates)
 * - Operators (raising requisitions, editing own Drafts, commenting)
 */

import { JobCard, JobCardStatus, JobCardWorkflowStage, UserProfile } from '../../types';
import { resolveWorkflowStage } from './workflow';

export type UserRole = UserProfile['role'];

export interface JobCardActorContext {
  uid?: string | null;
  role?: UserRole | null;
  email?: string | null;
}

export const TERMINAL_JOB_CARD_STATUSES: ReadonlyArray<JobCardStatus> = [
  'Completed',
  'Cancelled'
];

export const SUPERVISOR_OR_ABOVE_ROLES: ReadonlyArray<UserRole> = [
  'Admin',
  'Manager',
  'Supervisor'
];

export const HOD_APPROVER_ROLES: ReadonlyArray<UserRole> = [
  'Admin',
  'Manager'
];

export const ARTISAN_OR_ABOVE_ROLES: ReadonlyArray<UserRole> = [
  'Admin',
  'Manager',
  'Supervisor',
  'Technician'
];

export const STORES_ISSUER_ROLES: ReadonlyArray<UserRole> = [
  'Admin',
  'Manager',
  'Supervisor',
  'Storeman'
];

export function isJobCardAdmin(
  role?: UserRole | null,
  email?: string | null
): boolean {
  if (email && email.toLowerCase() === 'sifisani@gmail.com') {
    return true;
  }
  return role === 'Admin';
}

export function isJobCardTerminal(card: Pick<JobCard, 'status'>): boolean {
  return TERMINAL_JOB_CARD_STATUSES.includes(card.status);
}

export function canAssignOrAcceptJobCard(
  role?: UserRole | null,
  email?: string | null
): boolean {
  if (isJobCardAdmin(role, email)) return true;
  return Boolean(role && SUPERVISOR_OR_ABOVE_ROLES.includes(role));
}

export function canCloseOrCompleteJobCard(
  role?: UserRole | null,
  email?: string | null
): boolean {
  return canAssignOrAcceptJobCard(role, email);
}

export function canHODSignOffJobCard(
  role?: UserRole | null,
  email?: string | null
): boolean {
  if (isJobCardAdmin(role, email)) return true;
  return Boolean(role && HOD_APPROVER_ROLES.includes(role));
}

export function canRecordArtisanHandback(
  role?: UserRole | null,
  email?: string | null
): boolean {
  return canAssignOrAcceptJobCard(role, email);
}

export function canRequestSpares(
  role?: UserRole | null,
  email?: string | null
): boolean {
  if (isJobCardAdmin(role, email)) return true;
  return Boolean(role && ARTISAN_OR_ABOVE_ROLES.includes(role));
}

export function canIssueSpares(
  role?: UserRole | null,
  email?: string | null
): boolean {
  if (isJobCardAdmin(role, email)) return true;
  return Boolean(role && STORES_ISSUER_ROLES.includes(role));
}

export function canLogLaborOrHandover(
  role?: UserRole | null,
  email?: string | null
): boolean {
  if (isJobCardAdmin(role, email)) return true;
  return Boolean(role && ARTISAN_OR_ABOVE_ROLES.includes(role));
}

export function canDeleteJobCard(
  role?: UserRole | null,
  email?: string | null
): boolean {
  return isJobCardAdmin(role, email);
}

export function canEditJobCard(
  actor: JobCardActorContext | null | undefined,
  card: Pick<JobCard, 'status' | 'createdById'>
): boolean {
  if (!actor) return false;
  if (isJobCardAdmin(actor.role, actor.email)) return true;
  if (isJobCardTerminal(card)) return false;

  if (canAssignOrAcceptJobCard(actor.role, actor.email)) {
    return true;
  }

  return Boolean(
    card.status === 'Draft' &&
    actor.uid &&
    card.createdById === actor.uid
  );
}

export function canTransitionJobCardStatus(
  actor: JobCardActorContext | null | undefined,
  card: Pick<JobCard, 'status'>,
  targetStatus: JobCardStatus
): boolean {
  if (!actor) return false;
  const admin = isJobCardAdmin(actor.role, actor.email);

  if (isJobCardTerminal(card)) {
    return admin;
  }

  if (card.status === targetStatus) {
    return false;
  }

  if (canCloseOrCompleteJobCard(actor.role, actor.email)) {
    return true;
  }

  if (actor.role === 'Technician' || actor.role === 'Storeman') {
    return targetStatus === 'In Progress' || targetStatus === 'Pending Spares';
  }

  return false;
}

export function canTransitionWorkflowStage(
  actor: JobCardActorContext | null | undefined,
  card: Pick<JobCard, 'workflowStage' | 'status' | 'requisitionStage' | 'hodSignedBy' | 'hodDigitalSignOff' | 'acceptedBy'>,
  targetStage: JobCardWorkflowStage
): boolean {
  if (!actor) return false;
  const admin = isJobCardAdmin(actor.role, actor.email);
  const currentStage = resolveWorkflowStage(card);

  if (isJobCardTerminal(card) || currentStage === 'CLOSED' || currentStage === 'CANCELLED') {
    return admin;
  }

  if (currentStage === targetStage) {
    return false;
  }

  if (targetStage === 'CLOSED') {
    return canHODSignOffJobCard(actor.role, actor.email);
  }

  if (canCloseOrCompleteJobCard(actor.role, actor.email)) {
    return true;
  }

  if (actor.role === 'Technician' || actor.role === 'Storeman') {
    return targetStage === 'IN_PROGRESS' || targetStage === 'WAITING_FOR_PARTS';
  }

  return false;
}

export function canSpawnLinkedJobCard(
  role?: UserRole | null,
  email?: string | null
): boolean {
  return canAssignOrAcceptJobCard(role, email);
}

export function getAllowedFormStatuses(
  role?: UserRole | null,
  email?: string | null,
  existingStatus?: JobCardStatus
): JobCardStatus[] {
  if (canCloseOrCompleteJobCard(role, email)) {
    return ['Draft', 'In Progress', 'Pending Spares', 'Completed', 'Cancelled'];
  }
  if (role === 'Technician' || role === 'Storeman') {
    const allowed: JobCardStatus[] = ['Draft', 'In Progress', 'Pending Spares'];
    if (existingStatus && !allowed.includes(existingStatus)) {
      return [existingStatus];
    }
    return allowed;
  }
  return existingStatus ? [existingStatus] : ['Draft'];
}

export function getJobCardPermissionReason(
  action:
    | 'assign'
    | 'complete'
    | 'hod_signoff'
    | 'handback'
    | 'issue_spares'
    | 'request_spares'
    | 'labor'
    | 'delete'
    | 'edit',
  role?: UserRole | null
): string {
  const current = role || 'Unknown';
  switch (action) {
    case 'assign':
      return `Only Supervisors, Managers, or Admins can accept & assign work orders (current role: ${current}).`;
    case 'complete':
      return `Only Supervisors, Managers, or Admins can mark a Job Card Completed or Cancelled (current role: ${current}).`;
    case 'hod_signoff':
      return `Only Engineering Managers / HODs or Admins can apply final HOD digital sign-off (current role: ${current}).`;
    case 'handback':
      return `Only Supervisors, Managers, or Admins can record official artisan slip handbacks (current role: ${current}).`;
    case 'issue_spares':
      return `Only Stores staff (Storeman), Supervisors, Managers, or Admins can issue spares from warehouse (current role: ${current}).`;
    case 'request_spares':
      return `Only Artisans, Supervisors, Managers, or Admins can raise spares requisitions (current role: ${current}).`;
    case 'labor':
      return `Only Artisans, Supervisors, Managers, or Admins can log maintenance labor or shift handovers (current role: ${current}).`;
    case 'delete':
      return `Only system Admins may permanently delete Job Cards to protect plant audit trails (current role: ${current}).`;
    case 'edit':
      return `This Job Card is locked for edits by your role (${current}) or has reached a terminal state.`;
  }
}
