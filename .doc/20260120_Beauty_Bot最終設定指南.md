# Beauty Bot 最終設定指南

> **當前狀態**: ✅ 95% 完成，只差 API_TOKEN
> **預計完成時間**: 2 分鐘

---

## 📊 當前狀態

### ✅ 已完成

```bash
✅ Beauty Worker 部署完成
   URL: https://sales-ai-slack-bot-beauty.salesaiautomationv3.workers.dev
   Product Line: beauty
   Status: 運行正常

✅ Slack App 設定完成
   App Name: Beauty Sales Bot
   Bot Token: xoxb-***REDACTED***
   Signing Secret: e4b49c15ff652f42ae019aac93a24e3c

✅ Secrets 已設定
   SLACK_BOT_TOKEN ✅
   SLACK_SIGNING_SECRET ✅
   API_BASE_URL ✅ (https://sales-ai-server.salesaiautomationv3.workers.dev)

⏳ 待設定
   API_TOKEN (最後一步)
```

---

## 🎯 最後一步：設定 API_TOKEN

### 方法 1: 如果您知道 Token 值

```bash
cd /Users/stephen/Desktop/sales_ai_automation_v3/apps/slack-bot-beauty

# 輸入與 iCHEF Bot 相同的 API_TOKEN
wrangler secret put API_TOKEN
```

然後貼上 Token 值並按 Enter。

### 方法 2: 如果不確定 Token 值

**選項 A: 先用臨時值,測試表單功能**

```bash
cd /Users/stephen/Desktop/sales_ai_automation_v3/apps/slack-bot-beauty

# 設定臨時值
echo "temporary-token" | wrangler secret put API_TOKEN
```

**說明**:
- 表單彈出功能不需要正確的 token
- 可以先測試 Bot 的基本功能
- 提交表單時可能會失敗（預期行為）
- 之後更新為正確值即可

**選項 B: 跳過此步驟,直接測試**

您甚至可以完全不設定 API_TOKEN，直接測試表單功能。提交時會失敗，但可以從錯誤訊息中判斷是否需要 token。

---

## 🧪 立即測試 (不需要 API_TOKEN)

### 步驟 1: 測試 Worker

```bash
curl https://sales-ai-slack-bot-beauty.salesaiautomationv3.workers.dev
```

**預期結果**:
```json
{
  "status": "ok",
  "service": "sales-ai-slack-bot-beauty",
  "productLine": "beauty",
  "timestamp": "2026-01-20T..."
}
```

### 步驟 2: 在 Slack 測試

1. **開啟 Slack**
2. **搜尋 `@Beauty Sales Bot`**
3. **發送 DM 給 Bot**
4. **上傳一個測試音檔** (任何 MP3 或 M4A 檔案)

### 步驟 3: 確認表單

Bot 應該會彈出 Modal，檢查欄位:

```
✅ 店型選項:
   - 美髮沙龍
   - 美甲店
   - 美容 SPA
   - 醫美診所
   - 其他

✅ 員工人數:
   - 1-2人
   - 3-5人
   - 6-10人
   - 10人以上

✅ 現有系統:
   - 紙本
   - LINE
   - Excel
   - Google 表單
   - 其他系統

✅ 業務代表: [自動帶入您的名稱]
✅ 對話日期: [自動帶入今天]
```

**重要**: 確認表單是**美業專屬**，不是 iCHEF 的表單！

---

## 🔍 兩個 Bot 的區別

### iCHEF Sales Bot

```
Product Line: ichef
表單欄位:
  - 店型: 咖啡廳、飲料店、餐廳...
  - 服務類型: 內用、外帶、外送...
  - 現有系統: 紙本、LINE、POS系統...
```

### Beauty Sales Bot ✨

```
Product Line: beauty
表單欄位:
  - 店型: 美髮沙龍、美甲店、美容 SPA...
  - 員工人數: 1-2人、3-5人...
  - 現有系統: 紙本、LINE、Excel...
```

---

## 📋 完整測試檢查清單

### 基本功能 (現在就能測試)

- [ ] Worker 健康檢查通過
- [ ] 在 Slack 找到 @Beauty Sales Bot
- [ ] 可以發送 DM 給 Bot
- [ ] 上傳音檔後 Modal 彈出
- [ ] Modal 顯示**美業表單**（不是 iCHEF 表單）
- [ ] 表單包含「員工人數」欄位
- [ ] 表單店型包含「美髮沙龍」、「美甲店」
- [ ] 表單**沒有**「服務類型」欄位

### 完整流程 (需要 API_TOKEN)

- [ ] 填寫表單並提交
- [ ] 音檔成功上傳並轉錄
- [ ] MEDDIC 分析使用美業 Prompts
- [ ] 資料庫儲存 product_line = 'beauty'

---

## 🚨 常見問題

### Q1: Modal 沒有彈出

**可能原因**:
1. Event Subscriptions 未正確設定
2. Bot 沒有 `file_shared` 權限
3. Worker 未正常運行

**檢查方式**:
```bash
# 查看 Worker logs
wrangler tail sales-ai-slack-bot-beauty

# 然後在 Slack 上傳音檔,觀察 logs
```

### Q2: 彈出的是 iCHEF 表單

**可能原因**:
- Worker 的 PRODUCT_LINE 設定錯誤

**檢查方式**:
```bash
# 確認 Worker 回傳 productLine: "beauty"
curl https://sales-ai-slack-bot-beauty.salesaiautomationv3.workers.dev
```

### Q3: 提交表單失敗

**這是預期行為**（如果還沒設定 API_TOKEN）

**解決方式**:
1. 設定正確的 API_TOKEN
2. 或先用臨時值,之後再更新

---

## 🎉 恭喜！

如果表單測試通過,代表:

✅ **雙 Bot 架構成功** - iCHEF 和 Beauty 各自獨立運行
✅ **產品線判斷正確** - 每個 Bot 自動使用對應的 product line
✅ **表單配置正確** - 美業專屬欄位顯示正常
✅ **Slack 整合正常** - Event 和 Interactivity 都運作正常

**剩下的只是**:
- 設定 API_TOKEN（2 分鐘）
- 測試完整提交流程（5 分鐘）
- 通知業務團隊開始使用（隨時）

---

## 📞 需要協助?

### 如何找到 API_TOKEN

1. **詢問團隊成員** - 其他開發者可能知道
2. **檢查部署文件** - 查看 `.doc/` 目錄
3. **查看密碼管理系統** - 1Password, LastPass 等
4. **從 Server logs 推測** - `wrangler tail sales-ai-server`

### 設定 API_TOKEN 後

```bash
cd apps/slack-bot-beauty
wrangler secret put API_TOKEN
# 貼上 token 值

# 驗證
wrangler secret list
```

---

## 🔗 相關文件

- **完整部署報告**: `.doc/20260120_Beauty_Bot設定完成.md`
- **API 連接報告**: `.doc/20260120_Beauty_Bot_API連接設定完成報告.md`
- **Slack App 建立指南**: `.doc/20260120_建立Beauty_Slack_App完整指南.md`
- **API 設定指南**: `.doc/20260120_Beauty_Bot_API設定指南.md`

---

**文件版本**: v1.0
**建立時間**: 2026-01-20
**預計完成時間**: 2 分鐘（只需設定 API_TOKEN）

---

## 🎯 現在就開始測試吧！

不需要等待 API_TOKEN，**現在就可以測試表單功能**了！

1. 開啟 Slack
2. 搜尋 `@Beauty Sales Bot`
3. 上傳測試音檔
4. 確認美業表單彈出 ✅

祝測試順利！🚀
