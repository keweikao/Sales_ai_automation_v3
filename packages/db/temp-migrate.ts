import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const migrationSQL = readFileSync(
  "./migrations/0004_add_opportunity_business_context.sql",
  "utf-8"
);

try {
  console.log(
    "[Migration] Executing 0004_add_opportunity_business_context.sql"
  );

  // Split by semicolons and execute each statement
  const statements = migrationSQL
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await sql(statement);
    console.log(`[Migration] ✓ Executed: ${statement.substring(0, 50)}...`);
  }

  console.log("[Migration] ✅ Migration completed successfully");
} catch (error) {
  console.error("[Migration] ❌ Migration failed:", error);
  process.exit(1);
}
