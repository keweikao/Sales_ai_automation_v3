/**
 * 測試 PostgreSQL MCP 工具
 * 驗證 PostgreSQL 查詢工具和 Schema 檢視工具是否正常運作
 */

import { resolve } from "node:path";
// 載入環境變數 (從 apps/server/.env)
import { config } from "dotenv";

config({ path: resolve(process.cwd(), "apps/server/.env") });

// 驗證環境變數
if (!process.env.DATABASE_URL) {
  console.error("❌ 錯誤: DATABASE_URL 環境變數未設定");
  console.error("   請確保 apps/server/.env 檔案包含 DATABASE_URL");
  process.exit(1);
}

import {
  postgresQueryTool,
  postgresSchemaInspectorTool,
} from "../src/mcp/external/postgres-test.js";
import { createMCPServer } from "../src/mcp/server.js";
import { ANALYTICS_QUERIES } from "../src/mcp/templates/analytics-queries.js";

async function testPostgresMCP() {
  console.log(
    `✅ DATABASE_URL 已設定: ${process.env.DATABASE_URL?.substring(0, 40)}...`
  );
  console.log();

  // 建立測試用的 MCP Server（使用測試版本的 PostgreSQL 工具）
  const mcpServer = createMCPServer({ enableLogging: true });
  mcpServer.registerTools([postgresQueryTool, postgresSchemaInspectorTool]);

  console.log("🧪 PostgreSQL MCP 工具測試開始...\n");

  // Test 1: 列出所有表
  console.log("📋 測試 1: 列出所有資料表");
  console.log("=".repeat(50));

  const schemaResult = await mcpServer.safeExecuteTool(
    "postgres_inspect_schema",
    {},
    { timestamp: new Date() }
  );

  if (schemaResult.success) {
    console.log("✅ 成功");
    const tables = (schemaResult.output as { tables: { name: string }[] })
      .tables;
    console.log(`   共找到 ${tables.length} 個資料表:`);
    for (const table of tables.slice(0, 10)) {
      console.log(`   - ${table.name}`);
    }
    if (tables.length > 10) {
      console.log(`   ... 還有 ${tables.length - 10} 個表`);
    }
  } else {
    console.log(`❌ 失敗: ${schemaResult.error}`);
  }

  console.log();

  // Test 2: 檢視 conversations 表結構
  console.log("🔍 測試 2: 檢視 conversations 表結構");
  console.log("=".repeat(50));

  const tableResult = await mcpServer.safeExecuteTool(
    "postgres_inspect_schema",
    { tableName: "conversations" },
    { timestamp: new Date() }
  );

  if (tableResult.success) {
    console.log("✅ 成功");
    const table = (
      tableResult.output as {
        tables: { name: string; columns: { name: string; type: string }[] }[];
      }
    ).tables[0];
    console.log(`   表名: ${table.name}`);
    console.log(`   欄位數: ${table.columns?.length ?? 0}`);
    console.log("   欄位列表:");
    for (const col of table.columns?.slice(0, 10) ?? []) {
      console.log(`   - ${col.name} (${col.type})`);
    }
    if ((table.columns?.length ?? 0) > 10) {
      console.log(`   ... 還有 ${(table.columns?.length ?? 0) - 10} 個欄位`);
    }
  } else {
    console.log(`❌ 失敗: ${tableResult.error}`);
  }

  console.log();

  // Test 3: 執行簡單查詢
  console.log("📊 測試 3: 執行簡單查詢 (COUNT)");
  console.log("=".repeat(50));

  const countResult = await mcpServer.safeExecuteTool(
    "postgres_query",
    { query: "SELECT COUNT(*) as total FROM conversations" },
    { timestamp: new Date() }
  );

  if (countResult.success) {
    console.log("✅ 成功");
    const result = countResult.output as {
      rows: { total: number }[];
      rowCount: number;
    };
    console.log(`   對話總數: ${result.rows[0].total}`);
    console.log(`   執行時間: ${countResult.executionTimeMs}ms`);
  } else {
    console.log(`❌ 失敗: ${countResult.error}`);
  }

  console.log();

  // Test 4: 執行分析查詢模板 - 轉錄任務狀態統計
  console.log("📈 測試 4: 轉錄任務狀態統計");
  console.log("=".repeat(50));

  const statsResult = await mcpServer.safeExecuteTool(
    "postgres_query",
    { query: ANALYTICS_QUERIES.transcriptionStats() },
    { timestamp: new Date() }
  );

  if (statsResult.success) {
    console.log("✅ 成功");
    const result = statsResult.output as {
      rows: {
        status: string;
        count: number;
        avg_processing_time_seconds: number;
      }[];
    };
    console.log("   狀態統計:");
    for (const row of result.rows) {
      const avgTime = row.avg_processing_time_seconds
        ? `${Math.round(row.avg_processing_time_seconds)}s`
        : "N/A";
      console.log(`   - ${row.status}: ${row.count} 筆 (平均處理: ${avgTime})`);
    }
  } else {
    console.log(`❌ 失敗: ${statsResult.error}`);
  }

  console.log();

  // Test 5: 執行商機漏斗查詢
  console.log("🎯 測試 5: 商機漏斗分析");
  console.log("=".repeat(50));

  const funnelResult = await mcpServer.safeExecuteTool(
    "postgres_query",
    { query: ANALYTICS_QUERIES.opportunityFunnel() },
    { timestamp: new Date() }
  );

  if (funnelResult.success) {
    console.log("✅ 成功");
    const result = funnelResult.output as {
      rows: {
        stage: string;
        count: number;
        total_value: number;
        avg_meddic_score: number;
      }[];
    };
    if (result.rows.length > 0) {
      console.log("   商機漏斗:");
      for (const row of result.rows) {
        const score = row.avg_meddic_score
          ? row.avg_meddic_score.toFixed(1)
          : "N/A";
        console.log(`   - ${row.stage}: ${row.count} 筆 (平均評分: ${score})`);
      }
    } else {
      console.log("   ℹ️  尚無商機資料");
    }
  } else {
    console.log(`❌ 失敗: ${funnelResult.error}`);
  }

  console.log();

  // Test 6: 測試安全性 - 嘗試執行非 SELECT 查詢
  console.log("🔒 測試 6: 安全性檢查 (阻止 DELETE)");
  console.log("=".repeat(50));

  const securityResult = await mcpServer.safeExecuteTool(
    "postgres_query",
    { query: "DELETE FROM conversations WHERE id = 'test'" },
    { timestamp: new Date() }
  );

  if (securityResult.success) {
    console.log("❌ 失敗 (不應該允許 DELETE 查詢)");
  } else {
    console.log("✅ 成功 (正確阻止了 DELETE 查詢)");
    console.log(`   錯誤訊息: ${securityResult.error}`);
  }

  console.log();
  console.log("=".repeat(50));
  console.log("✨ PostgreSQL MCP 測試完成！");
  console.log("=".repeat(50));

  // 統計結果
  const results = [
    schemaResult,
    tableResult,
    countResult,
    statsResult,
    funnelResult,
    !securityResult, // 反轉結果，因為我們預期失敗
  ];
  const successCount = results.filter((r) => r.success).length;
  const totalTests = 6;

  console.log(`\n📊 測試結果: ${successCount}/${totalTests} 通過`);

  if (successCount === totalTests) {
    console.log("🎉 所有測試通過！PostgreSQL MCP 工具運作正常。");
  } else {
    console.log("⚠️  部分測試失敗，請檢查上述錯誤訊息。");
  }
}

// 執行測試
testPostgresMCP().catch((error) => {
  console.error("❌ 測試執行錯誤:", error);
  process.exit(1);
});
