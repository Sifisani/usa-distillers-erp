import React, { useState } from 'react';
import {
  Users,
  ChevronDown,
  ChevronRight,
  Shield,
  Briefcase,
  Mail,
  UserCheck,
  Building,
  CheckCircle2,
  Search,
  Filter,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  COMPANY_ORGANOGRAM,
  StaffMember,
  getStaffById,
  getDirectReports,
  getOrganogramTree
} from '../../core/master-data/organization';
import { useAuth } from '../../context/AuthContext';

export const OrganogramExplorer: React.FC = () => {
  const { userProfile, loginAsStaffMember } = useAuth();
  const [selectedStaffId, setSelectedStaffId] = useState<string>('staff-johan-smit');
  const [filterDepartment, setFilterDepartment] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'tree' | 'directory'>('tree');
  const [switchFeedback, setSwitchFeedback] = useState<string | null>(null);

  const selectedStaff = getStaffById(selectedStaffId) || COMPANY_ORGANOGRAM[0];
  const directReports = getDirectReports(selectedStaff.id);
  const reportsTo = selectedStaff.reportsToId ? getStaffById(selectedStaff.reportsToId) : null;

  const handleSwitchUser = (staffId: string, staffName: string) => {
    loginAsStaffMember(staffId);
    setSwitchFeedback(`Active session switched to ${staffName}`);
    setTimeout(() => setSwitchFeedback(null), 3000);
  };

  const filteredStaff = COMPANY_ORGANOGRAM.filter((member) => {
    const matchesDept =
      filterDepartment === 'All' ||
      member.departmentCategory.toLowerCase() === filterDepartment.toLowerCase() ||
      member.department.toLowerCase().includes(filterDepartment.toLowerCase());
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'Chairman':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
      case 'Managing Director':
        return 'bg-purple-100 text-[#714B67] border-purple-300 font-bold';
      case 'Director':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300 font-semibold';
      case 'Manager':
        return 'bg-blue-100 text-blue-900 border-blue-300 font-medium';
      case 'Assistant Manager':
        return 'bg-teal-100 text-teal-900 border-teal-300 font-medium';
      case 'Supervisor':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  // Group members under Johan Smit (Operations Director)
  const johanReports = getDirectReports('staff-johan-smit');
  const chairman = getStaffById('staff-joe-caldeira')!;
  const md = getStaffById('staff-haydn-rencken')!;
  const directors = getDirectReports('staff-haydn-rencken');

  return (
    <div className="bg-white rounded-md border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-[#714B67]" />
            <h3 className="font-bold text-sm text-slate-800">
              Company Organogram & Leadership Governance
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-[#714B67]">
              {COMPANY_ORGANOGRAM.length} Appointed Leaders
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Executive chain of command, operational reporting hierarchy, and department sign-off authorities.
          </p>
        </div>

        {/* View Toggle & Quick Filter */}
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-slate-200 bg-white p-0.5 text-xs">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1 rounded cursor-pointer font-medium transition ${
                viewMode === 'tree' ? 'bg-[#714B67] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hierarchy Tree
            </button>
            <button
              onClick={() => setViewMode('directory')}
              className={`px-3 py-1 rounded cursor-pointer font-medium transition ${
                viewMode === 'directory' ? 'bg-[#714B67] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Directory Grid
            </button>
          </div>
        </div>
      </div>

      {/* Switch Feedback Toast */}
      {switchFeedback && (
        <div className="p-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs flex items-center justify-between px-4">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{switchFeedback}</span>
          </div>
          <span className="text-[11px] text-emerald-600">Dev Persona Active</span>
        </div>
      )}

      {/* Main Content Layout: Tree/Directory + Detail Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Left Side: Tree or Directory */}
        <div className="lg:col-span-8 p-4 max-h-[620px] overflow-y-auto space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search leader by name, title, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
              />
            </div>

            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
            >
              <option value="All">All Departments</option>
              <option value="Production">Production</option>
              <option value="Engineering">Engineering / Maintenance</option>
              <option value="Utilities">Utilities</option>
              <option value="Transport Workshop">Transport Workshop</option>
              <option value="Civils">Civils</option>
              <option value="Stores">Stores & Spares</option>
              <option value="Logistics">Logistics</option>
              <option value="Safety">Safety & Compliance</option>
              <option value="Administration">Administration & Governance</option>
              <option value="Security">Security & Loss Prevention</option>
            </select>
          </div>

          {/* VIEW MODE: TREE */}
          {viewMode === 'tree' && !searchQuery && filterDepartment === 'All' ? (
            <div className="space-y-3 font-sans text-xs">
              {/* Tier 1: Group Executive Chairman */}
              <div className="space-y-1">
                <div
                  onClick={() => setSelectedStaffId(chairman.id)}
                  className={`p-2.5 rounded border transition cursor-pointer flex items-center justify-between ${
                    selectedStaffId === chairman.id
                      ? 'bg-purple-50/70 border-[#714B67] ring-1 ring-[#714B67]/30'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="w-6 h-6 rounded-full bg-amber-700 text-white text-[10px] font-bold flex items-center justify-center">
                      JC
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        {chairman.name}
                        {userProfile?.displayName?.includes(chairman.name) && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">{chairman.title}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] border ${getLevelBadge(chairman.level)}`}>
                    {chairman.level}
                  </span>
                </div>

                {/* Vertical connector */}
                <div className="pl-6 border-l-2 border-slate-300 ml-4 py-1 space-y-1">
                  {/* Tier 2: Managing Director */}
                  <div
                    onClick={() => setSelectedStaffId(md.id)}
                    className={`p-2.5 rounded border transition cursor-pointer flex items-center justify-between ${
                      selectedStaffId === md.id
                        ? 'bg-purple-50/70 border-[#714B67] ring-1 ring-[#714B67]/30'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#714B67] text-white text-[10px] font-bold flex items-center justify-center">
                        HR
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          {md.name}
                          {userProfile?.displayName?.includes(md.name) && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{md.title}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] border ${getLevelBadge(md.level)}`}>
                      {md.level}
                    </span>
                  </div>

                  {/* Tier 3: Directors under Managing Director */}
                  <div className="pl-6 border-l-2 border-purple-200 ml-3 py-1 space-y-2">
                    {directors.map((director: StaffMember) => {
                      const isSelected = selectedStaffId === director.id;
                      const hasSubDepartments = director.id === 'staff-johan-smit' || director.id === 'staff-john-creamer';
                      const subs = getDirectReports(director.id);

                      return (
                        <div key={director.id} className="space-y-1">
                          <div
                            onClick={() => setSelectedStaffId(director.id)}
                            className={`p-2.5 rounded border transition cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-purple-50/70 border-[#714B67] ring-1 ring-[#714B67]/30'
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className={`w-5 h-5 rounded-full ${director.avatarColor} text-white text-[9px] font-bold flex items-center justify-center`}>
                                {director.name.split(' ').map((n: string) => n[0]).join('')}
                              </span>
                              <div>
                                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                  {director.name}
                                  {userProfile?.displayName?.includes(director.name) && (
                                    <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-1 rounded">
                                      You
                                    </span>
                                  )}
                                </span>
                                <span className="text-[10px] text-slate-500 block">{director.title}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {subs.length > 0 && (
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-200/60 px-1.5 py-0.2 rounded">
                                  {subs.length} direct reports
                                </span>
                              )}
                              <span className={`px-1.5 py-0.5 rounded text-[9px] border ${getLevelBadge(director.level)}`}>
                                {director.level}
                              </span>
                            </div>
                          </div>

                          {/* Operations Directorate Branch (Johan Smit) */}
                          {hasSubDepartments && (
                            <div className="pl-5 border-l-2 border-indigo-200 ml-2 py-1 space-y-1">
                              {subs.map((mgr: StaffMember) => {
                                const isMgrSelected = selectedStaffId === mgr.id;
                                const sups = getDirectReports(mgr.id);

                                return (
                                  <div key={mgr.id} className="space-y-1">
                                    <div
                                      onClick={() => setSelectedStaffId(mgr.id)}
                                      className={`p-2 rounded border transition cursor-pointer flex items-center justify-between ${
                                        isMgrSelected
                                          ? 'bg-purple-50/80 border-[#714B67]'
                                          : 'bg-white border-slate-200 hover:border-slate-300'
                                      }`}
                                    >
                                      <div className="flex items-center space-x-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        <div>
                                          <div className="font-semibold text-slate-800 text-[11px] flex items-center gap-1">
                                            {mgr.name}
                                            {userProfile?.displayName?.includes(mgr.name) && (
                                              <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-1 rounded">
                                                You
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[10px] text-slate-400">{mgr.title}</div>
                                        </div>
                                      </div>
                                      <span className={`px-1.5 py-0.2 rounded text-[9px] border ${getLevelBadge(mgr.level)}`}>
                                        {mgr.level}
                                      </span>
                                    </div>

                                    {/* Supervisors under this manager */}
                                    {sups.length > 0 && (
                                      <div className="pl-4 border-l border-slate-200 ml-2 space-y-1">
                                        {sups.map((sup: StaffMember) => {
                                          const isSupSelected = selectedStaffId === sup.id;
                                          return (
                                            <div
                                              key={sup.id}
                                              onClick={() => setSelectedStaffId(sup.id)}
                                              className={`p-1.5 rounded border transition cursor-pointer flex items-center justify-between text-[11px] ${
                                                isSupSelected
                                                  ? 'bg-purple-50 border-[#714B67]'
                                                  : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'
                                              }`}
                                            >
                                              <span className="text-slate-700 font-medium flex items-center gap-1.5">
                                                <span className="w-1 h-1 rounded-full bg-teal-500"></span>
                                                {sup.name}
                                                <span className="text-[10px] text-slate-400">({sup.title})</span>
                                                {userProfile?.displayName?.includes(sup.name) && (
                                                  <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-1 rounded">
                                                    You
                                                  </span>
                                                )}
                                              </span>
                                              <span className="text-[9px] text-slate-400 font-mono">
                                                Supervisor
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* VIEW MODE: DIRECTORY GRID */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {filteredStaff.map((member) => {
                const isSelected = selectedStaffId === member.id;
                return (
                  <div
                    key={member.id}
                    onClick={() => setSelectedStaffId(member.id)}
                    className={`p-3 rounded border transition cursor-pointer flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? 'bg-purple-50/80 border-[#714B67] ring-1 ring-[#714B67]/30'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className={`w-7 h-7 rounded-full ${member.avatarColor} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>
                          {member.name.split(' ').map((n: string) => n[0]).join('')}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1">
                            {member.name}
                            {userProfile?.displayName?.includes(member.name) && (
                              <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-1 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{member.title}</div>
                        </div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] border shrink-0 ${getLevelBadge(member.level)}`}>
                        {member.level}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-1.5">
                      <span>{member.department}</span>
                      {member.reportsToName && (
                        <span>Reports: {member.reportsToName.split(' ')[0]}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Selected Staff Deep Dive & Impersonate Card */}
        <div className="lg:col-span-4 p-5 bg-slate-50/50 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-[#714B67]" />
              Official Role Credentials
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] border ${getLevelBadge(selectedStaff.level)}`}>
              {selectedStaff.level}
            </span>
          </div>

          {/* Profile Header */}
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full ${selectedStaff.avatarColor} text-white text-base font-bold flex items-center justify-center shadow-xs shrink-0`}>
              {selectedStaff.name.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{selectedStaff.name}</h4>
              <p className="text-xs text-[#714B67] font-semibold">{selectedStaff.title}</p>
              <p className="text-[11px] text-slate-500">{selectedStaff.department}</p>
            </div>
          </div>

          {/* Quick Impersonate in DEV */}
          <div className="p-3 bg-white border border-slate-200 rounded space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Active Session Control
              </span>
              {userProfile?.displayName?.includes(selectedStaff.name) ? (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Currently Logged In
                </span>
              ) : (
                <button
                  onClick={() => handleSwitchUser(selectedStaff.id, selectedStaff.name)}
                  className="px-2.5 py-1 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white text-[11px] font-semibold shadow-2xs transition cursor-pointer flex items-center gap-1"
                >
                  <span>Sign In As {selectedStaff.name.split(' ')[0]}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              Switching personas in dev enables testing department job card creation, labor logging, and supervisor approval authority.
            </p>
          </div>

          {/* Reporting Hierarchy Details */}
          <div className="space-y-2 text-xs">
            <div className="p-2.5 bg-white border border-slate-200 rounded space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Direct Line Manager
              </span>
              {reportsTo ? (
                <div
                  onClick={() => setSelectedStaffId(reportsTo.id)}
                  className="text-xs font-semibold text-[#714B67] hover:underline cursor-pointer flex items-center justify-between"
                >
                  <span>{reportsTo.name}</span>
                  <span className="text-[10px] text-slate-500 font-normal">{reportsTo.title}</span>
                </div>
              ) : (
                <span className="text-slate-500 italic">None (Group Chairman & Founder)</span>
              )}
            </div>

            <div className="p-2.5 bg-white border border-slate-200 rounded space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Direct Reports ({directReports.length})
              </span>
              {directReports.length === 0 ? (
                <span className="text-slate-400 italic text-[11px]">No direct managerial reports (Supervisory Line)</span>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {directReports.map((r: StaffMember) => (
                    <div
                      key={r.id}
                      onClick={() => setSelectedStaffId(r.id)}
                      className="p-1.5 rounded hover:bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px] cursor-pointer"
                    >
                      <span className="font-medium text-slate-800">{r.name}</span>
                      <span className="text-[10px] text-slate-400">{r.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Plant Operational Responsibilities */}
          <div className="p-3 bg-white border border-slate-200 rounded space-y-2 text-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Operational Responsibilities
            </span>
            <ul className="space-y-1 text-[11px] text-slate-600">
              {selectedStaff.responsibilities.map((resp, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#714B67] mt-1.5 shrink-0"></span>
                  <span>{resp}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div className="text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-slate-700">{selectedStaff.email}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Facility KY-03 • {selectedStaff.departmentCategory}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
