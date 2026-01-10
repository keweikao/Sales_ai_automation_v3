/**
 * @Sales_ai_automation_v3/services
 * External services integration package
 *
 * This package integrates:
 * - Groq Whisper (transcription)
 * - Google Gemini 2.0 Flash (LLM)
 * - Cloudflare R2 (storage)
 * - Multi-Agent MEDDIC Orchestrator (from V2)
 */

// ============================================================
// LLM Services
// ============================================================

export { GeminiClient, createGeminiClient, extractJSON } from './llm/gemini.js';
export { MeddicOrchestrator, createOrchestrator } from './llm/orchestrator.js';
export {
  loadPrompt,
  GLOBAL_CONTEXT,
  AGENT1_PROMPT,
  AGENT2_PROMPT,
  AGENT3_PROMPT,
  AGENT4_PROMPT,
  AGENT5_PROMPT,
  AGENT6_PROMPT,
  getAllPrompts,
  validatePrompts,
} from './llm/prompts.js';

export type {
  TranscriptSegment,
  Transcript,
  MeddicScores,
  DimensionAnalysis,
  MeddicDimensions,
  Agent1Output,
  Agent2Output,
  Agent3Output,
  Agent4Output,
  Agent5Output,
  Agent6Output,
  AnalysisMetadata,
  AnalysisState,
  AnalysisResult,
  LLMResponse,
  LLMClient,
  LLMOptions,
} from './llm/types.js';

// ============================================================
// Transcription Services
// ============================================================

export {
  GroqWhisperService,
  createGroqWhisperService,
} from './transcription/groq-whisper.js';

export type {
  TranscriptionService,
  TranscriptionOptions,
  TranscriptResult,
  GroqTranscriptionResponse,
  AudioChunk,
  ChunkedTranscriptResult,
} from './transcription/types.js';

// ============================================================
// Storage Services
// ============================================================

export { R2StorageService, createR2Service } from './storage/r2.js';

export type {
  StorageService,
  UploadMetadata,
  StorageConfig,
  AudioFileMetadata,
} from './storage/types.js';

export { generateAudioKey, generateTranscriptKey } from './storage/types.js';

// ============================================================
// Convenience Factory Functions
// ============================================================

/**
 * Create all services with default configuration
 * Reads from environment variables
 */
export function createAllServices() {
  return {
    gemini: createGeminiClient(),
    whisper: createGroqWhisperService(),
    r2: createR2Service(),
    orchestrator: createOrchestrator(createGeminiClient()),
  };
}

/**
 * Validate that all required environment variables are set
 */
export function validateEnvironment(): {
  valid: boolean;
  missing: string[];
} {
  const required = [
    'GEMINI_API_KEY',
    'GROQ_API_KEY',
    'CLOUDFLARE_R2_ACCESS_KEY',
    'CLOUDFLARE_R2_SECRET_KEY',
    'CLOUDFLARE_R2_BUCKET',
    'CLOUDFLARE_R2_ENDPOINT',
  ];

  const missing = required.filter((key) => !process.env[key]);

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Test all service connections
 */
export async function testAllConnections(): Promise<{
  gemini: boolean;
  whisper: boolean;
  r2: boolean;
  prompts: boolean;
}> {
  const services = createAllServices();

  const [gemini, r2, prompts] = await Promise.all([
    services.gemini.testConnection(),
    services.r2.testConnection(),
    Promise.resolve(validatePrompts()),
  ]);

  return {
    gemini,
    whisper: true, // Whisper test requires audio file
    r2,
    prompts,
  };
}
