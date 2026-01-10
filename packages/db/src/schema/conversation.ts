import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const conversations = pgTable("conversations", {
	id: text("id").primaryKey(),
	leadId: text("lead_id")
		.notNull()
		.references(() => leads.id),

	// 基本資訊
	title: text("title"),
	type: text("type").notNull(), // discovery_call, demo, follow_up, negotiation, closing, support
	status: text("status").notNull().default("pending"), // pending, transcribing, analyzing, completed, failed

	// 內容
	audioUrl: text("audio_url"),
	transcript: jsonb("transcript").$type<{
		segments: Array<{
			speaker: string;
			text: string;
			start: number;
			end: number;
		}>;
		fullText: string;
		language: string;
	}>(),
	summary: text("summary"),

	// 分析結果
	meddicAnalysis: jsonb("meddic_analysis").$type<{
		overallScore: number;
		status: string;
		dimensions: Record<string, unknown>;
	}>(), // 快速存取，完整資料在 meddic_analyses 表
	extractedData: jsonb("extracted_data"), // CRM 萃取結果
	sentiment: text("sentiment"), // positive, neutral, negative

	// ⭐ V2 特有欄位（必須保留以支援 Firestore 遷移）
	progressScore: integer("progress_score"), // V2 的進度評分（與 MEDDIC score 不同）
	coachingNotes: text("coaching_notes"), // Coach Agent 產生的建議
	urgencyLevel: text("urgency_level"), // high, medium, low
	storeName: text("store_name"), // iCHEF 客戶的店名（重要業務欄位）

	// 時間
	duration: integer("duration"), // 秒數
	conversationDate: timestamp("conversation_date"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	analyzedAt: timestamp("analyzed_at"),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),

	// 關聯
	participants: jsonb("participants").$type<
		Array<{
			name: string;
			role: string;
			company?: string;
		}>
	>(),
	createdBy: text("created_by"),
});

// Import leads for foreign key reference
import { leads } from "./lead";

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
