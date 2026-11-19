import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { AppNotification, AppNotificationSeverity, UserProfile } from '../types';

const NOTIFICATIONS_COLLECTION = 'notifications';

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

export function subscribeNotifications(
  onUpdate: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, NOTIFICATIONS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: AppNotification[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type || 'JOB_CARD_CREATED',
          title: data.title || 'Plant Notification',
          message: data.message || '',
          severity: (data.severity as AppNotificationSeverity) || 'INFO',
          jobCardId: data.jobCardId || undefined,
          jobCardNumber: data.jobCardNumber || undefined,
          department: data.department || undefined,
          targetRoles: Array.isArray(data.targetRoles) ? data.targetRoles : undefined,
          createdBy: data.createdBy || 'System',
          createdByUid: data.createdByUid || '',
          createdAt: data.createdAt || new Date().toISOString(),
          readByUids: Array.isArray(data.readByUids) ? data.readByUids : []
        };
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(items.slice(0, 50));
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, NOTIFICATIONS_COLLECTION);
      } catch (wrappedErr) {
        if (onError) onError(wrappedErr as Error);
      }
    }
  );
}

export async function emitAppNotification(input: {
  type: AppNotification['type'];
  title: string;
  message: string;
  severity: AppNotificationSeverity;
  jobCardId?: string;
  jobCardNumber?: string;
  department?: string;
  targetRoles?: UserProfile['role'][];
  createdBy?: string;
}): Promise<string | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;

  const docRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
  const payload = stripUndefinedDeep({
    type: input.type,
    title: input.title.slice(0, 120),
    message: input.message.slice(0, 400),
    severity: input.severity,
    jobCardId: input.jobCardId?.slice(0, 128),
    jobCardNumber: input.jobCardNumber?.slice(0, 50),
    department: input.department?.slice(0, 100),
    targetRoles: input.targetRoles?.slice(0, 6),
    createdBy: (input.createdBy || auth.currentUser?.displayName || auth.currentUser?.email || 'Authorized Staff').slice(0, 120),
    createdByUid: uid,
    createdAt: new Date().toISOString(),
    readByUids: [uid]
  });

  try {
    await setDoc(docRef, payload);
    maybeShowBrowserPushNotification(payload.title, payload.message);
    return docRef.id;
  } catch (err) {
    console.warn('Could not persist notification record:', err);
    return null;
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
  try {
    await updateDoc(docRef, {
      readByUids: arrayUnion(uid)
    });
  } catch (err) {
    console.warn('Could not mark notification read:', err);
  }
}

export async function markAllNotificationsRead(notifications: AppNotification[]): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const unread = notifications.filter((n) => !n.readByUids.includes(uid)).slice(0, 20);
  await Promise.all(unread.map((n) => markNotificationRead(n.id)));
}

export function getBrowserNotificationCapability(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await window.Notification.requestPermission();
    return result;
  } catch {
    return 'unsupported';
  }
}

export function maybeShowBrowserPushNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (window.Notification.permission !== 'granted') return;
  try {
    new window.Notification(title, {
      body,
      tag: 'usa-distillers-erp-alert'
    });
  } catch {
    // Sandboxed iframe environments may disallow native Notification constructor; silent fallback to in-app feed
  }
}
