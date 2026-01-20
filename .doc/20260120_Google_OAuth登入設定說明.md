# Google OAuth 登入設定說明

**建立日期**: 2026-01-20
**版本**: v1.0

---

## 📋 功能概覽

系統已啟用 Google OAuth 登入功能，使用者可以選擇：
1. **使用 Google 登入**（推薦）：直接使用 Google 帳號登入，無需額外設定密碼
2. **使用 Email/Password 登入**：傳統的帳號密碼登入方式

---

## 🔧 實作內容

### 1. Better Auth 設定

**檔案**: `packages/auth/src/index.ts`

已在 Better Auth 設定中啟用 Google social provider：

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
});
```

### 2. 前端登入介面

**檔案**: `apps/web/src/components/sign-in-form.tsx`

新增 Google 登入按鈕和分隔線：

```typescript
const handleGoogleSignIn = async () => {
  await authClient.signIn.social(
    {
      provider: "google",
      callbackURL: "/dashboard",
    },
    {
      onError: (error) => {
        toast.error(error.error.message || error.error.statusText);
      },
    }
  );
};

// UI 結構
<Button onClick={handleGoogleSignIn} type="button" variant="outline">
  <GoogleIcon />
  使用 Google 登入
</Button>

<Divider text="或使用 Email 登入" />

<EmailPasswordForm />
```

**檔案**: `apps/web/src/components/sign-up-form.tsx`

同樣新增 Google 註冊/登入按鈕。

### 3. 環境變數

Google OAuth 需要以下環境變數（已在 Cloudflare Workers 設定）：

- `GOOGLE_CLIENT_ID`: Google OAuth Client ID（Secret）
- `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret（Secret）

**說明**：這些環境變數已經在 `packages/infra/alchemy.run.ts` 和 `apps/server/wrangler.toml` 中定義並設定為可選參數。

---

## 🌐 Google OAuth 流程

### 登入流程

1. 使用者點擊「使用 Google 登入」按鈕
2. Better Auth 將使用者重定向到 Google 授權頁面
3. 使用者選擇 Google 帳號並授權
4. Google 將使用者重定向回應用程式（回調 URL）
5. Better Auth 驗證 Google 回傳的授權碼
6. 系統檢查該 Google 帳號是否已註冊：
   - **已註冊**：直接登入，跳轉到 `/dashboard`
   - **未註冊**：自動建立新使用者，跳轉到 `/dashboard`
7. 登入完成

### 權限檢查（與 Email 登入相同）

登入後，系統會根據 Google 帳號的 email 檢查權限等級：

1. **管理者（Admin）**：Email 在 `ADMIN_EMAILS` 白名單中
   - 範例：`stephen.kao@ichef.com.tw`
   - 權限：可查看所有業務的資料

2. **主管（Manager）**：Email 在 `MANAGER_EMAILS` 白名單中
   - 範例：`wade.lin@ichef.com.tw`, `benjamin.we@ichef.com.tw`
   - 權限：可查看所有業務的資料

3. **一般業務（Sales）**：其他 email
   - 權限：只能查看自己創建的資料

---

## 📝 Google Cloud Console 設定

### 前置條件

確保 Google Cloud Console 已建立 OAuth 2.0 Client ID：

1. **前往 Google Cloud Console**
   - URL: https://console.cloud.google.com/apis/credentials
   - 選擇專案或建立新專案

2. **建立 OAuth 2.0 Client ID**
   - 點擊「建立憑證」→「OAuth 2.0 用戶端 ID」
   - 應用程式類型：「網頁應用程式」
   - 名稱：`Sales AI Automation V3`

3. **設定授權重新導向 URI**

   **生產環境**:
   ```
   https://sales-ai-server.salesaiautomationv3.workers.dev/api/auth/callback/google
   ```

   **開發環境**（如需本地測試）:
   ```
   http://localhost:3000/api/auth/callback/google
   ```

4. **取得憑證**
   - 複製「用戶端 ID」→ 設定為 `GOOGLE_CLIENT_ID`
   - 複製「用戶端密鑰」→ 設定為 `GOOGLE_CLIENT_SECRET`

5. **設定 OAuth 同意畫面**
   - 應用程式名稱：`Sales AI Automation`
   - 使用者支援電子郵件：您的管理員 email
   - 應用程式標誌：（可選）
   - 授權網域：`salesaiautomationv3.workers.dev`
   - 開發人員聯絡資訊：管理員 email

### Cloudflare Workers Secret 設定

在 Cloudflare Workers Dashboard 設定 secrets：

```bash
cd apps/server

# 設定 Google Client ID
wrangler secret put GOOGLE_CLIENT_ID
# 輸入 Google OAuth Client ID

# 設定 Google Client Secret
wrangler secret put GOOGLE_CLIENT_SECRET
# 輸入 Google OAuth Client Secret
```

**驗證設定**：

```bash
wrangler secret list
```

應該看到：
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

---

## 🔐 安全性考量

### 1. Email 域名限制（可選）

如果要限制只有特定組織的 email 可以註冊，可以在 Better Auth 設定中加入：

