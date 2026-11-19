import { JobCard, JobCardWorkflowStage } from '../../types';
import { ACTIVE_PIPELINE_STAGES, getWorkflowStageMeta, resolveWorkflowStage } from './workflow';

export interface StageBottleneckMetric {
  stage: JobCardWorkflowStage;
  label: string;
  shortLabel: string;
  count: number;
  avgAgeHours: number;
  oldestAgeHours: number;
  isHoldBottleneck: boolean;
}

export interface DirectorKpiSummary {
  totalCards: number;
  openCount: number;
  closedCount: number;
  cancelledCount: number;
  emergencyOpenCount: number;
  overdueOpenCount: number;
  awaitingHodSignOffCount: number;
  multiDeptChildCount: number;
  closureRatePercent: number;
  totalLaborHours: number;
  meanTimeToAcknowledgeHours: number | null;
  acknowledgedSampleSize: number;
  meanTimeToCompleteHours: number | null;
  completedSampleSize: number;
  stageBreakdown: StageBottleneckMetric[];
  topBottleneck: StageBottleneckMetric | null;
}

function parseMs(iso?: string): number | null {
  if (!iso) return null;
  const trimmed = iso.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed.length === 10 ? `${trimmed}T23:59:59Z` : trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function findFirstTransitionTime(
  card: JobCard,
  targetStages: JobCardWorkflowStage[]
): number | null {
  if (!Array.isArray(card.statusHistory) || card.statusHistory.length === 0) {
    return null;
  }
  const matches = card.statusHistory
    .filter((entry) => targetStages.includes(entry.toStage))
    .map((entry) => parseMs(entry.changedAt))
    .filter((ms): ms is number => ms !== null)
    .sort((a, b) => a - b);

  return matches.length > 0 ? matches[0] : null;
}

export function computeDirectorKPIs(
  jobCards: JobCard[],
  nowMs: number = Date.now()
): DirectorKpiSummary {
  const activeStageMap = new Map<
    JobCardWorkflowStage,
    { agesHours: number[]; stage: JobCardWorkflowStage }
  >();

  for (const item of ACTIVE_PIPELINE_STAGES) {
    if (item.id !== 'CLOSED') {
      activeStageMap.set(item.id, { agesHours: [], stage: item.id });
    }
  }

  let openCount = 0;
  let closedCount = 0;
  let cancelledCount = 0;
  let emergencyOpenCount = 0;
  let overdueOpenCount = 0;
  let awaitingHodSignOffCount = 0;
  let multiDeptChildCount = 0;
  let totalLaborHours = 0;

  const mttaSamplesHours: number[] = [];
  const mttrSamplesHours: number[] = [];

  for (const card of jobCards) {
    const stage = resolveWorkflowStage(card);
    totalLaborHours += Number(card.totalLaborHours) || 0;
    if (card.parentJobCardId) {
      multiDeptChildCount += 1;
    }

    const createdMs = parseMs(card.createdAt);

    // Acknowledgement latency (SUBMITTED -> ACCEPTED/IN_PROGRESS)
    const ackMs =
      parseMs(card.acceptedAt) ??
      findFirstTransitionTime(card, ['ACCEPTED', 'IN_PROGRESS', 'WORK_COMPLETE', 'CLOSED']);
    if (createdMs !== null && ackMs !== null && ackMs >= createdMs) {
      mttaSamplesHours.push((ackMs - createdMs) / 3_600_000);
    }

    // Completion / closure latency
    const completionMs =
      parseMs(card.hodDigitalSignOff?.signedAt) ??
      findFirstTransitionTime(card, ['WORK_COMPLETE', 'CLOSED']) ??
      (card.completionDate
        ? parseMs(`${card.completionDate}T${card.completionTime || '17:00'}:00Z`)
        : null);
    if (createdMs !== null && completionMs !== null && completionMs >= createdMs) {
      mttrSamplesHours.push((completionMs - createdMs) / 3_600_000);
    }

    if (stage === 'CLOSED') {
      closedCount += 1;
      continue;
    }
    if (stage === 'CANCELLED') {
      cancelledCount += 1;
      continue;
    }

    // Active / non-terminal card
    openCount += 1;
    if (card.priority === 'Emergency') {
      emergencyOpenCount += 1;
    }
    if (stage === 'WORK_COMPLETE') {
      awaitingHodSignOffCount += 1;
    }

    const targetMs = parseMs(card.targetDate);
    if (targetMs !== null && nowMs > targetMs) {
      overdueOpenCount += 1;
    }

    const bucket = activeStageMap.get(stage);
    if (bucket) {
      const lastUpdatedMs =
        findFirstTransitionTime(card, [stage]) ?? parseMs(card.updatedAt) ?? createdMs ?? nowMs;
      const ageHours = Math.max(0, (nowMs - lastUpdatedMs) / 3_600_000);
      bucket.agesHours.push(ageHours);
    }
  }

  const stageBreakdown: StageBottleneckMetric[] = Array.from(activeStageMap.values()).map(
    ({ stage, agesHours }) => {
      const meta = getWorkflowStageMeta(stage);
      const count = agesHours.length;
      const sum = agesHours.reduce((acc, v) => acc + v, 0);
      const avgAgeHours = count > 0 ? Number((sum / count).toFixed(1)) : 0;
      const oldestAgeHours =
        count > 0 ? Number(Math.max(...agesHours).toFixed(1)) : 0;
      return {
        stage,
        label: meta.label,
        shortLabel: meta.shortLabel,
        count,
        avgAgeHours,
        oldestAgeHours,
        isHoldBottleneck:
          stage === 'WAITING_FOR_PARTS' || stage === 'WAITING_FOR_SHUTDOWN'
      };
    }
  );

  const nonZeroStages = stageBreakdown.filter((s) => s.count > 0);
  const topBottleneck =
    nonZeroStages.length > 0
      ? [...nonZeroStages].sort((a, b) => {
          if (b.isHoldBottleneck !== a.isHoldBottleneck) {
            return Number(b.isHoldBottleneck) - Number(a.isHoldBottleneck);
          }
          if (b.count !== a.count) return b.count - a.count;
          return b.avgAgeHours - a.avgAgeHours;
        })[0]
      : null;

  const nonCancelled = jobCards.length - cancelledCount;
  const closureRatePercent =
    nonCancelled > 0 ? Math.round((closedCount / nonCancelled) * 100) : 0;

  const avg = (arr: number[]) =>
    arr.length > 0
      ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1))
      : null;

  return {
    totalCards: jobCards.length,
    openCount,
    closedCount,
    cancelledCount,
    emergencyOpenCount,
    overdueOpenCount,
    awaitingHodSignOffCount,
    multiDeptChildCount,
    closureRatePercent,
    totalLaborHours: Number(totalLaborHours.toFixed(1)),
    meanTimeToAcknowledgeHours: avg(mttaSamplesHours),
    acknowledgedSampleSize: mttaSamplesHours.length,
    meanTimeToCompleteHours: avg(mttrSamplesHours),
    completedSampleSize: mttrSamplesHours.length,
    stageBreakdown,
    topBottleneck
  };
}
