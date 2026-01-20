/**
 * 檢查 conversation 的 owner
 */
import { db } from "@Sales_ai_automation_v3/db";
import { conversations } from "@Sales_ai_automation_v3/db/schema";
import { eq } from "drizzle-orm";

const conversationId = "cf75684f-4f5b-4667-8e09-0cd50262d9bc";

async function main() {
  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
    with: {
      opportunity: {
        with: {
          user: true,
        },
      },
    },
  });

  if (!conv) {
    console.log("❌ Conversation not found in database");
    return;
  }

  console.log("✅ Conversation found:");
  console.log(`  Case Number: ${conv.caseNumber}`);
  console.log(`  Status: ${conv.status}`);
  console.log(`  Company: ${conv.opportunity.companyName}`);
  console.log("\n👤 Owner:");
  console.log(`  Name: ${conv.opportunity.user.name}`);
  console.log(`  Email: ${conv.opportunity.user.email}`);
  console.log(`  User ID: ${conv.opportunity.user.id}`);

  console.log("\n💡 解決方案:");
  console.log("  1. 使用此 email 登入:", conv.opportunity.user.email);
  console.log("  2. 或將您的 email 加入 ADMIN_EMAILS 白名單");
}

main().catch(console.error);
