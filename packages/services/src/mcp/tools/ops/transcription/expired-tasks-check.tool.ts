/**
 * Transcription Expired Tasks Check Tool
 * 檢查過期的轉錄任務
 */

import { z } from "zod";
import type { MCPTool } from "../../../../mcp/types.js";

const TranscriptionExpiredTasksCheckInput = z.object({
  expiredThresholdHours: z.number().default(24),
  checkDatabase: z.boolean().default(true),
});

const TranscriptionExpiredTasksCheckOutput = z.object({
  status: z.enum(["healthy", "degraded", "critical"]),
  expiredTasksCount: z.number(),
  expiredTasks: z
    .array(
      z.object({
        id: z.string(),
        caseNumber: z.string().optional(),
        status: z.string(),
        createdAt: z.string(),
        expiredHours: z.number(),
      })
    )
    .optional(),
  error: z.string().optional(),
  timestamp: z.date(),
});

type Input = z.infer<typeof TranscriptionExpiredTasksCheckInput>;
type Output = z.infer<typeof TranscriptionExpiredTasksCheckOutput>;

export const transcriptionExpiredTasksCheckTool: MCPTool<Input, Output> = {
  name: "transcription_expired_tasks_check",
  description:
    "檢查超過有效期限的轉錄任務（pending 或 processing 狀態）。預設閾值為 24 小時。",
  inputSchema: TranscriptionExpiredTasksCheckInput,
  handler: async (input: Input): Promise<Output> => {
    try {
      if (!input.checkDatabase) {
        return {
          status: "healthy",
          expiredTasksCount: 0,
          timestamp: new Date(),
        };
      }

      // 計算過期時間閾值
      const expiredThresholdTime = new Date();
      expiredThresholdTime.setHours(
        expiredThresholdTime.getHours() - input.expiredThresholdHours
      );

      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL || "");

      // 查詢超過閾值但仍未完成的任務
      const expiredTasks = await sql`
				SELECT
					id,
					case_number,
					status,
					created_at
				FROM conversations
				WHERE status IN ('pending', 'processing')
					AND created_at < ${expiredThresholdTime.toISOString()}
				ORDER BY created_at ASC
				LIMIT 100
			`;

      const expiredTasksCount = expiredTasks.length;

      if (expiredTasksCount === 0) {
        return {
          status: "healthy",
          expiredTasksCount: 0,
          timestamp: new Date(),
        };
      }

      // 計算每個任務過期的時間
      const tasksWithExpiredTime = expiredTasks.map((task) => {
        const createdAt = new Date(task.created_at as string);
        const expiredMs = Date.now() - createdAt.getTime();
        const expiredHours = Math.floor(expiredMs / (1000 * 60 * 60));

        return {
          id: task.id as string,
          caseNumber: (task.case_number as string) || undefined,
          status: task.status as string,
          createdAt: (task.created_at as string) || new Date().toISOString(),
          expiredHours,
        };
      });

      // 判斷健康狀態
      let status: "healthy" | "degraded" | "critical" = "degraded";

      // 超過 20 個過期任務視為 critical
      if (expiredTasksCount > 20) {
        status = "critical";
      }

      // 檢查是否有超過 48 小時的過期任務
      const hasCriticalExpiredTasks = tasksWithExpiredTime.some(
        (task) => task.expiredHours > 48
      );

      if (hasCriticalExpiredTasks) {
        status = "critical";
      }

      return {
        status,
        expiredTasksCount,
        expiredTasks: tasksWithExpiredTime.slice(0, 10), // 只返回前 10 個
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: "critical",
        expiredTasksCount: 0,
        error:
          error instanceof Error ? error.message : "Expired tasks check failed",
        timestamp: new Date(),
      };
    }
  },
};
