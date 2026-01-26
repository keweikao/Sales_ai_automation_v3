# MCP Server 實作計劃 - Sales AI Analytics

> 建立日期：2026-01-26
> 目的：提供資料分析團隊透過 Claude 查詢銷售系統資料的 MCP Server

---

## 1. 目標

建立一個遠端 MCP Server，讓資料分析團隊可以透過 Claude 查詢銷售系統的所有資料（唯讀）。

### 需求規格
- **資料範圍**：全部資料表（21 個）
- **部署方式**：遠端 HTTP/SSE 服務（Cloudflare Workers）
- **操作權限**：唯讀查詢

---

## 2. 專案結構

```
apps/mcp-server/
├── package.json
├── wrangler.toml
├── tsconfig.json
└── src/
    ├── index.ts                 # Hono + MCP SSE 入口
    ├── mcp/
    │   ├── server.ts            # MCP Server 設定
    │   ├── tools/
    │   │   ├── index.ts
    │   │   ├── query-table.ts   # 通用資料表查詢
    │   │   ├── search.ts        # 全域搜尋
    │   │   ├── analytics.ts     # 分析統計
    │   │   └── schema-info.ts   # Schema 資訊
    │   └── resources/
    │       └── schema.ts        # Schema 資源
    ├── auth/
    │   └── api-key.ts           # API Key 認證
    └── guards/
        └── query-guard.ts       # 查詢安全檢查
```

---

## 3. 技術棧

| 項目 | 技術 |
|------|------|
| MCP SDK | `@modelcontextprotocol/sdk` |
| Web 框架 | Hono |
| 資料庫 | 複用 `@Sales_ai_automation_v3/db`（Drizzle + Neon） |
| 驗證 | Zod |
| 部署 | Cloudflare Workers |
| 快取 | Cloudflare KV |

---

## 4. MCP Tools 設計

### 4.1 Tools 總覽

| Tool | 功能 | 使用場景 |
|------|------|----------|
| `query_table` | 查詢任意資料表 | 支援篩選、排序、分頁 |
| `search_data` | 跨表關鍵字搜尋 | 搜尋商機、對話、話術等 |
| `get_analytics` | 取得統計分析 | MEDDIC 趨勢、轉換漏斗、業績報表 |
| `get_opportunity_detail` | 商機完整資訊 | 含對話、分析、跟進事項 |
| `get_schema_info` | 資料表結構說明 | 欄位、類型、關聯關係 |

### 4.2 query_table 參數

```typescript
{
  table: enum[21 個資料表],
  filters: [{
    field: string,
    operator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between',
    value: any
  }],
  select: string[],           // 選擇欄位
  orderBy: { field, direction },
  limit: 1-100,               // 預設 20
  offset: 0-10000
}
```

### 4.3 get_analytics 類型

- `dashboard_summary` - 總覽儀表板
- `meddic_dimension_stats` - MEDDIC 六維度統計
- `conversion_funnel` - 轉換漏斗
- `trend_analysis` - 趨勢分析
- `rep_comparison` - 業務人員比較
- `source_attribution` - 來源歸因

---

## 5. 安全機制

### 5.1 認證

- **API Key 格式**：`mcp_<role>_<random>`
- **角色**：`analyst`（分析師）、`manager`（經理）、`admin`（管理員）
- **驗證方式**：Bearer token in Authorization header

### 5.2 查詢限制

```typescript
const QueryGuard = {
  // 允許的資料表（排除敏感認證表）
  ALLOWED_TABLES: [
    'opportunities', 'conversations', 'meddic_analyses',
    'follow_ups', 'sales_todos', 'alerts',
    'lead_sources', 'utm_campaigns', 'form_submissions',
    'sms_logs', 'share_tokens', 'talk_tracks',
    'team_members', 'competitor_info', 'rep_skills'
  ],

  // 排除敏感欄位
  EXCLUDED_FIELDS: {
    account: ['accessToken', 'refreshToken', 'password'],
    session: ['token'],
    lead_sources: ['webhookSecret']
  },

  // 查詢限制
  LIMITS: {
    maxLimit: 100,
    maxOffset: 10000,
    maxFilters: 10
  }
};
```

### 5.3 速率限制

| 角色 | 每分鐘請求 | 每小時請求 |
|------|-----------|-----------|
| analyst | 30 | 500 |
| manager | 60 | 1000 |
| admin | 100 | 2000 |

### 5.4 審計日誌

```typescript
interface AuditLog {
  timestamp: string;
  apiKeyHash: string;
  tool: string;
  input: object;
  responseSize: number;
  latencyMs: number;
  status: 'success' | 'error';
}
```

---

## 6. 部署配置

### 6.1 wrangler.toml

```toml
name = "sales-ai-mcp-server"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"
ALLOWED_ORIGINS = "https://claude.ai"

[[kv_namespaces]]
binding = "MCP_KV"
id = "<需要建立>"

[observability]
enabled = true
```

### 6.2 環境變數（Secrets）

| 變數 | 用途 |
|------|------|
| `DATABASE_URL` | Neon PostgreSQL 連線字串 |
| `MCP_API_KEYS` | 有效 API Keys（JSON 陣列） |

---

## 7. 實作步驟

### Phase 1: 基礎架構
- [ ] 建立 `apps/mcp-server` 目錄
- [ ] 設定 package.json（複用 db、env packages）
- [ ] 設定 wrangler.toml（KV、secrets）
- [ ] 實作 Hono + MCP SDK SSE 整合

### Phase 2: 核心 Tools
- [ ] 實作 `query_table` 通用查詢
- [ ] 實作 `search_data` 搜尋
- [ ] 實作 `get_schema_info` Schema 資訊
- [ ] 建立 QueryGuard 安全檢查

### Phase 3: 分析 Tools
- [ ] 實作 `get_analytics` 統計分析
- [ ] 實作 `get_opportunity_detail` 商機詳情

### Phase 4: 安全與部署
- [ ] 實作 API Key 認證
- [ ] 實作速率限制（使用 KV）
- [ ] 建立 Cloudflare KV namespace
- [ ] 部署到 Cloudflare Workers

---

## 8. 使用方式

### 8.1 Claude Desktop 配置

在 `~/.claude/mcp.json` 中加入：

```json
{
  "mcpServers": {
    "sales-ai-analytics": {
      "url": "https://sales-ai-mcp-server.workers.dev/mcp",
      "transport": "sse",
      "headers": {
        "Authorization": "Bearer mcp_analyst_<your_api_key>"
      }
    }
  }
}
```

### 8.2 範例查詢

**分析師常用：**
- 「查詢本月 MEDDIC 分數最低的 10 個商機」
- 「搜尋所有提到競品 'XX POS' 的對話」
- 「取得過去 30 天的轉換漏斗分析」

**經理常用：**
- 「取得團隊本週表現排名」
- 「哪些商機需要經理關注？」
- 「比較各業務在『經濟買家』維度的表現」

---

## 9. 驗證方式

1. **本地開發測試**：`bun run --filter mcp-server dev`
2. **MCP Inspector 測試**：驗證 Tools 回應格式
3. **Claude Desktop 連線測試**：實際查詢驗證
4. **安全測試**：驗證認證、速率限制、敏感欄位過濾

---

## 10. 關鍵檔案參考

| 檔案 | 用途 |
|------|------|
| `packages/db/src/schema/index.ts` | 資料表 schema 定義 |
| `packages/db/src/index.ts` | 資料庫連線配置 |
| `apps/server/wrangler.toml` | Cloudflare Workers 配置參考 |
| `packages/api/src/routers/analytics.ts` | 分析 API 邏輯參考 |
