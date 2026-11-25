/**
 * User Role & Profile Management Guards
 *
 * Pure domain helpers (zero React/Firebase side-effects) ensuring:
 * 1. Only Admins may inspect or reassign user roles
 * 2. Roles match Firestore security rules enum strictly
 * 3. Admins cannot lock themselves out by removing their own Admin role
 */

import { UserProfile } from '../../types';
import { isJobCardAdmin } from '../jobcards/permissions';

export const VALID_USER_ROLES: ReadonlyArray<UserProfile['role']> = [
  'Operator',
  'Technician',
  'Storeman',
  'Supervisor',
  'Manager',
  'Admin'
];

export interface UserRoleUpdateCandidate {
  targetUid: string;
  role: UserProfile['role'];
  department: string;
  title?: string;
}

export interface UserManagementActor {
  uid?: string | null;
  role?: UserProfile['role'] | null;
  email?: string | null;
}

export function canManageUserRoles(actor?: UserManagementActor | null): boolean {
  if (!actor) return false;
  return isJobCardAdmin(actor.role, actor.email);
}

export function validateUserRoleUpdate(
  candidate: UserRoleUpdateCandidate,
  actor?: UserManagementActor | null
): {
  valid: boolean;
  error?: string;
  normalized?: {
    role: UserProfile['role'];
    department: string;
    title?: string;
  };
} {
  if (!canManageUserRoles(actor)) {
    return {
      valid: false,
      error: 'Only system Administrators may assign or modify user roles.'
    };
  }

  const uid = (candidate.targetUid || '').trim();
  if (!uid || uid.length > 128) {
    return {
      valid: false,
      error: 'Valid user UID is required.'
    };
  }

  if (!VALID_USER_ROLES.includes(candidate.role)) {
    return {
      valid: false,
      error: `Invalid role "${String(candidate.role)}".`
    };
  }

  if (actor?.uid && actor.uid === uid && candidate.role !== 'Admin') {
    return {
      valid: false,
      error: 'Administrators cannot remove their own Admin privileges. Ask another Admin to reassign your role.'
    };
  }

  const department = (candidate.department || '').trim();
  if (!department || department.length > 120) {
    return {
      valid: false,
      error: 'Department must be between 1 and 120 characters.'
    };
  }

  const trimmedTitle = candidate.title !== undefined ? candidate.title.trim() : undefined;
  if (trimmedTitle && trimmedTitle.length > 120) {
    return {
      valid: false,
      error: 'Job title must be 120 characters or fewer.'
    };
  }

  return {
    valid: true,
    normalized: {
      role: candidate.role,
      department,
      title: trimmedTitle || undefined
    }
  };
}

export function sortUserProfilesForDirectory(users: UserProfile[]): UserProfile[] {
  const rank: Record<UserProfile['role'], number> = {
    Admin: 0,
    Manager: 1,
    Supervisor: 2,
    Technician: 3,
    Storeman: 4,
    Operator: 5
  };

  return [...users].sort((a, b) => {
    const rankDiff = (rank[a.role] ?? 99) - (rank[b.role] ?? 99);
    if (rankDiff !== 0) return rankDiff;
    return (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '');
  });
}
