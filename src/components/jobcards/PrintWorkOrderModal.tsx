import React from 'react';
import { X, Printer, Wrench, Shield, CheckSquare } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Header (not printed) */}
        <div className="bg-[#714B67] text-white px-5 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <Printer className="w-4 h-4 text-amber-300" />
            <span className="font-bold text-sm">Print Work Order: {card.jobCardNumber}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded bg-white text-[#714B67] font-bold text-xs hover:bg-slate-100 transition cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Document</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-white/70 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Work Order Sheet */}
        <div className="p-8 text-slate-800 bg-white font-sans text-xs">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5 flex items-start justify-between">
            <div>
              <div className="text-xl font-bold tracking-tight text-slate-900">
                USA DISTILLERS CO.
              </div>
              <div className="text-xs text-slate-600">
                Plant Maintenance & Engineering Division • Facility KY-03
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                ISO 55001 Asset Management Protocol
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs uppercase font-bold text-slate-500">Official Work Order</div>
              <div className="text-lg font-mono font-bold text-slate-900">{card.jobCardNumber}</div>
              <div className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 border border-slate-300 inline-block mt-1">
                Priority: {card.priority.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Grid Information */}
          <div className="grid grid-cols-2 gap-4 border border-slate-300 p-4 rounded mb-5 bg-slate-50/50">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Department & Location</span>
              <span className="text-xs font-semibold text-slate-900">{card.department}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Equipment / Asset Tag</span>
              <span className="text-xs font-semibold text-slate-900">{card.equipmentName}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Assigned Technician</span>
              <span className="text-xs font-semibold text-slate-900">{card.assignedTo}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Target Completion Date</span>
              <span className="text-xs font-mono font-semibold text-slate-900">{card.targetDate || 'Immediate'}</span>
            </div>
          </div>

          {/* Description of Work */}
          <div className="mb-5">
            <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1.5 border-b border-slate-200 pb-1">
              Scope of Work & Fault Details
            </div>
            <div className="p-3 bg-white border border-slate-300 rounded min-h-[90px] leading-relaxed text-xs">
              {card.description}
            </div>
          </div>

          {/* Safety & LOTO Checkboxes */}
          <div className="border border-slate-300 rounded p-4 mb-5 bg-amber-50/30">
            <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              Safety & Lock-Out / Tag-Out (LOTO) Compliance
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border border-slate-400 rounded"></div>
                <span>Electrical Breaker Locked & Tagged</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border border-slate-400 rounded"></div>
                <span>Process Steam / Fluid Valves Isolated</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border border-slate-400 rounded"></div>
                <span>Pressure Depressurized & Residual Drained</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border border-slate-400 rounded"></div>
                <span>Hot Work / Confined Space Permit Attached</span>
              </div>
            </div>
          </div>

          {/* Technician Sign-Off Section */}
          <div className="border-t-2 border-slate-900 pt-4 mt-8 grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <div className="border-b border-slate-400 h-10 mb-1"></div>
              <span className="font-semibold text-slate-700">Technician Signature</span>
            </div>
            <div>
              <div className="border-b border-slate-400 h-10 mb-1"></div>
              <span className="font-semibold text-slate-700">Supervisor Inspection</span>
            </div>
            <div>
              <div className="border-b border-slate-400 h-10 mb-1"></div>
              <span className="font-semibold text-slate-700">Production Handover Sign-Off</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
