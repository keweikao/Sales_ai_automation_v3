/**
 * Analysis Completeness Check Tool
 * 檢查 MEDDIC 分析完整性
 */

import { z } from "zod";
import type { MCPTool } from "../../../../mcp/types.js";

const AnalysisCompletenessCheckInput = z.object({
  checkRecentDays: z.number().default(7),
  checkDatabase: z.boolean().default(true),
});

const AnalysisCompletenessCheckOutput = z.object({
  status: z.enum(["healthy", "degraded", "critical"]),
  totalConversations: z.number(),
  analyzedConversations: z.number(),
  incompleteCount: z.number(),
  incompleteConversationIds: z.array(z.string()).optional(),
  error: z.string().optional(),
  timestamp: z.date(),
});

type Input = z.infer<typeof AnalysisCompletenessCheckInput>;
type Output = z.infer<typeof AnalysisCompletenessCheckOutput>;

export const analysisCompletenessCheckTool: MCPTool<Input, Output> = {
  name: "analysis_completeness_check",
  description: "檢查 MEDDIC 分析的完整性。識別已轉錄但未分析的對話。",
  inputSchema: AnalysisCompletenessCheckInput,
  handler: async (input: Input): Promise<Output> => {
    try {
      if (!input.checkDatabase) {
        return {
          status: "healthy",
          totalConversations: 0,
          analyzedConversations: 0,
          incompleteCount: 0,
          timestamp: new Date(),
        };
      }

      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL || "");

      // 計算最近 N 天的時間範圍
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - input.checkRecentDays);

      // 查詢已完成轉錄的對話總數
      const totalResult = await sql`
				SELECT COUNT(*) as count
				FROM conversations
				WHERE status = 'completed'
					AND transcript IS NOT NULL
					AND created_at >= ${sinceDate.toISOString()}
			`;

      const totalConversations = Number(totalResult[0]?.count || 0);

      // 查詢已分析的對話數量
      const analyzedResult = await sql`
				SELECT COUNT(DISTINCT c.id) as count
				FROM conversations c
				INNER JOIN meddic_analyses m ON c.id = m.conversation_id
				WHERE c.status = 'completed'
					AND c.transcript IS NOT NULL
					AND c.created_at >= ${sinceDate.toISOString()}
			`;

      const analyzedConversations = Number(analyzedResult[0]?.count || 0);

      const incompleteCount = totalConversations - analyzedConversations;

      // 如果有未完成分析，查詢具體的對話 ID
      let incompleteConversationIds: string[] | undefined;

      if (incompleteCount > 0) {
        const incompleteResult = await sql`
					SELECT c.id
					FROM conversations c
					LEFT JOIN meddic_analyses m ON c.id = m.conversation_id
					WHERE c.status = 'completed'
						AND c.transcript IS NOT NULL
						AND c.created_at >= ${sinceDate.toISOString()}
						AND m.id IS NULL
					LIMIT 10
				`;

        incompleteConversationIds = incompleteResult.map(
          (row) => row.id as string
        );
      }

      // 判斷健康狀態
      let status: "healthy" | "degraded" | "critical" = "healthy";

      const completionRate =
        totalConversations > 0
          ? (analyzedConversations / totalConversations) * 100
          : 100;

      if (completionRate < 50) {
        status = "critical";
      } else if (completionRate < 80) {
        status = "degraded";
      }

      return {
        status,
        totalConversations,
        analyzedConversations,
        incompleteCount,
        incompleteConversationIds,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: "critical",
        totalConversations: 0,
        analyzedConversations: 0,
        incompleteCount: 0,
        error:
          error instanceof Error ? error.message : "Completeness check failed",
        timestamp: new Date(),
      };
    }
  },
};
