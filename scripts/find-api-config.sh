#!/bin/bash

# ============================================================
# 從 iCHEF Bot 部署資訊中找出 API 配置
# ============================================================

set -e

echo "🔍 尋找 API 配置資訊..."
echo ""
echo "方法 1: 檢查專案程式碼中的提示"
echo "════════════════════════════════════════"
echo ""

cd /Users/stephen/Desktop/sales_ai_automation_v3

# 搜尋可能包含 API URL 的配置檔案
echo "📁 檢查 wrangler.toml 檔案..."
if grep -r "API_BASE_URL" apps/slack-bot/wrangler.toml 2>/dev/null; then
    echo "✅ 在 wrangler.toml 找到 API_BASE_URL 相關配置"
else
    echo "⚠️  wrangler.toml 沒有明確的 API_BASE_URL"
fi

echo ""
echo "📁 檢查 .dev.vars 檔案..."
if [ -f "apps/slack-bot/.dev.vars" ]; then
    echo "✅ 找到 .dev.vars 檔案"
    if grep "API_BASE_URL" apps/slack-bot/.dev.vars 2>/dev/null; then
        echo "內容預覽:"
        grep "API_BASE_URL" apps/slack-bot/.dev.vars | head -n 2
    fi
else
    echo "⚠️  未找到 .dev.vars 檔案"
fi

echo ""
echo "════════════════════════════════════════"
echo "方法 2: 從程式碼推測 API URL"
echo "════════════════════════════════════════"
echo ""

# 檢查是否有其他 Worker 可能是 API
echo "📦 列出所有已部署的 Cloudflare Workers:"
echo ""
wrangler deployments list --name sales-ai-slack-bot 2>/dev/null || echo "無法列出 iCHEF Bot 部署"

echo ""
echo "════════════════════════════════════════"
echo "💡 推薦設定方式"
echo "════════════════════════════════════════"
echo ""
echo "根據專案架構,API_BASE_URL 最可能是:"
echo ""
echo "選項 A: Cloudflare Worker API"
echo "  可能的 URL 格式:"
echo "    - https://sales-ai-api.salesaiautomationv3.workers.dev"
echo "    - https://sales-ai-server.salesaiautomationv3.workers.dev"
echo ""
echo "選項 B: 外部 API"
echo "  需要從團隊文件或部署記錄中確認"
echo ""
echo "════════════════════════════════════════"
echo "🎯 下一步建議"
echo "════════════════════════════════════════"
echo ""
echo "如果您想直接設定而不確定正確值:"
echo ""
echo "1. 先設定測試值,讓 Worker 可以啟動:"
echo "   cd apps/slack-bot-beauty"
echo "   echo 'https://api.temporary.com' | wrangler secret put API_BASE_URL"
echo "   echo 'temp-token' | wrangler secret put API_TOKEN"
echo ""
echo "2. 測試 Slack Bot 基本功能 (不需要 API):"
echo "   - DM @Beauty Sales Bot"
echo "   - 上傳音檔"
echo "   - 確認表單彈出"
echo ""
echo "3. 從錯誤訊息中找到正確的 API URL"
echo "   (當表單提交失敗時)"
echo ""
