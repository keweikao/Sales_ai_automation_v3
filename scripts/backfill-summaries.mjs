#!/usr/bin/env node
/**
 * 回填 conversations.summary 欄位
 * 從 meddic_analyses.agent_outputs.agent4.markdown 提取資料
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 載入環境變數
config({ path: resolve(__dirname, "../apps/server/.env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL 未設定");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function main() {
  console.log("🔄 開始回填 conversations.summary...\n");

  // 查詢所有有 agent4 輸出的分析記錄
  const analyses = await sql`
    SELECT
      ma.conversation_id,
      ma.agent_outputs -> 'agent4' ->> 'markdown' as summary,
      c.case_number,
      LENGTH(ma.agent_outputs -> 'agent4' ->> 'markdown') as summary_length
    FROM meddic_analyses ma
    JOIN conversations c ON c.id = ma.conversation_id
    WHERE ma.agent_outputs -> 'agent4' ->> 'markdown' IS NOT NULL
    AND c.summary IS NULL;
  `;

  console.log(`找到 ${analyses.length} 筆需要回填的記錄\n`);

  if (analyses.length === 0) {
    console.log("✅ 所有對話都已有 summary，無需回填");
    return;
  }

  console.log("待回填的對話：");
  console.table(analyses.map(a => ({
    case_number: a.case_number,
    conversation_id: a.conversation_id.substring(0, 8) + '...',
    summary_length: a.summary_length
  })));

  console.log("\n開始回填...\n");

  let successCount = 0;
  let failCount = 0;

  for (const record of analyses) {
    try {
      // 直接使用 SQL 更新
      await sql`
        UPDATE conversations
        SET
          summary = ${record.summary},
          updated_at = NOW()
        WHERE id = ${record.conversation_id};
      `;

      console.log(`✅ ${record.case_number}: 回填成功 (${record.summary_length} 字)`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${record.case_number}: 回填失敗`, error.message);
      failCount++;
    }
  }

  console.log(`\n\n📊 回填結果：`);
  console.log(`成功: ${successCount} 筆`);
  console.log(`失敗: ${failCount} 筆`);

  if (successCount > 0) {
    console.log("\n✅ 回填完成！現在可以測試分享功能了。");
  }
}

main().catch(console.error);
