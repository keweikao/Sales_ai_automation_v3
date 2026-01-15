/**
 * Transcription types
 * Types for audio transcription and transcript data
 */

export interface TranscriptSegment {
  speaker: string;
  text: string;
  start: number; // seconds
  end: number; // seconds
  confidence?: number; // 0-1
}

export interface Transcript {
  segments: TranscriptSegment[];
  fullText: string;
  language: string;
  duration?: number;
}

export interface TranscriptData {
  segments: Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
  }>;
  fullText: string;
  language: string;
}
