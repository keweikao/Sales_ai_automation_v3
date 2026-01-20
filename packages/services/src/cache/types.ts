/**
 * 快取服務介面
 */
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deleteMultiple(keys: string[]): Promise<void>;
  invalidateUser(userId: string): Promise<void>;
}

/**
 * Conversation 列表項目
 */
export interface ConversationListItem {
  id: string;
  caseNumber: string;
  title: string | null;
  status: string;
  opportunityCompanyName: string;
  meddicScore: number | null;
  createdAt: string;
}

/**
 * Conversation 詳細資料
 */
export interface ConversationDetail extends ConversationListItem {
  transcript?: {
    fullText: string;
    segments: Array<{
      speaker: string;
      text: string;
      startTime: number;
    }>;
  };
  meddicAnalysis?: {
    overallScore: number;
    dimensions: Record<string, unknown>;
    keyFindings: string[];
    nextSteps: Array<{ action: string; priority: string }>;
  };
  audioUrl?: string;
  duration?: number;
}
