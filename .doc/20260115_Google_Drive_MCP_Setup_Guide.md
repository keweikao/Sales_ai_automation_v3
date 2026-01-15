# Google Drive MCP 整合設置指南

**日期**: 2026-01-15
**狀態**: ✅ 完成開發,待配置

---

## 📋 概述

本文件說明如何配置 Google Drive MCP 整合,以實現自動上傳 MEDDIC 分析報告、團隊績效報告等文件到 Google Drive。

**功能**:
- ✅ 上傳報告檔案(Markdown, CSV, JSON)
- ✅ 建立資料夾組織文件
- ✅ 設定分享權限
- ✅ 搜尋歷史報告

**工具數量**: 4 個 MCP 工具

---

## 🔧 配置步驟

### Step 1: 建立 Google Cloud Project

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 點擊 **建立專案** 或選擇現有專案
3. 專案名稱建議: `Sales-AI-Automation-V3`

### Step 2: 啟用 Google Drive API

1. 在 Google Cloud Console,前往 **API 和服務 > 程式庫**
2. 搜尋 `Google Drive API`
3. 點擊 **Google Drive API** 並點擊 **啟用**

### Step 3: 建立 OAuth 2.0 憑證

1. 前往 **API 和服務 > 憑證**
2. 點擊 **建立憑證 > OAuth 用戶端 ID**
3. 應用程式類型選擇: **桌面應用程式**
4. 名稱: `Sales AI Automation OAuth Client`
5. 點擊 **建立**
6. 下載 JSON 檔案(包含 `client_id` 和 `client_secret`)

### Step 4: 取得 Refresh Token

使用以下腳本取得 Refresh Token:

```typescript
// get-google-refresh-token.ts

const CLIENT_ID = "your-client-id.apps.googleusercontent.com";
const CLIENT_SECRET = "your-client-secret";
const REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

// Step 1: 產生授權 URL
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  response_type: "code",
  scope: SCOPES.join(" "),
  access_type: "offline",
  prompt: "consent",
})}`;

console.log("請在瀏覽器中開啟以下 URL 並授權:");
console.log(authUrl);
console.log("\n授權後,複製授權碼並執行:");
console.log("bun run get-google-refresh-token.ts <authorization-code>");

// Step 2: 使用授權碼換取 Refresh Token
const authCode = process.argv[2];

if (authCode) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: authCode,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await response.json();
  console.log("\n✅ Refresh Token:");
  console.log(tokens.refresh_token);
  console.log("\n請將此 Token 加入到 .env 檔案中");
}
```

**執行步驟**:
1. 修改 `CLIENT_ID` 和 `CLIENT_SECRET`
2. 執行 `bun run get-google-refresh-token.ts`
3. 在瀏覽器開啟輸出的 URL
4. 授權後複製授權碼
5. 執行 `bun run get-google-refresh-token.ts <authorization-code>`
6. 複製輸出的 Refresh Token

### Step 5: 設定環境變數

在 `.env` 檔案中新增:

```env
# Google Drive OAuth 2.0 憑證
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token

# Google Drive 資料夾 ID (可選)
GOOGLE_DRIVE_REPORTS_FOLDER_ID=your-folder-id
```

**如何取得資料夾 ID**:
1. 在 Google Drive 中建立一個資料夾(例如: `Sales AI Reports`)
2. 開啟資料夾,URL 格式為: `https://drive.google.com/drive/folders/FOLDER_ID`
3. 複製 `FOLDER_ID` 部分

---

## 🛠️ MCP 工具說明

### 1. `gdrive_upload_report`

**功能**: 上傳報告檔案到 Google Drive

**輸入**:
```typescript
{
  reportContent: string,      // 報告內容(Markdown, CSV, JSON 等)
  fileName: string,           // 檔案名稱(例如: "Team-Dashboard-2026-01.md")
  folderId?: string,          // 上傳到的資料夾 ID(可選)
  mimeType?: string,          // MIME 類型(預設: "text/markdown")
  description?: string,       // 檔案描述(可選)
}
```

**輸出**:
```typescript
{
  fileId: string,             // 檔案 ID
  fileName: string,           // 檔案名稱
  webViewLink: string,        // 檢視連結
  createdTime: string,        // 建立時間
  folderId?: string,          // 資料夾 ID
  timestamp: Date,
}
```

**使用範例**:
```typescript
const result = await server.executeTool(
  "gdrive_upload_report",
  {
    reportContent: "# Team Dashboard\n...",
    fileName: "Team-Dashboard-2026-01-15.md",
    folderId: process.env.GOOGLE_DRIVE_REPORTS_FOLDER_ID,
  },
  { timestamp: new Date() }
);

console.log(`報告已上傳: ${result.webViewLink}`);
```

---

### 2. `gdrive_create_folder`

**功能**: 建立資料夾來組織報告

**輸入**:
```typescript
{
  folderName: string,         // 資料夾名稱
  parentFolderId?: string,    // 父資料夾 ID(可選)
  description?: string,       // 資料夾描述(可選)
}
```

