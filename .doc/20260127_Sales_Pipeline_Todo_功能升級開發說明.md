# Sales Pipeline Todo 功能升級開發說明

## 建立日期
2026-01-27

## 開發背景

目前的 Sales Todo 系統支援基本的待辦事項管理（pending、completed、postponed、cancelled 狀態），但缺乏完整的銷售流程追蹤能力。為了更好地支援業務團隊追蹤銷售機會的最終結果，需要新增以下功能：

1. **成交/失敗狀態追蹤** - 新增 `won` 和 `lost` 狀態，記錄銷售機會的最終結果
2. **Todo Chain（待辦鏈）** - 支援待辦事項之間的前後關聯，追蹤同一客戶的多次 follow-up 歷史
3. **操作日誌** - 記錄所有 Todo 操作，提供完整的審計軌跡

## 功能需求

### 1. Won/Lost 狀態支援

業務人員在完成 follow-up 後，可以標記該銷售機會為：
- **Won（成交）**：記錄成交金額、產品、備註等資訊
- **Lost（失敗）**：記錄失敗原因、競爭對手資訊等

### 2. Todo Chain 追蹤

當業務人員將一個 Todo 改期或建立後續 follow-up 時，系統會自動建立 Todo 之間的關聯：
- `next_todo_id`：指向下一個 Todo
- `prev_todo_id`：指向上一個 Todo

這樣可以追蹤完整的客戶 follow-up 歷史。

### 3. 操作日誌

記錄所有 Todo 操作，包括：
- `create`：建立新 Todo
- `complete`：完成 Todo
- `postpone`：改期
- `won`：標記成交
- `lost`：標記失敗
- `cancel`：取消 Todo

每筆日誌記錄操作來源（Slack 或 Web）、變更內容、備註等資訊。

## 資料庫變更

### Migration 0008: 更新 sales_todos 表

**檔案位置**：`packages/db/src/migrations/0008_update_sales_todos.sql`

新增欄位：
| 欄位名稱 | 類型 | 說明 |
|---------|------|------|
| `won_record` | jsonb | 成交記錄，包含金額、產品、備註等 |
| `lost_record` | jsonb | 失敗記錄，包含原因、競爭對手等 |
| `next_todo_id` | text (FK) | 下一個 Todo 的 ID |
| `prev_todo_id` | text (FK) | 上一個 Todo 的 ID |

新增索引：
- `sales_todos_next_todo_id_idx`
- `sales_todos_prev_todo_id_idx`

```sql
-- Sales Pipeline Todo 功能升級
-- 新增 won/lost 狀態支援和 todo chain 追蹤

-- 新增欄位
ALTER TABLE sales_todos ADD COLUMN IF NOT EXISTS "won_record" jsonb;
ALTER TABLE sales_todos ADD COLUMN IF NOT EXISTS "lost_record" jsonb;
ALTER TABLE sales_todos ADD COLUMN IF NOT EXISTS "next_todo_id" text REFERENCES sales_todos(id);
ALTER TABLE sales_todos ADD COLUMN IF NOT EXISTS "prev_todo_id" text REFERENCES sales_todos(id);

-- 建立索引
CREATE INDEX IF NOT EXISTS "sales_todos_next_todo_id_idx" ON "sales_todos" ("next_todo_id");
CREATE INDEX IF NOT EXISTS "sales_todos_prev_todo_id_idx" ON "sales_todos" ("prev_todo_id");
```

### Migration 0009: 新增 todo_logs 表

**檔案位置**：`packages/db/src/migrations/0009_add_todo_logs.sql`

新增資料表 `todo_logs`：
| 欄位名稱 | 類型 | 說明 |
|---------|------|------|
| `id` | text (PK) | 主鍵 |
| `todo_id` | text (FK) | 關聯的 Todo ID |
| `opportunity_id` | text (FK) | 關聯的機會 ID |
| `user_id` | text (FK) | 操作者 ID |
| `action` | text | 操作類型 |
| `action_via` | text | 操作來源 (slack/web) |
| `changes` | jsonb | 變更內容 |
| `note` | text | 備註 |
| `created_at` | timestamp | 建立時間 |

```sql
-- Todo 操作日誌表
-- 記錄所有 Todo 操作（建立、完成、改期、成交、拒絕）

CREATE TABLE IF NOT EXISTS "todo_logs" (
    "id" text PRIMARY KEY NOT NULL,
    "todo_id" text NOT NULL REFERENCES "sales_todos"("id") ON DELETE CASCADE,
    "opportunity_id" text REFERENCES "opportunities"("id") ON DELETE SET NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "action" text NOT NULL,
    "action_via" text NOT NULL,
    "changes" jsonb NOT NULL,
    "note" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "todo_logs_todo_id_idx" ON "todo_logs" ("todo_id");
CREATE INDEX IF NOT EXISTS "todo_logs_opportunity_id_idx" ON "todo_logs" ("opportunity_id");
CREATE INDEX IF NOT EXISTS "todo_logs_user_id_idx" ON "todo_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "todo_logs_created_at_idx" ON "todo_logs" ("created_at");
```

## Schema 變更

### 1. 更新 sales-todo.ts

**檔案位置**：`packages/db/src/schema/sales-todo.ts`

變更內容：
1. 更新 `SalesTodoStatus` type，新增 `won` 和 `lost` 狀態
2. 新增 `WonRecord` interface
3. 新增 `LostRecord` interface
4. 新增 `wonRecord`、`lostRecord`、`nextTodoId`、`prevTodoId` 欄位
5. 更新 relations 支援 todo chain

### 2. 新增 todo-log.ts

**檔案位置**：`packages/db/src/schema/todo-log.ts`

新增內容：
1. 定義 `TodoLogAction` type
2. 定義 `todoLogs` table
3. 定義 `todoLogsRelations`

### 3. 更新 index.ts

**檔案位置**：`packages/db/src/schema/index.ts`

新增導出：
```typescript
export * from "./todo-log";
```

## Type 定義

### WonRecord Interface
```typescript
interface WonRecord {
  amount?: number;
  currency?: string;
  product?: string;
  note?: string;
  wonAt: string;
  wonVia: "slack" | "web";
}
```

### LostRecord Interface
```typescript
interface LostRecord {
  reason: string;
  competitor?: string;
  note?: string;
  lostAt: string;
  lostVia: "slack" | "web";
}
```

### TodoLogAction Type
```typescript
type TodoLogAction =
  | "create"
  | "complete"
  | "postpone"
  | "won"
  | "lost"
  | "cancel"
  | "update";
```

## 開發分支

**分支名稱**：`feature/sales-todo-pipeline-upgrade`

## 後續開發

完成資料庫變更後，還需要進行以下開發：
1. 更新 API router 支援新的狀態和操作
2. 更新 Slack Bot 互動流程
3. 更新 Web UI 介面
4. 新增相關的 service 方法

## 相關檔案

- `packages/db/src/migrations/0007_add_sales_todos.sql` - 原始 sales_todos migration
- `packages/db/src/schema/sales-todo.ts` - 現有 schema
- `packages/api/src/routers/sales-todo.ts` - 相關 API router
