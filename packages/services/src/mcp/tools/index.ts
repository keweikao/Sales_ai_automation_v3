/**
 * MCP Tools Index
 * 匯出所有可用的 MCP Tools
 */

// ============================================================
// Schedule Follow-up Tool
// ============================================================

export type {
  ScheduleFollowUpInput,
  ScheduleFollowUpOutput,
} from "./schedule-follow-up.js";
export {
  createScheduleFollowUpTool,
  scheduleFollowUpInputSchema,
  scheduleFollowUpTool,
} from "./schedule-follow-up.js";

// ============================================================
// Get Rep Performance Tool
// ============================================================

export type {
  GetRepPerformanceInput,
  GetRepPerformanceOutput,
  PerformancePeriod,
  PerformanceTrend,
} from "./get-rep-performance.js";
export {
  getRepPerformance,
  getRepPerformanceTool,
} from "./get-rep-performance.js";

// ============================================================
// Send Alert Tool
// ============================================================

export type { SendAlertInput, SendAlertOutput } from "./send-alert.js";
export { sendAlert, sendAlertTool } from "./send-alert.js";

// ============================================================
// Get Competitor Info Tool
// ============================================================

export type {
  GetCompetitorInfoInput,
  GetCompetitorInfoOutput,
} from "./get-competitor-info.js";
export {
  getCompetitorInfo,
  getCompetitorInfoTool,
  listAllCompetitors,
} from "./get-competitor-info.js";

// ============================================================
// Query Similar Cases Tool
// ============================================================

export type {
  QuerySimilarCasesInput,
  QuerySimilarCasesOutput,
  SimilarCase,
} from "./query-similar-cases.js";
export {
  createQuerySimilarCasesTool,
  QuerySimilarCasesTool,
  querySimilarCasesToolDefinition,
} from "./query-similar-cases.js";

// ============================================================
// Get Talk Tracks Tool
// ============================================================

export type {
  GetTalkTracksInput,
  GetTalkTracksOutput,
  TalkTrackItem,
} from "./get-talk-tracks.js";
export {
  createGetTalkTracksTool,
  GetTalkTracksTool,
  getTalkTracksToolDefinition,
} from "./get-talk-tracks.js";

// ============================================================
// Ops Tools (Routine Operations & Auto-Repair)
// ============================================================

export * from "./ops/index.js";

// ============================================================
// External Service Tools (PostgreSQL, Filesystem, etc.)
// ============================================================

export {
  filesystemListTool,
  filesystemReadTool,
  filesystemWriteTool,
} from "../external/filesystem.js";
export {
  postgresQueryTool,
  postgresSchemaInspectorTool,
} from "../external/postgres.js";

export {
  slackPostAlertTool,
  slackPostFormattedAnalysisTool,
} from "../external/slack.js";

// ============================================================
// External Service Tools - Phase 2
// ============================================================

export {
  geminiGenerateJSONTool,
  geminiGenerateTextTool,
  geminiMeddicAnalysisTool,
} from "../external/gemini-llm.js";
export {
  groqCheckAudioSizeTool,
  groqEstimateCostTool,
  groqTranscribeAudioTool,
} from "../external/groq-whisper.js";
export {
  r2CheckFileExistsTool,
  r2DeleteFileTool,
  r2DownloadFileTool,
  r2GenerateSignedUrlTool,
  r2UploadFileTool,
} from "../external/r2-storage.js";

// ============================================================
// Query Templates & Report Templates
// ============================================================

export {
  ANALYTICS_QUERIES,
  QueryBuilder,
} from "../templates/analytics-queries.js";
export type {
  DailySummary,
  MEDDICAnalysis,
  RepPerformance,
  TeamPerformance,
} from "../templates/report-templates.js";
export {
  generateDailySummary,
  generateMeddicReport,
  generateTeamReport,
} from "../templates/report-templates.js";