```typescript
socialProviders: {
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    // 限制只允許 @ichef.com.tw 的 email
    allowedDomains: ["ichef.com.tw"],
  },
},
```

### 2. 權限白名單管理

- 定期審查 `ADMIN_EMAILS` 和 `MANAGER_EMAILS` 白名單
- 離職人員應立即從白名單移除
- 記錄所有權限變更

### 3. OAuth Callback URL 安全性

- 確保 Google Cloud Console 中的「授權重新導向 URI」只包含可信任的 URL
- 不要加入 `localhost` 到生產環境設定中

---

## 🧪 測試流程

### 1. 本地測試（可選）

如果需要在本地測試 Google OAuth：

1. 更新 Google Cloud Console 重新導向 URI，加入：
   ```
   http://localhost:3000/api/auth/callback/google
   ```

2. 啟動本地開發伺服器
3. 訪問登入頁面，點擊「使用 Google 登入」
4. 完成 Google 授權流程

### 2. 生產環境測試

1. **訪問登入頁面**
   - URL: https://sales-ai-web.salesaiautomationv3.workers.dev/login

2. **點擊「使用 Google 登入」按鈕**
   - 應該重定向到 Google 授權頁面

3. **選擇 Google 帳號**
   - 使用您的 Google 帳號登入
   - 授權應用程式存取基本資訊

4. **驗證重定向**
   - 應該重定向回 `/dashboard`
   - 使用者應該已登入

5. **測試權限**
   - 使用 Admin email (`stephen.kao@ichef.com.tw`) 登入
     - ✅ 應該可以查看所有資料
   - 使用 Manager email (`wade.lin@ichef.com.tw`) 登入
     - ✅ 應該可以查看所有資料
   - 使用其他 email 登入
     - ✅ 只能查看自己的資料

---

## 🚀 部署狀態

### 已完成

- ✅ Better Auth Google OAuth 設定
- ✅ 前端登入/註冊表單新增 Google 按鈕
- ✅ Cloudflare Workers 已部署（含權限白名單）
- ✅ 環境變數已設定

### Cloudflare Workers 部署資訊

**Server**:
- URL: https://sales-ai-server.salesaiautomationv3.workers.dev
- Version ID: a76cc473-e845-484e-9583-bc9a1b6d4b37
- 已部署時間: 2026-01-20

**環境變數**:
- `ADMIN_EMAILS`: stephen.kao@ichef.com.tw
- `MANAGER_EMAILS`: wade.lin@ichef.com.tw,benjamin.we@ichef.com.tw
- `GOOGLE_CLIENT_ID`: （已設定為 secret）
- `GOOGLE_CLIENT_SECRET`: （已設定為 secret）

---

## 📞 常見問題

### Q1: Google 登入後重定向失敗怎麼辦？

**A**: 檢查以下項目：
1. Google Cloud Console 的「授權重新導向 URI」是否正確設定
2. `BETTER_AUTH_URL` 環境變數是否正確（應為 server URL）
3. 瀏覽器 Console 是否有錯誤訊息

### Q2: Google 登入顯示「未經授權的重新導向 URI」錯誤？

**A**:
1. 前往 Google Cloud Console
2. 確認「授權重新導向 URI」包含：
   ```
   https://sales-ai-server.salesaiautomationv3.workers.dev/api/auth/callback/google
   ```
3. 儲存變更後等待 1-2 分鐘讓變更生效

### Q3: 使用 Google 登入但權限不正確？

**A**:
1. 檢查使用者的 Google email 是否在白名單中
2. 確認 `ADMIN_EMAILS` 和 `MANAGER_EMAILS` 環境變數是否正確設定
3. 重新部署 server 以應用最新的環境變數

### Q4: 可以限制只有公司 email 可以註冊嗎？

**A**: 可以，在 Better Auth 設定中加入 `allowedDomains` 限制：

```typescript
socialProviders: {
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    allowedDomains: ["ichef.com.tw"], // 只允許 @ichef.com.tw
  },
},
```

### Q5: Google 登入和 Email 登入的資料是分開的嗎？

**A**: 不是。如果同一個 email 先用 Email 註冊，再用 Google 登入（同樣的 email），Better Auth 會自動合併這兩個帳號。反之亦然。

---

## 🔄 未來擴展

### 1. 多租戶支援

可以為不同組織提供獨立的 Google OAuth 設定：

```typescript
socialProviders: {
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    // 根據 email 域名自動分配組織
    hostedDomain: "ichef.com.tw",
  },
},
```

### 2. 其他社交登入

可以輕鬆新增其他社交登入選項：

- GitHub
- Microsoft (Azure AD)
- Facebook
- Line

只需在 Better Auth 設定中新增對應的 provider。

---

## 📝 變更歷史

- **2026-01-20**: 初版發布，實作 Google OAuth 登入功能

---

**需要協助？** 請聯繫系統管理員或參考 Better Auth 文件：
- Better Auth 官方文件: https://better-auth.com
- Google OAuth 2.0 文件: https://developers.google.com/identity/protocols/oauth2
