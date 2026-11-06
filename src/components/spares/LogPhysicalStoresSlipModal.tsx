import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Package,
  Check,
  RotateCw,
  AlertTriangle,
  BookOpen,
  Hash,
  User,
  Calendar,
  Building,
  Sparkles
} from 'lucide-react';
import {
  JobCard,
  StoresRequisitionSlip,
  StoresSlipItem,
  MaintenanceBookType
} from '../../types';

interface LogPhysicalStoresSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: Omit<StoresRequisitionSlip, 'id' | 'createdAt' | 'status'>
  ) => Promise<void>;
  existingCards: JobCard[];
  existingSlips: StoresRequisitionSlip[];
  currentUser?: string;
}

const COMMON_COST_CENTERS = [
  '2100 - Boiler House (Steam Generation)',
  '2200 - Distillation Stillhouse & Column Loop',
  '2300 - Water Treatment Plant (WTP)',
  '2400 - Fermentation Plant & Agitators',
  '2500 - Molasses Storage & Offloading Bay',
  '2600 - Electrical Workshop & MCC Panels',
  '2700 - Mechanical Fitting Workshop',
  '2800 - Cooling Towers & Plant Utilities'
];

const COMMON_SPARES_SUGGESTIONS = [
  'SKF 6308-2RS C3 Deep Groove Ball Bearings',
  'SKF 6310-2RS C3 Deep Groove Ball Bearings',
  'SKF 6206-2RS Ball Bearings',
  'Burgmann Mechanical Seal MG1-35mm (Silicon/Silicon)',
  'Burgmann Mechanical Seal MG1-45mm',
  'Klinger C4400 2mm Gasket Sheet (Pre-cut flange)',
  'Klinger C4400 3mm Gasket Material',
  'Gland Packing 12mm PTFE Pure Graphite',
  'Gates Hi-Power II V-Belt B64',
  'Gates Hi-Power II V-Belt B68',
  'Fenner SPB 2500 Wedge Belt',
  'Schneider LC1D32M7 32A 220V Contactor',
  'Schneider LRD332 Thermal Overload Relay 23-32A',
  '35mm Bronze Boiler Feed Pump Impeller',
  'Stainless Steel Impeller Nut & Lock Washer Kit'
];

