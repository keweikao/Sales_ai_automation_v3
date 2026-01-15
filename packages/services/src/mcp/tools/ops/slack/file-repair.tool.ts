/**
 * Slack File Repair Tool
 * 修復 Slack 檔案下載問題
 */

import { z } from "zod";
import type { MCPTool } from "../../../../mcp/types.js";

const SlackFileRepairInput = z.object({
  dryRun: z.boolean().default(true),
  apiToken: z.string().optional(),
  fileId: z.string().optional(),
  retryAttempts: z.number().min(1).max(5).default(3),
});

const SlackFileRepairOutput = z.object({
  repaired: z.boolean(),
  actions: z.array(z.string()),
  dryRun: z.boolean(),
  timestamp: z.date(),
});

type Input = z.infer<typeof SlackFileRepairInput>;
type Output = z.infer<typeof SlackFileRepairOutput>;

export const slackFileRepairTool: MCPTool<Input, Output> = {
  name: "slack_file_repair",
  description:
    "修復 Slack 檔案下載問題。嘗試重新下載失敗的檔案或清理損壞的快取。",
  inputSchema: SlackFileRepairInput,
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
        actions.push("1. 檢查 Slack Files API 存取權限");
        actions.push("2. 驗證檔案是否存在");

        if (input.fileId) {
          actions.push(`3. 嘗試重新下載檔案 ${input.fileId}`);
          actions.push(`4. 執行 ${input.retryAttempts} 次重試`);
        } else {
          actions.push("3. 掃描最近失敗的檔案下載記錄");
          actions.push("4. 批次重試失敗的下載");
        }

        return {
          repaired: false,
          actions,
          dryRun: true,
          timestamp: new Date(),
        };
      }

      // 實際修復邏輯
      actions.push("🔧 開始修復 Slack 檔案下載...");

      if (!input.fileId) {
        actions.push("⚠️ 未指定 fileId，無法執行具體修復");
        actions.push("💡 建議：提供失敗的檔案 ID 進行重試");

        return {
          repaired: false,
          actions,
          dryRun: false,
          timestamp: new Date(),
        };
      }

      // 嘗試重新下載檔案
      for (let attempt = 1; attempt <= input.retryAttempts; attempt++) {
        actions.push(`📡 嘗試下載 (第 ${attempt}/${input.retryAttempts} 次)`);

        try {
          // 1. 取得檔案資訊
          const infoResponse = await fetch("https://slack.com/api/files.info", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ file: input.fileId }),
          });

          const infoData = (await infoResponse.json()) as {
            ok: boolean;
            error?: string;
            file?: { url_private_download?: string; name?: string };
          };

          if (!infoData.ok) {
            actions.push(`❌ 檔案資訊查詢失敗: ${infoData.error}`);
            continue;
          }

          if (!infoData.file?.url_private_download) {
            actions.push("❌ 檔案沒有下載 URL");
            break;
          }

          // 2. 下載檔案
          const downloadResponse = await fetch(
            infoData.file.url_private_download,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!downloadResponse.ok) {
            actions.push(
              `⚠️ 下載失敗: ${downloadResponse.status} ${downloadResponse.statusText}`
            );
            continue;
          }

          const arrayBuffer = await downloadResponse.arrayBuffer();
          const sizeKB = (arrayBuffer.byteLength / 1024).toFixed(2);

          actions.push(
            `✅ 檔案下載成功！(${infoData.file.name}, ${sizeKB} KB)`
          );

          return {
            repaired: true,
            actions,
            dryRun: false,
            timestamp: new Date(),
          };
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          actions.push(`❌ 下載錯誤: ${errorMsg}`);
        }

        // 等待後重試（指數退避）
        if (attempt < input.retryAttempts) {
          const delayMs = Math.min(1000 * 2 ** (attempt - 1), 10_000);
          actions.push(`⏳ 等待 ${delayMs}ms 後重試...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      actions.push("❌ 所有重試嘗試均失敗");
      actions.push("💡 建議：檢查檔案是否已被刪除");
      actions.push("💡 建議：確認 Bot 有檔案讀取權限");

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
