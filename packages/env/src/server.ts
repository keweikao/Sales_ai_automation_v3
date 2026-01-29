/// <reference path="../env.d.ts" />
// For Cloudflare Workers, env is accessed via cloudflare:workers module
// For local/Node.js/Bun: falls back to process.env
// Types are defined in env.d.ts based on your alchemy.run.ts bindings

let env: Record<string, string | undefined>;

try {
  const cloudflareModule = await import("cloudflare:workers");
  env = cloudflareModule.env;
} catch {
  env = process.env as Record<string, string | undefined>;
}

export { env };
