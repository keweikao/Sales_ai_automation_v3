# Sales AI Automation V3 - 快速開始指南

**日期**: 2026-01-15
**版本**: V3.0.0
**工具總數**: 59 個 MCP 工具

---

## 🚀 快速開始

### 1. 環境設定 (5 分鐘)

**必要環境變數** (`.env`):

```env
# 核心資料庫
DATABASE_URL=postgresql://user:pass@host/db

# AI 服務
GROQ_API_KEY=gsk_xxxxx                    # Groq Whisper 語音轉文字
GEMINI_API_KEY=AIzaSyxxxxx                # Google Gemini MEDDIC 分析

# 雲端儲存
R2_ACCOUNT_ID=xxxxx
R2_ACCESS_KEY_ID=xxxxx
R2_SECRET_ACCESS_KEY=xxxxx
R2_BUCKET_NAME=sales-ai-audio

# Slack 整合
SLACK_BOT_TOKEN=xoxb-xxxxx
SLACK_TEAM_CHANNEL=C123456789             # 團隊頻道
SLACK_ALERTS_CHANNEL=C987654321           # 警示頻道

# Google 服務 (可選,用於 Drive/Calendar)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_REFRESH_TOKEN=xxxxx
GOOGLE_DRIVE_REPORTS_FOLDER_ID=xxxxx     # Drive 報告資料夾
```

---

## 📊 常用工具速查

### Analytics 工具 (數據分析)

#### 1. 生成團隊報告
```typescript
import { createFullMCPServer } from "./packages/services/src/mcp/server.js";

const server = createFullMCPServer();

// 生成週報
const result = await server.executeTool(
  "generate_team_dashboard",
  {
    period: "week",           // "week" | "month" | "quarter"
    generateReport: true,     // 是否生成 Markdown 檔案
  },
  { timestamp: new Date() }
);

console.log(`平均 MEDDIC 評分: ${result.teamMetrics.avgMeddicScore}`);
console.log(`成交案件: ${result.teamMetrics.dealsClosed}`);
console.log(`Top 表現: ${result.topPerformers[0].repName}`);
```

**用途**: 每週團隊會議、主管績效檢視

---

#### 2. 業務個人績效
```typescript
const performance = await server.executeTool(
  "generate_rep_performance",
  {
    repId: "user-123",
    period: "month",
    generateReport: true,
    includeMeddicBreakdown: true,  // 包含六維度分析
  },
  { timestamp: new Date() }
);

console.log(`對話數: ${performance.performance.conversationCount}`);
console.log(`平均評分: ${performance.performance.avgOverallScore}`);

// 檢視弱項
const scores = performance.performance.meddicScores;
if (scores.metrics < 3) console.log("需加強: Metrics (定量指標)");
if (scores.champion < 3) console.log("需加強: Champion (內部支持者)");
```

**用途**: 一對一績效回顧、業務自我檢視

---

#### 3. 商機預測
```typescript
const forecast = await server.executeTool(
  "forecast_opportunities",
  {
    minMeddicScore: 50,           // 最低 MEDDIC 評分
    includeRiskFactors: true,     // 包含風險分析
  },
  { timestamp: new Date() }
);

console.log(`總商機: ${forecast.summary.totalOpportunities}`);
console.log(`平均成交機率: ${forecast.summary.avgWinProbability}%`);
console.log(`預估總金額: $${forecast.summary.totalEstimatedValue}`);

// 高風險商機
const highRisk = forecast.forecasts.filter(f => f.riskFactors?.length >= 3);
console.log(`高風險商機: ${highRisk.length} 個`);
```

**用途**: Sales Pipeline Review、季度預測

---

#### 4. 匯出數據
```typescript
const csvExport = await server.executeTool(
  "export_analytics_to_sheets",
  {
    dataType: "team",             // "team" | "rep" | "opportunity"
    period: "month",
    format: "csv",                // "csv" | "json"
    outputPath: "reports/team-performance.csv",  // 可選
  },
  { timestamp: new Date() }
);

console.log(`已匯出 ${csvExport.rowCount} 行數據`);
console.log(`檔案位置: ${csvExport.filePath}`);
```

