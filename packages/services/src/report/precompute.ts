/**
 * Report Precomputation Service
 * 預處理報表資料，存入 KV Cache
 */

import type { Agent2Output, Agent3Output, Agent6Output } from "../llm/types";

// ============================================================
// Types
// ============================================================

export interface PdcmAnalysis {
  pain: { score: number; trend: "up" | "down" | "stable"; weight: number };
  decision: { score: number; trend: "up" | "down" | "stable"; weight: number };
  champion: { score: number; trend: "up" | "down" | "stable"; weight: number };
  metrics: { score: number; trend: "up" | "down" | "stable"; weight: number };
}

export interface SpinAnalysis {
  situation: { score: number; weight: number };
  problem: { score: number; weight: number };
  implication: { score: number; weight: number };
  needPayoff: { score: number; weight: number };
  averageCompletionRate: number;
}

export interface RepReportData {
  userId: string;
  generatedAt: string;
  summary: {
    totalOpportunities: number;
    totalConversations: number;
    totalAnalyses: number;
    averagePdcmScore: number;
    averageProgressScore: number;
    uploadCountThisMonth: number;
    uploadCountThisWeek: number;
  };
  pdcmAnalysis: PdcmAnalysis;
  spinAnalysis: SpinAnalysis;
  strengths: string[];
  weaknesses: string[];
  teamComparison: {
    overallPercentile: number;
  };
  coachingInsights: {
    recentFeedback: string[];
    recurringPatterns: string[];
    improvementPlan: string[];
  };
  progressTracking: {
    last30Days: {
      avgPdcmScore: number;
      avgProgressScore: number;
      change: number;
    };
    last90Days: {
      avgPdcmScore: number;
      avgProgressScore: number;
      change: number;
    };
  };
}

export interface UploadRankingItem {
  userId: string;
  name: string;
  email: string;
  uploadCount: number;
  rank: number;
  department: string | null;
}

export interface MemberRankingItem {
  userId: string;
  name: string;
  email: string;
  averagePdcmScore: number;
  averageProgressScore: number;
  uploadCount: number;
  trend: "up" | "down" | "stable";
  needsAttention: boolean;
  department: string | null;
}

// V2 新增型別：PDCM 維度（包含弱項成員）
export interface PdcmDimensionV2 {
  teamAvg: number;
  topPerformer: string;
  bottomPerformer: string;
  weakMembers: Array<{ userId: string; name: string; score: number }>;
}

// V2 新增型別：SPIN 階段（包含卡點偵測）
export interface SpinStageV2 {
  teamAvg: number;
  isBlockingPoint: boolean;
}

// V2 新增型別：行動優先級項目
export interface ActionPriorityItem {
  priority: "high" | "medium";
  userId: string;
  name: string;
  issue: string;
  action: string;
}

export interface TeamReportData {
  department: string;
  generatedAt: string;
  teamSummary: {
    teamSize: number;
    totalOpportunities: number;
    totalConversations: number;
    teamAveragePdcmScore: number;
    teamAverageProgressScore: number;
    scoreChange: number;
  };
  memberRankings: MemberRankingItem[];
  uploadRankings: {
    weekly: UploadRankingItem[];
    monthly: UploadRankingItem[];
  };
  teamPdcmAnalysis: {
    pain: { teamAvg: number; topPerformer: string; bottomPerformer: string };
    decision: {
      teamAvg: number;
      topPerformer: string;
      bottomPerformer: string;
    };
    champion: {
      teamAvg: number;
      topPerformer: string;
      bottomPerformer: string;
    };
    metrics: { teamAvg: number; topPerformer: string; bottomPerformer: string };
  };
  teamSpinAnalysis: {
    situation: { teamAvg: number };
    problem: { teamAvg: number };
    implication: { teamAvg: number };
    needPayoff: { teamAvg: number };
    averageCompletionRate: number;
  };
  // V2 新增欄位
  teamPdcmAnalysisV2?: {
    pain: PdcmDimensionV2;
    decision: PdcmDimensionV2;
    champion: PdcmDimensionV2;
    metrics: PdcmDimensionV2;
  };
  teamSpinAnalysisV2?: {
    situation: SpinStageV2;
    problem: SpinStageV2;
    implication: SpinStageV2;
    needPayoff: SpinStageV2;
    blockingStage: string | null;
    suggestion: string;
  };
  weeklyActionPriorities?: ActionPriorityItem[];
  attentionNeeded: Array<{
    opportunityId: string;
    companyName: string;
    assignedTo: string;
    score: number;
    risk: string;
  }>;
  coachingPriority: Array<{
    userId: string;
    name: string;
    reason: string;
    suggestedFocus: string[];
  }>;
}

