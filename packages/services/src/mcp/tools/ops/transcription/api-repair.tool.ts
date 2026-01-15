/**
 * Transcription API Repair Tool
 * 修復 Groq Whisper API 問題
 */

import { z } from "zod";
import type { MCPTool } from "../../../../mcp/types.js";

const TranscriptionApiRepairInput = z.object({
  dryRun: z.boolean().default(true),
  apiKey: z.string().optional(),
  retryAttempts: z.number().min(1).max(5).default(3),
  waitForRateLimitReset: z.boolean().default(false),
});

const TranscriptionApiRepairOutput = z.object({
  repaired: z.boolean(),
  actions: z.array(z.string()),
  dryRun: z.boolean(),
  timestamp: z.date(),
});

type Input = z.infer<typeof TranscriptionApiRepairInput>;
type Output = z.infer<typeof TranscriptionApiRepairOutput>;

export const transcriptionApiRepairTool: MCPTool<Input, Output> = {
  name: "transcription_api_repair",
  description:
    "修復 Groq Whisper API 連線問題。包含重試、驗證 API Key、等待 Rate Limit 重置等操作。",
  inputSchema: TranscriptionApiRepairInput,
  handler: async (input: Input): Promise<Output> => {
    const actions: string[] = [];

    try {
      const apiKey = input.apiKey || process.env.GROQ_API_KEY;

      if (!apiKey) {
        actions.push("❌ GROQ_API_KEY 環境變數未設定");
        return {
          repaired: false,
          actions,
          dryRun: input.dryRun,
          timestamp: new Date(),
        };
      }

      if (input.dryRun) {
        actions.push("🔍 Dry Run 模式 - 僅模擬修復動作");
        actions.push("1. 驗證 GROQ_API_KEY 有效性");
        actions.push("2. 檢查 Groq API 服務狀態");
        actions.push(`3. 執行 ${input.retryAttempts} 次重試`);

        if (input.waitForRateLimitReset) {
          actions.push("4. 等待 Rate Limit 重置（最多 60 秒）");
        }

        return {
          repaired: false,
          actions,
          dryRun: true,
          timestamp: new Date(),
        };
      }

      // 實際修復邏輯
      actions.push("🔧 開始修復 Groq API 連線...");

      for (let attempt = 1; attempt <= input.retryAttempts; attempt++) {
        actions.push(`📡 嘗試連線 (第 ${attempt}/${input.retryAttempts} 次)`);

        try {
          const response = await fetch(
            "https://api.groq.com/openai/v1/models",
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (response.ok) {
            const data = (await response.json()) as {
              data?: Array<{ id: string }>;
            };

            const hasWhisperModel = data.data?.some((model) =>
              model.id.includes("whisper")
            );

            if (hasWhisperModel) {
              actions.push("✅ API 連線成功，Whisper 模型可用！");
              return {
                repaired: true,
                actions,
                dryRun: false,
                timestamp: new Date(),
              };
            }

            actions.push("⚠️ API 可用但 Whisper 模型不可用");
          } else {
            const errorText = await response.text();
            let errorMessage = `${response.status} ${response.statusText}`;

            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error?.message || errorMessage;
            } catch {
              // 無法解析錯誤
            }

            actions.push(`⚠️ API 請求失敗: ${errorMessage}`);

            // 處理 Rate Limit
            if (response.status === 429 && input.waitForRateLimitReset) {
              const resetTime = response.headers.get(
                "x-ratelimit-reset-requests"
              );

              if (resetTime) {
                const waitSeconds = Math.min(
                  Number.parseInt(resetTime, 10),
                  60
                );
                actions.push(
                  `⏳ Rate Limit 超額，等待 ${waitSeconds} 秒重置...`
                );
                await new Promise((resolve) =>
                  setTimeout(resolve, waitSeconds * 1000)
                );
                continue;
              }
            }

            // 401 錯誤表示 API Key 無效
            if (response.status === 401) {
              actions.push("❌ API Key 無效，無法修復");
              actions.push("💡 建議：檢查 GROQ_API_KEY 環境變數是否正確");
              break;
            }
          }
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
      actions.push("💡 建議：檢查 Groq API 服務狀態");
      actions.push("💡 建議：確認網路連線正常");
      actions.push("💡 建議：檢查是否達到配額限制");

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
