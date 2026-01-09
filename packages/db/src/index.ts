import { neon, neonConfig } from "@neondatabase/serverless";
import { env } from "@Sales_ai_automation_v3/env/server";
import { drizzle } from "drizzle-orm/neon-http";
import ws from "ws";

import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

const sql = neon(env.DATABASE_URL || "");
export const db = drizzle(sql, { schema });
