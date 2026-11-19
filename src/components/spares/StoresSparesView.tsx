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
  Plus,
  BookOpen,
  Printer,
  ShieldCheck,
  Building,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  JobCard,
  SparePartItem,
  StoresRequisitionSlip,
  MaintenanceBookType
} from '../../types';
import { LogPhysicalStoresSlipModal } from './LogPhysicalStoresSlipModal';
import { PrintStoresSlipModal } from './PrintStoresSlipModal';

interface StoresSparesViewProps {
  jobCards: JobCard[];
  storesSlips?: StoresRequisitionSlip[];
  onSelectCard: (card: JobCard) => void;
  onIssueSparePart: (
    card: JobCard,
    partId: string,
    params: { issuedBy: string; storeVoucherNumber: string }
  ) => Promise<void>;
  onCreateStoresSlip?: (
    data: Omit<StoresRequisitionSlip, 'id' | 'createdAt' | 'status'>
  ) => Promise<void>;
  onVerifyStoresSlip?: (slip: StoresRequisitionSlip) => Promise<void>;
  currentUser?: string;
  canIssueSpares?: boolean;
}

interface FlattenedSparePart extends SparePartItem {
  parentCard: JobCard;
}

export const StoresSparesView: React.FC<StoresSparesViewProps> = ({
  jobCards,
  storesSlips = [],
  onSelectCard,
  onIssueSparePart,
  onCreateStoresSlip,
  onVerifyStoresSlip,
  currentUser = 'Elliot Mhlongo',
  canIssueSpares = true
}) => {
  // Main View Mode: Physical Books & Slips vs Line-Item Queue
  const [activeTab, setActiveTab] = useState<'slips' | 'items'>('slips');
  const [searchQuery, setSearchQuery] = useState('');

  // Slips Filters
  const [selectedBookType, setSelectedBookType] = useState<string>('ALL');
  const [selectedVerification, setSelectedVerification] = useState<string>('ALL');

  // Single Item Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Requested' | 'Issued'>('ALL');
  const [issuingPart, setIssuingPart] = useState<{ card: JobCard; part: SparePartItem } | null>(null);
  const [voucherNumber, setVoucherNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);

  // Modals
  const [isLogSlipModalOpen, setIsLogSlipModalOpen] = useState(false);
  const [selectedSlipForPrint, setSelectedSlipForPrint] = useState<StoresRequisitionSlip | null>(null);

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

  // Filtered Slips
  const filteredSlips = useMemo(() => {
    return storesSlips.filter((slip) => {
      if (selectedBookType !== 'ALL' && slip.bookType !== selectedBookType) return false;
      if (selectedVerification === 'VERIFIED' && !slip.hodVerification?.verified) return false;
      if (selectedVerification === 'PENDING' && slip.hodVerification?.verified) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSlip = slip.slipNumber?.toLowerCase().includes(q);
        const matchesCard = slip.jobCardNumber?.toLowerCase().includes(q);
        const matchesWO = slip.workOrderNumber?.toLowerCase().includes(q);
        const matchesEquip = slip.equipmentName?.toLowerCase().includes(q);
        const matchesArtisan = slip.requestedByArtisan?.toLowerCase().includes(q);
        const matchesItems = slip.items?.some((i) => i.description.toLowerCase().includes(q));
        if (!matchesSlip && !matchesCard && !matchesWO && !matchesEquip && !matchesArtisan && !matchesItems) {
          return false;
        }
      }
      return true;
    });
  }, [storesSlips, selectedBookType, selectedVerification, searchQuery]);

  // Filtered Spares (Item View)
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
  const verifiedSlipsCount = storesSlips.filter((s) => s.hodVerification?.verified).length;
  const pendingSlipsCount = storesSlips.filter((s) => !s.hodVerification?.verified).length;

  const handleOpenIssueModal = (card: JobCard, part: SparePartItem) => {
    setIssueError(null);
    setIssuingPart({ card, part });
    // Default voucher to next slip number format
    const nextNum = storesSlips.length > 0 ? String(302859 + storesSlips.length) : '302859';
    setVoucherNumber(nextNum);
  };

  const handleConfirmIssue = async () => {
    if (!issuingPart || !voucherNumber.trim()) return;
    setIsSubmitting(true);
    setIssueError(null);
    try {
      await onIssueSparePart(issuingPart.card, issuingPart.part.id, {
        issuedBy: currentUser,
        storeVoucherNumber: voucherNumber.trim()
      });
      setIssuingPart(null);
      setVoucherNumber('');
    } catch (err: any) {
      console.error('Error issuing spare part:', err);
      setIssueError(err?.message || 'Permission denied or failed to issue spare part.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Panel */}
      <div className="bg-white p-4 rounded-md border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-lg bg-amber-500/10 border border-amber-300 text-amber-800 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Stores Issue Requisitions & Maintenance Spares
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                Stores Officer: {currentUser}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Official Triplicate Book System (#302857) • Link withdrawn maintenance spares to active Job Cards
            </p>
          </div>
        </div>

        {/* Master Action & Stats */}
        <div className="flex items-center gap-2 text-xs">
          {onCreateStoresSlip && (
            <button
              onClick={() => setIsLogSlipModalOpen(true)}
              className="px-3.5 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
              title="Record a physical triplicate requisition slip from an artisan book"
            >
              <Plus className="w-4 h-4" />
              <span>📥 Log Stores Issue Slip (Book Entry)</span>
            </button>
          )}

          <div className="px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-2 hidden sm:flex">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Total Slips:</span>
            <span className="font-bold font-mono text-sm">{storesSlips.length}</span>
          </div>

          <div className="px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 hidden sm:flex">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>HOD Verified:</span>
            <span className="font-bold font-mono text-sm">{verifiedSlipsCount}</span>
          </div>
        </div>
      </div>

      {/* Primary Tab Switcher: Requisition Slips (Books) vs Item Master Queue */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 pt-2 rounded-t border-t border-x border-slate-200">
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setActiveTab('slips')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'slips'
                ? 'border-[#714B67] text-[#714B67]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Triplicate Requisition Slips (Books)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-mono font-bold">
              {storesSlips.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'items'
                ? 'border-[#714B67] text-[#714B67]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Line-Item Spares Queue</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono font-bold">
              {allSpares.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px] pb-2">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'slips'
                ? 'Search slip #302857, artisan, WO #...'
                : 'Search part name, part #, machine...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 border border-slate-300 rounded text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: TRIPLICATE REQUISITION SLIPS (BOOKS & VOUCHERS)                   */}
      {/* ========================================================================= */}
      {activeTab === 'slips' && (
        <div className="space-y-3">
          {/* Sub-Filters for Slips: Book Origin & Verification */}
          <div className="bg-white p-2.5 rounded border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-1.5 overflow-x-auto">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Book:</span>
              {(['ALL', 'Mechanical', 'Electrical', 'Boilers', 'Instrumentation'] as const).map((book) => (
                <button
                  key={book}
                  onClick={() => setSelectedBookType(book)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                    selectedBookType === book
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {book === 'ALL' ? 'All Team Books' : `${book} Book`}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">HOD Review:</span>
              <button
                onClick={() => setSelectedVerification('ALL')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                  selectedVerification === 'ALL'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Slips
              </button>
              <button
                onClick={() => setSelectedVerification('PENDING')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                  selectedVerification === 'PENDING'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Pending HOD ({pendingSlipsCount})</span>
              </button>
              <button
                onClick={() => setSelectedVerification('VERIFIED')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                  selectedVerification === 'VERIFIED'
                    ? 'bg-emerald-700 text-white font-bold'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Verified ({verifiedSlipsCount})</span>
              </button>
            </div>
          </div>

          {/* Slips Grid Cards */}
          {filteredSlips.length === 0 ? (
            <div className="bg-white p-12 rounded border border-slate-200 text-center text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <div className="font-bold text-slate-700 text-sm">No Requisition Slips Found</div>
              <p className="text-xs text-slate-500 mt-1">
                Click "Log Stores Issue Slip (Book Entry)" above to record physical vouchers like slip #302857.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredSlips.map((slip) => {
                const linkedCard = jobCards.find(
                  (c) => c.id === slip.jobCardId || c.jobCardNumber === slip.jobCardNumber
                );
                const isVerified = Boolean(slip.hodVerification?.verified);

                return (
                  <div
                    key={slip.id}
                    className="bg-white rounded-lg border border-slate-300 shadow-2xs hover:shadow-xs transition p-4 flex flex-col justify-between space-y-3"
                  >
                    {/* Slip Card Top: Serial # in RED + Book Type + Date */}
                    <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xl font-black text-[#d32f2f] tracking-wider">
                          #{slip.slipNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          {slip.bookType} Book
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-xs text-slate-600 block">{slip.date}</span>
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> Verified by HOD
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                            <Clock className="w-3 h-3" /> Pending HOD
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Linked Work Order & Equipment */}
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-purple-900 font-mono">
                            {slip.jobCardNumber}
                          </span>
                          {slip.workOrderNumber && (
                            <span className="bg-red-100 text-red-800 font-mono font-bold text-[10px] px-1 rounded border border-red-200">
                              WO #{slip.workOrderNumber}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-slate-600 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                          {slip.costCenter}
                        </span>
                      </div>

                      <div className="font-semibold text-slate-900 text-xs truncate">
                        {slip.equipmentName}
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Requested by: <strong>{slip.requestedByArtisan}</strong></span>
                        <span>Issued by: <strong>{slip.issuerSignature}</strong></span>
                      </div>
                    </div>

                    {/* Goods Withdrawn List Preview */}
                    <div className="space-y-1 text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Withdrawn Spares ({slip.items.length} items):
                      </span>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {slip.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200 text-[11px]"
                          >
                            <span className="font-medium text-slate-800 line-clamp-1">
                              {item.description}
                            </span>
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.2 rounded shrink-0 ml-2">
                              {item.quantity}x
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      {linkedCard ? (
                        <button
                          type="button"
                          onClick={() => onSelectCard(linkedCard)}
                          className="text-[#714B67] hover:underline font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open Job Card</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">Direct Stores Slip</span>
                      )}

                      <div className="flex items-center gap-1.5">
                        {!isVerified && onVerifyStoresSlip && (
                          <button
                            type="button"
                            onClick={() => onVerifyStoresSlip(slip)}
                            className="px-2 py-1 rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            title="Verify Copies 1 & 2 as HOD"
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Verify</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedSlipForPrint(slip)}
                          className="px-2.5 py-1 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Printer className="w-3 h-3" />
                          <span>View / Print Slip</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: LINE-ITEM MASTER QUEUE (FOR STOCK PICKING & BIN AUDIT)            */}
      {/* ========================================================================= */}
      {activeTab === 'items' && (
        <div className="space-y-3">
          {/* Sub-Filters for Line Items */}
          <div className="bg-white p-2.5 rounded border border-slate-200 flex items-center space-x-1.5 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-[#714B67] text-white font-semibold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              All Items ({allSpares.length})
            </button>
            <button
              onClick={() => setStatusFilter('Requested')}
              className={`px-3 py-1 rounded font-medium transition cursor-pointer flex items-center gap-1.5 ${
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
              className={`px-3 py-1 rounded font-medium transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'Issued'
                  ? 'bg-emerald-700 text-white font-bold'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Issued with Voucher ({issuedCount})</span>
            </button>
          </div>

          {/* Spares Table */}
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
                    <th className="py-2.5 px-3">Store Voucher / Slip #</th>
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
                            {part.storeVoucherNumber || part.requisitionSlipNumber ? (
                              <span className="font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 text-[11px]">
                                #{part.storeVoucherNumber || part.requisitionSlipNumber}
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
                            ) : canIssueSpares ? (
                              <button
                                onClick={() => handleOpenIssueModal(card, part)}
                                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs cursor-pointer flex items-center gap-1 ml-auto"
                              >
                                <Package className="w-3 h-3" />
                                <span>Issue Part</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                Stores Officer Only
                              </span>
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
        </div>
      )}

      {/* 1. Log Physical Stores Slip Modal */}
      {onCreateStoresSlip && (
        <LogPhysicalStoresSlipModal
          isOpen={isLogSlipModalOpen}
          onClose={() => setIsLogSlipModalOpen(false)}
          onSubmit={onCreateStoresSlip}
          existingCards={jobCards}
          existingSlips={storesSlips}
          currentUser={currentUser}
        />
      )}

      {/* 2. Print Authentic Physical Stores Slip Replica Modal */}
      <PrintStoresSlipModal
        slip={selectedSlipForPrint}
        isOpen={Boolean(selectedSlipForPrint)}
        onClose={() => setSelectedSlipForPrint(null)}
        onVerifyHOD={onVerifyStoresSlip}
        currentUserName={currentUser}
      />

      {/* 3. Single-item Quick Issuance Modal */}
      {issuingPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Issue Spares (Stores Requisition Slip Entry)
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
                  Stores Requisition Slip Number (Red Serial #) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={voucherNumber}
                  onChange={(e) => setVoucherNumber(e.target.value)}
                  placeholder="e.g. 302857"
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-extrabold text-red-600 text-base focus:outline-none focus:ring-1 focus:ring-amber-600"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Enter the pre-printed red serial number from the artisan's physical book slip
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

              {issueError && (
                <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{issueError}</span>
                </div>
              )}
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
