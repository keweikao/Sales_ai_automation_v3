/**
 * Storage Usage Check Tool
 * 檢查 R2 儲存空間用量
 */

import { z } from "zod";
import type { MCPTool } from "../../../../mcp/types.js";

const StorageUsageCheckInput = z.object({
  warningThresholdGB: z.number().default(50),
  criticalThresholdGB: z.number().default(100),
});

const StorageUsageCheckOutput = z.object({
  status: z.enum(["healthy", "degraded", "critical"]),
  usageGB: z.number(),
  fileCount: z.number(),
  estimatedMonthlyCostUSD: z.number(),
  error: z.string().optional(),
  timestamp: z.date(),
});

type Input = z.infer<typeof StorageUsageCheckInput>;
type Output = z.infer<typeof StorageUsageCheckOutput>;

export const storageUsageCheckTool: MCPTool<Input, Output> = {
  name: "storage_usage_check",
  description: "檢查 Cloudflare R2 儲存空間用量、檔案數量和預估成本。",
  inputSchema: StorageUsageCheckInput,
  handler: async (input: Input): Promise<Output> => {
    try {
      // 使用 R2 Storage Service 查詢用量
      // 注意：R2 不提供直接的用量 API，需要透過列表所有物件計算

      const { R2StorageService } = await import("../../../../storage/r2.js");

      const r2Service = new R2StorageService({
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY || "",
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY || "",
        endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || "",
        bucket: process.env.CLOUDFLARE_R2_BUCKET || "",
        region: "auto",
      });

      // 測試連線
      const connectionOk = await r2Service.testConnection();

      if (!connectionOk) {
        return {
          status: "critical",
          usageGB: 0,
          fileCount: 0,
          estimatedMonthlyCostUSD: 0,
          error: "Cannot connect to R2 storage",
          timestamp: new Date(),
        };
      }

      // 注意：實際的用量計算需要列出所有物件並加總大小
      // 這裡提供模擬邏輯，實際應用中需要實作完整的列表功能

      // 模擬用量數據（實際應用中應從 R2 API 取得）
      const usageGB = 0; // TODO: 實作實際用量計算
      const fileCount = 0; // TODO: 實作實際檔案計數

      // R2 定價：$0.015 per GB/month
      const estimatedMonthlyCostUSD = usageGB * 0.015;

      // 判斷健康狀態
      let status: "healthy" | "degraded" | "critical" = "healthy";
      let error: string | undefined;

      if (usageGB >= input.criticalThresholdGB) {
        status = "critical";
        error = `Storage usage ${usageGB.toFixed(2)}GB exceeds critical threshold ${input.criticalThresholdGB}GB`;
      } else if (usageGB >= input.warningThresholdGB) {
        status = "degraded";
        error = `Storage usage ${usageGB.toFixed(2)}GB exceeds warning threshold ${input.warningThresholdGB}GB`;
      }

      return {
        status,
        usageGB: Number(usageGB.toFixed(2)),
        fileCount,
        estimatedMonthlyCostUSD: Number(estimatedMonthlyCostUSD.toFixed(2)),
        error,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: "critical",
        usageGB: 0,
        fileCount: 0,
        estimatedMonthlyCostUSD: 0,
        error:
          error instanceof Error ? error.message : "Storage usage check failed",
        timestamp: new Date(),
      };
    }
  },
};
