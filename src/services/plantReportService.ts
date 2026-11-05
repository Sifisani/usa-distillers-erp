import {
  collection,
  doc,
  getDocs,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { DailyPlantReport } from '../types';

const COLLECTION_NAME = 'dailyPlantReports';
const LOCAL_STORAGE_KEY = 'usa_distillers_plant_reports_cache';

// Official Baseline Plant Report from the 18 September 2026 sheet uploaded by the CEO
export const OFFICIAL_BASELINE_REPORT: DailyPlantReport = {
  id: 'DPR-2026-09-18',
  reportDate: '2026-09-18',
  reportedBy: 'Andriese Gamedze / Jobe Gamedze',
  createdAt: '2026-09-18T06:00:00.000Z',
  updatedAt: '2026-09-18T18:00:00.000Z',
  status: 'Verified',

  // Section 1: Water Plant
  waterPlant: {
    rawWtrTds: 447.0,
    waterIn: 27.08,
    waterOut: 22.92,
    waterInNp: 0.0,
    waterOutNp: 0.0,
    stTankLevel: 40.0,
    fermTankLevel: 5.7,
    softHard: 0.0,
    roTankLevel: 12.0,
    dam1Ph: 8.1,
    hotwellTemp: 0.0
  },

  // Section 2: Water Consumption
  waterConsumption: {
    bleedOffDist: 0.0,
    bleedOffEvaps: 0.0,
    bleedOffFerm: 0.0,
    roPlant: 0.0,
    coolingTower: 0.0,
    hWell: 0.0,
    distCt: 0.0,
    evapsCt: 0.0,
    fermTaCt: 0.0,
    mahlabaneni24h: 150.0, // 24Hrs community line
    fermentation24h: 0.0,
    community: 31.0,
    bCry: 225.0,
    blrPot: 0.04,
    usa: 0.21
  },

  // Section 3: Steam Usage & Coal
  steamUsage: {
    boiler1Steam: 0.0,
    boiler1Tds: 0.0,
    boiler2Steam: 0.0,
    boiler2Tds: 0.0,
    boiler3Steam: 0.0,
    boiler3Tds: 0.0,
    totalSteam: 0.0
  },

  coal: {
    stockTonnes: 1110.88,
    daysRemaining: 11.34,
    deliveredTonnes: 0.0,
    usedTonnes: 0.0,
    weLoads: 1
  },

  sootblowing: {
    boiler1: 0,
    boiler2: 0,
    boiler3: 0
  },

  // Section 4: Cooling Towers
  coolingTowers: {
    limits: {
      hardness: '0-500',
      tds: '900-1200',
      ph: '7.5 - 9',
      alk: '100-400',
      chlor: '0'
    },
    dist: { hardness: 0, tds: 0, ph: 0, alk: 0, chlor: 0 },
    fermTa: { hardness: 0, tds: 0, ph: 0, alk: 0, chlor: 0 },
    ro: { hardness: 0, tds: 0, ph: 0, alk: 0, chlor: 0 },
    temps: {
      no1In: 0, no1Out: 0, no1Delta: 0,
      no2EvIn: 0, no2EvOut: 0, no2EvDelta: 0,
      no2FerIn: 0, no2FerOut: 0, no2FerDelta: 0,
      no3In: 0, no3Out: 0, no3Delta: 0
    }
  },

  // Section 5: Fermentation & Chemicals
  fermentation: {
    fvTransferring: '',
    fvAlcoholPct: 0.0,
    noFermentersTrans: 0,
    beerAgeHours: 0
  },

  chemicals: {
    h3598Dist: 0,
    h3598Ferm: 0,
    h3598Evaps: 0,
    h3300Dist: 'continuous',
    h3300Ferm: 'continuous',
    h3341Dist: 'continuous',
    h3341Ferm: 'continuous',
    h3533ADist: '1000L',
    h3533AFerm: '500L'
  },

  // Section 6: Molasses Inventory & Balance
  molasses: {
    aveTempC: 35.14,
    molassesTanksTonnes: 326.49,
    molassesGreenTankTonnes: 0.0,
    molassesDamTonnes: 7562.91,
    aquaDamsTonnes: 0.0,
    cmsTankTonnes: 0.0,
    stockMillTonnes: 10958,
    producedTonnes: 497,
    molassesLoads: 7,
    molRelNotes: 33,
    loadsExMill: 7,
    tonnesExMill: 349.24,
    loadsExSa: 6,
    tonnesExSa: 208.02,
    loadsExSaWedsThurs: 731.74,
    loadsExSaToDate: 2003.18,
    totalReceivedTonnes: 557.26,
    molassesOnSiteTonnes: 8097.42
  },

  // Section 7: Distillation & Alcohol Tanks
  distillation: {
    totalWashBeerFeedLitres: 802890,
    indStorageLitres: 30250,
    indIncreaseLitres: 0,
    wcAlcFeed: 0,
    wcWtrFeed: 0,
    potProductionLitres: 0,
    totalProductionLitres: 0,
    lgFeedRateLhr: 0,
    lgTanksLitres: 236070,
    lgProductionLitres: 0,
    beerColumnDays: 'Nil',
    lowGradeALitres: 46210,
    rumStockLitres: 72590,
    rumProductionLitres: 0,
    toppingMeter: 'Nil Litres'
  },

  alcoholTanks: {
    storage1: 46000,
    storage2: 7810,
    storage3: 45930,
    day1: 1360,
    day2: 3050,
    day3: 7010,
    day4: 2110,
    day5: 43570,
    day6: 28040,
    day7: 98880,
    day8: 115120,
    day9: 96850,
    rum1: 60,
    rum2: 72530,
    day12: 98360,
    day13: 97170,
    totalAlcoholLitres: 763850
  },

  dieselYeast: {
    dieselLitres: 9550,
    yeastKg: 3440
  }
};

function getLocalReports(): DailyPlantReport[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading local plant reports cache:', e);
  }
  return [OFFICIAL_BASELINE_REPORT];
}

