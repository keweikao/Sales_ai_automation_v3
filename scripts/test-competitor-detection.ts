/**
 * 競品偵測功能測試腳本
 * 用於驗證 Agent 2 競品偵測 和 Agent 6 競品應對評估
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// 測試用對話 - 包含競品提及
const TEST_TRANSCRIPT = `
業務：王老闆您好，我是 iCHEF 的業務小陳，今天來跟您聊聊餐廳 POS 系統的需求。

客戶：哦，你們 iCHEF 啊，我之前有聽過。我現在用的是肚肚，用了快兩年了。

業務：原來您已經有在用系統了，方便問一下，肚肚用起來還順手嗎？

客戶：說實話，功能是還可以啦，但是常常在忙的時候當機，上個月尖峰時段出單機掛掉兩次，客人等很久，我們也沒辦法。

業務：喔...我們功能比較多啦...

客戶：功能多是好，但我比較在意穩定度。對了，我朋友開火鍋店的用 Eats365，他說功能很齊全，你們比得過嗎？

業務：我們也有很多功能，而且我們是台灣公司，比較了解在地需求。

客戶：這樣啊，那價格呢？肚肚現在一個月 1200，你們多少？

業務：我們的方案是月租 1688 起，但包含更完整的功能...

客戶：比肚肚貴欸，我要考慮一下。
`;

// Agent 2 Prompt (競品偵測)
const AGENT2_PROMPT = `你是 PDCM 客戶分析專家。請分析以下銷售對話，特別注意競品偵測。

## 對話內容
${TEST_TRANSCRIPT}

## 競品偵測指引

### 餐飲競品關鍵詞
| 競品 | 關鍵詞 |
|------|--------|
| 肚肚 | 肚肚, Dudoo, dudu |
| Eats365 | Eats365, eats, 365 |
| 微碧 | 微碧, Weiby, weiby |
| 大麥 | 大麥, MaiFood, maifood |
| 開店快手 | 開店快手, 中保, 快手 |

如果偵測到競品，記錄：
- 競品名稱（標準化）
- 客戶原話
- 客戶態度（positive/negative/neutral）

## 請回傳 JSON（不要 markdown code block）：

{
  "pdcm_scores": {
    "pain": { "score": 0, "level": "P1_Critical/P2_High/P3_Medium/P4_Low", "main_pain": "主要痛點", "urgency": "立即/近期/未來", "evidence": [] },
    "decision": { "score": 0, "contact_role": "老闆/店長/員工", "has_authority": true, "budget_awareness": "有概念/不清楚/不提", "timeline": "急著要/近期/未定", "risk": "低/中/高" },
    "champion": { "score": 0, "attitude": "主動積極/中立觀望/冷淡推託", "customer_type": "衝動型/精算型/保守觀望型", "primary_criteria": "價格/功能/易用性/服務", "evidence": [] },
    "metrics": { "score": 0, "level": "M1_Complete/M2_Partial/M3_Weak/M4_Missing", "total_monthly_impact": 0, "annual_impact": 0 },
    "total_score": 0,
    "deal_probability": "高/中/低"
  },
  "current_system": "無/其他品牌/舊用戶",
  "detected_competitors": [
    {
      "name": "競品名稱",
      "customer_quote": "客戶原話",
      "attitude": "positive/negative/neutral"
    }
  ]
}`;

// Agent 6 Prompt (競品應對評估)
const AGENT6_PROMPT = `你是銷售教練，專門評估業務對競品的應對表現。

## 對話內容
${TEST_TRANSCRIPT}

## Agent 2 偵測到的競品
- 肚肚：客戶提到「用肚肚快兩年」「常常當機」「尖峰時段出單機掛掉」（態度：負面）
- Eats365：客戶提到「朋友用 Eats365，功能很齊全」（態度：正面）

## 競品應對評分標準
| 分數 | 標準 |
|------|------|
| 5 | 完美回應：有效化解競品威脅，成功轉向我方優勢 |
| 4 | 良好回應：提到差異化，但可以更具體 |
| 3 | 尚可回應：有回應但較空泛 |
| 2 | 弱回應：未針對痛點，缺乏說服力 |
| 1 | 無效回應：沒回應、迴避、或貶低競品 |

## 請回傳 JSON（不要 markdown code block）：

{
  "competitor_mentions": [
    {
      "competitor_name": "競品名稱",
      "mention_count": 1,
      "customer_attitude": "positive/negative/neutral",
      "quotes": ["客戶原話1", "客戶原話2"]
    }
  ],
  "competitor_threat_level": "high/medium/low/none",
  "competitor_handling_evaluation": [
    {
      "competitor_name": "競品名稱",
      "customer_quote": "客戶說了什麼",
      "rep_response": "業務怎麼回應",
      "score": 1-5,
      "evaluation": {
        "strengths": ["做得好的"],
        "weaknesses": ["待改進的"]
      },
      "recommended_response": "建議的更好回應",
      "improvement_tips": ["改進重點1", "改進重點2"]
    }
  ]
}`;

async function testAgent2CompetitorDetection() {
  console.log("\n📊 測試 Agent 2 競品偵測...\n");

  const result = await model.generateContent(AGENT2_PROMPT);
  const responseText = result.response.text().trim();

  try {
    const cleanJson = responseText.replace(/```json\n?|```\n?/g, "").trim();
    const output = JSON.parse(cleanJson);

    console.log("✅ Agent 2 輸出解析成功");
    console.log("\n🏷️ 偵測到的競品：");

    if (output.detected_competitors && output.detected_competitors.length > 0) {
      for (const comp of output.detected_competitors) {
        console.log(`  - ${comp.name}`);
        console.log(`    原話: 「${comp.customer_quote}」`);
        console.log(`    態度: ${comp.attitude}`);
      }
      console.log("\n✅ 競品偵測測試通過！");
      return output;
    } else {
      console.log("  ⚠️ 未偵測到競品（應該要偵測到肚肚和 Eats365）");
      console.log("  原始回應:", responseText.substring(0, 500));
      return null;
    }
  } catch (e) {
    console.error("❌ JSON 解析失敗:", e);
    console.log("原始回應:", responseText.substring(0, 500));
    return null;
  }
}

async function testAgent6CompetitorEvaluation() {
  console.log("\n🎯 測試 Agent 6 競品應對評估...\n");

  const result = await model.generateContent(AGENT6_PROMPT);
  const responseText = result.response.text().trim();

  try {
    const cleanJson = responseText.replace(/```json\n?|```\n?/g, "").trim();
    const output = JSON.parse(cleanJson);

    console.log("✅ Agent 6 輸出解析成功");

    // 競品提及摘要
    console.log("\n📊 競品提及摘要：");
    console.log(`  威脅程度: ${output.competitor_threat_level}`);

    if (output.competitor_mentions) {
      for (const mention of output.competitor_mentions) {
        console.log(
          `  - ${mention.competitor_name}: 提及 ${mention.mention_count} 次 (${mention.customer_attitude})`
        );
      }
    }

    // 競品應對評估
    console.log("\n🎯 競品應對評估：");
    if (output.competitor_handling_evaluation) {
      for (const evaluation of output.competitor_handling_evaluation) {
        const stars = "⭐".repeat(evaluation.score) + "☆".repeat(5 - evaluation.score);
        console.log(`\n  【${evaluation.competitor_name}】 ${stars} (${evaluation.score}/5)`);
        console.log(`  客戶: 「${evaluation.customer_quote}」`);
        console.log(`  業務: 「${evaluation.rep_response}」`);
        console.log(`  優點: ${evaluation.evaluation.strengths.join(", ") || "無"}`);
        console.log(`  缺點: ${evaluation.evaluation.weaknesses.join(", ") || "無"}`);
        console.log(`  建議: ${evaluation.recommended_response}`);
      }
      console.log("\n✅ 競品應對評估測試通過！");
      return output;
    } else {
      console.log("  ⚠️ 未產生競品應對評估");
      return null;
    }
  } catch (e) {
    console.error("❌ JSON 解析失敗:", e);
    console.log("原始回應:", responseText.substring(0, 500));
    return null;
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  競品偵測與應對評估功能測試");
  console.log("═══════════════════════════════════════════════════════════");

  // 測試 Agent 2
  const agent2Result = await testAgent2CompetitorDetection();

  // 測試 Agent 6
  const agent6Result = await testAgent6CompetitorEvaluation();

  // 總結
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  測試總結");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Agent 2 競品偵測: ${agent2Result ? "✅ 通過" : "❌ 失敗"}`);
  console.log(`  Agent 6 競品應對評估: ${agent6Result ? "✅ 通過" : "❌ 失敗"}`);

  if (agent2Result && agent6Result) {
    console.log("\n🎉 所有測試通過！競品分析功能運作正常。");
  } else {
    console.log("\n⚠️ 部分測試失敗，請檢查 prompt 設計。");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ 測試錯誤:", e);
    process.exit(1);
  });
