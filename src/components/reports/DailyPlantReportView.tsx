import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Save,
  RotateCcw,
  Calendar,
  Droplets,
  Flame,
  Gauge,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { DailyPlantReport } from '../../types';
import {
  OFFICIAL_BASELINE_REPORT,
  savePlantReport,
  subscribeDailyPlantReports
} from '../../services/plantReportService';

export const DailyPlantReportView: React.FC = () => {
  const [reports, setReports] = useState<DailyPlantReport[]>([OFFICIAL_BASELINE_REPORT]);
  const [selectedReportDate, setSelectedReportDate] = useState<string>('2026-09-18');
  const [activeReport, setActiveReport] = useState<DailyPlantReport>(OFFICIAL_BASELINE_REPORT);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const unsub = subscribeDailyPlantReports((data) => {
      setReports(data);
      const found = data.find((r) => r.reportDate === selectedReportDate);
      if (found) {
        setActiveReport(found);
      } else if (data.length > 0) {
        setActiveReport(data[0]);
        setSelectedReportDate(data[0].reportDate);
      }
    });
    return () => unsub();
  }, [selectedReportDate]);

  // Handle date change
  const handleDateSelect = (date: string) => {
    setSelectedReportDate(date);
    const found = reports.find((r) => r.reportDate === date);
    if (found) {
      setActiveReport(found);
    } else {
      // Create new draft for that date cloned from baseline
      const newDraft: DailyPlantReport = {
        ...OFFICIAL_BASELINE_REPORT,
        id: `DPR-${date}`,
        reportDate: date,
        status: 'Draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setActiveReport(newDraft);
    }
  };

  // Live recalculate Total Alcohol from 15 tanks
  const calculateTotalAlcohol = (tanks: DailyPlantReport['alcoholTanks']): number => {
    return (
      (Number(tanks.storage1) || 0) +
      (Number(tanks.storage2) || 0) +
      (Number(tanks.storage3) || 0) +
      (Number(tanks.day1) || 0) +
      (Number(tanks.day2) || 0) +
      (Number(tanks.day3) || 0) +
      (Number(tanks.day4) || 0) +
      (Number(tanks.day5) || 0) +
      (Number(tanks.day6) || 0) +
      (Number(tanks.day7) || 0) +
      (Number(tanks.day8) || 0) +
      (Number(tanks.day9) || 0) +
      (Number(tanks.rum1) || 0) +
      (Number(tanks.rum2) || 0) +
      (Number(tanks.day12) || 0) +
      (Number(tanks.day13) || 0)
    );
  };

  // Live recalculate Molasses on site
  const calculateMolassesOnSite = (mol: DailyPlantReport['molasses']): number => {
    return (
      (Number(mol.molassesTanksTonnes) || 0) +
      (Number(mol.molassesGreenTankTonnes) || 0) +
      (Number(mol.molassesDamTonnes) || 0)
    );
  };

  const handleTankChange = (tankKey: keyof DailyPlantReport['alcoholTanks'], value: number) => {
    const updatedTanks = {
      ...activeReport.alcoholTanks,
      [tankKey]: value
    };
    updatedTanks.totalAlcoholLitres = calculateTotalAlcohol(updatedTanks);

    setActiveReport({
      ...activeReport,
      alcoholTanks: updatedTanks
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: DailyPlantReport = {
        ...activeReport,
        alcoholTanks: {
          ...activeReport.alcoholTanks,
          totalAlcoholLitres: calculateTotalAlcohol(activeReport.alcoholTanks)
        },
        molasses: {
          ...activeReport.molasses,
          molassesOnSiteTonnes: calculateMolassesOnSite(activeReport.molasses)
        },
        updatedAt: new Date().toISOString()
      };
      await savePlantReport(payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save report:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToBaseline = () => {
    setActiveReport({
      ...OFFICIAL_BASELINE_REPORT,
      id: `DPR-${selectedReportDate}`,
      reportDate: selectedReportDate
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Top Action & Selector Header (Hidden on Print) */}
      <div className="bg-white p-4 rounded-lg shadow-xs border border-slate-200 print:hidden flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <img
            src="/assets/aistudio/Screenshot_2024-01-26_104006_cd1bebac.png"
            alt="USA Distillers"
            className="h-10 w-auto rounded bg-[#1e4620] p-1 border border-emerald-950"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                DAILY PLANT REPORT ENGINE
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                activeReport.status === 'Verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {activeReport.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Big Bend Operations • Consolidated Water, Steam, Fermentation, Stillhouse & Tank Yard
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Date Selector */}
          <div className="flex items-center bg-slate-100 border border-slate-300 rounded px-2.5 py-1 space-x-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-700">Report Date:</span>
            <input
              type="date"
              value={selectedReportDate}
              onChange={(e) => handleDateSelect(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3 py-1.5 rounded font-bold transition cursor-pointer flex items-center gap-1.5 ${
              isEditing ? 'bg-amber-500 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Exit Edit Mode' : 'Edit Shift Numbers'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3.5 py-1.5 rounded bg-[#1e4620] hover:bg-[#163518] text-white font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5 text-emerald-300" />
            <span>{isSaving ? 'Saving...' : 'Save Report'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            <span>Print Official Sheet</span>
          </button>

          <button
            onClick={handleResetToBaseline}
            title="Reset to official 18 September baseline figures"
            className="p-1.5 text-slate-500 hover:text-slate-700 rounded hover:bg-slate-100 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 text-xs font-semibold flex items-center gap-2 print:hidden animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Daily Plant Report for {selectedReportDate} successfully saved to enterprise database.</span>
        </div>
      )}

      {/* The Printable Daily Plant Report Matrix (Exact Replica of PDF) */}
      <div className="bg-[#eaede9] p-4 rounded-lg border-2 border-slate-700 shadow-sm font-sans text-xs select-text overflow-x-auto">
        <div className="min-w-[980px] bg-white border border-slate-800 p-3 shadow-inner">
          {/* Sheet Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-2 bg-[#d7ded6] px-3 py-1">
            <div className="flex items-center space-x-3">
              <img
                src="/assets/aistudio/Screenshot_2024-01-26_104006_cd1bebac.png"
                alt="USA Distillers"
                className="h-10 w-auto rounded bg-[#1e4620] p-0.5 border border-emerald-950"
              />
              <span className="text-xl font-black tracking-tight text-slate-900 uppercase">
                DAILY PLANT REPORT
              </span>
            </div>
            <div className="text-right">
              <span className="font-bold uppercase text-slate-700 mr-2">DATE:</span>
              <span className="font-mono font-bold text-sm text-slate-900">
                {new Date(selectedReportDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>

          {/* 3-Column Main Grid */}
          <div className="grid grid-cols-12 gap-1 text-[11px] leading-tight">
            {/* ================= LEFT COLUMN (Cols 1-4) ================= */}
            <div className="col-span-4 space-y-2">
              {/* 1. WATER PLANT */}
              <div className="border border-slate-700">
                <div className="bg-[#cbd5c0] px-2 py-0.5 font-black text-center border-b border-slate-700 uppercase">
                  WATER PLANT
                </div>
                <div className="divide-y divide-slate-300">
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Raw Wtr TDS</span>
                    <span className="font-mono font-semibold">{activeReport.waterPlant.rawWtrTds.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Water in</span>
                    <span className="font-mono font-semibold">{activeReport.waterPlant.waterIn.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Water out</span>
                    <span className="font-mono font-semibold">{activeReport.waterPlant.waterOut.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Water in N/p</span>
                    <span className="font-mono">{activeReport.waterPlant.waterInNp.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Water out N/p</span>
                    <span className="font-mono">{activeReport.waterPlant.waterOutNp.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>St. tank level</span>
                    <span className="font-mono font-semibold">{activeReport.waterPlant.stTankLevel.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Ferm tank level</span>
                    <span className="font-mono font-semibold">{activeReport.waterPlant.fermTankLevel.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Soft. Hard</span>
                    <span className="font-mono">{activeReport.waterPlant.softHard.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>R/O tank level</span>
                    <span className="font-mono font-semibold">{activeReport.waterPlant.roTankLevel.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Dam 1 pH</span>
                    <span className="font-mono font-bold text-emerald-800">{activeReport.waterPlant.dam1Ph.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Hotwell Temp</span>
                    <span className="font-mono">{activeReport.waterPlant.hotwellTemp.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* 2. WATER CONSUMPTION */}
              <div className="border border-slate-700">
                <div className="bg-[#cbd5c0] px-2 py-0.5 font-black text-center border-b border-slate-700 uppercase">
                  WATER CONSUMPTION
                </div>
                <div className="divide-y divide-slate-300">
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Bleed off Dist</span>
                    <span className="font-mono">{activeReport.waterConsumption.bleedOffDist}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Bleed off Evaps</span>
                    <span className="font-mono">{activeReport.waterConsumption.bleedOffEvaps}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Bleed off Ferm</span>
                    <span className="font-mono">{activeReport.waterConsumption.bleedOffFerm.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>R/O Plant</span>
                    <span className="font-mono">{activeReport.waterConsumption.roPlant.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Cooling Tower</span>
                    <span className="font-mono">{activeReport.waterConsumption.coolingTower.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>H/Well</span>
                    <span className="font-mono">{activeReport.waterConsumption.hWell.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Dist CT</span>
                    <span className="font-mono">{activeReport.waterConsumption.distCt.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Evaps CT</span>
                    <span className="font-mono">{activeReport.waterConsumption.evapsCt.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Ferm / TA CT</span>
                    <span className="font-mono">{activeReport.waterConsumption.fermTaCt.toFixed(2)}</span>
                  </div>
                  {/* Community Service Line */}
                  <div className="flex justify-between px-2 py-0.5 bg-blue-50/70">
                    <span className="font-semibold text-blue-900">Mahlabaneni (24Hrs)</span>
                    <span className="font-mono font-bold text-blue-900">{activeReport.waterConsumption.mahlabaneni24h.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Fermentation (24Hrs)</span>
                    <span className="font-mono">{activeReport.waterConsumption.fermentation24h.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5 bg-blue-50/70">
                    <span className="font-semibold text-blue-900">Community</span>
                    <span className="font-mono font-bold text-blue-900">{activeReport.waterConsumption.community.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>B/Cry</span>
                    <span className="font-mono font-semibold">{activeReport.waterConsumption.bCry.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Blr. Pot</span>
                    <span className="font-mono">{activeReport.waterConsumption.blrPot.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>USA</span>
                    <span className="font-mono">{activeReport.waterConsumption.usa.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* 3. STEAM USAGE & TDS */}
              <div className="border border-slate-700">
                <div className="bg-[#cbd5c0] px-2 py-0.5 font-black text-center border-b border-slate-700 uppercase flex justify-between">
                  <span>STEAM USAGE</span>
                  <span>T D S</span>
                </div>
                <div className="divide-y divide-slate-300">
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Boiler 1</span>
                    <div className="space-x-4 font-mono font-semibold">
                      <span>{activeReport.steamUsage.boiler1Steam.toFixed(2)}</span>
                      <span>{activeReport.steamUsage.boiler1Tds}</span>
                    </div>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Boiler 2</span>
                    <div className="space-x-4 font-mono font-semibold">
                      <span>{activeReport.steamUsage.boiler2Steam.toFixed(2)}</span>
                      <span>{activeReport.steamUsage.boiler2Tds}</span>
                    </div>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Boiler 3</span>
                    <div className="space-x-4 font-mono font-semibold">
                      <span>{activeReport.steamUsage.boiler3Steam.toFixed(2)}</span>
                      <span>{activeReport.steamUsage.boiler3Tds}</span>
                    </div>
                  </div>
                  <div className="flex justify-between px-2 py-0.5 bg-slate-100 font-bold">
                    <span>Total</span>
                    <span className="font-mono">{activeReport.steamUsage.totalSteam.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* 4. COAL & SOOTBLOWING */}
              <div className="border border-slate-700">
                <div className="bg-[#cbd5c0] px-2 py-0.5 font-black text-center border-b border-slate-700 uppercase">
                  COAL
                </div>
                <div className="divide-y divide-slate-300">
                  <div className="flex justify-between px-2 py-0.5">
                    <span className="font-semibold">Stock (Tonnes)</span>
                    <span className="font-mono font-bold">{activeReport.coal.stockTonnes.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5 bg-amber-50">
                    <span className="font-semibold text-amber-900">Days Remaining</span>
                    <span className="font-mono font-black text-amber-900">{activeReport.coal.daysRemaining.toFixed(2)} days</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Delivered</span>
                    <span className="font-mono">{activeReport.coal.deliveredTonnes.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Used</span>
                    <span className="font-mono">{activeReport.coal.usedTonnes}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>W/E loads</span>
                    <span className="font-mono">{activeReport.coal.weLoads}</span>
                  </div>
                </div>

                <div className="bg-[#cbd5c0] px-2 py-0.5 font-black text-center border-t border-b border-slate-700 uppercase text-[10px]">
                  SOOTBLOWING
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-300 text-center py-0.5">
                  <div>Blr. 1: <span className="font-mono font-bold">{activeReport.sootblowing.boiler1}</span></div>
                  <div>Blr. 2: <span className="font-mono font-bold">{activeReport.sootblowing.boiler2}</span></div>
                  <div>Blr. 3: <span className="font-mono font-bold">{activeReport.sootblowing.boiler3}</span></div>
                </div>
              </div>
            </div>

            {/* ================= MIDDLE COLUMN (Cols 5-8) ================= */}
            <div className="col-span-4 space-y-2">
              {/* 5. COOLING TOWERS */}
              <div className="border border-slate-700">
                <div className="bg-[#cbd5c0] px-2 py-0.5 font-black text-center border-b border-slate-700 uppercase">
                  COOLING TOWERS
                </div>
                <div className="grid grid-cols-5 text-center font-bold border-b border-slate-300 py-0.5 bg-slate-50 text-[10px]">
                  <span>Param</span>
                  <span>Limits</span>
                  <span>DIST</span>
                  <span>Ferm/TA</span>
                  <span>R/O</span>
                </div>
                <div className="divide-y divide-slate-300 text-[10px]">
                  <div className="grid grid-cols-5 text-center py-0.5">
                    <span className="font-medium text-left pl-1">Hardness</span>
                    <span className="font-mono text-slate-500">0-500</span>
                    <span className="font-mono">{activeReport.coolingTowers.dist.hardness}</span>
                    <span className="font-mono">{activeReport.coolingTowers.fermTa.hardness}</span>
                    <span className="font-mono">{activeReport.coolingTowers.ro.hardness}</span>
                  </div>
                  <div className="grid grid-cols-5 text-center py-0.5">
                    <span className="font-medium text-left pl-1">TDS</span>
                    <span className="font-mono text-slate-500">900-1200</span>
                    <span className="font-mono">{activeReport.coolingTowers.dist.tds}</span>
                    <span className="font-mono">{activeReport.coolingTowers.fermTa.tds}</span>
                    <span className="font-mono">{activeReport.coolingTowers.ro.tds}</span>
                  </div>
                  <div className="grid grid-cols-5 text-center py-0.5">
                    <span className="font-medium text-left pl-1">pH</span>
                    <span className="font-mono text-slate-500">7.5 - 9</span>
                    <span className="font-mono">{activeReport.coolingTowers.dist.ph}</span>
                    <span className="font-mono">{activeReport.coolingTowers.fermTa.ph}</span>
                    <span className="font-mono">{activeReport.coolingTowers.ro.ph}</span>
                  </div>
                  <div className="grid grid-cols-5 text-center py-0.5">
                    <span className="font-medium text-left pl-1">Alk.</span>
                    <span className="font-mono text-slate-500">100-400</span>
                    <span className="font-mono">{activeReport.coolingTowers.dist.alk}</span>
                    <span className="font-mono">{activeReport.coolingTowers.fermTa.alk}</span>
                    <span className="font-mono">{activeReport.coolingTowers.ro.alk}</span>
                  </div>
                  <div className="grid grid-cols-5 text-center py-0.5">
                    <span className="font-medium text-left pl-1">Chlor</span>
                    <span className="font-mono text-slate-500">0</span>
                    <span className="font-mono">{activeReport.coolingTowers.dist.chlor}</span>
                    <span className="font-mono">{activeReport.coolingTowers.fermTa.chlor}</span>
                    <span className="font-mono">{activeReport.coolingTowers.ro.chlor}</span>
                  </div>
                </div>
              </div>

              {/* 6. FERMENTATION */}
              <div className="border border-slate-700">
                <div className="bg-[#cbd5c0] px-2 py-0.5 font-black text-center border-b border-slate-700 uppercase">
                  FERMENTATION
                </div>
                <div className="divide-y divide-slate-300">
                  <div className="flex justify-between px-2 py-0.5">
                    <span>F.V. Transferring</span>
                    <span className="font-mono">{activeReport.fermentation.fvTransferring || '—'}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>F.V. % Alc</span>
                    <span className="font-mono font-semibold">{activeReport.fermentation.fvAlcoholPct}%</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>No. Fermenters Trans</span>
                    <span className="font-mono">{activeReport.fermentation.noFermentersTrans}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Beer Age</span>
                    <span className="font-mono">{activeReport.fermentation.beerAgeHours} hrs</span>
                  </div>
                </div>
              </div>

              {/* 7. MOLASSES (Ave temp = 35,14°C) */}
              <div className="border border-slate-700">
                <div className="bg-[#cbd5c0] px-2 py-0.5 font-black text-center border-b border-slate-700 uppercase flex justify-between">
                  <span>MOLASSES</span>
                  <span className="font-mono font-bold">Ave temp = {activeReport.molasses.aveTempC}°C</span>
                </div>
                <div className="divide-y divide-slate-300">
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Molasses Tanks</span>
                    <span className="font-mono font-semibold">{activeReport.molasses.molassesTanksTonnes.toFixed(2)} T</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Molasses Green Tank</span>
                    <span className="font-mono">{activeReport.molasses.molassesGreenTankTonnes.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Molasses Dam</span>
                    <span className="font-mono font-bold text-amber-900">{activeReport.molasses.molassesDamTonnes.toFixed(2)} T</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Aqua Dams</span>
                    <span className="font-mono">{activeReport.molasses.aquaDamsTonnes || '—'}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>C.M.S. Tank</span>
                    <span className="font-mono">{activeReport.molasses.cmsTankTonnes || '—'}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5 bg-slate-50">
                    <span className="font-semibold">Molasses stock Mill</span>
                    <span className="font-mono font-bold">{activeReport.molasses.stockMillTonnes} T</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Molasses produced</span>
                    <span className="font-mono">{activeReport.molasses.producedTonnes}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Molasses Loads</span>
                    <span className="font-mono font-semibold">{activeReport.molasses.molassesLoads}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>MOL. REL. NOTES</span>
                    <span className="font-mono">{activeReport.molasses.molRelNotes}</span>
                  </div>
                </div>
              </div>

              {/* 8. DISTILLATION SUMMARY (802890 Litres) */}
              <div className="border border-slate-700">
                <div className="bg-[#cbd5c0] px-2 py-0.5 font-black text-center border-b border-slate-700 uppercase flex justify-between">
                  <span>DISTILLATION</span>
                  <span className="font-mono font-bold">= {activeReport.distillation.totalWashBeerFeedLitres} Litres</span>
                </div>
                <div className="divide-y divide-slate-300">
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Beer Feed</span>
                    <span className="font-mono">{activeReport.distillation.totalWashBeerFeedLitres} L</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Ind Storage</span>
                    <span className="font-mono font-semibold">{activeReport.distillation.indStorageLitres} L</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Ind Increase</span>
                    <span className="font-mono">{activeReport.distillation.indIncreaseLitres || '—'}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>W/C Alc. Feed</span>
                    <span className="font-mono">{activeReport.distillation.wcAlcFeed || '—'}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>W/C Wtr. Feed</span>
                    <span className="font-mono">{activeReport.distillation.wcWtrFeed || '—'}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Pot Production</span>
                    <span className="font-mono">{activeReport.distillation.potProductionLitres}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Total Production</span>
                    <span className="font-mono font-bold">{activeReport.distillation.totalProductionLitres}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>L.G. feed rate l/hr</span>
                    <span className="font-mono">{activeReport.distillation.lgFeedRateLhr}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5 bg-slate-50">
                    <span className="font-semibold">LG Tanks</span>
                    <span className="font-mono font-bold">{activeReport.distillation.lgTanksLitres} L</span>
                  </div>
                </div>
              </div>

              {/* 9. MOLASSES DELIVERIES & BALANCE */}
              <div className="border border-slate-700">
                <div className="bg-[#cbd5c0] px-2 py-0.5 font-black text-center border-b border-slate-700 uppercase">
                  MOLASSES DELIVERIES & SITE BALANCE
                </div>
                <div className="divide-y divide-slate-300">
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Loads ex Mill: <b className="font-mono">{activeReport.molasses.loadsExMill}</b></span>
                    <span>Tonnes: <b className="font-mono">{activeReport.molasses.tonnesExMill.toFixed(2)}</b></span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Loads ex S.A.: <b className="font-mono">{activeReport.molasses.loadsExSa}</b></span>
                    <span>Tonnes: <b className="font-mono">{activeReport.molasses.tonnesExSa.toFixed(2)}</b></span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Loads ex S.A.-Weds-Thurs</span>
                    <span className="font-mono">{activeReport.molasses.loadsExSaWedsThurs.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Loads ex S.A.-to date</span>
                    <span className="font-mono font-semibold">{activeReport.molasses.loadsExSaToDate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-1 bg-amber-100 font-bold border-t border-slate-700">
                    <span className="uppercase text-amber-950">Molasses on site</span>
                    <span className="font-mono text-sm font-black text-amber-950">
                      {calculateMolassesOnSite(activeReport.molasses).toFixed(2)} Tonnes
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= RIGHT COLUMN (Cols 9-12) ================= */}
            <div className="col-span-4 space-y-2">
              {/* 10. C.T. WATER TEMPS */}
              <div className="border border-slate-700">
                <div className="bg-[#cbd5c0] px-2 py-0.5 font-black text-center border-b border-slate-700 uppercase text-[10px]">
                  C.T. WATER TEMPS
                </div>
                <div className="grid grid-cols-4 text-center font-bold border-b border-slate-300 py-0.5 bg-slate-50 text-[10px]">
                  <span>Unit</span>
                  <span>In</span>
                  <span>Out</span>
                  <span>Delta T</span>
                </div>
                <div className="divide-y divide-slate-300 text-[10px]">
                  <div className="grid grid-cols-4 text-center py-0.5">
                    <span className="text-left pl-1">No. 1</span>
                    <span className="font-mono">0</span>
                    <span className="font-mono">0</span>
                    <span className="font-mono font-bold">0</span>
                  </div>
                  <div className="grid grid-cols-4 text-center py-0.5">
                    <span className="text-left pl-1">No. 2 Ev</span>
                    <span className="font-mono">0</span>
                    <span className="font-mono">0</span>
                    <span className="font-mono font-bold">0</span>
                  </div>
                  <div className="grid grid-cols-4 text-center py-0.5">
                    <span className="text-left pl-1">No. 2 Fer.</span>
                    <span className="font-mono">0</span>
                    <span className="font-mono">0</span>
                    <span className="font-mono font-bold">0</span>
                  </div>
                  <div className="grid grid-cols-4 text-center py-0.5">
                    <span className="text-left pl-1">No. 3</span>
                    <span className="font-mono">0</span>
                    <span className="font-mono">0</span>
                    <span className="font-mono font-bold">0</span>
                  </div>
                </div>
              </div>

              {/* 11. CHEMICALS */}
              <div className="border border-slate-700">
                <div className="bg-[#cbd5c0] px-2 py-0.5 font-black text-center border-b border-slate-700 uppercase">
                  CHEMICALS
                </div>
                <div className="grid grid-cols-4 text-center font-bold border-b border-slate-300 py-0.5 bg-slate-50 text-[10px]">
                  <span>Code</span>
                  <span>DIST</span>
                  <span>Ferm/TA</span>
                  <span>Evaps</span>
                </div>
                <div className="divide-y divide-slate-300 text-[10px]">
                  <div className="grid grid-cols-4 text-center py-0.5">
                    <span className="font-semibold text-left pl-1">H3598</span>
                    <span className="font-mono">0</span>
                    <span className="font-mono">0</span>
                    <span className="font-mono">0</span>
                  </div>
                  <div className="grid grid-cols-4 text-center py-0.5">
                    <span className="font-semibold text-left pl-1">H 3300</span>
                    <span className="text-slate-600 italic">continuous</span>
                    <span className="text-slate-600 italic">continuous</span>
                    <span className="text-slate-400">—</span>
                  </div>
                  <div className="grid grid-cols-4 text-center py-0.5">
                    <span className="font-semibold text-left pl-1">H 3341</span>
                    <span className="text-slate-600 italic">continuous</span>
                    <span className="text-slate-600 italic">continuous</span>
                    <span className="text-slate-400">—</span>
                  </div>
                  <div className="grid grid-cols-4 text-center py-0.5">
                    <span className="font-semibold text-left pl-1">H 3533A</span>
                    <span className="font-mono font-bold">1000L</span>
                    <span className="font-mono font-bold">500L</span>
                    <span className="text-slate-400">—</span>
                  </div>
                </div>
              </div>

              {/* 12. ALCOHOL TANKS (15 TANKS & TOTAL) */}
              <div className="border-2 border-emerald-800">
                <div className="bg-[#1e4620] text-white px-2 py-1 font-black text-center uppercase flex justify-between items-center">
                  <span className="tracking-wide">ALCOHOL TANKS</span>
                  <span className="text-[10px] font-normal text-emerald-200">Bulk Litres</span>
                </div>
                <div className="divide-y divide-slate-300 text-[11px] bg-white">
                  {[
                    { key: 'storage1', label: 'Storage 1', val: activeReport.alcoholTanks.storage1 },
                    { key: 'storage2', label: 'Storage 2', val: activeReport.alcoholTanks.storage2 },
                    { key: 'storage3', label: 'Storage 3', val: activeReport.alcoholTanks.storage3 },
                    { key: 'day1', label: 'Day 1', val: activeReport.alcoholTanks.day1 },
                    { key: 'day2', label: 'Day 2', val: activeReport.alcoholTanks.day2 },
                    { key: 'day3', label: 'Day 3', val: activeReport.alcoholTanks.day3 },
                    { key: 'day4', label: 'Day 4', val: activeReport.alcoholTanks.day4 },
                    { key: 'day5', label: 'Day 5', val: activeReport.alcoholTanks.day5 },
                    { key: 'day6', label: 'Day 6', val: activeReport.alcoholTanks.day6 },
                    { key: 'day7', label: 'Day 7', val: activeReport.alcoholTanks.day7 },
                    { key: 'day8', label: 'Day 8', val: activeReport.alcoholTanks.day8 },
                    { key: 'day9', label: 'Day 9', val: activeReport.alcoholTanks.day9 },
                    { key: 'rum1', label: 'Rum 1', val: activeReport.alcoholTanks.rum1 },
                    { key: 'rum2', label: 'Rum 2', val: activeReport.alcoholTanks.rum2 },
                    { key: 'day12', label: 'Day 12', val: activeReport.alcoholTanks.day12 },
                    { key: 'day13', label: 'Day 13', val: activeReport.alcoholTanks.day13 }
                  ].map((tank) => (
                    <div key={tank.key} className="flex justify-between items-center px-2 py-0.5 hover:bg-emerald-50/50">
                      <span className="font-medium text-slate-800">{tank.label}</span>
                      {isEditing ? (
                        <input
                          type="number"
                          value={tank.val}
                          onChange={(e) => handleTankChange(tank.key as any, Number(e.target.value))}
                          className="w-24 text-right font-mono font-semibold px-1 py-0.2 border border-emerald-400 rounded bg-emerald-50/50 text-xs"
                        />
                      ) : (
                        <span className="font-mono font-semibold text-slate-900">
                          {Number(tank.val).toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))}

                  {/* TOTAL ALCOHOL LITRES - BIG STAMP */}
                  <div className="flex justify-between items-center px-2.5 py-1.5 bg-[#e8f5e9] border-t-2 border-emerald-800 font-bold">
                    <span className="uppercase text-emerald-950 font-black tracking-wider text-xs">
                      TOTAL ALCOHOL
                    </span>
                    <span className="font-mono text-base font-black text-emerald-900 tracking-tight">
                      {calculateTotalAlcohol(activeReport.alcoholTanks).toLocaleString()} Litres
                    </span>
                  </div>
                </div>
              </div>

              {/* 13. DIESEL, YEAST & PRODUCTION STATUS */}
              <div className="border border-slate-700 bg-slate-50 p-2 space-y-1.5">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-1.5 border border-slate-300 rounded">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Diesel</span>
                    <span className="font-mono font-bold text-slate-900">
                      {activeReport.dieselYeast.dieselLitres.toLocaleString()} L
                    </span>
                  </div>
                  <div className="bg-white p-1.5 border border-slate-300 rounded">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Yeast</span>
                    <span className="font-mono font-bold text-slate-900">
                      {activeReport.dieselYeast.yeastKg.toLocaleString()} kg
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-200 text-[10px] pt-1">
                  <div className="flex justify-between py-0.5">
                    <span>Beer column days</span>
                    <span className="font-mono font-semibold">{activeReport.distillation.beerColumnDays}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>Low Grade &quot;A&quot;</span>
                    <span className="font-mono font-semibold">{activeReport.distillation.lowGradeALitres.toLocaleString()} Litres</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>Rum stock</span>
                    <span className="font-mono font-semibold">{activeReport.distillation.rumStockLitres.toLocaleString()} Litres</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>Topping meter</span>
                    <span className="font-mono">{activeReport.distillation.toppingMeter}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sheet Footer Sign-Offs */}
          <div className="border-t-2 border-slate-800 mt-3 pt-2 grid grid-cols-4 gap-4 text-center text-[10px] text-slate-600">
            <div>
              <div className="border-b border-slate-400 h-6 mb-0.5 flex items-end justify-center font-serif italic text-slate-800">
                Andriese Gamedze
              </div>
              <span className="font-bold uppercase text-slate-700">Water & Utilities Operator</span>
            </div>
            <div>
              <div className="border-b border-slate-400 h-6 mb-0.5 flex items-end justify-center font-serif italic text-slate-800">
                Kenny Kunene
              </div>
              <span className="font-bold uppercase text-slate-700">Fermentation Supervisor</span>
            </div>
            <div>
              <div className="border-b border-slate-400 h-6 mb-0.5 flex items-end justify-center font-serif italic text-slate-800">
                Jobe Gamedze
              </div>
              <span className="font-bold uppercase text-slate-700">Distillation Operator</span>
            </div>
            <div>
              <div className="border-b border-slate-400 h-6 mb-0.5 flex items-end justify-center font-serif italic text-slate-800">
                Johan Smit
              </div>
              <span className="font-bold uppercase text-slate-700">Operations Director Sign-Off</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
