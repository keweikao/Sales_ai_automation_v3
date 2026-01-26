# 2026-01-26 系統修復與 PDCM 分析框架更新報告

## 概述

本日主要完成 Slack 用戶自動映射功能、PDCM 分析框架更新、以及多項系統優化與修復。

---

## 一、已提交的修復 (Commit: 9b1f61c)

### 1. Google OAuth 登入重導向修復

**問題**：Google OAuth 登入後重導向失敗
**修復**：使用完整 URL 而非相對路徑

**修改檔案**：
- `apps/web/src/components/sign-in-form.tsx`
- `apps/web/src/components/sign-up-form.tsx`

### 2. 報告頁面用戶選擇器優化

**問題**：用戶選擇器顯示 UUID，不易辨識
**修復**：改為顯示中文名稱

**修改檔案**：
- `apps/web/src/lib/consultant-names.ts` (新增)
- `apps/web/src/routes/reports/index.tsx`

### 3. Slack 用戶自動映射功能

**功能說明**：Slack 上傳音檔時，自動歸屬到對應業務帳號

**實作細節**：
- 支援 Slack ID 和 Email 雙重查詢機制
- 自動更新 `user_profiles.slack_user_id` 欄位
- 查詢順序：先查 slack_user_id → 再查 email

**修改檔案**：
- `packages/api/src/routers/conversation.ts` (+104 行)

**使用流程**：
1. 業務在 Slack 上傳音檔
2. 系統取得上傳者的 Slack ID 和 Email
3. 查詢資料庫匹配業務帳號
4. 自動將對話歸屬給該業務

### 4. 經理權限控制

**問題**：經理可以看到所有產品線的商機
**修復**：經理只能查看自己負責產品線的商機

**修改檔案**：
- `packages/api/src/routers/opportunity.ts` (+26 行)

### 5. 新增 Slack 映射初始化腳本

**用途**：批量初始化現有用戶的 Slack ID 映射

**檔案**：
- `scripts/init-slack-mappings.ts` (新增)

**使用方式**：
```bash
bun run scripts/init-slack-mappings.ts
```

---

## 二、待提交的變更

### 1. Queue Worker Observability 啟用

**目的**：啟用 Cloudflare Workers 日誌追蹤功能

**修改檔案**：
- `apps/queue-worker/wrangler.toml`

**新增配置**：
```toml
[observability]
enabled = true
```

### 2. 重試失敗對話 API

**功能說明**：新增 API endpoint 允許管理者重試失敗的對話處理

**修改檔案**：
- `packages/api/src/routers/conversation.ts`

**API 規格**：
```typescript
// POST /api/conversation.retry
{
  conversationId?: string;  // 對話 ID
  caseNumber?: string;      // 案件編號（二擇一）
}
```

**權限控制**：
- 只有 admin 和 manager 角色可以使用
- Service Account 可直接重試（用於自動化腳本）

**處理流程**：
1. 驗證權限
2. 查詢對話記錄
3. 檢查狀態（只能重試 failed 或 pending）
4. 重置狀態為 pending
5. 推送到處理佇列

### 3. PDCM 分析框架更新

**重大更新**：將原有分析框架升級為 PDCM (Pain, Decision, Champion, Metrics) 格式

#### 3.1 類型定義更新

**修改檔案**：
- `packages/services/src/llm/types.ts`

