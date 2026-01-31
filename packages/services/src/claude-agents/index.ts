/**
 * Claude Agents 模組
 *
 * 使用 Claude Agent SDK 實現的各種自動化代理人
 *
 * @example
 * ```typescript
 * import { reviewPullRequest } from "@sales_ai_automation_v3/services/claude-agents";
 *
 * const result = await reviewPullRequest(123);
 * ```
 */

// 開發自動化代理人
export {
  formatReviewAsMarkdown,
  reviewPullRequest,
  securityScan,
} from "./dev/pr-reviewer.js";

// TODO: Phase 2 - 診斷代理人
// export { diagnoseConversation, diagnoseSystemHealth } from "./ops/diagnose.js";
// export { analyzeQueueWorkerLogs, analyzeKVCachePerformance } from "./ops/cloudflare.js";

// TODO: Phase 3 - E2E 測試修復
// export { fixE2ETests } from "./dev/e2e-fixer.js";

// TODO: Phase 4 - Coach 增強
// export { getInteractiveCoaching } from "./sales/coach-enhanced.js";

// TODO: Phase 5 - 銷售記憶
// export { saveCustomerMemory, getCustomerHistory } from "./sales/memory-manager.js";
