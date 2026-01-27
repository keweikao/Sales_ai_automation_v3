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