**輸出**:
```typescript
{
  folderId: string,           // 資料夾 ID
  folderName: string,         // 資料夾名稱
  webViewLink: string,        // 檢視連結
  createdTime: string,        // 建立時間
  timestamp: Date,
}
```

**使用範例**:
```typescript
// 建立月份資料夾
const folder = await server.executeTool(
  "gdrive_create_folder",
  {
    folderName: "2026-01",
    parentFolderId: process.env.GOOGLE_DRIVE_REPORTS_FOLDER_ID,
    description: "2026 年 1 月報告",
  },
  { timestamp: new Date() }
);

// 上傳報告到該資料夾
await server.executeTool(
  "gdrive_upload_report",
  {
    reportContent: "...",
    fileName: "Team-Dashboard.md",
    folderId: folder.folderId,
  },
  { timestamp: new Date() }
);
```

---

### 3. `gdrive_share_file`

**功能**: 設定檔案分享權限

**輸入**:
```typescript
{
  fileId: string,                                    // 檔案 ID
  role: "reader" | "writer" | "commenter",          // 權限角色
  type: "user" | "group" | "domain" | "anyone",     // 分享類型
  emailAddress?: string,                             // Email(當 type = "user" 時)
  domain?: string,                                   // 網域(當 type = "domain" 時)
}
```

**輸出**:
```typescript
{
  permissionId: string,       // 權限 ID
  fileId: string,             // 檔案 ID
  role: string,               // 權限角色
  type: string,               // 分享類型
  sharedWith?: string,        // 分享對象
  timestamp: Date,
}
```

**使用範例**:
```typescript
// 公開分享(任何人皆可檢視)
await server.executeTool(
  "gdrive_share_file",
  {
    fileId: "your-file-id",
    role: "reader",
    type: "anyone",
  },
  { timestamp: new Date() }
);

// 分享給特定使用者
await server.executeTool(
  "gdrive_share_file",
  {
    fileId: "your-file-id",
    role: "writer",
    type: "user",
    emailAddress: "manager@company.com",
  },
  { timestamp: new Date() }
);

// 分享給整個網域
await server.executeTool(
  "gdrive_share_file",
  {
    fileId: "your-file-id",
    role: "reader",
    type: "domain",
    domain: "company.com",
  },
  { timestamp: new Date() }
);
```

---

### 4. `gdrive_search_files`

**功能**: 搜尋 Google Drive 中的檔案

**輸入**:
```typescript
{
  query: string,                                     // 搜尋關鍵字
  folderId?: string,                                 // 限制在特定資料夾(可選)
  maxResults?: number,                               // 最多回傳結果數(預設 10)
  orderBy?: "createdTime" | "modifiedTime" | ...     // 排序方式
}
```

**輸出**:
```typescript
{
  files: Array<{
    id: string,
    name: string,
    mimeType: string,
    webViewLink?: string,
    createdTime: string,
    modifiedTime: string,
  }>,
  count: number,              // 找到的檔案數量
  timestamp: Date,
}
```

**使用範例**:
```typescript
// 搜尋團隊報告
const result = await server.executeTool(
  "gdrive_search_files",
  {
    query: "Team-Dashboard",
    folderId: process.env.GOOGLE_DRIVE_REPORTS_FOLDER_ID,
    maxResults: 20,
    orderBy: "modifiedTime",
  },
  { timestamp: new Date() }
);

console.log(`找到 ${result.count} 個報告`);
result.files.forEach(file => {
  console.log(`- ${file.name}: ${file.webViewLink}`);
});
```

---

## 🔄 整合範例

### 範例 1: 自動上傳團隊報告

```typescript
// 生成團隊報告
const dashboard = await teamDashboardTool.handler({
  period: "month",
  generateReport: true,
}, { timestamp: new Date() });

// 讀取報告內容
const { filesystemReadTool } = await import("./external/filesystem.js");
const reportFile = await filesystemReadTool.handler({
  path: dashboard.reportPath!,
  encoding: "utf-8",
}, { timestamp: new Date() });

// 上傳到 Google Drive
const driveResult = await gdriveUploadReportTool.handler({
  reportContent: reportFile.content,
  fileName: `Team-Dashboard-${new Date().toISOString().split("T")[0]}.md`,
  folderId: process.env.GOOGLE_DRIVE_REPORTS_FOLDER_ID,
  description: `團隊績效報告 - ${dashboard.teamMetrics.period}`,
}, { timestamp: new Date() });

// 分享給團隊
await gdriveShareFileTool.handler({
  fileId: driveResult.fileId,
  role: "reader",
  type: "anyone",
}, { timestamp: new Date() });

// 發送 Slack 通知
await slackPostFormattedAnalysisTool.handler({
  channelId: process.env.SLACK_TEAM_CHANNEL!,
  text: `📊 團隊報告已生成: ${driveResult.webViewLink}`,
}, { timestamp: new Date() });
```

---

### 範例 2: 組織報告到月份資料夾

