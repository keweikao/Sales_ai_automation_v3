/**
 * Conversation types
 * Unified types for conversation data across the application
 */

export type ConversationStatus =
  | "pending"
  | "transcribing"
  | "transcribed"
  | "analyzing"
  | "completed"
  | "failed";

export type ConversationType =
  | "discovery_call"
  | "demo"
  | "negotiation"
  | "follow_up"
  | "closing"
  | "support"
  | "other";

export type SentimentType = "positive" | "neutral" | "negative";

export type UrgencyLevel = "high" | "medium" | "low";

export interface Participant {
  name: string;
  role: string;
  company?: string;
}

export interface ConversationErrorDetails {
  code?: string;
  stack?: string;
  timestamp?: string;
}

export interface ConversationMetadata {
  leadId: string;
  conversationId?: string;
  salesRep: string;
  conversationDate: Date;
}

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

export interface ConversationHistory {
  messages: ConversationMessage[];
  context?: Record<string, unknown>;
}
