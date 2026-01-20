import { WebClient } from "@slack/web-api";

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const CONVERSATION_ID = "cf75684f-4f5b-4667-8e09-0cd50262d9bc";
const WEB_APP_URL = "https://sales-ai-web.pages.dev";

if (!SLACK_BOT_TOKEN) {
  throw new Error("SLACK_BOT_TOKEN environment variable is required");
}

const slack = new WebClient(SLACK_BOT_TOKEN);

async function main() {
  console.log("📤 發送簡化版 Slack 通知...\n");

  // 從環境變數取得 Slack User ID (您的 Slack ID)
  const SLACK_USER_ID = process.env.SLACK_USER_ID || "U08806M5RV2";

  const message = {
    channel: SLACK_USER_ID,
    text: "✅ 案件 202601-IC019 MEDDIC 分析完成",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "✅ 音檔處理完成",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*案件編號:*\n202601-IC019",
          },
          {
            type: "mrkdwn",
            text: "*處理時間:*\n105.7 秒",
          },
          {
            type: "mrkdwn",
            text: "*MEDDIC 分數:*\n50/100",
          },
          {
            type: "mrkdwn",
            text: "*資格狀態:*\n🟡 Medium",
          },
        ],
      },
      {
        type: "divider",
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "⚠️ *需要注意:*\n• 決策者未在場 - 建議安排與老闆會議\n• 錯失推進機會 - 客戶表達強烈興趣時未要求承諾",
          },
        ],
      },
      {
        type: "divider",
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*📋 下一步行動:*\n\n*【iCHEF 待辦】*\n• 提供詳細報價單（含軟體、加購功能、硬體清單）\n• 提供電子發票申請流程說明\n• 下週確認報價與下一步\n\n*【客戶待辦】*\n• 確認最終軟體方案及加購功能需求\n• 確認硬體設備採購清單\n• 準備菜單資料",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "📊 查看完整分析",
              emoji: true,
            },
            url: `${WEB_APP_URL}/conversations/${CONVERSATION_ID}`,
            style: "primary",
          },
        ],
      },
    ],
  };

  const result = await slack.chat.postMessage(message);

  console.log("✅ 訊息已發送到 Slack!");
  console.log(`Channel: ${result.channel}`);
  console.log(`Timestamp: ${result.ts}`);
}

main().catch(console.error);
