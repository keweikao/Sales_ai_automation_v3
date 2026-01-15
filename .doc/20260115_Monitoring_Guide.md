# Sales AI Automation V3 - 監控指南

## 監控架構

### 監控層級
1. **應用層**: Queue Worker, Slack Bot, Server
2. **基礎設施層**: Cloudflare Workers, Neon DB, R2 Storage
3. **外部服務層**: Groq Whisper, Google Gemini, Slack API

---

## 關鍵指標 (Key Metrics)

### 1. Queue Worker 指標

#### 處理性能
- **指標**: 音檔處理時間
- **目標**:
  - 5MB: < 5 分鐘
  - 20MB: < 10 分鐘
  - 25MB: < 15 分鐘
- **告警**: > 20 分鐘
- **查看**: Cloudflare Workers Analytics

#### 錯誤率
- **指標**: 處理失敗率
- **目標**: < 1%
- **告警**: > 5%
- **查看**: Cloudflare Workers Logs

#### Queue 堆積
- **指標**: 待處理訊息數量
- **目標**: < 10
- **告警**: > 100
- **查看**: Cloudflare Queue Metrics

### 2. Slack Bot 指標

#### API 回應時間
- **指標**: Slash command 回應時間
- **目標**: < 3 秒 (Slack 限制)
- **告警**: > 2.5 秒
- **查看**: Cloudflare Workers Analytics

#### 上傳成功率
- **指標**: 音檔上傳成功率
- **目標**: > 99%
- **告警**: < 95%
- **查看**: Application Logs

### 3. 資料庫指標

#### 查詢性能
- **指標**: 平均查詢時間
- **目標**: < 100ms
- **告警**: > 500ms
- **查看**: Neon Dashboard

#### 連接數
- **指標**: Active connections
- **目標**: < 15 (pool size 20)
- **告警**: > 18
- **查看**: Neon Dashboard

#### 儲存空間
- **指標**: Database size
- **目標**: < 80% quota
- **告警**: > 90% quota
- **查看**: Neon Dashboard

### 4. 外部服務指標

#### Groq API
- **指標**: API 成功率
- **目標**: > 99%
- **告警**: < 95%
- **監控**: API 回應碼

#### Gemini API
- **指標**: API 成功率
- **目標**: > 99%
- **告警**: < 95%
- **監控**: API 回應碼

#### R2 Storage
- **指標**: 上傳/下載成功率
- **目標**: > 99.9%
- **告警**: < 99%
- **查看**: Cloudflare R2 Metrics

---

## 監控工具

### 1. Cloudflare Dashboard
**網址**: https://dash.cloudflare.com

**功能**:
- Workers Analytics
- Queue Metrics
- R2 Storage Metrics
- Real-time Logs

**關鍵頁面**:
- Workers > Analytics
- Workers > Logs (Real-time)
- Queues > Metrics
- R2 > Bucket Metrics

### 2. Neon Database Dashboard
**網址**: https://console.neon.tech

**功能**:
- Query Performance
- Connection Pool Status
- Storage Usage
- Database Logs

### 3. Application Logs

**Queue Worker Logs**:
```bash
# Real-time logs
bun run -F @Sales_ai_automation_v3/queue-worker tail

# 或使用 wrangler
cd apps/queue-worker
wrangler tail
```

**Slack Bot Logs**:
```bash
bun run -F slack-bot tail

# 或
cd apps/slack-bot
wrangler tail
```

---

## 告警設置

### Cloudflare Alerts

#### 錯誤率告警
```
條件: Error rate > 5% (5 分鐘內)
動作: Email + Slack notification
頻率: 最多每小時 1 次
```

#### Queue 堆積告警
```
條件: Queue depth > 100
動作: Email + Slack notification
頻率: 每 15 分鐘
```

### 自定義告警腳本

**範例**: 監控 Queue 深度
```bash
#!/bin/bash
# scripts/check-queue-depth.sh

QUEUE_DEPTH=$(wrangler queues list | grep transcription-queue | awk '{print $3}')

if [ "$QUEUE_DEPTH" -gt 100 ]; then
    echo "WARNING: Queue depth is $QUEUE_DEPTH"
    # 發送 Slack 通知
    curl -X POST $SLACK_WEBHOOK_URL \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"⚠️ Queue depth is $QUEUE_DEPTH\"}"
fi
```

---

