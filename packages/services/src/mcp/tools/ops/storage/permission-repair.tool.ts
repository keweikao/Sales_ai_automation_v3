/**
 * Storage Permission Repair Tool
 * 修復 R2 儲存權限問題
 */

import { z } from "zod";
import type { MCPTool } from "../../../../mcp/types.js";

const StoragePermissionRepairInput = z.object({
  dryRun: z.boolean().default(true),
  retryAttempts: z.number().min(1).max(5).default(3),
});

const StoragePermissionRepairOutput = z.object({
  repaired: z.boolean(),
  actions: z.array(z.string()),
  dryRun: z.boolean(),
  timestamp: z.date(),
});

type Input = z.infer<typeof StoragePermissionRepairInput>;
type Output = z.infer<typeof StoragePermissionRepairOutput>;

export const storagePermissionRepairTool: MCPTool<Input, Output> = {
  name: "storage_permission_repair",
  description: "修復 R2 儲存權限問題。驗證憑證並嘗試重新連線。",
  inputSchema: StoragePermissionRepairInput,
  handler: async (input: Input): Promise<Output> => {
    const actions: string[] = [];

    try {
      const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY;
      const secretKey = process.env.CLOUDFLARE_R2_SECRET_KEY;
      const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
      const bucket = process.env.CLOUDFLARE_R2_BUCKET;

      if (!(accessKey && secretKey && endpoint && bucket)) {
        actions.push("❌ R2 環境變數未完整設定");
        actions.push(
          "   缺少: " +
            [
              accessKey ? null : "CLOUDFLARE_R2_ACCESS_KEY",
              secretKey ? null : "CLOUDFLARE_R2_SECRET_KEY",
              endpoint ? null : "CLOUDFLARE_R2_ENDPOINT",
              bucket ? null : "CLOUDFLARE_R2_BUCKET",
            ]
              .filter(Boolean)
              .join(", ")
        );

        return {
          repaired: false,
          actions,
          dryRun: input.dryRun,
          timestamp: new Date(),
        };
      }

      if (input.dryRun) {
        actions.push("🔍 Dry Run 模式 - 僅模擬修復動作");
        actions.push("1. 驗證 R2 憑證有效性");
        actions.push("2. 測試連線到 R2 endpoint");
        actions.push(`3. 執行 ${input.retryAttempts} 次重試`);
        actions.push("4. 測試基本的讀寫操作");

        return {
          repaired: false,
          actions,
          dryRun: true,
          timestamp: new Date(),
        };
      }

      // 實際修復邏輯
      actions.push("🔧 開始修復 R2 儲存權限...");

      const { R2StorageService } = await import("../../../../storage/r2.js");

      for (let attempt = 1; attempt <= input.retryAttempts; attempt++) {
        actions.push(`📡 嘗試連線 (第 ${attempt}/${input.retryAttempts} 次)`);

        try {
          const r2Service = new R2StorageService({
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
            endpoint,
            bucket,
            region: "auto",
          });

          // 測試連線
          const connectionOk = await r2Service.testConnection();

          if (connectionOk) {
            actions.push("✅ R2 連線成功，權限正常！");

            return {
              repaired: true,
              actions,
              dryRun: false,
              timestamp: new Date(),
            };
          }

          actions.push("⚠️ 連線測試失敗");
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          actions.push(`❌ 連線錯誤: ${errorMsg}`);

          // 判斷錯誤類型
          if (errorMsg.includes("credentials")) {
            actions.push("💡 憑證問題：請檢查 Access Key 和 Secret Key");
          } else if (errorMsg.includes("endpoint")) {
            actions.push("💡 端點問題：請檢查 CLOUDFLARE_R2_ENDPOINT");
          } else if (errorMsg.includes("bucket")) {
            actions.push("💡 Bucket 問題：請檢查 CLOUDFLARE_R2_BUCKET");
          }
        }

        // 等待後重試（指數退避）
        if (attempt < input.retryAttempts) {
          const delayMs = Math.min(1000 * 2 ** (attempt - 1), 10_000);
          actions.push(`⏳ 等待 ${delayMs}ms 後重試...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      actions.push("❌ 所有重試嘗試均失敗");
      actions.push("💡 建議：");
      actions.push("   1. 檢查 R2 憑證是否有效");
      actions.push("   2. 確認 Bucket 存在且可訪問");
      actions.push("   3. 檢查網路連線");
      actions.push("   4. 查看 Cloudflare 控制台的 R2 設定");

      return {
        repaired: false,
        actions,
        dryRun: false,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      actions.push(`❌ 修復過程發生錯誤: ${errorMsg}`);

      return {
        repaired: false,
        actions,
        dryRun: input.dryRun,
        timestamp: new Date(),
      };
    }
  },
};
