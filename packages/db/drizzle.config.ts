import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// Only load .env file if DATABASE_URL is not already set (CI sets it directly)
if (!process.env.DATABASE_URL) {
  dotenv.config({
    path: "../../apps/server/.env",
  });
}

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