## 日誌查詢

### 常見查詢

#### 查詢錯誤日誌
```bash
# Cloudflare Workers
wrangler tail --format json | grep "ERROR"

# 過濾特定錯誤
wrangler tail --format json | grep "TRANSCRIPTION_FAILED"
```

#### 查詢慢查詢
```sql
-- Neon Database
SELECT
    query,
    mean_exec_time,
    calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;
```

#### 查詢處理時間
```bash
# 從 logs 提取處理時間
wrangler tail | grep "Processing completed" | awk '{print $NF}'
```

---

## 性能優化建議

### Queue Worker

#### 優化處理速度
1. 使用 Groq Whisper large-v3 模型 (已配置)
2. 啟用並發處理 (Cloudflare Queue auto-scaling)
3. 優化音檔下載 (啟用重試機制)

#### 減少錯誤率
1. 添加輸入驗證 (檔案大小、格式)
2. 改進錯誤處理 (重試邏輯)
3. 監控外部 API 狀態

### Database

#### 查詢優化
1. 確保索引存在:
   - conversations.id (primary key)
   - conversations.opportunity_id
   - conversations.status
   - conversations.created_at

2. 使用 EXPLAIN ANALYZE 分析慢查詢

3. 啟用 connection pooling (已配置)

### R2 Storage

#### 優化建議
1. 使用 multipart upload (大檔案)
2. 啟用 cache control headers
3. 實作重試機制 (已完成)

---

## 故障排查 (Troubleshooting)

### 常見問題

#### 1. Queue Worker 處理緩慢

**症狀**: 處理時間超過預期

**檢查步驟**:
1. 查看 Groq API 延遲
2. 檢查資料庫連接
3. 查看 R2 下載速度
4. 檢查 Worker CPU time

**解決方案**:
- 增加 Queue concurrency
- 優化 API 調用
- 檢查網路連接

#### 2. Database Connection Pool 耗盡

**症狀**: "too many connections" 錯誤

**檢查步驟**:
1. 查看 active connections: `SELECT count(*) FROM pg_stat_activity;`
2. 檢查 long-running queries
3. 查看 connection pool 配置

**解決方案**:
- 增加 pool size
- 關閉 idle connections
- 優化慢查詢

#### 3. Slack Bot 回應超時

**症狀**: Slack 顯示 "Operation timed out"

**檢查步驟**:
1. 查看 Worker execution time
2. 檢查 API 調用延遲
3. 查看 Queue 發送是否成功

**解決方案**:
- 使用異步處理
- 立即回應,後台處理
- 優化 API 調用

---

## 定期維護任務

### 每日
- [ ] 檢查錯誤日誌
- [ ] 查看 Queue 深度
- [ ] 檢查處理成功率

### 每週
- [ ] 審查性能指標
- [ ] 檢查資料庫大小
- [ ] 清理舊日誌

### 每月
- [ ] 資料庫備份驗證
- [ ] 性能趨勢分析
- [ ] 成本分析
- [ ] 安全更新檢查

---

## Dashboard 示例

### Cloudflare Workers Analytics

**關鍵指標**:
- Requests per minute
- Success rate (%)
- CPU time (ms)
- Duration (ms)

### Custom Metrics

**建議追蹤**:
```typescript
// 在 Worker 中添加自定義指標
console.log(JSON.stringify({
  metric: "processing_time",
  value: processingTimeMs,
  conversationId: conversationId,
  fileSize: fileSizeMB,
  timestamp: new Date().toISOString()
}));
```

**分析**:
```bash
# 提取並分析
wrangler tail --format json | \
  jq 'select(.metric == "processing_time") | .value' | \
  awk '{sum+=$1; count++} END {print "Average:", sum/count, "ms"}'
```

---

## 資源連結

### 官方文檔
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare Queues](https://developers.cloudflare.com/queues/)
- [Neon Database](https://neon.tech/docs)
- [Groq API](https://console.groq.com/docs)
- [Google Gemini](https://ai.google.dev/docs)

### 內部文檔
- [部署檢查清單](.doc/20260115_Deployment_Checklist.md)
- [Runbook](.doc/20260115_Runbook.md)
- [架構文檔](.doc/20260115_Agent_A_基礎設施與核心服務實作計畫.md)

---

**更新日期**: 2026-01-15
**維護人**: Agent A Infrastructure Team
