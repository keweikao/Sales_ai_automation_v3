/**
 * 報告頁面
 * 顯示業務個人報告和經理團隊報告
 * Precision Analytics Industrial Design
 */

import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Building2,
  Calendar,
  Medal,
  MessageSquare,
  Minus,
  Target,
  TrendingUp,
  Trophy,
  UserCircle,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { TermTooltip } from "@/components/ui/term-tooltip";
import { getDisplayNameByEmail } from "@/lib/consultant-names";
import { cn } from "@/lib/utils";
import { client } from "@/utils/orpc";

// Import Playfair Display and JetBrains Mono
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/playfair-display/800.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";

export const Route = createFileRoute("/reports/")({
  component: ReportsPage,
});

// Trend icon component
function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") {
    return <ArrowUp className="h-4 w-4 text-green-500" />;
  }
  if (trend === "down") {
    return <ArrowDown className="h-4 w-4 text-red-500" />;
  }
  return <Minus className="h-4 w-4 text-gray-500" />;
}

// Score change badge
function ScoreChangeBadge({ change }: { change: number }) {
  if (change > 0) {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        +{change}
      </Badge>
    );
  }
  if (change < 0) {
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        {change}
      </Badge>
    );
  }
  return <Badge variant="secondary">{change}</Badge>;
}

// Stat card for summary
function StatCard({
  title,
  value,
  description,
  icon: Icon,
  loading,
  change,
}: {
  title: React.ReactNode;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  change?: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-medium text-sm">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-bold text-2xl">{value}</span>
            {change !== undefined && <ScoreChangeBadge change={change} />}
          </div>
        )}
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Dimension score bar
function DimensionScoreBar({
  label,
  score,
  trend,
  gap,
}: {
  label: React.ReactNode;
  score: number;
  trend: "up" | "down" | "stable";
  gap?: string;
}) {
  const _getScoreColor = (s: number) => {
    if (s >= 4) {
      return "bg-green-500";
    }
    if (s >= 3) {
      return "bg-yellow-500";
    }
    if (s >= 2) {
      return "bg-orange-500";
    }
    return "bg-red-500";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{label}</span>
          <TrendIcon trend={trend} />
        </div>
        <span className="font-medium text-sm">{score.toFixed(1)}/5</span>
      </div>
      <Progress className="h-2" value={(score / 5) * 100} />
      {gap && <p className="text-muted-foreground text-xs">{gap}</p>}
    </div>
  );
}

// PDCM 維度權重
const PDCM_WEIGHTS = {
  pain: 35,
  decision: 25,
  champion: 25,
  metrics: 15,
};

// SPIN 階段權重
const SPIN_WEIGHTS = {
  situation: 15,
  problem: 25,
  implication: 40,
  needPayoff: 20,
};

// PDCM 維度標籤
const PDCM_LABELS: Record<string, { label: string; termKey: string }> = {
  pain: { label: "痛點 (Pain)", termKey: "pain" },
  decision: { label: "決策 (Decision)", termKey: "decision" },
  champion: { label: "支持度 (Champion)", termKey: "champion" },
  metrics: { label: "量化 (Metrics)", termKey: "metrics" },
};

// SPIN 階段標籤
const SPIN_LABELS: Record<string, { label: string; termKey: string }> = {
  situation: { label: "情境 (Situation)", termKey: "spinSituation" },
  problem: { label: "問題 (Problem)", termKey: "spinProblem" },
  implication: { label: "暗示 (Implication)", termKey: "spinImplication" },
  needPayoff: { label: "需求回報 (Need-payoff)", termKey: "spinNeedPayoff" },
};

// PDCM Dimension Score Bar with weight
function PdcmDimensionBar({
  label,
  score,
  trend,
  weight,
}: {
  label: React.ReactNode;
  score: number;
  trend: "up" | "down" | "stable";
  weight: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{label}</span>
          <Badge className="text-xs" variant="outline">
            權重 {weight}%
          </Badge>
          <TrendIcon trend={trend} />
        </div>
        <span className="font-medium text-sm">{score.toFixed(0)}/100</span>
      </div>
      <Progress className="h-2" value={score} />
    </div>
  );
}

// SPIN Stage Bar with weight
function SpinStageBar({
  label,
  score,
  weight,
}: {
  label: React.ReactNode;
  score: number;
  weight: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{label}</span>
          <Badge className="text-xs" variant="outline">
            權重 {weight}%
          </Badge>
        </div>
        <span className="font-medium text-sm">{score.toFixed(0)}/100</span>
      </div>
      <Progress className="h-2" value={score} />
    </div>
  );
}