export const LogPhysicalStoresSlipModal: React.FC<LogPhysicalStoresSlipModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingCards,
  existingSlips,
  currentUser = 'Elliot Mhlongo'
}) => {
  // Suggest next slip number based on existing
  const defaultSlipNumber = React.useMemo(() => {
    if (existingSlips.length === 0) return '302859';
    const nums = existingSlips
      .map((s) => parseInt(s.slipNumber.replace(/\D/g, ''), 10))
      .filter((n) => !isNaN(n));
    if (nums.length === 0) return '302859';
    return String(Math.max(...nums) + 1);
  }, [existingSlips]);

  const [slipNumber, setSlipNumber] = useState(defaultSlipNumber);
  const [bookType, setBookType] = useState<MaintenanceBookType>('Mechanical');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [workOrderNumber, setWorkOrderNumber] = useState<string>('');
  const [equipmentName, setEquipmentName] = useState<string>('');
  const [department, setDepartment] = useState<string>('Utilities - Boiler House');
  const [costCenter, setCostCenter] = useState<string>(COMMON_COST_CENTERS[0]);
  const [requestedByArtisan, setRequestedByArtisan] = useState<string>('');
  const [issuerSignature, setIssuerSignature] = useState<string>(currentUser);
  const [receivedBySignature, setReceivedBySignature] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<StoresSlipItem[]>([
    { id: '1', quantity: 1, description: '', partNumber: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync default number when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSlipNumber(defaultSlipNumber);
      setErrorMsg(null);
    }
  }, [isOpen, defaultSlipNumber]);

  if (!isOpen) return null;

  // Handle selecting a Job Card from dropdown
  const handleSelectJobCard = (cardId: string) => {
    setSelectedCardId(cardId);
    const card = existingCards.find((c) => c.id === cardId);
    if (card) {
      setEquipmentName(card.equipmentName || '');
      setDepartment(card.department || 'Utilities - Boiler House');
      setWorkOrderNumber(card.workOrderNumber || '');
      if (card.assignedTo) {
        setRequestedByArtisan(card.assignedTo);
        setReceivedBySignature(card.assignedTo);
      }

      // Auto-assign matching Cost Center
      const deptLower = (card.department + ' ' + card.equipmentName).toLowerCase();
      if (deptLower.includes('boiler')) setCostCenter(COMMON_COST_CENTERS[0]);
      else if (deptLower.includes('distill') || deptLower.includes('still')) setCostCenter(COMMON_COST_CENTERS[1]);
      else if (deptLower.includes('water') || deptLower.includes('wtp')) setCostCenter(COMMON_COST_CENTERS[2]);
      else if (deptLower.includes('ferment')) setCostCenter(COMMON_COST_CENTERS[3]);
      else if (deptLower.includes('molasses')) setCostCenter(COMMON_COST_CENTERS[4]);
      else if (deptLower.includes('elect')) setCostCenter(COMMON_COST_CENTERS[5]);
      else setCostCenter(COMMON_COST_CENTERS[6]);

      // If card already had requested spares that aren't issued yet, pre-populate!
      if (card.sparesRequested && card.sparesRequested.length > 0) {
        const pending = card.sparesRequested.filter((p) => p.status === 'Requested');
        if (pending.length > 0) {
          setItems(
            pending.map((p, idx) => ({
              id: `item-pre-${idx}`,
              quantity: p.quantity,
              description: p.partDescription,
              partNumber: p.partNumber || ''
            }))
          );
        }
      }
    }
  };

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length}`,
        quantity: 1,
        description: '',
        partNumber: ''
      }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof StoresSlipItem, val: any) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: val } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    const trimmedSlip = slipNumber.trim();
    if (!trimmedSlip) {
      setErrorMsg('Stores Requisition Slip Number (red serial number) is strictly required.');
      return;
    }

    // Check duplicate slip number
    const isDuplicate = existingSlips.some(
      (s) => s.slipNumber.trim().toLowerCase() === trimmedSlip.toLowerCase()
    );
    if (isDuplicate) {
      setErrorMsg(
        `Physical Slip #${trimmedSlip} has already been logged in the system. Check the physical book to avoid double-charging inventory.`
      );
      return;
    }

    if (!selectedCardId) {
      setErrorMsg('Please select a target Work Order / Job Card to link this spares issue.');
      return;
    }

    const validItems = items.filter((i) => i.description.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      setErrorMsg('At least one spare part item with a description and quantity must be entered.');
      return;
    }

    const selectedCard = existingCards.find((c) => c.id === selectedCardId);

    setIsSubmitting(true);
    try {
      await onSubmit({
        slipNumber: trimmedSlip,
        bookType,
        date,
        jobCardId: selectedCardId,
        jobCardNumber: selectedCard?.jobCardNumber || 'JC-MANUAL',
        workOrderNumber: workOrderNumber.trim() || selectedCard?.workOrderNumber,
        equipmentName: equipmentName.trim() || selectedCard?.equipmentName || 'Plant Machinery',
        department,
        costCenter,
        requestedByArtisan: requestedByArtisan.trim() || 'Artisan On Duty',
        issuerSignature: issuerSignature.trim() || currentUser,
        receivedBySignature: receivedBySignature.trim() || requestedByArtisan.trim() || 'Artisan Recipient',
        items: validItems,
        notes: notes.trim()
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-[#fcfcf9] rounded-lg shadow-2xl border-2 border-slate-300 w-full max-w-2xl overflow-hidden my-4">
        {/* PHYSICAL SLIP HEADER (Faithful to stors2_5afe982c.pdf) */}
        <div className="bg-white border-b-2 border-slate-300 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-100 border border-slate-300 rounded flex flex-col items-center justify-center p-1">
              <span className="font-extrabold text-[12px] tracking-tight text-slate-800 leading-none">
                usa
              </span>
              <span className="text-[7px] font-bold tracking-widest text-slate-600 uppercase">
                DISTILLERS
              </span>
            </div>
            <div>
              <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-900">
                STORES ISSUE REQUISITION
              </h2>
              <span className="text-[11px] text-slate-500 font-medium block">
                Triplicate Book Issue Voucher • Stock Depletion Entry
              </span>
            </div>
          </div>

          {/* RED PRE-PRINTED SERIAL NUMBER */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">
                Voucher Serial #
              </span>
              <div className="relative flex items-center">
                <span className="absolute left-2 text-red-600 font-mono font-extrabold text-sm">#</span>
                <input
                  type="text"
                  required
                  value={slipNumber}
                  onChange={(e) => setSlipNumber(e.target.value)}
                  placeholder="302857"
                  className="pl-6 pr-2 py-1 w-28 text-right font-mono font-extrabold text-lg text-red-600 bg-red-50/50 border border-red-300 rounded focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BOOK ORIGIN & DATE SUB-HEADER */}
        <div className="bg-amber-50/80 border-b border-amber-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="font-bold text-amber-950">Team Requisition Book:</span>
            <select
              value={bookType}
              onChange={(e) => setBookType(e.target.value as MaintenanceBookType)}
              className="px-2 py-1 bg-white border border-amber-300 rounded font-semibold text-amber-900 focus:outline-none"
            >
              <option value="Mechanical">Mechanical Team Book</option>
              <option value="Electrical">Electrical Team Book</option>
              <option value="Boilers">Boilers & Steam Team Book</option>
              <option value="Instrumentation">Instrumentation Book</option>
              <option value="General">General / Plant Utilities Book</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium text-slate-700">Date:</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-2 py-0.5 border border-slate-300 rounded bg-white text-slate-800 font-mono text-xs"
            />
          </div>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Linked Job Card & Cost Center */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-3.5 rounded border border-slate-200">
            <div>
              <label className="block text-slate-800 font-bold mb-1">
                W.O. J.C. No. (Target Work Order / Job Card) <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedCardId}
                onChange={(e) => handleSelectJobCard(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
              >
                <option value="">-- Select Active Job Card --</option>
                {existingCards
                  .filter((c) => c.status !== 'Completed' && c.status !== 'Cancelled')
                  .map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.jobCardNumber}
                      {card.workOrderNumber ? ` (WO #${card.workOrderNumber})` : ''} •{' '}
                      {card.equipmentName} [{card.status}]
                    </option>
                  ))}
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Directly maps stock issuance to this maintenance work order
              </span>
            </div>

            <div>
              <label className="block text-slate-800 font-bold mb-1">
                Cost Ctr (Cost Centre) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                list="cost-centers-list"
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                placeholder="2100 - Boiler House"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#714B67]"
              />
              <datalist id="cost-centers-list">
                {COMMON_COST_CENTERS.map((cc) => (
                  <option key={cc} value={cc} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Equipment & Artisan Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Machinery Asset / Equipment Name
              </label>
              <input
                type="text"
                value={equipmentName}
                onChange={(e) => setEquipmentName(e.target.value)}
                placeholder="e.g. Boiler 1 Feed Water Pump 1"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                REQUESTED BY: (Artisan / Technician) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={requestedByArtisan}
                onChange={(e) => {
                  setRequestedByArtisan(e.target.value);
                  if (!receivedBySignature) setReceivedBySignature(e.target.value);
                }}
                placeholder="e.g. Ndumiso Shongwe"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-medium"
              />
            </div>
          </div>

          {/* GOODS DESCRIPTION & QTY TABLE (Matches the ruled paper slip) */}
          <div className="border-2 border-slate-300 rounded bg-white overflow-hidden shadow-2xs">
            <div className="bg-slate-100 border-b-2 border-slate-300 px-3 py-2 flex items-center justify-between text-slate-800">
              <span className="font-extrabold uppercase text-[11px] tracking-wider">
                WITHDRAWN SPARES & GOODS LIST
              </span>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="px-2.5 py-1 rounded bg-[#714B67] hover:bg-[#5b3c53] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Plus className="w-3 h-3" />
                <span>Add Item Line</span>
              </button>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                  <th className="py-2 px-3 text-center w-20 border-r border-slate-200">QTY</th>
                  <th className="py-2 px-3">GOODS DESCRIPTION (Size, Specs, Rating)</th>
                  <th className="py-2 px-3 w-40 border-l border-slate-200">Part # (Optional)</th>
                  <th className="py-2 px-2 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="py-2 px-2 border-r border-slate-200 text-center">
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)
                        }
                        className="w-16 px-2 py-1 text-center font-mono font-bold text-slate-900 border border-slate-300 rounded bg-white"
                      />
                    </td>

                    <td className="py-2 px-3">
                      <input
                        type="text"
                        required
                        list={`spares-list-${idx}`}
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="e.g. SKF 6308-2RS C3 Deep Groove Ball Bearings"
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-slate-900 font-medium placeholder:text-slate-400"
                      />
                      <datalist id={`spares-list-${idx}`}>
                        {COMMON_SPARES_SUGGESTIONS.map((sug) => (
                          <option key={sug} value={sug} />
                        ))}
                      </datalist>
                    </td>

                    <td className="py-2 px-2 border-l border-slate-200">
                      <input
                        type="text"
                        value={item.partNumber || ''}
                        onChange={(e) => handleItemChange(idx, 'partNumber', e.target.value)}
                        placeholder="BRG-6308"
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white font-mono text-[11px] text-slate-700"
                      />
                    </td>

                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        disabled={items.length <= 1}
                        className="text-slate-400 hover:text-red-600 disabled:opacity-20 cursor-pointer p-1"
                        title="Delete line"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SIGNATURES FOOTER (ISSUER SIGN & RECEIVED BY SIGN) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded border border-slate-200">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                ISSUER SIGN: (Storeman / Stores Officer) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={issuerSignature}
                onChange={(e) => setIssuerSignature(e.target.value)}
                placeholder="Elliot Mhlongo (Stores Officer)"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Custody holder authorizing physical stock withdrawal
              </span>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                RECEIVED BY SIGN: (Artisan / Technician) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={receivedBySignature}
                onChange={(e) => setReceivedBySignature(e.target.value)}
                placeholder="Artisan full name / signature"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Artisan accepting physical parts for machine repair
              </span>
            </div>
          </div>

          {/* Operational Notes */}
          <div>
            <label className="block text-slate-600 font-medium mb-1">
              Internal Stores Notes / Handover Comments
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Drawn during Sunday Stop Day breakdown maintenance; bin card #B14 updated"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-800 text-xs"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-2.5 rounded bg-red-50 border border-red-300 text-red-900 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <span className="text-[11px] text-slate-500 italic">
              📄 Duplicate copies will be flagged for HOD Antonio Miranda verification
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Stock Issue...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Authorize & Issue Slip #{slipNumber}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
