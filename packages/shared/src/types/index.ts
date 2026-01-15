/**
 * Shared types for Sales AI Automation V3
 * Central export point for all type definitions
 */

// Conversation types
export type {
  ConversationErrorDetails,
  ConversationHistory,
  ConversationMessage,
  ConversationMetadata,
  ConversationStatus,
  ConversationType,
  Participant,
  SentimentType,
  UrgencyLevel,
} from "./conversation/index.js";
// MEDDIC types
export type {
  Alert,
  Constraints,
  DecisionMaker,
  DimensionAnalysis,
  MeddicAnalysisData,
  MeddicDimensions,
  MeddicScores,
  NextStep,
  QualificationStatus,
  Risk,
  StoreInfo,
  TrustAssessment,
} from "./meddic/index.js";
// Opportunity types
export type {
  LeadData,
  OpportunityData,
  OpportunityStage,
} from "./opportunity/index.js";
// Queue types
export type {
  QueueMessageStatus,
  TranscriptionMessage,
} from "./queue/index.js";
// Slack types
export type {
  SlackChannelInfo,
  SlackFileInfo,
  SlackMessageInfo,
  SlackUserInfo,
} from "./slack/index.js";
// Transcription types
export type {
  Transcript,
  TranscriptData,
  TranscriptSegment,
} from "./transcription/index.js";
