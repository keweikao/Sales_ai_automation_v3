#!/usr/bin/env bun
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

// Load environment variables
config({ path: "./apps/server/.env" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment");
  process.exit(1);
}

console.log("🔄 Connecting to database...");
const sql = neon(DATABASE_URL);

console.log("📝 Executing migration: Add error fields to conversations\n");

try {
  // Add error_message column
  console.log("1️⃣  Adding error_message column...");
  await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS error_message text`;
  console.log("✅ error_message column added");

  // Add error_details column
  console.log("2️⃣  Adding error_details column...");
  await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS error_details jsonb`;
  console.log("✅ error_details column added");

  // Verify the columns were added
  console.log("\n3️⃣  Verifying columns...");
  const result = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'conversations'
    AND column_name IN ('error_message', 'error_details')
    ORDER BY column_name;
  `;

  console.log("\n✅ Verification result:");
  for (const row of result) {
    console.log(`   - ${row.column_name}: ${row.data_type}`);
  }

  if (result.length === 2) {
    console.log("\n🎉 Migration completed successfully!");
  } else {
    console.warn(`\n⚠️  Warning: Expected 2 columns, found: ${result.length}`);
  }
} catch (error) {
  console.error("\n❌ Migration failed:", error);
  process.exit(1);
}