**用途**: Google Sheets 匯入、Excel 分析

---

### Google Drive 工具 (雲端協作)

#### 5. 上傳報告
```typescript
const driveUpload = await server.executeTool(
  "gdrive_upload_report",
  {
    reportContent: "# Team Dashboard\n...",
    fileName: `Team-Dashboard-${new Date().toISOString().split("T")[0]}.md`,
    folderId: process.env.GOOGLE_DRIVE_REPORTS_FOLDER_ID,
    description: "團隊週報",
  },
  { timestamp: new Date() }
);

console.log(`報告連結: ${driveUpload.webViewLink}`);
```

**用途**: 自動上傳報告到雲端

---

#### 6. 設定分享
```typescript
// 公開分享
await server.executeTool(
  "gdrive_share_file",
  {
    fileId: driveUpload.fileId,
    role: "reader",               // "reader" | "writer" | "commenter"
    type: "anyone",               // "anyone" | "user" | "group" | "domain"
  },
  { timestamp: new Date() }
);

// 或分享給特定使用者
await server.executeTool(
  "gdrive_share_file",
  {
    fileId: driveUpload.fileId,
    role: "writer",
    type: "user",
    emailAddress: "manager@company.com",
  },
  { timestamp: new Date() }
);
```

**用途**: 團隊報告分享、權限管理

---

### Google Calendar 工具 (自動排程)

#### 7. 排程後續跟進
```typescript
const followUp = await server.executeTool(
  "calendar_schedule_follow_up",
  {
    opportunityId: "opp-123",
    title: "跟進 ABC Corp 商機",
    description: "討論 MEDDIC 弱項並提出解決方案",
    scheduledFor: "next_week",    // "tomorrow" | "next_week" | ISO 8601
    durationMinutes: 60,
    attendeeEmails: ["rep@company.com"],
    talkTrack: "重點:\n1. 確認預算\n2. 了解決策流程\n3. 介紹成功案例",
  },
  { timestamp: new Date() }
);

console.log(`會議已建立: ${followUp.htmlLink}`);
```

**用途**: 高風險商機自動跟進、MEDDIC 輔導

---

#### 8. 建立會議
```typescript
const meeting = await server.executeTool(
  "calendar_create_event",
  {
    title: "週報討論會議",
    description: "檢視本週團隊績效和重點商機",
    startTime: "2026-01-20T10:00:00+08:00",
    endTime: "2026-01-20T11:00:00+08:00",
    attendeeEmails: ["team@company.com"],
    location: "Meeting Room A",
    sendNotifications: true,
  },
  { timestamp: new Date() }
);
```

**用途**: 團隊會議、客戶拜訪

---

## 🔄 端到端工作流程

### 工作流程 1: 自動化週報

```typescript
// 1. 生成團隊報告
const dashboard = await server.executeTool("generate_team_dashboard", {
  period: "week",
  generateReport: true,
});

// 2. 匯出 CSV
const csv = await server.executeTool("export_analytics_to_sheets", {
  dataType: "team",
  period: "week",
  format: "csv",
});

// 3. 讀取報告內容
const { filesystemReadTool } = await import("./packages/services/src/mcp/external/filesystem.js");
const report = await filesystemReadTool.handler({
  path: dashboard.reportPath,
  encoding: "utf-8",
}, { timestamp: new Date() });

// 4. 上傳到 Drive
const driveFile = await server.executeTool("gdrive_upload_report", {
  reportContent: report.content,
  fileName: `Team-Dashboard-${new Date().toISOString().split("T")[0]}.md`,
  folderId: process.env.GOOGLE_DRIVE_REPORTS_FOLDER_ID,
});

// 5. 公開分享
await server.executeTool("gdrive_share_file", {
  fileId: driveFile.fileId,
  role: "reader",
  type: "anyone",
});

// 6. 建立週會
const meeting = await server.executeTool("calendar_create_event", {
  title: "週報討論會議",
  description: `報告: ${driveFile.webViewLink}\nCSV: ${csv.filePath}`,
  startTime: "2026-01-20T10:00:00+08:00",
  endTime: "2026-01-20T11:00:00+08:00",
  attendeeEmails: ["team@company.com"],
});

// 7. Slack 通知
const { slackPostFormattedAnalysisTool } = await import("./packages/services/src/mcp/external/slack.js");
await slackPostFormattedAnalysisTool.handler({
  channelId: process.env.SLACK_TEAM_CHANNEL,
  text: `📊 週報已產生!\n報告: ${driveFile.webViewLink}\n會議: ${meeting.htmlLink}`,
}, { timestamp: new Date() });

console.log("✅ 週報流程完成!");
```

