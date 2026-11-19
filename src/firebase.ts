import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import defaultAppletConfig from '../firebase-applet-config.json';

const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim();
const envAppId = import.meta.env.VITE_FIREBASE_APP_ID?.trim();

const hasEnvOverride = Boolean(envApiKey && envProjectId && envAppId);

export const activeFirebaseConfig = hasEnvOverride
  ? {
      apiKey: envApiKey as string,
      authDomain:
        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ||
        `${envProjectId}.firebaseapp.com`,
      projectId: envProjectId as string,
      storageBucket:
        import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() ||
        `${envProjectId}.firebasestorage.app`,
      messagingSenderId:
        import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || '',
      appId: envAppId as string,
      firestoreDatabaseId:
        import.meta.env.VITE_FIREBASE_DATABASE_ID?.trim() || '(default)',
    }
  : defaultAppletConfig;

const resolvedEnv = (
  import.meta.env.VITE_APP_ENV?.trim() ||
  (activeFirebaseConfig.projectId.toLowerCase().includes('prod')
    ? 'production'
    : 'development')
) as 'development' | 'staging' | 'production';

export const firebaseRuntimeInfo = {
  projectId: activeFirebaseConfig.projectId,
  databaseId: activeFirebaseConfig.firestoreDatabaseId || '(default)',
  environment: resolvedEnv,
  isProduction: resolvedEnv === 'production',
  configSource: hasEnvOverride
    ? ('env' as const)
    : ('firebase-applet-config.json' as const),
};

const app = getApps().length > 0 ? getApp() : initializeApp(activeFirebaseConfig);

export const db =
  activeFirebaseConfig.firestoreDatabaseId &&
  activeFirebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, activeFirebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validation connection test on startup as required by Firestore integration skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or starting up.');
    }
    return false;
  }
}

testConnection();
