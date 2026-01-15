/**
 * Slack Connection Repair Tool
 * 修復 Slack API 連線問題
 */

import { z } from "zod";
import type { MCPTool } from "../../../../mcp/types.js";

const SlackConnectionRepairInput = z.object({
  dryRun: z.boolean().default(true),
  apiToken: z.string().optional(),
  retryAttempts: z.number().min(1).max(5).default(3),
});

const SlackConnectionRepairOutput = z.object({
  repaired: z.boolean(),
  actions: z.array(z.string()),
  dryRun: z.boolean(),
  timestamp: z.date(),
});

type Input = z.infer<typeof SlackConnectionRepairInput>;
type Output = z.infer<typeof SlackConnectionRepairOutput>;

export const slackConnectionRepairTool: MCPTool<Input, Output> = {
  name: "slack_connection_repair",
  description:
    "修復 Slack API 連線問題。包含重試連線、驗證 Token、重置連線等操作。",
  inputSchema: SlackConnectionRepairInput,
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
        actions.push("1. 檢查 Slack Bot Token 有效性");
        actions.push("2. 嘗試重新連線到 Slack API");
        actions.push(`3. 執行 ${input.retryAttempts} 次重試`);
        actions.push("4. 驗證連線狀態");

        return {
          repaired: false,
          actions,
          dryRun: true,
          timestamp: new Date(),
        };
      }

      // 實際修復邏輯
      actions.push("🔧 開始修復 Slack 連線...");

      // 1. 驗證 Token
      for (let attempt = 1; attempt <= input.retryAttempts; attempt++) {
        actions.push(`📡 嘗試連線 (第 ${attempt}/${input.retryAttempts} 次)`);

        try {
          const response = await fetch("https://slack.com/api/auth.test", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          const data = (await response.json()) as {
            ok: boolean;
            error?: string;
          };

          if (data.ok) {
            actions.push("✅ 連線成功！");
            return {
              repaired: true,
              actions,
              dryRun: false,
              timestamp: new Date(),
            };
          }

          actions.push(`⚠️ 連線失敗: ${data.error}`);
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          actions.push(`❌ 連線錯誤: ${errorMsg}`);
        }

        // 等待後重試（指數退避）
        if (attempt < input.retryAttempts) {
          const delayMs = Math.min(1000 * 2 ** (attempt - 1), 10_000);
          actions.push(`⏳ 等待 ${delayMs}ms 後重試...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      actions.push("❌ 所有重試嘗試均失敗");
      actions.push("💡 建議：檢查 SLACK_BOT_TOKEN 是否有效");
      actions.push("💡 建議：確認 Slack API 服務狀態");

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
