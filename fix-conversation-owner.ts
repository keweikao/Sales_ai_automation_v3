/**
 * 修復 conversation owner
 * 將 202601-IC019 的 owner 更新為新的 Google OAuth user
 */
import { db } from "@Sales_ai_automation_v3/db";
import {
  conversations,
  opportunities,
  users,
} from "@Sales_ai_automation_v3/db/schema";
import { eq } from "drizzle-orm";

const CONVERSATION_ID = "cf75684f-4f5b-4667-8e09-0cd50262d9bc";
const NEW_USER_ID = "EcVY4mP1Jqaqr0IzO4H3No4wEUhq5q05"; // stephen.kao@ichef.com.tw (Google OAuth)

async function main() {
  console.log("🔧 修復 conversation owner...\n");

  // 1. 查詢 conversation
  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, CONVERSATION_ID),
    with: {
      opportunity: {
        with: {
          user: true,
        },
      },
    },
  });

  if (!conv) {
    console.error("❌ Conversation not found");
    return;
  }

  console.log("📋 目前狀態:");
  console.log(`  案件: ${conv.caseNumber}`);
  console.log(`  公司: ${conv.opportunity.companyName}`);
  console.log(
    `  目前 Owner: ${conv.opportunity.user.name} (${conv.opportunity.user.email})`
  );
  console.log(`  目前 User ID: ${conv.opportunity.user.id}`);

  // 2. 查詢新的 user
  const newUser = await db.query.users.findFirst({
    where: eq(users.id, NEW_USER_ID),
  });

  if (!newUser) {
    console.error("\n❌ 新的 user 不存在");
    return;
  }

  console.log(`\n✓ 新的 Owner: ${newUser.name} (${newUser.email})`);
  console.log(`  新的 User ID: ${newUser.id}`);

  // 3. 更新 opportunity 的 owner
  console.log("\n🔄 更新 opportunity owner...");
  await db
    .update(opportunities)
    .set({
      userId: NEW_USER_ID,
      updatedAt: new Date(),
    })
    .where(eq(opportunities.id, conv.opportunityId));

  console.log("✅ 更新成功!");
  console.log("\n現在您應該可以在 Dashboard 看到這個案件了。");
}

main().catch(console.error);
