/**
 * Database Reindex Repair Tool
 * 重建資料庫索引
 */

import { db } from "@Sales_ai_automation_v3/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import type { MCPTool } from "../../../types.js";

// ============================================================
// Schema Definitions
// ============================================================

const DatabaseReindexRepairInput = z.object({
  tables: z
    .array(z.string())
    .optional()
    .default(["conversations", "opportunities"]),
});

const DatabaseReindexRepairOutput = z.object({
  success: z.boolean(),
  reindexedCount: z.number(),
  details: z.string(),
});

type Input = z.infer<typeof DatabaseReindexRepairInput>;
type Output = z.infer<typeof DatabaseReindexRepairOutput>;

// ============================================================
// Tool Implementation
// ============================================================

export const databaseReindexRepairTool: MCPTool<Input, Output> = {
  name: "database_reindex_repair",
  description: "重建資料庫索引（PostgreSQL REINDEX）",

  inputSchema: DatabaseReindexRepairInput,

  handler: async (input: Input): Promise<Output> => {
    try {
      let reindexedCount = 0;

      // 逐表重建索引
      for (const tableName of input.tables) {
        await db.execute(sql.raw(`REINDEX TABLE ${tableName}`));
        reindexedCount++;
      }

      return {
        success: true,
        reindexedCount,
        details: `Reindexed ${reindexedCount} tables`,
      };
    } catch (error) {
      return {
        success: false,
        reindexedCount: 0,
        details: `Reindex failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
