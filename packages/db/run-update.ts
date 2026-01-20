import { eq, sql } from "drizzle-orm";
import { db } from "./src/index";
import { opportunities } from "./src/schema";

const CONVERSATION_ID = "cf75684f-4f5b-4667-8e09-0cd50262d9bc";
const NEW_USER_ID = "EcVY4mP1Jqaqr0IzO4H3No4wEUhq5q05";

async function main() {
  console.log("🔧 更新 conversation owner...\n");

  // 查詢目前狀態
  const before = await db.execute(sql`
    SELECT 
      c.case_number,
      o.company_name,
      u.name as owner_name,
      u.email as owner_email,
      u.id as owner_id,
      o.id as opportunity_id
    FROM conversations c
    JOIN opportunities o ON c.opportunity_id = o.id
    JOIN "user" u ON o.user_id = u.id
    WHERE c.id = ${CONVERSATION_ID}
  `);

  console.log("📋 更新前:", before.rows[0]);

  // 更新 owner
  const opportunityId = (before.rows[0] as any).opportunity_id;
  await db
    .update(opportunities)
    .set({
      userId: NEW_USER_ID,
      updatedAt: new Date(),
    })
    .where(eq(opportunities.id, opportunityId));

  // 驗證更新
  const after = await db.execute(sql`
    SELECT 
      c.case_number,
      o.company_name,
      u.name as owner_name,
      u.email as owner_email,
      u.id as owner_id
    FROM conversations c
    JOIN opportunities o ON c.opportunity_id = o.id
    JOIN "user" u ON o.user_id = u.id
    WHERE c.id = ${CONVERSATION_ID}
  `);

  console.log("\n✅ 更新後:", after.rows[0]);
  console.log("\n現在重新整理 Dashboard 應該可以看到案件了!");
}

main()
  .catch(console.error)
  .finally(() => process.exit());
