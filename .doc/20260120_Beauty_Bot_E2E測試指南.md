# Beauty Bot End-to-End 測試指南

> **狀態**: ✅ 所有系統準備就緒，可以開始測試！
> **預計時間**: 5-10 分鐘

---

## ✅ 前置條件檢查

### 系統狀態

| 組件 | 狀態 | 詳情 |
|------|------|------|
| **Beauty Bot Worker** | ✅ 運行正常 | productLine: beauty |
| **API_BASE_URL** | ✅ 已設定 | https://sales-ai-server... |
| **API_TOKEN** | ✅ 已設定 | Kn/eAAwkGzrVZAcgWs781... |
| **SLACK_BOT_TOKEN** | ✅ 已設定 | xoxb-2151498087-10328... |
| **SLACK_SIGNING_SECRET** | ✅ 已設定 | e4b49c15ff652f42ae019... |
| **Server API** | ✅ 運行正常 | Database connected |
| **Queue Worker** | ✅ 運行正常 | 處理音檔轉錄 |

**結論**: 🎉 **所有系統準備就緒，可以開始 E2E 測試！**

---

## 🧪 E2E 測試流程

### 階段 1: Slack DM 互動 (1 分鐘)

#### 步驟 1.1: 找到 Beauty Sales Bot

1. 開啟 **Slack**
2. 點擊左側的 **"Apps"** 或使用搜尋
3. 搜尋 `Beauty Sales Bot`
4. 點擊 Bot 名稱

**預期結果**:
- ✅ 可以找到 Beauty Sales Bot
- ✅ Bot 顯示為 "Always Active"

#### 步驟 1.2: 發送測試訊息

1. 點擊 **"Message"** 開始 DM
2. 發送測試訊息: `Hello`

**預期結果**:
- ✅ Bot 可能會回應或不回應（都正常）
- ✅ 對話視窗開啟

---

### 階段 2: 上傳音檔 (1 分鐘)

#### 步驟 2.1: 準備測試音檔

使用任何音檔，例如：
- MP3 檔案
- M4A 檔案
- WAV 檔案

或者使用專案中的測試音檔：
```bash
ls /Users/stephen/Desktop/sales_ai_automation_v3/*.mp3
```

#### 步驟 2.2: 上傳音檔到 DM

1. 在與 Beauty Sales Bot 的 DM 中
2. 點擊 **"+"** 按鈕或使用拖放
3. 選擇測試音檔
4. 上傳

**預期結果**:
- ✅ 音檔上傳成功
- ✅ **自動彈出 Modal（表單）**
- ⏱️ 通常在 1-2 秒內彈出

---

### 階段 3: 驗證美業表單 (1 分鐘)

#### 步驟 3.1: 檢查表單標題

Modal 標題應該是:
```
📝 新增銷售對話記錄
```

#### 步驟 3.2: 驗證表單欄位

確認表單包含**美業專屬欄位**:

**✅ 店型 (Business Type)**:
- 美髮沙龍
- 美甲店
- 美容 SPA
- 醫美診所
- 美睫店
- 其他

**✅ 員工人數 (Employee Count)** - **美業專屬！**:
- 1-2人
- 3-5人
- 6-10人
- 10人以上

**✅ 現有系統 (Current System)**:
- 紙本
- LINE
- Excel
- Google 表單
- 其他系統

**✅ 自動填入欄位**:
- 業務代表: [您的 Slack 名稱]
- 對話日期: [今天日期]

**❌ 不應該出現的欄位** (這些是 iCHEF 專屬):
- ❌ 服務類型 (Service Type)
- ❌ 內用/外帶/外送

**預期結果**:
- ✅ 表單是美業專屬配置
- ✅ 有「員工人數」欄位
- ✅ 沒有「服務類型」欄位

---

### 階段 4: 填寫並提交表單 (2 分鐘)

#### 步驟 4.1: 填寫表單

**範例填寫**:
```
公司名稱: 美髮沙龍測試店
店型: 美髮沙龍
員工人數: 3-5人
現有系統: LINE
業務代表: [自動填入]
對話日期: [自動填入]
```

#### 步驟 4.2: 提交表單

1. 檢查所有欄位都已填寫
2. 點擊 **"Submit"** 按鈕

**預期結果**:
- ✅ Modal 關閉
- ✅ Slack 可能顯示「處理中」訊息
- ✅ 沒有錯誤訊息

---

### 階段 5: 等待處理完成 (2-5 分鐘)

#### 處理流程

系統會自動執行以下步驟:

