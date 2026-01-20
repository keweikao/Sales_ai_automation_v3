# Agent 4 Summary 公開分享功能部署指南

**部署日期**: 2026-01-20
**功能版本**: v1.1.0
**狀態**: ✅ 程式碼完成,待部署

---

## 📋 功能概述

此次更新完成 Agent 4 Summary 功能的最後 20%:

### 新增功能
1. **公開分享頁面顯示 Agent 4 Summary** - 客戶可在分享頁面看到業務編輯的會議摘要
2. **案件資訊完整顯示** - 包含客戶編號、案件編號、店名、專屬業務資訊
3. **Share Token 有效期延長** - 從 7 天延長至 14 天

---

## 🔧 程式碼變更

### 1. `packages/api/src/routers/share.ts`

**變更 1**: Token 有效期延長 (line 56)
```typescript
const expiresAt = getTokenExpiry(14); // 從 7 天改為 14 天
```

**變更 2**: 查詢加入 slackUser (line 133)
```typescript
with: {
  opportunity: true,
  meddicAnalysis: true,
  slackUser: true, // 新增
},
```

**變更 3**: 返回 summary 和相關資料 (line 153-175)
```typescript
summary: conversation.summary, // 新增
opportunity: conversation.opportunity ? {
  customerId: conversation.opportunity.customerId,
  companyName: conversation.opportunity.companyName,
} : null,
slackUser: conversation.slackUser ? {
  slackUsername: conversation.slackUser.slackUsername,
  slackEmail: conversation.slackUser.slackEmail,
} : null,
```

### 2. `apps/web/src/routes/share/$token.tsx`

**變更 1**: Import FileText icon (line 3)
```typescript
import { AlertCircle, CheckCircle2, Clock, FileText, XCircle } from "lucide-react";
```

**變更 2**: Import CardDescription (line 6-12)
```typescript
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
```

**變更 3**: 新增 Summary 區塊 (line 110-170)
- 顯示會議摘要卡片
- 包含案件資訊區塊 (客戶編號、案件編號、店名、專屬業務)
- 顯示 Agent 4 生成的 summary 內容

---

## 📁 修改檔案清單

1. ✅ `packages/api/src/routers/share.ts` - 修改 Share API
2. ✅ `apps/web/src/routes/share/$token.tsx` - 修改公開分享頁面 UI

---

## 🚀 部署步驟

### Step 1: 部署 Server (API 變更)

```bash
cd apps/server
wrangler deploy
```

**預期輸出**:
```
✨ Built successfully
✨ Uploading...
✨ Deployment complete!
https://sales-ai-server.salesaiautomationv3.workers.dev
```

### Step 2: 部署 Web (Pages)

```bash
cd apps/web
bun run build
wrangler pages deploy dist
```

**預期輸出**:
```
✨ Compiled successfully
✨ Uploading...
✨ Deployment complete!
https://sales-ai-web.pages.dev
```

---

## ✅ 驗收測試

### 1. API 測試

```bash
# 測試公開分享 API 是否返回 summary
curl -X POST https://sales-ai-server.salesaiautomationv3.workers.dev/rpc/share.getByToken \
  -H "Content-Type: application/json" \
  -d '{"json": {"token": "YOUR_TEST_TOKEN"}}'
```

**確認項目**:
- [ ] 回應包含 `summary` 欄位
- [ ] 回應包含 `opportunity.customerId`
- [ ] 回應包含 `slackUser.slackUsername` 和 `slackUser.slackEmail`

### 2. 頁面測試

**測試步驟**:
1. [ ] 取得任一有效的 share token
2. [ ] 訪問 `https://sales-ai-web.pages.dev/share/{token}`
3. [ ] 確認頁面顯示「會議摘要」卡片
4. [ ] 確認案件資訊區塊顯示:
   - 客戶編號
   - 案件編號
   - 店名
   - 專屬業務 (名稱 + Email)
5. [ ] 確認 Summary 內容正確顯示
6. [ ] 確認在手機上排版正常

### 3. 端到端測試

**完整業務流程**:
1. [ ] 上傳測試音檔到 Slack
2. [ ] 等待 Queue Worker 處理完成 (Agent 4 生成 summary)
3. [ ] 在 Slack 點擊「✏️ 編輯摘要」編輯 summary
4. [ ] 儲存後點擊「📱 發送 SMS 給客戶」
5. [ ] 客戶收到簡訊 (固定格式,包含分享連結)
6. [ ] 點擊簡訊中的分享連結
7. [ ] 確認公開分享頁面顯示:
   - ✅ MEDDIC 資格評估
   - ✅ **會議摘要** (新增!)
   - ✅ 案件資訊 (客戶編號、案件編號、店名、業務資訊)
   - ✅ Agent 4 生成的 summary 內容
   - ✅ MEDDIC 六維度分析
   - ✅ 下一步行動
   - ✅ 風險提醒