function saveLocalReports(reports: DailyPlantReport[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
  } catch (e) {
    console.warn('Error saving local plant reports cache:', e);
  }
}

export function subscribeDailyPlantReports(
  onUpdate: (reports: DailyPlantReport[]) => void,
  onError?: (err: Error) => void
): () => void {
  const local = getLocalReports();
  onUpdate(local);

  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('reportDate', 'desc'), limit(30));
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: DailyPlantReport[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as DailyPlantReport);
          });
          saveLocalReports(list);
          onUpdate(list);
        } else {
          // If Firestore is empty, seed official baseline
          savePlantReport(OFFICIAL_BASELINE_REPORT).catch(() => {});
          onUpdate([OFFICIAL_BASELINE_REPORT]);
        }
      },
      (err) => {
        console.warn('Daily plant report subscription fallback to local cache:', err);
        if (onError) onError(err);
        onUpdate(getLocalReports());
      }
    );
  } catch (err: any) {
    console.warn('Failed to attach Firestore plant report listener:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function savePlantReport(report: DailyPlantReport): Promise<void> {
  // Update local cache first
  const current = getLocalReports();
  const idx = current.findIndex((r) => r.id === report.id || r.reportDate === report.reportDate);
  const updatedReport = {
    ...report,
    updatedAt: new Date().toISOString()
  };

  let updatedList: DailyPlantReport[];
  if (idx >= 0) {
    updatedList = [...current];
    updatedList[idx] = updatedReport;
  } else {
    updatedList = [updatedReport, ...current];
  }
  saveLocalReports(updatedList);

  // Sync to Firestore
  try {
    const docRef = doc(db, COLLECTION_NAME, updatedReport.id);
    await setDoc(docRef, updatedReport, { merge: true });
  } catch (e) {
    console.warn('Firestore plant report save failed, cached locally:', e);
  }
}
