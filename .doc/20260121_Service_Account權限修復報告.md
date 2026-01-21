# Service Account 權限修復報告

**日期:** 2026-01-21
**狀態:** ✅ 已完成
**部署版本:** bce37aff-862e-4486-b51b-71bb65b95b48

---

## 問題描述

用戶在訪問從 Slack 上傳的對話時遇到 **403 Forbidden** 錯誤,即使作為 Admin 也無法查看。

### 錯誤現象

```
POST https://sales-ai-server.salesaiautomationv3.workers.dev/rpc/conversations/get 403 (Forbidden)
```

---

## 根本原因分析

### 1. **userId 和 Email 的關聯機制**

系統使用 **Better Auth** 進行用戶認證:

**User Table** ([packages/db/src/schema/auth.ts:4-15](packages/db/src/schema/auth.ts#L4-L15)):
```typescript
{
  id: text("id").primaryKey(),           // 自動生成的唯一 ID (如 "abc123-def456")
  email: text("email").notNull().unique(), // 用戶 email (如 "stephen.kao@ichef.com.tw")
}
```

### 2. **Slack Bot 創建 Opportunity 的流程**

當從 Slack 上傳音檔時:

1. **Slack Bot** 使用 **Service Account Token** (Bearer Token) 呼叫 Server API
2. **Server** 識別為 Service Account,使用特殊 session:
   ```typescript
   // packages/api/src/context.ts:10-21
   const SERVICE_ACCOUNT_SESSION = {
     user: {
       id: "service-account",  // ← 關鍵!
       name: "Service Account",
       email: "service@internal.system",
     },
     session: { ... }
   };
   ```

3. **createOpportunity** 取得 userId 從 session.user.id:
   ```typescript
   // packages/api/src/routers/opportunity.ts:123-133
   const userId = context.session?.user.id;  // = "service-account"

   await db.insert(opportunities).values({
     id: randomUUID(),
     userId,  // ← 存入 "service-account"
     ...
   })
   ```

### 3. **權限檢查的錯誤邏輯**

原本的程式碼錯誤地認為 Slack 創建的 opportunities 其 `userId` 為 `null`:

```typescript
// ❌ 錯誤的判斷
const isSlackGenerated = !conversation.opportunity.userId;  // false!
```

**實際情況:**
- Slack 創建的 Opportunity: `userId = "service-account"` (不是 null!)
- `isSlackGenerated = false`
- 如果用戶角色判斷有問題,就會觸發 403 錯誤

---

## 解決方案

### 修改內容

修正三處權限檢查邏輯,將 `userId = "service-account"` 也視為團隊共享:

#### 1. **getConversation** ([packages/api/src/routers/conversation.ts:854-857](packages/api/src/routers/conversation.ts#L854-L857))

```typescript
// 修改前
const isSlackGenerated = !conversation.opportunity.userId;

// 修改後
const isSlackGenerated =
  !conversation.opportunity.userId ||
  conversation.opportunity.userId === "service-account";
```

#### 2. **updateSummary** ([packages/api/src/routers/conversation.ts:935-938](packages/api/src/routers/conversation.ts#L935-L938))

```typescript
// 修改前
const isSlackGenerated = !conversation.opportunity.userId;

// 修改後
const isSlackGenerated =
  !conversation.opportunity.userId ||
  conversation.opportunity.userId === "service-account";
```

#### 3. **listConversations** ([packages/api/src/routers/conversation.ts:706-711](packages/api/src/routers/conversation.ts#L706-L711))

```typescript
// 修改前
conditions.push(
  sql`(${opportunities.userId} = ${userId} OR ${opportunities.userId} IS NULL)`
);

// 修改後
conditions.push(
  sql`(${opportunities.userId} = ${userId} OR ${opportunities.userId} IS NULL OR ${opportunities.userId} = 'service-account')`
);
```

---

## 權限邏輯總結

修復後的完整權限規則:

### 1. **Admin 和 Manager**
✅ 可以查看所有對話和 opportunities (不受任何限制)

### 2. **一般業務 (Sales)**
可以查看:
- ✅ 自己創建的對話 (`userId` = 自己的 ID)
- ✅ Slack 創建的對話 (`userId` = null 或 "service-account")
- ❌ 其他業務創建的對話

### 3. **Slack 創建的對話視為團隊共享**
- 所有人都可以查看
- 所有人都可以編輯摘要

---

## 部署資訊

### 部署版本
- **Server:** bce37aff-862e-4486-b51b-71bb65b95b48
- **部署時間:** 2026-01-21
- **部署網址:** https://sales-ai-server.salesaiautomationv3.workers.dev

### 受影響的端點
- `/rpc/conversations/get` - 取得單一對話
- `/rpc/conversations/updateSummary` - 更新對話摘要
- `/rpc/conversations/list` - 列出對話清單

---

## 測試驗證

### 測試步驟

1. **從 Slack 上傳音檔**
   - 在 Slack 頻道上傳音檔
   - 填寫客戶資訊並提交
   - 等待處理完成

2. **點擊「查看完整分析」按鈕**
   - 應該成功導向對話詳細頁面
   - 不應出現 403 Forbidden 錯誤

3. **驗證權限**
   - Admin: 應該可以看到所有對話
   - Manager: 應該可以看到所有對話
   - Sales: 應該可以看到自己的對話和 Slack 創建的對話

4. **查看日誌**
   ```bash
   cd apps/server
   bunx wrangler tail
   ```

   應該看到類似輸出:
   ```json
   {
     "conversationId": "xxx",
     "userId": "user-abc123",
     "userEmail": "stephen.kao@ichef.com.tw",
     "opportunityUserId": "service-account",
     "isOwner": false,
     "userRole": "admin",
     "hasAdminAccess": true,
     "isSlackGenerated": true
   }
   ```

---

## 相關文件

- [.doc/20260120_Slack音檔上傳完整修復報告.md](.doc/20260120_Slack音檔上傳完整修復報告.md)
- [packages/api/src/context.ts](packages/api/src/context.ts) - Service Account 定義
- [packages/api/src/routers/conversation.ts](packages/api/src/routers/conversation.ts) - 權限檢查邏輯
- [packages/db/src/schema/auth.ts](packages/db/src/schema/auth.ts) - User schema

---

## 未來改進建議

### 1. **統一 Service Account 識別**

目前有兩種判斷方式:
- `userId === "service-account"`
- `userId === null`

建議建立統一的 helper function:

```typescript
function isTeamSharedOpportunity(userId: string | null): boolean {
  return !userId || userId === "service-account";
}
```

### 2. **資料庫遷移考量**

如果需要遷移舊資料:
- V2 遷移過來的資料可能有不同的 userId
- 考慮建立腳本將舊資料的 userId 設為 null 或 "service-account"
- 或者在權限檢查中加入舊系統 userId 的白名單

### 3. **角色管理改進**

目前角色判斷依賴環境變數 `ADMIN_EMAILS` 和 `MANAGER_EMAILS`:
- 考慮將角色資訊存入資料庫
- 建立 Admin 管理介面來管理用戶角色
- 支援更細緻的權限控制 (RBAC)

---

## 總結

✅ **問題已解決**

透過修正 `isSlackGenerated` 的判斷邏輯,將 Service Account (`userId = "service-account"`) 創建的 opportunities 也視為團隊共享資源,解決了 403 Forbidden 錯誤。

**關鍵修改:**
- 所有權限檢查處都加入 `userId === "service-account"` 的判斷
- 確保 Slack 創建的對話對所有用戶可見且可編輯
- 保留調試日誌以便未來追蹤權限問題

系統現在可以正常處理從 Slack 上傳的音檔,並允許所有團隊成員查看和編輯相關對話。
