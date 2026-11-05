import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Building,
  Printer,
  ChevronRight
} from 'lucide-react';
import { JobCard, RequisitionStage } from '../../types';

interface PhysicalSlipsViewProps {
  jobCards: JobCard[];
  onSelectCard: (card: JobCard) => void;
  onOpenQuickLog: () => void;
  onPrintCard: (card: JobCard) => void;
}

export const PhysicalSlipsView: React.FC<PhysicalSlipsViewProps> = ({
  jobCards,
  onSelectCard,
  onOpenQuickLog,
  onPrintCard
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');

  // Filter only cards that originated from physical paper slips or have a workOrderNumber
  const paperSlips = useMemo(() => {
    return jobCards.filter((c) => c.physicalSlipLogged === true || Boolean(c.workOrderNumber));
  }, [jobCards]);

  const filteredSlips = useMemo(() => {
    return paperSlips.filter((c) => {
      if (stageFilter !== 'ALL' && c.requisitionStage !== stageFilter && c.status !== stageFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesWO = c.workOrderNumber?.toLowerCase().includes(q);
        const matchesJC = c.jobCardNumber?.toLowerCase().includes(q);
        const matchesEquip = c.equipmentName?.toLowerCase().includes(q);
        const matchesDept = c.originatingDepartment?.toLowerCase().includes(q) || c.department?.toLowerCase().includes(q);
        const matchesOp = c.originatedBy?.toLowerCase().includes(q) || c.createdByName?.toLowerCase().includes(q);
        const matchesTech = c.assignedTo?.toLowerCase().includes(q);
        if (!matchesWO && !matchesJC && !matchesEquip && !matchesDept && !matchesOp && !matchesTech) {
          return false;
        }
      }
      return true;
    });
  }, [paperSlips, stageFilter, searchQuery]);

  const getStageBadge = (stage?: RequisitionStage | string) => {
    switch (stage) {
      case 'Pending Acceptance':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
      case 'Accepted':
        return 'bg-blue-100 text-blue-800 border-blue-200 font-semibold';
      case 'In Progress':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Pending Spares':
        return 'bg-orange-100 text-orange-800 border-orange-300 font-bold';
      case 'Artisan Completed':
        return 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
      case 'HOD Closed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Intake CTA */}
      <div className="bg-white p-4 rounded-md border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center justify-center font-mono font-bold text-base">
            WO
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Physical Works Requisitions (Paper Book Intake Archive)
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                Official Red Stamp Slips
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Registry of handwritten duplicate slips walked into the supervisor's office by plant assistants
            </p>
          </div>
        </div>

        <button
          onClick={onOpenQuickLog}
          className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-2 border border-amber-700 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Log New Paper Slip (30s Intake)</span>
        </button>
      </div>

      {/* Control Bar: Stages & Search */}
      <div className="bg-white p-3 rounded-md border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5">
          {['ALL', 'Pending Acceptance', 'Accepted', 'In Progress', 'Pending Spares', 'Artisan Completed', 'HOD Closed'].map((st) => {
            const isActive = stageFilter === st;
            const count =
              st === 'ALL'
                ? paperSlips.length
                : paperSlips.filter((c) => c.requisitionStage === st || c.status === st).length;

            return (
              <button
                key={st}
                onClick={() => setStageFilter(st)}
                className={`px-2.5 py-1 rounded transition cursor-pointer font-medium shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{st === 'ALL' ? 'All Paper Slips' : st}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive ? 'bg-white/20' : 'bg-white text-slate-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search WO #, Operator, Machine, Dept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
          />
        </div>
      </div>

      {/* Table of Paper Slips */}
      <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold tracking-wider select-none">
                <th className="py-2.5 px-3 w-28">WO Red Stamp #</th>
                <th className="py-2.5 px-3">Equipment / Asset</th>
                <th className="py-2.5 px-3">Routing (Origin → Recipient)</th>
                <th className="py-2.5 px-3">Operator / Raised By</th>
                <th className="py-2.5 px-3">Classification & Tag</th>
                <th className="py-2.5 px-3">Assigned Artisan</th>
                <th className="py-2.5 px-3 text-center">Stage</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSlips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <div className="font-medium text-slate-600">No Physical Paper Slips Logged</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Click "Log New Paper Slip" when an operator walks in with a carbon copy requisition slip
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSlips.map((card) => {
                  return (
                    <tr
                      key={card.id}
                      onClick={() => onSelectCard(card)}
                      className="hover:bg-slate-50 transition cursor-pointer"
                    >
                      <td className="py-2.5 px-3 font-mono">
                        <div className="text-red-700 font-extrabold text-sm flex items-center gap-1">
                          <span className="bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                            #{card.workOrderNumber || '188499'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {card.jobCardNumber}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-800 font-medium max-w-[200px]" title={card.equipmentName}>
                        <div className="truncate font-semibold">{card.equipmentName}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{card.description}</div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        <div className="flex items-center gap-1 font-medium">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 truncate max-w-[95px]">
                            {card.originatingDepartment?.replace(/Operations - |Engineering & Maintenance - /, '') || 'Operations'}
                          </span>
                          <span className="text-slate-400 font-bold">&rarr;</span>
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-[#714B67] font-semibold truncate max-w-[105px]">
                            {card.recipientDepartment?.replace(/Engineering & Maintenance - /, '') || 'Engineering'}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 text-[11px]">
                        <div className="font-medium">{card.originatedBy || card.createdByName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {card.originatedTime ? `Shift ${card.originatedTime}` : new Date(card.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium text-slate-700 border border-slate-200">
                          {card.requisitionType || 'Normal'}
                        </span>
                        {card.dangerTagNumber && (
                          <div className="text-[10px] text-amber-700 font-mono font-bold mt-0.5">
                            ⚡ Tag #{card.dangerTagNumber}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 text-[11px]">
                        <div className="font-medium">{card.assignedTo || 'Unassigned'}</div>
                        {card.tradeRequired && (
                          <div className="text-[10px] text-indigo-700 font-sans">
                            {card.tradeRequired}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] border ${getStageBadge(card.requisitionStage || card.status)}`}>
                          {card.requisitionStage || card.status}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Print Duplicate Physical Work Order Slip"
                            onClick={() => onPrintCard(card)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Open Details"
                            onClick={() => onSelectCard(card)}
                            className="p-1 rounded hover:bg-slate-200 text-[#714B67] cursor-pointer"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
