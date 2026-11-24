import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  Factory,
  Lock,
  Mail,
  ShieldCheck,
  User,
  Users,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ALL_DEPARTMENTS, COMPANY_ORGANOGRAM } from '../../types';
import { firebaseRuntimeInfo } from '../../firebase';
import { getFriendlyAuthError } from '../../utils/authErrors';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const fieldClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10';

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    loginAsDemoUser,
    loginAsStaffMember
  } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Engineering - Mechanical Maintenance');
  const [role, setRole] = useState<'Supervisor' | 'Technician' | 'Manager' | 'Operator'>('Supervisor');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: unknown) {
      setError(getFriendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
    } catch (err: unknown) {
      setError(getFriendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (
    preset: 'supervisor' | 'technician' | 'manager' | 'operator' | 'director' | 'chairman'
  ) => {
    setError(null);
    setLoading(true);
    try {
      await loginAsDemoUser(preset);
      onClose();
    } catch (err: unknown) {
      setError(getFriendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSelect = async (staffId: string) => {
    if (!staffId) return;
    setError(null);
    setLoading(true);
    try {
      await loginAsStaffMember(staffId);
      onClose();
    } catch (err: unknown) {
      setError(getFriendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-in-title"
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_32px_100px_rgba(0,0,0,.35)]"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950 text-[#e3bf68]">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-950">USA Distillers ERP</p>
              <p className="text-xs text-slate-500">Great Usuthu Plant</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign-in dialog"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-6 sm:px-7 sm:py-7">
          <div className="mb-6">
            <h2 id="sign-in-title" className="text-2xl font-extrabold tracking-[-0.03em] text-slate-950">
              {isRegister ? 'Create your account' : 'Sign in to your workspace'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {isRegister
                ? 'Use your company details to request secure plant access.'
                : 'Use your company email and password, or continue with Google Workspace.'}
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm leading-5 text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isRegister && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:opacity-60"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.7 12.3c0-.7-.1-1.4-.2-2.1H12v4.5h6.6a5.7 5.7 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.6-5.2 3.6-9.1Z" />
                  <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9L16 18a7.2 7.2 0 0 1-10.8-3.8h-4v3.2A12 12 0 0 0 12 24Z" />
                  <path fill="#FBBC05" d="M5.2 14.2a7.2 7.2 0 0 1 0-4.4V6.6h-4A12 12 0 0 0 0 12c0 1.9.5 3.8 1.3 5.4l4-3.2Z" />
                  <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8L20 3.1A11.7 11.7 0 0 0 1.3 6.6l4 3.2A7.2 7.2 0 0 1 12 4.8Z" />
                </svg>
                Continue with Google Workspace
              </button>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Company email
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label htmlFor="staff-name" className="mb-1.5 block text-sm font-bold text-slate-700">
                    Full name
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="staff-name"
                      type="text"
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your full name"
                      className={`${fieldClass} pl-10`}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="staff-department" className="mb-1.5 block text-sm font-bold text-slate-700">
                      Department
                    </label>
                    <select
                      id="staff-department"
                      value={department}
                      onChange={(event) => setDepartment(event.target.value)}
                      className={fieldClass}
                    >
                      {ALL_DEPARTMENTS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="staff-role" className="mb-1.5 block text-sm font-bold text-slate-700">
                      Role
                    </label>
                    <select
                      id="staff-role"
                      value={role}
                      onChange={(event) => setRole(event.target.value as typeof role)}
                      className={fieldClass}
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
              <label htmlFor="company-email" className="mb-1.5 block text-sm font-bold text-slate-700">
                Company email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="company-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@usadistillers.com"
                  className={`${fieldClass} pl-10`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="company-password" className="mb-1.5 block text-sm font-bold text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="company-password"
                  type="password"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className={`${fieldClass} pl-10`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded-xl bg-[#123d2f] px-4 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#0d3025] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? 'Please wait…' : isRegister ? 'Create company account' : 'Sign in securely'}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-1.5 text-sm text-slate-500">
            <span>{isRegister ? 'Already have an account?' : 'New to the workspace?'}</span>
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="cursor-pointer font-bold text-emerald-800 hover:text-emerald-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              {isRegister ? 'Sign in' : 'Create an account'}
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-xs font-medium text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure, role-based plant access
          </div>

          {!firebaseRuntimeInfo.isProduction && (
            <details className="group mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-slate-600 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-800">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  Development preview tools
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-3 border-t border-slate-200 p-4">
                <p className="text-xs leading-5 text-slate-500">
                  Preview role-based experiences in this non-production environment.
                  {currentUser ? ' An authenticated session is active.' : ''}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['supervisor', 'Supervisor'],
                    ['manager', 'Manager'],
                    ['director', 'Director'],
                    ['chairman', 'Executive']
                  ].map(([preset, label]) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={loading}
                      onClick={() => handleDemoLogin(preset as 'supervisor' | 'manager' | 'director' | 'chairman')}
                      className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-bold text-slate-700 transition hover:border-emerald-700 hover:text-emerald-900 disabled:opacity-60"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div>
                  <label htmlFor="preview-staff" className="mb-1.5 block text-xs font-bold text-slate-600">
                    Preview another staff role
                  </label>
                  <select
                    id="preview-staff"
                    defaultValue=""
                    disabled={loading}
                    onChange={(event) => handleStaffSelect(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-700"
                  >
                    <option value="" disabled>Select a company member</option>
                    {COMPANY_ORGANOGRAM.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} — {member.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </details>
          )}
        </div>
      </section>
    </div>
  );
};
