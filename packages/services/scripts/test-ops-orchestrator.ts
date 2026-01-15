/**
 * Test Ops Orchestrator
 * 本地測試腳本 - 驗證 Ops Orchestrator 運作
 *
 * 執行方式:
 * bun run packages/services/scripts/test-ops-orchestrator.ts
 */

import { createOpsOrchestrator } from "../src/ops/orchestrator.js";

async function main() {
  console.log("=".repeat(60));
  console.log("Testing Ops Orchestrator");
  console.log("=".repeat(60));
  console.log();

  // 建立 Orchestrator
  const orchestrator = createOpsOrchestrator({
    enableParallelChecks: true,
    enableAutoRepair: true,
    checkTimeoutMs: 30_000,
    repairTimeoutMs: 30_000,
  });

  console.log("✅ Orchestrator created successfully");
  console.log();

  // 執行健康檢查與修復
  console.log("🔍 Starting health checks and auto-repair...");
  console.log();

  try {
    const summary = await orchestrator.execute();

    console.log("=".repeat(60));
    console.log("Execution Summary");
    console.log("=".repeat(60));
    console.log(`Timestamp: ${summary.timestamp.toISOString()}`);
    console.log(`Total Time: ${summary.totalTimeMs}ms`);
    console.log();
    console.log("Health Checks:");
    console.log(`  ✅ Healthy: ${summary.healthyCount}`);
    console.log(`  ⚠️  Degraded: ${summary.degradedCount}`);
    console.log(`  🚨 Critical: ${summary.criticalCount}`);
    console.log();

    if (summary.repairResults.length > 0) {
      console.log("Auto-Repairs:");
      console.log(`  ✅ Successful: ${summary.repairSuccessCount}`);
      console.log(`  ❌ Failed: ${summary.repairFailureCount}`);
      console.log();
    }

    // 顯示詳細結果
    console.log("=".repeat(60));
    console.log("Detailed Results");
    console.log("=".repeat(60));
    console.log();

    for (const checkResult of summary.checkResults) {
      const statusEmoji =
        checkResult.status === "healthy"
          ? "✅"
          : checkResult.status === "degraded"
            ? "⚠️"
            : "🚨";

      console.log(`${statusEmoji} ${checkResult.toolName}`);
      console.log(`   Status: ${checkResult.status.toUpperCase()}`);
      if (checkResult.details) {
        console.log(`   Details: ${checkResult.details}`);
      }
      if (checkResult.metrics) {
        console.log(
          `   Metrics: ${JSON.stringify(checkResult.metrics, null, 2)}`
        );
      }
      console.log();
    }

    if (summary.repairResults.length > 0) {
      console.log("=".repeat(60));
      console.log("Repair Results");
      console.log("=".repeat(60));
      console.log();

      for (const repairResult of summary.repairResults) {
        const statusEmoji = repairResult.success ? "✅" : "❌";
        console.log(`${statusEmoji} ${repairResult.toolName}`);
        console.log(`   Success: ${repairResult.success}`);
        console.log(`   Details: ${repairResult.details}`);
        if (repairResult.executionTimeMs) {
          console.log(`   Execution Time: ${repairResult.executionTimeMs}ms`);
        }
        console.log();
      }
    }

    // 產生 Markdown 報告
    console.log("=".repeat(60));
    console.log("Markdown Report");
    console.log("=".repeat(60));
    console.log();
    const report = orchestrator.generateReport(summary);
    console.log(report);
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("=".repeat(60));
    console.log("✅ Test completed successfully");
    console.log("=".repeat(60));
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
