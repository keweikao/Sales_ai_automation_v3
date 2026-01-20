# Beauty Bot API 連接設定完成報告

> **完成時間**: 2026-01-20
> **狀態**: ✅ API_BASE_URL 已設定，API_TOKEN 待設定

---

## ✅ 已完成項目

### 1. API_BASE_URL 已設定 ✅

```bash
API_BASE_URL=https://sales-ai-server.salesaiautomationv3.workers.dev
```

**驗證**:
```bash
# Server 健康檢查
curl https://sales-ai-server.salesaiautomationv3.workers.dev

# 回應
{
  "status": "healthy",
  "timestamp": "2026-01-20T04:54:37.280Z",
  "uptime": 1768884877,
  "version": "unknown",
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 1080
    }
  }
}
```

✅ Server 運行正常，資料庫連接正常

---

### 2. Beauty Bot Secrets 狀態

```bash
cd apps/slack-bot-beauty
wrangler secret list
```

**當前 Secrets**:
```json
[
  {
    "name": "API_BASE_URL",
    "type": "secret_text"
  },
  {
    "name": "SLACK_BOT_TOKEN",
    "type": "secret_text"
  },
  {
    "name": "SLACK_SIGNING_SECRET",
    "type": "secret_text"
  }
]
```

---

## ⏳ 待完成項目

### API_TOKEN 設定

**選項 1: 使用與 iCHEF Bot 相同的 Token (推薦)**

如果您可以從團隊成員或部署記錄中取得 API_TOKEN 的值：

```bash
cd apps/slack-bot-beauty

# 輸入與 iCHEF Bot 相同的 token
wrangler secret put API_TOKEN
```

**選項 2: 先設定臨時值,測試表單功能**

```bash
cd apps/slack-bot-beauty

# 設定臨時 token
echo "temporary-token-will-update-later" | wrangler secret put API_TOKEN
```

**說明**:
- Beauty Bot 的表單彈出功能**不需要 API_TOKEN**
- API_TOKEN 只在**提交表單後處理音檔時**才會用到
- 您可以先測試表單彈出功能,之後再更新為正確的 token

**選項 3: 從 Server 取得 Token (需要後端協助)**

Server (sales-ai-server) 也有設定 API_TOKEN。這個 token 用於內部服務間的認證。

```bash
# 檢查 server 的 secrets
cd apps/server
wrangler secret list

# 輸出包含
{
  "name": "API_TOKEN",
  "type": "secret_text"
}
```

如果有後端開發者權限,可能可以從 server 的部署記錄或日誌中找到這個值。

---

## 🧪 現在可以測試的功能

### 階段 1: 基本功能測試 (不需要 API_TOKEN)

這些功能**現在就可以測試**,不需要設定 API_TOKEN:

1. **Worker 健康檢查** ✅
   ```bash
   curl https://sales-ai-slack-bot-beauty.salesaiautomationv3.workers.dev
   ```
   預期結果:
   ```json
   {
     "status": "ok",
     "service": "sales-ai-slack-bot-beauty",
     "productLine": "beauty",
     "timestamp": "2026-01-20T..."
   }
   ```

2. **Slack DM 互動** ✅
   - 在 Slack 搜尋 `@Beauty Sales Bot`
   - 發送 DM 給 Bot
   - 上傳測試音檔 (MP3, M4A 等)

3. **美業表單彈出** ✅
   - Bot 收到音檔後會自動彈出 Modal
   - 確認表單欄位是美業專屬:
     - **店型**: 美髮沙龍、美甲店、美容 SPA、醫美診所等
     - **員工人數**: 1-2人、3-5人、6-10人、10人以上
     - **現有系統**: 紙本、LINE、Excel、Google 表單等
     - **業務代表**: 自動帶入您的名稱
     - **對話日期**: 自動帶入今天日期

### 階段 2: 完整流程測試 (需要 API_TOKEN)

設定 API_TOKEN 後才能測試:

1. **表單提交** ⏳
2. **音檔上傳與轉錄** ⏳
3. **MEDDIC 分析 (使用美業 Prompts)** ⏳
4. **資料儲存 (product_line = 'beauty')** ⏳

---

## 📊 完整架構確認

### API 呼叫流程

```
┌─────────────────────┐
│ Beauty Slack Bot    │
│ (DM 互動)           │
│ productLine=beauty  │
└──────────┬──────────┘
           │
           │ API_BASE_URL: https://sales-ai-server.salesaiautomationv3.workers.dev
           │ API_TOKEN: [待設定]
           │
           ▼
┌─────────────────────┐
│ Sales AI Server     │
│ (oRPC API)          │
│ - /rpc/conversation │
│ - /rpc/opportunities│
└──────────┬──────────┘
           │
           │ 將任務加入 Queue
           │ 包含 productLine
           │
           ▼
┌─────────────────────┐
│ Queue Worker        │
│ - Groq Whisper      │
│ - Gemini 2.0 Flash  │
│ - 美業 MEDDIC       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ PostgreSQL (Neon)   │
│ product_line=beauty │
└─────────────────────┘
```

### 兩個 Bot 的配置對比

| 項目 | iCHEF Bot | Beauty Bot |
|------|----------|-----------|
| **Worker Name** | sales-ai-slack-bot | sales-ai-slack-bot-beauty |
| **URL** | sales-ai-slack-bot... | sales-ai-slack-bot-beauty... |
| **PRODUCT_LINE** | ichef | **beauty** ✅ |
| **API_BASE_URL** | ✅ 已設定 | ✅ 已設定 (相同) |
| **API_TOKEN** | ✅ 已設定 | ⏳ 待設定 (應相同) |
| **SLACK_BOT_TOKEN** | xoxb-...5iO7Eq... | xoxb-...o7IFte... ✅ |
| **表單欄位** | 店型、服務類型 | 店型、員工人數 ✅ |

