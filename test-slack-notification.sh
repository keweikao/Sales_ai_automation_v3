#!/bin/bash

# 測試 Slack 通知 - 驗證更新後的 URL
# 此腳本會發送一個測試通知到 Slack

echo "📱 測試 Slack 通知（含更新後的 URL）"
echo ""

# 讀取環境變數
if [ -z "$SLACK_BOT_TOKEN" ]; then
  echo "❌ 請設定 SLACK_BOT_TOKEN 環境變數"
  echo "範例: export SLACK_BOT_TOKEN='xoxb-your-token'"
  exit 1
fi

if [ -z "$SLACK_CHANNEL_ID" ]; then
  echo "⚠️  未設定 SLACK_CHANNEL_ID，使用預設值"
  SLACK_CHANNEL_ID="C08505L5J0Z"  # 預設測試頻道
fi

echo "頻道 ID: $SLACK_CHANNEL_ID"
echo ""

# 建立測試訊息（使用 Block Kit）
TEST_MESSAGE=$(cat <<'EOF'
{
  "channel": "CHANNEL_ID_PLACEHOLDER",
  "text": "測試通知 - 驗證 URL 更新",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "✅ 音檔處理完成",
        "emoji": true
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*案件編號:*\n202601-IC021"
        },
        {
          "type": "mrkdwn",
          "text": "*處理時間:*\n154.8 秒"
        },
        {
          "type": "mrkdwn",
          "text": "*MEDDIC 分數:*\n*50/100*"
        },
        {
          "type": "mrkdwn",
          "text": "*資格狀態:*\n⚪ Medium"
        }
      ]
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "📱 *建議 SMS 跟進訊息*\n王老闆您好,非常感謝您今天撥冗討論!針對您關心的線上點餐計費與成本效益,已為您整理會議重點,請點擊查看👉[SHORT_URL]\n\n_點擊下方「編輯會議摘要與簡訊」可修改內容並發送_"
      }
    },
    {
      "type": "divider"
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "查看完整分析",
            "emoji": true
          },
          "url": "https://sales-ai-web.pages.dev/conversations/test-conversation-id",
          "style": "primary"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "編輯會議摘要與簡訊",
            "emoji": true
          },
          "url": "https://sales-ai-web.pages.dev/conversations/test-conversation-id/summary"
        }
      ]
    }
  ]
}
EOF
)

# 替換頻道 ID
TEST_MESSAGE=$(echo "$TEST_MESSAGE" | sed "s/CHANNEL_ID_PLACEHOLDER/$SLACK_CHANNEL_ID/")

echo "📤 發送測試訊息..."
echo ""

# 發送到 Slack
RESPONSE=$(curl -s -X POST "https://slack.com/api/chat.postMessage" \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$TEST_MESSAGE")

# 檢查結果
if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "✅ 測試訊息發送成功！"
  echo ""
  echo "請檢查 Slack 頻道中的訊息，確認："
  echo "  1. ✅ 「查看完整分析」按鈕指向 https://sales-ai-web.pages.dev"
  echo "  2. ✅ 「編輯會議摘要與簡訊」按鈕指向 https://sales-ai-web.pages.dev"
  echo "  3. ❌ 確認不是指向 localhost:5173"
else
  echo "❌ 發送失敗"
  echo "錯誤: $RESPONSE"
  exit 1
fi
