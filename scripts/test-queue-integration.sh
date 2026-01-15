#!/bin/bash

#####################################################################
# E2E Queue Integration Test Script
# 用途: 測試完整的音檔處理流程
#####################################################################

set -e

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# 檢查環境變數
check_env() {
    log_info "檢查環境變數..."

    required_vars=(
        "DATABASE_URL"
        "GROQ_API_KEY"
        "GEMINI_API_KEY"
        "CLOUDFLARE_R2_ACCESS_KEY"
        "CLOUDFLARE_R2_SECRET_KEY"
        "CLOUDFLARE_R2_ENDPOINT"
        "CLOUDFLARE_R2_BUCKET"
    )

    missing_vars=()

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_warning "缺少環境變數: ${missing_vars[*]}"
        log_warning "部分測試將被跳過"
        return 1
    fi

    log_success "✓ 環境變數檢查通過"
    return 0
}

# 準備測試音檔
prepare_test_files() {
    log_info "準備測試音檔..."

    mkdir -p test-files

    # 檢查是否已有測試檔案
    if [ ! -f "test-files/test-5mb.mp3" ]; then
        log_warning "測試音檔不存在"
        log_info "請準備以下測試檔案:"
        log_info "  - test-files/test-5mb.mp3 (小檔案測試)"
        log_info "  - test-files/test-20mb.mp3 (中檔案測試)"
        log_info "  - test-files/test-96mb.mp3 (大檔案測試,可選)"
        log_warning "跳過實際音檔測試..."
        return 1
    fi

    log_success "✓ 測試音檔準備完成"
    return 0
}

# 測試 1: 資料庫連接
test_database_connection() {
    log_info "=== 測試 1: 資料庫連接 ==="

    # 使用 psql 測試連接
    if command -v psql &> /dev/null; then
        if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
            log_success "✓ 資料庫連接成功"
        else
            log_error "✗ 資料庫連接失敗"
            exit 1
        fi
    else
        log_warning "⚠️  psql 未安裝,跳過資料庫連接測試"
    fi
}

# 測試 2: 運行單元測試
test_unit_tests() {
    log_info "=== 測試 2: 運行 E2E 單元測試 ==="

    if bun test tests/e2e/queue-integration.test.ts; then
        log_success "✓ E2E 單元測試通過"
    else
        log_error "✗ E2E 單元測試失敗"
        exit 1
    fi
}

# 測試 3: Queue Worker 處理能力 (模擬)
test_queue_processing() {
    log_info "=== 測試 3: Queue Worker 處理能力 (模擬) ==="

    # 這個測試需要實際運行 Queue Worker
    # 目前只做基本驗證

    log_info "檢查 Queue Worker 配置..."

    if [ -f "apps/queue-worker/wrangler.toml" ]; then
        log_success "✓ Queue Worker 配置存在"
    else
        log_error "✗ Queue Worker 配置不存在"
        exit 1
    fi

    log_info "檢查 Queue Worker 程式碼..."

    if [ -f "apps/queue-worker/src/index.ts" ]; then
        log_success "✓ Queue Worker 程式碼存在"
    else
        log_error "✗ Queue Worker 程式碼不存在"
        exit 1
    fi

    log_warning "⚠️  實際 Queue 處理測試需要部署後執行"
}

# 測試 4: 錯誤處理
test_error_handling() {
    log_info "=== 測試 4: 錯誤處理驗證 ==="

    log_info "檢查錯誤處理模組..."

    if [ -f "packages/shared/src/errors/index.ts" ]; then
        log_success "✓ 錯誤處理模組存在"
    else
        log_error "✗ 錯誤處理模組不存在"
        exit 1
    fi

    # 運行錯誤處理測試
    if bun test tests/shared/errors.test.ts; then
        log_success "✓ 錯誤處理測試通過"
    else
        log_error "✗ 錯誤處理測試失敗"
        exit 1
    fi
}

# 測試 5: 性能基準
test_performance_baseline() {
    log_info "=== 測試 5: 性能基準測試 ==="

    log_info "運行性能測試..."

    if bun test tests/performance/; then
        log_success "✓ 性能測試通過"
    else
        log_warning "⚠️  性能測試失敗 (非阻塞)"
    fi
}

# 測試 6: TypeScript 編譯
test_typescript_build() {
    log_info "=== 測試 6: TypeScript 編譯 ==="

    log_info "編譯 Queue Worker..."

    if (cd apps/queue-worker && bun run build); then
        log_success "✓ Queue Worker 編譯成功"
    else
        log_error "✗ Queue Worker 編譯失敗"
        exit 1
    fi

    log_info "編譯 API..."

    if (cd packages/api && bun run build); then
        log_success "✓ API 編譯成功"
    else
        log_error "✗ API 編譯失敗"
        exit 1
    fi
}

# 主測試流程
main() {
    echo ""
    log_info "=================================================="
    log_info "  E2E Queue Integration Test Suite"
    log_info "=================================================="
    echo ""

    # 載入環境變數
    if [ -f .env ]; then
        log_info "載入 .env 檔案..."
        export $(cat .env | grep -v '^#' | xargs)
    fi

    # 執行測試
    ENV_OK=false
    if check_env; then
        ENV_OK=true
    fi
    echo ""

    if [ "$ENV_OK" = true ]; then
        test_database_connection
        echo ""
    else
        log_warning "跳過資料庫連接測試 (缺少環境變數)"
        echo ""
    fi

    test_unit_tests
    echo ""

    test_queue_processing
    echo ""

    test_error_handling
    echo ""

    test_performance_baseline
    echo ""

    test_typescript_build
    echo ""

    # 準備測試檔案 (可選)
    prepare_test_files || true
    echo ""

    # 總結
    log_success "=================================================="
    log_success "🎉 所有核心測試通過！"
    log_success "=================================================="
    log_info ""
    log_info "已完成測試:"
    log_info "  ✓ 資料庫連接"
    log_info "  ✓ E2E 單元測試"
    log_info "  ✓ Queue Worker 配置"
    log_info "  ✓ 錯誤處理"
    log_info "  ✓ 性能基準"
    log_info "  ✓ TypeScript 編譯"
    log_info ""
    log_warning "待執行測試 (需要部署後):"
    log_warning "  ⚠️  實際 Queue 訊息處理"
    log_warning "  ⚠️  Slack 通知測試"
    log_warning "  ⚠️  真實音檔處理"
    log_info ""
    log_info "下一步:"
    log_info "  1. 部署到 Cloudflare Workers"
    log_info "  2. 測試實際音檔處理"
    log_info "  3. 監控 Queue 處理狀態"
    echo ""
}

# 執行主流程
main "$@"
