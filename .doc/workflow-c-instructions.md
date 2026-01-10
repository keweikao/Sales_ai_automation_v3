# Workflow C: External Services + V2 Migration - 執行指令

## 🔴 重要：這是 V2 遷移的關鍵任務！

## 快速開始

請執行以下指令給 Claude Code Agent (Integration Developer)：

```
請完成 Phase 1C: External Services + V2 Prompts Migration 任務。

⚠️ 這是 V2 遷移的核心任務，包含：
- 從 V2 遷移 7 個 MEDDIC prompts（逐字複製）
- 實作 Multi-Agent Orchestrator（從 V2 移植，保留七階段流程）
- 實作 Groq Whisper 轉錄服務（從 V2 移植）
- 整合 Gemini 2.0 Flash
- 整合 Cloudflare R2

參考：
- GitHub Issue: https://github.com/keweikao/sales_ai_automation_v3/issues/3
- 詳細指令：/tmp/workflow-c-issue.md
- V2 專案：https://github.com/keweikao/sales-ai-automation-V2
- 開發策略：.doc/v3-parallel-development-strategy.md (Workflow C 章節)

關鍵要求：
✅ 7 個 MEDDIC Prompts 必須逐字複製（生產環境驗證過）
✅ Multi-Agent Orchestrator 七階段流程完整保留
✅ 品質迴圈（Quality Loop）邏輯不可更改（最多 2 次 refine）
✅ Groq Whisper 自動分塊邏輯從 V2 移植（>24MB）
```

---

## 詳細步驟

### 1. 建立 packages/services 套件

```bash
cd packages
mkdir services && cd services
npm init -y

# 更新 package.json name
# "name": "@Sales_ai_automation_v3/services"
```

### 2. 安裝依賴

```bash
bun add @google/generative-ai groq-sdk @aws-sdk/client-s3
```

### 3. 建立目錄結構

```bash
mkdir -p src/{llm,transcription,storage}
mkdir -p prompts/meddic
```

最終結構：
```
packages/services/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── llm/
│   │   ├── gemini.ts
│   │   ├── orchestrator.ts   # ⭐ 從 V2 移植
│   │   ├── types.ts
│   │   └── prompts.ts
│   ├── transcription/
│   │   ├── groq-whisper.ts   # ⭐ 從 V2 移植
│   │   └── types.ts
│   └── storage/
│       ├── r2.ts
│       └── types.ts
└── prompts/
    └── meddic/               # ⭐ 從 V2 遷移（7 個檔案）
        ├── global-context.md
        ├── agent1-context.md
        ├── agent2-buyer.md
        ├── agent3-seller.md
        ├── agent4-summary.md
        ├── agent5-crm-extractor.md
        └── agent6-coach.md
```

### 4. ⭐ 從 V2 遷移 MEDDIC Prompts（最高優先級）

```bash
# Clone V2 專案或下載 prompts
git clone https://github.com/keweikao/sales-ai-automation-V2.git /tmp/v2

# 複製 7 個 prompt 檔案（逐字複製，不可修改）
cp /tmp/v2/modules/03-sales-conversation/meddic/agents/prompts/global-context.md prompts/meddic/
cp /tmp/v2/modules/03-sales-conversation/meddic/agents/prompts/agent1-context.md prompts/meddic/
cp /tmp/v2/modules/03-sales-conversation/meddic/agents/prompts/agent2-buyer.md prompts/meddic/
cp /tmp/v2/modules/03-sales-conversation/meddic/agents/prompts/agent3-seller.md prompts/meddic/
cp /tmp/v2/modules/03-sales-conversation/meddic/agents/prompts/agent4-summary.md prompts/meddic/
cp /tmp/v2/modules/03-sales-conversation/meddic/agents/prompts/agent6.md prompts/meddic/agent5-crm-extractor.md
cp /tmp/v2/modules/03-sales-conversation/meddic/agents/prompts/agent_coach.md prompts/meddic/agent6-coach.md

# 驗證所有檔案都存在
ls -la prompts/meddic/
```

### 5. 實作 Prompts Loader

建立 `src/llm/prompts.ts`（程式碼在 /tmp/workflow-c-issue.md）

### 6. 實作 Groq Whisper 轉錄服務（從 V2 移植）

建立 `src/transcription/groq-whisper.ts`

⭐ **關鍵邏輯從 V2 移植**：
- V2 原始碼：`infrastructure/services/transcription/providers/whisper.py`
- 自動分塊：>24MB 或 >10 分鐘
- 228x 實時速度
- 中文語言優化

範例程式碼在 /tmp/workflow-c-issue.md

### 7. 實作 Multi-Agent Orchestrator（從 V2 移植）

建立 `src/llm/orchestrator.ts`

