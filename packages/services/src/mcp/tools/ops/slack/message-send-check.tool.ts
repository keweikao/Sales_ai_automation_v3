/**
 * Slack Message Send Check Tool
 * 檢查 Slack 訊息發送功能狀態
 */

import { z } from "zod";
import type { MCPTool } from "../../../../mcp/types.js";

const SlackMessageSendCheckInput = z.object({
  apiToken: z.string().optional(),
  testChannelId: z.string().optional(),
  dryRun: z.boolean().default(true),
  timeoutMs: z.number().default(5000),
});

const SlackMessageSendCheckOutput = z.object({
  status: z.enum(["healthy", "degraded", "critical"]),
  sendLatencyMs: z.number().optional(),
  testMessageSent: z.boolean(),
  error: z.string().optional(),
  timestamp: z.date(),
});

type Input = z.infer<typeof SlackMessageSendCheckInput>;
type Output = z.infer<typeof SlackMessageSendCheckOutput>;

export const slackMessageSendCheckTool: MCPTool<Input, Output> = {
  name: "slack_message_send_check",
  description: "檢查 Slack 訊息發送功能狀態。可選擇發送測試訊息以驗證功能。",
  inputSchema: SlackMessageSendCheckInput,
  handler: async (input: Input): Promise<Output> => {
    const startTime = Date.now();

    try {
      const token = input.apiToken || process.env.SLACK_BOT_TOKEN;
      if (!token) {
        throw new Error("SLACK_BOT_TOKEN is required");
      }

      // 如果是 dry-run 或沒有提供測試頻道，僅檢查 API 可用性
      if (input.dryRun || !input.testChannelId) {
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

        const data = (await response.json()) as {
          ok: boolean;
          error?: string;
        };

        if (!data.ok) {
          return {
            status: "critical",
            sendLatencyMs: latencyMs,
            testMessageSent: false,
            error: data.error || "Auth failed",
            timestamp: new Date(),
          };
        }

        return {
          status: "healthy",
          sendLatencyMs: latencyMs,
          testMessageSent: false,
          timestamp: new Date(),
        };
      }

      // 實際發送測試訊息
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), input.timeoutMs);

      const testMessage = `🧪 Ops Health Check - ${new Date().toISOString()}`;

      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: input.testChannelId,
          text: testMessage,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const sendLatencyMs = Date.now() - startTime;

      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        ts?: string;
      };

      if (!data.ok) {
        return {
          status: "critical",
          sendLatencyMs,
          testMessageSent: false,
          error: data.error || "Message send failed",
          timestamp: new Date(),
        };
      }

      // 判斷健康狀態（基於延遲）
      let status: "healthy" | "degraded" | "critical" = "healthy";
      let error: string | undefined;

      if (sendLatencyMs > 5000) {
        status = "degraded";
        error = "High latency detected";
      }

      return {
        status,
        sendLatencyMs,
        testMessageSent: true,
        error,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: "critical",
        testMessageSent: false,
        error:
          error instanceof Error ? error.message : "Message send check failed",
        timestamp: new Date(),
      };
    }
  },
};
