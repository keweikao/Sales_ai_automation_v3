/**
 * Todo Log Schema
 * Todo 操作日誌資料表定義
 */

import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { opportunities } from "./opportunity";
import { salesTodos } from "./sales-todo";

// ============================================================
// Types
// ============================================================

/** Todo 操作類型 */
export type TodoLogAction =
  | "create"
  | "complete"
  | "postpone"
  | "won"
  | "lost"
  | "cancel"
  | "update";

/** 操作來源 */
export type TodoLogActionVia = "slack" | "web" | "system";

/** 變更記錄 */
export interface TodoLogChanges {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  [key: string]: unknown;
}

// ============================================================
// Table Definition
// ============================================================

export const todoLogs = pgTable("todo_logs", {
  id: text("id").primaryKey(),

  // 關聯
  todoId: text("todo_id")
    .notNull()
    .references(() => salesTodos.id, { onDelete: "cascade" }),
  opportunityId: text("opportunity_id").references(() => opportunities.id, {
    onDelete: "set null",
  }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // 操作資訊
  action: text("action").$type<TodoLogAction>().notNull(),
  actionVia: text("action_via").$type<TodoLogActionVia>().notNull(),

  // 變更記錄
  changes: jsonb("changes").$type<TodoLogChanges>().notNull(),

  // 備註
  note: text("note"),

  // 時間戳
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// Relations
// ============================================================

export const todoLogsRelations = relations(todoLogs, ({ one }) => ({
  todo: one(salesTodos, {
    fields: [todoLogs.todoId],
    references: [salesTodos.id],
  }),
  opportunity: one(opportunities, {
    fields: [todoLogs.opportunityId],
    references: [opportunities.id],
  }),
  user: one(user, {
    fields: [todoLogs.userId],
    references: [user.id],
  }),
}));

// ============================================================
// Type Exports
// ============================================================

export type TodoLog = typeof todoLogs.$inferSelect;
export type NewTodoLog = typeof todoLogs.$inferInsert;
