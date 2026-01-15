/**
 * Slack Connection Check Tool
 * 檢查 Slack API 連線狀態
 */

import { z } from "zod";
import type { MCPTool } from "../../../../mcp/types.js";

const SlackConnectionCheckInput = z.object({
  apiToken: z.string().optional(),
  timeoutMs: z.number().default(5000),
});

const SlackConnectionCheckOutput = z.object({
  status: z.enum(["healthy", "degraded", "critical"]),
  latencyMs: z.number().optional(),
  error: z.string().optional(),
  timestamp: z.date(),
});

type Input = z.infer<typeof SlackConnectionCheckInput>;
type Output = z.infer<typeof SlackConnectionCheckOutput>;

export const slackConnectionCheckTool: MCPTool<Input, Output> = {
  name: "slack_connection_check",
  description: "檢查 Slack API 連線狀態、延遲和基本健康狀況",
  inputSchema: SlackConnectionCheckInput,
  handler: async (input: Input): Promise<Output> => {
    const startTime = Date.now();

    try {
      // 使用 auth.test API 檢查連線
      const token = input.apiToken || process.env.SLACK_BOT_TOKEN;
      if (!token) {
        throw new Error("SLACK_BOT_TOKEN is required");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), input.timeoutMs);

      const response = await fetch("https://slack.com/api/auth.test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;
      const data = (await response.json()) as { ok: boolean; error?: string };

      if (!data.ok) {
        return {
          status: "critical",
          latencyMs,
          error: data.error || "Unknown error",
          timestamp: new Date(),
        };
      }

      // 判斷健康狀態
      if (latencyMs > 3000) {
        return {
          status: "degraded",
          latencyMs,
          error: "High latency detected",
          timestamp: new Date(),
        };
      }

      return {
        status: "healthy",
        latencyMs,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: "critical",
        error: error instanceof Error ? error.message : "Connection failed",
        timestamp: new Date(),
      };
    }
  },
};
