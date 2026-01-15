/**
 * Database Cleanup Repair Tool
 * 清理孤立的資料庫記錄
 */

import { db } from "@Sales_ai_automation_v3/db";
import {
  conversations,
  opportunities,
} from "@Sales_ai_automation_v3/db/schema";
import { and, eq, isNull, lt } from "drizzle-orm";
import { z } from "zod";
import type { MCPTool } from "../../../types.js";

// ============================================================
// Schema Definitions
// ============================================================

const DatabaseCleanupRepairInput = z.object({
  dryRun: z.boolean().optional().default(false),
  maxRecords: z.number().optional().default(100),
  daysOld: z.number().optional().default(7),
});

const DatabaseCleanupRepairOutput = z.object({
  success: z.boolean(),
  deletedCount: z.number(),
  details: z.string(),
});

type Input = z.infer<typeof DatabaseCleanupRepairInput>;
type Output = z.infer<typeof DatabaseCleanupRepairOutput>;

// ============================================================
// Tool Implementation
// ============================================================

export const databaseCleanupRepairTool: MCPTool<Input, Output> = {
  name: "database_cleanup_repair",
  description: "清理孤立的資料庫記錄（支援 dry-run 模式）",

  inputSchema: DatabaseCleanupRepairInput,

  handler: async (input: Input): Promise<Output> => {
    try {
      const cutoffDate = new Date(
        Date.now() - input.daysOld * 24 * 60 * 60 * 1000
      );

      // 1. 找出孤立的 conversations
      const orphanedRecordsQuery = db
        .select({ id: conversations.id, createdAt: conversations.createdAt })
        .from(conversations)
        .leftJoin(
          opportunities,
          eq(conversations.opportunityId, opportunities.id)
        )
        .where(
          and(isNull(opportunities.id), lt(conversations.createdAt, cutoffDate))
        )
        .limit(input.maxRecords);

      const orphanedRecords = await orphanedRecordsQuery;

      if (orphanedRecords.length === 0) {
        return {
          success: true,
          deletedCount: 0,
          details: "No orphaned records found",
        };
      }

      // 安全檢查：如果超過限制，拒絕執行
      if (orphanedRecords.length > input.maxRecords) {
        return {
          success: false,
          deletedCount: 0,
          details: `Too many orphaned records (${orphanedRecords.length}), manual review required`,
        };
      }

      // 2. Dry run 模式：只預覽不刪除
      if (input.dryRun) {
        return {
          success: true,
          deletedCount: 0,
          details: `DRY RUN: Would delete ${orphanedRecords.length} records`,
        };
      }

      // 3. 實際刪除
      const idsToDelete = orphanedRecords.map((r) => r.id);

      // 使用 transaction 確保原子性
      await db.transaction(async (tx) => {
        for (const id of idsToDelete) {
          await tx.delete(conversations).where(eq(conversations.id, id));
        }
      });

      return {
        success: true,
        deletedCount: idsToDelete.length,
        details: `Successfully deleted ${idsToDelete.length} orphaned records`,
      };
    } catch (error) {
      return {
        success: false,
        deletedCount: 0,
        details: `Cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
