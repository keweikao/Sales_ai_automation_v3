/**
 * 測試 MEDDIC 分析 API
 * 使用最近的已轉錄對話進行測試
 */

const API_BASE_URL = "https://sales-ai-server.salesaiautomationv3.workers.dev";
const API_TOKEN = process.env.API_TOKEN || "";

async function testMeddicAPI() {
  console.log("🧪 Testing MEDDIC Analysis API...\n");

  // 1. 先列出最近的對話
  console.log("📋 Fetching recent conversations...");
  const listResponse = await fetch(`${API_BASE_URL}/rpc/conversations/list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({ json: {} }),
  });

  if (!listResponse.ok) {
    console.error("❌ Failed to list conversations:", listResponse.status);
    const text = await listResponse.text();
    console.error(text);
    return;
  }

  const listResult = await listResponse.json();
  console.log("✅ Conversations fetched");
  console.log(
    `Found ${listResult.json.conversations?.length || 0} conversations\n`
  );

  // 找出第一個 transcribed 狀態的對話
  const transcribedConv = listResult.json.conversations?.find(
    (c: any) => c.status === "transcribed"
  );

  if (!transcribedConv) {
    console.log("⚠️ No transcribed conversations found to test with");
    console.log("Please upload an audio file first\n");

    // 顯示現有對話狀態
    if (listResult.json.conversations?.length > 0) {
      console.log("Existing conversations:");
      listResult.json.conversations.slice(0, 5).forEach((c: any) => {
        console.log(`  - ${c.caseNumber}: ${c.status}`);
      });
    }
    return;
  }

  console.log(`🎯 Testing with conversation: ${transcribedConv.caseNumber}`);
  console.log(`   ID: ${transcribedConv.id}`);
  console.log(`   Status: ${transcribedConv.status}\n`);

  // 2. 執行 MEDDIC 分析
  console.log("🤖 Running MEDDIC analysis...");
  const startTime = Date.now();

  const analyzeResponse = await fetch(
    `${API_BASE_URL}/rpc/conversations/analyze`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({
        json: {
          conversationId: transcribedConv.id,
        },
      }),
    }
  );

  const duration = Date.now() - startTime;

  if (!analyzeResponse.ok) {
    console.error(
      `❌ Analysis failed (${duration}ms):`,
      analyzeResponse.status
    );
    const text = await analyzeResponse.text();
    console.error(text);
    return;
  }

  const analyzeResult = await analyzeResponse.json();
  console.log(`✅ Analysis completed in ${duration}ms\n`);

  // 3. 顯示結果
  console.log("📊 Analysis Results:");
  console.log(`   Overall Score: ${analyzeResult.json.overallScore}/100`);
  console.log(`   Status: ${analyzeResult.json.status}`);
  console.log("\n   MEDDIC Scores:");
  console.log(`   - Metrics: ${analyzeResult.json.dimensions.metrics.score}`);
  console.log(
    `   - Economic Buyer: ${analyzeResult.json.dimensions.economicBuyer.score}`
  );
  console.log(
    `   - Decision Criteria: ${analyzeResult.json.dimensions.decisionCriteria.score}`
  );
  console.log(
    `   - Decision Process: ${analyzeResult.json.dimensions.decisionProcess.score}`
  );
  console.log(
    `   - Identify Pain: ${analyzeResult.json.dimensions.identifyPain.score}`
  );
  console.log(`   - Champion: ${analyzeResult.json.dimensions.champion.score}`);

  console.log("\n✅ MEDDIC Analysis API is working correctly!");
}

// 執行測試
testMeddicAPI().catch(console.error);
