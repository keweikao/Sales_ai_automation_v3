import { relations } from "drizzle-orm";
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { conversations } from "./conversation";

/**
 * 公開分享 Token 表格
 * 用於生成不需登入即可查看的分享連結
 */
export const shareTokens = pgTable("share_tokens", {
  id: text("id").primaryKey(), // 使用 nanoid 生成，例如: "a1b2c3d4e5"

  // 關聯
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),

  // Token 資訊
  token: text("token").notNull().unique(), // 加密 token，用於 URL

  // 有效性
  expiresAt: timestamp("expires_at").notNull(), // 過期時間（7天）
  isRevoked: boolean("is_revoked").default(false).notNull(), // 是否已撤銷

  // 追蹤資訊
  viewCount: text("view_count").default("0").notNull(), // 查看次數（存為 string 避免 bigint 問題）
  lastViewedAt: timestamp("last_viewed_at"), // 最後查看時間

  // 時間戳
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const shareTokensRelations = relations(shareTokens, ({ one }) => ({
  conversation: one(conversations, {
    fields: [shareTokens.conversationId],
    references: [conversations.id],
  }),
}));

export type ShareToken = typeof shareTokens.$inferSelect;
export type NewShareToken = typeof shareTokens.$inferInsert;
