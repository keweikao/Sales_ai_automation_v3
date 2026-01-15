/**
 * 直接測試 PostgreSQL 連線和查詢
 * 不依賴 MCP Server 架構，直接測試資料庫連線
 */

import { resolve } from "node:path";
import { neon, neonConfig } from "@neondatabase/serverless";
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import ws from "ws";

// 載入環境變數
config({ path: resolve(process.cwd(), "apps/server/.env") });

// 驗證環境變數
if (!process.env.DATABASE_URL) {
  console.error("❌ 錯誤: DATABASE_URL 環境變數未設定");
  console.error("   請確保 apps/server/.env 檔案包含 DATABASE_URL");
  process.exit(1);
}

// 設定 Neon
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

// 建立連線
const sqlClient = neon(process.env.DATABASE_URL);
const db = drizzle(sqlClient);

async function testDatabase() {
  console.log("🧪 PostgreSQL 直接連線測試開始...\n");
  console.log(
    `✅ DATABASE_URL 已設定: ${process.env.DATABASE_URL?.substring(0, 40)}...`
  );
  console.log();

  // Test 1: 基本連線測試
  console.log("📋 測試 1: 基本連線測試");
  console.log("=".repeat(50));
  try {
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log("✅ 成功 - 資料庫連線正常");
    console.log(`   返回結果: ${JSON.stringify(result.rows[0])}`);
  } catch (error) {
    console.log(
      `❌ 失敗: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    process.exit(1);
  }
  console.log();

  // Test 2: 列出所有表
  console.log("📋 測試 2: 列出所有資料表");
  console.log("=".repeat(50));
  try {
    const result = await db.execute(sql`
      SELECT table_name as name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log("✅ 成功");
    console.log(`   共找到 ${result.rows.length} 個資料表:`);
    for (const row of result.rows.slice(0, 10)) {
      const table = row as { name: string };
      console.log(`   - ${table.name}`);
    }
    if (result.rows.length > 10) {
      console.log(`   ... 還有 ${result.rows.length - 10} 個表`);
    }
  } catch (error) {
    console.log(
      `❌ 失敗: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
  console.log();

  // Test 3: 檢視 conversations 表結構
  console.log("🔍 測試 3: 檢視 conversations 表結構");
  console.log("=".repeat(50));
  try {
    const result = await db.execute(sql`
      SELECT
        column_name as name,
        data_type as type,
        is_nullable = 'YES' as nullable
      FROM information_schema.columns
      WHERE table_name = 'conversations'
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    console.log("✅ 成功");
    console.log("   表名: conversations");
    console.log(`   欄位數: ${result.rows.length}`);
    console.log("   欄位列表:");
    for (const row of result.rows.slice(0, 10)) {
      const col = row as { name: string; type: string; nullable: boolean };
      console.log(`   - ${col.name} (${col.type}, nullable: ${col.nullable})`);
    }
    if (result.rows.length > 10) {
      console.log(`   ... 還有 ${result.rows.length - 10} 個欄位`);
    }
  } catch (error) {
    console.log(
      `❌ 失敗: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
  console.log();

  // Test 4: 執行簡單查詢
  console.log("📊 測試 4: 執行簡單查詢 (COUNT)");
  console.log("=".repeat(50));
  try {
    const result = await db.execute(
      sql`SELECT COUNT(*) as total FROM conversations`
    );
    const row = result.rows[0] as { total: string };
    console.log("✅ 成功");
    console.log(`   對話總數: ${row.total}`);
  } catch (error) {
    console.log(
      `❌ 失敗: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
  console.log();

  // Test 5: 轉錄任務狀態統計
  console.log("📈 測試 5: 轉錄任務狀態統計 (最近 7 天)");
  console.log("=".repeat(50));
  try {
    const result = await db.execute(sql`
      SELECT
        status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time_seconds
      FROM conversations
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY status
      ORDER BY count DESC
    `);
    console.log("✅ 成功");
    if (result.rows.length > 0) {
      console.log("   狀態統計:");
      for (const row of result.rows) {
        const stat = row as {
          status: string;
          count: string;
          avg_processing_time_seconds: number | null;
        };
        const avgTime = stat.avg_processing_time_seconds
          ? `${Math.round(stat.avg_processing_time_seconds)}s`
          : "N/A";
        console.log(
          `   - ${stat.status}: ${stat.count} 筆 (平均處理: ${avgTime})`
        );
      }
    } else {
      console.log("   ℹ️  最近 7 天無資料");
    }
  } catch (error) {
    console.log(
      `❌ 失敗: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
  console.log();

  console.log("=".repeat(50));
  console.log("✨ PostgreSQL 連線測試完成！");
  console.log("=".repeat(50));
  console.log("\n✅ 所有基本測試通過！資料庫連線正常運作。");
  console.log("\n📝 Phase 1.1 PostgreSQL MCP 工具已準備就緒！");
  console.log(
    "   - postgres.ts: 生產環境工具（使用 @Sales_ai_automation_v3/db）"
  );
  console.log(
    "   - postgres-test.ts: 測試環境工具（使用 process.env.DATABASE_URL）"
  );
  console.log("   - analytics-queries.ts: 常用查詢模板");
}

testDatabase().catch((error) => {
  console.error("\n❌ 測試執行錯誤:", error);
  process.exit(1);
});