```typescript
// 建立月份資料夾(如果不存在)
const monthFolder = await gdriveCreateFolderTool.handler({
  folderName: "2026-01",
  parentFolderId: process.env.GOOGLE_DRIVE_REPORTS_FOLDER_ID,
  description: "2026 年 1 月報告",
}, { timestamp: new Date() });

// 上傳多個報告
const reports = [
  { content: teamDashboard, name: "Team-Dashboard.md" },
  { content: repPerformance, name: "Rep-Performance.md" },
  { content: opportunityForecast, name: "Opportunity-Forecast.md" },
];

for (const report of reports) {
  await gdriveUploadReportTool.handler({
    reportContent: report.content,
    fileName: report.name,
    folderId: monthFolder.folderId,
  }, { timestamp: new Date() });
}
```

---

### 範例 3: 搜尋並下載歷史報告

```typescript
// 搜尋特定業務的報告
const searchResult = await gdriveSearchFilesTool.handler({
  query: "Rep-Performance-user-123",
  folderId: process.env.GOOGLE_DRIVE_REPORTS_FOLDER_ID,
  maxResults: 10,
  orderBy: "createdTime",
}, { timestamp: new Date() });

console.log(`找到 ${searchResult.count} 個報告:`);
searchResult.files.forEach((file, i) => {
  console.log(`${i + 1}. ${file.name} (${file.createdTime})`);
  console.log(`   連結: ${file.webViewLink}`);
});
```

---

## 🔒 安全性考量

### OAuth 2.0 權限範圍

本整合使用最小權限原則:

```
https://www.googleapis.com/auth/drive.file
  - 只能存取由此應用程式建立或開啟的檔案
  - 無法存取使用者的其他檔案

https://www.googleapis.com/auth/drive.metadata.readonly
  - 只能讀取檔案 metadata(用於搜尋)
  - 無法修改或刪除檔案
```

### Refresh Token 保護

- ✅ Refresh Token 應儲存在 `.env` 檔案中
- ✅ 不要將 `.env` 檔案提交到 Git
- ✅ 使用 Cloudflare Workers 的環境變數(生產環境)
- ✅ 定期輪換 Refresh Token

### Access Token 處理

- Access Token 有效期: 1 小時
- 自動使用 Refresh Token 更新
- 不儲存 Access Token,每次請求時動態取得

---

## 📊 成本估算

### Google Drive API 配額

- **免費額度**: 每天 1,000,000,000 次查詢
- **寫入操作**: 每天 20,000 次
- **本專案預估**: 每天約 100 次寫入(遠低於限制)

### 儲存空間

- **免費額度**: 15 GB (Google 帳戶免費方案)
- **Markdown 報告**: 約 10 KB/個
- **CSV 匯出**: 約 50 KB/個
- **預估**: 1,500 個報告可使用約 15 MB (遠低於限制)

---

## 🧪 測試方式

### 本地測試腳本

```typescript
// test-google-drive.ts

import { createFullMCPServer } from "../src/mcp/server.js";

async function testGoogleDrive() {
  const server = createFullMCPServer({ enableLogging: true });

  // Test 1: 上傳測試檔案
  console.log("Test 1: Upload Report");
  const uploadResult = await server.safeExecuteTool(
    "gdrive_upload_report",
    {
      reportContent: "# Test Report\n\nThis is a test report.",
      fileName: `Test-Report-${Date.now()}.md`,
      folderId: process.env.GOOGLE_DRIVE_REPORTS_FOLDER_ID,
    },
    { timestamp: new Date() }
  );

  if (uploadResult.success) {
    console.log("✅ Upload successful");
    console.log(`   Link: ${uploadResult.data.webViewLink}`);

    // Test 2: 分享檔案
    console.log("\nTest 2: Share File");
    const shareResult = await server.safeExecuteTool(
      "gdrive_share_file",
      {
        fileId: uploadResult.data.fileId,
        role: "reader",
        type: "anyone",
      },
      { timestamp: new Date() }
    );

    if (shareResult.success) {
      console.log("✅ Share successful");
    }
  }

  // Test 3: 搜尋檔案
  console.log("\nTest 3: Search Files");
  const searchResult = await server.safeExecuteTool(
    "gdrive_search_files",
    {
      query: "Test-Report",
      maxResults: 5,
    },
    { timestamp: new Date() }
  );

  if (searchResult.success) {
    console.log(`✅ Found ${searchResult.data.count} files`);
  }
}

testGoogleDrive();
```

**執行**:
```bash
bun run packages/services/scripts/test-google-drive.ts
```

---

## 🎯 下一步

1. **配置 OAuth 憑證**:
   - 建立 Google Cloud Project
   - 啟用 Drive API
   - 取得 Refresh Token

2. **設定環境變數**:
   - 將憑證加入 `.env`
   - 建立 Drive 資料夾並取得 ID

3. **測試整合**:
   - 執行測試腳本
   - 驗證上傳和分享功能

4. **整合到 Analytics 工具**:
   - 修改 `teamDashboardTool` 等工具
   - 新增自動上傳到 Drive 的選項

5. **整合到 Slack Bot**:
   - 新增 `/upload-to-drive` 命令
   - 自動分享 Drive 連結到 Slack

---

**文件產生時間**: 2026-01-15
**狀態**: ✅ 開發完成,待配置測試