```
1. 音檔上傳到 Cloudflare R2 ⏱️ ~5秒
2. 任務加入 Queue ⏱️ ~1秒
3. Queue Worker 接收任務 ⏱️ ~1秒
4. Groq Whisper 音檔轉錄 ⏱️ ~30-60秒
5. Gemini 2.0 Flash MEDDIC 分析 ⏱️ ~60-120秒
   - 使用美業專屬 Prompts ✅
6. 資料儲存到 PostgreSQL ⏱️ ~1秒
7. Slack 通知完成 ⏱️ ~1秒
```

**總計**: 約 2-5 分鐘（取決於音檔長度）

#### 步驟 5.1: 監控進度（可選）

如果想即時查看處理進度:

```bash
# 監控 Queue Worker logs
wrangler tail sales-ai-queue-worker --format pretty

# 或監控 Beauty Bot logs
wrangler tail sales-ai-slack-bot-beauty --format pretty
```

**預期 Logs**:
```
[Queue] Received transcription job
[Transcription] Starting Groq Whisper...
[Transcription] Completed in 45s
[MEDDIC] Loading beauty prompts ✅
[MEDDIC] Running 6 agents...
[MEDDIC] Completed
[DB] Saved to PostgreSQL (product_line=beauty) ✅
```

---

### 階段 6: 驗證完成通知 (即時)

#### 步驟 6.1: 檢查 Slack 通知

處理完成後，Beauty Sales Bot 會在 DM 中發送通知:

**預期訊息格式**:
```
✅ 對話分析完成！

📊 MEDDIC 分析報告
公司: 美髮沙龍測試店
產品線: 美業 ✅

查看完整分析 →
```

#### 步驟 6.2: 點擊查看分析

1. 點擊通知中的連結
2. 會開啟 Web 應用程式

**預期結果**:
- ✅ 顯示完整的 MEDDIC 分析
- ✅ 包含美業專屬重點:
  - Metrics: 客戶留存率、預約填滿率
  - Pain: 預約管理混亂、客戶流失
  - Decision Criteria: 易用性、客戶體驗

---

### 階段 7: 資料庫驗證 (1 分鐘)

#### 步驟 7.1: 查詢資料庫

連接到 PostgreSQL 並執行:

```sql
-- 查看最新的商機
SELECT
  id,
  company_name,
  product_line,
  business_type,
  employee_count,
  created_at
FROM opportunities
ORDER BY created_at DESC
LIMIT 5;
```

**預期結果**:
```
| id | company_name | product_line | business_type | employee_count |
|----|--------------|--------------|---------------|----------------|
| XX | 美髮沙龍測試店 | beauty     | 美髮沙龍       | 3-5人          |
```

✅ **關鍵驗證點**:
- product_line = **'beauty'** (不是 'ichef')
- business_type = **美業店型** (美髮沙龍等)
- employee_count 有值 (美業專屬欄位)

#### 步驟 7.2: 查看 MEDDIC 分析

```sql
-- 查看 MEDDIC 分析結果
SELECT
  opportunity_id,
  agent_name,
  content,
  created_at
FROM meddic_analyses
WHERE opportunity_id = [剛才的 opportunity_id]
ORDER BY created_at DESC;
```

**預期結果**:
- ✅ 6 個 MEDDIC agents 的分析結果
- ✅ 包含美業專屬內容（客戶留存率、預約填滿率等）

---

## 🎯 完整測試檢查清單

### 前置準備
- [ ] Slack 已開啟
- [ ] 準備好測試音檔
- [ ] 可以存取資料庫（可選）

### Slack 互動
- [ ] 找到 @Beauty Sales Bot
- [ ] 可以發送 DM
- [ ] 上傳音檔成功
- [ ] Modal 自動彈出

### 表單驗證
- [ ] 表單標題正確
- [ ] 有「員工人數」欄位 ✅
- [ ] 店型包含美業選項（美髮沙龍、美甲店等）✅
- [ ] 沒有「服務類型」欄位 ✅
- [ ] 業務代表自動填入
- [ ] 對話日期自動填入

### 提交處理
- [ ] 表單提交成功
- [ ] Modal 關閉
- [ ] 沒有錯誤訊息
- [ ] 等待 2-5 分鐘

### 完成驗證
- [ ] 收到 Slack 完成通知
- [ ] 通知中顯示「產品線: 美業」✅
- [ ] 可以點擊查看完整分析
- [ ] Web 應用顯示 MEDDIC 報告

### 資料庫驗證（可選）
- [ ] product_line = 'beauty' ✅
- [ ] business_type 是美業店型 ✅
- [ ] employee_count 有值 ✅
- [ ] MEDDIC 分析包含美業內容 ✅

---

## 🆚 對比測試：iCHEF vs Beauty

完成 Beauty Bot 測試後，建議也測試 iCHEF Bot 以驗證分流:

