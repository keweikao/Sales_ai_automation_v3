/**
 * Conversation Zod Schemas
 * 統一的對話相關驗證邏輯
 */

import { z } from "zod";

// ============================================================
// Conversation Status & Type
// ============================================================

export const conversationStatusSchema = z.enum([
  "pending",
  "transcribing",
  "transcribed",
  "analyzing",
  "completed",
  "failed",
]);

export type ConversationStatus = z.infer<typeof conversationStatusSchema>;

export const conversationTypeSchema = z.enum([
  "discovery_call",
  "demo",
  "negotiation",
  "follow_up",
  "closing",
  "support",
  "other",
]);

export type ConversationType = z.infer<typeof conversationTypeSchema>;

// ============================================================
// Transcript
// ============================================================

export const transcriptSegmentSchema = z.object({
  speaker: z.string(),
  text: z.string(),
  start: z.number(),
  end: z.number(),
  confidence: z.number().optional(),
});

export type TranscriptSegment = z.infer<typeof transcriptSegmentSchema>;

export const transcriptSchema = z.object({
  fullText: z.string(),
  language: z.string(),
  segments: z.array(transcriptSegmentSchema),
});

export type Transcript = z.infer<typeof transcriptSchema>;

// ============================================================
// Conversation Error Details
// ============================================================

export const conversationErrorDetailsSchema = z.object({
  code: z.string().optional(),
  stack: z.string().optional(),
  timestamp: z.string().optional(),
});

export type ConversationErrorDetails = z.infer<
  typeof conversationErrorDetailsSchema
>;

// ============================================================
// Upload Conversation Request
// ============================================================

export const uploadConversationSchema = z
  .object({
    opportunityId: z.string(),
    // 支援兩種方式：直接 base64 或 Slack 檔案 URL
    audioBase64: z.string().optional(),
    slackFileUrl: z.string().optional(),
    slackBotToken: z.string().optional(), // 用於下載 Slack 檔案
    title: z.string().optional(),
    type: conversationTypeSchema.default("discovery_call"),
    metadata: z
      .object({
        duration: z.number().optional(),
        format: z.string().optional(),
        conversationDate: z.string().optional(),
      })
      .passthrough() // 允許額外欄位
      .optional(),
    // Slack 業務資訊
    slackUser: z
      .object({
        id: z.string(),
        username: z.string(),
      })
      .optional(),
  })
  .refine(
    (data) => data.audioBase64 || data.slackFileUrl,
    "必須提供 audioBase64 或 slackFileUrl 其中之一"
  );

export type UploadConversationRequest = z.infer<
  typeof uploadConversationSchema
>;

// ============================================================
// Analyze Conversation Request
// ============================================================

export const analyzeConversationSchema = z.object({
  conversationId: z.string(),
});

export type AnalyzeConversationRequest = z.infer<
  typeof analyzeConversationSchema
>;

// ============================================================
// List Conversations Request
// ============================================================

export const listConversationsSchema = z.object({
  opportunityId: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type ListConversationsRequest = z.infer<typeof listConversationsSchema>;

// ============================================================
// Get Conversation Request
// ============================================================

export const getConversationSchema = z.object({
  conversationId: z.string(),
});

export type GetConversationRequest = z.infer<typeof getConversationSchema>;

// ============================================================
// Update Summary Request
// ============================================================

export const updateSummarySchema = z.object({
  conversationId: z.string(),
  summary: z.string().min(1, "Summary cannot be empty"),
});

export type UpdateSummaryRequest = z.infer<typeof updateSummarySchema>;
