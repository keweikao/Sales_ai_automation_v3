/**
 * Queue types
 * Types for Cloudflare Queue messages
 */

export interface TranscriptionMessage {
  conversationId: string;
  opportunityId: string;
  audioUrl: string;
  slackUserId?: string;
  slackChannelId?: string;
  metadata: {
    fileName: string;
    fileSize: number;
    format: string;
  };
}

export type QueueMessageStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";
