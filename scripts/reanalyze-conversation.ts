/**
 * 重新分析對話腳本
 * 用於將舊版本分析的對話重新用新版本的 agent 進行分析
 *
 * 使用方式:
 * bun run scripts/reanalyze-conversation.ts <conversationId>
 */

import { db } from "../packages/db/src/index";
import { conversations, meddicAnalyses } from "../packages/db/src/schema";
import {
  createGeminiClient,
  createOrchestrator,
} from "../packages/services/src/index";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const CONVERSATION_ID =
  process.argv[2] || "46fec504-5a9a-45d4-b08d-963aeb8d3dd6";

async function main() {
  console.log("🔄 開始重新分析對話:", CONVERSATION_ID);

  // 1. 獲取對話數據
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, CONVERSATION_ID),
    with: {
      opportunity: true,
      meddicAnalyses: {
        limit: 1,
        orderBy: (analyses, { desc }) => [desc(analyses.createdAt)],
      },
    },
  });

  if (!conversation) {
    console.error("❌ 對話不存在!");
    process.exit(1);
  }

  console.log("📋 對話資訊:");
  console.log("  - Case Number:", conversation.caseNumber);
  console.log("  - Status:", conversation.status);
  console.log("  - Company:", conversation.opportunity?.companyName);

  // 2. 檢查 transcript
  const transcript = conversation.transcript as {
    segments: Array<{
      speaker: string;
      text: string;
      start: number;
      end: number;
    }>;
    fullText: string;
  } | null;

  if (!transcript?.segments?.length) {
    console.error("❌ 沒有 transcript 數據!");
    process.exit(1);
  }

  console.log("📝 Transcript:", transcript.segments.length, "segments");

  // 3. 創建 Gemini client 和 orchestrator
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error("❌ 缺少 GEMINI_API_KEY 環境變數!");
    process.exit(1);
  }

  const geminiClient = createGeminiClient(geminiApiKey);
  const orchestrator = createOrchestrator(geminiClient);

  // 4. 執行分析
  console.log("\n🤖 開始 LLM 分析...");
  const startTime = Date.now();

  const transcriptSegments = transcript.segments.map((s) => ({
    speaker: s.speaker || "unknown",
    text: s.text,
    start: s.start,
    end: s.end,
  }));

  const analysisResult = await orchestrator.analyze(transcriptSegments, {
    leadId: conversation.opportunityId,
    conversationId: conversation.id,
    salesRep: conversation.slackUsername || "unknown",
    conversationDate: conversation.conversationDate || new Date(),
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ 分析完成! (耗時 ${duration}s)`);

  // 5. 檢查 agentOutputs
  console.log("\n📊 分析結果:");
  console.log(
    "  - agent2.pdcm_scores:",
    Boolean(analysisResult.agentOutputs?.agent2?.pdcm_scores)
  );
  console.log(
    "  - agent3.spin_analysis:",
    Boolean(analysisResult.agentOutputs?.agent3?.spin_analysis)
  );
  console.log("  - Overall Score:", analysisResult.overallScore);

  // 6. 更新或創建 meddic_analyses 記錄
  const existingAnalysis = conversation.meddicAnalyses?.[0];

  if (existingAnalysis) {
    console.log("\n💾 更新現有分析記錄:", existingAnalysis.id);
    await db
      .update(meddicAnalyses)
      .set({
        metricsScore: analysisResult.meddicScores?.metrics,
        economicBuyerScore: analysisResult.meddicScores?.economicBuyer,
        decisionCriteriaScore: analysisResult.meddicScores?.decisionCriteria,
        decisionProcessScore: analysisResult.meddicScores?.decisionProcess,
        identifyPainScore: analysisResult.meddicScores?.identifyPain,
        championScore: analysisResult.meddicScores?.champion,
        overallScore: analysisResult.overallScore,
        status: analysisResult.qualificationStatus,
        agentOutputs: analysisResult.agentOutputs as {
          agent1?: Record<string, unknown>;
          agent2?: Record<string, unknown>;
          agent3?: Record<string, unknown>;
          agent4?: Record<string, unknown>;
          agent5?: Record<string, unknown>;
          agent6?: Record<string, unknown>;
        },
      })
      .where(eq(meddicAnalyses.id, existingAnalysis.id));
  } else {
    console.log("\n💾 創建新的分析記錄...");
    await db.insert(meddicAnalyses).values({
      id: randomUUID(),
      conversationId: conversation.id,
      opportunityId: conversation.opportunityId,
      metricsScore: analysisResult.meddicScores?.metrics,
      economicBuyerScore: analysisResult.meddicScores?.economicBuyer,
      decisionCriteriaScore: analysisResult.meddicScores?.decisionCriteria,
      decisionProcessScore: analysisResult.meddicScores?.decisionProcess,
      identifyPainScore: analysisResult.meddicScores?.identifyPain,
      championScore: analysisResult.meddicScores?.champion,
      overallScore: analysisResult.overallScore,
      status: analysisResult.qualificationStatus,
      agentOutputs: analysisResult.agentOutputs as {
        agent1?: Record<string, unknown>;
        agent2?: Record<string, unknown>;
        agent3?: Record<string, unknown>;
        agent4?: Record<string, unknown>;
        agent5?: Record<string, unknown>;
        agent6?: Record<string, unknown>;
      },
    });
  }

  console.log("\n🎉 完成! 對話已重新分析");
  console.log("刷新頁面即可看到 PDCM SPIN 數據");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ 錯誤:", e);
    process.exit(1);
  });
