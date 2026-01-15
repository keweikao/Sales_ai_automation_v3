/**
 * Transcription API Check Tool
 * 檢查 Groq Whisper API 狀態
 */

import { z } from "zod";
import type { MCPTool } from "../../../../mcp/types.js";

const TranscriptionApiCheckInput = z.object({
  apiKey: z.string().optional(),
  timeoutMs: z.number().default(10_000),
});

const TranscriptionApiCheckOutput = z.object({
  status: z.enum(["healthy", "degraded", "critical"]),
  latencyMs: z.number().optional(),
  quotaRemaining: z.number().optional(),
  error: z.string().optional(),
  timestamp: z.date(),
});

type Input = z.infer<typeof TranscriptionApiCheckInput>;
type Output = z.infer<typeof TranscriptionApiCheckOutput>;

export const transcriptionApiCheckTool: MCPTool<Input, Output> = {
  name: "transcription_api_check",
  description:
    "檢查 Groq Whisper API 狀態、配額和延遲。驗證 API Key 有效性和服務可用性。",
  inputSchema: TranscriptionApiCheckInput,
  handler: async (input: Input): Promise<Output> => {
    const startTime = Date.now();

    try {
      const apiKey = input.apiKey || process.env.GROQ_API_KEY;

      if (!apiKey) {
        throw new Error("GROQ_API_KEY is required");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), input.timeoutMs);

      // 使用 Groq Models API 來檢查連線（不消耗配額）
      const response = await fetch("https://api.groq.com/openai/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API request failed: ${response.status}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorMessage;
        } catch {
          // 無法解析錯誤，使用原始訊息
        }

        // 判斷錯誤類型
        if (response.status === 401) {
          return {
            status: "critical",
            latencyMs,
            error: "Invalid API Key",
            timestamp: new Date(),
          };
        }

        if (response.status === 429) {
          return {
            status: "critical",
            latencyMs,
            error: "Rate limit exceeded",
            timestamp: new Date(),
          };
        }

        if (response.status >= 500) {
          return {
            status: "critical",
            latencyMs,
            error: `Groq service error: ${response.status}`,
            timestamp: new Date(),
          };
        }

        return {
          status: "degraded",
          latencyMs,
          error: errorMessage,
          timestamp: new Date(),
        };
      }

      const data = (await response.json()) as {
        data?: Array<{ id: string }>;
      };

      // 檢查是否有 whisper 模型
      const hasWhisperModel = data.data?.some((model) =>
        model.id.includes("whisper")
      );

      if (!hasWhisperModel) {
        return {
          status: "degraded",
          latencyMs,
          error: "Whisper model not available",
          timestamp: new Date(),
        };
      }

      // 檢查 rate limit headers（如果有的話）
      const rateLimitRemaining = response.headers.get(
        "x-ratelimit-remaining-requests"
      );
      const quotaRemaining = rateLimitRemaining
        ? Number.parseInt(rateLimitRemaining, 10)
        : undefined;

      // 判斷健康狀態
      if (latencyMs > 5000) {
        return {
          status: "degraded",
          latencyMs,
          quotaRemaining,
          error: "High latency detected",
          timestamp: new Date(),
        };
      }

      if (quotaRemaining !== undefined && quotaRemaining < 10) {
        return {
          status: "degraded",
          latencyMs,
          quotaRemaining,
          error: "Low quota remaining",
          timestamp: new Date(),
        };
      }

      return {
        status: "healthy",
        latencyMs,
        quotaRemaining,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: "critical",
        error: error instanceof Error ? error.message : "API check failed",
        timestamp: new Date(),
      };
    }
  },
};