**新 Agent2Output 結構**：
```typescript
interface Agent2Output {
  pdcm_scores: {
    pain: {
      score: number;
      level: "P1_Critical" | "P2_High" | "P3_Medium" | "P4_Low";
      main_pain: string;
      urgency: "立即" | "近期" | "未來";
      quantified_loss?: string;
      evidence: string[];
    };
    decision: {
      score: number;
      contact_role: "老闆" | "店長" | "員工";
      has_authority: boolean;
      budget_awareness: "有概念" | "不清楚" | "不提";
      timeline: "急著要" | "近期" | "未定";
      risk: "低" | "中" | "高";
    };
    champion: {
      score: number;
      attitude: "主動積極" | "中立觀望" | "冷淡推託";
      customer_type: "衝動型" | "精算型" | "保守觀望型";
      primary_criteria: "價格" | "功能" | "易用性" | "服務";
      switch_concerns?: string;
      evidence: string[];
    };
    metrics: {
      score: number;
      level: "M1_Complete" | "M2_Partial" | "M3_Weak" | "M4_Missing";
      quantified_items?: Array<{
        category: string;
        description: string;
        monthly_value: number;
      }>;
      total_monthly_impact: number;
      annual_impact: number;
      roi_message?: string;
    };
    total_score: number;
    deal_probability: "高" | "中" | "低";
  };

  pcm_state: { /* 簡化狀態摘要 */ };
  not_closed_reason: {
    type: "痛點不痛" | "決策者不在" | "價格疑慮" | "轉換顧慮" | "比價中" | "Metrics缺失" | "其他";
    detail: string;
    breakthrough_suggestion: string;
  };
  missed_opportunities: string[];
  current_system: "無" | "其他品牌" | "舊用戶";
}
```

#### 3.2 Orchestrator 邏輯更新

**修改檔案**：
- `packages/services/src/llm/orchestrator.ts`

**主要變更**：

1. **品質檢查邏輯** (`isQualityPassed`)
   - 必須有 PDCM 分數
   - 必須有未成交原因分析
   - Champion 分析必須完整

2. **分數計算邏輯** (`calculateOverallScoreFromBuyerData`)
   - PDCM 權重：Pain (35%), Decision (25%), Champion (25%), Metrics (15%)
   - 優先使用 PDCM 計算的 total_score
   - 根據未成交原因和客戶類型調整

3. **維度映射** (`buildResult`)
   - 將 PDCM scores 映射到 MEDDIC dimensions
   - 更精確的 evidence 和 gaps 提取
   - 根據實際資料生成 recommendations

4. **風險識別** (`extractRisksV3`)
   - 新增「Metrics 不足」風險類型
   - 從 PDCM decision.risk 識別決策風險
   - 從 champion.switch_concerns 提取轉換顧慮

### 4. iCHEF 產品配置更新

**修改檔案**：
- `packages/shared/src/product-configs/ichef.ts`

**新增店家類型**：
- 小吃店 🍜
- 攤車 🛒

**更新競品名稱**：
- DUDU → Dudoo
- EZTABLE → 365
- Inline → 大麥

---

## 三、影響範圍

### 前端
- 登入/註冊頁面
- 報告頁面用戶選擇器

### 後端 API
- conversation router（新增 retry endpoint）
- opportunity router（權限控制）

### 分析引擎
- Agent2 輸出格式
- Orchestrator 分數計算邏輯
- 風險識別邏輯

### 資料庫
- user_profiles.slack_user_id 欄位使用

---

## 四、測試建議

### Slack 用戶映射測試
1. 在 Slack 上傳音檔
2. 確認對話正確歸屬到上傳者的業務帳號
3. 確認 slack_user_id 已更新到 user_profiles

### 重試功能測試
```bash
# 使用腳本測試
bun run scripts/retry-conversation.ts --case-number 202601-IC001
```

### PDCM 分析測試
1. 處理一通新的對話
2. 確認 PDCM scores 正確計算
3. 確認 MEDDIC dimensions 正確映射
4. 確認風險識別正確

---

## 五、待辦事項

- [ ] 提交待提交的變更
- [ ] 部署更新到生產環境
- [ ] 監控 Observability 日誌
- [ ] 驗證 PDCM 分析結果品質

---

## 六、相關文件

- [20260121_分享頁面內容優化報告.md](.doc/20260121_分享頁面內容優化報告.md)
- [20260119_所有MEDDIC_Agents類型定義全面修復報告.md](.doc/20260119_所有MEDDIC_Agents類型定義全面修復報告.md)