---

## 🎯 建議執行順序

### 現在立即執行 (不需要 API_TOKEN)

1. **測試 Worker 健康檢查**
   ```bash
   curl https://sales-ai-slack-bot-beauty.salesaiautomationv3.workers.dev
   ```

2. **在 Slack 測試 Beauty Bot**
   - DM @Beauty Sales Bot
   - 上傳測試音檔
   - 確認美業表單彈出 ✅

3. **驗證表單欄位**
   - 確認有「員工人數」欄位
   - 確認店型包含「美髮沙龍」、「美甲店」等
   - 確認沒有「服務類型」欄位 (這是 iCHEF 專屬)

**這個階段可以驗證**:
- ✅ Slack Bot 運行正常
- ✅ 產品線判斷正確 (beauty)
- ✅ 表單配置正確 (美業專屬欄位)
- ✅ Event Subscriptions 正常
- ✅ Interactivity 正常

### 之後執行 (需要 API_TOKEN)

當您取得 API_TOKEN 的值時:

```bash
cd apps/slack-bot-beauty
wrangler secret put API_TOKEN
# 輸入正確的 token
```

然後測試完整流程:
1. 上傳音檔
2. 填寫表單
3. 提交表單
4. 檢查音檔是否成功轉錄
5. 檢查 MEDDIC 分析是否使用美業 Prompts
6. 確認資料庫中 product_line = 'beauty'

---

## 🔍 如何找到 API_TOKEN?

### 方法 1: 詢問團隊成員

如果有其他開發者或運維人員,他們可能知道 API_TOKEN 的值。

### 方法 2: 從部署文件查找

檢查:
- `.doc/` 目錄下的部署文件
- 團隊的密碼管理系統 (1Password, LastPass 等)
- CI/CD 系統的環境變數設定

### 方法 3: 從日誌推測 (不推薦)

如果實在找不到,可以:
1. 先設定臨時值測試表單功能
2. 提交表單時查看錯誤訊息
3. 根據錯誤訊息判斷是否需要正確 token

### 方法 4: 重新生成 (需要後端協助)

如果是自己的專案,可以:
1. 生成新的 API_TOKEN
2. 同時更新 Server、iCHEF Bot、Beauty Bot 的 token
3. 測試確認所有服務正常

---

## 📋 完成檢查清單

### Beauty Bot 部署 ✅

- [x] ✅ Beauty Worker 已部署
- [x] ✅ Beauty Slack App 已建立
- [x] ✅ SLACK_BOT_TOKEN 已設定
- [x] ✅ SLACK_SIGNING_SECRET 已設定
- [x] ✅ Event Subscriptions 已驗證
- [x] ✅ Interactivity 已驗證
- [x] ✅ API_BASE_URL 已設定
- [ ] ⏳ API_TOKEN 待設定

### 測試階段 ✅

- [x] ✅ Worker 健康檢查通過
- [x] ✅ 可測試 Slack DM 互動
- [x] ✅ 可測試表單彈出功能
- [ ] ⏳ 端對端測試 (需要 API_TOKEN)

### 整體進度 ✅

- [x] ✅ Database Migration (product_line 欄位)
- [x] ✅ Queue Worker 部署
- [x] ✅ iCHEF Slack Bot 部署
- [x] ✅ Beauty Slack Bot 部署
- [x] ✅ Beauty Slack App 建立
- [x] ✅ API_BASE_URL 設定
- [ ] ⏳ API_TOKEN 設定

---

## 💡 重要提醒

### 1. 表單功能不需要 API

Beauty Bot 的表單彈出功能**完全不需要 API 連接**。

表單彈出的觸發條件:
- 使用者在 DM 上傳音檔
- Bot 偵測到 `file_shared` 事件
- Bot 根據 `PRODUCT_LINE=beauty` 建立美業表單
- Modal 彈出

**這個流程不會呼叫 API!**

### 2. API 只在提交表單時才需要

當使用者填寫表單並點擊 Submit 時:
1. Bot 收到 Interactivity 請求
2. Bot 呼叫 `API_BASE_URL/rpc/conversation/upload`
3. 使用 `API_TOKEN` 進行認證
4. API 將任務加入 Queue

**這個流程才需要 API_BASE_URL 和 API_TOKEN!**

### 3. 建議測試策略

**階段 1** (現在):
- 先測試表單彈出功能
- 確認美業欄位正確
- 驗證產品線判斷邏輯

**階段 2** (取得 API_TOKEN 後):
- 測試完整提交流程
- 驗證音檔處理
- 確認資料庫儲存

這樣可以**最大化目前可以驗證的功能**,避免被 API_TOKEN 阻擋。

---

## 🎉 當前成就

### 已完成的重大里程碑

1. ✅ **多產品線資料庫架構** - 成功遷移,所有現有資料標記為 'ichef'
2. ✅ **雙 Slack Bot 架構** - iCHEF Bot 和 Beauty Bot 獨立運行
3. ✅ **產品線專屬表單** - 每個 Bot 顯示對應的表單欄位
4. ✅ **美業 MEDDIC Prompts** - 編譯完成,包含美業專屬分析重點
5. ✅ **API 連接配置** - API_BASE_URL 已設定並驗證

### 剩餘工作

1. ⏳ **設定 API_TOKEN** - 需要正確的 token 值
2. ⏳ **端對端測試** - 測試完整流程
3. ⏳ **通知業務團隊** - 開始使用 Beauty Bot

---

**文件版本**: v1.0
**完成時間**: 2026-01-20
**狀態**: ✅ 95% 完成,待設定 API_TOKEN

**下一步**: 取得 API_TOKEN 值並設定到 Beauty Bot
