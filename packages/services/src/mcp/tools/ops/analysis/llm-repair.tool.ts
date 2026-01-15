/**
 * Analysis LLM Repair Tool
 * 修復 LLM (Gemini) API 問題
 */

import { z } from "zod";
import type { MCPTool } from "../../../../mcp/types.js";

const AnalysisLlmRepairInput = z.object({
  dryRun: z.boolean().default(true),
  apiKey: z.string().optional(),
  retryAttempts: z.number().min(1).max(5).default(3),
  waitForQuotaReset: z.boolean().default(false),
});

const AnalysisLlmRepairOutput = z.object({
  repaired: z.boolean(),
  actions: z.array(z.string()),
  dryRun: z.boolean(),
  timestamp: z.date(),
});

type Input = z.infer<typeof AnalysisLlmRepairInput>;
type Output = z.infer<typeof AnalysisLlmRepairOutput>;

export const analysisLlmRepairTool: MCPTool<Input, Output> = {
  name: "analysis_llm_repair",
  description:
    "修復 LLM (Gemini) API 連線問題。包含重試、驗證 API Key、等待配額重置等操作。",
  inputSchema: AnalysisLlmRepairInput,
  handler: async (input: Input): Promise<Output> => {
    const actions: string[] = [];

    try {
      const apiKey = input.apiKey || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        actions.push("❌ GEMINI_API_KEY 環境變數未設定");
        return {
          repaired: false,
          actions,
          dryRun: input.dryRun,
          timestamp: new Date(),
        };
      }

      if (input.dryRun) {
        actions.push("🔍 Dry Run 模式 - 僅模擬修復動作");
        actions.push("1. 驗證 GEMINI_API_KEY 有效性");
        actions.push("2. 檢查 Gemini API 服務狀態");
        actions.push(`3. 執行 ${input.retryAttempts} 次重試`);

        if (input.waitForQuotaReset) {
          actions.push("4. 等待配額重置（最多 60 秒）");
        }

        return {
          repaired: false,
          actions,
          dryRun: true,
          timestamp: new Date(),
        };
      }

      // 實際修復邏輯
      actions.push("🔧 開始修復 Gemini API 連線...");

      for (let attempt = 1; attempt <= input.retryAttempts; attempt++) {
        actions.push(`📡 嘗試連線 (第 ${attempt}/${input.retryAttempts} 次)`);

        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
            {
              method: "GET",
            }
          );

          if (response.ok) {
            const data = (await response.json()) as {
              models?: Array<{ name: string }>;
            };

            const hasGeminiModel = data.models?.some((model) =>
              model.name.includes("gemini")
            );

            if (hasGeminiModel) {
              actions.push("✅ API 連線成功，Gemini 模型可用！");
              return {
                repaired: true,
                actions,
                dryRun: false,
                timestamp: new Date(),
              };
            }

            actions.push("⚠️ API 可用但 Gemini 模型不可用");
          } else {
            const errorText = await response.text();
            let errorMessage = `${response.status} ${response.statusText}`;

            try {
              const errorData = JSON.parse(errorText);
              errorMessage =
                errorData.error?.message ||
                errorData.error?.errors?.[0]?.message ||
                errorMessage;
            } catch {
              // 無法解析錯誤
            }

            actions.push(`⚠️ API 請求失敗: ${errorMessage}`);

            // 處理配額限制
            if (response.status === 429 && input.waitForQuotaReset) {
              // Gemini 的配額通常按分鐘或小時重置
              const waitSeconds = 60; // 等待 1 分鐘
              actions.push(`⏳ 配額已用盡，等待 ${waitSeconds} 秒重置...`);
              await new Promise((resolve) =>
                setTimeout(resolve, waitSeconds * 1000)
              );
              continue;
            }

            // 401/403 錯誤表示 API Key 無效
            if (response.status === 401 || response.status === 403) {
              actions.push("❌ API Key 無效或權限不足，無法修復");
              actions.push("💡 建議：檢查 GEMINI_API_KEY 環境變數是否正確");
              actions.push(
                "💡 建議：確認 API Key 已啟用 Gemini 2.0 Flash 模型"
              );
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
      actions.push("💡 建議：檢查 Gemini API 服務狀態");
      actions.push("💡 建議：確認網路連線正常");
      actions.push("💡 建議：檢查是否達到配額限制");
      actions.push(
        "💡 建議：查看 https://ai.google.dev/ 的 API 狀態和配額資訊"
      );

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
