/**
 * Database Index Health Check Tool
 * 檢查資料庫索引的健康狀況
 */

import { db } from "@Sales_ai_automation_v3/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import type { MCPTool } from "../../../types.js";

// ============================================================
// Schema Definitions
// ============================================================

const DatabaseIndexCheckInput = z.object({
  checkTables: z
    .array(z.string())
    .optional()
    .default(["conversations", "opportunities"]),
});

const DatabaseIndexCheckOutput = z.object({
  status: z.enum(["healthy", "degraded", "critical"]),
  details: z.string().optional(),
  indexCount: z.number().optional(),
  timestamp: z.date(),
});

type Input = z.infer<typeof DatabaseIndexCheckInput>;
type Output = z.infer<typeof DatabaseIndexCheckOutput>;

// ============================================================
// Tool Implementation
// ============================================================

export const databaseIndexCheckTool: MCPTool<Input, Output> = {
  name: "database_index_check",
  description: "檢查資料庫索引的健康狀況",

  inputSchema: DatabaseIndexCheckInput,

  handler: async (input: Input): Promise<Output> => {
    try {
      // 檢查指定表的索引數量
      const results = await db.execute(sql`
        SELECT
          tablename,
          COUNT(*) as index_count
        FROM pg_indexes
        WHERE tablename = ANY(${input.checkTables})
        GROUP BY tablename
      `);

      const indexCount = results.rows.reduce(
        (sum: number, row: any) => sum + Number(row.index_count || 0),
        0
      );

      // 簡單判斷：如果有索引就視為正常
      if (indexCount > 0) {
        return {
          status: "healthy",
          indexCount,
          details: `Found ${indexCount} indexes`,
          timestamp: new Date(),
        };
      }

      return {
        status: "degraded",
        indexCount,
        details: "No indexes found on specified tables",
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: "critical",
        details: `Index check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      };
    }
  },
};
