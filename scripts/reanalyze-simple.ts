/**
 * 簡易重新分析腳本 - 直接使用 Gemini API
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL || "");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const CONVERSATION_ID =
  process.argv[2] || "46fec504-5a9a-45d4-b08d-963aeb8d3dd6";

async function main() {
  console.log("🔄 開始重新分析對話:", CONVERSATION_ID);

  // 1. 獲取 transcript
  const convResult = await sql`
    SELECT transcript, opportunity_id
    FROM conversations
    WHERE id = ${CONVERSATION_ID}
  `;

  if (convResult.length === 0) {
    console.error("❌ 對話不存在!");
    process.exit(1);
  }

  const transcript = convResult[0].transcript as {
    fullText?: string;
    segments?: unknown[];
  };
  if (!transcript?.fullText) {
    console.error("❌ 沒有 transcript!");
    process.exit(1);
  }

  console.log("📝 Transcript length:", transcript.fullText.length, "chars");

  // 2. 調用 Gemini 進行 PDCM SPIN 分析
  console.log("\n🤖 調用 Gemini 進行 PDCM+SPIN 分析...");

  const prompt = `你是一位專業的銷售分析師和教練。請分析以下銷售對話，提供完整的 PDCM、SPIN 和戰術建議評估。

## 對話內容
${transcript.fullText.substring(0, 15000)}

## 請提供以下分析（以 JSON 格式回覆，不要包含 markdown code block）：

{
  "pdcm_scores": {
    "pain": {
      "score": 0-100,
      "level": "high/medium/low",
      "urgency": "高/中/低",
      "evidence": ["證據1", "證據2"]
    },
    "decision": {
      "score": 0-100,
      "level": "high/medium/low",
      "evidence": ["證據1"]
    },
    "champion": {
      "score": 0-100,
      "level": "high/medium/low",
      "evidence": ["證據1"]
    },
    "metrics": {
      "score": 0-100,
      "level": "high/medium/low",
      "evidence": ["證據1"]
    },
    "total_score": 0-100
  },
  "spin_analysis": {
    "situation": { "score": 0-100, "achieved": true/false },
    "problem": { "score": 0-100, "achieved": true/false },
    "implication": { "score": 0-100, "achieved": true/false, "gap": "描述缺口" },
    "need_payoff": { "score": 0-100, "achieved": true/false },
    "spin_completion_rate": 0-100,
    "key_gap": "關鍵缺口描述",
    "improvement_suggestion": "改進建議"
  },
  "tactical_suggestions": [
    {
      "trigger": "客戶說的話或情境",
      "suggestion": "建議的應對策略",
      "talk_track": "具體的話術範例",
      "priority": "high/medium/low"
    }
  ],
  "pdcm_spin_alerts": {
    "no_metrics": {
      "triggered": true/false,
      "message": "如果客戶沒有提到具體數字目標，這裡說明為什麼需要追問"
    },
    "shallow_discovery": {
      "triggered": true/false,
      "message": "如果問題挖掘不夠深入，這裡說明需要加強的地方"
    },
    "no_urgency": {
      "triggered": true/false,
      "message": "如果沒有建立急迫性，這裡說明如何創造緊迫感"
    }
  }
}`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();

  // 解析 JSON（移除可能的 markdown code block）
  let analysisJson: {
    pdcm_scores?: { total_score?: number };
    spin_analysis?: { spin_completion_rate?: number };
    tactical_suggestions?: Array<{
      trigger: string;
      suggestion: string;
      talk_track: string;
      priority: string;
    }>;
    pdcm_spin_alerts?: Record<string, { triggered: boolean; message: string }>;
  };
  try {
    const cleanJson = responseText.replace(/```json\n?|```\n?/g, "").trim();
    analysisJson = JSON.parse(cleanJson);
  } catch {
    console.error("❌ 無法解析 JSON:", responseText.substring(0, 500));
    process.exit(1);
  }

  console.log("✅ 分析完成!");
  console.log("  - PDCM Total Score:", analysisJson.pdcm_scores?.total_score);
  console.log(
    "  - SPIN Completion:",
    analysisJson.spin_analysis?.spin_completion_rate,
    "%"
  );
  console.log(
    "  - Tactical Suggestions:",
    analysisJson.tactical_suggestions?.length || 0
  );

  // 3. 更新數據庫
  console.log("\n💾 更新數據庫...");

  // 獲取現有的 agent_outputs
  const analysisResult = await sql`
    SELECT id, agent_outputs
    FROM meddic_analyses
    WHERE conversation_id = ${CONVERSATION_ID}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (analysisResult.length === 0) {
    console.error("❌ 沒有找到分析記錄!");
    process.exit(1);
  }

  const analysisId = analysisResult[0].id as string;
  const agentOutputs = analysisResult[0].agent_outputs as Record<
    string,
    Record<string, unknown>
  >;

  // 合併新的 PDCM SPIN 和戰術建議數據到現有的 agent_outputs
  const updatedOutputs = {
    ...agentOutputs,
    agent2: {
      ...agentOutputs?.agent2,
      pdcm_scores: analysisJson.pdcm_scores,
    },
    agent3: {
      ...agentOutputs?.agent3,
      spin_analysis: analysisJson.spin_analysis,
    },
    agent6: {
      ...agentOutputs?.agent6,
      tactical_suggestions: analysisJson.tactical_suggestions,
      pdcm_spin_alerts: analysisJson.pdcm_spin_alerts,
    },
  };

  await sql`
    UPDATE meddic_analyses
    SET agent_outputs = ${JSON.stringify(updatedOutputs)}::jsonb
    WHERE id = ${analysisId}
  `;

  console.log("\n🎉 完成! 刷新頁面即可看到 PDCM SPIN 數據");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ 錯誤:", e);
    process.exit(1);
  });
