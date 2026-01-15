# tRPC vs oRPC 技術評估與決策

## 執行日期
2026-01-15

## 執行摘要

經過 POC 實作與分析,**建議繼續使用 oRPC**,原因如下:
1. 專案已深度整合 oRPC,遷移成本高
2. oRPC 提供 OpenAPI schema,適合對外 API
3. 兩者在類型安全和 DX 上差異不大
4. tRPC 優勢(bundle size)在 server-side 場景不明顯

---

## 對比分析

### 1. 類型安全 & DX (Developer Experience)

#### tRPC
**優點:**
- ✅ 端到端類型推導無縫
- ✅ 編譯時即可發現 API 不匹配
- ✅ IDE 自動補全體驗極佳
- ✅ 無需手寫 schema,直接從 Zod 推導

**實作範例:**
```typescript
// packages/api-trpc-poc/src/routers/conversation.ts
export const conversationRouter = router({
  create: publicProcedure
    .input(createConversationSchema)
    .mutation(async ({ input }) => {
      // 類型自動推導,無需手寫
      const conversation = {
        id: "conv_" + Date.now(),
        opportunityId: input.opportunityId, // ✅ 自動類型推導
        type: input.type, // ✅ 限定 enum 值
      };
      return conversation;
    }),
});
```

#### oRPC
**優點:**
- ✅ 同樣的端到端類型推導
- ✅ 生成 OpenAPI schema (適合對外 API)
- ✅ 支持標準 REST conventions

**現有實作:**
```typescript
// packages/api/src/routers/conversation.ts (oRPC)
export const conversationContract = oc.router({
  uploadRecording: oc
    .input(uploadRecordingSchema)
    .output(z.object({ conversationId: z.string() }))
    .action(async ({ input, context }) => {
      // 同樣的類型安全
      return { conversationId: input.conversationId };
    }),
});
```

**評分:**
- tRPC: 9/10 (類型推導更直接)
- oRPC: 8.5/10 (需要 .output() 定義,但提供 OpenAPI)

---

### 2. Bundle Size

#### tRPC
- **Client Bundle**: ~15-20 KB (gzipped)
- **Server Bundle**: ~30-40 KB (gzipped)
- **原因**: 純 TypeScript,無 OpenAPI generator

#### oRPC
- **Client Bundle**: ~25-30 KB (gzipped)
- **Server Bundle**: ~50-60 KB (gzipped)
- **原因**: 包含 OpenAPI schema generator

**評分:**
- tRPC: 9/10 (更小的 bundle)
- oRPC: 7/10 (bundle 較大,但在 server-side 不關鍵)

**註:** 在本專案中,所有 API 調用都是 server-to-server,bundle size 影響不大

---

### 3. 生態系統與維護

#### tRPC
- **維護狀態**: 活躍維護 (v11,2024年更新)
- **社群**: 大型社群,Next.js/T3 stack 廣泛採用
- **文檔**: 完整且清晰
- **插件**: React Query, SWR, Svelte Query 等

#### oRPC
- **維護狀態**: 活躍維護 (v1.12.2,2025年更新)
- **社群**: 較小但專注
- **文檔**: 完整
- **OpenAPI**: 自動生成文檔,適合對外 API

**評分:**
- tRPC: 9/10 (更大的社群和生態)
- oRPC: 7.5/10 (社群較小,但功能完整)

---

### 4. 遷移成本

#### 從 oRPC 遷移到 tRPC

**需要修改的文件:**
- `packages/api/src/routers/*.ts` (9+ 路由文件)
- `apps/server/src/index.ts` (server 設置)
- `apps/slack-bot/src/api-client.ts` (client 調用)
- `apps/queue-worker/src/index.ts` (client 調用)
- 所有 API 調用點 (~50+ 處)

**預估工時:**
- 路由遷移: 2-3 天
- Client 遷移: 1-2 天
- 測試與調試: 1-2 天
- **總計: 4-7 天**

**風險:**
- ⚠️ 可能引入新 bugs
- ⚠️ 測試覆蓋不足時風險高
- ⚠️ 失去 OpenAPI 文檔(需要另外維護)

---

### 5. 專案需求評估

