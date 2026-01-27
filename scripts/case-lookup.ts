#!/usr/bin/env bun
/**
 * 快速查詢特定案件狀態
 * 用法: bun run scripts/case-lookup.ts <案件編號>
 * 範例: bun run scripts/case-lookup.ts 202601-IC918
 */

const API_URL = "https://sales-ai-server.salesaiautomationv3.workers.dev";
const API_TOKEN = process.env.API_TOKEN || "F2KdnY5rcg+HNHL97BxsKy91eB7RfNbrb6v/mXXcalM=";

interface Conversation {
  id: string;
  caseNumber: string;
  status: string;
  opportunityCompanyName: string;
  customerNumber: string;
  createdAt: string;
  hasAnalysis: boolean;
  meddicScore: number | null;
  audioUrl: string;
  duration: number;
}

interface Opportunity {
  id: string;
  opportunityNumber: string;
  companyName: string;
  contactName: string | null;
  status: string;
  meddicScore: { overall: number } | null;
  createdAt: string;
}

async function lookupCase(caseNumber: string) {
  const startTime = Date.now();

  // 正規化案件編號 (支援多種格式: IC918, 202601-IC918, 918)
  const normalizedInput = caseNumber.toUpperCase();

  console.log(`\n🔍 查詢案件: ${caseNumber}\n`);

  try {
    // 方法 1: 搜尋 conversations (API 目前沒有 caseNumber filter，需要客戶端過濾)
    const convResponse = await fetch(`${API_URL}/rpc/conversations/list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({ json: { limit: 100 } }),
    });

    if (convResponse.ok) {
      const convData = await convResponse.json() as { json: { items: Conversation[] } };

      // 搜尋匹配的案件 (支援多種格式)
      const conversation = convData.json.items.find((c) => {
        if (!c.caseNumber) return false;
        const cn = c.caseNumber.toUpperCase();
        // 完全匹配
        if (cn === normalizedInput) return true;
        // 部分匹配 (e.g., "IC918" matches "202601-IC918")
        if (cn.includes(normalizedInput)) return true;
        // 抽取數字進行匹配 (e.g., "918" matches "202601-IC918")
        const inputNum = normalizedInput.match(/\d+$/)?.[0];
        const cnNum = cn.match(/\d+$/)?.[0];
        if (inputNum && cnNum && inputNum === cnNum) return true;
        return false;
      });

      if (conversation) {
        printConversationStatus(conversation);
        console.log(`\n⏱️  查詢耗時: ${Date.now() - startTime}ms`);
        return;
      }
    }

    // 方法 2: 搜尋 opportunities
    const searchTerm = caseNumber.replace("202601-", "").replace("IC", "");
    const oppResponse = await fetch(`${API_URL}/rpc/opportunities/list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({ json: { search: searchTerm, limit: 20 } }),
    });

    if (oppResponse.ok) {
      const oppData = await oppResponse.json() as { json: { opportunities: Opportunity[] } };
      const opportunity = oppData.json.opportunities.find(
        (o) => o.opportunityNumber === caseNumber ||
               o.customerNumber === caseNumber ||
               o.opportunityNumber?.includes(searchTerm)
      );

      if (opportunity) {
        printOpportunityStatus(opportunity);
        console.log(`\n⏱️  查詢耗時: ${Date.now() - startTime}ms`);
        return;
      }
    }

    // 找不到
    console.log(`❌ 找不到案件: ${caseNumber}`);
    console.log("\n可能原因:");
    console.log("  1. 案件編號輸入錯誤");
    console.log("  2. 音檔上傳尚未完成（Slack Bot 處理中）");
    console.log("  3. 上傳過程發生錯誤");

    // 顯示最近案件供參考
    console.log("\n📋 最近 5 筆案件:");
    const recentResponse = await fetch(`${API_URL}/rpc/conversations/list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({ json: { limit: 5 } }),
    });

    if (recentResponse.ok) {
      const recentData = await recentResponse.json() as { json: { items: Conversation[] } };
      for (const c of recentData.json.items) {
        const status = getStatusEmoji(c.status);
        console.log(`  ${status} ${c.caseNumber}: ${c.opportunityCompanyName}`);
      }
    }

    console.log(`\n⏱️  查詢耗時: ${Date.now() - startTime}ms`);

  } catch (error) {
    console.error("❌ 查詢失敗:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function printConversationStatus(conv: Conversation) {
  const status = getStatusEmoji(conv.status);

  console.log("═".repeat(50));
  console.log(`📋 案件編號: ${conv.caseNumber}`);
  console.log(`🏢 公司名稱: ${conv.opportunityCompanyName}`);
  console.log(`🔖 客戶編號: ${conv.customerNumber}`);
  console.log("═".repeat(50));
  console.log(`\n📊 處理狀態: ${status} ${conv.status.toUpperCase()}`);

  if (conv.status === "completed") {
    console.log(`✅ 轉錄完成`);
    if (conv.hasAnalysis) {
      console.log(`✅ MEDDIC 分析完成`);
      if (conv.meddicScore !== null) {
        console.log(`   總分: ${conv.meddicScore}/100`);
      }
    } else {
      console.log(`⏳ MEDDIC 分析處理中...`);
    }
  } else if (conv.status === "processing") {
    console.log(`🔄 正在處理中...`);
    console.log(`   請稍候 1-3 分鐘`);
  } else if (conv.status === "pending") {
    console.log(`⏳ 等待處理`);
    console.log(`   Queue Worker 將自動處理`);
  } else if (conv.status === "failed") {
    console.log(`❌ 處理失敗`);
    console.log(`   請檢查 queue-worker 日誌`);
  }

  if (conv.duration > 0) {
    const minutes = Math.floor(conv.duration / 60);
    const seconds = conv.duration % 60;
    console.log(`\n🎵 音檔長度: ${minutes}分${seconds}秒`);
  }

  console.log(`\n📅 建立時間: ${new Date(conv.createdAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}`);
}

function printOpportunityStatus(opp: Opportunity) {
  console.log("═".repeat(50));
  console.log(`📋 案件編號: ${opp.opportunityNumber}`);
  console.log(`🏢 公司名稱: ${opp.companyName}`);
  if (opp.contactName) {
    console.log(`👤 聯絡人: ${opp.contactName}`);
  }
  console.log("═".repeat(50));
  console.log(`\n📊 商機狀態: ${opp.status}`);

  if (opp.meddicScore) {
    console.log(`✅ MEDDIC 分析完成`);
    console.log(`   總分: ${opp.meddicScore.overall}/100`);
  } else {
    console.log(`⏳ 尚無 MEDDIC 分析`);
  }

  console.log(`\n📅 建立時間: ${new Date(opp.createdAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}`);
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case "completed": return "✅";
    case "processing": return "🔄";
    case "pending": return "⏳";
    case "failed": return "❌";
    default: return "❓";
  }
}

// Main
const caseNumber = process.argv[2];

if (!caseNumber) {
  console.log("用法: bun run scripts/case-lookup.ts <案件編號>");
  console.log("範例: bun run scripts/case-lookup.ts 202601-IC918");
  process.exit(1);
}

lookupCase(caseNumber);
