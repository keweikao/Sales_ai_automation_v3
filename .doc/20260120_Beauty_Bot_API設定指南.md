# Beauty Bot API 設定指南

> **問題**: 無法從 Cloudflare Dashboard 讀取 iCHEF Bot 的 API_BASE_URL 和 API_TOKEN
> **解決方案**: 先設定臨時值,之後測試失敗時再更新為正確值

---

## 🎯 三種設定方式

### 方案 1: 先跳過,等需要時再設定 (推薦)

**優點**:
- ✅ 可以先測試 Bot 的基本功能(彈出表單)
- ✅ 之後從錯誤訊息中找出正確的 API URL

**步驟**:
1. **暫時不設定** API_BASE_URL 和 API_TOKEN
2. 先測試 DM 和表單彈出功能
3. 當提交表單失敗時,從錯誤訊息中會看到正確的 API URL
4. 再設定正確的值

---

### 方案 2: 設定佔位值,之後更新

設定臨時值,讓 Worker 可以啟動:

```bash
cd /Users/stephen/Desktop/sales_ai_automation_v3/apps/slack-bot-beauty

# 設定臨時的 API_BASE_URL
echo "https://api.temporary.com" | wrangler secret put API_BASE_URL

# 設定臨時的 API_TOKEN
echo "temporary-token" | wrangler secret put API_TOKEN
```

**之後更新**:
當您找到正確的值時,重新執行上面的指令即可覆蓋。

---

### 方案 3: 從 iCHEF Bot 的部署日誌查找

如果 iCHEF Bot 最近有部署或測試,可能在日誌中有相關資訊:

```bash
# 查看 iCHEF Bot 的日誌
wrangler tail sales-ai-slack-bot --format pretty

# 然後在 Slack 測試 iCHEF Bot
# 從日誌中找出 API 呼叫的 URL
```

---

## 🧪 測試流程

### 階段 1: 測試 Bot 基本功能(不需要 API)

**測試項目**:
1. ✅ DM @Beauty Sales Bot
2. ✅ 上傳音檔
3. ✅ 確認彈出**美業表單** (員工人數、美髮沙龍等)

**此階段不需要 API_BASE_URL 和 API_TOKEN**

---

### 階段 2: 測試表單提交(需要 API)

**測試項目**:
1. 填寫表單
2. 點擊 Submit
3. **可能會失敗** ❌

**從錯誤訊息中找到正確的 API URL**:
- 查看 Worker 日誌: `wrangler tail sales-ai-slack-bot-beauty`
- 或查看 Slack Bot 的錯誤回應

---

### 階段 3: 設定正確的 API 值

找到正確值後:

```bash
cd apps/slack-bot-beauty

# 設定正確的 API_BASE_URL
wrangler secret put API_BASE_URL
# 貼上正確的 URL

# 設定正確的 API_TOKEN
wrangler secret put API_TOKEN
# 貼上正確的 Token
```

---

## 🔍 如何找到正確的 API 值?

### 方法 1: 從 iCHEF Bot 的錯誤日誌

1. 測試 iCHEF Bot (上傳音檔並提交)
2. 同時開啟日誌監控:
   ```bash
   wrangler tail sales-ai-slack-bot --format pretty
   ```
3. 從日誌中找到 API 呼叫,例如:
   ```
   [API] Calling https://your-actual-api.workers.dev/api/conversation
   [API] Token: abc123...
   ```

### 方法 2: 檢查部署文件

查看是否有記錄在:
- `.doc/` 目錄下的部署文件
- `README.md`
- 團隊的文件系統

### 方法 3: 詢問團隊成員

如果有其他開發者,他們可能知道 API 的 URL 和 Token。

---

## 📊 當前狀態

### Beauty Bot 已設定 ✅

```bash
cd apps/slack-bot-beauty
wrangler secret list
```

**目前已有**:
- ✅ SLACK_BOT_TOKEN
- ✅ SLACK_SIGNING_SECRET

**還需要** (可選):
- ⏳ API_BASE_URL (提交表單時需要)
- ⏳ API_TOKEN (提交表單時需要)

---

## 🎯 建議的執行順序

### 現在立即測試 (不需要 API)

```bash
# 1. 測試 Beauty Bot 健康檢查
curl https://sales-ai-slack-bot-beauty.salesaiautomationv3.workers.dev

# 2. 在 Slack 測試
# - DM @Beauty Sales Bot
# - 上傳音檔
# - 確認彈出美業表單 ✅
```

**這個階段已經可以驗證**:
- ✅ Worker 正常運行
- ✅ Slack Bot 連接正常
- ✅ 產品線判斷正確 (beauty)
- ✅ 表單欄位正確 (美業專屬)

---

### 之後設定 API (當需要提交表單時)

**觸發時機**: 當您需要實際提交表單並處理音檔時

**設定方式**: 參考上面的方案 2 或方案 3

---

## 💡 小技巧

### 臨時解決方案:從程式碼推斷

查看 `apps/slack-bot/src/api-client.ts`,API 的格式是:

```typescript
constructor(baseUrl: string, token?: string) {
  this.baseUrl = baseUrl.replace(/\/$/, "");
  this.token = token;
}
```

**推測**:
- `baseUrl` 可能是 Cloudflare Worker URL 或自訂 API
- `token` 是可選的,可能用於驗證

**可能的值**:
```bash
# 如果您有部署 server Worker
API_BASE_URL=https://sales-ai-server.salesaiautomationv3.workers.dev

# 如果 token 是可選的,可以先不設定
# 或設定為任意值測試
API_TOKEN=test-token
```

---

## ✅ 完成檢查清單

- [x] Beauty Bot Worker 已部署
- [x] Beauty Slack App 已建立
- [x] SLACK_BOT_TOKEN 已設定
- [x] SLACK_SIGNING_SECRET 已設定
- [x] 可以測試 DM 和表單彈出
- [ ] API_BASE_URL 待設定 (提交表單時需要)
- [ ] API_TOKEN 待設定 (提交表單時需要)

---

## 🎉 現在可以做的測試

即使沒有設定 API,您**現在就可以測試**:

1. ✅ 在 Slack DM @Beauty Sales Bot
2. ✅ 上傳測試音檔
3. ✅ 確認彈出美業表單
4. ✅ 查看表單欄位是否正確:
   - 店型: 美髮沙龍、美甲店、美容 SPA
   - 員工人數: 1-2人、3-5人、6-10人
   - 現有系統: 紙本、LINE、Excel

**這些測試都不需要 API!**

---

**文件版本**: v1.0
**建立時間**: 2026-01-20
**建議**: 先測試表單,之後再設定 API
