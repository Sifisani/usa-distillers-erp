import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, firebaseRuntimeInfo } from '../firebase';
import { UserProfile } from '../types';
import { getStaffById } from '../core/master-data/organization';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, dept: string, role?: UserProfile['role']) => Promise<void>;
  loginAsDemoUser: (preset: 'supervisor' | 'technician' | 'manager' | 'operator' | 'director' | 'chairman') => Promise<void>;
  loginAsStaffMember: (staffId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const DEFAULT_DEMO_USERS: Record<string, UserProfile> = {
  supervisor: {
    uid: 'staff-sam-ngubeni',
    displayName: 'Sam Ngubeni',
    email: 's.ngubeni@usadistillers.com',
    department: 'Engineering - Mechanical Maintenance',
    role: 'Supervisor',
    title: 'Maintenance Supervisor',
    level: 'Supervisor',
    avatarColor: 'bg-purple-600'
  },
  manager: {
    uid: 'staff-antonio-miranda',
    displayName: 'Antonio Miranda',
    email: 'a.miranda@usadistillers.com',
    department: 'Engineering - Mechanical Maintenance',
    role: 'Manager',
    title: 'Engineering / Maintenance Manager',
    level: 'Manager',
    avatarColor: 'bg-[#714B67]'
  },
  director: {
    uid: 'staff-johan-smit',
    displayName: 'Johan Smit',
    email: 'j.smit@usadistillers.com',
    department: 'Plant Operations Directorate',
    role: 'Admin',
    title: 'Operations Director',
    level: 'Director',
    avatarColor: 'bg-indigo-700'
  },
  chairman: {
    uid: 'staff-joe-caldeira',
    displayName: 'Joe Caldeira',
    email: 'j.caldeira@usadistillers.com',
    department: 'Executive Governance',
    role: 'Admin',
    title: 'Group Executive Chairman & Founder',
    level: 'Chairman',
    avatarColor: 'bg-amber-700'
  },
  technician: {
    uid: 'staff-phumelele-maseko',
    displayName: 'Msebenzi Gamedze',
    email: 'm.gamedze@usadistillers.com',
    department: 'Engineering - Electrical & Instrumentation',
    role: 'Technician',
    title: 'Plant Electrician (Standby)',
    level: 'Artisan',
    avatarColor: 'bg-teal-500'
  },
  operator: {
    uid: 'staff-operator-boiler',
    displayName: 'Melusi Dlamini',
    email: 'm.dlamini.op@usadistillers.com',
    department: 'Utilities - Boiler House',
    role: 'Operator',
    title: 'Senior Boiler Operator',
    level: 'Operator',
    avatarColor: 'bg-orange-500'
  }
};

const PERSONA_STORAGE_KEY = 'usa_distillers_dev_persona';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // In non-production dev/staging mode, allow previously chosen organogram persona preview
        if (!firebaseRuntimeInfo.isProduction) {
          const savedPersona = localStorage.getItem(PERSONA_STORAGE_KEY);
          if (savedPersona) {
            try {
              const parsed = JSON.parse(savedPersona) as UserProfile;
              setUserProfile({ ...parsed, uid: user.uid });
              setLoading(false);
              return;
            } catch {
              localStorage.removeItem(PERSONA_STORAGE_KEY);
            }
          }
        }

        // Read authenticated user profile from Firestore if present
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setUserProfile(data);
            setLoading(false);
            return;
          }
        } catch {
          // Profile document may not exist yet for first-time Google sign-in
        }

        const isVerifiedPrimaryAdmin = user.email === 'sifisani@gmail.com' && user.emailVerified;
        const fallbackProfile: UserProfile = {
          uid: user.uid,
          email: user.email || `operator@${firebaseRuntimeInfo.projectId}.internal`,
          displayName: user.displayName || user.email?.split('@')[0] || 'Distillery Staff',
          department: 'Engineering - Mechanical Maintenance',
          role: isVerifiedPrimaryAdmin ? 'Admin' : 'Operator',
          avatarColor: 'bg-indigo-600'
        };
        setUserProfile(fallbackProfile);
      } else {
        // Strictly clear profile when no Firebase Auth session is active
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const user = cred.user;

      if (!firebaseRuntimeInfo.isProduction) {
        localStorage.removeItem(PERSONA_STORAGE_KEY);
      }

      const isVerifiedPrimaryAdmin = user.email === 'sifisani@gmail.com' && user.emailVerified;
      const defaultRole: UserProfile['role'] = isVerifiedPrimaryAdmin ? 'Admin' : 'Operator';

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const existingSnap = await getDoc(userDocRef);
        if (existingSnap.exists()) {
          setUserProfile(existingSnap.data() as UserProfile);
          return;
        }
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'Distillery User',
          department: 'Engineering - Mechanical Maintenance',
          role: defaultRole,
          avatarColor: 'bg-[#714B67]'
        };
        await setDoc(userDocRef, newProfile);
        setUserProfile(newProfile);
      } catch {
        setUserProfile({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'Distillery User',
          department: 'Engineering - Mechanical Maintenance',
          role: defaultRole,
          avatarColor: 'bg-[#714B67]'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      if (!firebaseRuntimeInfo.isProduction) {
        localStorage.removeItem(PERSONA_STORAGE_KEY);
      }

      const isVerifiedPrimaryAdmin = cred.user.email === 'sifisani@gmail.com' && cred.user.emailVerified;
      const defaultRole: UserProfile['role'] = isVerifiedPrimaryAdmin ? 'Admin' : 'Operator';

      try {
        const userDocRef = doc(db, 'users', cred.user.uid);
        const existingSnap = await getDoc(userDocRef);
        if (existingSnap.exists()) {
          setUserProfile(existingSnap.data() as UserProfile);
          return;
        }
        const newProfile: UserProfile = {
          uid: cred.user.uid,
          email: cred.user.email || email,
          displayName: cred.user.displayName || email.split('@')[0],
          department: 'Engineering - Mechanical Maintenance',
          role: defaultRole,
          avatarColor: 'bg-[#714B67]'
        };
        await setDoc(userDocRef, newProfile);
        setUserProfile(newProfile);
      } catch {
        setUserProfile({
          uid: cred.user.uid,
          email: cred.user.email || email,
          displayName: cred.user.displayName || email.split('@')[0],
          department: 'Engineering - Mechanical Maintenance',
          role: defaultRole,
          avatarColor: 'bg-[#714B67]'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    name: string,
    dept: string,
    _requestedRole?: UserProfile['role']
  ) => {
    if (firebaseRuntimeInfo.isProduction) {
      throw new Error('PROD_REGISTRATION_DISABLED');
    }

    setLoading(true);
    try {
      // Security requirement: self-registration never grants elevated roles; admins promote users via Firestore
      const assignedRole: UserProfile['role'] = 'Operator';
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });
      const profile: UserProfile = {
        uid: cred.user.uid,
        email,
        displayName: name,
        department: dept,
        role: assignedRole,
        avatarColor: 'bg-indigo-600'
      };

      try {
        await setDoc(doc(db, 'users', cred.user.uid), profile);
      } catch (err) {
        console.warn('Could not persist user doc:', err);
      }

      setUserProfile(profile);
    } finally {
      setLoading(false);
    }
  };

  const applyDevPersonaWithFirebaseAuth = async (profile: UserProfile) => {
    if (firebaseRuntimeInfo.isProduction) {
      throw new Error('PROD_PREVIEW_DISABLED');
    }

    const user = auth.currentUser || (await signInAnonymously(auth)).user;
    const activeProfile: UserProfile = { ...profile, uid: user.uid };
    setUserProfile(activeProfile);
    localStorage.setItem(PERSONA_STORAGE_KEY, JSON.stringify(activeProfile));

    try {
      const userRef = doc(db, 'users', user.uid);
      const existingSnap = await getDoc(userRef);
      if (!existingSnap.exists()) {
        await setDoc(userRef, {
          ...activeProfile,
          role: 'Operator'
        });
      }
    } catch {
      // Non-blocking in dev preview mode
    }
  };

  const loginAsDemoUser = async (preset: 'supervisor' | 'technician' | 'manager' | 'operator' | 'director' | 'chairman') => {
    const profile = DEFAULT_DEMO_USERS[preset] || DEFAULT_DEMO_USERS.supervisor;
    await applyDevPersonaWithFirebaseAuth(profile);
  };

  const loginAsStaffMember = async (staffId: string) => {
    const staff = getStaffById(staffId);
    if (!staff) return;
    const profile: UserProfile = {
      uid: staff.id,
      displayName: staff.name,
      email: staff.email,
      department: staff.department,
      role: staff.role,
      title: staff.title,
      level: staff.level,
      staffId: staff.id,
      avatarColor: staff.avatarColor
    };
    await applyDevPersonaWithFirebaseAuth(profile);
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // Ignored
    }
    setUserProfile(null);
    localStorage.removeItem(PERSONA_STORAGE_KEY);
    localStorage.removeItem('usa_distillers_active_profile');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        loginAsDemoUser,
        loginAsStaffMember,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