// Rep Performance Report Component
function RepPerformanceReport() {
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();

  // 獲取可查看的用戶列表（經理/admin 才會有）
  const viewableUsersQuery = useQuery({
    queryKey: ["team", "viewableUsers"],
    queryFn: () => client.team.getViewableUsers(),
  });

  const reportQuery = useQuery({
    queryKey: ["analytics", "repPerformance", { userId: selectedUserId }],
    queryFn: async () => {
      return await client.analytics.repPerformance({
        userId: selectedUserId,
      });
    },
  });

  const report = reportQuery.data;
  const isLoading = reportQuery.isLoading;
  const canSelectUser = viewableUsersQuery.data?.canSelectUser ?? false;
  const viewableUsers = viewableUsersQuery.data?.users ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (reportQuery.error || !report) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-500">無法載入報告資料</p>
        {reportQuery.error && (
          <p className="mt-2 text-muted-foreground text-sm">
            錯誤：{reportQuery.error.message}
          </p>
        )}
        {viewableUsersQuery.error && (
          <p className="mt-2 text-muted-foreground text-sm">
            用戶列表錯誤：{viewableUsersQuery.error.message}
          </p>
        )}
      </div>
    );
  }

  // 檢查是否有新版 Cache 資料（pdcmAnalysis 和 spinAnalysis）
  const hasCachedData = "pdcmAnalysis" in report && report.pdcmAnalysis;
  const hasSpinData = "spinAnalysis" in report && report.spinAnalysis;

  // 計算 PDCM 平均分數（從新版或舊版資料）
  const avgPdcmScore = hasCachedData
    ? ((report as any).summary?.averagePdcmScore ?? report.summary.averageScore)
    : report.summary.averageScore;

  // 計算進步分數（新版才有）
  const avgProgressScore =
    hasCachedData && (report as any).summary?.averageProgressScore
      ? (report as any).summary.averageProgressScore
      : null;

  // 本月上傳數（新版才有）
  const uploadCountThisMonth =
    hasCachedData && (report as any).summary?.uploadCountThisMonth
      ? (report as any).summary.uploadCountThisMonth
      : null;

  return (
    <div className="space-y-6">
      {/* 用戶選擇器（僅經理/admin 可見） */}
      {canSelectUser && (
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">查看報告：</span>
          <Select
            onValueChange={(v) => setSelectedUserId(v || undefined)}
            value={selectedUserId || ""}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="自己" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">自己</SelectItem>
              {viewableUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {getDisplayNameByEmail(u.email, u.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <StatCard
          description="所有機會"
          icon={Building2}
          title={
            <TermTooltip termKey="totalOpportunities">機會總數</TermTooltip>
          }
          value={report.summary.totalOpportunities}
        />
        <StatCard
          description="所有對話"
          icon={MessageSquare}
          title={<TermTooltip termKey="totalConversations">對話數</TermTooltip>}
          value={report.summary.totalConversations}
        />
        <StatCard
          description="已完成分析"
          icon={BarChart3}
          title={<TermTooltip termKey="totalAnalyses">分析數</TermTooltip>}
          value={report.summary.totalAnalyses}
        />
        <StatCard
          change={report.summary.scoreChange}
          description="PDCM 平均"
          icon={TrendingUp}
          title={<TermTooltip termKey="avgPdcmScore">PDCM 分數</TermTooltip>}
          value={avgPdcmScore}
        />
        {avgProgressScore !== null && (
          <StatCard
            description="成交推進力"
            icon={Target}
            title={<TermTooltip termKey="progressScore">推進力</TermTooltip>}
            value={avgProgressScore}
          />
        )}
        {uploadCountThisMonth !== null ? (
          <StatCard
            description="本月上傳音檔"
            icon={MessageSquare}
            title="本月上傳"
            value={uploadCountThisMonth}
          />
        ) : (
          <StatCard
            description="在團隊中的排名"
            icon={Trophy}
            title={
              <TermTooltip termKey="teamPerformance">團隊百分位</TermTooltip>
            }
            value={`${report.teamComparison.overallPercentile}%`}
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* PDCM 四維度分析 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              <TermTooltip termKey="pdcmScore">PDCM 四維度分析</TermTooltip>
            </CardTitle>
            <CardDescription>
              Pain 35% · Decision 25% · Champion 25% · Metrics 15%
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasCachedData ? (
              // 新版：從 pdcmAnalysis 讀取
              Object.entries((report as any).pdcmAnalysis || {}).map(
                ([key, dim]: [string, any]) => {
                  const labelInfo = PDCM_LABELS[key];
                  if (!labelInfo) {
                    return null;
                  }
                  return (
                    <PdcmDimensionBar
                      key={key}
                      label={
                        <TermTooltip termKey={labelInfo.termKey}>
                          {labelInfo.label}
                        </TermTooltip>
                      }
                      score={dim.score}
                      trend={dim.trend}
                      weight={PDCM_WEIGHTS[key as keyof typeof PDCM_WEIGHTS]}
                    />
                  );
                }
              )
            ) : (
              // 舊版：從 dimensionAnalysis 讀取（MEDDIC 6 維度映射）
              <>
                <DimensionScoreBar
                  gap={
                    (report.dimensionAnalysis as any)?.identifyPain?.gap ?? ""
                  }
                  label={<TermTooltip termKey="pain">痛點 (Pain)</TermTooltip>}
                  score={
                    (report.dimensionAnalysis as any)?.identifyPain?.score ?? 0
                  }
                  trend={
                    (report.dimensionAnalysis as any)?.identifyPain?.trend ??
                    "stable"
                  }
                />
                <DimensionScoreBar
                  gap={
                    (report.dimensionAnalysis as any)?.decisionProcess?.gap ??
                    ""
                  }
                  label={
                    <TermTooltip termKey="decision">
                      決策 (Decision)
                    </TermTooltip>
                  }
                  score={
                    (report.dimensionAnalysis as any)?.decisionProcess?.score ??
                    0
                  }
                  trend={
                    (report.dimensionAnalysis as any)?.decisionProcess?.trend ??
                    "stable"
                  }
                />
                <DimensionScoreBar
                  gap={(report.dimensionAnalysis as any)?.champion?.gap ?? ""}
                  label={
                    <TermTooltip termKey="champion">
                      支持度 (Champion)
                    </TermTooltip>
                  }
                  score={
                    (report.dimensionAnalysis as any)?.champion?.score ?? 0
                  }
                  trend={
                    (report.dimensionAnalysis as any)?.champion?.trend ??
                    "stable"
                  }
                />
                <DimensionScoreBar
                  gap={(report.dimensionAnalysis as any)?.metrics?.gap ?? ""}
                  label={
                    <TermTooltip termKey="metrics">量化 (Metrics)</TermTooltip>
                  }
                  score={(report.dimensionAnalysis as any)?.metrics?.score ?? 0}
                  trend={
                    (report.dimensionAnalysis as any)?.metrics?.trend ??
                    "stable"
                  }
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* SPIN 四階段分析（僅新版有） */}
        {hasSpinData ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                <TermTooltip termKey="spinAnalysis">SPIN 銷售階段</TermTooltip>
              </CardTitle>
              <CardDescription>
                Situation 15% · Problem 25% · Implication 40% · Need-payoff 20%
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries((report as any).spinAnalysis || {})
                .filter(([key]) => key !== "averageCompletionRate")
                .map(([key, dim]: [string, any]) => {
                  const labelInfo = SPIN_LABELS[key];
                  if (!labelInfo) {
                    return null;
                  }
                  return (
                    <SpinStageBar
                      key={key}
                      label={
                        <TermTooltip termKey={labelInfo.termKey}>
                          {labelInfo.label}
                        </TermTooltip>
                      }
                      score={dim.score}
                      weight={SPIN_WEIGHTS[key as keyof typeof SPIN_WEIGHTS]}
                    />
                  );
                })}
              {(report as any).spinAnalysis?.averageCompletionRate !==
                undefined && (
                <div className="mt-4 rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">SPIN 完成率</span>
                    <span className="font-bold text-lg">
                      {(
                        (report as any).spinAnalysis.averageCompletionRate * 100
                      ).toFixed(0)}
                      %
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          // 舊版：強項與弱項
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="h-5 w-5" />
                強項與弱項
              </CardTitle>
              <CardDescription>基於 PDCM 分數自動識別</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="mb-2 flex items-center gap-2 font-medium text-green-600 dark:text-green-400">
                  <ArrowUp className="h-4 w-4" />
                  強項 (≥4 分)
                </h4>
                {report.strengths.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {report.strengths.map((s) => (
                      <Badge
                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        key={s}
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">尚無強項維度</p>
                )}
              </div>
              <div>
                <h4 className="mb-2 flex items-center gap-2 font-medium text-red-600 dark:text-red-400">
                  <ArrowDown className="h-4 w-4" />
                  弱項 (≤2 分)
                </h4>
                {report.weaknesses.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {report.weaknesses.map((w) => (
                      <Badge
                        className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        key={w}
                      >
                        {w}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    無弱項維度，繼續保持！
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 強項與弱項（新版也顯示） */}
      {hasSpinData &&
        (report.strengths.length > 0 || report.weaknesses.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="h-5 w-5" />
                強項與弱項
              </CardTitle>
              <CardDescription>基於 PDCM 分數自動識別</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="mb-2 flex items-center gap-2 font-medium text-green-600 dark:text-green-400">
                  <ArrowUp className="h-4 w-4" />
                  強項
                </h4>
                {report.strengths.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {report.strengths.map((s) => (
                      <Badge
                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        key={s}
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">尚無強項維度</p>
                )}
              </div>
              <div>
                <h4 className="mb-2 flex items-center gap-2 font-medium text-red-600 dark:text-red-400">
                  <ArrowDown className="h-4 w-4" />
                  弱項
                </h4>
                {report.weaknesses.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {report.weaknesses.map((w) => (
                      <Badge
                        className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        key={w}
                      >
                        {w}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    無弱項維度，繼續保持！
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Coaching Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            個人化教練建議
          </CardTitle>
          <CardDescription>基於 AI 分析的改善建議</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recurring Patterns */}
          {report.coachingInsights.recurringPatterns.length > 0 && (
            <div>
              <h4 className="mb-2 font-medium">重複出現的問題</h4>
              <div className="flex flex-wrap gap-2">
                {report.coachingInsights.recurringPatterns.map((p) => (
                  <Badge key={p} variant="outline">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Improvement Plan */}
          {report.coachingInsights.improvementPlan.length > 0 && (
            <div>
              <h4 className="mb-2 font-medium">改善計畫</h4>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
                {report.coachingInsights.improvementPlan.map((plan, i) => (
                  <li key={i}>{plan}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recent Feedback */}
          {report.coachingInsights.recentFeedback.length > 0 && (
            <div>
              <h4 className="mb-2 font-medium">最近的教練回饋</h4>
              <div className="space-y-2">
                {report.coachingInsights.recentFeedback
                  .slice(0, 3)
                  .map((feedback, i) => (
                    <p className="rounded-lg bg-muted p-3 text-sm" key={i}>
                      {feedback}
                    </p>
                  ))}
              </div>
            </div>
          )}

          {/* 如果沒有任何建議 */}
          {report.coachingInsights.recurringPatterns.length === 0 &&
            report.coachingInsights.improvementPlan.length === 0 &&
            report.coachingInsights.recentFeedback.length === 0 && (
              <p className="text-muted-foreground text-sm">
                目前沒有教練建議，請持續上傳音檔以獲得更多分析。
              </p>
            )}
        </CardContent>
      </Card>

      {/* Progress Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            進步追蹤
          </CardTitle>
          <CardDescription>不同時間區間的表現變化</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-medium">最近 30 天</h4>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-bold text-2xl">
                  {(report.progressTracking.last30Days as any).avgPdcmScore ??
                    report.progressTracking.last30Days.avgScore}
                </span>
                <ScoreChangeBadge
                  change={report.progressTracking.last30Days.change}
                />
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-medium">最近 90 天</h4>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-bold text-2xl">
                  {(report.progressTracking.last90Days as any).avgPdcmScore ??
                    report.progressTracking.last90Days.avgScore}
                </span>
                <ScoreChangeBadge
                  change={report.progressTracking.last90Days.change}
                />
              </div>
            </div>
          </div>

          {/* Milestones */}
          {report.progressTracking.milestones &&
            report.progressTracking.milestones.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 font-medium">達成里程碑</h4>
                <div className="space-y-2">
                  {report.progressTracking.milestones.map((m, i) => (
                    <div
                      className="flex items-center gap-2 rounded-lg bg-green-100 p-2 text-green-800 dark:bg-green-900 dark:text-green-200"
                      key={i}
                    >
                      <Trophy className="h-4 w-4" />
                      <span className="text-sm">{m.achievement}</span>
                      <span className="text-muted-foreground text-xs">
                        ({m.date})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// Upload Ranking Icon
function UploadRankingIcon({ rank }: { rank: number }) {
  if (rank === 1) {
    return <Trophy className="h-4 w-4 text-yellow-500" />;
  }
  if (rank === 2) {
    return <Medal className="h-4 w-4 text-gray-400" />;
  }
  if (rank === 3) {
    return <Medal className="h-4 w-4 text-orange-400" />;
  }
  return null;
}

// Team Performance Report Component
function TeamPerformanceReport() {
  const [department, setDepartment] = useState<"all" | "beauty" | "ichef">(
    "all"
  );
  const [uploadRankingPeriod, setUploadRankingPeriod] = useState<
    "weekly" | "monthly"
  >("monthly");

  const reportQuery = useQuery({
    queryKey: ["analytics", "teamPerformance", { department }],
    queryFn: async () => {
      return await client.analytics.teamPerformance({ department });
    },
  });

  const report = reportQuery.data;
  const isLoading = reportQuery.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        無法載入報告資料（需要經理權限）
      </div>
    );
  }

  if (report.teamSummary.teamSize === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Users className="mx-auto mb-4 h-12 w-12" />
        <p>您目前沒有管理任何團隊成員</p>
        <p className="text-sm">請聯繫管理員設定團隊關係</p>
      </div>
    );
  }

  // 檢查是否有新版 Cache 資料
  const cachedData = (report as any).cachedData;
  const hasCachedData = !!cachedData;

  // 上傳排名資料
  const uploadRankings = hasCachedData
    ? uploadRankingPeriod === "weekly"
      ? cachedData.uploadRankingsWeekly || []
      : cachedData.uploadRankingsMonthly || []
    : [];

  return (
    <div className="space-y-6">
      {/* 部門篩選器 */}
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-sm">篩選部門：</span>
        <Select
          onValueChange={(v) => setDepartment(v as "all" | "beauty" | "ichef")}
          value={department}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="beauty">Beauty</SelectItem>
            <SelectItem value="ichef">iCHEF</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Team Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          description="團隊人數"
          icon={Users}
          title="團隊規模"
          value={report.teamSummary.teamSize}
        />
        <StatCard
          description="團隊總機會"
          icon={Building2}
          title="機會總數"
          value={report.teamSummary.totalOpportunities}
        />
        <StatCard
          description="團隊總對話"
          icon={MessageSquare}
          title="對話數"
          value={report.teamSummary.totalConversations}
        />
        <StatCard
          change={report.teamSummary.scoreChange}
          description="團隊 PDCM 平均"
          icon={TrendingUp}
          title="團隊平均分數"
          value={report.teamSummary.teamAverageScore}
        />
        <StatCard
          description="需要關注"
          icon={Target}
          title="風險機會"
          value={report.attentionNeeded.length}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload Rankings（新版才有） */}
        {hasCachedData && uploadRankings.length > 0 ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  音檔上傳排名
                </CardTitle>
                <Select
                  onValueChange={(v) =>
                    setUploadRankingPeriod(v as "weekly" | "monthly")
                  }
                  value={uploadRankingPeriod}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">本週</SelectItem>
                    <SelectItem value="monthly">本月</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <CardDescription>
                {uploadRankingPeriod === "weekly" ? "本週" : "本月"}上傳音檔數量
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uploadRankings.map((member: any) => (
                  <div
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    key={member.userId}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full font-medium text-xs",
                          member.rank === 1 && "bg-yellow-400 text-yellow-900",
                          member.rank === 2 && "bg-gray-300 text-gray-900",
                          member.rank === 3 && "bg-orange-400 text-orange-900",
                          member.rank > 3 && "bg-muted text-muted-foreground"
                        )}
                      >
                        {member.rank}
                      </span>
                      <p className="font-medium text-sm">{member.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <UploadRankingIcon rank={member.rank} />
                      <span className="font-bold">{member.uploadCount}</span>
                      <span className="text-muted-foreground text-xs">件</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          // 舊版：Member Rankings
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                團隊成員排名
              </CardTitle>
              <CardDescription>依 PDCM 平均分數排序</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.memberRankings.map((member, index) => (
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-lg p-3",
                      member.needsAttention
                        ? "bg-red-50 dark:bg-red-950"
                        : "bg-muted/50"
                    )}
                    key={member.userId}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full font-medium text-xs",
                          index === 0 && "bg-yellow-400 text-yellow-900",
                          index === 1 && "bg-gray-300 text-gray-900",
                          index === 2 && "bg-orange-400 text-orange-900",
                          index > 2 && "bg-muted text-muted-foreground"
                        )}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {member.opportunityCount} 機會 ·{" "}
                          {member.conversationCount} 對話
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendIcon trend={member.trend} />
                      <span className="font-bold">{member.averageScore}</span>
                      {member.needsAttention && (
                        <Badge variant="destructive">需關注</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* PDCM Score Rankings（新版顯示 member rankings） */}
        {hasCachedData ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                PDCM 分數排名
              </CardTitle>
              <CardDescription>依 PDCM 平均分數排序</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(cachedData.memberRankings || report.memberRankings).map(
                  (member: any, index: number) => (
                    <div
                      className={cn(
                        "flex items-center justify-between rounded-lg p-3",
                        (member.averagePdcmScore ?? member.averageScore) < 50
                          ? "bg-red-50 dark:bg-red-950"
                          : "bg-muted/50"
                      )}
                      key={member.userId}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full font-medium text-xs",
                            index === 0 && "bg-yellow-400 text-yellow-900",
                            index === 1 && "bg-gray-300 text-gray-900",
                            index === 2 && "bg-orange-400 text-orange-900",
                            index > 2 && "bg-muted text-muted-foreground"
                          )}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{member.name}</p>
                          {member.uploadCountThisMonth !== undefined && (
                            <p className="text-muted-foreground text-xs">
                              本月上傳 {member.uploadCountThisMonth} 件
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendIcon trend={member.trend} />
                        <span className="font-bold">
                          {member.averagePdcmScore ?? member.averageScore}
                        </span>
                        {(member.averagePdcmScore ?? member.averageScore) <
                          50 && <Badge variant="destructive">需關注</Badge>}
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          // 舊版：Team Dimension Analysis
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                團隊維度分析
              </CardTitle>
              <CardDescription>各維度團隊平均與最佳/最差表現</CardDescription>
            </CardHeader>
            <CardContent>
              {report.teamDimensionAnalysis && (
                <div className="space-y-4">
                  {Object.entries(report.teamDimensionAnalysis).map(
                    ([key, dim]) => {
                      const labels: Record<string, string> = {
                        pain: "痛點",
                        decision: "決策",
                        champion: "支持度",
                        metrics: "量化",
                      };
                      return (
                        <div className="space-y-1" key={key}>
                          <div className="flex items-center justify-between text-sm">
                            <span>{labels[key] || key}</span>
                            <span className="font-medium">{dim.teamAvg}/5</span>
                          </div>
                          <Progress
                            className="h-2"
                            value={(dim.teamAvg / 5) * 100}
                          />
                          <div className="flex justify-between text-muted-foreground text-xs">
                            <span>最佳: {dim.topPerformer}</span>
                            <span>需加強: {dim.bottomPerformer}</span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* PDCM 維度分析（新版 Cache 資料） */}
      {hasCachedData && cachedData.pdcmAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              團隊 PDCM 維度分析
            </CardTitle>
            <CardDescription>各維度團隊平均分數</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Object.entries(cachedData.pdcmAnalysis).map(
                ([key, dim]: [string, any]) => {
                  const labelInfo = PDCM_LABELS[key];
                  if (!labelInfo) {
                    return null;
                  }
                  return (
                    <div
                      className="rounded-lg bg-muted/50 p-4 text-center"
                      key={key}
                    >
                      <p className="text-muted-foreground text-sm">
                        {labelInfo.label}
                      </p>
                      <p className="mt-1 font-bold text-2xl">{dim.teamAvg}</p>
                      <Badge className="mt-1 text-xs" variant="outline">
                        權重 {PDCM_WEIGHTS[key as keyof typeof PDCM_WEIGHTS]}%
                      </Badge>
                    </div>
                  );
                }
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attention Needed */}
      {report.attentionNeeded.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Target className="h-5 w-5" />
              需要關注的機會
            </CardTitle>
            <CardDescription>
              分數低於 50 分的機會，需要經理介入
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.attentionNeeded.map((opp) => (
                <div
                  className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950"
                  key={opp.opportunityId}
                >
                  <div>
                    <p className="font-medium">{opp.companyName}</p>
                    <p className="text-muted-foreground text-sm">
                      負責人: {opp.assignedTo}
                    </p>
                    <p className="text-red-600 text-sm dark:text-red-400">
                      風險: {opp.risk}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive">{opp.score} 分</Badge>
                    <p className="mt-1 text-muted-foreground text-xs">
                      {opp.suggestedAction}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Trends（舊版才有） */}
      {!hasCachedData && report.teamTrends.weeklyScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              團隊趨勢
            </CardTitle>
            <CardDescription>過去 8 週團隊平均分數變化</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={200} width="100%">
              <LineChart data={report.teamTrends.weeklyScores}>
                <XAxis
                  dataKey="week"
                  fontSize={12}
                  stroke="#888888"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis domain={[0, 100]} fontSize={12} stroke="#888888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(value) => `週起始: ${value}`}
                />
                <Line
                  dataKey="avgScore"
                  dot={{ fill: "hsl(var(--primary))" }}
                  name="平均分數"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Coaching Priority（舊版才有） */}
      {!hasCachedData && report.coachingPriority.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              教練優先級
            </CardTitle>
            <CardDescription>優先需要輔導的團隊成員</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.coachingPriority.map((member) => (
                <div
                  className="rounded-lg border bg-muted/50 p-4"
                  key={member.userId}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{member.name}</p>
                    <Badge variant="outline">{member.reason}</Badge>
                  </div>
                  <div className="mt-2">
                    <p className="text-muted-foreground text-sm">
                      建議關注維度:
                    </p>
                    <div className="mt-1 flex gap-2">
                      {member.suggestedFocus.map((focus) => (
                        <Badge key={focus} variant="secondary">
                          {focus}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Main Reports Page
function ReportsPage() {
  return (
    <>
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes shimmer {
            0% { left: -100%; }
            100% { left: 200%; }
          }

          @keyframes pulse-glow {
            0%, 100% {
              box-shadow: 0 0 20px rgba(99, 94, 246, 0.2);
            }
            50% {
              box-shadow: 0 0 30px rgba(99, 94, 246, 0.4);
            }
          }

          .reports-container {
            min-height: 100vh;
            background: linear-gradient(135deg, rgb(2 6 23) 0%, rgb(15 23 42) 50%, rgb(30 41 59) 100%);
            position: relative;
            padding: 2rem;
          }

          .reports-container::before {
            content: '';
            position: absolute;
            inset: 0;
            background-image:
              linear-gradient(to right, rgb(71 85 105 / 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(71 85 105 / 0.1) 1px, transparent 1px);
            background-size: 40px 40px;
            pointer-events: none;
          }

          .reports-content {
            max-width: 1400px;
            margin: 0 auto;
            position: relative;
            z-index: 1;
          }

          .reports-header {
            margin-bottom: 2rem;
            animation: fadeInUp 0.6s ease-out backwards;
          }

          .reports-title {
            font-family: 'Playfair Display', serif;
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, rgb(226 232 240) 0%, rgb(148 163 184) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: -0.02em;
            line-height: 1.2;
          }

          .reports-subtitle {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.875rem;
            color: rgb(148 163 184);
            margin-top: 0.5rem;
          }

          .stat-card {
            border-radius: 0.75rem;
            background: linear-gradient(135deg, rgb(15 23 42) 0%, rgb(30 41 59) 100%);
            border: 1px solid rgb(51 65 85);
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            animation: fadeInUp 0.6s ease-out backwards;
          }

          .stat-card:hover {
            transform: translateY(-4px);
            border-color: rgb(99 94 246);
            box-shadow: 0 0 30px rgba(99, 94, 246, 0.2), 0 10px 20px rgba(0, 0, 0, 0.3);
          }

          .stat-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 1.25rem 0.5rem;
          }

          .stat-card-title {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: rgb(148 163 184);
          }

          .stat-card-icon {
            color: rgb(99 94 246);
          }

          .stat-card-content {
            padding: 0.5rem 1.25rem 1.25rem;
          }

          .stat-card-value {
            font-family: 'JetBrains Mono', monospace;
            font-size: 2rem;
            font-weight: 700;
            color: rgb(226 232 240);
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .stat-card-description {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: rgb(148 163 184);
            margin-top: 0.25rem;
          }

          .change-badge {
            display: inline-flex;
            align-items: center;
            padding: 0.25rem 0.625rem;
            border-radius: 0.375rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            font-weight: 700;
          }

          .change-badge-positive {
            background: rgba(16, 185, 129, 0.2);
            color: rgb(16 185 129);
            border: 1px solid rgba(16, 185, 129, 0.3);
          }

          .change-badge-negative {
            background: rgba(239, 68, 68, 0.2);
            color: rgb(239 68 68);
            border: 1px solid rgba(239, 68, 68, 0.3);
          }

          .change-badge-neutral {
            background: rgba(148, 163, 184, 0.2);
            color: rgb(148 163 184);
            border: 1px solid rgba(148, 163, 184, 0.3);
          }

          .analytics-card {
            border-radius: 0.75rem;
            background: linear-gradient(135deg, rgb(15 23 42) 0%, rgb(30 41 59) 100%);
            border: 1px solid rgb(51 65 85);
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            animation: fadeInUp 0.6s ease-out backwards;
          }

          .analytics-card:hover {
            border-color: rgb(71 85 105);
            box-shadow: 0 0 30px rgba(99, 94, 246, 0.1);
          }

          .analytics-card-header {
            padding: 1.5rem;
            border-bottom: 1px solid rgb(51 65 85);
          }

          .analytics-card-title {
            font-family: 'Playfair Display', serif;
            font-size: 1.5rem;
            font-weight: 700;
            color: rgb(226 232 240);
            letter-spacing: -0.01em;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .analytics-card-description {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8125rem;
            color: rgb(148 163 184);
            margin-top: 0.25rem;
          }

          .analytics-card-content {
            padding: 1.5rem;
          }

          .dimension-bar {
            margin-bottom: 1.5rem;
          }

          .dimension-bar-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0.5rem;
          }

          .dimension-bar-label {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.875rem;
            font-weight: 500;
            color: rgb(226 232 240);
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .dimension-bar-score {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.875rem;
            font-weight: 700;
            color: rgb(99 94 246);
          }

          .custom-progress {
            height: 0.5rem;
            border-radius: 9999px;
            background: rgb(30 41 59);
            overflow: hidden;
            position: relative;
          }

          .custom-progress-fill {
            height: 100%;
            border-radius: 9999px;
            background: linear-gradient(90deg, rgb(99 94 246), rgb(139 92 246));
            transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
          }

          .custom-progress-fill::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            animation: shimmer 2s infinite;
          }

          .dimension-gap {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: rgb(148 163 184);
            margin-top: 0.25rem;
          }

          .ranking-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem;
            border-radius: 0.5rem;
            background: rgb(2 6 23 / 0.5);
            border: 1px solid rgb(30 41 59);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            margin-bottom: 0.75rem;
          }

          .ranking-item:hover {
            background: rgb(30 41 59 / 0.5);
            border-color: rgb(51 65 85);
            transform: translateX(4px);
          }

          .ranking-item.needs-attention {
            background: rgba(239, 68, 68, 0.1);
            border-color: rgba(239, 68, 68, 0.3);
          }

          .ranking-position {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 2rem;
            height: 2rem;
            border-radius: 50%;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.875rem;
            font-weight: 700;
            flex-shrink: 0;
          }

          .ranking-position-gold {
            background: linear-gradient(135deg, rgb(251 191 36), rgb(245 158 11));
            color: rgb(120 53 15);
          }

          .ranking-position-silver {
            background: linear-gradient(135deg, rgb(209 213 219), rgb(156 163 175));
            color: rgb(31 41 55);
          }

          .ranking-position-bronze {
            background: linear-gradient(135deg, rgb(251 146 60), rgb(249 115 22));
            color: rgb(124 45 18);
          }

          .ranking-position-default {
            background: rgb(30 41 59);
            color: rgb(148 163 184);
            border: 1px solid rgb(51 65 85);
          }

          .ranking-member-name {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.9375rem;
            font-weight: 600;
            color: rgb(226 232 240);
          }

          .ranking-member-stats {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: rgb(148 163 184);
            margin-top: 0.25rem;
          }

          .ranking-score {
            font-family: 'JetBrains Mono', monospace;
            font-size: 1.25rem;
            font-weight: 700;
            color: rgb(99 94 246);
          }

          .strength-badge {
            display: inline-flex;
            padding: 0.375rem 0.75rem;
            border-radius: 0.375rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            font-weight: 600;
            background: rgba(16, 185, 129, 0.2);
            color: rgb(16 185 129);
            border: 1px solid rgba(16, 185, 129, 0.3);
          }

          .weakness-badge {
            display: inline-flex;
            padding: 0.375rem 0.75rem;
            border-radius: 0.375rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            font-weight: 600;
            background: rgba(239, 68, 68, 0.2);
            color: rgb(239 68 68);
            border: 1px solid rgba(239, 68, 68, 0.3);
          }

          .insight-card {
            padding: 1rem;
            border-radius: 0.5rem;
            background: rgb(2 6 23 / 0.5);
            border: 1px solid rgb(30 41 59);
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.875rem;
            color: rgb(226 232 240);
            line-height: 1.6;
          }

          .milestone-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.875rem 1rem;
            border-radius: 0.5rem;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.875rem;
            color: rgb(16 185 129);
            margin-bottom: 0.5rem;
          }

          .tabs-industrial {
            animation: fadeInUp 0.6s ease-out backwards;
            animation-delay: 0.2s;
          }

          .tabs-list-industrial {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
            max-width: 32rem;
            padding: 0.25rem;
            border-radius: 0.75rem;
            background: linear-gradient(135deg, rgb(15 23 42) 0%, rgb(30 41 59) 100%);
            border: 1px solid rgb(51 65 85);
          }

          .tabs-trigger-industrial {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.875rem 1.5rem;
            border-radius: 0.5rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.875rem;
            font-weight: 600;
            color: rgb(148 163 184);
            background: transparent;
            border: 1px solid transparent;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .tabs-trigger-industrial:hover {
            color: rgb(226 232 240);
            background: rgb(30 41 59 / 0.5);
          }

          .tabs-trigger-industrial[data-state="active"] {
            color: rgb(2 6 23);
            background: linear-gradient(135deg, rgb(99 94 246) 0%, rgb(139 92 246) 100%);
            border-color: rgb(99 94 246);
            box-shadow: 0 0 20px rgba(99, 94, 246, 0.3);
          }
        `}
      </style>

      <div className="reports-container">
        <div className="reports-content">
          <div className="reports-header">
            <h1 className="reports-title">績效報告</h1>
            <p className="reports-subtitle">業務個人報告與經理團隊報告</p>
          </div>

          <Tabs className="tabs-industrial" defaultValue="personal">
            <div className="tabs-list-industrial">
              <button
                className="tabs-trigger-industrial"
                data-state="active"
                onClick={(e) => {
                  document
                    .querySelectorAll(".tabs-trigger-industrial")
                    .forEach((t) => t.setAttribute("data-state", "inactive"));
                  e.currentTarget.setAttribute("data-state", "active");
                  document
                    .querySelectorAll("[role='tabpanel']")
                    .forEach((p) => {
                      (p as HTMLElement).style.display = "none";
                    });
                  const panel = document.getElementById("personal-panel");
                  if (panel) {
                    panel.style.display = "block";
                  }
                }}
                type="button"
              >
                <UserCircle style={{ width: "1rem", height: "1rem" }} />
                個人報告
              </button>
              <button
                className="tabs-trigger-industrial"
                data-state="inactive"
                onClick={(e) => {
                  document
                    .querySelectorAll(".tabs-trigger-industrial")
                    .forEach((t) => t.setAttribute("data-state", "inactive"));
                  e.currentTarget.setAttribute("data-state", "active");
                  document
                    .querySelectorAll("[role='tabpanel']")
                    .forEach((p) => {
                      (p as HTMLElement).style.display = "none";
                    });
                  const panel = document.getElementById("team-panel");
                  if (panel) {
                    panel.style.display = "block";
                  }
                }}
                type="button"
              >
                <Users style={{ width: "1rem", height: "1rem" }} />
                團隊報告
              </button>
            </div>

            <div
              id="personal-panel"
              role="tabpanel"
              style={{ marginTop: "2rem" }}
            >
              <RepPerformanceReport />
            </div>

            <div
              id="team-panel"
              role="tabpanel"
              style={{ marginTop: "2rem", display: "none" }}
            >
              <TeamPerformanceReport />
            </div>
          </Tabs>
        </div>
      </div>
    </>
  );
}
