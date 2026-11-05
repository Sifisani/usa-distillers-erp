import React, { useState, useMemo } from 'react';
import {
  Package,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  FileSpreadsheet,
  AlertTriangle,
  User,
  Hash,
  ExternalLink,
  Plus
} from 'lucide-react';
import { JobCard, SparePartItem } from '../../types';

interface StoresSparesViewProps {
  jobCards: JobCard[];
  onSelectCard: (card: JobCard) => void;
  onIssueSparePart: (
    card: JobCard,
    partId: string,
    params: { issuedBy: string; storeVoucherNumber: string }
  ) => Promise<void>;
  currentUser?: string;
}

interface FlattenedSparePart extends SparePartItem {
  parentCard: JobCard;
}

export const StoresSparesView: React.FC<StoresSparesViewProps> = ({
  jobCards,
  onSelectCard,
  onIssueSparePart,
  currentUser = 'Elliot Mhlongo'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Requested' | 'Issued'>('ALL');
  const [issuingPart, setIssuingPart] = useState<{ card: JobCard; part: SparePartItem } | null>(null);
  const [voucherNumber, setVoucherNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract all spare parts requested across all job cards
  const allSpares = useMemo(() => {
    const list: FlattenedSparePart[] = [];
    jobCards.forEach((card) => {
      if (card.sparesRequested && card.sparesRequested.length > 0) {
        card.sparesRequested.forEach((part) => {
          list.push({
            ...part,
            parentCard: card
          });
        });
      }
    });
    // Sort: Requested first, then by requestedAt desc
    return list.sort((a, b) => {
      if (a.status === 'Requested' && b.status !== 'Requested') return -1;
      if (a.status !== 'Requested' && b.status === 'Requested') return 1;
      return new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime();
    });
  }, [jobCards]);

  // Filtered spares
  const filteredSpares = useMemo(() => {
    return allSpares.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = p.partDescription?.toLowerCase().includes(q);
        const matchesPN = p.partNumber?.toLowerCase().includes(q);
        const matchesVoucher = p.storeVoucherNumber?.toLowerCase().includes(q);
        const matchesCard = p.parentCard.jobCardNumber?.toLowerCase().includes(q);
        const matchesWO = p.parentCard.workOrderNumber?.toLowerCase().includes(q);
        const matchesEquip = p.parentCard.equipmentName?.toLowerCase().includes(q);
        if (!matchesDesc && !matchesPN && !matchesVoucher && !matchesCard && !matchesWO && !matchesEquip) {
          return false;
        }
      }
      return true;
    });
  }, [allSpares, statusFilter, searchQuery]);

  const requestedCount = allSpares.filter((p) => p.status === 'Requested').length;
  const issuedCount = allSpares.filter((p) => p.status === 'Issued').length;
  const totalCost = allSpares.reduce((sum, p) => sum + ((p.unitCostEmalangeni || 0) * (p.quantity || 1)), 0);

  const handleOpenIssueModal = (card: JobCard, part: SparePartItem) => {
    setIssuingPart({ card, part });
    // Auto-generate placeholder voucher if not provided (e.g. SV-2026-XXXX)
    const randomVoucher = `SV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setVoucherNumber(randomVoucher);
  };

  const handleConfirmIssue = async () => {
    if (!issuingPart || !voucherNumber.trim()) return;
    setIsSubmitting(true);
    try {
      await onIssueSparePart(issuingPart.card, issuingPart.part.id, {
        issuedBy: currentUser,
        storeVoucherNumber: voucherNumber.trim()
      });
      setIssuingPart(null);
      setVoucherNumber('');
    } catch (err) {
      console.error('Error issuing spare part:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Panel */}
      <div className="bg-white p-4 rounded-md border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Stores & Spares Requisitions
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                Stores Officer: Elliot Mhlongo
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Track and issue technical spares for Works Orders with Store Voucher numbers
            </p>
          </div>
        </div>

        {/* Stats Chips */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Awaiting Spares:</span>
            <span className="font-bold font-mono text-sm">{requestedCount}</span>
          </div>

          <div className="px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Issued to Artisans:</span>
            <span className="font-bold font-mono text-sm">{issuedCount}</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-white p-3 rounded-md border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Status Filters */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded font-medium transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-[#714B67] text-white font-semibold'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            All Requests ({allSpares.length})
          </button>
          <button
            onClick={() => setStatusFilter('Requested')}
            className={`px-3 py-1.5 rounded font-medium transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'Requested'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Pending Issuance ({requestedCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('Issued')}
            className={`px-3 py-1.5 rounded font-medium transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'Issued'
                ? 'bg-emerald-700 text-white font-bold'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Issued with Voucher ({issuedCount})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search part name, part #, WO #, voucher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
          />
        </div>
      </div>

      {/* Main Spares Table */}
      <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold tracking-wider select-none">
                <th className="py-2.5 px-3">Part Description</th>
                <th className="py-2.5 px-3 text-center w-16">Qty</th>
                <th className="py-2.5 px-3">Job Card & WO #</th>
                <th className="py-2.5 px-3">Equipment / Machine</th>
                <th className="py-2.5 px-3">Requested By & Date</th>
                <th className="py-2.5 px-3">Store Voucher #</th>
                <th className="py-2.5 px-3 text-center w-28">Status</th>
                <th className="py-2.5 px-3 text-right w-36">Store Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSpares.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <div className="font-medium text-slate-600">No Spare Parts Requisitions Found</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      When artisans request spares on job cards, they appear in this queue for Elliot Mhlongo
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSpares.map((part) => {
                  const card = part.parentCard;
                  const isIssued = part.status === 'Issued';

                  return (
                    <tr
                      key={part.id}
                      className="hover:bg-slate-50 transition cursor-pointer"
                      onClick={() => onSelectCard(card)}
                    >
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        <div className="font-semibold text-slate-900">{part.partDescription}</div>
                        {part.partNumber && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            PN: {part.partNumber}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                        <span className="bg-slate-100 px-2 py-0.5 rounded">
                          {part.quantity}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-semibold text-[#714B67]">
                            {card.jobCardNumber}
                          </span>
                          {card.workOrderNumber && (
                            <span className="bg-red-50 text-red-700 font-mono font-bold text-[9px] px-1 rounded border border-red-200">
                              WO #{card.workOrderNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 max-w-[180px] truncate" title={card.equipmentName}>
                        <div className="truncate font-medium">{card.equipmentName}</div>
                        <div className="text-[10px] text-slate-400 truncate">{card.department}</div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        <div>{part.requestedBy}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {part.requestedAt ? new Date(part.requestedAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-mono">
                        {part.storeVoucherNumber ? (
                          <span className="font-bold text-slate-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[11px]">
                            {part.storeVoucherNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Awaiting issue</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {isIssued ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Issued
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-300 animate-pulse">
                            <Clock className="w-3 h-3 text-amber-700" />
                            Pending Spares
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {isIssued ? (
                          <span className="text-[11px] text-slate-500">
                            Issued by {part.issuedBy || 'Stores'}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenIssueModal(card, part)}
                            className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <Package className="w-3 h-3" />
                            <span>Issue Part</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stores Issuance Modal */}
      {issuingPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Issue Spares (Store Requisition Voucher)
                </h3>
              </div>
              <button
                onClick={() => setIssuingPart(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 rounded bg-amber-50 border border-amber-200 space-y-1">
                <div className="font-bold text-amber-950">
                  Part: {issuingPart.part.partDescription}
                </div>
                <div className="text-slate-700">
                  Quantity: <strong className="font-mono">{issuingPart.part.quantity} units</strong>
                </div>
                <div className="text-slate-600">
                  Target Machine: <strong>{issuingPart.card.equipmentName}</strong>
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  Job Card: {issuingPart.card.jobCardNumber} • WO #{issuingPart.card.workOrderNumber || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Official Store Voucher Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={voucherNumber}
                  onChange={(e) => setVoucherNumber(e.target.value)}
                  placeholder="e.g. SV-2026-4821"
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-600"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  This voucher number links Store Inventory to this maintenance work order
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Issued By (Stores Officer)
                </label>
                <input
                  type="text"
                  value={currentUser}
                  disabled
                  className="w-full px-3 py-1.5 border border-slate-200 rounded bg-slate-100 text-slate-700 font-medium cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIssuingPart(null)}
                className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !voucherNumber.trim()}
                onClick={handleConfirmIssue}
                className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer text-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Recording...' : 'Authorize & Issue Spares'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
