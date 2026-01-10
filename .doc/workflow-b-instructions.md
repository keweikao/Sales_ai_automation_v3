# Workflow B: UI Components - 執行指令

## 快速開始

請執行以下指令給 Claude Code Agent (Frontend Developer)：

```
請完成 Phase 1B: UI Components 任務。

參考：
- GitHub Issue: https://github.com/keweikao/sales_ai_automation_v3/issues/2
- 詳細指令：/tmp/workflow-b-issue.md
- 開發策略：.doc/v3-parallel-development-strategy.md (Workflow B 章節)

任務概述：
建立 13 個 React 元件，使用 shadcn/ui + Recharts + TanStack Table

元件清單：
1. Lead 相關（4 個）：
   - lead-table.tsx
   - lead-card.tsx
   - lead-form.tsx
   - lead-status-badge.tsx

2. Conversation 相關（3 個）：
   - conversation-list.tsx
   - conversation-player.tsx
   - transcript-viewer.tsx

3. MEDDIC 相關（3 個）：
   - meddic-radar-chart.tsx
   - meddic-score-card.tsx
   - meddic-dimension-detail.tsx

4. 通用元件（3 個）：
   - data-table.tsx
   - file-upload.tsx
   - audio-recorder.tsx

重要事項：
✅ 使用 mock data 開發，不需要 API 整合
✅ 所有元件支援 TypeScript 嚴格模式
✅ 響應式設計（手機/平板/桌面）
✅ 遵循 Ultracite 程式碼標準
✅ 完成後執行 `bun x ultracite fix` 和 `bun run check-types`
```

---

## 詳細步驟（供參考）

### 1. 安裝依賴
```bash
cd apps/web
bun add recharts @tanstack/react-table
```

### 2. 建立目錄結構
```bash
mkdir -p src/components/{lead,conversation,meddic,common}
mkdir -p src/lib
```

### 3. 建立 Mock Data
先建立 `src/lib/mock-data.ts`：

```typescript
export const mockLeads = [
  {
    id: '1',
    companyName: 'ABC Restaurant',
    contactName: 'John Doe',
    contactEmail: 'john@abc.com',
    status: 'qualified',
    leadScore: 85,
    meddicScore: {
      overall: 82,
      dimensions: {
        metrics: 4,
        economicBuyer: 5,
        decisionCriteria: 4,
        decisionProcess: 3,
        identifyPain: 5,
        champion: 4,
      },
    },
  },
  // ... more mock data
];
```

### 4. 實作元件（按順序）

#### 優先順序 1: MEDDIC 雷達圖（視覺化核心）
```bash
# 建立 apps/web/src/components/meddic/meddic-radar-chart.tsx
```

範例程式碼在 /tmp/workflow-b-issue.md

#### 優先順序 2: Lead Table（資料展示）
```bash
# 建立 apps/web/src/components/lead/lead-table.tsx
```

#### 優先順序 3: 其他元件
依序完成剩餘 11 個元件

### 5. 驗證
```bash
bun run check-types
bun x ultracite check
```

### 6. 提交
```bash
git add apps/web/src/components/ apps/web/src/lib/mock-data.ts
git commit -m "feat(phase-1b): complete 13 UI components

Closes #2"
git push
```

---

## 參考資源

- **shadcn/ui 文件**: https://ui.shadcn.com/
- **TanStack Table**: https://tanstack.com/table
- **Recharts**: https://recharts.org/
- **完整指令**: /tmp/workflow-b-issue.md
- **開發策略**: .doc/v3-parallel-development-strategy.md

---

**預估時間**: 3-4 工作日
**前置依賴**: 無（可使用 mock data 獨立開發）
**狀態**: 🔴 待開始

---

## 給 Claude Code 的完整指令（複製使用）

```
請閱讀以下檔案並完成 Phase 1B: UI Components 任務：
1. /tmp/workflow-b-issue.md（詳細指令）
2. .doc/v3-parallel-development-strategy.md（Workflow B 章節）

建立 13 個 React 元件，使用 shadcn/ui + Recharts + TanStack Table。
所有元件使用 mock data，不需要 API 整合。

完成後：
- 執行 bun x ultracite fix
- 執行 bun run check-types
- 建立 commit 並 push
- 更新 GitHub Issue #2 狀態

參考 MEDDIC 雷達圖範例和 Lead Table 範例在 /tmp/workflow-b-issue.md。
```
