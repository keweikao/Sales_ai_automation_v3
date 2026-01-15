# Sales AI Automation V3 - 部署檢查清單

## 部署前檢查 (Pre-Deployment)

### 1. 代碼準備
- [ ] 所有代碼已提交到 Git
- [ ] 代碼已通過 Code Review
- [ ] 沒有 console.log 或 debug 代碼
- [ ] Version bump 已完成 (package.json)

### 2. 測試驗證
- [ ] 單元測試全部通過 (`bun test`)
- [ ] 性能測試全部通過
- [ ] 類型檢查無錯誤 (`bun run check-types`)
- [ ] Linting 通過 (`bun run lint`)

### 3. 環境變數檢查

#### Queue Worker
- [ ] `DATABASE_URL` - Neon PostgreSQL connection string
- [ ] `GROQ_API_KEY` - Groq Whisper API key
- [ ] `GEMINI_API_KEY` - Google Gemini API key
- [ ] `CLOUDFLARE_R2_ACCESS_KEY` - R2 access key
- [ ] `CLOUDFLARE_R2_SECRET_KEY` - R2 secret key
- [ ] `CLOUDFLARE_R2_ENDPOINT` - R2 endpoint URL
- [ ] `CLOUDFLARE_R2_BUCKET` - R2 bucket name
- [ ] `SLACK_BOT_TOKEN` - Slack bot token
- [ ] `ENVIRONMENT` - production/staging

#### Slack Bot
- [ ] `DATABASE_URL`
- [ ] `SLACK_BOT_TOKEN`
- [ ] `SLACK_SIGNING_SECRET`
- [ ] `TRANSCRIPTION_QUEUE` - Queue name
- [ ] `CLOUDFLARE_R2_BUCKET`
- [ ] `SERVER_URL` - API server URL

#### Server
- [ ] `DATABASE_URL`
- [ ] `GEMINI_API_KEY`
- [ ] `SESSION_SECRET`
- [ ] `ALLOWED_ORIGINS`

### 4. 資料庫準備
- [ ] 創建資料庫備份
- [ ] 驗證備份可恢復
- [ ] Migration scripts 已準備
- [ ] Database schema 已驗證

### 5. Cloudflare 配置
- [ ] Queue 已創建並配置
- [ ] R2 Bucket 已創建並配置
- [ ] Workers 環境變數已設置
- [ ] Domain/Routes 已配置

---

## 部署步驟 (Deployment)

### 自動部署
```bash
./scripts/deploy.sh production
```

### 手動部署

#### 1. Queue Worker
```bash
cd apps/queue-worker
bun run deploy
```

#### 2. Slack Bot
```bash
cd apps/slack-bot
bun run deploy
```

#### 3. Server (如需)
```bash
cd apps/server
# 根據實際部署方式執行
```

---

## 部署後驗證 (Post-Deployment)

### 1. 服務健康檢查
- [ ] Queue Worker 啟動成功
- [ ] Slack Bot 啟動成功
- [ ] Server 啟動成功 (如有部署)

### 2. 功能驗證
- [ ] Slack slash commands 正常
- [ ] 音檔上傳功能正常
- [ ] Queue 訊息處理正常
- [ ] 資料庫連接正常
- [ ] Slack 通知發送正常

### 3. 監控設置
- [ ] Cloudflare Workers 日誌查看
- [ ] Error tracking 啟用
- [ ] Performance metrics 收集
- [ ] Alert rules 配置

### 4. 冒煙測試
- [ ] 上傳小音檔 (1MB) 測試完整流程
- [ ] 檢查轉錄結果正確性
- [ ] 檢查 MEDDIC 分析正確性
- [ ] 檢查 Slack 通知格式

---

## 回滾計畫 (Rollback Plan)

### 何時需要回滾
- 嚴重 bug 導致服務不可用
- 大量錯誤或性能問題
- 資料損壞風險

### 回滾步驟
```bash
./scripts/rollback.sh
```

### 回滾後行動
1. 通知團隊
2. 分析失敗原因
3. 修復問題
4. 重新測試
5. 再次部署

---

## 監控指標 (Monitoring Metrics)

### 關鍵指標
- **錯誤率**: < 1%
- **平均處理時間**: < 5 分鐘 (小檔案)
- **Queue 延遲**: < 1 秒
- **資料庫查詢時間**: < 100ms
- **API 回應時間**: < 500ms

### 告警閾值
- 錯誤率 > 5% (警告)
- 錯誤率 > 10% (嚴重)
- 處理時間 > 15 分鐘 (警告)
- Queue 堆積 > 100 訊息 (警告)

---

## 緊急聯絡 (Emergency Contacts)

### 技術負責人
- **姓名**: [填寫]
- **電話**: [填寫]
- **Email**: [填寫]

### 備用聯絡人
- **姓名**: [填寫]
- **電話**: [填寫]
- **Email**: [填寫]

---

## 部署歷史 (Deployment History)

| 日期 | 版本 | 部署人 | 變更摘要 | 狀態 |
|------|------|--------|----------|------|
| 2026-01-15 | v0.2.0 | Agent A | Week 2 Better-T Stack 重構 | 準備中 |
| - | - | - | - | - |

---

## 已知問題 (Known Issues)

### 非關鍵問題 (可部署)
1. MCP Server 類型錯誤 (不影響核心功能)
2. Ops Orchestrator 類型錯誤 (不影響核心功能)
3. 部分 API 測試需要本地服務器

### 關鍵問題 (阻塞部署)
- 無

---

## 備註 (Notes)

- 首次部署建議在非高峰時段進行
- 建議先部署到 staging 環境驗證
- 保持部署腳本和文檔更新
- 記錄每次部署的變更和問題
