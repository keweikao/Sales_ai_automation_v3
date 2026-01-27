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
