#!/bin/bash

# ============================================================
# 設定 Beauty Bot API 連接
# ============================================================

set -e

echo "🔐 設定 Beauty Bot API 連接"
echo ""
echo "════════════════════════════════════════"
echo "📋 已確認的資訊"
echo "════════════════════════════════════════"
echo ""
echo "✅ API_BASE_URL: https://sales-ai-server.salesaiautomationv3.workers.dev"
echo "✅ Server 狀態: 運行正常"
echo ""
echo "════════════════════════════════════════"
echo "🔑 設定 API 憑證"
echo "════════════════════════════════════════"
echo ""

cd /Users/stephen/Desktop/sales_ai_automation_v3/apps/slack-bot-beauty

# 設定 API_BASE_URL (已確認)
echo "設定 API_BASE_URL..."
echo "https://sales-ai-server.salesaiautomationv3.workers.dev" | wrangler secret put API_BASE_URL

echo ""
echo "設定 API_TOKEN..."
echo ""
echo "⚠️  API_TOKEN 需要與 iCHEF Bot 使用相同的值"
echo ""
echo "選項 1: 如果您知道 API_TOKEN 的值"
echo "  請在下方提示時輸入"
echo ""
echo "選項 2: 如果您不知道值"
echo "  1) 先輸入一個臨時值 (例如: test-token)"
echo "  2) 測試 Beauty Bot 的表單彈出功能 (不需要真實 token)"
echo "  3) 之後從團隊成員取得正確值再更新"
echo ""
echo "選項 3: 留空並稍後設定"
echo "  (表單彈出功能仍可正常運作)"
echo ""

# 設定 API_TOKEN
wrangler secret put API_TOKEN

echo ""
echo "════════════════════════════════════════"
echo "✅ 設定完成!"
echo "════════════════════════════════════════"
echo ""

# 列出所有 secrets
echo "📋 Beauty Bot Secrets 列表:"
wrangler secret list

echo ""
echo "════════════════════════════════════════"
echo "🧪 測試步驟"
echo "════════════════════════════════════════"
echo ""
echo "1. 測試 Worker 健康檢查:"
echo "   curl https://sales-ai-slack-bot-beauty.salesaiautomationv3.workers.dev"
echo ""
echo "2. 在 Slack 測試 Beauty Bot:"
echo "   a. DM @Beauty Sales Bot"
echo "   b. 上傳音檔"
echo "   c. 確認彈出美業表單 (員工人數、美髮沙龍等)"
echo ""
echo "3. 如果表單提交失敗:"
echo "   - 檢查 logs: wrangler tail sales-ai-slack-bot-beauty"
echo "   - 可能需要更新 API_TOKEN 為正確值"
echo ""
