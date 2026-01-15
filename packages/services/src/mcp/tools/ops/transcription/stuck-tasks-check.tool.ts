/**
 * Transcription Stuck Tasks Check Tool
 * 檢查卡住的轉錄任務
 */

import { z } from "zod";
import type { MCPTool } from "../../../../mcp/types.js";

const TranscriptionStuckTasksCheckInput = z.object({
  stuckThresholdMinutes: z.number().default(30),
  checkDatabase: z.boolean().default(true),
});

const TranscriptionStuckTasksCheckOutput = z.object({
  status: z.enum(["healthy", "degraded", "critical"]),
  stuckTasksCount: z.number(),
  stuckTasks: z
    .array(
      z.object({
        id: z.string(),
        caseNumber: z.string().optional(),
        status: z.string(),
        createdAt: z.string(),
        stuckDurationMinutes: z.number(),
      })
    )
    .optional(),
  error: z.string().optional(),
  timestamp: z.date(),
});

type Input = z.infer<typeof TranscriptionStuckTasksCheckInput>;
type Output = z.infer<typeof TranscriptionStuckTasksCheckOutput>;

export const transcriptionStuckTasksCheckTool: MCPTool<Input, Output> = {
  name: "transcription_stuck_tasks_check",
  description:
    "檢查卡在 'processing' 狀態超過閾值時間的轉錄任務。預設閾值為 30 分鐘。",
  inputSchema: TranscriptionStuckTasksCheckInput,
  handler: async (input: Input): Promise<Output> => {
    try {
      if (!input.checkDatabase) {
        // 僅返回健康狀態，不實際檢查
        return {
          status: "healthy",
          stuckTasksCount: 0,
          timestamp: new Date(),
        };
      }

      // 計算閾值時間
      const thresholdTime = new Date();
      thresholdTime.setMinutes(
        thresholdTime.getMinutes() - input.stuckThresholdMinutes
      );

      // 查詢資料庫中卡住的任務
      // 注意：這裡需要實際的資料庫查詢實作
      // 目前使用模擬邏輯

      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL || "");

      const stuckTasks = await sql`
				SELECT
					id,
					case_number,
					status,
					created_at,
					updated_at
				FROM conversations
				WHERE status = 'processing'
					AND updated_at < ${thresholdTime.toISOString()}
				ORDER BY updated_at ASC
				LIMIT 100
			`;

      const stuckTasksCount = stuckTasks.length;

      if (stuckTasksCount === 0) {
        return {
          status: "healthy",
          stuckTasksCount: 0,
          timestamp: new Date(),
        };
      }

      // 計算每個任務卡住的時間
      const tasksWithDuration = stuckTasks.map((task) => {
        const updatedAt = new Date(task.updated_at as string);
        const stuckDurationMs = Date.now() - updatedAt.getTime();
        const stuckDurationMinutes = Math.floor(stuckDurationMs / (1000 * 60));

        return {
          id: task.id as string,
          caseNumber: (task.case_number as string) || undefined,
          status: task.status as string,
          createdAt: (task.created_at as string) || new Date().toISOString(),
          stuckDurationMinutes,
        };
      });

      // 判斷健康狀態
      let status: "healthy" | "degraded" | "critical" = "degraded";

      if (stuckTasksCount > 10) {
        status = "critical";
      }

      // 檢查是否有超過 2 小時的卡住任務
      const hasCriticalStuckTasks = tasksWithDuration.some(
        (task) => task.stuckDurationMinutes > 120
      );

      if (hasCriticalStuckTasks) {
        status = "critical";
      }

      return {
        status,
        stuckTasksCount,
        stuckTasks: tasksWithDuration.slice(0, 10), // 只返回前 10 個
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: "critical",
        stuckTasksCount: 0,
        error:
          error instanceof Error ? error.message : "Stuck tasks check failed",
        timestamp: new Date(),
      };
    }
  },
};