// ============================================================
// Helper Functions
// ============================================================

function roundScore(score: number | null | undefined, decimals = 1): number {
  if (score == null) {
    return 0;
  }
  const multiplier = 10 ** decimals;
  return Math.round(Number(score) * multiplier) / multiplier;
}

function avg(arr: number[]): number {
  if (arr.length === 0) {
    return 0;
  }
  return roundScore(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function calculateTrend(
  current: number,
  previous: number
): "up" | "down" | "stable" {
  if (previous === 0) {
    return "stable";
  }
  const change = current - previous;
  if (change > 3) {
    return "up";
  }
  if (change < -3) {
    return "down";
  }
  return "stable";
}

/**
 * 從 agentOutputs 提取 PDCM 分數
 */
export function extractPdcmScores(agentOutputs: unknown): {
  pain: number;
  decision: number;
  champion: number;
  metrics: number;
  totalScore: number;
  dealProbability: string;
} | null {
  const outputs = agentOutputs as Record<string, unknown> | null;
  const agent2 = outputs?.agent2 as Agent2Output | undefined;
  if (!agent2?.pdcm_scores) {
    return null;
  }

  return {
    pain: agent2.pdcm_scores.pain?.score || 0,
    decision: agent2.pdcm_scores.decision?.score || 0,
    champion: agent2.pdcm_scores.champion?.score || 0,
    metrics: agent2.pdcm_scores.metrics?.score || 0,
    totalScore: agent2.pdcm_scores.total_score || 0,
    dealProbability: agent2.pdcm_scores.deal_probability || "低",
  };
}

/**
 * 從 agentOutputs 提取 SPIN 分數
 */
export function extractSpinScores(agentOutputs: unknown): {
  situation: number;
  problem: number;
  implication: number;
  needPayoff: number;
  completionRate: number;
  progressScore: number;
} | null {
  const outputs = agentOutputs as Record<string, unknown> | null;
  const agent3 = outputs?.agent3 as
    | (Agent3Output & {
        spin_analysis?: {
          situation?: { score: number };
          problem?: { score: number };
          implication?: { score: number };
          need_payoff?: { score: number };
          spin_completion_rate?: number;
        };
      })
    | undefined;

  if (!agent3) {
    return null;
  }

  // SPIN analysis 可能在 spin_analysis 欄位中
  const spin = agent3.spin_analysis;

  return {
    situation: spin?.situation?.score || 0,
    problem: spin?.problem?.score || 0,
    implication: spin?.implication?.score || 0,
    needPayoff: spin?.need_payoff?.score || 0,
    completionRate: spin?.spin_completion_rate || 0,
    progressScore: agent3.progress_score || 0,
  };
}

/**
 * 從 agentOutputs 提取教練建議
 */
export function extractCoachingNotes(agentOutputs: unknown): string | null {
  const outputs = agentOutputs as Record<string, unknown> | null;
  const agent6 = outputs?.agent6 as Agent6Output | undefined;
  // Agent6Output 使用 coaching_notes (snake_case)
  return agent6?.coaching_notes || null;
}

// ============================================================
// PDCM 維度名稱映射
// ============================================================

const PDCM_DIMENSION_NAMES = {
  pain: "痛點 (Pain)",
  decision: "決策 (Decision)",
  champion: "支持度 (Champion)",
  metrics: "量化 (Metrics)",
} as const;

// ============================================================
// Database Query Types (to be passed from caller)
// ============================================================

export interface AnalysisRecord {
  id: string;
  opportunityId: string;
  agentOutputs: unknown;
  overallScore: number | null;
  createdAt: Date;
}

export interface UserRecord {
  id: string;
  name: string | null;
  email: string;
}

export interface UserProfileRecord {
  userId: string;
  role: string | null;
  department: string | null;
}

export interface OpportunityRecord {
  id: string;
  userId: string;
  companyName: string | null;
}

export interface ConversationRecord {
  id: string;
  opportunityId: string;
  createdAt: Date;
  createdBy: string | null;
}

// ============================================================
// Precomputation Functions
// ============================================================

/**
 * 計算單一用戶的個人報表資料
 */
export function computeRepReport(params: {
  userId: string;
  analyses: AnalysisRecord[];
  previousPeriodAnalyses: AnalysisRecord[];
  opportunities: OpportunityRecord[];
  conversations: ConversationRecord[];
  allUserScores: Array<{ userId: string; avgScore: number }>;
  coachingNotes: string[];
}): RepReportData {
  const {
    userId,
    analyses,
    previousPeriodAnalyses,
    opportunities,
    conversations,
    allUserScores,
    coachingNotes,
  } = params;

  // 聚合 PDCM 分數
  const pdcmScores = {
    pain: [] as number[],
    decision: [] as number[],
    champion: [] as number[],
    metrics: [] as number[],
    totalScores: [] as number[],
  };

  // 聚合 SPIN 分數
  const spinScores = {
    situation: [] as number[],
    problem: [] as number[],
    implication: [] as number[],
    needPayoff: [] as number[],
    progressScores: [] as number[],
    completionRates: [] as number[],
  };

  // 提取分數
  for (const analysis of analyses) {
    const pdcm = extractPdcmScores(analysis.agentOutputs);
    if (pdcm) {
      pdcmScores.pain.push(pdcm.pain);
      pdcmScores.decision.push(pdcm.decision);
      pdcmScores.champion.push(pdcm.champion);
      pdcmScores.metrics.push(pdcm.metrics);
      pdcmScores.totalScores.push(pdcm.totalScore);
    }

    const spin = extractSpinScores(analysis.agentOutputs);
    if (spin) {
      spinScores.situation.push(spin.situation);
      spinScores.problem.push(spin.problem);
      spinScores.implication.push(spin.implication);
      spinScores.needPayoff.push(spin.needPayoff);
      spinScores.progressScores.push(spin.progressScore);
      if (spin.completionRate > 0) {
        spinScores.completionRates.push(spin.completionRate);
      }
    }
  }

  // 計算上期 PDCM 平均
  const prevPdcmScores: number[] = [];
  for (const analysis of previousPeriodAnalyses) {
    const pdcm = extractPdcmScores(analysis.agentOutputs);
    if (pdcm) {
      prevPdcmScores.push(pdcm.totalScore);
    }
  }

  const currentAvgPdcm = avg(pdcmScores.totalScores);
  const previousAvgPdcm = avg(prevPdcmScores);

  // 計算上傳數量
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);

  const uploadCountThisMonth = conversations.filter(
    (c) => new Date(c.createdAt) >= thisMonthStart
  ).length;
  const uploadCountThisWeek = conversations.filter(
    (c) => new Date(c.createdAt) >= thisWeekStart
  ).length;

  // 識別強項/弱項
  const dimensionAvgs = {
    pain: avg(pdcmScores.pain),
    decision: avg(pdcmScores.decision),
    champion: avg(pdcmScores.champion),
    metrics: avg(pdcmScores.metrics),
  };

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  for (const [key, value] of Object.entries(dimensionAvgs)) {
    const name = PDCM_DIMENSION_NAMES[key as keyof typeof PDCM_DIMENSION_NAMES];
    if (value >= 70) {
      strengths.push(name);
    } else if (value <= 40) {
      weaknesses.push(name);
    }
  }

  // 計算團隊百分位
  const sortedScores = allUserScores
    .map((s) => s.avgScore)
    .sort((a, b) => a - b);
  const userRank = sortedScores.filter((s) => s < currentAvgPdcm).length;
  const overallPercentile =
    sortedScores.length > 0
      ? Math.round((userRank / sortedScores.length) * 100)
      : 50;

  // 找出重複出現的改善建議
  const improvementCounts: Record<string, number> = {};
  for (const note of coachingNotes) {
    improvementCounts[note] = (improvementCounts[note] || 0) + 1;
  }
  const recurringPatterns = Object.entries(improvementCounts)
    .filter(([, count]) => count >= 2)
    .map(([pattern]) => pattern);

  // 根據弱項生成改善計畫
  const improvementPlanMap: Record<string, string> = {
    "痛點 (Pain)": "在 Demo 中主動詢問客戶目前營運上最困擾的問題",
    "決策 (Decision)": "確認老闆是否在場，若不在場要約定下次與老闆溝通",
    "支持度 (Champion)": "找出對產品最有興趣的店內人員，建立關係",
    "量化 (Metrics)": "主動詢問客戶目前的人力成本、營業額等數據",
  };
  const improvementPlan = weaknesses.map(
    (w) => improvementPlanMap[w] || `加強 ${w} 相關能力`
  );

  return {
    userId,
    generatedAt: new Date().toISOString(),
    summary: {
      totalOpportunities: opportunities.length,
      totalConversations: conversations.length,
      totalAnalyses: analyses.length,
      averagePdcmScore: currentAvgPdcm,
      averageProgressScore: avg(spinScores.progressScores),
      uploadCountThisMonth,
      uploadCountThisWeek,
    },
    pdcmAnalysis: {
      pain: {
        score: dimensionAvgs.pain,
        trend: calculateTrend(
          dimensionAvgs.pain,
          avg(prevPdcmScores.map(() => 0))
        ),
        weight: 35,
      },
      decision: {
        score: dimensionAvgs.decision,
        trend: calculateTrend(dimensionAvgs.decision, 0),
        weight: 25,
      },
      champion: {
        score: dimensionAvgs.champion,
        trend: calculateTrend(dimensionAvgs.champion, 0),
        weight: 25,
      },
      metrics: {
        score: dimensionAvgs.metrics,
        trend: calculateTrend(dimensionAvgs.metrics, 0),
        weight: 15,
      },
    },
    spinAnalysis: {
      situation: { score: avg(spinScores.situation), weight: 15 },
      problem: { score: avg(spinScores.problem), weight: 25 },
      implication: { score: avg(spinScores.implication), weight: 40 },
      needPayoff: { score: avg(spinScores.needPayoff), weight: 20 },
      averageCompletionRate: avg(spinScores.completionRates),
    },
    strengths,
    weaknesses,
    teamComparison: {
      overallPercentile,
    },
    coachingInsights: {
      recentFeedback: coachingNotes.slice(0, 5),
      recurringPatterns,
      improvementPlan,
    },
    progressTracking: {
      last30Days: {
        avgPdcmScore: currentAvgPdcm,
        avgProgressScore: avg(spinScores.progressScores),
        change: roundScore(currentAvgPdcm - previousAvgPdcm),
      },
      last90Days: {
        avgPdcmScore: currentAvgPdcm,
        avgProgressScore: avg(spinScores.progressScores),
        change: 0,
      },
    },
  };
}

/**
 * 計算上傳數量排名
 */
export function computeUploadRankings(params: {
  conversations: Array<
    ConversationRecord & {
      userName?: string;
      userEmail?: string;
      department?: string | null;
    }
  >;
  period: "weekly" | "monthly";
}): UploadRankingItem[] {
  const { conversations, period } = params;

  const now = new Date();
  let startDate: Date;

  if (period === "weekly") {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - now.getDay());
    startDate.setHours(0, 0, 0, 0);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // 過濾指定期間的對話
  const filteredConversations = conversations.filter(
    (c) => new Date(c.createdAt) >= startDate
  );

  // 按用戶聚合
  const userCounts: Record<
    string,
    { count: number; name: string; email: string; department: string | null }
  > = {};
  for (const conv of filteredConversations) {
    const createdBy = conv.createdBy || "unknown";
    if (!userCounts[createdBy]) {
      userCounts[createdBy] = {
        count: 0,
        name: conv.userName || "未知",
        email: conv.userEmail || "",
        department: conv.department || null,
      };
    }
    userCounts[createdBy].count++;
  }

  // 排序並生成排名
  const sorted = Object.entries(userCounts)
    .map(([userId, data]) => ({
      userId,
      name: data.name,
      email: data.email,
      uploadCount: data.count,
      department: data.department,
    }))
    .sort((a, b) => b.uploadCount - a.uploadCount);

  return sorted.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

/**
 * 計算團隊報表資料
 */
export function computeTeamReport(params: {
  department: string;
  members: Array<UserRecord & { profile?: UserProfileRecord }>;
  memberReports: RepReportData[];
  uploadRankingsWeekly: UploadRankingItem[];
  uploadRankingsMonthly: UploadRankingItem[];
  attentionNeededOpportunities: Array<{
    opportunityId: string;
    companyName: string;
    assignedTo: string;
    score: number;
    risk: string;
  }>;
}): TeamReportData {
  const {
    department,
    members,
    memberReports,
    uploadRankingsWeekly,
    uploadRankingsMonthly,
    attentionNeededOpportunities,
  } = params;

  // 聚合團隊統計
  const teamPdcmScores = {
    pain: [] as number[],
    decision: [] as number[],
    champion: [] as number[],
    metrics: [] as number[],
    total: [] as number[],
  };

  const teamSpinScores = {
    situation: [] as number[],
    problem: [] as number[],
    implication: [] as number[],
    needPayoff: [] as number[],
    completionRates: [] as number[],
  };

  let totalOpportunities = 0;
  let totalConversations = 0;
  const progressScores: number[] = [];

  for (const report of memberReports) {
    totalOpportunities += report.summary.totalOpportunities;
    totalConversations += report.summary.totalConversations;
    progressScores.push(report.summary.averageProgressScore);

    teamPdcmScores.pain.push(report.pdcmAnalysis.pain.score);
    teamPdcmScores.decision.push(report.pdcmAnalysis.decision.score);
    teamPdcmScores.champion.push(report.pdcmAnalysis.champion.score);
    teamPdcmScores.metrics.push(report.pdcmAnalysis.metrics.score);
    teamPdcmScores.total.push(report.summary.averagePdcmScore);

    teamSpinScores.situation.push(report.spinAnalysis.situation.score);
    teamSpinScores.problem.push(report.spinAnalysis.problem.score);
    teamSpinScores.implication.push(report.spinAnalysis.implication.score);
    teamSpinScores.needPayoff.push(report.spinAnalysis.needPayoff.score);
    if (report.spinAnalysis.averageCompletionRate > 0) {
      teamSpinScores.completionRates.push(
        report.spinAnalysis.averageCompletionRate
      );
    }
  }

  // 成員排名
  const memberRankings: MemberRankingItem[] = memberReports
    .map((report) => {
      const member = members.find((m) => m.id === report.userId);
      return {
        userId: report.userId,
        name: member?.name || "未知",
        email: member?.email || "",
        averagePdcmScore: report.summary.averagePdcmScore,
        averageProgressScore: report.summary.averageProgressScore,
        uploadCount: report.summary.uploadCountThisMonth,
        trend: report.pdcmAnalysis.pain.trend,
        needsAttention: report.summary.averagePdcmScore < 50,
        department: member?.profile?.department || null,
      };
    })
    .sort((a, b) => b.averagePdcmScore - a.averagePdcmScore);

  // 找出各維度最佳/最差表現者
  const findTopBottom = (scores: number[], reports: RepReportData[]) => {
    if (reports.length === 0) {
      return { top: "無", bottom: "無" };
    }
    const withScores = reports.map((r, i) => ({
      name: members.find((m) => m.id === r.userId)?.name || "未知",
      score: scores[i] || 0,
    }));
    const sorted = [...withScores].sort((a, b) => b.score - a.score);
    return {
      top: sorted[0]?.name || "無",
      bottom: sorted.at(-1)?.name || "無",
    };
  };

  // V2: 找出各維度弱項成員（分數 < 60）
  const WEAK_THRESHOLD = 60;
  const findWeakMembers = (
    scores: number[],
    reports: RepReportData[]
  ): Array<{ userId: string; name: string; score: number }> => {
    if (reports.length === 0) {
      return [];
    }
    return reports
      .map((r, i) => ({
        userId: r.userId,
        name: members.find((m) => m.id === r.userId)?.name || "未知",
        score: roundScore(scores[i] || 0),
      }))
      .filter((m) => m.score < WEAK_THRESHOLD)
      .sort((a, b) => a.score - b.score);
  };

  // V2: SPIN 卡點偵測
  const spinAvgs = {
    situation: avg(teamSpinScores.situation),
    problem: avg(teamSpinScores.problem),
    implication: avg(teamSpinScores.implication),
    needPayoff: avg(teamSpinScores.needPayoff),
  };

  const spinStages = [
    "situation",
    "problem",
    "implication",
    "needPayoff",
  ] as const;
  const BLOCKING_DROP_THRESHOLD = 15; // 相對於前一階段下降 15% 視為卡點

  let blockingStage: string | null = null;
  let maxDrop = 0;

  for (let i = 1; i < spinStages.length; i++) {
    const prevStage = spinStages[i - 1];
    const currStage = spinStages[i];
    if (prevStage && currStage) {
      const prev = spinAvgs[prevStage];
      const curr = spinAvgs[currStage];
      if (prev > 0) {
        const drop = prev - curr;
        if (drop > BLOCKING_DROP_THRESHOLD && drop > maxDrop) {
          maxDrop = drop;
          blockingStage = currStage;
        }
      }
    }
  }

  const spinSuggestions: Record<string, string> = {
    situation: "團隊普遍在「Situation 階段」卡住，建議加強客戶背景資料收集訓練",
    problem: "團隊普遍在「Problem 階段」卡住，建議練習痛點挖掘話術",
    implication: "團隊普遍在「Implication 階段」卡住，建議練習痛點放大話術",
    needPayoff:
      "團隊普遍在「Need-payoff 階段」卡住，建議加強價值呈現和成交技巧",
  };

  // V2: 行動優先級計算
  const actionPriorities: ActionPriorityItem[] = [];

  // 計算團隊平均上傳數
  const teamAvgUpload =
    memberRankings.length > 0
      ? memberRankings.reduce((sum, m) => sum + m.uploadCount, 0) /
        memberRankings.length
      : 0;
  const LOW_UPLOAD_THRESHOLD = teamAvgUpload * 0.7; // 低於團隊平均 30%

  for (const member of memberRankings) {
    const report = memberReports.find((r) => r.userId === member.userId);

    // 高優先級：needsAttention 或趨勢持續下滑
    if (member.needsAttention) {
      actionPriorities.push({
        priority: "high",
        userId: member.userId,
        name: member.name,
        issue: `平均分數僅 ${member.averagePdcmScore} 分`,
        action: "安排 1:1 輔導，找出問題根源",
      });
    } else if (member.trend === "down" && report) {
      // 找出下滑最多的維度
      const weakestDim = report.weaknesses[0];
      if (weakestDim) {
        actionPriorities.push({
          priority: "high",
          userId: member.userId,
          name: member.name,
          issue: `「${weakestDim}」維度持續下滑`,
          action: "針對弱項進行專項訓練",
        });
      }
    }

    // 中優先級：低上傳量
    if (member.uploadCount < LOW_UPLOAD_THRESHOLD && teamAvgUpload > 0) {
      actionPriorities.push({
        priority: "medium",
        userId: member.userId,
        name: member.name,
        issue: `本月僅上傳 ${member.uploadCount} 件（團隊平均 ${Math.round(teamAvgUpload)} 件）`,
        action: "提醒增加錄音上傳頻率",
      });
    }
  }

  // 團隊級別建議
  const dimensionWeakCounts = {
    pain: findWeakMembers(teamPdcmScores.pain, memberReports).length,
    decision: findWeakMembers(teamPdcmScores.decision, memberReports).length,
    champion: findWeakMembers(teamPdcmScores.champion, memberReports).length,
    metrics: findWeakMembers(teamPdcmScores.metrics, memberReports).length,
  };

  const weakestTeamDim = Object.entries(dimensionWeakCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];

  if (weakestTeamDim && weakestTeamDim[1] >= 2) {
    const dimLabels: Record<string, string> = {
      pain: "痛點 (Pain)",
      decision: "決策 (Decision)",
      champion: "支持度 (Champion)",
      metrics: "量化 (Metrics)",
    };
    actionPriorities.push({
      priority: "medium",
      userId: "team",
      name: "團隊整體",
      issue: `團隊「${dimLabels[weakestTeamDim[0]]}」維度偏低（${weakestTeamDim[1]} 人需加強）`,
      action: "週會安排專項訓練",
    });
  }

  // 去重並限制數量
  const uniquePriorities = actionPriorities.slice(0, 10);

  // 教練優先級
  const coachingPriority = memberRankings
    .filter((m) => m.needsAttention)
    .slice(0, 5)
    .map((m) => {
      const report = memberReports.find((r) => r.userId === m.userId);
      return {
        userId: m.userId,
        name: m.name,
        reason: m.averagePdcmScore < 50 ? "平均分數低於 50 分" : "需要關注",
        suggestedFocus: report?.weaknesses.slice(0, 2) || [],
      };
    });

  return {
    department,
    generatedAt: new Date().toISOString(),
    teamSummary: {
      teamSize: members.length,
      totalOpportunities,
      totalConversations,
      teamAveragePdcmScore: avg(teamPdcmScores.total),
      teamAverageProgressScore: avg(progressScores),
      scoreChange: 0, // TODO: 計算與上期比較
    },
    memberRankings,
    uploadRankings: {
      weekly: uploadRankingsWeekly.filter(
        (r) => department === "all" || r.department === department
      ),
      monthly: uploadRankingsMonthly.filter(
        (r) => department === "all" || r.department === department
      ),
    },
    teamPdcmAnalysis: {
      pain: {
        teamAvg: avg(teamPdcmScores.pain),
        ...findTopBottom(teamPdcmScores.pain, memberReports),
        topPerformer: findTopBottom(teamPdcmScores.pain, memberReports).top,
        bottomPerformer: findTopBottom(teamPdcmScores.pain, memberReports)
          .bottom,
      },
      decision: {
        teamAvg: avg(teamPdcmScores.decision),
        topPerformer: findTopBottom(teamPdcmScores.decision, memberReports).top,
        bottomPerformer: findTopBottom(teamPdcmScores.decision, memberReports)
          .bottom,
      },
      champion: {
        teamAvg: avg(teamPdcmScores.champion),
        topPerformer: findTopBottom(teamPdcmScores.champion, memberReports).top,
        bottomPerformer: findTopBottom(teamPdcmScores.champion, memberReports)
          .bottom,
      },
      metrics: {
        teamAvg: avg(teamPdcmScores.metrics),
        topPerformer: findTopBottom(teamPdcmScores.metrics, memberReports).top,
        bottomPerformer: findTopBottom(teamPdcmScores.metrics, memberReports)
          .bottom,
      },
    },
    teamSpinAnalysis: {
      situation: { teamAvg: avg(teamSpinScores.situation) },
      problem: { teamAvg: avg(teamSpinScores.problem) },
      implication: { teamAvg: avg(teamSpinScores.implication) },
      needPayoff: { teamAvg: avg(teamSpinScores.needPayoff) },
      averageCompletionRate: avg(teamSpinScores.completionRates),
    },
    // V2 新增欄位
    teamPdcmAnalysisV2: {
      pain: {
        teamAvg: avg(teamPdcmScores.pain),
        topPerformer: findTopBottom(teamPdcmScores.pain, memberReports).top,
        bottomPerformer: findTopBottom(teamPdcmScores.pain, memberReports)
          .bottom,
        weakMembers: findWeakMembers(teamPdcmScores.pain, memberReports),
      },
      decision: {
        teamAvg: avg(teamPdcmScores.decision),
        topPerformer: findTopBottom(teamPdcmScores.decision, memberReports).top,
        bottomPerformer: findTopBottom(teamPdcmScores.decision, memberReports)
          .bottom,
        weakMembers: findWeakMembers(teamPdcmScores.decision, memberReports),
      },
      champion: {
        teamAvg: avg(teamPdcmScores.champion),
        topPerformer: findTopBottom(teamPdcmScores.champion, memberReports).top,
        bottomPerformer: findTopBottom(teamPdcmScores.champion, memberReports)
          .bottom,
        weakMembers: findWeakMembers(teamPdcmScores.champion, memberReports),
      },
      metrics: {
        teamAvg: avg(teamPdcmScores.metrics),
        topPerformer: findTopBottom(teamPdcmScores.metrics, memberReports).top,
        bottomPerformer: findTopBottom(teamPdcmScores.metrics, memberReports)
          .bottom,
        weakMembers: findWeakMembers(teamPdcmScores.metrics, memberReports),
      },
    },
    teamSpinAnalysisV2: {
      situation: {
        teamAvg: spinAvgs.situation,
        isBlockingPoint: blockingStage === "situation",
      },
      problem: {
        teamAvg: spinAvgs.problem,
        isBlockingPoint: blockingStage === "problem",
      },
      implication: {
        teamAvg: spinAvgs.implication,
        isBlockingPoint: blockingStage === "implication",
      },
      needPayoff: {
        teamAvg: spinAvgs.needPayoff,
        isBlockingPoint: blockingStage === "needPayoff",
      },
      blockingStage,
      suggestion: blockingStage
        ? (spinSuggestions[blockingStage] ??
          "團隊 SPIN 各階段表現均衡，請繼續保持！")
        : "團隊 SPIN 各階段表現均衡，請繼續保持！",
    },
    weeklyActionPriorities: uniquePriorities,
    attentionNeeded: attentionNeededOpportunities,
    coachingPriority,
  };
}
