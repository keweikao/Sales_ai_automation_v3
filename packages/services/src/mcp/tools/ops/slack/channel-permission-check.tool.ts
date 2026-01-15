/**
 * Slack Channel Permission Check Tool
 * 檢查 Slack Bot 頻道權限
 */

import { z } from "zod";
import type { MCPTool } from "../../../../mcp/types.js";

const SlackChannelPermissionCheckInput = z.object({
  apiToken: z.string().optional(),
  channelId: z.string().optional(),
  checkAllChannels: z.boolean().default(false),
  timeoutMs: z.number().default(5000),
});

const SlackChannelPermissionCheckOutput = z.object({
  status: z.enum(["healthy", "degraded", "critical"]),
  channelsChecked: z.number(),
  accessibleChannels: z.number(),
  missingPermissions: z.array(z.string()).optional(),
  error: z.string().optional(),
  timestamp: z.date(),
});

type Input = z.infer<typeof SlackChannelPermissionCheckInput>;
type Output = z.infer<typeof SlackChannelPermissionCheckOutput>;

export const slackChannelPermissionCheckTool: MCPTool<Input, Output> = {
  name: "slack_channel_permission_check",
  description: "檢查 Slack Bot 的頻道存取權限。可檢查特定頻道或所有頻道。",
  inputSchema: SlackChannelPermissionCheckInput,
  handler: async (input: Input): Promise<Output> => {
    try {
      const token = input.apiToken || process.env.SLACK_BOT_TOKEN;
      if (!token) {
        throw new Error("SLACK_BOT_TOKEN is required");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), input.timeoutMs);

      // 如果指定了特定頻道
      if (input.channelId && !input.checkAllChannels) {
        // 嘗試讀取頻道資訊
        const response = await fetch(
          "https://slack.com/api/conversations.info",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ channel: input.channelId }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        const data = (await response.json()) as {
          ok: boolean;
          error?: string;
          channel?: {
            is_member?: boolean;
            name?: string;
          };
        };

        if (!data.ok) {
          if (data.error === "channel_not_found") {
            return {
              status: "critical",
              channelsChecked: 1,
              accessibleChannels: 0,
              missingPermissions: ["channel_not_found"],
              error: "Channel not found or Bot not in channel",
              timestamp: new Date(),
            };
          }

          return {
            status: "critical",
            channelsChecked: 1,
            accessibleChannels: 0,
            error: data.error || "Permission check failed",
            timestamp: new Date(),
          };
        }

        // 檢查 Bot 是否為成員
        if (data.channel?.is_member === false) {
          return {
            status: "degraded",
            channelsChecked: 1,
            accessibleChannels: 0,
            missingPermissions: ["not_in_channel"],
            error: `Bot is not a member of #${data.channel.name}`,
            timestamp: new Date(),
          };
        }

        return {
          status: "healthy",
          channelsChecked: 1,
          accessibleChannels: 1,
          timestamp: new Date(),
        };
      }

      // 檢查所有頻道
      const listResponse = await fetch(
        "https://slack.com/api/conversations.list",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            types: "public_channel,private_channel",
            limit: 100,
          }),
        }
      );

      const listData = (await listResponse.json()) as {
        ok: boolean;
        error?: string;
        channels?: Array<{
          id: string;
          name: string;
          is_member?: boolean;
        }>;
      };

      if (!listData.ok) {
        return {
          status: "critical",
          channelsChecked: 0,
          accessibleChannels: 0,
          error: listData.error || "Failed to list channels",
          timestamp: new Date(),
        };
      }

      const channels = listData.channels || [];
      const channelsChecked = channels.length;
      const accessibleChannels = channels.filter((ch) => ch.is_member).length;
      const inaccessibleChannels = channels.filter((ch) => !ch.is_member);

      if (accessibleChannels === 0 && channelsChecked > 0) {
        return {
          status: "critical",
          channelsChecked,
          accessibleChannels: 0,
          missingPermissions: inaccessibleChannels.map((ch) => ch.name),
          error: "Bot is not a member of any channels",
          timestamp: new Date(),
        };
      }

      if (inaccessibleChannels.length > channelsChecked * 0.5) {
        return {
          status: "degraded",
          channelsChecked,
          accessibleChannels,
          missingPermissions: inaccessibleChannels
            .slice(0, 10)
            .map((ch) => ch.name),
          error: `Bot is missing from ${inaccessibleChannels.length} channels`,
          timestamp: new Date(),
        };
      }

      return {
        status: "healthy",
        channelsChecked,
        accessibleChannels,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: "critical",
        channelsChecked: 0,
        accessibleChannels: 0,
        error:
          error instanceof Error ? error.message : "Permission check failed",
        timestamp: new Date(),
      };
    }
  },
};
