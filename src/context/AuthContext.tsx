import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { COMPANY_ORGANOGRAM, getStaffById } from '../core/master-data/organization';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
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
    uid: 'staff-stanley-matsenjwa',
    displayName: 'Stanley Matsenjwa',
    email: 's.matsenjwa@usadistillers.com',
    department: 'Engineering - Electrical & Instrumentation',
    role: 'Supervisor',
    title: 'Instrumentation Supervisor',
    level: 'Supervisor',
    avatarColor: 'bg-teal-500'
  },
  operator: {
    uid: 'staff-ncamiso-dlamini',
    displayName: 'Ncamiso Dlamini',
    email: 'n.dlamini@usadistillers.com',
    department: 'Production - Distillation Columns',
    role: 'Supervisor',
    title: 'Assistant Production Manager',
    level: 'Assistant Manager',
    avatarColor: 'bg-orange-500'
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('usa_distillers_active_profile');
    return saved ? JSON.parse(saved) : DEFAULT_DEMO_USERS.supervisor;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Try reading user profile from Firestore if it exists
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setUserProfile(data);
            localStorage.setItem('usa_distillers_active_profile', JSON.stringify(data));
            setLoading(false);
            return;
          }
        } catch {
          // If Firestore read fails or profile doesn't exist, use Auth object
        }

        const fallbackProfile: UserProfile = {
          uid: user.uid,
          email: user.email || 'operator@distillers-erp-dev.internal',
          displayName: user.displayName || user.email?.split('@')[0] || 'Distillery Staff',
          department: userProfile?.department || 'Engineering - Mechanical Maintenance',
          role: userProfile?.role || 'Supervisor',
          avatarColor: 'bg-indigo-600'
        };
        setUserProfile(fallbackProfile);
        localStorage.setItem('usa_distillers_active_profile', JSON.stringify(fallbackProfile));
      } else {
        // If not signed in with Firebase Auth, ensure active staff profile exists for the ERP workspace
        const active = localStorage.getItem('usa_distillers_active_profile');
        if (!active) {
          setUserProfile(DEFAULT_DEMO_USERS.supervisor);
          localStorage.setItem('usa_distillers_active_profile', JSON.stringify(DEFAULT_DEMO_USERS.supervisor));
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const profile: UserProfile = {
        uid: cred.user.uid,
        email: cred.user.email || email,
        displayName: cred.user.displayName || email.split('@')[0],
        department: 'Engineering - Mechanical Maintenance',
        role: 'Supervisor',
        avatarColor: 'bg-[#714B67]'
      };
      setUserProfile(profile);
      localStorage.setItem('usa_distillers_active_profile', JSON.stringify(profile));
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    name: string,
    dept: string,
    role: UserProfile['role'] = 'Technician'
  ) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });
      const profile: UserProfile = {
        uid: cred.user.uid,
        email,
        displayName: name,
        department: dept,
        role,
        avatarColor: 'bg-indigo-600'
      };

      // Also persist to users collection in Firestore
      try {
        await setDoc(doc(db, 'users', cred.user.uid), profile);
      } catch (err) {
        console.warn('Could not persist user doc:', err);
      }

      setUserProfile(profile);
      localStorage.setItem('usa_distillers_active_profile', JSON.stringify(profile));
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemoUser = async (preset: 'supervisor' | 'technician' | 'manager' | 'operator' | 'director' | 'chairman') => {
    const profile = DEFAULT_DEMO_USERS[preset] || DEFAULT_DEMO_USERS.supervisor;
    try {
      const cred = await signInAnonymously(auth);
      const activeProfile = {
        ...profile,
        uid: cred.user.uid
      };
      setUserProfile(activeProfile);
      localStorage.setItem('usa_distillers_active_profile', JSON.stringify(activeProfile));
    } catch {
      setUserProfile(profile);
      localStorage.setItem('usa_distillers_active_profile', JSON.stringify(profile));
    }
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
    try {
      const cred = await signInAnonymously(auth);
      const activeProfile = {
        ...profile,
        uid: cred.user.uid
      };
      setUserProfile(activeProfile);
      localStorage.setItem('usa_distillers_active_profile', JSON.stringify(activeProfile));
    } catch {
      setUserProfile(profile);
      localStorage.setItem('usa_distillers_active_profile', JSON.stringify(profile));
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // Ignored
    }
    setUserProfile(null);
    localStorage.removeItem('usa_distillers_active_profile');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
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
