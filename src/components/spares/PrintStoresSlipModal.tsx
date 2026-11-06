import React from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import { StoresRequisitionSlip } from '../../types';

interface PrintStoresSlipModalProps {
  slip: StoresRequisitionSlip | null;
  isOpen: boolean;
  onClose: () => void;
  onVerifyHOD?: (slip: StoresRequisitionSlip) => Promise<void>;
  currentUserName?: string;
}

export const PrintStoresSlipModal: React.FC<PrintStoresSlipModalProps> = ({
  slip,
  isOpen,
  onClose,
  onVerifyHOD,
  currentUserName = 'Antonio Miranda'
}) => {
  const [isVerifying, setIsVerifying] = React.useState(false);

  if (!isOpen || !slip) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleVerify = async () => {
    if (!onVerifyHOD) return;
    setIsVerifying(true);
    try {
      await onVerifyHOD(slip);
    } catch (e) {
      console.error('Verification error:', e);
    } finally {
      setIsVerifying(false);
    }
  };

  // Ensure table has at least 12 rows to faithfully replicate the ruled physical slip
  const displayItems = [...slip.items];
  const blankRowsCount = Math.max(0, 12 - displayItems.length);
  const blankRows = Array.from({ length: blankRowsCount });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 max-w-2xl w-full overflow-hidden my-4">
        {/* Modal Top Control Bar (Hidden during print) */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">
              Stores Issue Requisition Slip • Serial #{slip.slipNumber}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
              {slip.bookType} Team Book
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!slip.hodVerification?.verified && onVerifyHOD && (
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleVerify}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isVerifying ? 'Verifying...' : 'HOD Verify (Copies 1 & 2)'}</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AUTHENTIC 1:1 REPLICA OF THE PHYSICAL SLIP (Faithful to stors2_5afe982c.pdf) */}
        <div className="p-8 bg-[#fdfcf9] font-sans text-slate-900 selection:bg-amber-200" id="stores-slip-printout">
          {/* Slip Top Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-slate-100 border-2 border-slate-900 flex flex-col items-center justify-center p-1 rounded-xs">
                <span className="font-black text-[14px] tracking-tight text-slate-950 leading-none">
                  usa
                </span>
                <span className="text-[8px] font-extrabold tracking-widest text-slate-700 uppercase mt-0.5">
                  DISTILLERS
                </span>
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-wider text-slate-950 leading-tight">
                  STORES ISSUE REQUISITION
                </h1>
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest block">
                  Great Usuthu Distillery • Inventory & Spares Control
                </span>
              </div>
            </div>

            {/* RED PRE-PRINTED SERIAL NUMBER */}
            <div className="text-right">
              <span className="font-mono text-2xl font-black text-[#d32f2f] tracking-widest block drop-shadow-2xs">
                {slip.slipNumber}
              </span>
              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">
                {slip.bookType} Book
              </span>
            </div>
          </div>

          {/* Metadata Section */}
          <div className="pt-4 pb-3 space-y-2.5 text-xs">
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex items-baseline gap-1 flex-1">
                <span className="font-black uppercase tracking-wider text-slate-800 text-[11px] shrink-0">
                  DATE:
                </span>
                <span className="border-b border-dotted border-slate-900 flex-1 font-mono font-bold px-2 text-slate-950">
                  {slip.date}
                </span>
              </div>

              <div className="flex items-baseline gap-1 flex-1">
                <span className="font-black uppercase tracking-wider text-slate-800 text-[11px] shrink-0">
                  W.O. J.C. No.:
                </span>
                <span className="border-b border-dotted border-slate-900 flex-1 font-mono font-bold px-2 text-purple-900 text-[12px]">
                  {slip.jobCardNumber}
                  {slip.workOrderNumber ? ` (WO #${slip.workOrderNumber})` : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-1 flex-1">
                <span className="font-black uppercase tracking-wider text-slate-800 text-[11px] shrink-0">
                  REQUESTED BY:
                </span>
                <span className="border-b border-dotted border-slate-900 flex-1 font-bold px-2 text-slate-900">
                  {slip.requestedByArtisan}
                </span>
              </div>

              {/* Cost Ctr Box */}
              <div className="flex items-center border border-slate-900 rounded-xs overflow-hidden shrink-0">
                <span className="bg-slate-200 px-2 py-1 font-black text-[10px] uppercase border-r border-slate-900 tracking-wider">
                  Cost Ctr
                </span>
                <span className="px-2.5 py-1 font-mono font-bold text-[11px] text-slate-900 bg-white">
                  {slip.costCenter}
                </span>
              </div>
            </div>

            {/* Target Machine */}
            <div className="flex items-baseline gap-1">
              <span className="font-black uppercase tracking-wider text-slate-600 text-[10px] shrink-0">
                MACHINERY ASSET:
              </span>
              <span className="border-b border-dotted border-slate-400 flex-1 font-bold px-2 text-slate-800 text-[11px]">
                {slip.equipmentName} ({slip.department})
              </span>
            </div>
          </div>

          {/* Ruled Ruled Grid Table */}
          <div className="border border-slate-900 rounded-xs overflow-hidden my-3">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-100/90 text-slate-900 font-black text-[11px] uppercase tracking-wider">
                  <th className="py-2 px-3 text-center w-20 border-r border-slate-900">QTY</th>
                  <th className="py-2 px-4">GOODS DESCRIPTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 font-medium">
                {displayItems.map((item, idx) => (
                  <tr key={idx} className="min-h-[28px]">
                    <td className="py-1.5 px-3 text-center border-r border-slate-900 font-mono font-bold text-slate-950 bg-slate-50/50">
                      {item.quantity}
                    </td>
                    <td className="py-1.5 px-4 text-slate-900">
                      <span className="font-semibold">{item.description}</span>
                      {item.partNumber && (
                        <span className="font-mono text-[10px] text-slate-500 ml-2">
                          [PN: {item.partNumber}]
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {blankRows.map((_, idx) => (
                  <tr key={`blank-${idx}`} className="h-6">
                    <td className="border-r border-slate-900"></td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Signatures */}
          <div className="pt-4 space-y-3 text-xs">
            <div className="flex items-baseline gap-1">
              <span className="font-black uppercase tracking-wider text-slate-800 text-[11px] shrink-0">
                ISSUER SIGN:
              </span>
              <span className="border-b border-dotted border-slate-900 flex-1 px-2 font-bold text-slate-950 font-mono">
                {slip.issuerSignature}
              </span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="font-black uppercase tracking-wider text-slate-800 text-[11px] shrink-0">
                RECEIVED BY SIGN:
              </span>
              <span className="border-b border-dotted border-slate-900 flex-1 px-2 font-bold text-slate-950 font-mono">
                {slip.receivedBySignature}
              </span>
            </div>
          </div>

          {/* HOD VERIFICATION STAMP WATERMARK */}
          <div className="mt-6 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              {slip.hodVerification?.verified ? (
                <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Verified by {slip.hodVerification.verifiedBy || 'HOD Engineering'}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-mono font-normal">
                    ({new Date(slip.hodVerification.verifiedAt || '').toLocaleDateString()})
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-300 px-3 py-1 rounded font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pending HOD Verification (Triplicate Copies 1 & 2)</span>
                </div>
              )}
            </div>

            <span className="text-[10px] text-slate-400 font-mono">
              USA Distillers ERP • Stores Issue Book System
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
