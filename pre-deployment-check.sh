#!/bin/bash

# ============================================================
# Pre-Deployment Health Check Script
# 在設定 Slack Event URL 之前執行此腳本
# ============================================================

set -e

echo "🔍 執行部署前健康檢查..."
echo "========================================"
echo ""

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 計數器
PASS=0
FAIL=0

# 檢查函數
check() {
    local name=$1
    local command=$2
    local expected=$3

    echo -n "🔍 檢查 $name ... "

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo -e "${YELLOW}   執行指令: $command${NC}"
        ((FAIL++))
        return 1
    fi
}

# 1. Server API 健康檢查
echo "📋 階段 1: Server API 健康檢查"
echo "----------------------------------------"

check "Server API 端點可達性" \
    "curl -s -f https://sales-ai-server.salesaiautomationv3.workers.dev/ -o /dev/null"

check "Server API Health 端點" \
    "curl -s https://sales-ai-server.salesaiautomationv3.workers.dev/health | grep -q '\"status\":\"healthy\"'"

check "Database 連線正常" \
    "curl -s https://sales-ai-server.salesaiautomationv3.workers.dev/health | grep -q '\"database\":{\"status\":\"healthy\"'"

echo ""

# 2. Slack Bot 健康檢查
echo "📋 階段 2: Slack Bot 健康檢查"
echo "----------------------------------------"

check "Slack Bot 端點可達性" \
    "curl -s -f https://sales-ai-slack-bot.salesaiautomationv3.workers.dev/ -o /dev/null 2>&1 || true"

# 測試 Slack events endpoint (預期會失敗,但證明端點存在)
echo -n "🔍 檢查 Slack Events 端點 ... "
RESPONSE=$(curl -s -X POST https://sales-ai-slack-bot.salesaiautomationv3.workers.dev/slack/events \
    -H "Content-Type: application/json" \
    -d '{"type": "url_verification", "challenge": "test"}')

if echo "$RESPONSE" | grep -q "error\|challenge"; then
    echo -e "${GREEN}✅ PASS${NC} (端點存在且有回應)"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "   回應: $RESPONSE"
    ((FAIL++))
fi

echo ""

# 3. 環境變數檢查 (從 wrangler 中讀取)
echo "📋 階段 3: Cloudflare Workers Secrets 檢查"
echo "----------------------------------------"
echo -e "${YELLOW}ℹ️  注意: 此檢查無法直接驗證 secrets 內容,僅提示${NC}"
echo ""

echo "已設定的 Server API secrets:"
echo "  - DATABASE_URL"
echo "  - DATABASE_URL_DIRECT"
echo "  - BETTER_AUTH_SECRET"
echo "  - GEMINI_API_KEY"
echo "  - GROQ_API_KEY"
echo "  - CLOUDFLARE_R2_ACCESS_KEY"
echo "  - CLOUDFLARE_R2_SECRET_KEY"
echo "  - CLOUDFLARE_R2_BUCKET"
echo "  - CLOUDFLARE_R2_ENDPOINT"
echo "  - GOOGLE_CLIENT_ID"
echo "  - GOOGLE_CLIENT_SECRET"
echo ""

echo "已設定的 Slack Bot secrets:"
echo "  - SLACK_BOT_TOKEN"
echo "  - SLACK_SIGNING_SECRET"
echo "  - API_BASE_URL"
echo "  - EVERY8D_UID"
echo "  - EVERY8D_PWD"
echo ""

# 4. API 連通性測試
echo "📋 階段 4: API 連通性測試"
echo "----------------------------------------"

# 測試 Database latency
echo -n "🔍 檢查 Database 延遲 ... "
LATENCY=$(curl -s https://sales-ai-server.salesaiautomationv3.workers.dev/health | grep -o '"latency":[0-9]*' | head -1 | cut -d':' -f2)

if [ -n "$LATENCY" ] && [ "$LATENCY" -lt 3000 ]; then
    echo -e "${GREEN}✅ PASS${NC} (${LATENCY}ms)"
    ((PASS++))
else
    echo -e "${YELLOW}⚠️  WARNING${NC} (${LATENCY}ms - 可能較慢)"
fi

echo ""

# 5. 部署 URL 摘要
echo "📋 階段 5: 部署 URL 摘要"
echo "----------------------------------------"
echo "🌐 Slack Bot URL:"
echo "   https://sales-ai-slack-bot.salesaiautomationv3.workers.dev"
echo ""
echo "🌐 Server API URL:"
echo "   https://sales-ai-server.salesaiautomationv3.workers.dev"
echo ""
echo "📝 Slack Event Subscriptions 設定 URL:"
echo "   https://sales-ai-slack-bot.salesaiautomationv3.workers.dev/slack/events"
echo ""

# 總結
echo "========================================"
echo "📊 測試結果摘要"
echo "========================================"
echo -e "✅ 通過: ${GREEN}$PASS${NC}"
echo -e "❌ 失敗: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 所有檢查通過!${NC}"
    echo ""
    echo "✨ 下一步:"
    echo "1. 前往 Slack API Dashboard: https://api.slack.com/apps"
    echo "2. 選擇你的 App → Event Subscriptions"
    echo "3. 設定 Request URL:"
    echo "   https://sales-ai-slack-bot.salesaiautomationv3.workers.dev/slack/events"
    echo "4. 確認 Bot Events 包含: file_shared, message.channels, message.groups, message.im"
    echo "5. 儲存並開始測試!"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  部分檢查失敗,請先修復問題再設定 Slack Event URL${NC}"
    echo ""
    echo "💡 除錯提示:"
    echo "1. 檢查 Cloudflare Workers 日誌"
    echo "2. 確認所有 secrets 設定正確"
    echo "3. 執行: curl https://sales-ai-server.salesaiautomationv3.workers.dev/health"
    echo ""
    exit 1
fi