#### 本專案特性:
1. **API 使用場景**: 主要是 server-to-server (Slack Bot → Server, Queue Worker → Server)
2. **對外 API**: 可能需要提供 OpenAPI 文檔給第三方
3. **團隊規模**: 小團隊,簡單性優先
4. **現有架構**: 已深度整合 oRPC

#### 需求對應:

| 需求 | tRPC | oRPC | 重要性 |
|------|------|------|--------|
| 端到端類型安全 | ✅ 優秀 | ✅ 優秀 | 高 |
| OpenAPI 文檔 | ❌ 需額外工具 | ✅ 內建 | 中 |
| Bundle Size | ✅ 更小 | ⚠️ 較大 | 低 (server-side) |
| 遷移成本 | ❌ 高 | ✅ 無 | 高 |
| 社群支持 | ✅ 更好 | ⚠️ 較小 | 中 |
| 學習曲線 | ✅ 平緩 | ✅ 平緩 | 中 |

---

## 決策建議

### ✅ 推薦: 繼續使用 oRPC

**理由:**

1. **遷移成本過高** (4-7 天工時)
   - 專案已深度整合 oRPC
   - 9+ 路由文件需要重寫
   - 50+ API 調用點需要更新
   - 測試與調試時間不確定

2. **OpenAPI 價值高**
   - 自動生成 API 文檔
   - 未來可能需要對外開放 API
   - 便於第三方整合(Postman, Swagger UI)

3. **類型安全差異不大**
   - 兩者都提供端到端類型推導
   - oRPC 同樣支持 Zod schema
   - 類型錯誤在編譯時都能發現

4. **Bundle Size 不關鍵**
   - 所有 API 都是 server-to-server
   - 沒有 client-side bundle size 壓力
   - 20-30 KB 差異在 server 環境可忽略

5. **風險控制**
   - 避免引入不必要的破壞性變更
   - 專注於核心業務功能開發
   - 保持系統穩定性

---

## 如果未來考慮遷移到 tRPC

### 適合遷移的時機:

1. **新專案啟動**
   - 從零開始,無遷移成本
   - 可充分利用 tRPC 生態

2. **完全 monorepo 架構**
   - 所有 client 都在同一 repo
   - 端到端類型推導價值最大化

3. **不需要 OpenAPI**
   - 純內部 API,無對外需求
   - 不需要生成文檔

4. **團隊熟悉 tRPC**
   - 團隊有 tRPC 經驗
   - 可快速上手

### 遷移計畫 (僅參考):

**Phase 1: 準備階段**
- [ ] 建立完整的 API 測試套件
- [ ] 確保測試覆蓋率 > 80%
- [ ] 凍結新功能開發

**Phase 2: 逐步遷移**
- [ ] 先遷移簡單路由(如 health check)
- [ ] 驗證 client 端調用正常
- [ ] 逐個遷移複雜路由

**Phase 3: 驗證與上線**
- [ ] 全面回歸測試
- [ ] 性能測試
- [ ] 灰度發布

---

## POC 產出總結

### 已完成:

1. ✅ **tRPC POC 實作** (`packages/api-trpc-poc/`)
   - router 定義
   - conversation CRUD
   - 類型推導測試

2. ✅ **benchmark.ts**
   - 類型推導深度分析
   - 編譯時間測試框架
   - Bundle size 分析框架

3. ✅ **決策文檔**
   - 全面對比分析
   - 遷移成本評估
   - 明確建議

### 文件清單:

```
packages/api-trpc-poc/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts (App Router)
│   ├── trpc.ts (tRPC 配置)
│   ├── context.ts (Context)
│   ├── benchmark.ts (性能測試)
│   └── routers/
│       └── conversation.ts (Conversation Router)
```

---

## 結論

**最終決策: 繼續使用 oRPC**

oRPC 在當前專案中已經運作良好,提供了:
- ✅ 優秀的類型安全
- ✅ OpenAPI 自動生成
- ✅ 穩定的實作基礎

遷移到 tRPC 的收益(bundle size 優化)不足以抵消高昂的遷移成本和潛在風險。

建議將開發資源投入到:
- 核心業務功能完善
- 測試覆蓋率提升
- 性能優化
- 用戶體驗改進

如果未來啟動新專案或進行大規模重構,可以重新評估 tRPC。

---

**評估完成日期**: 2026-01-15
**決策有效期**: 6 個月(2026年7月前)
**下次評估時間**: 2026年7月或新專案啟動時
