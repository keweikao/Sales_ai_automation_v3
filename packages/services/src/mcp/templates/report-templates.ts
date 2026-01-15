/**
 * 報表生成模板
 * 提供 Markdown 格式的報表模板，用於生成 MEDDIC 分析報告、團隊績效報告等
 */

// ============================================================
// Type Definitions
// ============================================================

export interface MEDDICAnalysis {
  conversationId: string;
  caseNumber: string;
  overallScore: number;
  qualificationStatus: string;
  metrics: {
    score: number;
    findings: string;
  };
  economicBuyer: {
    score: number;
    findings: string;
  };
  decisionCriteria: {
    score: number;
    findings: string;
  };
  decisionProcess: {
    score: number;
    findings: string;
  };
  identifyPain: {
    score: number;
    findings: string;
  };
  champion: {
    score: number;
    findings: string;
  };
  recommendations: string[];
  createdAt: string;
}

export interface TeamPerformance {
  period: string;
  totalConversations: number;
  avgMeddicScore: number;
  dealsClosed: number;
  avgDealValue: number;
  activeReps: number;
}

export interface RepPerformance {
  repId: string;
  repName: string;
  conversationCount: number;
  avgScore: number;
  avgMetricsScore: number;
  avgEconomicBuyerScore: number;
  avgDecisionCriteriaScore: number;
  avgDecisionProcessScore: number;
  avgIdentifyPainScore: number;
  avgChampionScore: number;
  opportunitiesCount: number;
  dealsWon: number;
}

// ============================================================
// MEDDIC 分析報告模板
// ============================================================