---

### 工作流程 2: 高風險商機自動跟進

```typescript
// 1. 商機預測
const forecast = await server.executeTool("forecast_opportunities", {
  minMeddicScore: 50,
  includeRiskFactors: true,
});

// 2. 篩選高風險商機
const highRisk = forecast.forecasts.filter(f => f.riskFactors?.length >= 3);

console.log(`發現 ${highRisk.length} 個高風險商機`);

// 3. 自動排程跟進
for (const opp of highRisk) {
  const event = await server.executeTool("calendar_schedule_follow_up", {
    opportunityId: opp.opportunityId,
    title: `跟進高風險商機: ${opp.accountName}`,
    description: `風險因素:\n${opp.riskFactors?.join("\n")}\n\n建議:\n${opp.recommendations.join("\n")}`,
    scheduledFor: "next_week",
    durationMinutes: 60,
    talkTrack: opp.recommendations.join("\n"),
  });

  console.log(`✅ 已排程: ${opp.accountName} - ${event.htmlLink}`);
}

// 4. 上傳風險報告
const reportContent = JSON.stringify({ highRiskOpportunities: highRisk }, null, 2);
const riskReport = await server.executeTool("gdrive_upload_report", {
  reportContent,
  fileName: `High-Risk-Opportunities-${Date.now()}.json`,
  folderId: process.env.GOOGLE_DRIVE_REPORTS_FOLDER_ID,
});

// 5. Slack 警示
const { slackPostAlertTool } = await import("./packages/services/src/mcp/external/slack.js");
await slackPostAlertTool.handler({
  channelId: process.env.SLACK_ALERTS_CHANNEL,
  message: `⚠️ 發現 ${highRisk.length} 個高風險商機\n報告: ${riskReport.webViewLink}`,
  severity: "warning",
}, { timestamp: new Date() });

console.log("✅ 高風險商機處理完成!");
```

---

## 🧪 測試與驗證

### 驗證工具註冊

```bash
# 驗證所有 Phase 4 工具
bun run packages/services/scripts/verify-phase4-tools.ts

# 預期輸出:
# ✅ Analytics MCP Tools: 4 tools
# ✅ Google Drive MCP Tools: 4 tools
# ✅ Google Calendar MCP Tools: 5 tools
# 📦 Total: 59 MCP tools
```

### 測試單一工具

```typescript
import { createFullMCPServer } from "./packages/services/src/mcp/server.js";

const server = createFullMCPServer({ enableLogging: true });

// 使用 safeExecuteTool 獲得錯誤處理
const result = await server.safeExecuteTool(
  "generate_team_dashboard",
  { period: "week", generateReport: false },
  { timestamp: new Date() }
);

if (result.success) {
  console.log("✅ 成功:", result.data);
} else {
  console.error("❌ 錯誤:", result.error);
}
```

---

## 🔧 故障排除

### 問題 1: Google OAuth 錯誤

**症狀**: `Failed to get access token`

