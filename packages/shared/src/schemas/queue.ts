/**
 * Queue Zod Schemas
 * 統一的 Queue 訊息相關驗證邏輯
 */

import { z } from "zod";

// ============================================================
// Transcription Message
// ============================================================

export const transcriptionMessageSchema = z.object({
  conversationId: z.string(),
  opportunityId: z.string(),
  audioUrl: z.string(),
  slackUserId: z.string().optional(),
  slackChannelId: z.string().optional(),
  metadata: z.object({
    fileName: z.string(),
    fileSize: z.number(),
    format: z.string(),
  }),
});

export type TranscriptionMessage = z.infer<typeof transcriptionMessageSchema>;

// ============================================================
// Queue Transcription Message (Extended)
// ============================================================

export const queueTranscriptionMessageSchema =
  transcriptionMessageSchema.extend({
    caseNumber: z.string(),
    slackUser: z
      .object({
        id: z.string(),
        username: z.string(),
      })
      .optional(),
  });

export type QueueTranscriptionMessage = z.infer<
  typeof queueTranscriptionMessageSchema
>;

// ============================================================
// Transcription Options
// ============================================================

export const transcriptionOptionsSchema = z.object({
  language: z.string().default("zh"),
  chunkIfNeeded: z.boolean().default(true),
  maxChunkSize: z.number().optional(),
});

export type TranscriptionOptions = z.infer<typeof transcriptionOptionsSchema>;

// ============================================================
// Transcription Result
// ============================================================

export const transcriptionResultSchema = z.object({
  fullText: z.string(),
  language: z.string(),
  segments: z
    .array(
      z.object({
        speaker: z.string(),
        text: z.string(),
        start: z.number(),
        end: z.number(),
        confidence: z.number().optional(),
      })
    )
    .optional(),
});

export type TranscriptionResult = z.infer<typeof transcriptionResultSchema>;
