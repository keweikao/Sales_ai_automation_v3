# Cloudflare KV 快取系統實作計畫

**建立日期**: 2026-01-20
**專案**: Sales AI Automation v3
**目標**: 透過 Cloudflare KV 快取預處理資料，解決 ORPC 參數序列化問題並提升前端載入速度

---

## 📋 目錄

1. [問題現況](#問題現況)
2. [解決方案概述](#解決方案概述)
3. [預期效果](#預期效果)
4. [前端資料需求分析](#前端資料需求分析)
5. [技術架構設計](#技術架構設計)
6. [實作階段規劃](#實作階段規劃)
7. [詳細實作步驟](#詳細實作步驟)
8. [驗收標準](#驗收標準)
9. [風險評估與應對](#風險評估與應對)

---

## 問題現況

### 當前問題

1. **ORPC 參數序列化 Bug**
   - 所有使用 `orpc.xxx.queryOptions()` 的頁面都出現 "Input validation failed" 錯誤
   - 需要逐一修改 8+ 個頁面的 API 呼叫方式
   - 手動修復容易出錯，維護成本高

2. **效能問題**
   - Dashboard 載入時間: 2-3 秒
   - Conversations 列表: 1-2 秒
   - Opportunities 列表: 1-2 秒
   - Reports 頁面: 3-4 秒
   - 每次頁面載入都需要查詢資料庫（複雜的 JOIN 操作）

3. **資料庫負載**
   - Neon 資料庫距離 Cloudflare Workers 有網路延遲
   - 複雜查詢（JOIN 3-4 張表）執行時間長
   - 100% 的請求都直接查資料庫

### 影響範圍

- **前端頁面**: 8 個主要頁面
  - `/dashboard` - Dashboard 首頁
  - `/` - 分析儀表板
  - `/conversations` - 對話列表
  - `/conversations/:id` - 對話詳情
  - `/opportunities` - 商機列表
  - `/opportunities/:id` - 商機詳情
  - `/reports` - 個人績效報告
  - `/reports` - 團隊績效報告

- **API 端點**: 6 個主要 API
  - `conversations.list`
  - `conversations.get`
  - `opportunities.list`
  - `opportunities.get`
  - `analytics.dashboard`
  - `analytics.repPerformance`
  - `analytics.teamPerformance`

---

## 解決方案概述

### 核心策略

**使用 Cloudflare KV 作為快取層，預處理並快取前端所需的資料結構**

```
┌─────────────┐
│   前端頁面   │
└──────┬──────┘
       │ 1. API 請求
       ▼
┌─────────────┐
│  API Server │ ──────┐
│  (Workers)  │       │ 2. 檢查快取
└──────┬──────┘       ▼
       │         ┌──────────────┐
       │         │ KV Namespace │ ◄─────────┐
       │         │   (快取層)    │           │
       │         └──────┬───────┘           │
       │ 4. 返回快取    │                   │
       │    (99% 情況)  │ 3. 快取未命中     │ 6. 更新快取
       ▼                ▼                   │
   前端渲染        ┌──────────────┐    ┌────────────┐
                   │   Neon DB    │    │   Queue    │
                   │  (主資料庫)   │    │   Worker   │
                   └──────────────┘    └────────────┘
                          ▲                   ▲
                          │ 5. 查詢資料庫      │
                          └───────────────────┘
                               (僅快取未命中時)
```

### 為什麼能一勞永逸？

1. **避開 ORPC Bug**
   - 90% 的請求直接從 KV 讀取預處理資料
   - 不經過 ORPC 的 `queryOptions()` 序列化邏輯
   - 即使 ORPC 有問題，也只影響第一次載入（快取未命中）

2. **資料由後端主動推送**
   - Queue Worker 處理完成後，直接寫入快取
   - 前端只是「讀取」已經準備好的 JSON
   - 不需要前端傳遞複雜參數

3. **未來擴展性**
   - 新增頁面不需要擔心 ORPC 問題
   - 快取邏輯集中管理，易於維護

### KV 快取層三層架構設計 (Single Source of Truth)

基於「資料庫是唯一真相來源」的原則,KV 快取層採用三層設計:

```
Layer 1: 單筆詳細資料快取 (Detail Cache)
├── conversation:{id}:detail → ConversationDetail (24h TTL)
└── opportunity:{id}:detail → OpportunityDetail (24h TTL)

Layer 2: 列表快取 (List Cache)
├── user:{userId}:conversations:list → ConversationListItem[] (1h TTL)
└── user:{userId}:opportunities:list → OpportunityListItem[] (1h TTL)

Layer 3: 聚合資料快取 (Aggregated Cache)
├── user:{userId}:analytics:dashboard → DashboardData (5min TTL)
└── user:{userId}:analytics:performance → PerformanceData (1h TTL)
```

**快取更新策略** (應對並發寫入風險):
1. **Layer 1**: 直接寫入,無並發問題 (每個 conversation 有獨立的 key)
2. **Layer 2 & 3**: 失效後重建 (Invalidation-First),避免並發衝突
3. 所有快取都可安全刪除並從資料庫重建

**為什麼採用這個設計?**
- ✅ **避免並發寫入問題**: 刪除操作是冪等的,多個 Worker 同時刪除同一個 key 不會造成資料遺失
- ✅ **資料庫是真相來源**: KV 只是效能優化層,可以安全地失效和重建
- ✅ **簡單可靠**: 不需要複雜的鎖機制或版本控制
- ✅ **彈性高**: 不同層級可設定不同的 TTL 和更新策略

---

## 預期效果

### 效能提升

| 頁面 | 現況 | 目標 | 提升幅度 |
|------|------|------|---------|
| Dashboard 首頁 | 2-3 秒 | < 300ms | **10倍** |
| Conversations 列表 | 1-2 秒 | < 200ms | **7倍** |
| Opportunities 列表 | 1-2 秒 | < 200ms | **7倍** |
| Reports 頁面 | 3-4 秒 | < 500ms | **8倍** |
| Analytics Dashboard | 2-3 秒 | < 300ms | **9倍** |

### 資源節省

| 指標 | 現況 | 目標 | 節省 |
|------|------|------|------|
| 資料庫查詢次數 | 100% | < 10% | **90%** |
| CPU 使用時間 | 100% | < 20% | **80%** |
| 網路延遲 | 50-100ms | < 5ms | **95%** |

### 穩定性提升

- ✅ 不再出現 "Input validation failed" 錯誤
- ✅ 即使 Neon 暫時不可用，KV 仍可提供快取資料
- ✅ 減少 ORPC bug 的影響範圍

---

## 前端資料需求分析

### 1. Dashboard 首頁 (`/dashboard`)

**API**: `client.conversations.list({ limit: 20, offset: 0 })`

**資料結構**:
```typescript
interface ConversationListItem {
  id: string;
  caseNumber: string;
  title: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  opportunityCompanyName: string;
  meddicScore: number | null;
  createdAt: string; // ISO 8601
}
```

**快取策略**:
- **KV Key**: `user:{userId}:conversations:list`
- **TTL**: 1 小時 (3600 秒)
- **更新時機**: Queue Worker 完成處理後
- **快取大小**: ~20 KB (20 筆記錄)

---

### 2. 分析儀表板 (`/`)

**API**: `client.analytics.dashboard({})`

**資料結構**:
```typescript
interface DashboardAnalytics {
  summary: {
    totalOpportunities: number;
    totalConversations: number;
    totalAnalyses: number;
    averageScore: number;
  };
  statusDistribution: Array<{
    status: "Strong" | "Medium" | "Weak" | "At Risk";
    count: number;
  }>;
  recentAnalyses: Array<{
    id: string;
    opportunityCompanyName: string;
    customerNumber: string;
    overallScore: number;
    status: string;
    createdAt: string;
  }>;
}
```

**快取策略**:
- **KV Key**: `user:{userId}:analytics:dashboard`
- **TTL**: 5 分鐘 (300 秒)
- **更新時機**:
  - 新增 conversation 時
  - 完成 MEDDIC 分析時
  - 每日凌晨 2:00 (Cron)
- **快取大小**: ~10 KB

---

### 3. Conversations 列表 (`/conversations`)

**API**: `client.conversations.list({ limit: pageSize, offset: page * pageSize })`

**資料結構**: 同 Dashboard

**快取策略**:
- **KV Key**: `user:{userId}:conversations:list` (全部資料)
- **前端分頁**: 在 client-side 切分資料
- **TTL**: 1 小時
- **更新時機**: 同 Dashboard

**優化**: 避免為每個 page 建立獨立快取，減少 KV 使用量

---

### 4. Conversation 詳情 (`/conversations/:id`)

**API**: `client.conversations.get({ conversationId: id })`

**資料結構**:
```typescript
interface ConversationDetail {
  id: string;
  caseNumber: string;
  status: string;
  opportunityCompanyName: string;
  transcript: {
    fullText: string;
    segments: Array<{
      speaker: string;
      text: string;
      startTime: number;
    }>;
  };
  meddicAnalysis: {
    overallScore: number;
    dimensions: Record<string, MEDDICDimension>;
    keyFindings: string[];
    nextSteps: Array<{ action: string; priority: string }>;
  };
  audioUrl: string;
  duration: number;
  createdAt: string;
}
```

**快取策略**:
- **KV Key**: `conversation:{conversationId}:detail`
- **TTL**: 24 小時 (86400 秒)
- **更新時機**: MEDDIC 分析完成後
- **快取大小**: ~50-100 KB (含完整轉錄)

---

### 5. Opportunities 列表 (`/opportunities`)

**API**: `client.opportunities.list({ search, status, limit, offset })`

**資料結構**:
```typescript
interface OpportunityListItem {
  id: string;
  customerNumber: string;
  companyName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string;
  meddicScore: number | null; // 最新分析分數
  conversationCount: number;
  createdAt: string;
  updatedAt: string;
}
```

**快取策略**:
- **KV Key**: `user:{userId}:opportunities:list:all`
- **前端篩選**: search, status 篩選在 client-side 進行
- **TTL**: 10 分鐘
- **更新時機**:
  - 新增 opportunity 時
  - 更新 opportunity 狀態時
  - 完成新的 MEDDIC 分析時

---

### 6. Opportunity 詳情 (`/opportunities/:id`)

**API**: `client.opportunities.get({ opportunityId: id })`

**資料結構**:
```typescript
interface OpportunityDetail {
  id: string;
  customerNumber: string;
  companyName: string;
  contactInfo: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  status: string;
  conversations: Array<{
    id: string;
    caseNumber: string;
    status: string;
    meddicScore: number | null;
    createdAt: string;
  }>;
  latestAnalysis: {
    overallScore: number;
    status: string;
  } | null;
}
```

**快取策略**:
- **KV Key**: `opportunity:{opportunityId}:detail`
- **TTL**: 30 分鐘
- **更新時機**: 完成新的 conversation 分析時

---

### 7. 個人績效報告 (`/reports` - Personal Tab)

**API**: `client.analytics.repPerformance({})`

**資料結構**: (複雜，包含 MEDDIC 六維度、進步追蹤、教練建議)

**快取策略**:
- **KV Key**: `user:{userId}:analytics:repPerformance`
- **TTL**: 1 小時
- **更新時機**:
  - 完成新的 MEDDIC 分析時
  - 每日凌晨 2:00 (Cron 重新計算)

---

### 8. 團隊績效報告 (`/reports` - Team Tab)

**API**: `client.analytics.teamPerformance({})`

**快取策略**:
- **KV Key**: `manager:{managerId}:analytics:teamPerformance`
- **TTL**: 1 小時
- **更新時機**: 每日凌晨 2:00 (Cron)

---

## 技術架構設計

### 1. KV Namespace 設計

**Namespace 結構**:
```
CACHE_KV
├── user:{userId}:conversations:list
├── user:{userId}:opportunities:list:all
├── user:{userId}:analytics:dashboard
├── user:{userId}:analytics:repPerformance
├── conversation:{conversationId}:detail
├── opportunity:{opportunityId}:detail
└── manager:{managerId}:analytics:teamPerformance
```

**命名規則**:
- 格式: `{entity}:{id}:{resource}:{variant}`
- 範例: `user:abc123:conversations:list`

---

### 2. Cache Service 模組

**位置**: `packages/services/src/cache/index.ts`

```typescript
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deleteMultiple(keys: string[]): Promise<void>;  // 新增批次刪除
  invalidateUser(userId: string): Promise<void>;
}

export class KVCacheService implements CacheService {
  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.kv.get(key, "json");
      if (value) {
        console.log(`[Cache Hit] ${key}`);
      } else {
        console.log(`[Cache Miss] ${key}`);
      }
      return value as T | null;
    } catch (error) {
      console.error(`[Cache Error] Failed to get ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl = 3600): Promise<void> {
    try {
      await this.kv.put(key, JSON.stringify(value), { expirationTtl: ttl });
      console.log(`[Cache Set] ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error(`[Cache Error] Failed to set ${key}:`, error);
      // 不拋出錯誤，快取失敗不應中斷主流程
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
      console.log(`[Cache Delete] ${key}`);
    } catch (error) {
      console.error(`[Cache Error] Failed to delete ${key}:`, error);
    }
  }

  async deleteMultiple(keys: string[]): Promise<void> {
    try {
      await Promise.all(keys.map((k) => this.kv.delete(k)));
      console.log(`[Cache Delete Multiple] ${keys.length} keys deleted`);
    } catch (error) {
      console.error(`[Cache Error] Failed to delete multiple keys:`, error);
    }
  }

  async invalidateUser(userId: string): Promise<void> {
    const keys = [
      `user:${userId}:conversations:list`,
      `user:${userId}:opportunities:list`,
      `user:${userId}:analytics:dashboard`,
      `user:${userId}:analytics:repPerformance`,
    ];
    await this.deleteMultiple(keys);
    console.log(`[Cache Invalidate] Cleared all caches for user ${userId}`);
  }
}
```

---

### 3. 快取輔助函數 (基於 Invalidation-First 策略)

**位置**: `packages/services/src/cache/helpers.ts`

```typescript
import type { KVCacheService, ConversationListItem, ConversationDetail } from "./types";

/**
 * 更新單筆 Conversation 詳細資料快取 (Layer 1)
 * 直接寫入,無並發問題
 */
export async function updateConversationDetailCache(
  cache: KVCacheService,
  conversationId: string,
  detail: ConversationDetail
): Promise<void> {
  const cacheKey = `conversation:${conversationId}:detail`;
  await cache.set(cacheKey, detail, 86400); // 24 小時
  console.log(`[Cache] Updated conversation detail: ${conversationId}`);
}

/**
 * 失效用戶的 Conversations 列表快取 (Layer 2)
 * 採用 Invalidation-First 策略,避免並發寫入問題
 *
 * 策略說明:
 * - 不直接更新列表快取,而是刪除快取
 * - 下次 API 請求時會重新從資料庫查詢並建立快取
 * - 避免多個 Queue Worker 同時寫入造成資料覆蓋
 */
export async function invalidateConversationsListCache(
  cache: KVCacheService,
  userId: string
): Promise<void> {
  const keys = [
    `user:${userId}:conversations:list`,
    `user:${userId}:analytics:dashboard`,
  ];
  await cache.deleteMultiple(keys);
  console.log(`[Cache] Invalidated conversations list cache for user: ${userId}`);
}

/**
 * 組合函數: 更新單筆 + 失效列表
 * Queue Worker 應該使用這個函數
 */
export async function updateConversationCache(
  cache: KVCacheService,
  userId: string,
  conversationId: string,
  detail: ConversationDetail,
  listItem: ConversationListItem
): Promise<void> {
  // 1. 更新單筆詳細資料 (Layer 1)
  await updateConversationDetailCache(cache, conversationId, detail);

  // 2. 失效列表快取 (Layer 2)
  await invalidateConversationsListCache(cache, userId);

  console.log(`[Cache] Updated cache for conversation: ${conversationId}`);
}

/**
 * (可選) 預熱列表快取
 * 在失效後立即重建快取,提升下次請求速度
 */
export async function warmUpConversationsListCache(
  cache: KVCacheService,
  userId: string,
  db: any // DrizzleDB type
): Promise<void> {
  try {
    // 從資料庫查詢最新的 conversations 列表
    const conversations = await db
      .select({
        id: conversations.id,
        caseNumber: conversations.caseNumber,
        title: conversations.title,
        status: conversations.status,
        opportunityCompanyName: opportunities.companyName,
        meddicScore: meddicAnalyses.overallScore,
        createdAt: conversations.createdAt,
      })
      .from(conversations)
      .innerJoin(opportunities, eq(conversations.opportunityId, opportunities.id))
      .leftJoin(meddicAnalyses, eq(meddicAnalyses.conversationId, conversations.id))
      .where(eq(opportunities.userId, userId))
      .orderBy(desc(conversations.conversationDate))
      .limit(100);

    const cacheData: ConversationListItem[] = conversations.map((c) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      title: c.title,
      status: c.status,
      opportunityCompanyName: c.opportunityCompanyName,
      meddicScore: c.meddicScore,
      createdAt: c.createdAt.toISOString(),
    }));

    await cache.set(`user:${userId}:conversations:list`, cacheData, 3600);
    console.log(`[Cache] Warmed up conversations list cache for user: ${userId}`);
  } catch (error) {
    console.warn(`[Cache] Failed to warm up cache, will rebuild on next request:`, error);
    // 預熱失敗不影響主流程
  }
}
```

**重要變更**:
- ❌ 移除 `updateConversationsCache()` (舊的增量更新,有並發問題)
- ✅ 新增 `updateConversationDetailCache()` (Layer 1 直接寫入)
- ✅ 新增 `invalidateConversationsListCache()` (Layer 2 失效策略)
- ✅ 新增 `updateConversationCache()` (組合函數,Queue Worker 使用)
- ✅ 新增 `warmUpConversationsListCache()` (可選的預熱機制)

---

## 實作階段規劃

### 階段 1: 核心快取功能 (優先級 P0)

**時間**: 2 小時
**目標**: 完成 Dashboard 和 Conversations 列表快取

#### 任務清單

1. **設定 Cloudflare KV Namespace** (10 分鐘)
   - [ ] 建立生產環境 KV namespace
   - [ ] 建立開發環境 KV namespace
   - [ ] 更新 `wrangler.toml` 設定
   - [ ] 更新 TypeScript 型別定義

2. **建立 Cache Service 模組** (30 分鐘)
   - [ ] 建立 `packages/services/src/cache/index.ts`
   - [ ] 實作 `KVCacheService` 類別
   - [ ] 建立 `packages/services/src/cache/helpers.ts`
   - [ ] 實作 `updateConversationsCache()`
   - [ ] 實作 `updateDashboardCache()`
   - [ ] 撰寫單元測試

3. **修改 Conversations API** (30 分鐘)
   - [ ] 更新 `packages/api/src/routers/conversation.ts`
   - [ ] 在 `listConversations` 加入快取讀取邏輯
   - [ ] 快取未命中時查詢資料庫並寫入快取
   - [ ] 加入錯誤處理（KV 不可用時降級）

4. **修改 Queue Worker** (45 分鐘)
   - [ ] 更新 `apps/queue-worker/src/index.ts`
   - [ ] 在 Step 6 (發送通知) 後新增 Step 7 (更新快取)
   - [ ] 實作快取更新邏輯
   - [ ] 測試快取寫入

5. **前端 TanStack Query 優化** (15 分鐘)
   - [ ] 更新 `apps/web/src/utils/orpc.ts`
   - [ ] 設定 `staleTime: 5 * 60 * 1000`
   - [ ] 設定 `gcTime: 10 * 60 * 1000`
   - [ ] 關閉 `refetchOnWindowFocus`

---

### 階段 2: 擴展其他頁面快取 (優先級 P1)

**時間**: 2 小時
**目標**: 完成 Opportunities 和 Analytics Dashboard 快取

#### 任務清單

1. **Opportunities 列表快取** (30 分鐘)
   - [ ] 實作 `updateOpportunitiesCache()` helper
   - [ ] 更新 `opportunities.list` API
   - [ ] Queue Worker 更新 opportunity 快取

2. **Analytics Dashboard 快取** (30 分鐘)
   - [ ] 實作統計資料計算函數
   - [ ] 更新 `analytics.dashboard` API
   - [ ] 設定 5 分鐘 TTL

3. **Conversation 詳情快取** (30 分鐘)
   - [ ] 實作 `updateConversationDetailCache()`
   - [ ] 更新 `conversations.get` API
   - [ ] 快取完整轉錄和分析結果

4. **Opportunity 詳情快取** (30 分鐘)
   - [ ] 實作 `updateOpportunityDetailCache()`
   - [ ] 更新 `opportunities.get` API

---

### 階段 3: Reports 和進階功能 (優先級 P2)

**時間**: 2 小時
**目標**: 完成績效報告快取和 Cron 自動更新

#### 任務清單

1. **個人績效報告快取** (45 分鐘)
   - [ ] 實作 `analytics.repPerformance` 快取
   - [ ] 設定 1 小時 TTL

2. **團隊績效報告快取** (45 分鐘)
   - [ ] 實作 `analytics.teamPerformance` 快取
   - [ ] 支援 Manager 權限檢查

3. **Cron 自動更新** (30 分鐘)
   - [ ] 在 `apps/server/src/index.ts` 的 `scheduled()` 加入快取更新
   - [ ] 每日凌晨 2:00 更新所有用戶的 analytics 快取

---

### 階段 4: 測試與優化 (優先級 P0)

**時間**: 1.5 小時

#### 任務清單

1. **功能測試** (30 分鐘)
   - [ ] 測試 Dashboard 載入速度
   - [ ] 測試 Conversations 列表
   - [ ] 測試快取更新時機
   - [ ] 測試權限控制（用戶只能看自己的資料）

2. **效能測試** (30 分鐘)
   - [ ] 測量快取命中率
   - [ ] 測量頁面載入時間
   - [ ] 測量資料庫查詢次數

3. **錯誤處理測試** (30 分鐘)
   - [ ] 測試 KV 不可用時的降級行為
   - [ ] 測試快取過期後的重新載入
   - [ ] 測試快取更新失敗的處理

---

## 詳細實作步驟

### Step 1: 設定 Cloudflare KV Namespace

#### 1.1 建立 KV Namespace

```bash
# 切換到 server 目錄
cd apps/server

# 建立生產環境 KV
bun wrangler kv:namespace create "CACHE_KV"
# 輸出: ⛅️ wrangler 3.x.x
#       🌀  Creating namespace with title "sales-ai-server-CACHE_KV"
#       ✨  Success! Add the following to your wrangler.toml configuration file:
#       [[kv_namespaces]]
#       binding = "CACHE_KV"
#       id = "abc123def456..." # 記下這個 ID

# 建立開發環境 KV
bun wrangler kv:namespace create "CACHE_KV" --preview
# 記下 preview_id
```

#### 1.2 更新 `apps/server/wrangler.toml`

```toml
# ... 現有設定 ...

# ============================================================
# KV Namespaces - 快取層
# ============================================================
[[kv_namespaces]]
binding = "CACHE_KV"
id = "YOUR_PRODUCTION_KV_ID"  # 替換成實際的 ID

# 開發環境
[env.dev]
name = "sales-ai-server-dev"

[[env.dev.kv_namespaces]]
binding = "CACHE_KV"
id = "YOUR_DEV_KV_ID"
preview_id = "YOUR_PREVIEW_KV_ID"

[env.dev.vars]
# ... 現有設定 ...
```

#### 1.3 更新 TypeScript 型別定義

**檔案**: `apps/server/src/types.ts`

```typescript
export interface Env {
  // ... 現有環境變數 ...

  // KV Namespaces
  CACHE_KV: KVNamespace;

  // ... 其他設定 ...
}
```

---

### Step 2: 建立 Cache Service 模組

#### 2.1 建立核心 Cache Service

**檔案**: `packages/services/src/cache/index.ts`

```typescript
/**
 * 快取服務介面
 */
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidateUser(userId: string): Promise<void>;
}

/**
 * Cloudflare KV 快取服務實作
 */
export class KVCacheService implements CacheService {
  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.kv.get(key, "json");
      if (value) {
        console.log(`[Cache Hit] ${key}`);
      } else {
        console.log(`[Cache Miss] ${key}`);
      }
      return value as T | null;
    } catch (error) {
      console.error(`[Cache Error] Failed to get ${key}:`, error);
      return null; // 快取錯誤不應中斷主流程
    }
  }

  async set<T>(key: string, value: T, ttl = 3600): Promise<void> {
    try {
      await this.kv.put(key, JSON.stringify(value), { expirationTtl: ttl });
      console.log(`[Cache Set] ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error(`[Cache Error] Failed to set ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
      console.log(`[Cache Delete] ${key}`);
    } catch (error) {
      console.error(`[Cache Error] Failed to delete ${key}:`, error);
    }
  }

  async invalidateUser(userId: string): Promise<void> {
    const keys = [
      `user:${userId}:conversations:list`,
      `user:${userId}:opportunities:list:all`,
      `user:${userId}:analytics:dashboard`,
      `user:${userId}:analytics:repPerformance`,
    ];
    await Promise.all(keys.map((k) => this.delete(k)));
    console.log(`[Cache Invalidate] Cleared cache for user ${userId}`);
  }
}
```

#### 2.2 建立快取輔助函數

**檔案**: `packages/services/src/cache/helpers.ts`

```typescript
import type { KVCacheService } from "./index";

export interface ConversationListItem {
  id: string;
  caseNumber: string;
  title: string | null;
  status: string;
  opportunityCompanyName: string;
  meddicScore: number | null;
  createdAt: string;
}

/**
 * 更新用戶的 conversations 列表快取
 * 使用增量更新策略，避免每次都重新查詢資料庫
 */
export async function updateConversationsCache(
  cache: KVCacheService,
  userId: string,
  newConversation: ConversationListItem
): Promise<void> {
  const cacheKey = `user:${userId}:conversations:list`;

  // 讀取現有快取
  const existing = (await cache.get<ConversationListItem[]>(cacheKey)) || [];

  // 檢查是否已存在（更新情況）
  const index = existing.findIndex((c) => c.id === newConversation.id);
  if (index >= 0) {
    // 更新現有項目
    existing[index] = newConversation;
  } else {
    // 新增到最前面
    existing.unshift(newConversation);
  }

  // 限制數量（只保留最新 100 筆）
  const updated = existing.slice(0, 100);

  // 寫回快取（1 小時）
  await cache.set(cacheKey, updated, 3600);
}
```

#### 2.3 更新 package.json

**檔案**: `packages/services/package.json`

```json
{
  "name": "@Sales_ai_automation_v3/services",
  "exports": {
    ".": "./src/index.ts",
    "./cache": "./src/cache/index.ts",
    "./cache/helpers": "./src/cache/helpers.ts"
  }
}
```

---

### Step 3: 修改 Conversations API

**檔案**: `packages/api/src/routers/conversation.ts`

```typescript
import { KVCacheService } from "@Sales_ai_automation_v3/services/cache";
import type { ConversationListItem } from "@Sales_ai_automation_v3/services/cache/helpers";

export const listConversations = protectedProcedure
  .input(listConversationsSchema)
  .handler(async ({ input, context }) => {
    const { opportunityId, limit, offset } = input;
    const userId = context.session?.user.id;
    const userEmail = context.session?.user.email;

    if (!userId) {
      throw new ORPCError("UNAUTHORIZED");
    }

    // 初始化快取服務
    const cacheService = new KVCacheService(context.env.CACHE_KV);
    const cacheKey = `user:${userId}:conversations:list`;

    // 1. 嘗試從快取讀取
    try {
      const cached = await cacheService.get<ConversationListItem[]>(cacheKey);

      if (cached) {
        console.log("[Cache Hit] Returning cached conversations");

        // 應用篩選和分頁
        let filtered = cached;
        if (opportunityId) {
          // 注意: 快取中沒有 opportunityId，需要重新查詢
          // 或者我們可以在快取中包含這個欄位
          console.log("[Cache] opportunityId filter requires DB query");
        } else {
          return {
            items: filtered.slice(offset, offset + limit),
            total: filtered.length,
            limit,
            offset,
          };
        }
      }
    } catch (error) {
      console.warn("[Cache] Failed to read from cache, falling back to DB:", error);
    }

    // 2. 快取未命中或錯誤，從資料庫查詢
    console.log("[Cache Miss] Querying database");

    // 檢查用戶角色
    const userRole = getUserRole(userEmail);
    const hasAdminAccess = userRole === "admin" || userRole === "manager";

    const conditions = [];
    if (!hasAdminAccess) {
      conditions.push(eq(opportunities.userId, userId));
    }
    if (opportunityId) {
      conditions.push(eq(conversations.opportunityId, opportunityId));
    }

    const results = await db
      .select({
        id: conversations.id,
        caseNumber: conversations.caseNumber,
        title: conversations.title,
        status: conversations.status,
        opportunityId: conversations.opportunityId,
        opportunityCompanyName: opportunities.companyName,
        conversationDate: conversations.conversationDate,
        duration: conversations.duration,
        audioFileUrl: conversations.audioFileUrl,
        meddicScore: meddicAnalyses.overallScore,
        meddicStatus: meddicAnalyses.status,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .innerJoin(opportunities, eq(conversations.opportunityId, opportunities.id))
      .leftJoin(
        meddicAnalyses,
        eq(meddicAnalyses.conversationId, conversations.id)
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(conversations.conversationDate))
      .limit(limit)
      .offset(offset);

    // 3. 寫入快取（如果沒有 opportunityId 篩選）
    if (!opportunityId && results.length > 0) {
      try {
        const cacheData: ConversationListItem[] = results.map((r) => ({
          id: r.id,
          caseNumber: r.caseNumber,
          title: r.title,
          status: r.status,
          opportunityCompanyName: r.opportunityCompanyName,
          meddicScore: r.meddicScore,
          createdAt: r.createdAt.toISOString(),
        }));

        await cacheService.set(cacheKey, cacheData, 3600);
      } catch (error) {
        console.warn("[Cache] Failed to write to cache:", error);
      }
    }

    return {
      items: results,
      total: results.length,
      limit,
      offset,
    };
  });
```

---

### Step 4: 修改 Queue Worker

**檔案**: `apps/queue-worker/src/index.ts`

在 Step 6 (發送完成通知) 之後，新增 Step 7 (更新快取):

```typescript
// ... 現有程式碼 ...

// Step 6: 發送完成通知
await slackService.notifyProcessingCompleted({
  userId: slackUser.id,
  conversationId,
  caseNumber,
  analysisResult: {
    overallScore,
    qualificationStatus,
    dimensions: convertedDimensions,
    keyFindings,
    nextSteps,
    risks,
    alerts,
  },
  processingTimeMs,
  threadTs,
});

console.log(`[Queue] ✅ Processing completed for conversation ${conversationId}`);

// ============================================================
// Step 7: 更新用戶快取
// ============================================================
try {
  console.log(`[Queue] 📦 Updating cache for user ${opportunity?.userId}`);

  const { KVCacheService } = await import("@Sales_ai_automation_v3/services/cache");
  const { updateConversationsCache } = await import(
    "@Sales_ai_automation_v3/services/cache/helpers"
  );

  const cacheService = new KVCacheService(env.CACHE_KV);

  // 準備快取資料
  const conversationCacheItem = {
    id: conversationId,
    caseNumber,
    title: summary?.substring(0, 100) || null,
    status: "completed" as const,
    opportunityCompanyName: opportunity?.companyName || "",
    meddicScore: overallScore,
    createdAt: new Date().toISOString(),
  };

  // 更新 conversations list 快取
  if (opportunity?.userId) {
    await updateConversationsCache(
      cacheService,
      opportunity.userId,
      conversationCacheItem
    );
    console.log(`[Queue] ✅ Cache updated for user ${opportunity.userId}`);
  }

  // TODO: 未來可以在這裡更新其他快取
  // - updateDashboardCache()
  // - updateRepPerformanceCache()

} catch (error) {
  console.error("[Queue] ❌ Failed to update cache:", error);
  // 快取更新失敗不應中斷主流程
}

// ============================================================
// End of Queue Processing
// ============================================================
```

---

### Step 5: 前端 TanStack Query 優化

**檔案**: `apps/web/src/utils/orpc.ts`

```typescript
import type { AppRouterClient } from "@Sales_ai_automation_v3/api/routers/index";
import { env } from "@Sales_ai_automation_v3/env/web";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 分鐘內資料視為新鮮，不重新查詢
      gcTime: 10 * 60 * 1000,          // 10 分鐘後才清除快取
      refetchOnWindowFocus: false,     // 不在視窗切換時自動重新查詢
      refetchOnReconnect: false,       // 不在重新連線時自動查詢
      retry: 1,                        // 錯誤時只重試 1 次
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      toast.error(`Error: ${error.message}`, {
        action: {
          label: "retry",
          onClick: () => query.fetch(),
        },
      });
    },
  }),
});

export const link = new RPCLink({
  url: `${env.VITE_SERVER_URL}/rpc`,
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    });
  },
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
```

---

## 驗收標準

### 功能驗收

#### 1. 快取讀取功能
- [ ] Dashboard 頁面載入時，從 KV 讀取快取資料
- [ ] Console 顯示 `[Cache Hit]` 日誌
- [ ] 快取資料正確顯示在前端

#### 2. 快取更新功能
- [ ] Queue Worker 完成處理後，成功寫入快取
- [ ] Console 顯示 `[Cache Set]` 日誌
- [ ] 新資料在下次載入時正確顯示

#### 3. 快取失效功能
- [ ] 快取過期後自動重新查詢資料庫
- [ ] `invalidateUser()` 成功清除用戶所有快取

#### 4. 權限控制
- [ ] 一般用戶只能看到自己的 conversations
- [ ] Manager 可以看到團隊成員的資料
- [ ] Admin 可以看到所有資料

---

### 效能驗收

#### 1. 頁面載入時間

使用 Chrome DevTools Performance 測量:

| 頁面 | 目標 | 測量方式 |
|------|------|---------|
| Dashboard | < 500ms | Time to Interactive (TTI) |
| Conversations 列表 | < 300ms | TTI |
| Analytics Dashboard | < 500ms | TTI |

**測量步驟**:
1. 開啟 Chrome DevTools → Performance
2. 點擊 Record
3. 重新整理頁面
4. 停止 Record
5. 查看 TTI 時間

#### 2. 快取命中率

**計算公式**:
```
快取命中率 = (快取命中次數 / 總請求次數) × 100%
```

**目標**: > 90%

**測量方式**:
1. 在 API Router 加入計數器
2. 記錄 `[Cache Hit]` 和 `[Cache Miss]` 次數
3. 計算命中率

#### 3. 資料庫查詢次數

**測量方式**:
```typescript
// 在 API Router 加入計數
let dbQueryCount = 0;

// 每次查詢資料庫時
dbQueryCount++;
console.log(`[DB Query] Total queries: ${dbQueryCount}`);
```

**目標**: 相較於現況減少 > 80%

---

### 錯誤處理驗收

#### 1. KV 不可用時的降級行為
- [ ] 當 KV 讀取失敗時，自動從資料庫查詢
- [ ] 不拋出錯誤給前端
- [ ] Console 顯示警告訊息

**測試方法**:
```typescript
// 暫時模擬 KV 錯誤
const cacheService = {
  get: async () => { throw new Error("KV unavailable"); }
};
```

#### 2. 快取過期後的重新載入
- [ ] 快取過期後，下次請求正確查詢資料庫
- [ ] 重新寫入快取

**測試方法**:
1. 設定短 TTL (10 秒)
2. 等待 TTL 過期
3. 重新載入頁面
4. 確認重新查詢資料庫

#### 3. 快取更新失敗的處理
- [ ] Queue Worker 快取更新失敗時，不中斷主流程
- [ ] 仍然發送 Slack 通知
- [ ] 記錄錯誤日誌

---

## 風險評估與應對

### 風險 1: 快取一致性問題 ✅ 已解決

**問題**: 資料庫更新後,快取未同步更新,使用者看到舊資料

**採用策略**: **策略 1 - 寫入時立即更新快取**

**實作方式**:
```typescript
// Queue Worker Step 7
await db.update(conversations).set({ status: 'completed' }); // 更新資料庫
await updateConversationCache(cache, userId, conversationId, data); // 立即更新快取
```

**三層防護**:
1. **主動更新**: Queue Worker 完成處理後立即更新快取
2. **帶重試機制**: 快取更新失敗時會重試 (最多 3 次)
3. **TTL 兜底**: 即使更新失敗,1 小時後快取過期會自動從資料庫重建

**優點**:
- ✅ 使用者立即看到最新資料
- ✅ 快取命中率高 (不需等 TTL 過期)
- ✅ KV 正確扮演中介層角色

**影響評估**: 中 → **已解決**

---

### 風險 2: 多用戶並發寫入 ✅ 已解決

**問題**: 多個 Queue Worker 同時更新同一用戶的快取,造成資料覆蓋或遺失

**採用策略**: **基於 Single Source of Truth 的三層架構**

**Layer 1: 單筆詳細資料** (無並發問題)
```typescript
// 每個 conversation 有獨立的 key,不會衝突
await cache.set(`conversation:${id}:detail`, data, 86400);
```

**Layer 2 & 3: 列表和聚合資料** (Invalidation-First)
```typescript
// 不直接更新,而是刪除快取
await cache.delete(`user:${userId}:conversations:list`);
await cache.delete(`user:${userId}:analytics:dashboard`);

// 下次 API 請求時從資料庫重建
```

**為什麼這樣設計?**

| 傳統方式 (有問題) | 新設計 (無問題) |
|-----------------|----------------|
| 讀取完整列表 | 只刪除快取 |
| 合併新資料 | - |
| 寫回列表 | - |
| ❌ 並發時會覆蓋 | ✅ 刪除操作是冪等的 |

**實際範例**:

```
情境: 兩個 Queue Worker 同時完成處理

Worker 1: 完成 ConversationX
  ├─ 寫入 conversation:X:detail ✓
  └─ 刪除 user:123:conversations:list ✓

Worker 2: 完成 ConversationY (100ms 後)
  ├─ 寫入 conversation:Y:detail ✓
  └─ 刪除 user:123:conversations:list ✓ (重複刪除,無副作用)

結果:
  - conversation:X:detail 存在 ✓
  - conversation:Y:detail 存在 ✓
  - user:123:conversations:list 被刪除 ✓
  - 下次請求時從 DB 重建,包含 X 和 Y ✓
```

**優點**:
- ✅ 完全避免並發寫入問題
- ✅ 刪除操作是冪等的 (多次刪除等於一次刪除)
- ✅ 資料庫永遠是正確的
- ✅ 實作簡單可靠

**缺點與應對**:
- ⚠️ 下次請求會稍慢 (Cache Miss) → 可選用預熱機制
- ⚠️ 需要多次 KV 讀取 (列表 + 詳細資料) → KV 讀取很快且可並行

**影響評估**: 低 → **已解決**

---

### 風險 3: KV Namespace 配額限制

**風險**: Cloudflare KV 免費方案限制 (Reads: 100,000/day, Writes: 1,000/day)

**目前設計的用量估算**:

假設每天:
- 50 個使用者
- 每人上傳 5 個 conversations
- 每人查看 Dashboard 20 次

**寫入次數**:
- Layer 1 寫入: 50 × 5 = 250 次 (conversation details)
- Layer 2 失效: 50 × 5 = 250 次 (delete operations)
- Layer 3 失效: 50 × 5 = 250 次 (analytics)
- **總計**: ~750 次/天 ✅ (< 1,000 限制)

**讀取次數**:
- Dashboard 查詢: 50 × 20 = 1,000 次
- Cache Miss 重建: 50 × 5 = 250 次
- **總計**: ~1,250 次/天 ✅ (< 100,000 限制)

**應對策略**:
1. 使用 Invalidation-First 減少寫入次數
2. 監控 KV 用量 (Cloudflare Dashboard)
3. 設定合理的 TTL
4. 如果超過配額,可升級到付費方案 (Workers Paid: $5/月)

**影響評估**: 低

---

### 風險 4: 快取資料過大

**風險描述**:
- 單個快取項目超過 KV 限制 (25 MB)
- 儲存空間不足

**影響評估**: 低

**應對策略**:
1. **限制快取數量**:
   - Conversations 列表只保留最新 100 筆

2. **分離大型資料**:
   - 轉錄內容 (transcript) 單獨快取 (Layer 1)
   - 列表資料和詳情資料分開 (Layer 1 vs Layer 2)

3. **壓縮資料**:
   - 移除不必要的欄位
   - 使用緊湊的 JSON 格式

---

## 部署檢查清單

### 開發環境部署

- [ ] 建立開發環境 KV Namespace
- [ ] 更新 `wrangler.toml` (dev 環境)
- [ ] 測試快取讀寫功能
- [ ] 測試快取失效機制
- [ ] 確認錯誤處理正常

### 生產環境部署

- [ ] 建立生產環境 KV Namespace
- [ ] 更新 `wrangler.toml` (production 環境)
- [ ] 部署 API Server
- [ ] 部署 Queue Worker
- [ ] 部署前端應用
- [ ] 監控 KV 用量
- [ ] 監控快取命中率
- [ ] 確認效能提升

---

## 後續優化方向

### 短期優化 (1-2 週內)

1. **加入更多頁面快取**
   - Opportunities 詳情
   - Reports 個人報告
   - Reports 團隊報告

2. **優化快取策略**
   - 根據實際用量調整 TTL
   - 優化快取 key 設計

3. **監控與告警**
   - 建立 KV 用量監控
   - 設定快取命中率告警

### 中期優化 (1-2 月內)

1. **智慧預熱**
   - 用戶登入時預先載入常用資料
   - 預測用戶下一步操作

2. **快取分層**
   - 熱資料使用 KV (邊緣快取)
   - 冷資料使用 D1 (區域快取)

3. **即時更新**
   - 使用 WebSocket 推送快取更新
   - 減少用戶主動重新整理

### 長期優化 (3-6 月內)

1. **全局快取**
   - 跨用戶的共享資料快取
   - 減少重複計算

2. **智慧失效**
   - 基於資料變更頻率調整 TTL
   - 預測性快取更新

3. **離線支援**
   - Service Worker + IndexedDB
   - 完整的離線體驗

---

## 參考資源

### Cloudflare 文件
- [KV Namespace 文件](https://developers.cloudflare.com/kv/)
- [Workers 限制說明](https://developers.cloudflare.com/workers/platform/limits/)
- [KV 定價說明](https://developers.cloudflare.com/kv/pricing/)

### 最佳實踐
- [快取策略設計](https://web.dev/articles/cache-api-quick-guide)
- [TTL 設定建議](https://www.cloudflare.com/learning/cdn/glossary/time-to-live-ttl/)
- [快取一致性處理](https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html)

---

## 附錄

### A. 快取 Key 命名規範

| 類型 | 格式 | 範例 | TTL |
|------|------|------|-----|
| 用戶 Conversations 列表 | `user:{userId}:conversations:list` | `user:abc123:conversations:list` | 1h |
| 用戶 Opportunities 列表 | `user:{userId}:opportunities:list:all` | `user:abc123:opportunities:list:all` | 10m |
| 用戶 Analytics Dashboard | `user:{userId}:analytics:dashboard` | `user:abc123:analytics:dashboard` | 5m |
| 用戶績效報告 | `user:{userId}:analytics:repPerformance` | `user:abc123:analytics:repPerformance` | 1h |
| Conversation 詳情 | `conversation:{conversationId}:detail` | `conversation:xyz789:detail` | 24h |
| Opportunity 詳情 | `opportunity:{opportunityId}:detail` | `opportunity:xyz789:detail` | 30m |
| 團隊績效報告 | `manager:{managerId}:analytics:teamPerformance` | `manager:abc123:analytics:teamPerformance` | 1h |

### B. 錯誤代碼對照表

| 錯誤代碼 | 說明 | 處理方式 |
|---------|------|---------|
| `KV_READ_ERROR` | 讀取快取失敗 | 降級到資料庫查詢 |
| `KV_WRITE_ERROR` | 寫入快取失敗 | 記錄錯誤，不中斷主流程 |
| `KV_DELETE_ERROR` | 刪除快取失敗 | 記錄錯誤，允許 TTL 自然過期 |
| `CACHE_QUOTA_EXCEEDED` | 超過配額限制 | 暫停快取寫入，保留讀取 |

### C. 監控指標

| 指標名稱 | 計算方式 | 目標值 |
|---------|---------|--------|
| 快取命中率 | (Cache Hits / Total Requests) × 100% | > 90% |
| 平均回應時間 | Σ Response Time / Request Count | < 200ms |
| P95 回應時間 | 95th percentile | < 500ms |
| KV 讀取次數 | Daily KV Reads | < 50,000 |
| KV 寫入次數 | Daily KV Writes | < 500 |
| 資料庫查詢次數 | Daily DB Queries | < 1,000 |

---

**文件版本**: 1.0
**最後更新**: 2026-01-20
**維護者**: Claude & Stephen
