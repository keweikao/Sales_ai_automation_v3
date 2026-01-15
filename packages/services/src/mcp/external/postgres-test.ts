/**
 * PostgreSQL MCP Tools - Test Version
 * 測試版本，直接使用 process.env 而非 cloudflare:workers 的 env
 */

import { neon, neonConfig } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import ws from "ws";
import { z } from "zod";
import type { MCPTool } from "../types.js";

// 設定 Neon WebSocket
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

// 取得資料庫 URL
const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// 建立測試用的資料庫連線
const sqlClient = neon(DATABASE_URL);
const testDb = drizzle(sqlClient);

// ============================================================
// PostgreSQL Query Tool
// ============================================================

const PostgresQueryInputSchema = z.object({
  query: z.string().min(1, "Query is required"),
  params: z.array(z.unknown()).optional(),
});

const PostgresQueryOutputSchema = z.object({
  rows: z.array(z.record(z.unknown())),
  rowCount: z.number(),
  fields: z.array(z.string()).optional(),
});

type PostgresQueryInput = z.infer<typeof PostgresQueryInputSchema>;
type PostgresQueryOutput = z.infer<typeof PostgresQueryOutputSchema>;

export const postgresQueryTool: MCPTool<
  PostgresQueryInput,
  PostgresQueryOutput
> = {
  name: "postgres_query",
  description:
    "執行 PostgreSQL SELECT 查詢。用於複雜的資料分析、報表生成、趨勢分析等。僅支援 SELECT 查詢以確保安全性。",
  inputSchema: PostgresQueryInputSchema,
  handler: async (input, _context) => {
    // 安全性檢查：僅允許 SELECT 查詢
    const trimmedQuery = input.query.trim().toLowerCase();
    if (!trimmedQuery.startsWith("select")) {
      throw new Error(
        "Only SELECT queries are allowed for security reasons. Use repair tools for data modifications."
      );
    }

    try {
      const result = await testDb.execute(sql.raw(input.query));

      return {
        rows: result.rows as Record<string, unknown>[],
        rowCount: result.rowCount ?? 0,
        fields: result.rows.length > 0 ? Object.keys(result.rows[0]) : [],
      };
    } catch (error) {
      throw new Error(
        `PostgreSQL query failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
};

// ============================================================
// PostgreSQL Schema Inspector Tool
// ============================================================

const PostgresSchemaInputSchema = z.object({
  tableName: z.string().optional(),
});

const PostgresSchemaOutputSchema = z.object({
  tables: z.array(
    z.object({
      name: z.string(),
      columns: z
        .array(
          z.object({
            name: z.string(),
            type: z.string(),
            nullable: z.boolean(),
          })
        )
        .optional(),
    })
  ),
});

type PostgresSchemaInput = z.infer<typeof PostgresSchemaInputSchema>;
type PostgresSchemaOutput = z.infer<typeof PostgresSchemaOutputSchema>;

export const postgresSchemaInspectorTool: MCPTool<
  PostgresSchemaInput,
  PostgresSchemaOutput
> = {
  name: "postgres_inspect_schema",
  description:
    "檢視資料庫 schema 結構，列出所有表或特定表的欄位定義。用於了解資料庫結構、產生查詢或驗證資料模型。",
  inputSchema: PostgresSchemaInputSchema,
  handler: async (input) => {
    try {
      let query: string;

      if (input.tableName) {
        // 查詢特定表的欄位
        query = `
          SELECT
            column_name as name,
            data_type as type,
            is_nullable = 'YES' as nullable
          FROM information_schema.columns
          WHERE table_name = '${input.tableName}'
            AND table_schema = 'public'
          ORDER BY ordinal_position
        `;
      } else {
        // 列出所有表
        query = `
          SELECT table_name as name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `;
      }

      const result = await testDb.execute(sql.raw(query));

      if (input.tableName) {
        return {
          tables: [
            {
              name: input.tableName,
              columns: result.rows as {
                name: string;
                type: string;
                nullable: boolean;
              }[],
            },
          ],
        };
      }

      return {
        tables: (result.rows as { name: string }[]).map((row) => ({
          name: row.name,
        })),
      };
    } catch (error) {
      throw new Error(
        `Schema inspection failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
};
