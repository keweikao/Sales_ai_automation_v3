/**
 * tRPC POC App Router
 */

import { conversationRouter } from "./routers/conversation.js";
import { router } from "./trpc.js";

export const appRouter = router({
  conversation: conversationRouter,
});

export type AppRouter = typeof appRouter;
