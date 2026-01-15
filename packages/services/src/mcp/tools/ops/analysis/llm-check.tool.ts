/**
 * Analysis LLM Check Tool
 * 檢查 LLM (Gemini) API 狀態
 */

import { z } from "zod";
import type { MCPTool } from "../../../../mcp/types.js";

const AnalysisLlmCheckInput = z.object({
  apiKey: z.string().optional(),
  timeoutMs: z.number().default(10_000),
});

const AnalysisLlmCheckOutput = z.object({
  status: z.enum(["healthy", "degraded", "critical"]),
  latencyMs: z.number().optional(),
  quotaAvailable: z.boolean(),
  error: z.string().optional(),
  timestamp: z.date(),
});

type Input = z.infer<typeof AnalysisLlmCheckInput>;
type Output = z.infer<typeof AnalysisLlmCheckOutput>;

export const analysisLlmCheckTool: MCPTool<Input, Output> = {
  name: "analysis_llm_check",
  description: "檢查 LLM (Gemini) API 狀態。驗證 API 連線和配額可用性。",
  inputSchema: AnalysisLlmCheckInput,
  handler: async (input: Input): Promise<Output> => {
    const startTime = Date.now();

    try {
      const apiKey = input.apiKey || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is required");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), input.timeoutMs);

      // 使用 models.list API 檢查連線（不消耗配額）
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        {
          method: "GET",
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API request failed: ${response.status}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage =
            errorData.error?.message ||
            errorData.error?.errors?.[0]?.message ||
            errorMessage;
        } catch {
          // 無法解析錯誤
        }

        // 判斷錯誤類型
        if (response.status === 401 || response.status === 403) {
          return {
            status: "critical",
            latencyMs,
            quotaAvailable: false,
            error: "Invalid API Key or insufficient permissions",
            timestamp: new Date(),
          };
        }

        if (response.status === 429) {
          return {
            status: "critical",
            latencyMs,
            quotaAvailable: false,
            error: "Rate limit exceeded or quota exhausted",
            timestamp: new Date(),
          };
        }

        if (response.status >= 500) {
          return {
            status: "critical",
            latencyMs,
            quotaAvailable: true,
            error: `Gemini service error: ${response.status}`,
            timestamp: new Date(),
          };
        }

        return {
          status: "degraded",
          latencyMs,
          quotaAvailable: false,
          error: errorMessage,
          timestamp: new Date(),
        };
      }

      const data = (await response.json()) as {
        models?: Array<{ name: string }>;
      };

      // 檢查是否有可用的模型
      const hasGeminiModel = data.models?.some(
        (model) =>
          model.name.includes("gemini-2.0-flash") ||
          model.name.includes("gemini")
      );

      if (!hasGeminiModel) {
        return {
          status: "degraded",
          latencyMs,
          quotaAvailable: true,
          error: "Gemini models not available",
          timestamp: new Date(),
        };
      }

      // 判斷健康狀態
      if (latencyMs > 5000) {
        return {
          status: "degraded",
          latencyMs,
          quotaAvailable: true,
          error: "High latency detected",
          timestamp: new Date(),
        };
      }

      return {
        status: "healthy",
        latencyMs,
        quotaAvailable: true,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: "critical",
        quotaAvailable: false,
        error: error instanceof Error ? error.message : "LLM check failed",
        timestamp: new Date(),
      };
    }
  },
};
