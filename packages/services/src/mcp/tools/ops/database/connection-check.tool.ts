/**
 * Database Connection Check Tool
 * 檢查資料庫連線狀態、延遲和基本健康狀況
 */

import { db } from "@Sales_ai_automation_v3/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import type { MCPTool } from "../../../types.js";

// ============================================================
// Schema Definitions
// ============================================================

const DatabaseConnectionCheckInput = z.object({
  maxLatencyMs: z.number().optional().default(3000),
});

const DatabaseConnectionCheckOutput = z.object({
  status: z.enum(["healthy", "degraded", "critical"]),
  latencyMs: z.number().optional(),
  details: z.string().optional(),
  timestamp: z.date(),
});

type Input = z.infer<typeof DatabaseConnectionCheckInput>;
type Output = z.infer<typeof DatabaseConnectionCheckOutput>;

// ============================================================
// Tool Implementation
// ============================================================

export const databaseConnectionCheckTool: MCPTool<Input, Output> = {
  name: "database_connection_check",
  description: "檢查資料庫連線狀態、延遲和基本健康狀況",

  inputSchema: DatabaseConnectionCheckInput,

  handler: async (input: Input): Promise<Output> => {
    const startTime = Date.now();

    try {
      // 執行簡單查詢測試連線
      await db.execute(sql`SELECT 1`);

      const latencyMs = Date.now() - startTime;

      // 判斷狀態
      if (latencyMs > input.maxLatencyMs) {
        return {
          status: "degraded",
          latencyMs,
          details: `High database latency: ${latencyMs}ms > ${input.maxLatencyMs}ms`,
          timestamp: new Date(),
        };
      }

      return {
        status: "healthy",
        latencyMs,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: "critical",
        details: `Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      };
    }
  },
};
