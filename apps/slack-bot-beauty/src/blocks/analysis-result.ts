/**
 * 分析結果 Slack Block UI
 *
 * Agent 1-3 合併報告 + Agent 4 Summary 單獨顯示
 */

export interface AnalysisResultData {
  conversationId: string;
  caseNumber: string;
  companyName: string;

  // Agent 2: MEDDIC 評分
  overallScore: number;
  status: "strong" | "medium" | "weak" | "at_risk";
  dimensions: {
    metrics: number;
    economicBuyer: number;
    decisionCriteria: number;
    decisionProcess: number;
    identifyPain: number;
    champion: number;
  };

  // Agent 2 + 3: 關鍵發現和建議
  keyFindings: string[];
  risks: string[];
  recommendedActions: string[];

  // Agent 4: Summary
  executiveSummary: string;
  nextSteps: Array<{
    action: string;
    owner?: string;
    deadline?: string;
  }>;
}

/**
 * 建構 Agent 1-3 合併分析報告 Block
 */
export function buildAnalysisResultBlocks(data: AnalysisResultData): object[] {
  const statusEmoji = getStatusEmoji(data.status);
  const scoreColor = getScoreColor(data.overallScore);

  const blocks: object[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "MEDDIC 分析完成",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${data.companyName}* | 案件編號: \`${data.caseNumber}\``,
      },
    },
    {
      type: "divider",
    },
    // 總分
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${statusEmoji} *總分: ${data.overallScore}/100* ${scoreColor}`,
      },
    },
    // MEDDIC 六維度
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*M* Metrics\n${getScoreBar(data.dimensions.metrics)} ${data.dimensions.metrics}/5`,
        },
        {
          type: "mrkdwn",
          text: `*E* Economic Buyer\n${getScoreBar(data.dimensions.economicBuyer)} ${data.dimensions.economicBuyer}/5`,
        },
        {
          type: "mrkdwn",
          text: `*D* Decision Criteria\n${getScoreBar(data.dimensions.decisionCriteria)} ${data.dimensions.decisionCriteria}/5`,
        },
        {
          type: "mrkdwn",
          text: `*D* Decision Process\n${getScoreBar(data.dimensions.decisionProcess)} ${data.dimensions.decisionProcess}/5`,
        },
        {
          type: "mrkdwn",
          text: `*I* Identify Pain\n${getScoreBar(data.dimensions.identifyPain)} ${data.dimensions.identifyPain}/5`,
        },
        {
          type: "mrkdwn",
          text: `*C* Champion\n${getScoreBar(data.dimensions.champion)} ${data.dimensions.champion}/5`,
        },
      ],
    },
    {
      type: "divider",
    },
  ];

  // 關鍵發現
  if (data.keyFindings.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🎯 關鍵發現*\n${data.keyFindings
          .slice(0, 3)
          .map((f) => `• ${f}`)
          .join("\n")}`,
      },
    });
  }

  // 風險
  if (data.risks.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*⚠️ 潛在風險*\n${data.risks
          .slice(0, 3)
          .map((r) => `• ${r}`)
          .join("\n")}`,
      },
    });
  }

  // 建議行動
  if (data.recommendedActions.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*💡 建議行動*\n${data.recommendedActions
          .slice(0, 3)
          .map((a) => `• ${a}`)
          .join("\n")}`,
      },
    });
  }

  // Footer
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `對話 ID: \`${data.conversationId}\` | 由 Sales AI 自動生成`,
      },
    ],
  });

  return blocks;
}

/**
 * 建構 Agent 4 Summary Block（含編輯按鈕）
 */
export function buildSummaryBlocks(
  conversationId: string,
  summary: string,
  nextSteps: Array<{ action: string; owner?: string; deadline?: string }>
): object[] {
  const blocks: object[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "會議摘要",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: summary,
      },
    },
  ];

  // 下一步行動
  if (nextSteps.length > 0) {
    const nextStepText = nextSteps
      .slice(0, 3)
      .map((step) => {
        let text = `• ${step.action}`;
        if (step.owner) {
          text += ` (${step.owner})`;
        }
        if (step.deadline) {
          text += ` - ${step.deadline}`;
        }
        return text;
      })
      .join("\n");

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📋 下一步行動*\n${nextStepText}`,
      },
    });
  }

  blocks.push({ type: "divider" });

  // 編輯按鈕
  const buttonValue = JSON.stringify({
    conversationId,
    summary,
  });

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "📝 編輯摘要",
          emoji: true,
        },
        action_id: "edit_summary",
        value: buttonValue,
      },
    ],
  });

  return blocks;
}

// Helper functions
function getStatusEmoji(status: string): string {
  switch (status.toLowerCase()) {
    case "strong":
      return "🟢";
    case "medium":
      return "🟡";
    case "weak":
      return "🟠";
    case "at_risk":
    case "at risk":
      return "🔴";
    default:
      return "⚪";
  }
}

function getScoreColor(score: number): string {
  if (score >= 70) {
    return "🟢";
  }
  if (score >= 40) {
    return "🟡";
  }
  return "🔴";
}

function getScoreBar(score: number): string {
  const filled = Math.round(score);
  const empty = 5 - filled;
  return "▓".repeat(filled) + "░".repeat(empty);
}
