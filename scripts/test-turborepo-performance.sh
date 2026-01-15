#!/bin/bash

#####################################################################
# Turborepo Performance Test Script
# 用途: 測試 Turborepo 構建性能並對比原始構建
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

# 清除所有緩存
clean_all_caches() {
    log_info "清除所有緩存..."

    # 清除 Turborepo 緩存
    rm -rf .turbo

    # 清除 node_modules/.cache
    find . -name ".cache" -type d -exec rm -rf {} + 2>/dev/null || true

    # 清除各個 package 的 dist 目錄
    find apps packages -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
    find apps packages -name ".next" -type d -exec rm -rf {} + 2>/dev/null || true

    log_success "✓ 緩存已清除"
}

# 測量構建時間
measure_build_time() {
    local command=$1
    local description=$2

    log_info "測試: $description"
    log_info "執行: $command"

    local start_time=$(date +%s)

    eval "$command" > /dev/null 2>&1

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo "$duration"
}

# 測試 1: 原始構建性能 (無 Turborepo)
test_baseline_build() {
    log_info "=== 測試 1: 原始構建性能 (冷啟動) ==="

    clean_all_caches

    local times=()
    local runs=3

    for i in $(seq 1 $runs); do
        log_info "  Run $i/$runs..."

        local time=$(measure_build_time "bun run --filter='@sales_ai_automation_v3/*' build" "Baseline build")

        times+=($time)
        log_info "    完成時間: ${time}s"

        # 清除緩存準備下次測試
        clean_all_caches
    done

    # 計算平均值
    local total=0
    for time in "${times[@]}"; do
        total=$((total + time))
    done
    local avg=$((total / runs))

    log_success "✓ 原始構建平均時間: ${avg}s"
    echo "$avg"
}

# 測試 2: Turborepo 冷啟動
test_turbo_cold_start() {
    log_info "=== 測試 2: Turborepo 構建 (冷啟動) ==="

    clean_all_caches

    local time=$(measure_build_time "turbo run build" "Turborepo cold start")

    log_success "✓ Turborepo 冷啟動時間: ${time}s"
    echo "$time"
}

# 測試 3: Turborepo 緩存構建
test_turbo_cached() {
    log_info "=== 測試 3: Turborepo 構建 (使用緩存) ==="

    # 不清除緩存,直接重新構建
    local time=$(measure_build_time "turbo run build" "Turborepo cached build")

    log_success "✓ Turborepo 緩存構建時間: ${time}s"
    echo "$time"
}

# 測試 4: 部分修改後構建
test_turbo_incremental() {
    log_info "=== 測試 4: Turborepo 增量構建 ==="

    # 修改一個檔案
    touch packages/shared/src/index.ts

    local time=$(measure_build_time "turbo run build" "Turborepo incremental build")

    log_success "✓ Turborepo 增量構建時間: ${time}s"
    echo "$time"
}

# 生成性能報告
generate_report() {
    local baseline=$1
    local cold=$2
    local cached=$3
    local incremental=$4

    echo ""
    log_info "=================================================="
    log_info "  Turborepo Performance Report"
    log_info "=================================================="
    echo ""

    log_info "構建時間對比:"
    echo ""
    echo "  📊 原始構建 (無 Turbo):    ${baseline}s"
    echo "  📊 Turbo 冷啟動:           ${cold}s"
    echo "  📊 Turbo 緩存構建:         ${cached}s"
    echo "  📊 Turbo 增量構建:         ${incremental}s"
    echo ""

    # 計算提升百分比
    if [ $baseline -gt 0 ]; then
        local cold_improvement=$(( (baseline - cold) * 100 / baseline ))
        local cached_improvement=$(( (baseline - cached) * 100 / baseline ))
        local incremental_improvement=$(( (baseline - incremental) * 100 / baseline ))

        log_info "性能提升:"
        echo ""
        echo "  🚀 Turbo 冷啟動:           ${cold_improvement}%"
        echo "  🚀 Turbo 緩存構建:         ${cached_improvement}%"
        echo "  🚀 Turbo 增量構建:         ${incremental_improvement}%"
        echo ""

        # 驗收標準: 提升 > 30%
        if [ $cached_improvement -gt 30 ]; then
            log_success "✅ 性能提升達標 (> 30%): ${cached_improvement}%"
        else
            log_warning "⚠️  性能提升未達標 (< 30%): ${cached_improvement}%"
        fi
    fi

    echo ""
    log_info "=================================================="
}

# 主測試流程
main() {
    echo ""
    log_info "=================================================="
    log_info "  Turborepo Performance Test Suite"
    log_info "=================================================="
    echo ""

    # 檢查 turbo 是否安裝
    if ! command -v turbo &> /dev/null; then
        log_error "Turborepo 未安裝,請先安裝: bun add -D turbo"
        exit 1
    fi

    log_success "✓ Turborepo 已安裝"
    echo ""

    # 執行測試
    baseline=$(test_baseline_build)
    echo ""

    cold=$(test_turbo_cold_start)
    echo ""

    cached=$(test_turbo_cached)
    echo ""

    incremental=$(test_turbo_incremental)
    echo ""

    # 生成報告
    generate_report "$baseline" "$cold" "$cached" "$incremental"

    # 保存報告
    log_info "保存性能報告..."

    cat > turborepo-performance-report.txt << EOF
Turborepo Performance Test Report
Generated: $(date)

Build Times:
- Baseline (No Turbo):    ${baseline}s
- Turbo Cold Start:       ${cold}s
- Turbo Cached Build:     ${cached}s
- Turbo Incremental:      ${incremental}s

Performance Improvements:
- Cold Start:       $(( (baseline - cold) * 100 / baseline ))%
- Cached Build:     $(( (baseline - cached) * 100 / baseline ))%
- Incremental:      $(( (baseline - incremental) * 100 / baseline ))%
EOF

    log_success "✓ 報告已保存: turborepo-performance-report.txt"
    echo ""
}

# 執行主流程
main "$@"
