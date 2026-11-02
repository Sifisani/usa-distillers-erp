import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  Layers,
  CheckCircle2,
  Trash2,
  Filter
} from 'lucide-react';
import { JobCard, JobCardStatus, Priority } from '../../types';

interface JobCardListViewProps {
  jobCards: JobCard[];
  onSelectCard: (card: JobCard) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  selectedDepartment: string;
  onDepartmentChange: (dept: string) => void;
  selectedPriority: string;
  onPriorityChange: (priority: string) => void;
  searchQuery: string;
}

type SortField = 'jobCardNumber' | 'department' | 'equipmentName' | 'priority' | 'status' | 'assignedTo' | 'targetDate' | 'totalLaborHours' | 'createdAt';

export const JobCardListView: React.FC<JobCardListViewProps> = ({
  jobCards,
  onSelectCard,
  statusFilter,
  onStatusFilterChange,
  selectedDepartment,
  onDepartmentChange,
  selectedPriority,
  onPriorityChange,
  searchQuery
}) => {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filtering logic
  const filteredCards = useMemo(() => {
    return jobCards.filter((card) => {
      // Status filter
      if (statusFilter !== 'ALL' && card.status !== statusFilter) {
        return false;
      }
      // Department filter
      if (selectedDepartment && card.department !== selectedDepartment && !card.department.startsWith(selectedDepartment)) {
        return false;
      }
      // Priority filter
      if (selectedPriority && card.priority !== selectedPriority) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesJC = card.jobCardNumber?.toLowerCase().includes(query);
        const matchesEquip = card.equipmentName?.toLowerCase().includes(query);
        const matchesDept = card.department?.toLowerCase().includes(query);
        const matchesTech = card.assignedTo?.toLowerCase().includes(query);
        const matchesDesc = card.description?.toLowerCase().includes(query);
        if (!matchesJC && !matchesEquip && !matchesDept && !matchesTech && !matchesDesc) {
          return false;
        }
      }
      return true;
    });
  }, [jobCards, statusFilter, selectedDepartment, selectedPriority, searchQuery]);

  // Sorting logic
  const sortedCards = useMemo(() => {
    return [...filteredCards].sort((a, b) => {
      let valA: any = a[sortField] || '';
      let valB: any = b[sortField] || '';

      if (sortField === 'totalLaborHours') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      }

      if (sortField === 'priority') {
        const priorityOrder: Record<Priority, number> = {
          Emergency: 4,
          High: 3,
          Medium: 2,
          Low: 1
        };
        valA = priorityOrder[a.priority] || 0;
        valB = priorityOrder[b.priority] || 0;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredCards, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedCards.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedCards.map((c) => c.id));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const getStatusBadge = (status: JobCardStatus) => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pending Spares':
        return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'Emergency':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300 font-semibold';
      case 'Medium':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Low':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const isOverdue = (targetDate: string, status: JobCardStatus) => {
    if (status === 'Completed' || status === 'Cancelled') return false;
    if (!targetDate) return false;
    const target = new Date(targetDate).setHours(23, 59, 59, 999);
    return target < Date.now();
  };

  return (
    <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Container */}
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold tracking-wider select-none">
              <th className="py-2.5 px-3 w-8 text-center">
                <input
                  type="checkbox"
                  checked={sortedCards.length > 0 && selectedIds.length === sortedCards.length}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-[#714B67] focus:ring-[#714B67] cursor-pointer"
                />
              </th>

              <th
                onClick={() => handleSort('jobCardNumber')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 transition"
              >
                <div className="flex items-center space-x-1">
                  <span>Job Card #</span>
                  {sortField === 'jobCardNumber' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-[#714B67]" /> : <ArrowDown className="w-3 h-3 text-[#714B67]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                  )}
                </div>
              </th>

              <th
                onClick={() => handleSort('equipmentName')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 transition"
              >
                <div className="flex items-center space-x-1">
                  <span>Equipment / Asset</span>
                  {sortField === 'equipmentName' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-[#714B67]" /> : <ArrowDown className="w-3 h-3 text-[#714B67]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                  )}
                </div>
              </th>

              <th
                onClick={() => handleSort('department')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 transition"
              >
                <div className="flex items-center space-x-1">
                  <span>Department</span>
                  {sortField === 'department' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-[#714B67]" /> : <ArrowDown className="w-3 h-3 text-[#714B67]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                  )}
                </div>
              </th>

              <th
                onClick={() => handleSort('priority')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 transition w-28"
              >
                <div className="flex items-center space-x-1">
                  <span>Priority</span>
                  {sortField === 'priority' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-[#714B67]" /> : <ArrowDown className="w-3 h-3 text-[#714B67]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                  )}
                </div>
              </th>

              <th
                onClick={() => handleSort('status')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 transition w-32"
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  {sortField === 'status' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-[#714B67]" /> : <ArrowDown className="w-3 h-3 text-[#714B67]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                  )}
                </div>
              </th>

              <th
                onClick={() => handleSort('assignedTo')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 transition"
              >
                <div className="flex items-center space-x-1">
                  <span>Assigned To</span>
                  {sortField === 'assignedTo' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-[#714B67]" /> : <ArrowDown className="w-3 h-3 text-[#714B67]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                  )}
                </div>
              </th>

              <th
                onClick={() => handleSort('targetDate')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 transition w-28"
              >
                <div className="flex items-center space-x-1">
                  <span>Target Date</span>
                  {sortField === 'targetDate' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-[#714B67]" /> : <ArrowDown className="w-3 h-3 text-[#714B67]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                  )}
                </div>
              </th>

              <th
                onClick={() => handleSort('totalLaborHours')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 transition text-right w-24"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Labor Hrs</span>
                  {sortField === 'totalLaborHours' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-[#714B67]" /> : <ArrowDown className="w-3 h-3 text-[#714B67]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                  )}
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {sortedCards.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <div className="font-medium text-slate-600">No Job Cards Match Criteria</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Try adjusting your status filter or search parameters
                  </div>
                </td>
              </tr>
            ) : (
              sortedCards.map((card) => {
                const isSelected = selectedIds.includes(card.id);
                const overdue = isOverdue(card.targetDate, card.status);

                return (
                  <tr
                    key={card.id}
                    onClick={() => onSelectCard(card)}
                    className={`hover:bg-[#f6f3f5] transition-colors cursor-pointer ${
                      isSelected ? 'bg-purple-50/60' : ''
                    } ${card.priority === 'Emergency' ? 'border-l-3 border-l-rose-500' : ''}`}
                  >
                    <td className="py-2.5 px-3 text-center" onClick={(e) => toggleSelectOne(card.id, e)}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-[#714B67] focus:ring-[#714B67] cursor-pointer"
                      />
                    </td>

                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>{card.jobCardNumber}</span>
                      {card.priority === 'Emergency' && (
                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-800 font-medium max-w-[200px] truncate" title={card.equipmentName}>
                      {card.equipmentName}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] text-slate-700 font-medium">
                        {card.department}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] border inline-flex items-center gap-1 ${getPriorityBadge(card.priority)}`}>
                        {card.priority === 'Emergency' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                        {card.priority}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border inline-flex items-center gap-1 ${getStatusBadge(card.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {card.status}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-700">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                          {card.assignedTo?.charAt(0) || 'U'}
                        </div>
                        <span className="truncate max-w-[140px]">{card.assignedTo}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className={`flex items-center space-x-1 font-mono text-[11px] ${overdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                        <Calendar className="w-3 h-3 opacity-70" />
                        <span>{card.targetDate || 'None'}</span>
                        {overdue && <span className="text-[10px] text-rose-500">(Late)</span>}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800">
                      <span className={`px-1.5 py-0.5 rounded ${card.totalLaborHours > 0 ? 'bg-purple-50 text-[#714B67]' : 'text-slate-400'}`}>
                        {card.totalLaborHours.toFixed(1)}h
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Odoo Table Footer / Pagination */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <div>
          {selectedIds.length > 0 ? (
            <span className="text-[#714B67] font-semibold">
              {selectedIds.length} of {sortedCards.length} selected
            </span>
          ) : (
            <span>Showing {sortedCards.length} total Job Cards</span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-slate-400 font-mono">1-{sortedCards.length} / {sortedCards.length}</span>
        </div>
      </div>
    </div>
  );
};
