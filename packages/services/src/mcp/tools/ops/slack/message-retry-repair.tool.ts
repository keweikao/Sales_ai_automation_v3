/**
 * Slack Message Retry Repair Tool
 * 重試失敗的 Slack 訊息發送
 */

import { z } from "zod";
import type { MCPTool } from "../../../../mcp/types.js";

const SlackMessageRetryRepairInput = z.object({
  dryRun: z.boolean().default(true),
  apiToken: z.string().optional(),
  channelId: z.string().min(1, "Channel ID is required"),
  messageText: z.string().min(1, "Message text is required"),
  retryAttempts: z.number().min(1).max(5).default(3),
  blocks: z.array(z.any()).optional(),
});

const SlackMessageRetryRepairOutput = z.object({
  repaired: z.boolean(),
  actions: z.array(z.string()),
  messageTs: z.string().optional(),
  dryRun: z.boolean(),
  timestamp: z.date(),
});

type Input = z.infer<typeof SlackMessageRetryRepairInput>;
type Output = z.infer<typeof SlackMessageRetryRepairOutput>;

export const slackMessageRetryRepairTool: MCPTool<Input, Output> = {
  name: "slack_message_retry_repair",
  description: "重試失敗的 Slack 訊息發送。支援純文字和 Block Kit 格式訊息。",
  inputSchema: SlackMessageRetryRepairInput,
  handler: async (input: Input): Promise<Output> => {
    const actions: string[] = [];

    try {
      const token = input.apiToken || process.env.SLACK_BOT_TOKEN;

      if (!token) {
        actions.push("❌ SLACK_BOT_TOKEN 環境變數未設定");
        return {
          repaired: false,
          actions,
          dryRun: input.dryRun,
          timestamp: new Date(),
        };
      }

      if (input.dryRun) {
        actions.push("🔍 Dry Run 模式 - 僅模擬修復動作");
        actions.push(`1. 目標頻道: ${input.channelId}`);
        actions.push(`2. 訊息內容: ${input.messageText.substring(0, 50)}...`);
        actions.push(`3. 重試次數: ${input.retryAttempts}`);

        if (input.blocks) {
          actions.push(`4. Block Kit 格式: ${input.blocks.length} 個 blocks`);
        }

        return {
          repaired: false,
          actions,
          dryRun: true,
          timestamp: new Date(),
        };
      }

      // 實際重試邏輯
      actions.push("🔧 開始重試發送訊息...");

      for (let attempt = 1; attempt <= input.retryAttempts; attempt++) {
        actions.push(`📡 發送嘗試 (第 ${attempt}/${input.retryAttempts} 次)`);

        try {
          const payload: Record<string, unknown> = {
            channel: input.channelId,
            text: input.messageText,
          };

          if (input.blocks) {
            payload.blocks = input.blocks;
          }

          const response = await fetch(
            "https://slack.com/api/chat.postMessage",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            }
          );

          const data = (await response.json()) as {
            ok: boolean;
            error?: string;
            ts?: string;
          };

          if (data.ok && data.ts) {
            actions.push(`✅ 訊息發送成功！(ts: ${data.ts})`);

            return {
              repaired: true,
              actions,
              messageTs: data.ts,
              dryRun: false,
              timestamp: new Date(),
            };
          }

          actions.push(`⚠️ 發送失敗: ${data.error}`);

          // 特定錯誤處理
          if (data.error === "channel_not_found") {
            actions.push("❌ 頻道不存在或 Bot 未加入該頻道");
            break;
          }

          if (data.error === "not_in_channel") {
            actions.push("❌ Bot 未加入該頻道，請先邀請 Bot");
            break;
          }

          if (data.error === "invalid_auth") {
            actions.push("❌ Token 無效");
            break;
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          actions.push(`❌ 發送錯誤: ${errorMsg}`);
        }

        // 等待後重試（指數退避）
        if (attempt < input.retryAttempts) {
          const delayMs = Math.min(1000 * 2 ** (attempt - 1), 10_000);
          actions.push(`⏳ 等待 ${delayMs}ms 後重試...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      actions.push("❌ 所有重試嘗試均失敗");
      actions.push("💡 建議：檢查頻道 ID 是否正確");
      actions.push("💡 建議：確認 Bot 已加入目標頻道");
      actions.push("💡 建議：檢查 chat:write scope 權限");

      return {
        repaired: false,
        actions,
        dryRun: false,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      actions.push(`❌ 修復過程發生錯誤: ${errorMsg}`);

      return {
        repaired: false,
        actions,
        dryRun: input.dryRun,
        timestamp: new Date(),
      };
    }
  },
};
