#!/bin/bash

# 202601-IC019 的 conversation ID
CONVERSATION_ID="cf75684f-4f5b-4667-8e09-0cd50262d9bc"

# API endpoint
API_URL="https://sales-ai-server.salesaiautomationv3.workers.dev/rpc/conversations/resendSlackNotification"

echo "📤 正在重新發送 Slack 通知..."
echo "Conversation ID: $CONVERSATION_ID"
echo ""

# 調用 API
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat ~/.slack-cookies 2>/dev/null || echo '')" \
  -d "{\"conversationId\": \"$CONVERSATION_ID\"}" \
  -v

echo ""
echo "✅ 請求已發送!"
