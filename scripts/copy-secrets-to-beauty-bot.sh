#!/bin/bash

# ============================================================
# 複製 iCHEF Bot 的 API 設定到 Beauty Bot
# ============================================================

set -e

echo "🔐 複製 API 設定從 iCHEF Bot 到 Beauty Bot"
echo ""
echo "由於 Cloudflare Secrets 無法直接複製,"
echo "請手動提供以下資訊:"
echo ""

# ============================================================
# 取得 API_BASE_URL
# ============================================================

echo "📍 請輸入 API_BASE_URL:"
echo "   (應該與 iCHEF Bot 使用相同的 URL)"
echo "   範例: https://your-api.workers.dev"
echo ""
read -p "API_BASE_URL: " API_BASE_URL

if [ -z "$API_BASE_URL" ]; then
    echo "❌ API_BASE_URL 不能為空"
    exit 1
fi

# ============================================================
# 取得 API_TOKEN
# ============================================================

echo ""
echo "🔑 請輸入 API_TOKEN:"
echo "   (應該與 iCHEF Bot 使用相同的 Token)"
echo ""
read -p "API_TOKEN: " API_TOKEN

if [ -z "$API_TOKEN" ]; then
    echo "❌ API_TOKEN 不能為空"
    exit 1
fi

# ============================================================
# 設定到 Beauty Bot
# ============================================================

echo ""
echo "🚀 開始設定 Beauty Bot secrets..."
echo ""

cd /Users/stephen/Desktop/sales_ai_automation_v3/apps/slack-bot-beauty

echo "$API_BASE_URL" | wrangler secret put API_BASE_URL
echo "$API_TOKEN" | wrangler secret put API_TOKEN

echo ""
echo "✅ 設定完成!"
echo ""

# ============================================================
# 驗證
# ============================================================

echo "🔍 驗證 Beauty Bot secrets:"
wrangler secret list

echo ""
echo "════════════════════════════════════════"
echo "✅ Beauty Bot API 設定完成!"
echo "════════════════════════════════════════"
echo ""
echo "現在 Beauty Bot 已經可以使用了!"
echo "測試方式:"
echo "  1. 在 Slack DM @Beauty Sales Bot"
echo "  2. 上傳音檔"
echo "  3. 填寫並提交表單"
echo ""
