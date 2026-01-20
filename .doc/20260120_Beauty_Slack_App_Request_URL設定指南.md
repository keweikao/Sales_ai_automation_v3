# Beauty Slack App Request URL 設定指南

> **快速參考** - 複製貼上即可

---

## 📍 Request URLs

### 1. Event Subscriptions (事件訂閱)

**URL**:
```
https://sales-ai-slack-bot-beauty.salesaiautomationv3.workers.dev/slack/events
```

**設定位置**: Slack App 管理頁面 → Event Subscriptions → Request URL

**驗證狀態**: ✅ Worker 運行正常，等待 Slack 驗證

---

### 2. Interactivity & Shortcuts (互動功能)

**URL**:
```
https://sales-ai-slack-bot-beauty.salesaiautomationv3.workers.dev/slack/interactivity
```

**設定位置**: Slack App 管理頁面 → Interactivity & Shortcuts → Request URL

---

## 🔧 完整設定步驟

### 步驟 1: 前往 Slack App 管理頁面

1. 開啟瀏覽器
2. 前往 https://api.slack.com/apps
3. 點擊 **"Beauty Sales Bot"**

---

### 步驟 2: 設定 Event Subscriptions

1. 點擊左側選單 **"Event Subscriptions"**
2. 開啟 **"Enable Events"** 開關
3. 在 **"Request URL"** 欄位貼上:
   ```
   https://sales-ai-slack-bot-beauty.salesaiautomationv3.workers.dev/slack/events
   ```
4. 等待驗證（應該會顯示綠色的 ✅ **"Verified"**）

5. 滾動到 **"Subscribe to bot events"**
6. 點擊 **"Add Bot User Event"**，依序新增:
   - `app_mention`
   - `file_shared`
   - `message.im`

7. 點擊頁面底部 **"Save Changes"**

---

### 步驟 3: 設定 Interactivity

1. 點擊左側選單 **"Interactivity & Shortcuts"**
2. 開啟 **"Interactivity"** 開關
3. 在 **"Request URL"** 欄位貼上:
   ```
   https://sales-ai-slack-bot-beauty.salesaiautomationv3.workers.dev/slack/interactivity
   ```
4. 點擊 **"Save Changes"**

---

## ✅ 驗證設定

### 檢查 Event Subscriptions

在 Event Subscriptions 頁面，Request URL 旁邊應該顯示:

```
✅ Verified
```

如果顯示錯誤，請檢查:
1. URL 是否正確複製（沒有多餘空格）
2. Worker 是否正常運行
3. Secrets 是否設定完成

### 檢查 Bot Events

確認已訂閱這三個事件:
- ✅ `app_mention` - 當有人 @Beauty Sales Bot
- ✅ `file_shared` - 當有人上傳檔案
- ✅ `message.im` - 當有人發送 DM

---

## 🧪 測試設定

### 測試 1: Worker 健康檢查

```bash
curl https://sales-ai-slack-bot-beauty.salesaiautomationv3.workers.dev
```

**預期回應**:
```json
{
  "status": "ok",
  "service": "sales-ai-slack-bot-beauty",
  "productLine": "beauty",
  "timestamp": "2026-01-20T..."
}
```

✅ **測試通過** - Worker 運行正常

### 測試 2: 在 Slack 測試

1. 開啟 Slack
2. 搜尋 `@Beauty Sales Bot`
3. 發送 DM 給 Bot
4. 上傳一個測試音檔

**預期結果**:
- Bot 收到檔案
- 自動彈出美業表單 Modal
- 表單包含：員工人數、美髮沙龍等欄位

---

## 🆚 兩個 Bot 的 Request URLs 對比

### iCHEF Sales Bot

**Event Subscriptions**:
```
https://sales-ai-slack-bot.salesaiautomationv3.workers.dev/slack/events
```

**Interactivity**:
```
https://sales-ai-slack-bot.salesaiautomationv3.workers.dev/slack/interactivity
```

### Beauty Sales Bot

**Event Subscriptions**:
```
https://sales-ai-slack-bot-beauty.salesaiautomationv3.workers.dev/slack/events
```