**解決方案**:
1. 檢查環境變數是否正確設定
2. 確認 Refresh Token 未過期
3. 重新取得 Refresh Token (參見 Google Drive 設定指南)

```bash
# 檢查環境變數
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
echo $GOOGLE_REFRESH_TOKEN
```

---

### 問題 2: 資料庫連線失敗

**症狀**: `Cannot find package 'cloudflare:workers'` 或連線錯誤

**解決方案**:
1. 確認 `DATABASE_URL` 正確
2. 本地測試時使用 `@neondatabase/serverless` 直接連線
3. 生產環境使用 Cloudflare Workers

```typescript
// 本地測試
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
const result = await sql`SELECT NOW()`;
console.log("資料庫連線正常:", result);
```

---

### 問題 3: 工具未註冊

**症狀**: `Tool not found: xxx`

**解決方案**:
```typescript
const server = createFullMCPServer();

// 檢查工具是否存在
console.log(server.hasTool("generate_team_dashboard")); // 應該返回 true

// 列出所有工具
console.log("已註冊工具:", server.toolNames);

// 檢查工具總數
console.log("工具總數:", server.toolCount); // 應該是 59
```

---

## 📚 相關文檔

### 詳細文檔
- [Phase 4 完成報告](.doc/20260115_Phase4_Complete.md) - 完整功能說明
- [MCP 工具總覽](.doc/20260115_MCP_Tools_Complete_Overview.md) - 59 個工具完整列表
- [Google Drive 設定指南](.doc/20260115_Google_Drive_MCP_Setup_Guide.md) - OAuth 配置步驟

### API 參考
- [Groq Whisper API](https://console.groq.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [Google Drive API](https://developers.google.com/drive/api)
- [Google Calendar API](https://developers.google.com/calendar/api)

---

## 💡 最佳實踐

### 1. 錯誤處理
```typescript
// ✅ 好的做法: 使用 safeExecuteTool
const result = await server.safeExecuteTool("tool_name", input, context);
if (!result.success) {
  console.error("錯誤:", result.error);
  // 發送 Slack 警示或記錄到資料庫
}

// ❌ 避免: 直接使用 executeTool (會拋出例外)
const result = await server.executeTool("tool_name", input, context);
```

### 2. 批次執行
```typescript
// 平行執行多個獨立工具
const results = await server.batchExecute([
  { name: "generate_team_dashboard", input: { period: "week" } },
  { name: "forecast_opportunities", input: { minMeddicScore: 50 } },
], { parallel: true });

console.log("團隊報告:", results[0].data);
console.log("商機預測:", results[1].data);
```

### 3. 環境變數管理
```typescript
// ✅ 檢查必要環境變數
const requiredEnvVars = [
  "DATABASE_URL",
  "GROQ_API_KEY",
  "GEMINI_API_KEY",
];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`缺少環境變數: ${varName}`);
  }
}
```

---

## 🎯 快速指令

```bash
# 驗證 Phase 4 工具
bun run packages/services/scripts/verify-phase4-tools.ts

# 測試 Analytics 工具
bun run packages/services/scripts/test-analytics-tools.ts

# 部署到 Cloudflare Workers
cd packages/services && bun run deploy

# 檢查資料庫連線
bun run check-db-connections.ts
```

---

## ✅ 檢查清單

**部署前檢查**:
- [ ] 環境變數已設定
- [ ] Google OAuth 已配置 (如需使用 Drive/Calendar)
- [ ] 資料庫連線測試通過
- [ ] 所有 59 個工具已註冊
- [ ] Slack Bot Token 有效
- [ ] R2 Storage 權限正確

**功能測試**:
- [ ] 團隊報告生成成功
- [ ] 商機預測運作正常
- [ ] Drive 上傳和分享功能正常
- [ ] Calendar 排程功能正常
- [ ] Slack 通知送達

---

**快速開始指南版本**: V1.0
**更新日期**: 2026-01-15
**適用系統**: Sales AI Automation V3.0.0