⭐ **核心邏輯從 V2 移植**：
- V2 原始碼：`modules/03-sales-conversation/transcript_analyzer/orchestrator.py`
- Phase 1: 並行執行 Context + Buyer
- Phase 2: 品質迴圈（最多 2 次 refine）
- Phase 3: 條件式競爭對手偵測
- Phase 4-7: 序列執行 Seller → Summary → CRM → Coach

範例程式碼在 /tmp/workflow-c-issue.md

**品質檢查函式（不可修改）**：
```typescript
private isQualityPassed(buyerData: any): boolean {
  return (
    buyerData.needs_identified &&
    buyerData.pain_points?.length > 0 &&
    buyerData.meddic_scores &&
    buyerData.trust_assessment
  );
}
```

### 8. 實作 Gemini LLM 服務

建立 `src/llm/gemini.ts`

### 9. 實作 Cloudflare R2 儲存服務

建立 `src/storage/r2.ts`

### 10. 環境變數設定

在 `apps/server/.env` 加入：
```env
GEMINI_API_KEY=
GROQ_API_KEY=
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_ENDPOINT=
```

### 11. 驗證

```bash
# 測試 Gemini API
# 測試 Groq Whisper 轉錄
# 測試 R2 上傳/下載
# 測試 Prompts 載入
# 測試 Orchestrator 七階段流程
```

### 12. 提交

```bash
git add packages/services/
git commit -m "feat(phase-1c): complete external services and V2 migration

Closes #3"
git push
```

---

## ⚠️ V2 遷移檢查清單

### Prompts（必須逐字複製）
- [ ] global-context.md（iCHEF 業務框架）
- [ ] agent1-context.md（會議背景分析）
- [ ] agent2-buyer.md（MEDDIC 核心分析）⭐ 最重要
- [ ] agent3-seller.md（銷售策略評估）
- [ ] agent4-summary.md（客戶導向摘要）
- [ ] agent5-crm-extractor.md（CRM 欄位提取）
- [ ] agent6-coach.md（即時教練系統）

### Orchestrator（七階段流程）
- [ ] Phase 1: 並行執行 Context + Buyer
- [ ] Phase 2: 品質迴圈（最多 2 次 refine）
- [ ] Phase 3: 條件式競爭對手偵測
- [ ] Phase 4: Seller Agent 執行
- [ ] Phase 5: Summary Agent 執行
- [ ] Phase 6: CRM Extractor 執行
- [ ] Phase 7: Coach Agent 執行
- [ ] isQualityPassed() 函式保留

### Groq Whisper
- [ ] 自動分塊邏輯（>24MB）
- [ ] 228x 實時速度設定
- [ ] 中文語言優化（language: 'zh'）
- [ ] verbose_json response format
- [ ] temperature: 0.0

---

## 參考資源

- **V2 專案**: https://github.com/keweikao/sales-ai-automation-V2
- **V2 Prompts 路徑**: `modules/03-sales-conversation/meddic/agents/prompts/`
- **V2 Orchestrator**: `modules/03-sales-conversation/transcript_analyzer/orchestrator.py`
- **V2 Groq Whisper**: `infrastructure/services/transcription/providers/whisper.py`
- **Groq API Docs**: https://console.groq.com/docs/
- **Gemini API Docs**: https://ai.google.dev/gemini-api/docs
- **完整指令**: /tmp/workflow-c-issue.md
- **開發策略**: .doc/v3-parallel-development-strategy.md

---

**預估時間**: 3-4 工作日
**前置依賴**: 無
**狀態**: 🔴 待開始
**優先級**: ⭐⭐⭐ 最高（V2 核心邏輯遷移）

---

## 給 Claude Code 的完整指令（複製使用）

```
請閱讀以下檔案並完成 Phase 1C: External Services + V2 Prompts Migration 任務：
1. /tmp/workflow-c-issue.md（詳細指令）
2. .doc/v3-parallel-development-strategy.md（Workflow C 章節）
3. V2 專案：https://github.com/keweikao/sales-ai-automation-V2

⚠️ 這是 V2 遷移的關鍵任務！

優先順序：
1. 從 V2 遷移 7 個 MEDDIC prompts（逐字複製）
2. 實作 Multi-Agent Orchestrator（從 V2 移植，保留七階段流程）
3. 實作 Groq Whisper 轉錄服務（從 V2 移植）
4. 整合 Gemini 2.0 Flash
5. 整合 Cloudflare R2

關鍵要求：
- Prompts 必須逐字複製（生產環境驗證過）
- Orchestrator 七階段流程完整保留
- 品質迴圈邏輯不可更改（最多 2 次 refine）
- Groq Whisper 自動分塊邏輯從 V2 移植

完成後：
- 執行所有驗證測試
- 建立 commit 並 push
- 更新 GitHub Issue #3 狀態

參考 V2 原始碼：
- Prompts: modules/03-sales-conversation/meddic/agents/prompts/
- Orchestrator: modules/03-sales-conversation/transcript_analyzer/orchestrator.py
- Groq Whisper: infrastructure/services/transcription/providers/whisper.py
```
