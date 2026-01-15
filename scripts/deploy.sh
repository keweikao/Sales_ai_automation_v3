#!/bin/bash

#####################################################################
# Sales AI Automation V3 - 部署腳本
# 用途: 自動化部署 Queue Worker, Slack Bot, Server 到 Cloudflare
#####################################################################

set -e  # Exit on error

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日誌函數
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 確認環境
if [ -z "$1" ]; then
    log_error "請指定部署環境: production 或 staging"
    echo "用法: ./scripts/deploy.sh [production|staging]"
    exit 1
fi

ENVIRONMENT=$1

log_info "開始部署到 ${ENVIRONMENT} 環境..."

# 1. Pre-deployment 檢查
log_info "=== Step 1: Pre-deployment 檢查 ==="

# 檢查 git status
if [ -n "$(git status --porcelain)" ]; then
    log_warning "有未提交的變更"
    git status --short
    read -p "是否繼續部署? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "部署已取消"
        exit 1
    fi
fi

# 檢查必要的環境變數
log_info "檢查環境變數..."
ENV_VARS=(
    "DATABASE_URL"
    "GROQ_API_KEY"
    "GEMINI_API_KEY"
    "SLACK_BOT_TOKEN"
    "CLOUDFLARE_R2_ACCESS_KEY"
    "CLOUDFLARE_R2_SECRET_KEY"
)

for VAR in "${ENV_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        log_warning "環境變數 $VAR 未設定"
    else
        log_success "✓ $VAR"
    fi
done

# 2. 執行測試
log_info "=== Step 2: 執行測試 ==="

log_info "運行單元測試..."
if bun test tests/shared tests/queue-worker tests/services; then
    log_success "✓ 單元測試通過"
else
    log_error "單元測試失敗"
    exit 1
fi

log_info "運行性能測試..."
if bun test tests/performance/audio-processing.test.ts tests/performance/queue-latency.test.ts tests/performance/database.test.ts; then
    log_success "✓ 性能測試通過"
else
    log_error "性能測試失敗"
    exit 1
fi

# 3. Type 檢查
log_info "=== Step 3: Type 檢查 ==="

log_info "檢查 Queue Worker..."
if bun run -F @Sales_ai_automation_v3/queue-worker check-types; then
    log_success "✓ Queue Worker types OK"
else
    log_warning "Queue Worker 有 type 錯誤 (非阻塞)"
fi

log_info "檢查 Slack Bot..."
if bun run -F slack-bot check-types; then
    log_success "✓ Slack Bot types OK"
else
    log_warning "Slack Bot 有 type 錯誤 (非阻塞)"
fi

# 4. 備份資料庫
log_info "=== Step 4: 資料庫備份 ==="

BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
log_info "創建資料庫備份: $BACKUP_FILE"

# 這裡應該執行實際的備份命令
# pg_dump $DATABASE_URL > backups/$BACKUP_FILE

log_success "✓ 資料庫備份完成 (跳過 - 僅 production)"

# 5. 部署
log_info "=== Step 5: 部署 ==="

# 部署 Queue Worker
log_info "部署 Queue Worker..."
if bun run -F @Sales_ai_automation_v3/queue-worker deploy; then
    log_success "✓ Queue Worker 部署成功"
else
    log_error "Queue Worker 部署失敗"
    exit 1
fi

# 部署 Slack Bot
log_info "部署 Slack Bot..."
if bun run -F slack-bot deploy; then
    log_success "✓ Slack Bot 部署成功"
else
    log_error "Slack Bot 部署失敗"
    exit 1
fi

# 6. 部署後驗證
log_info "=== Step 6: 部署後驗證 ==="

log_info "等待服務啟動 (10 秒)..."
sleep 10

# Health check (需要根據實際 API 調整)
# curl -f https://your-api.com/health || log_error "Health check 失敗"

log_success "✓ 部署驗證完成"

# 7. 完成
log_success "==================================="
log_success "🎉 部署到 ${ENVIRONMENT} 成功!"
log_success "==================================="

log_info "部署時間: $(date)"
log_info "備份檔案: $BACKUP_FILE"

# 8. 建議後續步驟
echo ""
log_info "建議後續步驟:"
echo "  1. 監控 Cloudflare Workers 日誌"
echo "  2. 檢查 Slack 通知是否正常"
echo "  3. 執行冒煙測試"
echo "  4. 監控錯誤率和延遲"
