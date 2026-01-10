import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { conversations } from "./conversation";
import { leads } from "./lead";

export const meddicAnalyses = pgTable("meddic_analyses", {
	id: text("id").primaryKey(),
	conversationId: text("conversation_id")
		.notNull()
		.references(() => conversations.id),
	leadId: text("lead_id")
		.notNull()
		.references(() => leads.id),

	// 六個維度評分 (1-5)
	metricsScore: integer("metrics_score"),
	economicBuyerScore: integer("economic_buyer_score"),
	decisionCriteriaScore: integer("decision_criteria_score"),
	decisionProcessScore: integer("decision_process_score"),
	identifyPainScore: integer("identify_pain_score"),
	championScore: integer("champion_score"),

	// 整體評分
	overallScore: integer("overall_score"), // 1-100（加權計算）
	status: text("status"), // Strong, Medium, Weak, At Risk

	// 詳細分析（V2 buyer_signals）
	dimensions: jsonb("dimensions").$type<
		Record<
			string,
			{
				evidence: string[];
				gaps: string[];
				recommendations: string[];
			}
		>
	>(), // 每個維度的 evidence, gaps, recommendations
	keyFindings: jsonb("key_findings").$type<string[]>(), // 3-5 個最重要洞察
	nextSteps: jsonb("next_steps").$type<
		Array<{
			action: string;
			priority: string;
			owner?: string;
		}>
	>(), // 具體可執行步驟
	risks: jsonb("risks").$type<
		Array<{
			risk: string;
			severity: string;
			mitigation?: string;
		}>
	>(), // 潛在問題

	// ⭐ V2 原始 Agent 輸出（保留以支援未來分析）
	agentOutputs: jsonb("agent_outputs").$type<{
		agent1?: Record<string, unknown>; // Context Agent
		agent2?: Record<string, unknown>; // Buyer Agent
		agent3?: Record<string, unknown>; // Seller Agent
		agent4?: Record<string, unknown>; // Summary Agent
		agent5?: Record<string, unknown>; // CRM Extractor
		agent6?: Record<string, unknown>; // Coach Agent
	}>(),

	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MeddicAnalysis = typeof meddicAnalyses.$inferSelect;
export type NewMeddicAnalysis = typeof meddicAnalyses.$inferInsert;
