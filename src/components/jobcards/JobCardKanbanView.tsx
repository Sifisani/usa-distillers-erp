import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  Calendar,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Package,
  FileEdit,
  XCircle,
  MoreVertical
} from 'lucide-react';
import { JobCard, JobCardStatus, Priority } from '../../types';

interface JobCardKanbanViewProps {
  jobCards: JobCard[];
  onSelectCard: (card: JobCard) => void;
  onUpdateStatus: (card: JobCard, newStatus: JobCardStatus) => void;
  selectedDepartment: string;
  selectedPriority: string;
  searchQuery: string;
}

const COLUMNS: { id: JobCardStatus; title: string; color: string; border: string; bg: string }[] = [
  {
    id: 'Draft',
    title: 'Draft',
    color: 'text-slate-700',
    border: 'border-t-slate-400',
    bg: 'bg-slate-50'
  },
  {
    id: 'In Progress',
    title: 'In Progress',
    color: 'text-blue-700',
    border: 'border-t-blue-500',
    bg: 'bg-blue-50/30'
  },
  {
    id: 'Pending Spares',
    title: 'Pending Spares',
    color: 'text-amber-700',
    border: 'border-t-amber-500',
    bg: 'bg-amber-50/30'
  },
  {
    id: 'Completed',
    title: 'Completed',
    color: 'text-emerald-700',
    border: 'border-t-emerald-500',
    bg: 'bg-emerald-50/30'
  },
  {
    id: 'Cancelled',
    title: 'Cancelled',
    color: 'text-rose-700',
    border: 'border-t-rose-400',
    bg: 'bg-rose-50/30'
  }
];

