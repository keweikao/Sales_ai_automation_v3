/**
 * Slack Block Kit 訊息構建器
 * 提供統一的訊息格式
 */

import type { KnownBlock } from "@slack/web-api";
import type { MEDDICAnalysisResult } from "./types.js";

/**
 * 構建處理開始通知 Blocks
 */
export function buildProcessingStartedBlocks(
  fileName: string,
  fileSize: number,
  conversationId: string,
  caseNumber?: string
): KnownBlock[] {
  const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🎬 開始處理音檔",
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: "*檔案名稱:*\n" + fileName,
        },
        {
          type: "mrkdwn",
          text: "*檔案大小:*\n" + fileSizeMB + " MB",
        },
      ],
    },
  ];

  if (caseNumber) {
    blocks.push({
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: "*案件編號:*\n" + caseNumber,
        },
        {
          type: "mrkdwn",
          text: "*對話 ID:*\n`" + conversationId + "`",
        },
      ],
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "⏳ 正在進行轉錄和分析,請稍候...",
      },
    ],
  });

  return blocks;
}

/**
 * 構建處理完成通知 Blocks
 */
export function buildProcessingCompletedBlocks(
  caseNumber: string,
  conversationId: string,
  analysisResult: MEDDICAnalysisResult,
  processingTimeMs: number
): KnownBlock[] {
  const processingTimeSec = (processingTimeMs / 1000).toFixed(1);

  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "✅ 音檔處理完成",
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: "*案件編號:*\n" + caseNumber,
        },
        {
          type: "mrkdwn",
          text: "*處理時間:*\n" + processingTimeSec + " 秒",
        },
        {
          type: "mrkdwn",
          text: "*MEDDIC 分數:*\n*" + analysisResult.overallScore + "/100*",
        },
        {
          type: "mrkdwn",
          text:
            "*資格狀態:*\n" +
            getStatusEmoji(analysisResult.qualificationStatus) +
            " " +
            analysisResult.qualificationStatus,
        },
      ],
    },
  ];

  // 添加各維度評分
  if (analysisResult.dimensions) {
    const dimensionFields: Array<{ type: "mrkdwn"; text: string }> = [];

    for (const dimension of Object.values(analysisResult.dimensions)) {
      dimensionFields.push({
        type: "mrkdwn",
        text: "*" + dimension.name + ":*\n" + dimension.score + "/100",
      });
    }

    if (dimensionFields.length > 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*🎯 各維度評分:*",
        },
      });

      blocks.push({
        type: "section",
        fields: dimensionFields,
      });
    }
  }

  // 添加關鍵發現
  if (analysisResult.keyFindings && analysisResult.keyFindings.length > 0) {
    const findingsText = analysisResult.keyFindings
      .slice(0, 3)
      .map((finding) => "• " + finding)
      .join("\n");

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*💡 關鍵發現:*\n" + findingsText,
      },
    });
  }

  // 添加操作按鈕
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "📝 查看完整轉錄",
          emoji: true,
        },
        action_id: "view_full_transcript",
        value: conversationId,
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "📊 查看詳細分析",
          emoji: true,
        },
        action_id: "view_analysis",
        value: conversationId,
        style: "primary",
      },
    ],
  });

  return blocks;
}

/**
 * 構建處理失敗通知 Blocks
 */
export function buildProcessingFailedBlocks(
  fileName: string,
  errorMessage: string,
  caseNumber?: string,
  retryCount?: number
): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "❌ 音檔處理失敗",
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: "*檔案名稱:*\n" + fileName,
        },
      ],
    },
  ];

  if (caseNumber) {
    const sectionBlock = blocks[1];
    if (
      sectionBlock &&
      sectionBlock.type === "section" &&
      "fields" in sectionBlock
    ) {
      sectionBlock.fields?.push({
        type: "mrkdwn",
        text: "*案件編號:*\n" + caseNumber,
      });
    }
  }

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: "*錯誤訊息:*\n```" + errorMessage + "```",
    },
  });

  const retryInfo =
    retryCount !== undefined
      ? "目前重試次數: " + retryCount + "/3"
      : "系統會自動重試最多 3 次";

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "💡 請檢查音檔格式和大小,或稍後再試。" + retryInfo,
      },
    ],
  });

  return blocks;
}

/**
 * 根據資格狀態返回對應的 emoji
 */
function getStatusEmoji(status: string): string {
  const statusMap: Record<string, string> = {
    qualified: "🟢",
    "partially-qualified": "🟡",
    unqualified: "🔴",
    "needs-nurturing": "🟠",
  };

  return statusMap[status.toLowerCase()] || "⚪";
}
