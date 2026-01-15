/**
 * Database Reconnect Repair Tool
 * 重新建立資料庫連線
 */

import { db } from "@Sales_ai_automation_v3/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import type { MCPTool } from "../../../types.js";

// ============================================================
// Schema Definitions
// ============================================================

const DatabaseReconnectRepairInput = z.object({
  waitTimeMs: z.number().optional().default(3000),
});

const DatabaseReconnectRepairOutput = z.object({
  success: z.boolean(),
  details: z.string(),
});

type Input = z.infer<typeof DatabaseReconnectRepairInput>;
type Output = z.infer<typeof DatabaseReconnectRepairOutput>;

// ============================================================
// Tool Implementation
// ============================================================

export const databaseReconnectRepairTool: MCPTool<Input, Output> = {
  name: "database_reconnect_repair",
  description: "重新建立資料庫連線",

  inputSchema: DatabaseReconnectRepairInput,

  handler: async (input: Input): Promise<Output> => {
    try {
      // 等待一段時間讓現有連線關閉
      await new Promise((resolve) => setTimeout(resolve, input.waitTimeMs));

      // 測試連線
      await db.execute(sql`SELECT 1`);

      return {
        success: true,
        details: "Database connection re-established successfully",
      };
    } catch (error) {
      return {
        success: false,
        details: `Reconnect failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