**Interactivity**:
```
https://sales-ai-slack-bot-beauty.salesaiautomationv3.workers.dev/slack/interactivity
```

**差異**: URL 中包含 `-beauty` 後綴

---

## 🚨 常見問題

### Q1: Request URL 驗證失敗

**症狀**: 顯示紅色錯誤，無法驗證

**可能原因**:
1. URL 複製錯誤（多了空格或少了字元）
2. Worker 未正確部署
3. SLACK_SIGNING_SECRET 未設定

**解決方式**:
```bash
# 1. 確認 Worker 運行
curl https://sales-ai-slack-bot-beauty.salesaiautomationv3.workers.dev

# 2. 檢查 Secrets
cd apps/slack-bot-beauty
wrangler secret list

# 3. 確認有 SLACK_SIGNING_SECRET
```

### Q2: 驗證通過但上傳檔案沒反應

**症狀**: Request URL 顯示 Verified，但上傳音檔後沒有彈出 Modal

**可能原因**:
1. Bot Events 未正確訂閱
2. Bot 沒有足夠的權限

**解決方式**:
1. 確認已訂閱 `file_shared` 和 `message.im`
2. 檢查 OAuth Scopes 是否包含:
   - `files:read`
   - `files:write`
   - `im:history`
   - `im:read`
   - `im:write`

### Q3: Modal 顯示的是 iCHEF 表單

**症狀**: 彈出的 Modal 顯示餐飲表單而非美業表單

**可能原因**: Worker 的 PRODUCT_LINE 設定錯誤

**解決方式**:
```bash
# 檢查 productLine
curl https://sales-ai-slack-bot-beauty.salesaiautomationv3.workers.dev

# 應該回傳 "productLine": "beauty"
```

---

## 📋 設定檢查清單

完成以下檢查項目:

### Slack App 設定
- [ ] Event Subscriptions 已開啟
- [ ] Request URL 已填寫並驗證 (✅ Verified)
- [ ] 已訂閱 `app_mention` 事件
- [ ] 已訂閱 `file_shared` 事件
- [ ] 已訂閱 `message.im` 事件
- [ ] Interactivity 已開啟
- [ ] Interactivity Request URL 已填寫

### Worker 設定
- [ ] Worker 已部署
- [ ] SLACK_BOT_TOKEN 已設定
- [ ] SLACK_SIGNING_SECRET 已設定
- [ ] API_BASE_URL 已設定
- [ ] API_TOKEN 已設定
- [ ] PRODUCT_LINE = "beauty"

### 測試
- [ ] Worker 健康檢查通過
- [ ] 可以在 Slack 找到 @Beauty Sales Bot
- [ ] 可以發送 DM 給 Bot
- [ ] 上傳音檔後 Modal 彈出
- [ ] Modal 顯示美業表單（不是 iCHEF 表單）

---

## 📚 相關文件

- **Slack App 建立指南**: `.doc/20260120_建立Beauty_Slack_App完整指南.md`
- **Beauty Bot 設定完成**: `.doc/20260120_Beauty_Bot設定完成.md`
- **App Manifest**: `.doc/beauty-slack-app-manifest.yaml`

---

## 🎯 完成後的狀態

設定完成後，您的 Slack App 應該是這樣的:

```
Beauty Sales Bot
├── Basic Information
│   ├── App Name: Beauty Sales Bot
│   └── Description: 美業銷售助手
│
├── OAuth & Permissions
│   ├── Bot Token: xoxb-2151498087-10328...
│   └── Scopes: 9 個權限 ✅
│
├── Event Subscriptions ✅
│   ├── Request URL: https://sales-ai-slack-bot-beauty.../slack/events
│   ├── Status: ✅ Verified
│   └── Bot Events:
│       ├── app_mention ✅
│       ├── file_shared ✅
│       └── message.im ✅
│
└── Interactivity & Shortcuts ✅
    ├── Request URL: https://sales-ai-slack-bot-beauty.../slack/interactivity
    └── Status: Enabled ✅
```

---

**設定完成後，立即在 Slack 測試 @Beauty Sales Bot！** 🚀

---

**文件版本**: v1.0
**建立時間**: 2026-01-20
**用途**: Beauty Slack App Request URL 設定參考
