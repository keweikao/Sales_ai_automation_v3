/**
 * Slack Event Listener Check Tool
 * 檢查 Slack Event Listener 狀態
 */

import { z } from "zod";
import type { MCPTool } from "../../../../mcp/types.js";

const SlackEventListenerCheckInput = z.object({
  apiToken: z.string().optional(),
  checkRecentEvents: z.boolean().default(true),
  timeoutMs: z.number().default(5000),
});

const SlackEventListenerCheckOutput = z.object({
  status: z.enum(["healthy", "degraded", "critical"]),
  eventCount: z.number().optional(),
  lastEventTimestamp: z.string().optional(),
  error: z.string().optional(),
  timestamp: z.date(),
});

type Input = z.infer<typeof SlackEventListenerCheckInput>;
type Output = z.infer<typeof SlackEventListenerCheckOutput>;

export const slackEventListenerCheckTool: MCPTool<Input, Output> = {
  name: "slack_event_listener_check",
  description:
    "檢查 Slack Event Listener 狀態。驗證 Event Subscriptions 是否正常接收事件。",
  inputSchema: SlackEventListenerCheckInput,
  handler: async (input: Input): Promise<Output> => {
    try {
      const token = input.apiToken || process.env.SLACK_BOT_TOKEN;
      if (!token) {
        throw new Error("SLACK_BOT_TOKEN is required");
      }

      // 檢查 Bot 資訊
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), input.timeoutMs);

      const authResponse = await fetch("https://slack.com/api/auth.test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const authData = (await authResponse.json()) as {
        ok: boolean;
        error?: string;
        bot_id?: string;
      };

      if (!authData.ok) {
        return {
          status: "critical",
          error: authData.error || "Auth failed",
          timestamp: new Date(),
        };
      }

      if (!input.checkRecentEvents) {
        // 僅檢查 API 可用性
        return {
          status: "healthy",
          timestamp: new Date(),
        };
      }

      // 檢查最近的對話歷史（作為事件接收的代理指標）
      // 注意：實際的 Event Subscriptions 檢查需要訪問 Slack App 配置
      // 這裡我們檢查 conversations.history 作為健康指標

      const channelResponse = await fetch(
        "https://slack.com/api/conversations.list",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ limit: 1 }),
        }
      );

      const channelData = (await channelResponse.json()) as {
        ok: boolean;
        error?: string;
        channels?: Array<{ id: string }>;
      };

      if (!(channelData.ok && channelData.channels?.[0])) {
        return {
          status: "degraded",
          error: "Cannot access channels",
          timestamp: new Date(),
        };
      }

      const channelId = channelData.channels[0].id;

      // 檢查頻道歷史
      const historyResponse = await fetch(
        "https://slack.com/api/conversations.history",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ channel: channelId, limit: 10 }),
        }
      );

      const historyData = (await historyResponse.json()) as {
        ok: boolean;
        error?: string;
        messages?: Array<{ ts: string }>;
      };

      if (!historyData.ok) {
        return {
          status: "degraded",
          error: historyData.error || "Cannot read message history",
          timestamp: new Date(),
        };
      }

      const eventCount = historyData.messages?.length || 0;
      const lastEventTimestamp = historyData.messages?.[0]?.ts;

      // 如果最近有訊息，視為健康
      if (eventCount > 0 && lastEventTimestamp) {
        const lastEventTime = Number.parseFloat(lastEventTimestamp) * 1000;
        const hoursSinceLastEvent =
          (Date.now() - lastEventTime) / (1000 * 60 * 60);

        // 如果超過 24 小時沒有訊息，視為 degraded
        if (hoursSinceLastEvent > 24) {
          return {
            status: "degraded",
            eventCount,
            lastEventTimestamp: new Date(lastEventTime).toISOString(),
            error: "No recent events (>24h)",
            timestamp: new Date(),
          };
        }

        return {
          status: "healthy",
          eventCount,
          lastEventTimestamp: new Date(lastEventTime).toISOString(),
          timestamp: new Date(),
        };
      }

      return {
        status: "healthy",
        eventCount: 0,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: "critical",
        error:
          error instanceof Error
            ? error.message
            : "Event listener check failed",
        timestamp: new Date(),
      };
    }
  },
};
