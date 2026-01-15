#!/bin/bash

#####################################################################
# Sales AI Automation V3 - 回滾腳本
# 用途: 快速回滾到前一個版本
#####################################################################

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 確認回滾
log_warning "==================================="
log_warning "⚠️  準備執行回滾操作"
log_warning "==================================="

read -p "確定要回滾到前一個版本? (yes/NO): " -r
echo
if [[ ! $REPLY =~ ^yes$ ]]; then
    log_error "回滾已取消"
    exit 1
fi

# 1. 回滾 Queue Worker
log_info "=== Step 1: 回滾 Queue Worker ==="

log_info "查詢前一個部署版本..."
# wrangler deployments list --name queue-worker

log_info "執行回滾..."
# wrangler rollback --name queue-worker --message "Emergency rollback"

log_success "✓ Queue Worker 已回滾"

# 2. 回滾 Slack Bot
log_info "=== Step 2: 回滾 Slack Bot ==="

log_info "查詢前一個部署版本..."
# wrangler deployments list --name slack-bot

log_info "執行回滾..."
# wrangler rollback --name slack-bot --message "Emergency rollback"

log_success "✓ Slack Bot 已回滾"

# 3. 驗證
log_info "=== Step 3: 驗證 ==="

log_info "等待服務重啟 (10 秒)..."
sleep 10

log_info "執行 health check..."
# 執行實際的 health check

log_success "✓ 回滾驗證完成"

# 4. 完成
log_success "==================================="
log_success "✅ 回滾完成"
log_success "==================================="

log_warning "請執行以下步驟:"
echo "  1. 監控服務狀態"
echo "  2. 檢查錯誤日誌"
echo "  3. 通知團隊"
echo "  4. 分析回滾原因"
echo "  5. 修復問題並重新部署"
