/**
 * Notifications module
 * 統一的通知服務
 */

// 導出 Block 構建器 (供高級用戶使用)
export {
  buildProcessingCompletedBlocks,
  buildProcessingFailedBlocks,
  buildProcessingStartedBlocks,
} from "./blocks.js";

// 導出服務
export { createSlackNotificationService } from "./slack.js";
// 導出類型
export type {
  MEDDICAnalysisResult,
  ProcessingCompletedParams,
  ProcessingFailedParams,
  ProcessingStartedParams,
  SlackNotificationConfig,
  SlackNotificationService,
} from "./types.js";
