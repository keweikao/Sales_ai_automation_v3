/**
 * Execute Migration 0004 - Add Business Context Fields to Opportunities
 *
 * This script connects to Neon database and runs the migration SQL
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  console.error("\nPlease set DATABASE_URL in your environment or .env file");
  console.error(
    'Example: export DATABASE_URL="postgresql://user:pass@host/db"'
  );
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function executeMigration() {
  console.log("🚀 Starting Migration 0004: Add Business Context Fields");
  console.log("─────────────────────────────────────────────────────────\n");

  try {
    // Step 1: Add new columns
    console.log("📝 Step 1: Adding new columns to opportunities table...");
    await sql`
      ALTER TABLE opportunities
      ADD COLUMN IF NOT EXISTS store_type TEXT,
      ADD COLUMN IF NOT EXISTS service_type TEXT,
      ADD COLUMN IF NOT EXISTS staff_count TEXT,
      ADD COLUMN IF NOT EXISTS current_system TEXT,
      ADD COLUMN IF NOT EXISTS decision_maker_present TEXT
    `;
    console.log("✅ Columns added successfully\n");

    // Step 2: Add column comments
    console.log("📝 Step 2: Adding column comments...");
    await sql`COMMENT ON COLUMN opportunities.store_type IS '店型/店鋪類型 (e.g., coffee_shop, hair_salon)'`;
    await sql`COMMENT ON COLUMN opportunities.service_type IS '營運型態 (e.g., dine_in, takeout) - iCHEF only'`;
    await sql`COMMENT ON COLUMN opportunities.staff_count IS '員工數量 (e.g., 1-3, 4-10) - Beauty only'`;
    await sql`COMMENT ON COLUMN opportunities.current_system IS '現有POS/系統 (e.g., none, ichef_old, excel)'`;
    await sql`COMMENT ON COLUMN opportunities.decision_maker_present IS '決策者在場 (yes, no, unknown)'`;
    console.log("✅ Comments added successfully\n");

    // Step 3: Verify migration
    console.log("📝 Step 3: Verifying migration...");
    const result = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'opportunities'
        AND column_name IN ('store_type', 'service_type', 'staff_count', 'current_system', 'decision_maker_present')
      ORDER BY column_name
    `;

    console.log("✅ Migration verified! New columns:\n");
    console.table(result);

    console.log("\n🎉 Migration 0004 completed successfully!");
    console.log("─────────────────────────────────────────────────────────");
  } catch (error) {
    console.error("\n❌ Migration failed!");
    console.error("Error:", error);
    process.exit(1);
  }
}

// Run migration
executeMigration().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
