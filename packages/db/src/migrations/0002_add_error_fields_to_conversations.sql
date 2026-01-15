-- Migration: Add error tracking fields to conversations table
-- Created: 2026-01-15
-- Purpose: Enable Queue Worker to store error messages when transcription/analysis fails

ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "error_message" text;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "error_details" jsonb;

-- Add comment for documentation
COMMENT ON COLUMN "conversations"."error_message" IS 'Human-readable error message when processing fails';
COMMENT ON COLUMN "conversations"."error_details" IS 'Structured error details including code, stack, and timestamp';