export function generateMeddicReport(analysis: MEDDICAnalysis): string {
  const scoreBar = (score: number) => {
    const filled = Math.round(score / 10);
    const empty = 10 - filled;
    return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${score}/100`;
  };

  const statusEmoji = (status: string) => {
    switch (status.toLowerCase()) {
      case "qualified":
        return "✅";
      case "needs_improvement":
        return "⚠️";
      case "not_qualified":
        return "❌";
      default:
        return "ℹ️";
    }
  };

  return `# MEDDIC 銷售分析報告

**案件編號**: ${analysis.caseNumber}
**對話 ID**: ${analysis.conversationId}
**生成時間**: ${new Date(analysis.createdAt).toLocaleString("zh-TW")}

---

## 📊 總體評分

${statusEmoji(analysis.qualificationStatus)} **資格狀態**: ${analysis.qualificationStatus.toUpperCase()}

**整體評分**: ${scoreBar(analysis.overallScore)}

---

## 🎯 MEDDIC 六維度分析

### 1️⃣ Metrics (指標)
${scoreBar(analysis.metrics.score)}

**發現**:
${analysis.metrics.findings}

---

### 2️⃣ Economic Buyer (經濟決策者)
${scoreBar(analysis.economicBuyer.score)}

**發現**:
${analysis.economicBuyer.findings}

---

### 3️⃣ Decision Criteria (決策標準)
${scoreBar(analysis.decisionCriteria.score)}

**發現**:
${analysis.decisionCriteria.findings}

---

### 4️⃣ Decision Process (決策流程)
${scoreBar(analysis.decisionProcess.score)}

**發現**:
${analysis.decisionProcess.findings}

---

### 5️⃣ Identify Pain (識別痛點)
${scoreBar(analysis.identifyPain.score)}

**發現**:
${analysis.identifyPain.findings}

---

### 6️⃣ Champion (內部支持者)
${scoreBar(analysis.champion.score)}

**發現**:
${analysis.champion.findings}

---

## 💡 行動建議

${analysis.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join("\n")}

---

## 📈 評分摘要

| 維度 | 評分 | 狀態 |
|------|------|------|
| Metrics | ${analysis.metrics.score}/100 | ${analysis.metrics.score >= 70 ? "✅" : analysis.metrics.score >= 50 ? "⚠️" : "❌"} |
| Economic Buyer | ${analysis.economicBuyer.score}/100 | ${analysis.economicBuyer.score >= 70 ? "✅" : analysis.economicBuyer.score >= 50 ? "⚠️" : "❌"} |
| Decision Criteria | ${analysis.decisionCriteria.score}/100 | ${analysis.decisionCriteria.score >= 70 ? "✅" : analysis.decisionCriteria.score >= 50 ? "⚠️" : "❌"} |
| Decision Process | ${analysis.decisionProcess.score}/100 | ${analysis.decisionProcess.score >= 70 ? "✅" : analysis.decisionProcess.score >= 50 ? "⚠️" : "❌"} |
| Identify Pain | ${analysis.identifyPain.score}/100 | ${analysis.identifyPain.score >= 70 ? "✅" : analysis.identifyPain.score >= 50 ? "⚠️" : "❌"} |
| Champion | ${analysis.champion.score}/100 | ${analysis.champion.score >= 70 ? "✅" : analysis.champion.score >= 50 ? "⚠️" : "❌"} |

---

*此報告由 Sales AI Automation V3 自動生成*
`;
}

// ============================================================
// 團隊績效報告模板
// ============================================================

export function generateTeamReport(
  performance: TeamPerformance,
  reps: RepPerformance[]
): string {
  const topPerformers = [...reps]
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 5);

  const needsSupport = [...reps]
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 3);

  return `# 團隊績效報告

**統計週期**: ${performance.period}
**生成時間**: ${new Date().toLocaleString("zh-TW")}

---

## 📊 整體表現

| 指標 | 數值 |
|------|------|
| 總對話數 | ${performance.totalConversations} |
| 平均 MEDDIC 評分 | ${performance.avgMeddicScore.toFixed(1)}/100 |
| 成交案件數 | ${performance.dealsClosed} |
| 平均成交金額 | $${performance.avgDealValue.toLocaleString()} |
| 活躍業務人員 | ${performance.activeReps} 人 |

---

## 🏆 表現優異業務

${topPerformers
  .map(
    (rep, i) => `
### ${i + 1}. ${rep.repName}

- **平均評分**: ${rep.avgScore.toFixed(1)}/100
- **對話數**: ${rep.conversationCount}
- **商機數**: ${rep.opportunitiesCount}
- **成交數**: ${rep.dealsWon}
- **成交率**: ${rep.opportunitiesCount > 0 ? ((rep.dealsWon / rep.opportunitiesCount) * 100).toFixed(1) : "0"}%

**六維度評分**:
- Metrics: ${rep.avgMetricsScore.toFixed(1)}
- Economic Buyer: ${rep.avgEconomicBuyerScore.toFixed(1)}
- Decision Criteria: ${rep.avgDecisionCriteriaScore.toFixed(1)}
- Decision Process: ${rep.avgDecisionProcessScore.toFixed(1)}
- Identify Pain: ${rep.avgIdentifyPainScore.toFixed(1)}
- Champion: ${rep.avgChampionScore.toFixed(1)}
`
  )
  .join("\n")}

---

## ⚠️ 需要支持的業務

${needsSupport
  .map(
    (rep, i) => `
### ${i + 1}. ${rep.repName}

- **平均評分**: ${rep.avgScore.toFixed(1)}/100
- **對話數**: ${rep.conversationCount}
- **需改進領域**:
${[
  { name: "Metrics", score: rep.avgMetricsScore },
  { name: "Economic Buyer", score: rep.avgEconomicBuyerScore },
  { name: "Decision Criteria", score: rep.avgDecisionCriteriaScore },
  { name: "Decision Process", score: rep.avgDecisionProcessScore },
  { name: "Identify Pain", score: rep.avgIdentifyPainScore },
  { name: "Champion", score: rep.avgChampionScore },
]
  .filter((dim) => dim.score < 60)
  .map((dim) => `  - ${dim.name}: ${dim.score.toFixed(1)}`)
  .join("\n")}
`
  )
  .join("\n")}

---

## 📈 團隊趨勢建議

${performance.avgMeddicScore >= 70 ? "✅ 團隊整體表現優秀，繼續保持！" : performance.avgMeddicScore >= 50 ? "⚠️ 團隊表現中等，建議加強訓練。" : "❌ 團隊表現需要立即改善。"}

${performance.dealsClosed > 0 ? `✅ 本期成功成交 ${performance.dealsClosed} 筆，平均金額 $${performance.avgDealValue.toLocaleString()}。` : "⚠️ 本期尚無成交案件，需檢視銷售策略。"}

${performance.activeReps < 5 ? "⚠️ 活躍業務人員較少，建議增加人力或提升參與度。" : `✅ 團隊有 ${performance.activeReps} 位活躍成員。`}

---

*此報告由 Sales AI Automation V3 自動生成*
`;
}

// ============================================================
// 每日摘要報告模板
// ============================================================

export interface DailySummary {
  date: string;
  newConversations: number;
  completedAnalyses: number;
  alertsTriggered: number;
  avgProcessingTime: number;
  systemHealth: "healthy" | "degraded" | "critical";
}

export function generateDailySummary(summary: DailySummary): string {
  const healthEmoji = {
    healthy: "✅",
    degraded: "⚠️",
    critical: "❌",
  };

  return `# 每日系統摘要

**日期**: ${summary.date}
**系統健康**: ${healthEmoji[summary.systemHealth]} ${summary.systemHealth.toUpperCase()}

---

## 📊 今日統計

| 指標 | 數值 |
|------|------|
| 新增對話 | ${summary.newConversations} |
| 完成分析 | ${summary.completedAnalyses} |
| 觸發警示 | ${summary.alertsTriggered} |
| 平均處理時間 | ${summary.avgProcessingTime.toFixed(1)}s |

---

## 🔍 系統狀態

${
  summary.systemHealth === "healthy"
    ? "✅ 系統運作正常，所有服務健康。"
    : summary.systemHealth === "degraded"
      ? "⚠️ 系統效能下降，建議檢查服務狀態。"
      : "❌ 系統出現嚴重問題，需要立即處理！"
}

${summary.alertsTriggered > 10 ? "⚠️ 今日警示數量異常偏高，請檢查系統日誌。" : ""}

${summary.avgProcessingTime > 30 ? "⚠️ 平均處理時間過長，建議優化流程。" : ""}

---

*此報告由 Sales AI Automation V3 自動生成於 ${new Date().toLocaleString("zh-TW")}*
`;
}
