import React from 'react';
import { X, Printer, Shield, CheckSquare, Square, AlertOctagon, Wrench } from 'lucide-react';
import { JobCard } from '../../types';

interface PrintWorkOrderModalProps {
  card: JobCard | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintWorkOrderModal: React.FC<PrintWorkOrderModalProps> = ({ card, isOpen, onClose }) => {
  if (!isOpen || !card) return null;

  const handlePrint = () => {
    window.print();
  };

  // Derive work order number in 6-digit red stamp style (like 188499)
  const orderNumber = card.workOrderNumber || (
    card.jobCardNumber.includes('-')
      ? card.jobCardNumber.replace(/[^0-9]/g, '').padStart(6, '0').slice(-6)
      : card.jobCardNumber
  ) || '188499';

  const reqType = card.requisitionType || (card.priority === 'Emergency' ? 'Call Out' : 'Normal');
  const dangerTag = card.dangerTagRequired || card.safetyPermits?.lotoRequired || false;
  const dangerTagId = card.dangerTagNumber || card.safetyPermits?.lotoTag || (dangerTag ? 'DT-094' : 'NO');
  const originatedBy = card.originatedBy || card.createdByName || 'Atanasio Muchine';
  const originatedTime = card.originatedTime || '11:30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar (Hidden when printed) */}
        <div className="bg-[#1b4332] text-white px-5 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <Wrench className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-sm tracking-wide">
              Official USA Distillers Works Requisition: #{orderNumber}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs shadow transition cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white rounded hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Physical Works Requisition Slip Replica */}
        <div className="p-8 text-slate-900 bg-[#fbfbf9] font-sans text-xs select-text">
          <div className="border-2 border-slate-800 p-6 bg-white shadow-xs">
            {/* Header: Logo, Title, Work Order Number */}
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-3">
                <img
                  src="/assets/aistudio/Screenshot_2024-01-26_104006_cd1bebac.png"
                  alt="USA Distillers"
                  className="h-14 w-auto object-contain border border-emerald-900/30 rounded p-0.5 bg-[#1e4620]"
                />
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                    USA DISTILLERS (PTY) LTD
                  </h1>
                  <p className="text-[11px] font-semibold text-slate-600">
                    Big Bend Distillery • Great Usuthu Plant Operations
                  </p>
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-lg font-black tracking-wider text-slate-800 uppercase px-4 py-1 border-b-2 border-slate-800">
                  WORKS REQUISITION
                </h2>
              </div>

              <div className="text-right border border-slate-400 p-2 bg-slate-50 min-w-[170px]">
                <div className="text-[10px] uppercase font-bold text-slate-600">WORK ORDER NO:</div>
                <div className="text-2xl font-mono font-black text-red-600 tracking-wider">
                  {orderNumber}
                </div>
              </div>
            </div>

            {/* Metadata & Checkboxes Grid */}
            <div className="grid grid-cols-12 gap-0 border border-slate-800 mb-4 divide-x divide-slate-800">
              {/* Left 8 columns: Date, Trade, Plant */}
              <div className="col-span-8 divide-y divide-slate-800">
                <div className="p-2 flex items-center">
                  <span className="font-bold uppercase text-[11px] w-24">DATE:</span>
                  <span className="font-mono text-sm font-semibold text-blue-900">
                    {card.createdAt ? new Date(card.createdAt).toLocaleDateString('en-GB') : '27/10/26'}
                  </span>
                </div>
                <div className="p-2 flex items-center">
                  <span className="font-bold uppercase text-[11px] w-24">TRADE:</span>
                  <span className="font-semibold text-sm text-slate-900">
                    {card.tradeRequired || 'Electrician'}
                  </span>
                </div>
                <div className="p-2 flex items-center">
                  <span className="font-bold uppercase text-[11px] w-24">PLANT:</span>
                  <span className="font-semibold text-sm text-slate-900">
                    {card.equipmentSpecs?.plantArea || card.department || 'Cooling Towers'}
                  </span>
                </div>
              </div>

              {/* Right 4 columns: Cost Ctr & Types */}
              <div className="col-span-4 divide-y divide-slate-800">
                <div className="p-2 flex items-center justify-between bg-slate-50">
                  <span className="font-bold uppercase text-[10px]">Cost Ctr</span>
                  <span className="font-mono text-xs font-semibold">{card.costCenter || 'CC-ENG-03'}</span>
                </div>
                <div className="p-1.5 flex items-center justify-between">
                  <span className="font-semibold text-[11px]">Normal</span>
                  {reqType === 'Normal' ? (
                    <span className="font-bold text-emerald-700 text-sm">✓</span>
                  ) : (
                    <div className="w-3.5 h-3.5 border border-slate-400"></div>
                  )}
                </div>
                <div className="p-1.5 flex items-center justify-between">
                  <span className="font-semibold text-[11px]">Call Out</span>
                  {reqType === 'Call Out' ? (
                    <span className="font-bold text-amber-700 text-sm">✓</span>
                  ) : (
                    <div className="w-3.5 h-3.5 border border-slate-400"></div>
                  )}
                </div>
                <div className="p-1.5 flex items-center justify-between">
                  <span className="font-semibold text-[11px]">Stop Day</span>
                  {reqType === 'Stop Day' ? (
                    <span className="font-bold text-purple-700 text-sm">✓</span>
                  ) : (
                    <div className="w-3.5 h-3.5 border border-slate-400"></div>
                  )}
                </div>
              </div>
            </div>

            {/* Danger Tag Bar */}
            <div className="grid grid-cols-12 gap-0 border border-slate-800 mb-4 divide-x divide-slate-800">
              <div className="col-span-8 p-2 bg-red-50 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertOctagon className="w-4 h-4 text-red-600" />
                  <span className="font-bold uppercase text-red-900 tracking-wide text-[11px]">
                    DANGER TAG REQ.
                  </span>
                </div>
                <span className={`font-mono font-bold px-3 py-0.5 rounded text-xs ${
                  dangerTag ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  {dangerTag ? `YES — TAG #${dangerTagId}` : 'NO'}
                </span>
              </div>
              <div className="col-span-4 p-2 bg-slate-50 flex items-center justify-between">
                <span className="font-bold text-[10px] text-slate-500 uppercase">Iss. by:</span>
                <span className="font-semibold text-xs text-slate-800">
                  {card.createdByName || 'Stores / Engineering'}
                </span>
              </div>
            </div>

            {/* Routing & Work Required Section */}
            <div className="border border-slate-800 mb-4">
              <div className="p-2 border-b border-slate-800 bg-slate-100 flex items-center">
                <span className="font-bold uppercase text-[11px] w-12 text-slate-600">TO:</span>
                <span className="font-bold text-sm text-slate-900 uppercase">
                  {card.recipientDepartment || 'Engineering Dept.'}
                </span>
              </div>

              <div className="p-3 min-h-[110px]">
                <div className="font-bold uppercase text-[10px] text-slate-500 mb-1">
                  Work Required:
                </div>
                <div className="text-sm font-medium text-slate-900 leading-relaxed font-serif pl-2 border-l-2 border-emerald-600">
                  <p>{card.description}</p>
                  {card.equipmentName && (
                    <p className="mt-2 text-xs font-mono font-bold text-slate-700">
                      Asset: {card.equipmentName}
                      {card.equipmentSpecs?.powerKw ? ` (${card.equipmentSpecs.powerKw} kW` : ''}
                      {card.equipmentSpecs?.starterType ? `, Starter: ${card.equipmentSpecs.starterType}` : ''}
                      {card.equipmentSpecs?.overloadAmps ? `, O/L: ${card.equipmentSpecs.overloadAmps}A)` : ''}
                    </p>
                  )}
                </div>
              </div>

              {/* Origination & Signature Line */}
              <div className="border-t border-slate-800 grid grid-cols-12 divide-x divide-slate-800 bg-slate-50/70 p-2 text-xs">
                <div className="col-span-5 flex items-center">
                  <span className="font-bold uppercase text-[10px] text-slate-500 w-24">Originated by:</span>
                  <span className="font-semibold text-slate-900">{originatedBy}</span>
                </div>
                <div className="col-span-4 flex items-center px-2">
                  <span className="font-bold uppercase text-[10px] text-slate-500 w-20">Signature:</span>
                  <span className="italic font-serif text-slate-800 underline decoration-slate-400">
                    {originatedBy.split(' ')[0]}
                  </span>
                </div>
                <div className="col-span-3 flex items-center justify-end px-2">
                  <span className="font-bold uppercase text-[10px] text-slate-500 mr-2">Time:</span>
                  <span className="font-mono font-semibold">{originatedTime}</span>
                </div>
              </div>
            </div>

            {/* Execution / Artisan Sign-Off Section */}
            <div className="border border-slate-800 mb-4 divide-y divide-slate-800">
              <div className="p-2 flex items-center bg-slate-100">
                <span className="font-bold uppercase text-[11px] w-36 text-slate-700">
                  Work Completed by:
                </span>
                <span className="font-semibold text-sm text-slate-900">
                  {card.completedByArtisan || card.assignedTo || 'Pending Artisan Assignment'}
                </span>
              </div>

              <div className="grid grid-cols-12 divide-x divide-slate-800 p-2 text-xs bg-white">
                <div className="col-span-4 flex items-center">
                  <span className="font-bold uppercase text-[10px] text-slate-500 w-24">Artisan sign:</span>
                  <span className="italic font-serif text-slate-700">
                    {card.status === 'Completed' ? 'Signed On-Site' : '________________'}
                  </span>
                </div>
                <div className="col-span-3 flex items-center px-2">
                  <span className="font-bold uppercase text-[10px] text-slate-500 w-12">Date:</span>
                  <span className="font-mono">
                    {card.completionDate || (card.status === 'Completed' ? new Date().toLocaleDateString('en-GB') : '___/___/___')}
                  </span>
                </div>
                <div className="col-span-2 flex items-center px-2">
                  <span className="font-bold uppercase text-[10px] text-slate-500 w-12">Time:</span>
                  <span className="font-mono">{card.completionTime || '--:--'}</span>
                </div>
                <div className="col-span-3 flex items-center justify-end px-2">
                  <span className="font-bold uppercase text-[10px] text-slate-500 mr-2">Hours:</span>
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {card.completionHours || card.totalLaborHours || 0} hrs
                  </span>
                </div>
              </div>
            </div>

            {/* Dual Approval Sign-Off (HOD & Q/C) */}
            <div className="border border-slate-800 mb-4 grid grid-cols-2 divide-x divide-slate-800">
              <div className="p-3 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold uppercase text-[11px] text-slate-700">Signed Off By: HOD</span>
                  <span className="text-[10px] font-semibold text-slate-500">Engineering Manager</span>
                </div>
                <div className="border-b border-slate-400 h-8 flex items-end pb-1 font-serif italic text-slate-800">
                  {card.hodSignedBy || 'Antonio Miranda'}
                </div>
              </div>

              <div className="p-3 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold uppercase text-[11px] text-slate-700">Signed Off By: Q/C</span>
                  <span className="text-[10px] font-semibold text-slate-500">Quality / Supervisor</span>
                </div>
                <div className="border-b border-slate-400 h-8 flex items-end pb-1 font-serif italic text-slate-800">
                  {card.qcSignedBy || 'Plant Inspection Verified'}
                </div>
              </div>
            </div>

            {/* Safety & Cleanliness Footer (Exact text from slip) */}
            <div className="bg-amber-100/60 border border-amber-300 p-3 text-center space-y-1">
              <div className="font-black text-xs text-amber-950 uppercase tracking-widest flex items-center justify-center gap-1.5">
                <Shield className="w-4 h-4 text-red-600" />
                SAFETY FIRST : ISOLATION EQUIPMENT AND ATTACH SAFETY TAG
              </div>
              <div className="font-bold text-[11px] text-slate-800 uppercase tracking-wider">
                CLEAN WORK AREA ON COMPLETION
              </div>
              <div className="font-semibold text-[10px] text-slate-600 uppercase tracking-wide">
                A CLEAN WORK AREA IS A SAFE WORK AREA
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