export const JobCardKanbanView: React.FC<JobCardKanbanViewProps> = ({
  jobCards,
  onSelectCard,
  onUpdateStatus,
  selectedDepartment,
  selectedPriority,
  searchQuery
}) => {
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  // Filter cards
  const filteredCards = jobCards.filter((card) => {
    if (selectedDepartment && card.department !== selectedDepartment && !card.department.startsWith(selectedDepartment)) {
      return false;
    }
    if (selectedPriority && card.priority !== selectedPriority) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        card.jobCardNumber?.toLowerCase().includes(q) ||
        card.equipmentName?.toLowerCase().includes(q) ||
        card.department?.toLowerCase().includes(q) ||
        card.assignedTo?.toLowerCase().includes(q) ||
        card.description?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('text/plain', cardId);
    setDraggedCardId(cardId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: JobCardStatus) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain') || draggedCardId;
    if (cardId) {
      const card = jobCards.find((c) => c.id === cardId);
      if (card && card.status !== targetStatus) {
        onUpdateStatus(card, targetStatus);
      }
    }
    setDraggedCardId(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 select-none items-start pb-6">
      {COLUMNS.map((column) => {
        const columnCards = filteredCards.filter((card) => card.status === column.id);
        const columnHours = columnCards.reduce((acc, curr) => acc + (Number(curr.totalLaborHours) || 0), 0);

        return (
          <div
            key={column.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
            className={`rounded-md border border-slate-200 bg-[#f8f9fa] shadow-2xs flex flex-col min-h-[500px] border-t-3 ${column.border}`}
          >
            {/* Odoo Column Header */}
            <div className="p-2.5 border-b border-slate-200 flex items-center justify-between bg-white rounded-t">
              <div className="flex items-center space-x-2">
                <span className={`font-semibold text-xs ${column.color}`}>{column.title}</span>
                <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                  {columnCards.length}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {columnHours > 0 ? `${columnHours.toFixed(1)}h logged` : ''}
              </span>
            </div>

            {/* Column Cards Container */}
            <div className="p-2 space-y-2 flex-1">
              {columnCards.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded my-2">
                  No cards in {column.title}
                </div>
              ) : (
                columnCards.map((card) => {
                  const overdue = isOverdue(card.targetDate, card.status);

                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, card.id)}
                      onClick={() => onSelectCard(card)}
                      className={`bg-white rounded p-3 border border-slate-200 hover:border-[#714B67] hover:shadow-md transition cursor-pointer relative group ${
                        card.priority === 'Emergency' ? 'ring-1 ring-rose-400/50' : ''
                      }`}
                    >
                      {/* Card Top Row: JC#, WO# and Priority */}
                      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-[#714B67]">
                            {card.jobCardNumber}
                          </span>
                          {card.workOrderNumber && (
                            <span
                              title={`Logged from paper slip book #${card.workOrderNumber}`}
                              className="bg-red-50 text-red-700 font-mono font-bold text-[9px] px-1 rounded border border-red-200"
                            >
                              WO #{card.workOrderNumber}
                            </span>
                          )}
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] border inline-flex items-center gap-0.5 ${getPriorityBadge(card.priority)}`}>
                          {card.priority === 'Emergency' && <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />}
                          {card.priority}
                        </span>
                      </div>

                      {/* Equipment Name */}
                      <h4 className="text-xs font-semibold text-slate-800 line-clamp-1 mb-0.5">
                        {card.equipmentName}
                      </h4>

                      {/* Trade, Shift & Safety Badges */}
                      {(card.tradeRequired || card.shiftAssigned || card.safetyPermits?.lotoRequired || card.safetyPermits?.hotWorkRequired || card.requisitionStage) && (
                        <div className="flex flex-wrap items-center gap-1 mb-1.5 text-[10px]">
                          {card.requisitionStage && card.requisitionStage !== card.status && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 font-bold border border-amber-200">
                              {card.requisitionStage}
                            </span>
                          )}
                          {card.tradeRequired && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-medium border border-indigo-200">
                              {card.tradeRequired}
                            </span>
                          )}
                          {card.shiftAssigned && (
                            <span className="px-1 py-0.2 rounded bg-slate-100 text-slate-700 font-mono">
                              {card.shiftAssigned}
                            </span>
                          )}
                          {card.safetyPermits?.lotoRequired && (
                            <span title="LOTO Active" className="bg-amber-100 text-amber-900 px-1 py-0.2 rounded font-bold">
                              ⚡LOTO
                            </span>
                          )}
                          {card.safetyPermits?.hotWorkRequired && (
                            <span title="Hot Work Permit Active" className="text-rose-600 font-bold">
                              🔥
                            </span>
                          )}
                        </div>
                      )}

                      {/* Department / Inter-departmental Routing */}
                      <div className="text-[11px] text-slate-500 mb-2 truncate">
                        {card.originatingDepartment && card.recipientDepartment ? (
                          <span className="flex items-center gap-1 font-medium">
                            <span className="text-slate-700 truncate max-w-[90px]">{card.originatingDepartment.replace(/Operations - |Engineering & Maintenance - /, '')}</span>
                            <span className="text-slate-400 font-bold">&rarr;</span>
                            <span className="text-[#714B67] truncate max-w-[90px]">{card.recipientDepartment.replace(/Engineering & Maintenance - /, '')}</span>
                          </span>
                        ) : (
                          <span>{card.department}</span>
                        )}
                      </div>

                      {/* Description Snippet */}
                      <p className="text-[11px] text-slate-600 line-clamp-2 mb-2.5 bg-slate-50 p-1.5 rounded border border-slate-100">
                        {card.description}
                      </p>

                      {/* Card Bottom Meta */}
                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 text-slate-600">
                        {/* Assigned Tech */}
                        <div className="flex items-center space-x-1 truncate max-w-[120px]">
                          <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                            {card.assignedTo?.charAt(0) || 'U'}
                          </div>
                          <span className="truncate text-[10px]">{card.assignedTo}</span>
                        </div>

                        {/* Labor Hours */}
                        {card.totalLaborHours > 0 && (
                          <span className="font-mono text-[10px] text-[#714B67] font-semibold bg-purple-50 px-1 rounded">
                            {card.totalLaborHours.toFixed(1)}h
                          </span>
                        )}
                      </div>

                      {/* Target Date */}
                      <div className="mt-1.5 flex items-center justify-between text-[10px]">
                        <span className={`flex items-center gap-1 font-mono ${overdue ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                          <Calendar className="w-3 h-3" />
                          {card.targetDate || 'No date'}
                          {overdue && <span className="text-rose-500">(Overdue)</span>}
                        </span>

                        {/* Quick Shift Buttons */}
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                          {column.id !== 'Draft' && (
                            <button
                              title="Move back"
                              onClick={(e) => {
                                e.stopPropagation();
                                const prevStatus =
                                  column.id === 'Cancelled' ? 'In Progress' :
                                  column.id === 'Completed' ? 'In Progress' :
                                  column.id === 'Pending Spares' ? 'In Progress' : 'Draft';
                                onUpdateStatus(card, prevStatus);
                              }}
                              className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
                            >
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                          )}

                          {column.id !== 'Completed' && column.id !== 'Cancelled' && (
                            <button
                              title="Move forward"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextStatus =
                                  column.id === 'Draft' ? 'In Progress' :
                                  column.id === 'In Progress' ? 'Completed' : 'Completed';
                                onUpdateStatus(card, nextStatus);
                              }}
                              className="p-1 rounded hover:bg-purple-100 text-[#714B67] cursor-pointer"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
