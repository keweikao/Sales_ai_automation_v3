import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const leads = pgTable("leads", {
	id: text("id").primaryKey(),
	companyName: text("company_name").notNull(),
	contactName: text("contact_name"),
	contactEmail: text("contact_email"),
	contactPhone: text("contact_phone"),

	// Lead source and status
	source: text("source").notNull().default("manual"), // manual, import, api, referral
	status: text("status").notNull().default("new"), // new, contacted, qualified, proposal, negotiation, won, lost

	// Scoring
	leadScore: integer("lead_score"), // 0-100
	meddicScore: jsonb("meddic_score").$type<{
		overall: number;
		dimensions: {
			metrics: number;
			economicBuyer: number;
			decisionCriteria: number;
			decisionProcess: number;
			identifyPain: number;
			champion: number;
		};
	}>(), // 從最新 conversation 計算

	// Additional info
	industry: text("industry"),
	companySize: text("company_size"),
	notes: text("notes"),

	// Timestamps
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
	lastContactedAt: timestamp("last_contacted_at"),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
