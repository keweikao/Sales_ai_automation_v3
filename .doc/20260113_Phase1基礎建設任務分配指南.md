# Phase 1: 基礎建設 - 任務分配指南

## 如何給其他 Agent 指令

### 方案 1: GitHub Issues（推薦）

在 GitHub repository 建立 3 個 Issues，其他開發者可以認領：

```bash
# Issue #1: [Phase 1A] Database Schema
# Issue #2: [Phase 1B] UI Components
# Issue #3: [Phase 1C] External Services + V2 Migration
```

完整的 Issue 內容已準備好：
- `/tmp/workflow-a-issue.md` - Database Schema
- `/tmp/workflow-b-issue.md` - UI Components
- `/tmp/workflow-c-issue.md` - External Services

### 方案 2: 直接分配給 Claude Code Agents

如果您使用 Claude Code 的多個 agent instances，可以直接給予以下指令：

#### Agent 1: Database Developer
```
請閱讀 /tmp/workflow-a-issue.md 並完成 Phase 1A: Database Schema 任務。

重點：
1. 建立 4 個 schema 檔案（lead.ts, conversation.ts, meddic.ts, user.ts）
2. 必須包含 V2 特有欄位（progressScore, urgencyLevel, storeName, agentOutputs）
3. 執行 db:generate 和 db:push
4. 參考 .doc/v3-parallel-development-strategy.md 的 Workflow A 章節
```

#### Agent 2: Frontend Developer
```
請閱讀 /tmp/workflow-b-issue.md 並完成 Phase 1B: UI Components 任務。

重點：
1. 建立 13 個 React 元件（Lead 4個、Conversation 3個、MEDDIC 3個、Common 3個）
2. 使用 shadcn/ui + Recharts + TanStack Table
3. 先用 mock data 開發，不需要 API 整合
4. 參考 .doc/v3-parallel-development-strategy.md 的 Workflow B 章節
```

#### Agent 3: Integration Developer
```
請閱讀 /tmp/workflow-c-issue.md 並完成 Phase 1C: External Services 任務。

⚠️ 這是 V2 遷移的關鍵任務！

重點：
1. 建立 packages/services 套件
2. 從 V2 遷移 7 個 MEDDIC prompts（逐字複製）
3. 實作 Groq Whisper 轉錄服務（從 V2 移植）
4. 實作 Multi-Agent Orchestrator（從 V2 移植，保留七階段流程）
5. 整合 Gemini 2.0 + Cloudflare R2
6. 參考 V2 專案：https://github.com/keweikao/sales-ai-automation-V2
```

### 方案 3: Slack 或其他協作工具

複製以下內容到 Slack channel：

```
🚀 Phase 1 開始！請認領以下任務：

【Workflow A - Database】@backend-dev
- 建立 PostgreSQL schema（Lead, Conversation, MEDDIC）
- 詳細指令：/tmp/workflow-a-issue.md
- 預估：2-3 天

【Workflow B - UI Components】@frontend-dev
- 建立 13 個 React 元件
- 詳細指令：/tmp/workflow-b-issue.md
- 預估：3-4 天

【Workflow C - External Services】@integration-dev ⭐ 關鍵任務
- V2 prompts 遷移 + Groq Whisper + Multi-Agent Orchestrator
- 詳細指令：/tmp/workflow-c-issue.md
- 預估：3-4 天

📚 參考文件：.doc/v3-parallel-development-strategy.md
```

---

## 3 個 Workflow 的快速對比

| Workflow | 負責人 | 預估時間 | 前置依賴 | 優先級 |
|----------|--------|----------|----------|--------|
| **A: Database Schema** | Backend Dev | 2-3 天 | 無 | 高 |
| **B: UI Components** | Frontend Dev | 3-4 天 | 無 | 高 |
| **C: External Services** | Integration Dev | 3-4 天 | 無 | **最高（V2 遷移）** |

**可完全並行**：3 個 Workflow 無依賴關係，可同時開始。

---

## 驗證 & 合併策略

### Git 分支策略
```
main
└── develop
    ├── feature/phase1-database-schema (Workflow A)
    ├── feature/phase1-ui-components (Workflow B)
    └── feature/phase1-external-services (Workflow C)
```

### 完成標準
- ✅ 通過 `bun x ultracite check`
- ✅ 通過 `bun run check-types`
- ✅ 建立 Pull Request 到 `develop`
- ✅ Code Review 通過
- ✅ 所有驗證標準達成

### 合併順序建議
1. **先合併 Workflow A**（Database Schema）- 其他 Workflow 需要類型定義
2. **再合併 Workflow C**（External Services）- API 需要服務層
3. **最後合併 Workflow B**（UI Components）- 可獨立開發

---

## 聯絡方式

如果遇到問題或需要協調：
- **技術問題**: 參考 `.doc/v3-parallel-development-strategy.md`
- **V2 遷移問題**: 查看 V2 專案 https://github.com/keweikao/sales-ai-automation-V2
- **架構問題**: 與 Tech Lead 討論

---

**祝開發順利！** 🚀
