/**
 * Database Orphaned Records Check Tool
 * 檢查資料庫中的孤立記錄（沒有正確關聯的記錄）
 */

import { db } from "@Sales_ai_automation_v3/db";
import {
  conversations,
  opportunities,
} from "@Sales_ai_automation_v3/db/schema";
import { eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { MCPTool } from "../../../types.js";

// ============================================================
// Schema Definitions
// ============================================================

const DatabaseOrphanedCheckInput = z.object({
  checkConversations: z.boolean().optional().default(true),
  maxOrphanedAllowed: z.number().optional().default(10),
});

const DatabaseOrphanedCheckOutput = z.object({
  status: z.enum(["healthy", "degraded", "critical"]),
  orphanedConversationsCount: z.number().optional(),
  details: z.string().optional(),
  timestamp: z.date(),
});

type Input = z.infer<typeof DatabaseOrphanedCheckInput>;
type Output = z.infer<typeof DatabaseOrphanedCheckOutput>;

// ============================================================
// Tool Implementation
// ============================================================

export const databaseOrphanedCheckTool: MCPTool<Input, Output> = {
  name: "database_orphaned_check",
  description: "檢查資料庫中的孤立記錄（沒有正確關聯的記錄）",

  inputSchema: DatabaseOrphanedCheckInput,

  handler: async (input: Input): Promise<Output> => {
    try {
      let orphanedConversationsCount = 0;

      if (input.checkConversations) {
        // 檢查孤立的 conversations (沒有對應 opportunity 的記錄)
        const orphanedConversations = await db
          .select({ count: sql<number>`count(*)` })
          .from(conversations)
          .leftJoin(
            opportunities,
            eq(conversations.opportunityId, opportunities.id)
          )
          .where(isNull(opportunities.id));

        orphanedConversationsCount = Number(
          orphanedConversations[0]?.count ?? 0
        );
      }

      const totalOrphaned = orphanedConversationsCount;

      // 判斷狀態
      if (totalOrphaned === 0) {
        return {
          status: "healthy",
          orphanedConversationsCount,
          timestamp: new Date(),
        };
      }

      if (totalOrphaned > input.maxOrphanedAllowed) {
        return {
          status: "critical",
          orphanedConversationsCount,
          details: `Too many orphaned records: ${totalOrphaned} > ${input.maxOrphanedAllowed}`,
          timestamp: new Date(),
        };
      }

      return {
        status: "degraded",
        orphanedConversationsCount,
        details: `Found ${totalOrphaned} orphaned records`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: "critical",
        details: `Orphaned check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      };
    }
  },
};