### 4. Token 有效期測試

- [ ] 確認新生成的 token 有效期為 14 天
- [ ] 檢查資料庫 `share_tokens` 表的 `expires_at` 欄位

```sql
SELECT
  token,
  created_at,
  expires_at,
  EXTRACT(DAY FROM (expires_at - created_at)) AS days_valid
FROM share_tokens
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;
```

**預期結果**: `days_valid` 應為 `14`

---

## 📊 預期效果

### 優化前
- 公開分享頁面只顯示 MEDDIC 分析
- 沒有會議摘要
- 沒有案件資訊
- Token 7 天過期

### 優化後
- ✅ 公開分享頁面顯示 Agent 4 會議摘要
- ✅ 客戶可看到案件資訊 (客戶編號、案件編號、店名)
- ✅ 客戶知道專屬業務是誰 (名稱 + Email)
- ✅ Token 14 天過期 (有效期延長)

---

## ⚠️ 注意事項

### 1. 資料隱私
- Summary 由業務編輯,應該不包含內部敏感資訊
- 業務在編輯 summary 時應謹慎,確保內容適合客戶查看
- 建議未來在 Slack Modal 中加入提示:「此內容將公開給客戶查看」

### 2. 向後相容
- 如果 conversation 沒有 summary,不會顯示「會議摘要」區塊
- 舊的 token (7 天有效期) 仍然有效,直到過期
- 新生成的 token 自動使用 14 天有效期

### 3. 資料來源
- `customerId` 從 `opportunities` 表取得
- `slackUsername` 和 `slackEmail` 從 `slack_users` 表取得
- 如果資料不存在,顯示 "N/A" 或 "iCHEF 業務"

---

## 🐛 故障排查

### 問題 1: Summary 不顯示

**可能原因**:
- Conversation 沒有 summary (Agent 4 未生成或生成失敗)
- API 未返回 summary 欄位

**檢查方法**:
```sql
SELECT id, case_number, summary
FROM conversations
WHERE id = 'YOUR_CONVERSATION_ID';
```

**解決方案**:
- 確認 Queue Worker 已成功執行 Agent 4
- 確認 summary 欄位有值
- 如果沒有,重新處理音檔

### 問題 2: 案件資訊顯示 "N/A"

**可能原因**:
- Opportunity 沒有 customerId
- 資料庫欄位名稱不符

**檢查方法**:
```sql
SELECT id, customer_id, company_name
FROM opportunities
WHERE id = (
  SELECT opportunity_id
  FROM conversations
  WHERE id = 'YOUR_CONVERSATION_ID'
);
```

**解決方案**:
- 確認 opportunities 表有 `customer_id` 欄位
- 如果欄位名稱不同,需要修改 API 程式碼

### 問題 3: 業務資訊不顯示

**可能原因**:
- Conversation 沒有關聯 slack_user_id
- slack_users 表沒有對應記錄

**檢查方法**:
```sql
SELECT
  c.id,
  c.slack_user_id,
  su.slack_username,
  su.slack_email
FROM conversations c
LEFT JOIN slack_users su ON c.slack_user_id = su.id
WHERE c.id = 'YOUR_CONVERSATION_ID';
```

**解決方案**:
- 確認 conversation 有 slack_user_id
- 確認 slack_users 表有對應記錄

---

## 📝 後續改進

### 短期
- [ ] 在 Slack 編輯 Modal 加入「此內容將公開給客戶」提示
- [ ] Summary 過長時加入「展開/收合」功能
- [ ] 支援 Markdown 格式渲染 (使用 react-markdown)

### 中期
- [ ] Summary 版本歷史追蹤
- [ ] 允許業務選擇是否在分享頁面顯示 Summary
- [ ] 公開分享頁面加入「最後更新時間」

### 長期
- [ ] AI 自動優化 Summary 給客戶閱讀
- [ ] 多語系 Summary (英文版本)
- [ ] 社群媒體分享優化 (Open Graph tags)

---

## ✅ 部署檢查清單

- [ ] Server Worker 部署成功
- [ ] Web (Pages) 部署成功
- [ ] API 測試通過 (返回 summary, opportunity, slackUser)
- [ ] 頁面測試通過 (顯示會議摘要和案件資訊)
- [ ] 端到端測試通過 (完整業務流程)
- [ ] Token 有效期確認為 14 天

---

**部署完成時間**: __________
**部署人員**: __________
**版本**: v1.1.0
