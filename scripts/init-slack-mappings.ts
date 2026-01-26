/**
 * 初始化 Slack User ID 映射
 *
 * 將 Slack User ID 寫入 user_profiles.slack_user_id 欄位
 * 讓系統可以將 Slack 上傳的音檔正確歸屬到對應的業務
 *
 * 執行方式：
 * bun run scripts/init-slack-mappings.ts
 */

import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Slack ID 到 Email 的映射
const SLACK_MAPPINGS: Record<string, string> = {
  U0BU3PESX: "stephen.kao@ichef.com.tw",
  UCPDC51A4: "solo.chung@ichef.com.tw",
  UEVG3HUF4: "kevin.chen@ichef.com.tw",
  U07K188QJFQ: "belle.chen@ichef.com.tw",
  U8TC4Q7HB: "eileen.lee@ichef.com.tw",
  U06U7HUEZFT: "ariel.liu@ichef.com.tw",
  U028Q69EKF1: "kim.liang@ichef.com.tw",
  U01FS5DQT0T: "bonnie.liu@ichef.com.tw",
  U015SA8USQ1: "anna.yang@ichef.com.tw",
  U0MATRQ2U: "eddie.chan@ichef.com.tw",
  U041VGKJGA1: "joy.wu@ichef.com.tw",
  US97EGHJ5: "mai.chang@ichef.com.tw",
};

async function initSlackMappings() {
  console.log("🚀 開始初始化 Slack User ID 映射...\n");

  let successCount = 0;
  let skipCount = 0;
  let notFoundCount = 0;

  for (const [slackId, email] of Object.entries(SLACK_MAPPINGS)) {
    // 1. 查找對應的 user
    const users = await sql`
      SELECT id, name, email
      FROM "user"
      WHERE LOWER(email) = LOWER(${email})
    `;

    if (users.length === 0) {
      console.log(`❌ 找不到用戶: ${email}`);
      notFoundCount++;
      continue;
    }

    const userData = users[0];

    // 2. 檢查是否已有 userProfiles
    const profiles = await sql`
      SELECT user_id, slack_user_id, role
      FROM user_profiles
      WHERE user_id = ${userData.id}
    `;

    if (profiles.length > 0) {
      const existingProfile = profiles[0];

      // 已存在映射且相同
      if (existingProfile.slack_user_id === slackId) {
        console.log(`⏭️  已存在映射: ${email} -> ${slackId}`);
        skipCount++;
        continue;
      }

      // 更新現有 profile
      await sql`
        UPDATE user_profiles
        SET slack_user_id = ${slackId}, updated_at = NOW()
        WHERE user_id = ${userData.id}
      `;

      console.log(`✅ 更新映射: ${email} -> ${slackId}`);
    } else {
      // 建立新的 profile
      await sql`
        INSERT INTO user_profiles (user_id, slack_user_id, role, created_at, updated_at)
        VALUES (${userData.id}, ${slackId}, 'sales_rep', NOW(), NOW())
      `;

      console.log(
        `✅ 新增映射: ${email} -> ${slackId} (userId: ${userData.id})`
      );
    }

    successCount++;
  }

  console.log("\n📊 映射結果:");
  console.log(`   ✅ 成功: ${successCount}`);
  console.log(`   ⏭️  已存在: ${skipCount}`);
  console.log(`   ❌ 找不到: ${notFoundCount}`);

  // 顯示最終結果
  console.log("\n📋 目前所有 Slack 映射:");
  const allMappings = await sql`
    SELECT u.email, up.slack_user_id, up.role
    FROM user_profiles up
    JOIN "user" u ON u.id = up.user_id
    WHERE up.slack_user_id IS NOT NULL
    ORDER BY u.email
  `;

  for (const m of allMappings) {
    console.log(`   ${m.email} -> ${m.slack_user_id} (${m.role})`);
  }

  console.log("\n✨ 完成！");
}

// 執行
initSlackMappings()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ 執行失敗:", err);
    process.exit(1);
  });
