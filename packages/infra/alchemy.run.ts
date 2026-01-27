import alchemy from "alchemy";
import { Vite, Worker } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });

const app = await alchemy("Sales_ai_automation_v3", {
  password: process.env.ALCHEMY_PASSWORD || "change-this-in-production",
});

export const web = await Vite("web", {
  cwd: "../../apps/web",
  assets: "dist",
  bindings: {
    VITE_SERVER_URL: alchemy.env.VITE_SERVER_URL!,
  },
});

export const server = await Worker("server", {
  cwd: "../../apps/server",
  entrypoint: "src/index.ts",
  compatibility: "node",
  bindings: {
    // Database
    DATABASE_URL: alchemy.secret.env.DATABASE_URL!,
    DATABASE_URL_DIRECT: alchemy.secret.env.DATABASE_URL_DIRECT!,

    // Authentication
    BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
    BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL!,
    CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,

    // AI Services
    GEMINI_API_KEY: alchemy.secret.env.GEMINI_API_KEY!,
    GROQ_API_KEY: alchemy.secret.env.GROQ_API_KEY!,

    // Cloudflare R2 Storage
    CLOUDFLARE_R2_ACCESS_KEY: alchemy.secret.env.CLOUDFLARE_R2_ACCESS_KEY!,
    CLOUDFLARE_R2_SECRET_KEY: alchemy.secret.env.CLOUDFLARE_R2_SECRET_KEY!,
    CLOUDFLARE_R2_BUCKET: alchemy.env.CLOUDFLARE_R2_BUCKET!,
    CLOUDFLARE_R2_ENDPOINT: alchemy.env.CLOUDFLARE_R2_ENDPOINT!,

    // Google OAuth (optional)
    GOOGLE_CLIENT_ID: alchemy.env.GOOGLE_CLIENT_ID || "",
    GOOGLE_CLIENT_SECRET:
      alchemy.secret.env.GOOGLE_CLIENT_SECRET || alchemy.secret(""),

    // SMS Service (EVERY8D)
    EVERY8D_API_URL:
      alchemy.env.EVERY8D_API_URL ||
      "https://oms.every8d.com/API21/HTTP/sendSMS.ashx",
    EVERY8D_USERNAME: alchemy.secret.env.EVERY8D_USERNAME || alchemy.secret(""),
    EVERY8D_PASSWORD: alchemy.secret.env.EVERY8D_PASSWORD || alchemy.secret(""),

    // Share Token
    SHARE_TOKEN_SECRET:
      alchemy.secret.env.SHARE_TOKEN_SECRET ||
      alchemy.secret("default-secret-change-in-prod"),
    WEB_APP_URL: alchemy.env.WEB_APP_URL || "http://localhost:5173",

    // Environment
    ENVIRONMENT: alchemy.env.ENVIRONMENT!,

    // Service API Token (for Slack Bot authentication)
    API_TOKEN: alchemy.secret.env.API_TOKEN || alchemy.secret(""),
  },
  dev: {
    port: 3000,
  },
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();
