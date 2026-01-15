#!/bin/bash

#####################################################################
# Sales AI Automation V3 - 資料庫備份腳本
# 用途: 備份 Neon PostgreSQL 資料庫
#####################################################################

set -e

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

# 檢查環境變數
if [ -z "$DATABASE_URL" ]; then
    log_warning "DATABASE_URL 未設定,請從 .env 載入"
    if [ -f .env ]; then
        export $(cat .env | grep DATABASE_URL | xargs)
    else
        echo "錯誤: 找不到 .env 檔案"
        exit 1
    fi
fi

# 創建備份目錄
BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR

# 備份檔案名稱
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

log_info "開始備份資料庫..."
log_info "備份檔案: $BACKUP_FILE"

# 執行備份 (使用 pg_dump)
# 注意: 需要安裝 postgresql-client
if command -v pg_dump &> /dev/null; then
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
    log_success "✓ 備份完成"
else
    log_warning "pg_dump 未安裝,使用 Neon API 備份"
    # 可以使用 Neon API 或其他方式
    echo "TODO: 實作 Neon API 備份"
fi

# 壓縮備份
log_info "壓縮備份檔案..."
gzip "$BACKUP_FILE"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

log_success "✓ 壓縮完成: $COMPRESSED_FILE"

# 顯示檔案大小
FILE_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
log_info "備份大小: $FILE_SIZE"

# 清理舊備份 (保留最近 7 天)
log_info "清理舊備份 (保留 7 天)..."
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
log_success "✓ 舊備份已清理"

# 列出所有備份
log_info "現有備份:"
ls -lh $BACKUP_DIR/backup_*.sql.gz 2>/dev/null || echo "  無備份檔案"

log_success "==================================="
log_success "🎉 資料庫備份完成"
log_success "==================================="
log_info "備份檔案: $COMPRESSED_FILE"
log_info "備份時間: $(date)"
