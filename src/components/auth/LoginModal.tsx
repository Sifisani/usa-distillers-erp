import React, { useState } from 'react';
import {
  Wrench,
  Shield,
  Mail,
  User,
  AlertCircle,
  X,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ALL_DEPARTMENTS, COMPANY_ORGANOGRAM } from '../../types';
import { firebaseRuntimeInfo } from '../../firebase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    loginAsDemoUser,
    loginAsStaffMember,
  } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Engineering - Mechanical Maintenance');
  const [role, setRole] = useState<'Supervisor' | 'Technician' | 'Manager' | 'Operator'>('Supervisor');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Sign-In failed or was cancelled.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Please enter your full staff name');
        await registerWithEmail(email, password, name, department, role);
      } else {
        await loginWithEmail(email, password);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (preset: 'supervisor' | 'technician' | 'manager' | 'operator' | 'director' | 'chairman') => {
    setError(null);
    try {
      await loginAsDemoUser(preset);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Please sign in with Google first to switch dev staff personas.');
    }
  };

  const handleStaffSelect = async (staffId: string) => {
    setError(null);
    try {
      await loginAsStaffMember(staffId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Please sign in with Google first to switch dev staff personas.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Enterprise Brand Header */}
        <div className="bg-[#714B67] text-white px-6 py-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded bg-white/10 border border-white/20 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">USA Distillers ERP</h2>
              <p className="text-xs text-white/80">Great Usuthu Plant — Asset & Maintenance</p>
            </div>
          </div>
          <div className="text-[11px] font-mono text-white/80 flex items-center justify-between gap-1.5 mt-2 bg-black/20 px-2 py-1 rounded border border-white/10">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Target: <strong className="text-emerald-300">{firebaseRuntimeInfo.projectId}</strong>
              </span>
            </span>
            <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-white/15 font-sans font-bold">
              {firebaseRuntimeInfo.environment}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Google SSO */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full mb-4 flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 py-2.5 px-4 rounded text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>Sign in with Google (Firebase Auth)</span>
          </button>

          {/* Non-Production Staff Persona Switcher */}
          {!firebaseRuntimeInfo.isProduction && (
            <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-md">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Dev Role Preview ({currentUser ? 'Auth Active' : 'Requires Auth'})</span>
                <span className="text-[10px] text-purple-700 font-normal">Organogram</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <button
                  type="button"
                  onClick={() => handleDemoLogin('supervisor')}
                  className="text-left p-2 rounded border border-slate-200 bg-white hover:border-[#714B67] hover:bg-purple-50/50 transition text-xs cursor-pointer group"
                >
                  <div className="font-semibold text-slate-800 group-hover:text-[#714B67] flex items-center justify-between">
                    <span>Sam Ngubeni</span>
                    <span className="text-[9px] bg-purple-100 text-purple-800 px-1 rounded">Supervisor</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">Maintenance Supervisor</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoLogin('manager')}
                  className="text-left p-2 rounded border border-slate-200 bg-white hover:border-[#714B67] hover:bg-purple-50/50 transition text-xs cursor-pointer group"
                >
                  <div className="font-semibold text-slate-800 group-hover:text-[#714B67] flex items-center justify-between">
                    <span>Antonio Miranda</span>
                    <span className="text-[9px] bg-[#714B67]/15 text-[#714B67] px-1 rounded font-bold">Manager</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">Engineering / Maintenance</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoLogin('director')}
                  className="text-left p-2 rounded border border-slate-200 bg-white hover:border-[#714B67] hover:bg-purple-50/50 transition text-xs cursor-pointer group"
                >
                  <div className="font-semibold text-slate-800 group-hover:text-[#714B67] flex items-center justify-between">
                    <span>Johan Smit</span>
                    <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1 rounded">Director</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">Operations Director</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoLogin('chairman')}
                  className="text-left p-2 rounded border border-slate-200 bg-white hover:border-[#714B67] hover:bg-purple-50/50 transition text-xs cursor-pointer group"
                >
                  <div className="font-semibold text-slate-800 group-hover:text-[#714B67] flex items-center justify-between">
                    <span>Joe Caldeira</span>
                    <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">Founder</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">Executive Chairman</div>
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Switch to Any Department Lead ({COMPANY_ORGANOGRAM.length} Members):
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleStaffSelect(e.target.value);
                    }
                  }}
                  defaultValue=""
                  className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded bg-white text-slate-800 focus:border-[#714B67] focus:outline-none"
                >
                  <option value="" disabled>-- Select Company Member --</option>
                  {COMPANY_ORGANOGRAM.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} — {member.title} ({member.departmentCategory})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
              Or Firebase Email Auth
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 mt-2">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Staff Full Name
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ndumiso Shongwe"
                      className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Department
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full text-xs px-2 py-2 border border-slate-300 rounded focus:border-[#714B67] focus:outline-none bg-white"
                    >
                      {ALL_DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      System Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full text-xs px-2 py-2 border border-slate-300 rounded focus:border-[#714B67] focus:outline-none bg-white"
                    >
                      <option value="Supervisor">Supervisor</option>
                      <option value="Technician">Technician</option>
                      <option value="Manager">Manager</option>
                      <option value="Operator">Operator</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Company Email
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="technician@usadistillers.com"
                  className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#714B67] hover:bg-[#5e3b55] text-white py-2 rounded text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer mt-2"
            >
              {loading
                ? 'Authenticating...'
                : isRegister
                ? 'Create ERP Account'
                : 'Sign In to USA Distillers ERP'}
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              {isRegister ? 'Already have an account?' : 'Need a new employee profile?'}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-[#714B67] font-semibold hover:underline cursor-pointer"
            >
              {isRegister ? 'Sign In' : 'Register New User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
