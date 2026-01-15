/**
 * Slack Channel Repair Tool
 * 修復 Slack Bot 頻道權限問題
 */

import { z } from "zod";
import type { MCPTool } from "../../../../mcp/types.js";

const SlackChannelRepairInput = z.object({
  dryRun: z.boolean().default(true),
  apiToken: z.string().optional(),
  channelId: z.string().optional(),
  autoJoinChannels: z.boolean().default(false),
});

const SlackChannelRepairOutput = z.object({
  repaired: z.boolean(),
  actions: z.array(z.string()),
  channelsJoined: z.number().optional(),
  dryRun: z.boolean(),
  timestamp: z.date(),
});

type Input = z.infer<typeof SlackChannelRepairInput>;
type Output = z.infer<typeof SlackChannelRepairOutput>;

export const slackChannelRepairTool: MCPTool<Input, Output> = {
  name: "slack_channel_repair",
  description: "修復 Slack Bot 頻道權限問題。可自動加入缺少權限的頻道。",
  inputSchema: SlackChannelRepairInput,
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

        if (input.channelId) {
          actions.push(`1. 檢查頻道 ${input.channelId} 的存取權限`);
          if (input.autoJoinChannels) {
            actions.push(`2. 自動加入頻道 ${input.channelId}`);
          } else {
            actions.push("2. 提供手動加入頻道的指引");
          }
        } else {
          actions.push("1. 掃描所有 Bot 未加入的頻道");
          if (input.autoJoinChannels) {
            actions.push("2. 批次自動加入所有公開頻道");
          } else {
            actions.push("2. 列出需要手動加入的頻道清單");
          }
        }

        return {
          repaired: false,
          actions,
          dryRun: true,
          timestamp: new Date(),
        };
      }

      // 實際修復邏輯
      actions.push("🔧 開始修復頻道權限...");

      // 如果指定了特定頻道
      if (input.channelId) {
        actions.push(`📡 檢查頻道 ${input.channelId}...`);

        // 檢查 Bot 是否已在頻道中
        const infoResponse = await fetch(
          "https://slack.com/api/conversations.info",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ channel: input.channelId }),
          }
        );

        const infoData = (await infoResponse.json()) as {
          ok: boolean;
          error?: string;
          channel?: {
            is_member?: boolean;
            name?: string;
            is_private?: boolean;
          };
        };

        if (!infoData.ok) {
          actions.push(`❌ 無法取得頻道資訊: ${infoData.error}`);
          return {
            repaired: false,
            actions,
            dryRun: false,
            timestamp: new Date(),
          };
        }

        if (infoData.channel?.is_member) {
          actions.push("✅ Bot 已在頻道中，無需修復");
          return {
            repaired: true,
            actions,
            channelsJoined: 0,
            dryRun: false,
            timestamp: new Date(),
          };
        }

        // 嘗試加入頻道
        if (input.autoJoinChannels) {
          if (infoData.channel?.is_private) {
            actions.push("⚠️ 無法自動加入私人頻道，需要手動邀請");
            actions.push(
              `💡 請在 Slack 中手動將 Bot 加入 #${infoData.channel.name}`
            );
            return {
              repaired: false,
              actions,
              dryRun: false,
              timestamp: new Date(),
            };
          }

          actions.push(`📡 嘗試加入頻道 #${infoData.channel?.name}...`);

          const joinResponse = await fetch(
            "https://slack.com/api/conversations.join",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ channel: input.channelId }),
            }
          );

          const joinData = (await joinResponse.json()) as {
            ok: boolean;
            error?: string;
          };

          if (joinData.ok) {
            actions.push(`✅ 成功加入頻道 #${infoData.channel?.name}`);
            return {
              repaired: true,
              actions,
              channelsJoined: 1,
              dryRun: false,
              timestamp: new Date(),
            };
          }

          actions.push(`❌ 加入頻道失敗: ${joinData.error}`);
        } else {
          actions.push("ℹ️ autoJoinChannels 未啟用");
          actions.push(
            `💡 請手動將 Bot 加入 #${infoData.channel?.name} 或使用 autoJoinChannels: true`
          );
        }

        return {
          repaired: false,
          actions,
          dryRun: false,
          timestamp: new Date(),
        };
      }

      // 批次檢查所有頻道
      actions.push("📡 掃描所有頻道...");

      const listResponse = await fetch(
        "https://slack.com/api/conversations.list",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            types: "public_channel",
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
        actions.push(`❌ 無法列出頻道: ${listData.error}`);
        return {
          repaired: false,
          actions,
          dryRun: false,
          timestamp: new Date(),
        };
      }

      const channels = listData.channels || [];
      const notJoinedChannels = channels.filter((ch) => !ch.is_member);

      actions.push(`📊 找到 ${notJoinedChannels.length} 個未加入的公開頻道`);

      if (notJoinedChannels.length === 0) {
        actions.push("✅ Bot 已加入所有公開頻道");
        return {
          repaired: true,
          actions,
          channelsJoined: 0,
          dryRun: false,
          timestamp: new Date(),
        };
      }

      if (!input.autoJoinChannels) {
        actions.push("ℹ️ autoJoinChannels 未啟用，列出需手動加入的頻道：");
        for (const channel of notJoinedChannels.slice(0, 10)) {
          actions.push(`   - #${channel.name} (${channel.id})`);
        }

        if (notJoinedChannels.length > 10) {
          actions.push(`   ... 及其他 ${notJoinedChannels.length - 10} 個頻道`);
        }

        return {
          repaired: false,
          actions,
          dryRun: false,
          timestamp: new Date(),
        };
      }

      // 批次加入頻道
      actions.push("🔧 開始批次加入頻道...");
      let joinedCount = 0;

      for (const channel of notJoinedChannels) {
        try {
          const joinResponse = await fetch(
            "https://slack.com/api/conversations.join",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ channel: channel.id }),
            }
          );

          const joinData = (await joinResponse.json()) as {
            ok: boolean;
            error?: string;
          };

          if (joinData.ok) {
            actions.push(`✅ 已加入 #${channel.name}`);
            joinedCount++;
          } else {
            actions.push(`⚠️ 無法加入 #${channel.name}: ${joinData.error}`);
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          actions.push(`❌ 加入 #${channel.name} 時發生錯誤: ${errorMsg}`);
        }

        // 避免速率限制
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      actions.push(
        `🎯 完成！已加入 ${joinedCount}/${notJoinedChannels.length} 個頻道`
      );

      return {
        repaired: joinedCount > 0,
        actions,
        channelsJoined: joinedCount,
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
