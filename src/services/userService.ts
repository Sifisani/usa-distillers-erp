import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  deleteField
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';
import {
  canManageUserRoles,
  sortUserProfilesForDirectory,
  UserManagementActor,
  validateUserRoleUpdate
} from '../core/auth/userManagement';

const COLLECTION_NAME = 'users';

export function subscribeAllUserProfiles(
  actor: UserManagementActor | null | undefined,
  onUpdate: (users: UserProfile[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!canManageUserRoles(actor)) {
    onUpdate([]);
    return () => {};
  }

  const usersRef = collection(db, COLLECTION_NAME);
  return onSnapshot(
    usersRef,
    (snapshot) => {
      const profiles: UserProfile[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          uid: data.uid || d.id,
          email: data.email || '',
          displayName: data.displayName || data.email || 'Distillery Staff',
          department: data.department || 'Engineering - Mechanical Maintenance',
          role: data.role || 'Operator',
          title: data.title || undefined,
          staffId: data.staffId || undefined,
          level: data.level || undefined,
          avatarColor: data.avatarColor || undefined
        };
      });
      onUpdate(sortUserProfilesForDirectory(profiles));
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, COLLECTION_NAME);
      } catch (wrappedErr) {
        if (onError) onError(wrappedErr as Error);
      }
    }
  );
}

export async function updateUserRoleAndProfile(
  targetUser: UserProfile,
  updates: {
    role: UserProfile['role'];
    department: string;
    title?: string;
  },
  actor?: UserManagementActor | null
): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('Authentication required before modifying user access.');
  }

  const check = validateUserRoleUpdate(
    {
      targetUid: targetUser.uid,
      role: updates.role,
      department: updates.department,
      title: updates.title
    },
    actor
  );

  if (!check.valid || !check.normalized) {
    throw new Error(check.error || 'Invalid user access update.');
  }

  const userRef = doc(db, COLLECTION_NAME, targetUser.uid);
  const payload: Record<string, unknown> = {
    uid: targetUser.uid,
    email: (targetUser.email || '').slice(0, 150),
    displayName: (targetUser.displayName || targetUser.email || 'Distillery Staff').slice(0, 100),
    role: check.normalized.role,
    department: check.normalized.department,
    title: check.normalized.title ? check.normalized.title : deleteField()
  };

  try {
    await updateDoc(userRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${targetUser.uid}`);
    throw error;
  }
}
