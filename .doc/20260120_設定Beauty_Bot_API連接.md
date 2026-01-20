# 設定 Beauty Bot API 連接

> **目的**: 將 iCHEF Bot 的 API 設定複製到 Beauty Bot
> **所需時間**: 1 分鐘

---

## 🎯 為什麼可以共用?

兩個 Bot 使用**完全相同的 API**:
- ✅ 相同的 API URL
- ✅ 相同的 API Token
- ✅ 差異只在 `productLine` 參數 (ichef vs beauty)

---

## 🔧 快速設定方式

### 方法 1: 使用互動式腳本 (推薦)

```bash
cd /Users/stephen/Desktop/sales_ai_automation_v3
./scripts/copy-secrets-to-beauty-bot.sh
```

腳本會詢問您:
1. API_BASE_URL (與 iCHEF Bot 相同)
2. API_TOKEN (與 iCHEF Bot 相同)

然後自動設定到 Beauty Bot。

---

### 方法 2: 手動設定

如果您知道 iCHEF Bot 使用的 API 設定:

```bash
cd /Users/stephen/Desktop/sales_ai_automation_v3/apps/slack-bot-beauty

# 設定 API URL (與 iCHEF Bot 相同)
wrangler secret put API_BASE_URL
# 貼上與 iCHEF Bot 相同的 URL

# 設定 API Token (與 iCHEF Bot 相同)
wrangler secret put API_TOKEN
# 貼上與 iCHEF Bot 相同的 Token
```

---

## 📋 如何取得 iCHEF Bot 的 API 設定?

### 選項 1: 從部署文件查找

如果您有記錄在文件中,直接使用即可。

### 選項 2: 從 Cloudflare Dashboard 查看

1. 前往 Cloudflare Dashboard
2. Workers & Pages
3. 選擇 `sales-ai-slack-bot`
4. Settings → Variables
5. 查看 API_BASE_URL 和 API_TOKEN 的值

### 選項 3: 從程式碼或配置檔案查找

檢查以下檔案:
- `apps/slack-bot/.dev.vars` (如果有)
- `apps/server/.env`
- 部署文件

---

## ✅ 驗證設定

設定完成後,驗證 Beauty Bot 的 secrets:

```bash
cd apps/slack-bot-beauty
wrangler secret list
```

**預期結果**:
```json
[
  {
    "name": "API_BASE_URL",      // ✅ 新增
    "type": "secret_text"
  },
  {
    "name": "API_TOKEN",          // ✅ 新增
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

## 🧪 完整測試

設定完成後,進行端對端測試:

### 1. 測試 iCHEF Bot

```
1. Slack DM @iCHEF Sales Bot
2. 上傳音檔
3. 填寫表單 (應顯示 iCHEF 欄位)
4. 提交
5. 確認成功處理
```

### 2. 測試 Beauty Bot

```
1. Slack DM @Beauty Sales Bot
2. 上傳音檔
3. 填寫表單 (應顯示美業欄位: 員工人數等)
4. 提交
5. 確認成功處理
```

### 3. 檢查資料庫

```sql
-- 查看最近的 Opportunities
SELECT
  id,
  company_name,
  product_line,
  created_at
FROM opportunities
ORDER BY created_at DESC
LIMIT 10;
```

**預期結果**:
- iCHEF Bot 建立的資料: `product_line = 'ichef'`
- Beauty Bot 建立的資料: `product_line = 'beauty'`

---

## 🎯 API 呼叫流程圖

```
┌─────────────────────────────────────────────────┐
│  業務上傳音檔到 Slack Bot                        │
└────────────┬────────────────────────────────────┘
             │
             ├─ iCHEF Bot 收到
             │  └─> API Call: { productLine: 'ichef', ... }
             │
             └─ Beauty Bot 收到
                └─> API Call: { productLine: 'beauty', ... }
                     │
                     ▼
         ┌──────────────────────────┐
         │   共用的 API Server       │
         │   (處理兩種產品線)        │
         └────────────┬─────────────┘
                      │
                      ├─ if productLine === 'ichef'
                      │  └─> 使用 iCHEF MEDDIC Prompts
                      │
                      └─ if productLine === 'beauty'
                         └─> 使用 Beauty MEDDIC Prompts
                              │
                              ▼
                  ┌──────────────────────┐
                  │  Queue Worker        │
                  │  (Groq + Gemini)     │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  PostgreSQL Database │
                  │  標記 product_line   │
                  └──────────────────────┘
```

---

## 📚 相關文件

- **Beauty Bot 設定完成**: `.doc/20260120_Beauty_Bot設定完成.md`
- **雙 Bot 架構方案**: `.doc/20260119_雙Slack_Bot架構方案.md`
- **部署完成報告**: `.doc/20260119_雙Slack_Bot部署完成報告.md`

---

## 💡 常見問題

### Q: API_BASE_URL 應該填什麼?

A: 填入您的 API Server URL,例如:
- Cloudflare Worker: `https://your-api.workers.dev`
- 自架 API: `https://api.yourdomain.com`

**重點**: 兩個 Bot 使用**完全相同**的 URL

### Q: API_TOKEN 是什麼?

A: 用於驗證 Slack Bot 呼叫 API 的身份。如果您的 API 需要驗證,就需要設定這個 Token。

**重點**: 兩個 Bot 使用**完全相同**的 Token

### Q: 設定錯了怎麼辦?

A: 重新執行 `wrangler secret put` 即可覆蓋舊值:

```bash
cd apps/slack-bot-beauty
wrangler secret put API_BASE_URL  # 重新設定
wrangler secret put API_TOKEN     # 重新設定
```

---

**準備好了嗎?** 執行腳本或手動設定,1 分鐘完成! 🚀

---

**文件版本**: v1.0
**建立時間**: 2026-01-20
