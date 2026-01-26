---
name: report
description: 即時查詢系統運營報告。查看今日處理進度、本週統計、待處理任務、特定業務進度等。整合 Cloudflare Workers 日誌、資料庫查詢和 KV 快取狀態。
---

# /report - 即時運營報告

## 描述
即時查詢 Sales AI 系統的運營狀態，包括轉錄處理進度、MEDDIC 分析統計、待處理任務等。補充每日定時報告，提供隨時查詢能力。

## 使用方式
```
/report                  # 今日即時摘要
/report --week           # 本週統計
/report --pending        # 待處理任務
/report --user [名字]    # 特定業務進度
/report --errors         # 近期錯誤統計
/report --health         # 系統健康狀態
```

## 執行流程

### 步驟 1: 解析參數

根據用戶輸入判斷報告類型：

| 參數 | 報告類型 | 資料來源 |
|------|---------|---------|
| (無) | 今日摘要 | DB + CF Observability |
| --week | 週報 | DB 統計查詢 |
| --pending | 待處理 | DB pending 狀態 |
| --user [名字] | 個人進度 | DB 用戶篩選 |
| --errors | 錯誤統計 | CF Observability |
| --health | 健康狀態 | CF Workers + DB |

### 步驟 2: 查詢 Cloudflare Workers 狀態

**使用 cloudflare-observability MCP：**

1. 列出 Workers 狀態：
   ```
   mcp__cloudflare-observability__workers_list
   ```

2. 查詢最近 1 小時的請求統計：
   ```
   mcp__cloudflare-observability__query_worker_observability
   ```
   - 時間範圍：過去 1-24 小時（根據報告類型）
   - 關注指標：requests, errors, duration

3. 查詢錯誤分佈（如果是 --errors）：
   ```
   mcp__cloudflare-observability__observability_values
   ```
   - key: "outcome" 或 "status"

### 步驟 3: 查詢資料庫統計

**執行 SQL 查詢取得統計數據：**

```sql
-- 今日處理統計
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM conversations
WHERE created_at >= CURRENT_DATE;

-- 本週 MEDDIC 分析統計
SELECT
  DATE(created_at) as date,
  COUNT(*) as count,
  AVG(overall_score) as avg_score
FROM meddic_analyses
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date;

-- 待處理任務
SELECT
  c.id, c.opportunity_id, o.company_name, c.status
FROM conversations c
JOIN opportunities o ON c.opportunity_id = o.id
WHERE c.status = 'pending'
ORDER BY c.created_at DESC
LIMIT 10;
```

**使用 Drizzle Studio 或直接查詢：**
```bash
bun run db:studio
# 或使用腳本
bun run scripts/query-stats.ts
```

### 步驟 4: 查詢 KV 快取狀態（如適用）

**使用 cloudflare-bindings MCP：**
```
mcp__cloudflare-bindings__kv_namespaces_list
```

### 步驟 5: 生成報告

根據報告類型輸出對應格式：

---

## 報告模板

### 今日摘要（預設）

```markdown
## 即時運營報告
📅 2026-01-27 15:30

### 處理進度
| 狀態 | 數量 | 百分比 |
|------|------|--------|
| ✅ 完成 | 12 | 80% |
| ⏳ 處理中 | 2 | 13% |
| ❌ 失敗 | 1 | 7% |

### MEDDIC 分析
- 今日完成: 12 筆
- 平均分數: 68.5
- 最高分: 85 (202601-IC046)

### Workers 狀態
| Worker | 請求數 | 錯誤率 |
|--------|--------|--------|
| server | 1,234 | 0.2% |
| queue-worker | 45 | 0% |
| slack-bot | 89 | 0% |

### 待處理
- 202601-IC048 王大明 (等待轉錄)
- 202601-IC049 李小華 (等待分析)
```

### 週報（--week）

```markdown
## 本週運營報告
📅 2026-01-20 ~ 2026-01-27

### 每日處理量
| 日期 | 完成 | 失敗 | 成功率 |
|------|------|------|--------|
| 01/27 | 12 | 1 | 92% |
| 01/26 | 15 | 0 | 100% |
| 01/25 | 8 | 2 | 80% |
| ... | ... | ... | ... |

### 週統計
- 總處理: 85 筆
- 成功率: 94.1%
- 平均 MEDDIC: 67.2
- 最活躍業務: 王大明 (18 筆)

### 趨勢
📈 處理量較上週 +15%
📊 MEDDIC 平均分數 +3.2
```

### 待處理（--pending）

```markdown
## 待處理任務
📅 更新時間: 2026-01-27 15:30

### 等待轉錄 (3)
| 案件編號 | 公司 | 上傳時間 | 等待 |
|----------|------|----------|------|
| IC048 | 王記餐廳 | 14:20 | 1h 10m |
| IC049 | 李氏美髮 | 14:55 | 35m |
| IC050 | 陳家小吃 | 15:15 | 15m |

### 等待分析 (1)
| 案件編號 | 公司 | 轉錄完成 | 等待 |
|----------|------|----------|------|
| IC047 | 張氏火鍋 | 13:45 | 1h 45m |

### 失敗需重試 (1)
| 案件編號 | 錯誤 | 建議 |
|----------|------|------|
| IC045 | Groq timeout | 重新上傳音檔 |
```

### 錯誤統計（--errors）

```markdown
## 錯誤統計報告
📅 過去 24 小時

### 錯誤分佈
| 類型 | 數量 | 百分比 |
|------|------|--------|
| Groq API Timeout | 2 | 50% |
| DB Connection | 1 | 25% |
| R2 Access | 1 | 25% |

### 最近錯誤
1. **15:20** queue-worker - Groq API timeout (IC048)
2. **14:45** server - DB connection reset
3. **12:30** queue-worker - R2 file not found

### 建議
- Groq timeout: 考慮增加重試次數
- DB connection: 檢查連線池設定
```

### 健康狀態（--health）

```markdown
## 系統健康狀態
📅 2026-01-27 15:30

### Workers 狀態
| Service | 狀態 | 回應時間 | 錯誤率 |
|---------|------|----------|--------|
| server | 🟢 正常 | 45ms | 0.1% |
| queue-worker | 🟢 正常 | 120ms | 0% |
| slack-bot | 🟢 正常 | 38ms | 0% |
| slack-bot-beauty | 🟢 正常 | 42ms | 0% |

### 外部服務
| Service | 狀態 | 備註 |
|---------|------|------|
| Groq API | 🟢 正常 | - |
| Gemini API | 🟢 正常 | - |
| Neon DB | 🟢 正常 | 連線數: 5/100 |
| Cloudflare R2 | 🟢 正常 | - |

### 資源使用
- KV 快取命中率: 85%
- Queue 積壓: 2 筆
- 平均處理時間: 45s
```

---

## 整合的工具

| 工具 | 用途 |
|------|------|
| `cloudflare-observability` MCP | Workers 日誌和指標 |
| `cloudflare-bindings` MCP | KV、R2、D1 狀態 |
| `Bash` | 執行統計腳本 |
| `Read` / `Grep` | 讀取配置和日誌 |

## 相關文件

- `.doc/20260115_Queue架構部署指南.md` - Queue 架構說明
- `.doc/20260119_部署完成測試指南.md` - 系統測試指南
- `apps/queue-worker/wrangler.toml` - Cron 定時任務設定

## 注意事項

1. **資料庫查詢** - 使用 Drizzle ORM 或直接 SQL
2. **時區** - 所有時間顯示為 UTC+8（台灣時間）
3. **快取** - 統計數據可能有 1-5 分鐘延遲
4. **權限** - 需要 Cloudflare API Token 和資料庫連線
