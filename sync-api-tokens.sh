#!/bin/bash

# 同步 Slack Bot 和 Server 的 API_TOKEN
# 這個腳本會生成一個新的 API token 並同時設定到兩個服務

echo "🔐 同步 Slack Bot 和 Server 的 API_TOKEN"
echo ""

# 生成一個安全的隨機 token (32 字元)
NEW_TOKEN=$(openssl rand -hex 32)

echo "生成的新 token: $NEW_TOKEN"
echo ""

echo "📤 正在設定 Slack Bot 的 API_TOKEN..."
echo "$NEW_TOKEN" | bunx wrangler secret put API_TOKEN

echo ""
echo "📤 正在設定 Server 的 API_TOKEN..."
cd apps/server
echo "$NEW_TOKEN" | bunx wrangler secret put API_TOKEN

echo ""
echo "✅ API_TOKEN 已成功同步！"
echo ""
echo "請重新部署兩個服務以使變更生效："
echo "  bun deploy:slack-bot"
echo "  bun deploy:server"