| 測試項目 | iCHEF Bot | Beauty Bot |
|---------|-----------|------------|
| **Bot 名稱** | @iCHEF Sales Bot | @Beauty Sales Bot |
| **表單 - 店型** | 咖啡廳、飲料店、餐廳 | 美髮沙龍、美甲店、SPA |
| **表單 - 特殊欄位** | 服務類型 | 員工人數 |
| **product_line** | ichef | beauty |
| **MEDDIC 重點** | 營業額、翻桌率 | 客戶留存率、預約填滿率 |

**測試方式**: 重複相同流程，但使用 @iCHEF Sales Bot

---

## 🚨 常見問題排查

### Q1: Modal 沒有彈出

**可能原因**:
1. Event Subscriptions 未正確設定
2. Bot Events 缺少 `file_shared`
3. Worker 未收到事件

**排查步驟**:
```bash
# 1. 查看 Worker logs
wrangler tail sales-ai-slack-bot-beauty

# 2. 重新上傳音檔，觀察 logs

# 3. 檢查 Slack App 設定
# → Event Subscriptions → Bot Events
# → 確認有 file_shared
```

### Q2: 提交表單後出現錯誤

**可能原因**:
1. API_TOKEN 未設定或不匹配
2. Server API 無法連接
3. 欄位驗證失敗

**排查步驟**:
```bash
# 1. 檢查 API_TOKEN 是否設定
cd apps/slack-bot-beauty
wrangler secret list | grep API_TOKEN

# 2. 測試 Server 連接
curl https://sales-ai-server.salesaiautomationv3.workers.dev

# 3. 查看詳細錯誤
wrangler tail sales-ai-slack-bot-beauty
```

### Q3: 很久沒收到完成通知

**正常等待時間**: 2-5 分鐘

**可能原因**:
1. 音檔很長（超過 5 分鐘）
2. Queue Worker 處理緩慢
3. Gemini API 回應慢

**排查步驟**:
```bash
# 查看 Queue Worker 狀態
wrangler tail sales-ai-queue-worker

# 檢查是否有錯誤訊息
```

### Q4: 表單顯示的是 iCHEF 欄位

**症狀**: Modal 包含「服務類型」而非「員工人數」

**原因**: Worker 的 PRODUCT_LINE 設定錯誤

**解決方式**:
```bash
# 檢查 productLine
curl https://sales-ai-slack-bot-beauty.salesaiautomationv3.workers.dev

# 應該顯示 "productLine": "beauty"
# 如果不是，檢查 wrangler.toml
```

---

## 📊 成功標準

E2E 測試通過的標準:

### 必須通過 ✅
1. ✅ Modal 自動彈出
2. ✅ 表單是美業配置（有員工人數，無服務類型）
3. ✅ 表單可以成功提交
4. ✅ 收到 Slack 完成通知
5. ✅ 資料庫 product_line = 'beauty'

### 加分項 ⭐
1. ⭐ 處理時間 < 3 分鐘
2. ⭐ MEDDIC 分析包含美業專屬重點
3. ⭐ Web 應用顯示正確
4. ⭐ 無任何錯誤或警告

---

## 🎉 測試完成後

### 如果測試通過 ✅

恭喜！系統已經完全準備好投入使用：

1. **通知業務團隊**
   - 說明 Beauty Bot 和 iCHEF Bot 的區別
   - 提供使用說明
   - 安排培訓

2. **監控使用情況**
   - 觀察處理速度
   - 收集使用反饋
   - 優化 Prompts

3. **持續改進**
   - 根據業務反饋調整表單欄位
   - 優化 MEDDIC 分析重點
   - 擴展更多產品線

### 如果測試失敗 ❌

不要擔心，根據錯誤訊息:

1. **參考上面的「常見問題排查」**
2. **查看 Worker logs**
3. **檢查設定檔案**
4. **必要時重新部署**

---

## 📚 相關文件

- **Agent A-D 完成總結**: `.doc/20260120_Agent_A-D部署完成總結.md`
- **API_TOKEN 設定**: `.doc/20260120_API_TOKEN設定完成報告.md`
- **Request URL 設定**: `.doc/20260120_Beauty_Slack_App_Request_URL設定指南.md`
- **Beauty Bot 最終指南**: `.doc/20260120_Beauty_Bot最終設定指南.md`

---

## 🚀 準備好了嗎？

**所有系統都已準備就緒！**

現在就:
1. 開啟 Slack
2. 搜尋 @Beauty Sales Bot
3. 上傳測試音檔
4. 開始您的第一次 E2E 測試！

**祝測試順利！** 🎉

---

**文件版本**: v1.0
**建立時間**: 2026-01-20
**狀態**: ✅ 可以開始測試
